"""
Modal.com Serverless GPU Video Worker for LifeMotion Cooking Studio
Scale-to-Zero Event-Driven GPU Pipeline

Features:
- Scales to 0 compute instances when idle ($0.00 base cost).
- Spins up an NVIDIA A10G / L4 GPU on demand in seconds.
- Pulls open-source model weights (Lightricks/LTX-Video or Wan2.1) directly from Hugging Face Hub.
- Generates 3D Pixar/Disney style cartoon animations of Chef Maya.
- Synthesizes neural narration (Tamil Pallavi or English Jenny) via Edge-TTS.
- Muxes audio + video with FFmpeg.
- Uploads .mp4 directly to your AWS S3 bucket.
- Returns an S3 key and pre-signed playback URL.

Deployment:
  pip install modal
  modal setup
  modal deploy ai_video/modal_video_worker.py
"""

import os
import time
import tempfile
import subprocess
from pathlib import Path

# Modal definition
try:
    import modal
    app = modal.App("lifemotion-serverless-gpu")

    # Define container image with PyTorch, Diffusers, and FFmpeg
    video_image = (
        modal.Image.debian_slim(python_version="3.11")
        .apt_install("ffmpeg", "git")
        .pip_install(
            "torch==2.5.1",
            "diffusers>=0.32.0",
            "transformers>=4.48.0",
            "accelerate>=1.2.0",
            "sentencepiece",
            "boto3",
            "edge-tts",
            "fastapi[standard]"
        )
    )
except ImportError:
    # Graceful fallback when modal SDK is not installed locally
    app = None
    video_image = None

if app:
    @app.function(
        image=video_image,
        gpu="A10G",          # Cost-effective serverless GPU ($0.0003/sec)
        timeout=300,
        scaledown_window=60, # Scale to zero after 60 seconds of inactivity
        secrets=[
            modal.Secret.from_name("aws-s3-credentials")
        ]
    )
    @modal.fastapi_endpoint(method="POST")
    def render_serverless_video(payload: dict):
        """
        Receives generation payload from AWS Lambda:
        {
            "recipe": "chicken-biryani",
            "title": "Chicken Biryani",
            "prompt": "Full speech text...",
            "voice": "ta-IN-PallaviNeural" | "en-US-JennyNeural",
            "format": "16:9" | "9:16",
            "duration": 60,
            "s3_bucket": "my-bucket",
            "s3_key": "videos/output.mp4"
        }
        """
        import torch
        from diffusers import LTXPipeline, export_to_video
        import boto3
        import edge_tts
        import asyncio

        start_time = time.time()
        recipe = payload.get("recipe", "cooking-lesson")
        title = payload.get("title", "Delicious Meal")
        voice = payload.get("voice", "en-US-JennyNeural")
        is_tamil = voice.startswith("ta-")
        s3_bucket = payload.get("s3_bucket", os.environ.get("S3_BUCKET_NAME", "remotionlambda-useast1-0wt9pieqmh"))
        s3_key = payload.get("s3_key", f"videos/serverless-{int(time.time())}-{recipe}.mp4")

        # 1. Enhanced Pixar Prompt
        enhanced_prompt = (
            f"3D Pixar-style cartoon animation, cute chef Maya with green apron and chef hat, "
            f"joyfully cooking {title} in a warm colorful cartoon kitchen, holding utensil, "
            f"steam puffs rising from warm pan on stove, vibrant bright colors, volumetric lighting, "
            f"Disney studio quality, highly detailed 3D render."
        )

        temp_dir = Path(tempfile.mkdtemp(prefix="lifemotion_modal_"))
        audio_path = temp_dir / "speech.mp3"
        raw_video_path = temp_dir / "raw_video.mp4"
        final_video_path = temp_dir / "output.mp4"

        # 2. Voice Generation
        async def make_speech():
            comm = edge_tts.Communicate(payload.get("prompt", title), voice)
            await comm.save(str(audio_path))
        asyncio.run(make_speech())

        # 3. GPU Diffusion Pipeline (LTX-Video from Hugging Face Hub)
        model_id = "Lightricks/LTX-Video"
        pipe = LTXPipeline.from_pretrained(model_id, torch_dtype=torch.bfloat16)
        pipe.to("cuda")

        is_portrait = payload.get("format") == "9:16"
        width = 512 if is_portrait else 768
        height = 768 if is_portrait else 512

        output = pipe(
            prompt=enhanced_prompt,
            negative_prompt="blurry, deformed, ugly, dark, photorealistic, real life photo",
            width=width,
            height=height,
            num_frames=121,
            num_inference_steps=25
        )
        export_to_video(output.frames[0], str(raw_video_path), fps=24)

        # 4. FFmpeg Mux Audio + Video
        subprocess.run([
            "ffmpeg", "-y", "-v", "error",
            "-stream_loop", "-1", "-i", str(raw_video_path),
            "-i", str(audio_path),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest", "-movflags", "+faststart",
            str(final_video_path)
        ], check=True)

        # 5. Upload directly to S3
        s3 = boto3.client("s3")
        s3.upload_file(
            str(final_video_path),
            s3_bucket,
            s3_key,
            ExtraArgs={"ContentType": "video/mp4"}
        )

        # 6. Generate Pre-signed S3 URL for instant frontend playback
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": s3_bucket, "Key": s3_key},
            ExpiresIn=7200
        )

        render_seconds = round(time.time() - start_time, 2)
        cost_estimate = round(render_seconds * 0.0003, 4)

        return {
            "status": "complete",
            "videoUrl": presigned_url,
            "s3_bucket": s3_bucket,
            "s3_key": s3_key,
            "renderSeconds": render_seconds,
            "costEstimate": f"${cost_estimate}",
            "model": model_id,
            "provider": "modal.com"
        }

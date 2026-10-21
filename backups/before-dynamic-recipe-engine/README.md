# LifeMotion 3D Cooking Studio

The separate `studio3d/` application adds a genuine Three.js chef and kitchen, supported-recipe storyboards, sentence-based speech, subtitles, CPU-compatible rendering, a local web interface, progress, previews and MP4 downloads. The working original 2D project below is preserved.

```powershell
npm.cmd run studio
```

Open http://127.0.0.1:4173 after starting the command. Supports masala dosa, vegetable sandwich and pancakes; arbitrary recipes are rejected. New Edge TTS speech requires internet; rendering is local and cached speech is reused. No paid API or cloud GPU is required.

Verified final 3D film: `output/lifemotion-3d-final-tested.mp4` (portrait, 720x1280, 24fps). Preview: `output/lifemotion-3d-preview-480p.mp4`. Full setup and commands: [studio3d/README.md](studio3d/README.md). Milestone results, executed tests, output locations and limits: [output/studio3d/DELIVERY.md](output/studio3d/DELIVERY.md).

---

# LifeMotion AI Kids: Chef Maya's dosa kitchen

A CPU-only cartoon cooking lesson with Edge TTS English narration, speech-energy mouth animation, word-timed burned-in subtitles, a selectable English subtitle track, and deterministic Playwright rendering to H.264/AAC MP4 using FFmpeg.

## Render

Prerequisites: Node.js 20+, Python 3.10+, FFmpeg and ffprobe on PATH.

```powershell
npm install
python -m pip install edge-tts==7.3.1
npx playwright install chromium
npm run video
```

Edge TTS requires internet access and sends the lesson script to Microsoft's speech service. Voice: en-US-JennyNeural, rate -8%, pitch +3Hz. Cached per-step audio and word timings can be reused; no GPU, paid API key, diffusion model, or local language model is needed.

Final video: `output/cooking-lesson/lifemotion-kids-cooking-final.mp4`.
Other artifacts: narration.wav, subtitles.srt, lesson.json, previews for each step, validation.json.

To render again without generating narration: `npm run video -- --reuse-audio`.
To regenerate changed narration, remove only the corresponding numbered MP3 and JSON cache pair inside output/cooking-lesson before running again.

The lesson demonstrates pouring batter, spiral spreading, oiling and browning, adding cooked filling, folding with a spatula, and moving the same dosa to a plate. Heat and utensils are handled by an adult. Cooking time is condensed for teaching. Mouth movement uses measured audio amplitude and word-based rounded shapes, not phoneme-level visemes. Subtitles use Edge word boundaries.

The renderer checks all nine scene transitions, saves preview frames, fails on browser errors or encoding failures, and decodes the entire MP4 to check integrity. All generated assets stay inside this project.

The original animation and both original MP4s were preserved under `backups/working-animation-20261020-113622`. The older animation-backup folder is also preserved. Nothing is published or pushed by these scripts.

Run `npm run verify` after rendering to check mouth closure during silence, speech-driven opening, caption timing, deterministic seeking, video and audio durations, and all three MP4 streams. Detailed results are saved in `output/cooking-lesson/pipeline-checks.json`.

## Original anime-inspired Chef Maya

The chef uses large turquoise eyes, asymmetric slate-blue hair, an ivory toque, a coral neckerchief, and a teal apron. SVG gradients, rim highlights, facial shading, blinking, brow expression, and gentle head motion provide a lightweight 2.5D look. This is a shaded vector character, not a 3D mesh. No external images, copyrighted character assets, or GPU are required. Existing narration, mouth synchronization, subtitles, and lesson timing are preserved. The previous scene and complete lesson output are backed up under `backups/pre-anime-chef-*`.

## A Little Dosa Magic ? cartoon short

The current scene removes the branding, persistent headers, badges, progress bar, ingredient labels, and nameplate. A short opening title fades away; only synchronized speech subtitles remain. Original round-faced Maya has a chestnut bob, oversized expressive eyes, a white toque and a peach apron. Shaded SVG keeps the 2.5D look CPU-compatible. Eased hand trajectories, transitional poses, a greeting gesture, eye direction, blinking, head movement, and camera reframing are deterministic for offline rendering. Existing Edge TTS narration and subtitle timing are reused without changes. Render with `node animation/render.mjs --reuse-audio`, then validate with `node animation/verify.mjs`. Previous scene and output are preserved in `backups/pre-cartoon-short-*`.

## Tested repair output

The corrected, verified video is `output/lifemotion-final-tested.mp4`. Existing working MP4s and the original 2D backup are preserved. QA screenshots, measured results, and the detailed repair report are under `output/qa/`.

For Windows systems under memory pressure, run these commands from this project folder:

```powershell
node --max-old-space-size=128 --max-semi-space-size=4 animation/qa.mjs
node --max-old-space-size=128 --max-semi-space-size=4 animation/render.mjs --reuse-audio --output=output/lifemotion-final-tested.mp4
node --max-old-space-size=128 --max-semi-space-size=4 animation/verify.mjs --output=output/lifemotion-final-tested.mp4
python animation/qa-media.py
```

Chromium uses CPU rendering and FFmpeg uses limited CPU threads. Rendering uses a staging MP4 and validates decoding before moving it to the requested final path. Reusing narration avoids network calls or voice changes.

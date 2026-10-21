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

# LifeMotion 3D Cooking Studio

The `studio3d/` website creates narrated 3D cooking films with Chef Maya. It includes 10 guided recipes, recipe-step previews, local setup checks, generation progress, a film library and MP4 downloads.

Chef Maya is an original Blender-authored 3D character loaded as GLB by Three.js. Her named head, shoulder and forearm pivots follow each recipe action during rendering. The editable Blender source is `studio3d/blender/maya-chef.blend`; rebuild the web asset with `npm run 3d:character` when Blender is installed.

From PowerShell in the cloned project folder:

```powershell
npm.cmd run setup
npm.cmd run studio
```

Open the local address printed by the server and keep the terminal open. Windows setup can install missing Python and FFmpeg with Windows Package Manager; Node.js and Git must already be installed. Generation uses local CPU rendering. The studio prefers online Edge narration, reuses cached audio, and falls back to the Windows speech engine if an office network blocks the speech service. The website identifies missing tools before a film starts and does not create a second portal when started again.

Try: **Teach children how to make chicken biriyani step by step in simple English.** Recipe cards also fill in ready-to-use prompts. Unsupported dishes receive a labelled generic animation; preview the steps before creating a film.

Full setup, examples, supported recipes and validation: [studio3d/README.md](studio3d/README.md). The original 2D project is preserved below.

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

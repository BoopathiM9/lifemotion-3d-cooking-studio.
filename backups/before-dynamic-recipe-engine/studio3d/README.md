# LifeMotion 3D Cooking Studio

## Local start

From `C:\life_motion-kids_project\lifemotion-kids-starter` run:

```powershell
npm.cmd run studio
```

Open http://127.0.0.1:4173. Nothing is published. One generation runs at a time. The service listens only on loopback. Stop it with Ctrl+C.

Enter exactly one supported recipe: masala dosa, vegetable sandwich, or pancakes. Choose Jenny or Aria English speech and landscape 16:9 or portrait 9:16. Generation creates cached sentence-level narration, a short 480p/12fps visual preview, then a complete 720p/24fps MP4. Progress, video preview, and MP4 download are available on the page. Unsupported recipes, conflicting selections, invalid voices, and invalid formats return explicit errors.

This is a template-based recipe-to-storyboard engine. It does not generate arbitrary recipes, models, ingredients, or actions from unrestricted natural language. All models and animation actions are procedural original Three.js graphics. No diffusion model or paid API is used.

## Free tools and voice

Three.js 0.180.0, Playwright, FFmpeg/FFprobe, Python's standard library, and the already-installed edge-tts package are used. New speech requires internet to Microsoft's free Edge TTS service; cached sentence audio is reused on later jobs. Models, scene, rendering, website, and video files stay on the laptop. Piper is not bundled in this release; offline operation currently requires already-cached Edge speech. The original 2D video and audio were retained.

## CPU rendering

Chromium uses ANGLE SwiftShader software WebGL with a perspective camera. Original MAYA is constructed from lightweight meshes with eyes, mouth, hair, chef hat, coat/apron, jointed arms and solved hand targets. The set has ambient/hemisphere/directional lights, a 512px shadow map, materials, kitchen furniture, a tawa, ingredient bowls, utensils, and a plate. The scene is around 33,000 triangles. FFmpeg uses single-threaded ultrafast zero-latency encoding to reduce memory pressure. Node runs with a 128MB old-space limit and 4MB semi-space limit to reduce memory pressure on this Windows laptop. Other open applications can still affect available virtual memory and rendering speed.

## Commands

```powershell
npm.cmd run 3d:test
npm.cmd run 3d:preview
npm.cmd run 3d:render
node --max-old-space-size=128 --max-semi-space-size=4 studio3d/e2e.mjs
```

`3d:preview` extracts complete pouring/spreading steps from the existing dosa lesson. Preview audio, captions and actions share the same measured timeline; website previews similarly use two cooking steps for the selected recipe. `3d:render` renders the complete original dosa lesson with its unchanged voice and subtitles. Website jobs generate each new sentence separately and derive the total video duration from decoded PCM audio rather than a fixed duration. Word-boundary metadata creates captions; actual voice energy drives mouth opening.

All outputs have unique directories under `output/studio3d/`. Website jobs are in `output/studio3d/jobs/<id>/`, with `storyboard.json`, `lesson.json`, measured sentence segments, narration WAV, subtitles SRT, status JSON, preview/final MP4s, key frames and validation reports. `output/studio3d/latest.json` points to the most recent successful render. No earlier MP4 is overwritten.

## Tests and scope

`test.mjs` exercises prompt validation, all recipe actions at 24fps sample intervals, joint reach, plate containment after landing, support from the spatula, withdrawal at the spoken instruction, pancake clearance throughout the half-turn, cold-sandwich steam suppression, deterministic seeking, portrait scene loading, browser errors, and the unsupported-recipe website UI. `e2e.mjs` submits a real dosa prompt through the website in portrait format and waits for sentence narration, a preview, a full render, stream validation, download headers, and HTTP range serving.

Each renderer fails on browser/resource errors, unreachable utensil targets or food leaving the plate after landing. Before completion, both preview and final MP4s must pass independent stream checks, full decoding, narration comparison, subtitle text/timing checks and sentence-duration checks. Reusing a job directory containing an MP4 or partial MP4 is rejected to preserve earlier work; generate a new job instead. `verify-media.py <video> <audio-assets-directory>` independently validates streams, durations, full decoding, decoded voice correlation and embedded subtitle content. Inspect the accompanying frames before accepting visual quality; automated geometry checks alone cannot establish artistic polish. Current motions are lightweight procedural approximations rather than physical fluid/cloth simulation or phoneme-level facial animation.

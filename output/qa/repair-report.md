# Verified LifeMotion repair

Final video: `C:\life_motion-kids_project\lifemotion-kids-starter\output\lifemotion-final-tested.mp4`

## Findings and repairs

- The old plate was drawn after the food and covered it. The folded dosa used its lower edge as the transform origin and abruptly changed scale on serving. Explicit visual-center anchors, a continuous scale/position curve, a larger plate, and separate cooking/serving food layers now keep the food visible and inside the inner plate ellipse after landing.
- The spatula previously stayed over the plated dosa. It now supports the food during transfer, then withdraws over the pan. Chutney is staged separately without intersecting the food. The stove indicator turns off with the narration.
- Pouring and folding previously started before their spoken cues. Action timing now follows the existing narration, and folding morphs continuously instead of swapping silhouettes. The wider introduction keeps the dish in frame.
- Earlier commands `node animation/qa.mjs` failed with Chromium screenshot capture errors; another attempt failed with Node heap allocation exhaustion. Windows reported about 1 GB available virtual memory. CPU-only Chromium plus reduced Node memory limits completed QA and rendering. FFmpeg uses bounded CPU threads. No other applications were closed, and no dependencies were installed.
- Output is encoded into a staging MP4, fully decoded, and then renamed to the requested final path. The previous working MP4 is unchanged.

## Executed checks

- JavaScript syntax: renderer, verifier, QA script, and inline scene script; Python AST syntax: narration and media QA.
- Baseline existing verifier, then final verifier against the requested output: passed.
- `node --max-old-space-size=128 --max-semi-space-size=4 animation/qa.mjs`: passed 1,882 frames, 267 serving frames, 219 landed frames, 21 required elements, and 28 QA screenshots. No browser errors, console errors, or failed requests. Food boundary plus stroke remains inside the inner plate ellipse after landing (maximum normalized ellipse value 0.958; limit 1).
- `node --max-old-space-size=128 --max-semi-space-size=4 animation/render.mjs --reuse-audio --output=output/lifemotion-final-tested.mp4`: completed and decoded the full output.
- `node --max-old-space-size=128 --max-semi-space-size=4 animation/verify.mjs --output=output/lifemotion-final-tested.mp4`: passed mouth/silence samples, captions, deterministic seeking, framing, and stream validation.
- `python animation/qa-media.py`: FFprobe, full FFmpeg decode, original asset hashes, all 26 embedded subtitle cues, and five independently sampled audio correlation windows passed. Narration remains unchanged; correlation exceeds 0.9999 in every window. Source has zero clipped samples; peak -0.62 dBFS. Video/audio duration difference is approximately 15 ms.
- Inspected rendered introduction, ingredients, pouring, spreading, cooking, filling, folding, transfer, landing, withdrawal, and final dish screenshots. Also inspected `export-plated.png` and `export-final.png` extracted from the actual exported MP4.

## Files

Updated: `animation/scene.html`, `animation/render.mjs`, `animation/verify.mjs`, `README.md`.
Added: `animation/reproduce.mjs`, `animation/qa.mjs`, `animation/qa-media.py`, and QA artifacts under `output/qa/`.
The original `animation-backup/` 2D files and prior MP4s were preserved. The pre-repair working snapshot is recorded in `output/qa/backup-path.txt`.

## Result and limits

H.264, 1280x720, 24 fps, 78.417 seconds, AAC narration, English subtitle track. Food travels on the spatula from pan to plate; after landing it stays completely inside the plate and does not drift. No blocking failures remain in the executed checks. The style is procedural shaded 2.5D; mouth movement remains amplitude/word driven rather than phoneme-level lip sync. Audio validation is objective decoding, waveform, timing and level analysis, rather than a subjective listening review.

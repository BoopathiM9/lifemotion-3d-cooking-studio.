# LifeMotion 3D Cooking Studio - delivery report

## Start locally

In `C:\life_motion-kids_project\lifemotion-kids-starter`, run `npm.cmd run studio`, then open http://127.0.0.1:4173. Test servers have been stopped; this command starts the studio. Nothing was published, deployed, or pushed.

## Milestone 1: genuine 3D foundation

Added Three.js 0.180.0, a perspective-camera scene, original mesh-built MAYA, a dimensional kitchen, ambient/hemisphere/directional lighting, materials, shadows, articulated arms, blinking and speech-driven mouth animation. The original 2D source and working videos were backed up under `backups/pre-real-3d-20261020-142838` and are unchanged.

Commands: `npm.cmd install --save-exact three@0.180.0 --no-audit --no-fund`; `node --check studio3d/scene.mjs`; `node --check studio3d/render.mjs`; `node --max-old-space-size=128 --max-semi-space-size=4 studio3d/render.mjs`.

Initial visual QA found excessive mouth scaling and unreachable hand targets. Both were repaired and strict reach tests were added. Accepted preview: `output/studio3d/milestone1-2026-10-20T09-05-49-970Z/maya-3d-preview-480p.mp4` (854x480, 12fps, 106 frames). Genuine ANGLE SwiftShader software WebGL was confirmed. Browser/resource checks and full FFmpeg decode passed; rendered frames were inspected.

## Milestone 2: cooking actions and supported recipes

Added reusable actions and real food geometry for masala dosa, vegetable sandwich and pancakes. Dosa folding now uses a hinged 3D half, the batter stream is vertical, the food stays within the plate after landing, and the spatula withdraws. The handle is raised relative to the blade to maintain hand/worktop clearance. All three recipes share character, kitchen and action infrastructure, with recipe-specific foods and assembly/flip behavior.

Commands: `npm.cmd run 3d:test`; `node --max-old-space-size=128 --max-semi-space-size=4 studio3d/render.mjs --full`; `python studio3d/verify-media.py output/studio3d/full-2026-10-20T09-23-24-240Z/maya-3d-complete.mp4 output/cooking-lesson`.

Final geometry suite passed 1,800 sampled frames across all three recipes, zero grip-target error, worktop clearance, containment after landing, utensil support/withdrawal, deterministic seeking, perspective/WebGL scene loading and no browser/resource errors. Intro, pouring, spread, cook, fold and served-dish frames were inspected. The initial complete landscape render used the unchanged original narration and all 26 subtitle cues: `output/studio3d/full-2026-10-20T09-23-24-240Z/maya-3d-complete.mp4` (1280x720, 24fps, 78.417s). It predates the later hinge/grip refinements; the website-generated portrait video below includes those refinements and is the recommended final output.

## Milestone 3: local website and storyboard engine

Implemented prompt validation, recipe selection, two English voices, 16:9/9:16 formats, progress polling, preview, completed-video playback and MP4 downloads. Unsupported recipes, multiple supported recipes, mismatched recipe selection, invalid voice and invalid format are rejected. Only one job runs at a time. The service binds to loopback and saves unique job directories, preserving previous videos.

Commands: `node --check studio3d/server.mjs`; `node --max-old-space-size=128 --max-semi-space-size=4 studio3d/test.mjs`; `node --max-old-space-size=128 --max-semi-space-size=4 studio3d/e2e.mjs`; `node --max-old-space-size=128 --max-semi-space-size=4 studio3d/playback-test.mjs`.

Actual UI submission, unsupported-recipe UI errors, generation status, preview-before-full workflow, 720x1280 HTML5 playback, an actual completed browser download, and HTTP range/download headers all passed. Screenshots: `output/studio3d/tests/studio-ui.png`, `generated-website.png`, and `playback-verified.png`.

## Milestone 4: measured narration and verified final media

New website jobs split narration into individual sentences, cache speech by voice/text, decode each sentence to PCM and measure its duration. Action timing and final duration derive from the assembled audio. Edge word metadata drives captions and measured audio energy drives talking. Jenny and Aria speech generation were both executed successfully. The completed website job contains 20 separately measured sentence segments and 29 subtitle cues.

Commands: `python studio3d/verify-media.py output/studio3d/jobs/job-1792488851311-w507j/final/maya-3d-complete.mp4 output/studio3d/jobs/job-1792488851311-w507j`; original `animation/verify.mjs --output=output/lifemotion-final-tested.mp4`; source/MP4 SHA-256 preservation checks; JavaScript and Python syntax checks.

Recommended final: `C:\life_motion-kids_project\lifemotion-kids-starter\output\lifemotion-3d-final-tested.mp4`.
Preview: `C:\life_motion-kids_project\lifemotion-kids-starter\output\lifemotion-3d-preview-480p.mp4`.

The refined website output is 720x1280, 24fps, 65.016 seconds, H.264/AAC with an English subtitle track. All 1,561 final-render frames passed reach/clearance/browser checks; 129 landed frames passed containment. Full FFmpeg decoding, audio/video duration checks, four decoded speech correlation windows (all above 0.9997), and all embedded subtitle text checks passed. Final pouring, hinged-fold, serving and website playback frames were inspected. Rendering took approximately 428 seconds using CPU SwiftShader; speed varies with laptop load.

## Limits and remaining work

This is a working template-based generator for the three listed recipes. Arbitrary recipes, custom characters or freeform action synthesis are not implemented. Models and motions are lightweight procedural cartoons, with no fluid/cloth simulation, full rigid-body/self-collision solver, or phoneme-level lip sync. All three recipes were scene-tested; the complete website end-to-end MP4 was tested with dosa. Full sandwich/pancake MP4 jobs and an Aria full-video job were not generated in this run. New Edge TTS audio needs internet, while cached audio can be reused; Piper is not bundled. No blocking failure remains in the executed final tests. Earlier diagnostic renders and the intentionally interrupted pre-clearance job were retained rather than deleted.

Three.js reference: https://threejs.org/docs/ . Local version is pinned in package.json and package-lock.json.

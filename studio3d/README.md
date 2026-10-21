# LifeMotion Cooking Studio

A local website that turns recipe instructions into a procedural 3D cooking lesson with Chef Maya, English narration, subtitles and an MP4 download. Rendering runs on your CPU; a cloud GPU or paid API key is not required.

### Optional free recipe analysis

The studio works without an AI key. For unfamiliar recipes, it uses the free public TheMealDB lookup when possible and otherwise uses its local planner. You can optionally enable Gemini's free tier for richer analysis of unfamiliar recipe prompts. Create a free key in Google AI Studio, then set it only in the terminal where you start LifeMotion:

```powershell
$env:GEMINI_API_KEY="your-key-here"
npm.cmd run studio
```

The key is never written into the project or committed to Git. Use **Preview steps** to review any AI-generated recipe before creating a video.

## Windows: first-time setup

Install Node.js 20+ and Git, clone this repository, and open PowerShell in the project folder. Run:

```powershell
npm.cmd run setup
npm.cmd run studio
```

The setup helper installs locked Node dependencies, finds Python 3.10+, creates a local `.venv`, installs `edge-tts==7.3.1`, and installs Playwright Chromium. On Windows it uses Windows Package Manager to install missing Python and FFmpeg. Windows may ask you to approve the installers. If `winget` is unavailable, install Python and FFmpeg manually, then rerun setup. Package and TLS verification remain enabled.

Open the address printed by the server, normally `http://127.0.0.1:4173`. Keep that terminal open. Starting the studio again will point to the existing address instead of creating a second portal. Stop the server with Ctrl+C.

The page checks Python, the speech package, FFmpeg, FFprobe and Chromium before accepting a generation request. Open **Tools ready / Setup needed** to see the checks. If a tool was just installed, restart your terminal and studio so the updated PATH is inherited. The Python resolver prefers the project virtual environment and also supports the Windows `py -3` launcher, so the Microsoft Store `python` alias is not required.

On other platforms, install Node.js 20+, Python 3.10+ and FFmpeg with your normal package manager before running `npm run setup`. Browser/system library requirements depend on the operating system.

## Create a film

1. Choose a card in the recipe book or enter a prompt.
2. Use **Preview steps** to check the ingredients and narration.
3. Choose Jenny or Aria and landscape 16:9 or portrait 9:16.
4. Click **Create my cooking film**. The short preview appears before the complete film.
5. Watch the final film and use **Download MP4**. Recent completed films also appear in the film library.

Copyable examples:

```text
Teach children how to make chicken biriyani step by step in simple English.
Teach children how to make vegetable fried rice step by step in simple English.
Teach children how to make tomato pasta step by step in simple English.
Teach children how to make masala dosa step by step in simple English.
Teach children how to make pancakes step by step in simple English.
```

Guided recipes: chicken biryani (also spelled biriyani), masala dosa, pancakes, vegetable sandwich, vegetable fried rice, tomato pasta, noodles, chapati, vegetable soup and salad. The recipe cards fill in the prompt automatically.

You can also supply detailed cooking instructions. Dishes outside the recipe book receive a clearly labelled generic cooking animation; this is a template and rule-based engine, not an unrestricted AI recipe generator. Always inspect the plan. These short films simplify cooking motions and timing and are not substitutes for a complete cooking recipe or adult supervision.

## Narration and resources

New speech sends the narration text to Microsoft's Edge speech service and needs internet access. Cached sentence audio is reused. Existing `HTTPS_PROXY` / `https_proxy` settings are supported. No API key is required. Tool checks establish local installation, not remote speech-service availability.

CPU rendering may take several minutes or longer depending on film duration and laptop resources. Keep the terminal open and avoid starting multiple jobs. If graphics or capture fails, generation reports an error rather than accepting a blank video. Video validation checks the streams, full decoding, sampled kitchen frames, audio alignment and subtitle timing.

Each generation has a unique directory under `output/studio3d/jobs/`, containing its plan, narration, subtitles, status, preview and full film. Existing videos are preserved. Failed or interrupted jobs can be retried as a new film. On restart, completed films remain available; unfinished jobs are reported as interrupted.

## Configuration

- `LIFEMOTION_PORT`: explicit local port, default 4173.
- `LIFEMOTION_PYTHON`: optional path to a Python executable. Otherwise the project `.venv`, Windows launcher and installed Python commands are detected automatically.
- `LIFEMOTION_CHROMIUM`: optional explicit Chromium executable. Otherwise the installed Playwright browser is used, with system Chromium as a Linux fallback.

The server listens on loopback. It is a local development application and has not been deployed as a public website.

## Validation

```powershell
npm.cmd test
npm.cmd run test:startup
npm.cmd run test:studio
npm.cmd run test:render
npm.cmd run 3d:test
node studio3d/e2e.mjs --recipe=chicken-biryani --format=16:9
```

Unit tests cover planning and procedural assets. Startup tests cover one-portal behavior. Studio tests cover Windows Python resolution, setup gating, the exact biriyani prompt, plan preview, and desktop/mobile flows. Rendering checks exercise frame determinism and graphics-context failure. The end-to-end test submits an actual website job and waits for narration, a preview and a full validated film, then checks download headers and HTTP range serving. It can take several minutes and requires local tools plus speech access or cached narration.

Use `npm run 3d:preview` for the legacy cached dosa preview and `npm run 3d:render` for its full film. The original 2D animation remains separate under `animation/`.

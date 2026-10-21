# LifeMotion AI Kids — local starter

A first working **moving animation -> MP4** pipeline. This is a programmatic cartoon animation, not AI diffusion video yet. It uses Python stdlib to render SVG animation in HTML and a local Chromium browser plus FFmpeg for capture. See setup below.

## Windows setup

1. Install Node.js 20+, Git, and FFmpeg, then check `node --version`, `git --version`, `ffmpeg -version`.
2. Open this folder in VS Code.
3. Run `npm install`.
4. Run `npm run video`.
5. Find the playable `output/masala-dosa.mp4`.

The animation contains actual moving geometry: pouring batter, expanding dosa, steam, and a final plated dosa. It does **not** synthesize arbitrary new actions from text. This is the foundation for adding Ollama, narration, and cooking-action templates.

## Attribution

This starter does not copy source files from the senior's repository. For later reuse, preserve the original MIT notice and inspect third-party dependency licensing separately.

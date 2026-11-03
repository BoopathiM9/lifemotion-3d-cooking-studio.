# LifeMotion AI — 3D Chef Maya Cooking Studio

A universal AI cooking video generator for children, families, and educational content creators. Features **Chef Maya**, a friendly cartoon chef, with English and Tamil narration, synchronized subtitles, 15 authentic cooking actions, and downloadable HD MP4 video generation.

Runs 100% locally on standard Windows laptops with 16 GB RAM and CPU graphics. No paid cloud GPUs, subscriptions, or paid API keys are required.

---

## 🌟 Universal Recipe-to-Video Engine

Users can enter **any recipe name or cooking prompt**, such as:
- **Chicken Biryani / Vegetable Biryani** (washing basmati rice, marinating chicken pieces, frying golden onions, layering, dum steam lid)
- **Chana Sundal** (individual cooked chickpeas, mustard seeds, curry leaves, grated coconut snow, flame turning off)
- **Crispy Masala Dosa** (spreading batter with spiral ladle technique, flipping on hot tawa)
- **Fluffy Pancakes** (whisking batter, watching bubbles form, flipping)
- **Japanese Sushi** (spreading seasoned sushi rice on dark nori, layering cucumber/avocado, rolling with bamboo mat, adult slicing)
- **Classic Margherita Pizza** (stretching soft dough, spreading tomato sauce, mozzarella cheese, oven baking)
- **Chocolate Cake** (measuring cocoa/flour, whisking smooth batter, baking in warm oven, festive sprinkles)
- **Vegetable Fried Rice, Tomato Pasta, Soups, Salads, & Sandwiches**

### 15 Standard Visual Actions
The animation engine eliminates generic stirring animations by mapping cooking motions to 15 distinct, authentic actions:
1. `wash` — Rinsing produce or rice in a wash bowl with water ripples and bubbles
2. `chop` — Cutting board with chef knife (accompanied by adult knife safety reminders)
3. `pour` — Liquid streams and drizzling into pots, bowls, or pans
4. `marinate` — Rubbing and coating chicken pieces or vegetables in spices
5. `mix` — Combining dry and wet ingredients in bowls or tossing salads
6. `stir` — Whisking, churning, or stirring with wooden spoons
7. `fry` — Sizzling onions, spices, and chicken in hot oil or ghee
8. `boil` — Bubbling and steaming in deep pots with rolling water
9. `steam` — Gentle steaming under covered pots
10. `spread` — Spreading dosa batter or pizza sauce outward in smooth spirals
11. `flip` — Inverting pancakes and dosas with spatulas
12. `layer` — Stacking marinated chicken and basmati rice for biryani
13. `cover` — Placing the pot lid for dum steam cooking or oven baking
14. `garnish` — Sprinkling fresh coriander, curry leaves, sesame seeds, or coconut flakes
15. `serve` — Scooping and plating the finished dish onto a warm serving plate

---

## 🧠 Recipe Intelligence: Qwen2.5-1.5B & Ollama

LifeMotion integrates local recipe intelligence via **Qwen2.5-1.5B-Instruct** running through Ollama.

### Running Qwen2.5 Locally:
1. Install [Ollama for Windows](https://ollama.ai/download).
2. Open PowerShell and pull the quantized 1.5B model (uses ~1.2 GB RAM, runs easily on CPU):
   ```powershell
   ollama run qwen2.5:1.5b
   ```
3. LifeMotion automatically connects to `http://127.0.0.1:11434` to generate structured JSON RecipePlans.

### Automatic Fallback Synthesizer:
If Ollama is not running, LifeMotion automatically engages its **Verified Cooking Synthesizer**. The synthesizer deterministically produces valid, child-safe recipes for arbitrary dishes while maintaining all safety checks.

### Built-in Food Safety & Hygiene Rules:
- **Raw Meat / Poultry**: Enforces thorough hand washing with soap, separate handling, and mandatory adult supervision for raw chicken.
- **Hot Stoves & Cookware**: Every cooked recipe includes an explicit reminder that hot stoves and boiling pots must be handled by an adult.
- **Sharp Knives & Ovens**: Slicing rolls or operating baking ovens explicitly requires grown-up help.

---

## 🎬 Generative AI Video: Hugging Face Wan 2.2 14B Fast

LifeMotion evaluates and integrates the **Hugging Face Wan 2.2 14B Fast Space** (`zerogpu-aoti/wan2-2-fp8da-aoti-faster`):
- Uses `@gradio/client` and a free Hugging Face User Access Token.
- Uses Chef Maya's reference portrait (`studio3d/assets/maya-kitchen-hero.png`) to maintain consistent character identity.
- Generates 3.5-second high-definition animated video clips for hero cooking actions (marinating, frying, chopping, pouring, layering, garnishing).
- **ZeroGPU Quota Management**: Free HF accounts provide ~60–120 seconds of A10G GPU compute per 12-hour window. LifeMotion adopts a **hybrid architecture**:
  - Key hero action moments utilize Wan 2.2 generative video clips when quota is available.
  - Tutorial framing, safety instructions, and standard cooking steps utilize Remotion 3D procedural cartoon graphics.
  - When the ZeroGPU daily limit (HTTP 429) is reached, the system transparently falls back to procedural cartoon animation with a clear status indicator—never disguising procedural graphics as AI video.

---

## 💻 Windows Setup & Local Execution

### Prerequisites:
- Windows 10 or 11 (64-bit)
- Node.js 20+
- Python 3.10+ (installed via winget or python.org)
- FFmpeg (installed via winget or ffmpeg.org)

### Installation:
```powershell
npm.cmd run setup
npm.cmd run studio
```

Open your browser at `http://127.0.0.1:4173`.

### 2-Step Approval Workflow:
1. **Enter Recipe**: Type any dish prompt (e.g. `Chicken Biryani`, `Japanese Sushi`, `Pizza`).
2. **Review Plan**: Click **Preview steps** to view structured ingredients, color chips, quantities, and storyboard scenes.
3. **Edit Recipe (Optional)**: Click **Edit Recipe** to tweak ingredients or steps directly in JSON.
4. **Approve & Generate**: Click **Approve & Generate 3D Video** to initiate rendering.
5. **Watch & Download**: Preview generation renders in seconds; full 1080p MP4 with English narration and subtitles can be downloaded directly.

---

## 🧪 Automated Testing

LifeMotion includes a full automated test suite verifying both client, server, and animation engines:

```powershell
# 1. Action Normalization & Fallback Unit Tests
npm.cmd test

# 2. Server Startup & Single-Portal Protection Tests
npm.cmd run test:startup

# 3. Studio UI, Recipe API, & Gating Playwright Tests
npm.cmd run test:studio

# 4. Multi-Dish Recipe Intelligence Tests
node test-recipe-engine.mjs
```

All test suites pass 100% on Windows CPU without requiring external paid dependencies.

---

## 📁 Project Structure

- `data/recipes/` — Curated authentic recipe specifications (`chicken-biryani.json`, `chana-sundal.json`, `masala-dosa.json`, etc.).
- `remotion/` — Remotion composition root, scene choreographies, and React/SVG character and kitchen components.
- `studio3d/qwen-recipe-engine.mjs` — Local Qwen2.5-1.5B Ollama client, recipe validator, and verified synthesizer.
- `studio3d/wan-video-generator.mjs` — Hugging Face Wan 2.2 14B Fast client and ZeroGPU quota handler.
- `studio3d/dynamic-video-composer.mjs` — Hybrid video composer combining AI video clips, Remotion scenes, Edge-TTS audio, and FFmpeg muxing.
- `studio3d/visual-plan.mjs` — 15-action vocabulary normalizer and visual scene planner.
- `studio3d/recipes.mjs` — Synchronous catalog and recipe matcher.
- `studio3d/server.mjs` — Local HTTP API server for recipe planning, validation, and video generation.
- `studio3d/studio-ui.mjs` — Interactive web application frontend with 2-step approval workflow.
- `studio3d/index.html` — Responsive desktop and mobile interface.

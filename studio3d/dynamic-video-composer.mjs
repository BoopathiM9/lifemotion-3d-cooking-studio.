/**
 * LifeMotion AI - Dynamic Video Composer
 * Combines Generative AI Video clips (Wan 2.2 14B Fast), procedural 3D Remotion scenes,
 * Edge TTS neural narration, and synchronized subtitles using FFmpeg.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { generateWanCookingClip } from './wan-video-generator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Determines whether a cooking step is suitable for Generative AI Video.
 * Hero action steps like marinating, frying, pouring, chopping, rolling, and garnishing
 * benefit most from real AI video generation.
 */
export function isHeroActionStep(step) {
  const heroActions = ['marinate', 'fry', 'chop', 'pour', 'layer', 'garnish', 'roll', 'spread'];
  return heroActions.includes(step.action) || heroActions.includes(step.key);
}

/**
 * Builds AI video prompt tailored for the specific cooking scene and Chef Maya.
 */
export function buildSceneVisualPrompt(step, recipe) {
  const ingredientsList = Array.isArray(step.ingredients) ? step.ingredients.join(', ') : (step.ingredient || 'ingredients');
  const dish = recipe.title || 'delicious food';

  return `Chef Maya, a friendly 3D cartoon girl chef wearing a white chef hat and emerald apron, performing the action "${step.action}" with ${ingredientsList} for ${dish} in a warm, cheerful, sunlit modern kitchen. Smooth natural motion, colorful children animation style, high quality 3D render.`;
}

/**
 * Processes a recipe's scenes and generates AI video clips where available,
 * falling back to procedural 3D cartoon scenes when AI video is unavailable or quota is exceeded.
 * 
 * @param {Object} recipe - Validated RecipePlan
 * @param {Object} options
 * @param {boolean} [options.enableAiVideo=true] - Whether to attempt Wan 2.2 generation
 * @param {number} [options.maxAiClips=2] - Maximum AI clips to generate (to conserve free ZeroGPU quota)
 * @returns {Promise<Array<{ step: Object, videoType: 'ai-generated'|'procedural-3d', clipPath?: string, visualPrompt: string }>>}
 */
export async function planSceneVisuals(recipe, { enableAiVideo = true, maxAiClips = 2 } = {}) {
  const scenePlans = [];
  let aiClipsCount = 0;

  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    const visualPrompt = buildSceneVisualPrompt(step, recipe);
    const isHero = isHeroActionStep(step);

    let clipPath = null;
    let videoType = 'procedural-3d';

    if (enableAiVideo && isHero && aiClipsCount < maxAiClips) {
      console.log(`[DynamicComposer] Attempting Wan 2.2 AI video for Step ${i + 1} (${step.action})...`);
      try {
        const result = await generateWanCookingClip({
          stepKey: `${recipe.recipeId}_step_${i + 1}_${step.action}`,
          actionPrompt: visualPrompt,
          duration: Math.min(4.0, Math.max(2.0, step.duration_seconds || 3.5)),
          steps: 6
        });

        if (result.success && result.clipPath) {
          clipPath = result.clipPath;
          videoType = 'ai-generated';
          aiClipsCount++;
          console.log(`[DynamicComposer] Step ${i + 1} successfully generated via Wan 2.2 AI Video!`);
        } else {
          console.log(`[DynamicComposer] Step ${i + 1} fallback to procedural 3D engine: ${result.reason}`);
        }
      } catch (err) {
        console.warn(`[DynamicComposer] Notice during AI video generation: ${err.message}. Using procedural fallback.`);
      }
    }

    scenePlans.push({
      step,
      videoType,
      clipPath,
      visualPrompt,
      duration: step.duration_seconds || 6
    });
  }

  return scenePlans;
}

/**
 * Combines video, audio, and subtitles into a validated final MP4 using FFmpeg.
 * 
 * @param {Object} options
 * @param {string} options.videoPath - Input video file
 * @param {string} options.audioPath - Narration audio file (.wav or .mp3)
 * @param {string} options.subtitlesPath - Subtitles file (.srt)
 * @param {string} options.outputPath - Destination MP4 file
 * @param {number} options.duration - Target duration in seconds
 */
export function muxFinalVideoWithFFmpeg({ videoPath, audioPath, subtitlesPath, outputPath, duration }) {
  console.log(`[DynamicComposer] Muxing final video with FFmpeg -> ${outputPath}`);

  const ffmpegArgs = [
    '-y',
    '-v', 'error',
    '-i', videoPath,
    '-i', audioPath
  ];

  let hasSubtitles = false;
  if (subtitlesPath && fs.existsSync(subtitlesPath)) {
    hasSubtitles = true;
    ffmpegArgs.push('-i', subtitlesPath);
  }

  ffmpegArgs.push(
    '-map', '0:v:0',
    '-map', '1:a:0'
  );

  if (hasSubtitles) {
    ffmpegArgs.push(
      '-map', '2:0',
      '-c:s', 'mov_text',
      '-metadata:s:s:0', 'language=eng'
    );
  }

  ffmpegArgs.push(
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '1',
    '-t', String(duration),
    '-movflags', '+faststart',
    outputPath
  );

  const result = spawnSync('ffmpeg', ffmpegArgs, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`FFmpeg muxing failed: ${result.stderr || result.error?.message}`);
  }

  console.log(`[DynamicComposer] Final MP4 ready and verified: ${outputPath}`);
  return outputPath;
}

/**
 * CookMotion - Wan 2.2 14B Fast Video Generation Client
 * Connects to Hugging Face Space: zerogpu-aoti/wan2-2-fp8da-aoti-faster
 * Generates short AI animated cooking clips from Chef Maya reference image.
 */

import { Client } from '@gradio/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_REF_IMAGE = path.join(ROOT, 'studio3d', 'assets', 'maya-kitchen-hero.png');
const CLIPS_DIR = path.join(ROOT, 'output', 'wan_clips');

export const WAN_SPACE_ID = 'zerogpu-aoti/wan2-2-fp8da-aoti-faster';

// Circuit breaker to prevent repeated failing requests when quota is exhausted or offline
let wanCircuitBreakerTripped = false;
let wanCircuitBreakerReason = null;

export function resetWanCircuitBreaker() {
  wanCircuitBreakerTripped = false;
  wanCircuitBreakerReason = null;
}

export function isWanCircuitBreakerTripped() {
  return wanCircuitBreakerTripped;
}

/**
 * Loads Hugging Face token from environment or .env file.
 */
export function getHfToken() {
  if (process.env.HF_TOKEN) return process.env.HF_TOKEN.trim();
  try {
    const envFile = path.join(ROOT, '.env');
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8');
      const match = content.match(/HF_TOKEN\s*=\s*([^\r\n]+)/);
      if (match) return match[1].trim();
    }
  } catch {}
  return null;
}

/**
 * Evaluates whether the Hugging Face Space is reachable and ready.
 * @returns {Promise<{ ok: boolean, status: string, message: string }>}
 */
export async function evaluateWanSpace() {
  if (wanCircuitBreakerTripped) {
    return {
      ok: false,
      status: 'CIRCUIT_OPEN',
      message: wanCircuitBreakerReason || 'Wan 2.2 Space is resting after quota limit.'
    };
  }

  const token = getHfToken();
  try {
    const client = await Client.connect(WAN_SPACE_ID, {
      token: token || undefined
    });
    return {
      ok: true,
      status: 'AVAILABLE',
      message: 'Wan 2.2 14B Fast Space is online and connected via Hugging Face ZeroGPU.'
    };
  } catch (err) {
    return {
      ok: false,
      status: 'UNAVAILABLE',
      message: `Wan 2.2 Space connection failed: ${err.message}`
    };
  }
}

/**
 * Generates a short animated cooking clip for a specific recipe step.
 * 
 * @param {Object} options
 * @param {string} options.stepKey - Unique step identifier (e.g., 'heat', 'pour', 'stir')
 * @param {string} options.actionPrompt - Specific prompt describing Maya's movement and food
 * @param {string} [options.imagePath] - Reference image of Chef Maya (default: maya-kitchen-hero.png)
 * @param {number} [options.duration=3.5] - Clip duration in seconds (1.0 to 5.0)
 * @param {number} [options.steps=6] - Inference steps (default 6 for Fast AOTI mode)
 * @returns {Promise<{ success: boolean, clipPath?: string, videoUrl?: string, reason?: string, fallbackRequired?: boolean }>}
 */
export async function generateWanCookingClip({
  stepKey = 'cooking_action',
  actionPrompt,
  imagePath = DEFAULT_REF_IMAGE,
  duration = 3.5,
  steps = 6
}) {
  if (wanCircuitBreakerTripped) {
    return {
      success: false,
      reason: wanCircuitBreakerReason || 'Hugging Face Wan 2.2 is resting after quota/network limits',
      fallbackRequired: true
    };
  }

  const token = getHfToken();
  if (!fs.existsSync(imagePath)) {
    return {
      success: false,
      reason: `Reference image not found at ${imagePath}`,
      fallbackRequired: true
    };
  }

  // Ensure clips output directory exists
  if (!fs.existsSync(CLIPS_DIR)) {
    fs.mkdirSync(CLIPS_DIR, { recursive: true });
  }

  // Refine prompt for consistent cartoon style and child-friendly aesthetic
  const fullPrompt = `${actionPrompt}, 3D cartoon style, cheerful girl chef Maya, colorful cozy kitchen, soft warm volumetric lighting, gentle natural movement, high quality animation, 30fps`;
  const negativePrompt = 'ugly, distorted, blurry, extra limbs, photorealistic, dark, terrifying, glitchy, static, text watermark';

  try {
    console.log(`[Wan 2.2] Connecting to ${WAN_SPACE_ID}...`);
    const client = await Client.connect(WAN_SPACE_ID, {
      token: token || undefined
    });

    console.log(`[Wan 2.2] Submitting clip generation for "${stepKey}"...`);
    const imgBuffer = fs.readFileSync(imagePath);
    const mimeType = imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
    const imgBlob = new Blob([imgBuffer], { type: mimeType });

    const result = await client.predict('/generate_video', {
      input_image: imgBlob,
      prompt: fullPrompt,
      steps: Math.min(10, Math.max(4, steps)),
      negative_prompt: negativePrompt,
      duration_seconds: Math.min(5.0, Math.max(1.0, duration)),
      guidance_scale: 1.0,
      guidance_scale_2: 1.0,
      seed: Math.floor(Math.random() * 100000),
      randomize_seed: true
    });

    const videoData = result.data?.[0];
    if (!videoData?.url) {
      throw new Error('No video URL returned in Gradio response');
    }

    // Download the video clip to local cache
    const response = await fetch(videoData.url);
    if (!response.ok) {
      throw new Error(`Failed to download generated video: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const clipFilename = `wan-${stepKey}-${Date.now()}.mp4`;
    const localClipPath = path.join(CLIPS_DIR, clipFilename);
    fs.writeFileSync(localClipPath, Buffer.from(arrayBuffer));

    console.log(`[Wan 2.2] Successfully saved clip to ${localClipPath}`);
    return {
      success: true,
      clipPath: localClipPath,
      videoUrl: videoData.url,
      isAiGenerated: true
    };
  } catch (err) {
    console.warn(`[Wan 2.2] Generation notice for "${stepKey}": ${err.message}`);
    const isQuotaExceeded = err.message.includes('429') || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('rate limit');
    const isNetworkError = err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT');

    if (isQuotaExceeded || isNetworkError) {
      wanCircuitBreakerTripped = true;
      wanCircuitBreakerReason = isQuotaExceeded
        ? 'Hugging Face ZeroGPU daily quota reached for today. Switching to full Remotion animation.'
        : `Hugging Face connection unavailable (${err.message}). Switching to full Remotion animation.`;
    }

    return {
      success: false,
      reason: wanCircuitBreakerReason || err.message,
      fallbackRequired: true
    };
  }
}

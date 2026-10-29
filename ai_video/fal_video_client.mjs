/**
 * Fal.ai Serverless GPU Video Client for LifeMotion Cooking Studio
 * 
 * Features:
 * - Direct REST API integration with Fal.ai Serverless GPU runtime.
 * - Executes Lightricks LTX-Video / Wan models with zero server maintenance.
 * - Pay-per-generation event pricing (~$0.01 to $0.02 per video).
 * - Scales to zero compute instances when idle.
 */

const FAL_API_URL = 'https://fal.run/fal-ai/ltx-video';

/**
 * Dispatches an enhanced recipe prompt to Fal.ai serverless GPU engine.
 * @param {object} params
 * @param {string} params.title Recipe title
 * @param {string} params.format "16:9" or "9:16"
 * @param {string} [params.falKey] Optional Fal.ai API key (defaults to process.env.FAL_KEY)
 * @returns {Promise<{ videoUrl: string, duration: number }>}
 */
export async function renderWithFalAI({
  title,
  format = '16:9',
  falKey = process.env.FAL_KEY
}) {
  if (!falKey) {
    throw new Error('FAL_KEY environment variable is required to use Fal.ai serverless GPU.');
  }

  const isPortrait = format === '9:16';
  const width = isPortrait ? 512 : 768;
  const height = isPortrait ? 768 : 512;

  const prompt = [
    '3D Pixar-style cartoon animation',
    'cute female chef Maya with green apron and chef hat',
    `happily cooking ${title} in a warm sunlit colorful cartoon kitchen`,
    'holding wooden spatula and cooking pan on stove',
    'puffy cartoon steam clouds, vibrant bright colors, volumetric lighting',
    'Disney studio 3D render quality, highly detailed'
  ].join(', ');

  const response = await fetch(FAL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: 'blurry, deformed, photorealistic, real life photo, dark, low quality',
      width,
      height,
      num_frames: 121,
      num_inference_steps: 30,
      fps: 24
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Fal.ai render failed with status ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  const videoUrl = result.video?.url || result.output?.url;

  if (!videoUrl) {
    throw new Error('Fal.ai returned an invalid response missing video URL.');
  }

  return {
    videoUrl,
    model: 'fal-ai/ltx-video',
    provider: 'fal.ai'
  };
}

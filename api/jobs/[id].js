import { getRenderProgress } from '@remotion/lambda/client';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const { id } = req.query || {};
  if (!id) {
    return res.status(400).json({ error: 'Missing job ID.' });
  }

  // Parse bucket and renderId
  let bucketName = process.env.REMOTION_BUCKET_NAME || 'remotionlambda-useast1-0wt9pieqmh';
  let renderId = id;

  if (id.includes(':')) {
    const parts = id.split(':');
    bucketName = parts[0];
    renderId = parts[1];
  }

  const region = process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
  const functionName = process.env.REMOTION_FUNCTION_NAME || 'remotion-render-4-0-539-mem2048mb-disk2048mb-120sec';

  try {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region
    });

    if (progress.fatalErrorEncountered) {
      const errorMsg = progress.errors?.[0]?.message || 'Cloud render failed.';
      return res.status(200).json({
        id,
        status: 'failed',
        progress: 0,
        message: errorMsg
      });
    }

    if (progress.done) {
      return res.status(200).json({
        id,
        status: 'complete',
        progress: 100,
        videoUrl: progress.outputFile,
        message: 'Your cartoon cooking video is ready to watch and download!'
      });
    }

    const pct = Math.max(5, Math.min(95, Math.round(progress.overallProgress * 100)));
    return res.status(200).json({
      id,
      status: 'rendering',
      progress: pct,
      message: `Chef Maya is animating your recipe (${pct}%)...`
    });
  } catch (err) {
    console.error('Job progress check error:', err);
    return res.status(500).json({
      error: 'Could not check video progress: ' + (err.message || String(err))
    });
  }
}

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const { prompt } = req.body || {};
  const dishName = typeof prompt === 'string' && prompt.trim() ? prompt.slice(0, 40) : 'Cooking Lesson';
  const id = 'preview-' + Date.now();

  return res.status(202).json({
    id,
    recipe: '3d-cooking-lesson',
    title: dishName,
    format: '16:9',
    voice: 'en-US-JennyNeural',
    status: 'complete',
    progress: 100,
    message: 'Your 3D cooking preview is ready!',
    previewUrl: '/studio3d/assets/sample-preview.mp4',
    videoUrl: '/studio3d/assets/sample-preview.mp4'
  });
}

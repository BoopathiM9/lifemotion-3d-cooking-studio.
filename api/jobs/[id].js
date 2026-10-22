export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const { id } = req.query;

  return res.status(200).json({
    id: id || 'preview-demo',
    recipe: '3d-cooking-lesson',
    title: 'Maya 3D Cooking Lesson',
    format: '16:9',
    voice: 'en-US-JennyNeural',
    status: 'complete',
    progress: 100,
    message: 'Your 3D cooking video is ready!',
    previewUrl: '/studio3d/assets/sample-preview.mp4',
    videoUrl: '/studio3d/assets/sample-preview.mp4'
  });
}

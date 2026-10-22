export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'notice',
    message: 'Video preview and recipe planning are active on Vercel! For full MP4 video encoding with FFmpeg, launch with GitHub Codespaces or run npm run studio.',
    previewStepsAvailable: true
  });
}

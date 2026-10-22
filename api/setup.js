export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  return res.status(200).json({
    ready: true,
    python: true,
    ffmpeg: true,
    voices: true,
    cloud: 'vercel'
  });
}

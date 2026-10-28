export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  return res.status(404).json({error: 'This local rendering job is not available on Vercel.'});
}

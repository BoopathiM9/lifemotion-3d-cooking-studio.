export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  return res.status(503).json({
    error: 'MP4 rendering runs in the local LifeMotion Studio. Clone the project, run npm.cmd run setup, then npm.cmd run studio.'
  });
}

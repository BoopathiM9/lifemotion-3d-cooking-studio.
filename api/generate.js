import { renderMediaOnLambda } from '@remotion/lambda/client';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, voice, format } = req.body || {};
  const cleanPrompt = (typeof prompt === 'string' ? prompt.trim() : '') || 'Cooking Lesson';
  const selectedFormat = format === '9:16' ? '9:16' : '16:9';
  const selectedVoice = voice || 'en-US-JennyNeural';

  // 1. Build or generate recipe plan
  const key = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  let plan = null;

  if (key) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are Chef Maya, creating a child-friendly cartoon cooking video lesson.
Convert this dish request: "${cleanPrompt}" into a structured 5-step animation plan.
Respond with valid JSON only in this format:
{
  "title": "Dish Name",
  "ingredients": [
    {"id": "main_item", "name": "Item Name", "color": "#e08030"}
  ],
  "steps": [
    {"key": "welcome", "text": "Welcome little chefs! Today we make...", "action": "show"},
    {"key": "safe", "text": "Safety note: always ask an adult to handle hot cookware.", "action": "show"},
    {"key": "add_ing", "text": "Add fresh ingredients into the pot.", "action": "add"},
    {"key": "cook_dish", "text": "Stir and cook gently until fragrant and ready.", "action": "cook"},
    {"key": "serve_dish", "text": "Serve onto our plate. Delicious job!", "action": "serve"}
  ]
}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          const rawSteps = parsed.steps || [];
          const stepSeconds = 4;
          const actions = rawSteps.map((s, idx) => ({
            key: s.key || `step_${idx}`,
            action: s.action || (idx === 0 || idx === 1 ? 'show' : idx === rawSteps.length - 1 ? 'serve' : 'cook'),
            text: s.text,
            start: idx * stepSeconds,
            end: (idx + 1) * stepSeconds
          }));

          plan = {
            recipe: (parsed.title || 'custom').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            title: parsed.title || cleanPrompt.slice(0, 40),
            format: selectedFormat,
            voice: selectedVoice,
            ingredients: parsed.ingredients || [{ id: 'food', name: parsed.title, color: '#e5a54b' }],
            actions
          };
        }
      }
    } catch (err) {
      console.warn('Gemini dynamic plan error:', err.message);
    }
  }

  // Local fallback recipe plan if Gemini API key not configured
  if (!plan) {
    const dishTitle = cleanPrompt.slice(0, 40);
    const stepSeconds = 4;
    plan = {
      recipe: dishTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: dishTitle,
      format: selectedFormat,
      voice: selectedVoice,
      ingredients: [
        { id: 'fresh_item', name: dishTitle, color: '#f1b85e' }
      ],
      actions: [
        { key: 'welcome', action: 'show', text: `Welcome little chefs! Today we are making ${dishTitle}!`, start: 0, end: stepSeconds },
        { key: 'safe', action: 'show', text: 'Wash your hands first, and always ask a grown-up for help around hot cookware.', start: stepSeconds, end: stepSeconds * 2 },
        { key: 'add', action: 'add', text: `Gently add our fresh ingredients into the cooking bowl.`, start: stepSeconds * 2, end: stepSeconds * 3 },
        { key: 'cook', action: 'cook', text: `Stir and cook gently as delicious aromas fill the room.`, start: stepSeconds * 3, end: stepSeconds * 4 },
        { key: 'serve', action: 'serve', text: `Spoon our freshly cooked ${dishTitle} onto the plate. Great job!`, start: stepSeconds * 4, end: stepSeconds * 5 }
      ]
    };
  }

  const duration = plan.actions.length * 4;
  const lesson = {
    duration,
    steps: plan.actions,
    captions: plan.actions.map(a => ({ start: a.start, end: a.end, text: a.text }))
  };

  const isPortrait = selectedFormat === '9:16';
  const width = isPortrait ? 720 : 1280;
  const height = isPortrait ? 1280 : 720;
  const fps = 24;

  const region = process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
  const functionName = process.env.REMOTION_FUNCTION_NAME || 'remotion-render-4-0-539-mem2048mb-disk2048mb-120sec';
  const serveUrl = process.env.REMOTION_SERVE_URL || 'https://remotionlambda-useast1-0wt9pieqmh.s3.us-east-1.amazonaws.com/sites/cooking-studio/index.html';

  try {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: 'LifeMotionCooking',
      inputProps: {
        plan,
        lesson,
        audioFile: null,
        fps,
        width,
        height,
        durationInFrames: duration * fps
      },
      framesPerLambda: 120, // Concurrency optimized for AWS Free Tier
      codec: 'h264',
      privacy: 'public'
    });

    const jobId = `${bucketName}:${renderId}`;
    return res.status(202).json({
      id: jobId,
      recipe: plan.recipe,
      title: plan.title,
      format: selectedFormat,
      voice: selectedVoice,
      status: 'rendering',
      progress: 5,
      message: `Chef Maya is creating the cartoon cooking video for ${plan.title}...`
    });
  } catch (err) {
    console.error('AWS Lambda Video Render Error:', err);
    return res.status(500).json({
      error: 'Could not start cloud video render: ' + (err.message || String(err))
    });
  }
}

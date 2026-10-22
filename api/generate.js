export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const { prompt, voice, format } = req.body || {};
  const cleanPrompt = (typeof prompt === 'string' ? prompt.trim() : '') || 'Cooking Lesson';
  const lower = cleanPrompt.toLowerCase();

  // 1. Signature Recipe: Chicken Biryani
  if (lower.includes('biryani') || lower.includes('chicken biryani')) {
    return res.status(202).json({
      id: 'job-biryani-' + Date.now(),
      recipe: 'chicken-biryani',
      title: 'Chicken Biryani',
      format: format || '16:9',
      voice: voice || 'en-US-JennyNeural',
      status: 'complete',
      progress: 100,
      message: 'Your 3D Chicken Biryani animation is ready!',
      previewUrl: '/studio3d/assets/sample-preview.mp4',
      videoUrl: '/studio3d/assets/sample-preview.mp4'
    });
  }

  // 2. Signature Recipe: Masala Dosa
  if (lower.includes('dosa') || lower.includes('masala dosa')) {
    return res.status(202).json({
      id: 'job-dosa-' + Date.now(),
      recipe: 'masala-dosa',
      title: 'Masala Dosa',
      format: format || '16:9',
      voice: voice || 'en-US-JennyNeural',
      status: 'complete',
      progress: 100,
      message: 'Your 3D Masala Dosa animation is ready!',
      previewUrl: '/studio3d/assets/masala-dosa.mp4',
      videoUrl: '/studio3d/assets/masala-dosa.mp4'
    });
  }

  // 3. Signature Recipe: Vegetable Sandwich
  if (lower.includes('sandwich')) {
    return res.status(202).json({
      id: 'job-sandwich-' + Date.now(),
      recipe: 'vegetable-sandwich',
      title: 'Vegetable Sandwich',
      format: format || '16:9',
      voice: voice || 'en-US-JennyNeural',
      status: 'complete',
      progress: 100,
      message: 'Your 3D Vegetable Sandwich animation is ready!',
      previewUrl: '/studio3d/assets/vegetable-sandwich.mp4',
      videoUrl: '/studio3d/assets/vegetable-sandwich.mp4'
    });
  }

  // 4. Any Custom Recipe: Generate Dynamic Plan via Gemini for In-Browser 3D Animation & Video Recording
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
              text: `You are Chef Maya, creating a 3D animated cooking lesson.
Convert this dish request: "${cleanPrompt}" into a structured 3D animation plan.
Respond with valid JSON only in this format:
{
  "title": "Dish Name",
  "primaryEquipment": "pot" or "pan" or "bowl",
  "utensil": "spoon" or "spatula",
  "ingredients": [
    {"id": "main_item", "name": "Item Name", "category": "vegetable" or "grain" or "meat" or "sauce", "color": "#e08030"}
  ],
  "steps": [
    {"key": "welcome", "text": "Welcome little chefs! Today we make...", "action": "show"},
    {"key": "safe", "text": "Safety note: ask an adult to handle hot cookware.", "action": "show"},
    {"key": "add_ing", "text": "Add our ingredients...", "action": "add"},
    {"key": "cook_dish", "text": "Stir and cook until ready...", "action": "cook"},
    {"key": "serve_dish", "text": "Serve onto our plate. Delicious!", "action": "serve"}
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
          const actions = (parsed.steps || []).map((s, idx) => ({
            key: s.key || `step_${idx}`,
            action: s.action || (idx === 0 || idx === 1 ? 'show' : idx === parsed.steps.length - 1 ? 'serve' : 'cook'),
            text: s.text,
            start: idx * 6,
            speechEnd: idx * 6 + 5.5,
            end: (idx + 1) * 6
          }));

          plan = {
            recipeId: (parsed.title || 'custom').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            title: parsed.title || cleanPrompt.slice(0, 40),
            primaryEquipment: parsed.primaryEquipment || (lower.includes('soup') || lower.includes('rice') || lower.includes('pasta') ? 'pot' : 'pan'),
            utensil: parsed.utensil || 'spoon',
            ingredients: parsed.ingredients || [{ id: 'food', name: parsed.title, category: 'vegetable', color: '#e5a54b' }],
            actions
          };
        }
      }
    } catch (err) {
      console.warn('Gemini dynamic plan error:', err.message);
    }
  }

  // Local fallback plan if Gemini key not set or timed out
  if (!plan) {
    const isSoup = lower.includes('soup') || lower.includes('curry') || lower.includes('stew') || lower.includes('rice') || lower.includes('pasta');
    const eq = isSoup ? 'pot' : 'pan';
    const dishTitle = cleanPrompt.slice(0, 35);
    plan = {
      recipeId: 'custom-dish',
      title: dishTitle,
      primaryEquipment: eq,
      utensil: eq === 'pot' ? 'spoon' : 'spatula',
      ingredients: [
        { id: 'main_item', name: dishTitle, category: 'vegetable', color: '#e59b48' }
      ],
      actions: [
        { key: 'welcome', action: 'show', text: `Welcome little chefs! Today we are making ${dishTitle}!`, start: 0, speechEnd: 5.5, end: 6 },
        { key: 'safe', action: 'show', text: 'Wash your hands first, and always ask a grown-up for help around hot cookware.', start: 6, speechEnd: 11.5, end: 12 },
        { key: 'add', action: 'add', text: `Gently add our fresh ingredients into the ${eq}.`, start: 12, speechEnd: 17.5, end: 18 },
        { key: 'cook', action: 'cook', text: `Stir and cook gently as delicious aromas fill the kitchen.`, start: 18, speechEnd: 23.5, end: 24 },
        { key: 'serve', action: 'serve', text: `Spoon our freshly cooked ${dishTitle} onto the serving plate. Great job!`, start: 24, speechEnd: 29.5, end: 30 }
      ]
    };
  }

  return res.status(202).json({
    id: 'live-' + Date.now(),
    recipe: plan.recipeId,
    title: plan.title,
    format: format || '16:9',
    voice: voice || 'en-US-JennyNeural',
    status: 'complete',
    progress: 100,
    isLive3D: true,
    plan,
    message: `Your 3D animation for ${plan.title} is ready to watch and record!`
  });
}

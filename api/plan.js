export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Please enter a cooking prompt.' });
  }

  const cleanPrompt = prompt.trim();
  const key = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (key) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are Chef Maya, creating a child-friendly 3D cooking video lesson.
Convert this cooking request into a structured lesson: "${cleanPrompt}".
Respond with valid JSON only in this format:
{
  "title": "Dish Name",
  "ingredients": ["Item 1", "Item 2", "Item 3"],
  "steps": [
    {"key": "welcome", "text": "Friendly welcome for little chefs...", "action": "show"},
    {"key": "safe", "text": "Child safety reminder for hot stove or tools...", "action": "show"},
    {"key": "add_ingredients", "text": "Step description...", "action": "add"},
    {"key": "cook_dish", "text": "Cooking description...", "action": "cook"},
    {"key": "serve", "text": "Plating and serving description...", "action": "serve"}
  ]
}`
            }]
          }],
          generationConfig: {
            temperature: 0.25,
            responseMimeType: 'application/json'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return res.status(200).json({
            title: parsed.title || cleanPrompt.slice(0, 40),
            recipe: (parsed.title || 'custom').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            generic: false,
            source: 'gemini',
            steps: parsed.steps || [],
            ingredients: parsed.ingredients || []
          });
        }
      }
    } catch (err) {
      console.error('Gemini Vercel API error:', err.message);
    }
  }

  // Fallback plan
  const title = cleanPrompt.slice(0, 50);
  return res.status(200).json({
    title,
    recipe: 'custom-recipe',
    generic: true,
    source: 'local',
    limitations: key ? null : 'To use full Gemini AI planning, add GEMINI_API_KEY to your Vercel Environment Variables.',
    steps: [
      { key: 'welcome', text: `Hello little chefs! I'm Chef Maya. Let's make ${title}!`, action: 'show' },
      { key: 'safe', text: 'Wash your hands first, and always ask a grown-up for help around warm cookware.', action: 'show' },
      { key: 'prep', text: 'Gather our fresh ingredients and tools on the counter.', action: 'add' },
      { key: 'cook', text: `Cook and simmer gently with our spoon as delicious aromas fill the room.`, action: 'cook' },
      { key: 'serve', text: `Spoon our freshly prepared ${title} onto the plate. Great cooking, little chefs!`, action: 'serve' }
    ],
    ingredients: ['Main Ingredients', 'Fresh Seasonings']
  });
}

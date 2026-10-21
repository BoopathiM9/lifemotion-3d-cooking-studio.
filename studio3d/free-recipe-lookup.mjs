const API = 'https://www.themealdb.com/api/json/v1/1/search.php?s=';

export async function analyzeWithGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const instruction = [
    'Turn this cooking request into a short, accurate recipe lesson for children.',
    'Use simple English, list ingredients, then give 6 to 10 short steps.',
    'Include one age-appropriate safety reminder for hot tools or sharp tools when needed.',
    'Do not invent unavailable ingredients or unsafe cooking instructions.',
    'Reply as plain text only.',
    `Request: ${String(prompt).slice(0, 1200)}`
  ].join('\n');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: instruction }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 1000 } }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) return null;
    const text = (await response.json()).candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim();
    return text && text.length >= 80 ? text.slice(0, 2000) : null;
  } catch {
    return null;
  }
}

function recipeName(prompt) {
  return String(prompt)
    .replace(/teach\s+(children|kids|me)\s+(how\s+)?to\s+make/ig, '')
    .replace(/make\s+(a\s+)?(cheerful\s+)?(3d\s+)?(cartoon\s+)?cooking\s+video\s+(where\s+maya\s+makes\s+)?/ig, '')
    .replace(/step by step.*$/i, '')
    .replace(/[.?!]/g, ' ')
    .trim()
    .slice(0, 80);
}

export async function enrichWithFreeRecipe(prompt) {
  const query = recipeName(prompt);
  if (!query) return null;
  try {
    const response = await fetch(API + encodeURIComponent(query), { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return null;
    const meal = (await response.json()).meals?.[0];
    if (!meal?.strInstructions) return null;
    const ingredients = Array.from({ length: 20 }, (_, index) => {
      const item = meal[`strIngredient${index + 1}`]?.trim();
      const measure = meal[`strMeasure${index + 1}`]?.trim();
      return item ? `${measure || ''} ${item}`.trim() : null;
    }).filter(Boolean).join(', ');
    return `Teach children how to make ${meal.strMeal} step by step in simple English. Ingredients: ${ingredients}. Instructions: ${meal.strInstructions}`.slice(0, 2000);
  } catch {
    return null;
  }
}

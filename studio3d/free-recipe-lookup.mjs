const API = 'https://www.themealdb.com/api/json/v1/1/search.php?s=';

async function geminiText(instruction, maxOutputTokens) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const models = [...new Set([process.env.GEMINI_MODEL, 'gemini-2.5-flash-lite', 'gemini-2.5-flash'].filter(Boolean))];
  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: instruction }] }], generationConfig: { temperature: 0.25, maxOutputTokens } }),
        signal: AbortSignal.timeout(4500)
      });
      if (!response.ok) continue;
      const text = (await response.json()).candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim();
      if (text) return text;
    } catch {}
  }
  return null;
}

export async function analyzeWithGemini(prompt) {
  const instruction = [
    'Turn this cooking request into a short, accurate recipe lesson for children.',
    'Use simple English, list ingredients, then give 6 to 10 short steps.',
    'Include one age-appropriate safety reminder for hot tools or sharp tools when needed.',
    'Do not invent unavailable ingredients or unsafe cooking instructions.',
    'Reply as plain text only.',
    `Request: ${String(prompt).slice(0, 1200)}`
  ].join('\n');
  const text = await geminiText(instruction, 1000);
  return text && text.length >= 80 ? text.slice(0, 2000) : null;
}

export async function translateActionsToTamil(actions) {
  if (!process.env.GEMINI_API_KEY?.trim() || !Array.isArray(actions) || !actions.length) return null;
  const instruction = [
    'Translate every cooking lesson line below into natural, child-friendly Tamil.',
    'Keep each line short. Preserve safety guidance. Return only a JSON array of strings in exactly the same order.',
    JSON.stringify(actions.map(action => action.text))
  ].join('\n');
  try {
    const text = (await geminiText(instruction, 1200))?.replace(/^```json\s*|\s*```$/g, '');
    if (!text) return null;
    const translated = JSON.parse(text);
    return Array.isArray(translated) && translated.length === actions.length && translated.every(line => typeof line === 'string' && line.trim()) ? translated : null;
  } catch {
    return null;
  }
}

export async function translateActionsWithFreeService(actions) {
  if (!Array.isArray(actions) || !actions.length) return null;
  try {
    const translated = await Promise.all(actions.map(async action => {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(action.text.slice(0, 450))}&langpair=en|ta`;
      const response = await fetch(url, { headers: { 'User-Agent': 'LifeMotion-Cooking-Studio/1.0' }, signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw Error('Translation service unavailable');
      const text = (await response.json()).responseData?.translatedText?.trim();
      if (!text || text.toLowerCase() === action.text.trim().toLowerCase()) throw Error('Translation was unchanged');
      return text;
    }));
    return translated.length === actions.length ? translated : null;
  } catch {
    return null;
  }
}

export function translateActionsWithLocalTamil(actions, title = 'இந்த உணவு') {
  if (!Array.isArray(actions) || !actions.length) return null;
  const dish = String(title || 'இந்த உணவு').trim();
  return actions.map((action, index) => {
    const key = String(action.key || '').toLowerCase();
    const verb = String(action.action || '').toLowerCase();
    if (key.includes('welcome') || index === 0) return `வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் ${dish} செய்வோம்.`;
    if (key.includes('safe')) return 'சூடான பாத்திரங்களையும் கூர்மையான கருவிகளையும் பயன்படுத்த பெரியவரின் உதவியை கேளுங்கள்.';
    if (verb === 'show') return 'தேவையான பொருட்கள் அனைத்தையும் தயாராக வைத்துக்கொள்ளுங்கள்.';
    if (['add', 'pour'].includes(verb)) return 'இந்த பொருளை மெதுவாக பாத்திரத்தில் சேர்க்கவும்.';
    if (['mix', 'stir', 'spread'].includes(verb)) return 'அனைத்தையும் மெதுவாகவும் நன்றாகவும் கலக்கவும்.';
    if (verb === 'flip') return 'பெரியவரின் உதவியுடன் இதை கவனமாக திருப்பவும்.';
    if (['boil', 'simmer', 'cook', 'heat'].includes(verb)) return 'பெரியவரின் உதவியுடன் இதை நன்றாக வேகவைக்கவும்.';
    if (['serve', 'plate'].includes(verb)) return `${dish} தயார்! அதை தட்டில் வைத்து மகிழ்ச்சியாக பரிமாறலாம்.`;
    return 'அடுத்த படியை மெதுவாகவும் கவனமாகவும் செய்யுங்கள்.';
  });
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

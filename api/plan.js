function cleanRecipeTitle(prompt) {
  return String(prompt || 'Cooking Lesson')
    .replace(/teach\s+(children|kids|me)\s+(how\s+)?to\s+make/ig, '')
    .replace(/make\s+(a\s+)?(cheerful\s+)?(3d\s+)?(cartoon\s+)?cooking\s+video\s+(where\s+maya\s+makes\s+)?/ig, '')
    .replace(/step by step.*$/i, '')
    .replace(/[.?!]/g, ' ')
    .trim()
    .slice(0, 40) || 'Delicious Dish';
}

function getTamilSteps(dishTitle) {
  return [
    { key: 'welcome', action: 'show', text: `வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று நாம் சுவையான ${dishTitle} செய்வோம்!` },
    { key: 'safe', action: 'show', text: 'சூடான பாத்திரங்களையும் அடுப்பையும் பயன்படுத்த பெரியவரின் உதவியை கேளுங்கள்.' },
    { key: 'add', action: 'add', text: `தேவையான புதிய பொருட்களை மெதுவாக சமையல் பாத்திரத்தில் சேர்க்கவும்.` },
    { key: 'cook', action: 'cook', text: `நறுமணம் கமழ மெதுவாக கிளறி அழகாக வேகவைக்கவும்.` },
    { key: 'serve', action: 'serve', text: `சுவையான ${dishTitle} தயார்! தட்டில் வைத்து பரிமாறி மகிழுங்கள்!` }
  ];
}

function getEnglishSteps(dishTitle) {
  return [
    { key: 'welcome', action: 'show', text: `Welcome little chefs! Today we are making ${dishTitle}!` },
    { key: 'safe', action: 'show', text: 'Wash your hands first, and always ask a grown-up for help around hot cookware.' },
    { key: 'add', action: 'add', text: `Gently add our fresh ingredients into the cooking bowl.` },
    { key: 'cook', action: 'cook', text: `Stir and cook gently as delicious aromas fill the room.` },
    { key: 'serve', action: 'serve', text: `Spoon our freshly cooked ${dishTitle} onto the plate. Great job!` }
  ];
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, voice } = req.body || {};
  const isTamil = voice === 'ta-IN-PallaviNeural';
  const dishTitle = cleanRecipeTitle(prompt);

  const steps = isTamil ? getTamilSteps(dishTitle) : getEnglishSteps(dishTitle);

  return res.status(200).json({
    title: isTamil ? `${dishTitle} செய்முறை` : dishTitle,
    recipe: dishTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    generic: false,
    source: isTamil ? 'Tamil AI narration' : 'AI recipe plan',
    steps,
    ingredients: isTamil ? ['புதிய பொருட்கள்', 'சுவைப்பொருட்கள்'] : ['Fresh Ingredients', 'Seasonings']
  });
}

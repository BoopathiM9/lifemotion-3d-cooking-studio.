import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const region = process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.REMOTION_BUCKET_NAME || 'remotionlambda-useast1-0wt9pieqmh';
const s3 = new S3Client({ region });

const RECIPE_CATALOG = {
  'chicken-biryani': {
    aliases: ['biryani', 'biriyani', 'chicken biryani', 'chicken dum biryani', 'dum biryani'],
    titleEn: 'Chicken Biryani',
    titleTa: 'சிக்கன் பிரியாணி (Chicken Biryani)',
    ingredientsEn: [
      { id: 'rice', name: 'Basmati Rice', color: '#fbfbf0' },
      { id: 'chicken', name: 'Chicken Pieces', color: '#d69a68' },
      { id: 'onion', name: 'Golden Onions', color: '#b57c3d' },
      { id: 'ghee', name: 'Ghee & Spices', color: '#dfb445' },
      { id: 'mint', name: 'Fresh Mint & Herbs', color: '#27ae60' }
    ],
    ingredientsTa: [
      { id: 'rice', name: 'பாஸ்மதி அரிசி', color: '#fbfbf0' },
      { id: 'chicken', name: 'சிக்கன் துண்டுகள்', color: '#d69a68' },
      { id: 'onion', name: 'நறுக்கிய வெங்காயம்', color: '#b57c3d' },
      { id: 'ghee', name: 'நெய் மற்றும் மசாலா', color: '#dfb445' },
      { id: 'mint', name: 'புதினா மற்றும் கொத்தமல்லி', color: '#27ae60' }
    ],
    stepsEn: [
      { key: 'welcome', action: 'show', text: "Welcome little chefs! Today we are making royal fragrant Chicken Biryani with Chef Maya!", start: 0, end: 6 },
      { key: 'safe', action: 'show', text: "Wash your hands clean, and ask a grown-up to help around hot stoves and cooking pots.", start: 6, end: 13 },
      { key: 'prep', action: 'show', text: "Soak our aromatic basmati rice in water, and keep fresh chicken pieces and spices ready.", start: 13, end: 20 },
      { key: 'saute', action: 'add', text: "Warm golden ghee in our deep cooking pot, and add whole cloves, cardamom, and sliced onions.", start: 20, end: 28 },
      { key: 'chicken', action: 'add', text: "Add our tender chicken pieces with rich aromatic spices, stirring so every piece is coated.", start: 28, end: 36 },
      { key: 'simmer', action: 'cook', text: "Pour in a little water, cover with the lid, and simmer gently until the chicken is tender and juicy.", start: 36, end: 44 },
      { key: 'layer', action: 'layer', text: "Gently layer our drained basmati rice on top, scattering fresh mint and saffron strands.", start: 44, end: 52 },
      { key: 'steam', action: 'cook', text: "Cover tightly on low heat so the rice steams fluffy and absorbs all the heavenly flavors.", start: 52, end: 60 },
      { key: 'serve', action: 'serve', text: "Spoon steaming, colorful Chicken Biryani onto our serving plate. It smells incredible!", start: 60, end: 68 }
    ],
    stepsTa: [
      { key: 'welcome', action: 'show', text: "வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான சிக்கன் பிரியாணி சமைப்போம்!", start: 0, end: 6 },
      { key: 'safe', action: 'show', text: "கைகளை நன்றாக கழுவுங்கள். சூடான அடுப்பு மற்றும் பாத்திரங்களை பயன்படுத்த பெரியவர்களின் உதவியை நாடுங்கள்.", start: 6, end: 13 },
      { key: 'prep', action: 'show', text: "பாஸ்மதி அரிசியை ஊறவைத்து, புதிய சிக்கன் துண்டுகள் மற்றும் வாசனை மசாலாக்களை தயாராக வைக்கவும்.", start: 13, end: 20 },
      { key: 'saute', action: 'add', text: "பாத்திரத்தில் நெய் ஊற்றி, ஏலக்காய், பட்டை மற்றும் நறுக்கிய வெங்காயத்தை பொன்னிறமாக வதக்கவும்.", start: 20, end: 28 },
      { key: 'chicken', action: 'add', text: "மசாலா கலந்த சிக்கன் துண்டுகளை சேர்த்து, மசாலா சிக்கனில் நன்றாக சேருமாறு வதக்கவும்.", start: 28, end: 36 },
      { key: 'simmer', action: 'cook', text: "சிறிதளவு தண்ணீர் சேர்த்து, மூடி போட்டு சிக்கன் மென்மையாகவும் சாறாகவும் வேகும் வரை சமைக்கவும்.", start: 36, end: 44 },
      { key: 'layer', action: 'layer', text: "வாசனை பாஸ்மதி அரிசியை சிக்கனின் மேல் பரப்பி, புதினா மற்றும் கொத்தமல்லி தழைகளை தூவவும்.", start: 44, end: 52 },
      { key: 'steam', action: 'cook', text: "பாத்திரத்தை மூடி, மிதமான தீயில் வைத்து அரிசி உதிரியாகவும் வாசனையுடனும் வேகும் வரை தம் போடவும்.", start: 52, end: 60 },
      { key: 'serve', action: 'serve', text: "சுடச்சுட மணக்கும் சிக்கன் பிரியாணியை அழகான தட்டில் வைத்து பரிமாறுங்கள். மிகச் சிறப்பான சமையல்!", start: 60, end: 68 }
    ]
  },
  'masala-dosa': {
    aliases: ['dosa', 'masala dosa', 'dosai'],
    titleEn: 'Crispy Masala Dosa',
    titleTa: 'மொறுமொறு மசாலா தோசை (Masala Dosa)',
    ingredientsEn: [
      { id: 'batter', name: 'Dosa Batter', color: '#fffdf5' },
      { id: 'masala', name: 'Potato Masala', color: '#e0a538' },
      { id: 'oil', name: 'Golden Ghee', color: '#e5b84c' },
      { id: 'chutney', name: 'Coconut Chutney', color: '#f0f3f4' }
    ],
    ingredientsTa: [
      { id: 'batter', name: 'தோசை மாவு', color: '#fffdf5' },
      { id: 'masala', name: 'உருளைக்கிழங்கு மசாலா', color: '#e0a538' },
      { id: 'oil', name: 'நெய் மற்றும் எண்ணெய்', color: '#e5b84c' },
      { id: 'chutney', name: 'தேங்காய் சட்னி', color: '#f0f3f4' }
    ],
    stepsEn: [
      { key: 'welcome', action: 'show', text: "Welcome little chefs! Today we make golden crispy South Indian Masala Dosa with Chef Maya!", start: 0, end: 6 },
      { key: 'safe', action: 'show', text: "Always ask a grown-up for help around the hot tawa griddle to stay safe.", start: 6, end: 13 },
      { key: 'prep', action: 'show', text: "We have smooth fermented rice-lentil batter and warm spiced potato filling ready to cook.", start: 13, end: 20 },
      { key: 'warm', action: 'cook', text: "Warm our flat tawa griddle over medium heat and lightly grease the surface.", start: 20, end: 27 },
      { key: 'pour', action: 'pour', text: "Pour a generous ladle of smooth batter right in the center of our warm tawa.", start: 27, end: 34 },
      { key: 'spread', action: 'spread', text: "Using the ladle base, spread the batter outward smoothly into a wide, even circle.", start: 34, end: 42 },
      { key: 'crisp', action: 'cook', text: "Drizzle golden ghee along the edges and let it cook until golden, fragrant, and crispy.", start: 42, end: 50 },
      { key: 'masala', action: 'add', text: "Spoon our delicious spiced potato filling right across the center of the crispy crepe.", start: 50, end: 58 },
      { key: 'serve', action: 'serve', text: "Fold the golden dosa carefully, and plate with fresh coconut chutney and spicy sambar!", start: 58, end: 66 }
    ],
    stepsTa: [
      { key: 'welcome', action: 'show', text: "வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் மொறுமொறுப்பான மசாலா தோசை செய்வோம்!", start: 0, end: 6 },
      { key: 'safe', action: 'show', text: "சூடான தோசைக் கல்லை பயன்படுத்தும்போது எப்போதும் பெரியவர்களின் பாதுகாப்பான உதவியைப் பெறுங்கள்.", start: 6, end: 13 },
      { key: 'prep', action: 'show', text: "மென்மையான தோசை மாவு மற்றும் உருளைக்கிழங்கு மசாலாவை தயாராக எடுத்துக்கொள்ளுங்கள்.", start: 13, end: 20 },
      { key: 'warm', action: 'cook', text: "தோசைக் கல்லை மிதமான தீயில் சூடாக்கி, சிறிதளவு எண்ணெய் தடவி தயார் செய்யுங்கள்.", start: 20, end: 27 },
      { key: 'pour', action: 'pour', text: "ஒரு கரண்டி தோசை மாவை எடுத்து சூடான தோசைக் கல்லின் நடுவே மெதுவாக ஊற்றவும்.", start: 27, end: 34 },
      { key: 'spread', action: 'spread', text: "கரண்டியின் அடிப்புறத்தை வைத்து நடுவிலிருந்து வெளிப்பக்கமாக வட்டமாக அழகாக தேய்க்கவும்.", start: 34, end: 42 },
      { key: 'crisp', action: 'cook', text: "ஓரங்களில் பொன்னிற நெய் ஊற்றி, தோசை பொன்னிறமாக மொறுமொறுப்பாகும் வரை வேகவைக்கவும்.", start: 42, end: 50 },
      { key: 'masala', action: 'add', text: "சுவையான மஞ்சள் உருளைக்கிழங்கு மசாலாவை தோசையின் நடுவில் சீராக பரப்பி வைக்கவும்.", start: 50, end: 58 },
      { key: 'serve', action: 'serve', text: "மொறுமொறு மசாலா தோசையை தட்டில் வைத்து தேங்காய் சட்னி மற்றும் சாம்பாருடன் பரிமாறுங்கள்!", start: 58, end: 66 }
    ]
  }
};

function matchRecipe(prompt = '') {
  const lower = prompt.toLowerCase();
  for (const [id, data] of Object.entries(RECIPE_CATALOG)) {
    for (const alias of data.aliases) {
      if (lower.includes(alias)) return { id, ...data };
    }
  }
  return null;
}

function cleanRecipeTitle(prompt = '') {
  return String(prompt || 'Delicious Meal')
    .replace(/teach\s+(children|kids|me)\s+(how\s+)?to\s+make/ig, '')
    .replace(/make\s+(a\s+)?(cheerful\s+)?(3d\s+)?(cartoon\s+)?cooking\s+video\s+(where\s+maya\s+makes\s+)?/ig, '')
    .replace(/step by step.*$/i, '')
    .replace(/[.?!]/g, ' ')
    .trim()
    .slice(0, 40) || 'Special Meal';
}

function getCustomRecipePlan(dishTitle, isTamil) {
  if (isTamil) {
    return {
      title: `${dishTitle} (செய்முறை)`,
      recipeId: dishTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      ingredients: [
        { id: 'main', name: dishTitle, color: '#f1b85e' },
        { id: 'veggies', name: 'நறுக்கிய காய்கறிகள்', color: '#27ae60' },
        { id: 'spices', name: 'நறுமண மசாலா', color: '#e65100' }
      ],
      steps: [
        { key: 'welcome', action: 'show', text: `வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான ${dishTitle} செய்வோம்!`, start: 0, end: 6 },
        { key: 'safe', action: 'show', text: 'சூடான பாத்திரங்களையும் அடுப்பையும் பயன்படுத்த எப்போதும் பெரியவர்களின் உதவியை கேளுங்கள்.', start: 6, end: 13 },
        { key: 'prep', action: 'show', text: `சுவையான ${dishTitle} செய்ய தேவையான அனைத்து புதிய பொருட்களையும் தயாராக வைக்கவும்.`, start: 13, end: 20 },
        { key: 'heat', action: 'cook', text: `சமையல் பாத்திரத்தை மிதமான தீயில் வைத்து, சிறிது எண்ணெய் அல்லது நெய் ஊற்றி சூடாக்கவும்.`, start: 20, end: 27 },
        { key: 'aromatics', action: 'add', text: 'நறுக்கிய வெங்காயம் மற்றும் நறுமணப் பொருட்களை சேர்த்து பொன்னிறமாக வதக்கவும்.', start: 27, end: 35 },
        { key: 'main', action: 'add', text: `முக்கிய சுவைப்பொருட்களை சேர்த்து மரக்கரண்டியால் சுவைகள் ஒன்றுசேருமாறு கிளறவும்.`, start: 35, end: 43 },
        { key: 'simmer', action: 'cook', text: 'சிறிதளவு தண்ணீர் மற்றும் உப்பு சேர்த்து, மூடி வைத்து மிதமான தீயில் வேகவைக்கவும்.', start: 43, end: 51 },
        { key: 'serve', action: 'serve', text: `சுடச்சுட தயாரான ${dishTitle} உணவை தட்டில் வைத்து மகிழ்ச்சியாக பரிமாறுங்கள்!`, start: 51, end: 60 }
      ]
    };
  }
  return {
    title: dishTitle,
    recipeId: dishTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    ingredients: [
      { id: 'main', name: dishTitle, color: '#f1b85e' },
      { id: 'veggies', name: 'Fresh Vegetables', color: '#27ae60' },
      { id: 'spices', name: 'Aromatic Spices', color: '#e65100' }
    ],
    steps: [
      { key: 'welcome', action: 'show', text: `Welcome little chefs! Today we are cooking delicious homemade ${dishTitle} with Chef Maya!`, start: 0, end: 6 },
      { key: 'safe', action: 'show', text: 'Wash your hands clean and always ask a grown-up for help around hot stoves.', start: 6, end: 13 },
      { key: 'prep', action: 'show', text: `Gather all our fresh ingredients and seasonings for our delicious ${dishTitle}.`, start: 13, end: 20 },
      { key: 'heat', action: 'cook', text: 'Warm our cooking pan over medium heat and drizzle with golden oil or butter.', start: 20, end: 27 },
      { key: 'aromatics', action: 'add', text: 'Add aromatic seasonings and vegetables, sautéing gently with our wooden spoon until fragrant.', start: 27, end: 35 },
      { key: 'main', action: 'add', text: `Add our main ingredients into the warm pan and stir evenly to coat with spices.`, start: 35, end: 43 },
      { key: 'simmer', action: 'cook', text: 'Pour in our liquid base, cover with the lid, and let everything simmer gently until tender.', start: 43, end: 51 },
      { key: 'serve', action: 'serve', text: `Spoon our finished ${dishTitle} onto a colorful serving plate. Great cooking, little chefs!`, start: 51, end: 60 }
    ]
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const isTamil = body.voice === 'ta-IN-PallaviNeural';
  const selectedVoice = isTamil ? 'ta-IN-PallaviNeural' : (body.voice || 'en-US-JennyNeural');

  const matched = matchRecipe(body.prompt);
  let planData;
  if (matched) {
    planData = {
      title: isTamil ? matched.titleTa : matched.titleEn,
      recipeId: matched.id,
      ingredients: isTamil ? matched.ingredientsTa : matched.ingredientsEn,
      steps: isTamil ? matched.stepsTa : matched.stepsEn
    };
  } else {
    const dishTitle = cleanRecipeTitle(body.prompt);
    planData = getCustomRecipePlan(dishTitle, isTamil);
  }

  let audioUrl = null;
  try {
    const fullSpeechText = planData.steps.map(s => s.text).join(' ');
    const tts = new MsEdgeTTS();
    await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(fullSpeechText);
    const audioBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      audioStream.on('data', d => chunks.push(d));
      audioStream.on('end', () => resolve(Buffer.concat(chunks)));
      audioStream.on('error', reject);
    });

    if (audioBuffer) {
      const audioKey = `audio/preview-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.mp3`;
      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: audioKey,
        Body: audioBuffer,
        ContentType: 'audio/mpeg'
      }));
      audioUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${audioKey}`;
    }
  } catch (e) {
    console.warn('Audio preview notice:', e.message);
  }

  return res.status(200).json({
    title: planData.title,
    recipe: planData.recipeId,
    generic: false,
    source: isTamil ? 'Tamil AI Lesson' : 'AI Recipe Plan',
    steps: planData.steps.map(s => ({ key: s.key, text: s.text, action: s.action })),
    ingredients: planData.ingredients.map(i => i.name),
    audioUrl
  });
}

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { renderMediaOnLambda } from '@remotion/lambda/client';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const region = process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.REMOTION_BUCKET_NAME || 'remotionlambda-useast1-0wt9pieqmh';
const functionName = process.env.REMOTION_FUNCTION_NAME || 'remotion-render-4-0-539-mem2048mb-disk2048mb-300sec';
const serveUrl = process.env.REMOTION_SERVE_URL || 'https://remotionlambda-useast1-0wt9pieqmh.s3.us-east-1.amazonaws.com/sites/cooking-studio/index.html';

const s3 = new S3Client({ region });

const RECIPE_CATALOG = {
  'chicken-biryani': {
    aliases: ['biryani', 'biriyani', 'chicken biryani', 'chicken dum biryani', 'dum biryani'],
    titleEn: 'Chicken Biryani',
    titleTa: 'சிக்கன் பிரியாணி',
    ingredientsEn: [
      { id: 'rice', name: 'Basmati Rice', color: '#fbfbf0' },
      { id: 'chicken', name: 'Chicken Pieces', color: '#d69a68' },
      { id: 'spices', name: 'Biryani Spices', color: '#c4672f' }
    ],
    ingredientsTa: [
      { id: 'rice', name: 'பாஸ்மதி அரிசி', color: '#fbfbf0' },
      { id: 'chicken', name: 'சிக்கன் துண்டுகள்', color: '#d69a68' },
      { id: 'spices', name: 'பிரியாணி மசாலா', color: '#c4672f' }
    ],
    stepsEn: [
      { key: 'welcome', action: 'show', text: "Welcome little chefs! Today we are cooking fragrant Chicken Biryani!", start: 0, end: 4 },
      { key: 'safe', action: 'show', text: "Always ask a grown-up for help around hot stoves and cooking pots.", start: 4, end: 8 },
      { key: 'saute', action: 'add', text: "Add sliced onions, ghee, and chicken pieces into the warm pot.", start: 8, end: 12 },
      { key: 'rice', action: 'layer', text: "Layer fragrant basmati rice and warm aromatic spices on top.", start: 12, end: 16 },
      { key: 'serve', action: 'serve', text: "Fluffy, steaming Chicken Biryani is ready! Serve onto the plate.", start: 16, end: 20 }
    ],
    stepsTa: [
      { key: 'welcome', action: 'show', text: "வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று நாம் சுவையான சிக்கன் பிரியாணி செய்வோம்!", start: 0, end: 4 },
      { key: 'safe', action: 'show', text: "சூடான பாத்திரங்கள் மற்றும் அடுப்பை பயன்படுத்த பெரியவரின் உதவியை கேளுங்கள்.", start: 4, end: 8 },
      { key: 'saute', action: 'add', text: "பாத்திரத்தில் நெய் ஊற்றி, நறுக்கிய வெங்காயம் மற்றும் சிக்கன் துண்டுகளை வதக்கவும்.", start: 8, end: 12 },
      { key: 'rice', action: 'layer', text: "வாசனை மசாலா மற்றும் பாஸ்மதி அரிசியை சேர்த்து சமமாக அடுக்கவும்.", start: 12, end: 16 },
      { key: 'serve', action: 'serve', text: "சுவையான சிக்கன் பிரியாணி தயார்! தட்டில் வைத்து பரிமாறி மகிழுங்கள்!", start: 16, end: 20 }
    ]
  },
  'masala-dosa': {
    aliases: ['dosa', 'masala dosa', 'dosai'],
    titleEn: 'Masala Dosa',
    titleTa: 'மசாலா தோசை',
    ingredientsEn: [
      { id: 'batter', name: 'Dosa Batter', color: '#fffdf5' },
      { id: 'masala', name: 'Potato Masala', color: '#e0a538' }
    ],
    ingredientsTa: [
      { id: 'batter', name: 'தோசை மாவு', color: '#fffdf5' },
      { id: 'masala', name: 'உருளைக்கிழங்கு மசாலா', color: '#e0a538' }
    ],
    stepsEn: [
      { key: 'welcome', action: 'show', text: "Welcome little chefs! Today we make golden crispy Masala Dosa!", start: 0, end: 4 },
      { key: 'safe', action: 'show', text: "Ask a grown-up for help around the hot tawa or griddle.", start: 4, end: 8 },
      { key: 'spread', action: 'spread', text: "Pour batter onto the tawa and spread it smoothly in circles.", start: 8, end: 12 },
      { key: 'masala', action: 'add', text: "Place the delicious spiced potato filling right in the center.", start: 12, end: 16 },
      { key: 'serve', action: 'serve', text: "Fold and serve crispy Masala Dosa with coconut chutney!", start: 16, end: 20 }
    ],
    stepsTa: [
      { key: 'welcome', action: 'show', text: "வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று நாம் சுவையான மசாலா தோசை செய்வோம்!", start: 0, end: 4 },
      { key: 'safe', action: 'show', text: "சூடான தவா மற்றும் அடுப்பை பயன்படுத்த பெரியவரின் உதவியை கேளுங்கள்.", start: 4, end: 8 },
      { key: 'spread', action: 'spread', text: "தோசை மாவை தவாவில் ஊற்றி வட்டமாக மெதுவாக தேய்க்கவும்.", start: 8, end: 12 },
      { key: 'masala', action: 'add', text: "சுவையான உருளைக்கிழங்கு மசாலாவை நடுவில் வைக்கவும்.", start: 12, end: 16 },
      { key: 'serve', action: 'serve', text: "மொறுமொறுப்பான மசாலா தோசை தயார்! சட்னியுடன் பரிமாறுங்கள்!", start: 16, end: 20 }
    ]
  },
  'vegetable-fried-rice': {
    aliases: ['fried rice', 'fried-rice', 'veg rice'],
    titleEn: 'Vegetable Fried Rice',
    titleTa: 'காய்கறி ஃப்ரைட் ரைஸ்',
    ingredientsEn: [
      { id: 'rice', name: 'Steamed Rice', color: '#f5f5f5' },
      { id: 'veggies', name: 'Diced Vegetables', color: '#529668' }
    ],
    ingredientsTa: [
      { id: 'rice', name: 'சாதம்', color: '#f5f5f5' },
      { id: 'veggies', name: 'நறுக்கிய காய்கறிகள்', color: '#529668' }
    ],
    stepsEn: [
      { key: 'welcome', action: 'show', text: "Welcome little chefs! Today we make colorful Vegetable Fried Rice!", start: 0, end: 4 },
      { key: 'safe', action: 'show', text: "Always ask a grown-up for help around hot pans and high heat.", start: 4, end: 8 },
      { key: 'veggies', action: 'add', text: "Add fresh crunchy carrots, peas, and bell peppers into the pan.", start: 8, end: 12 },
      { key: 'stir', action: 'stir', text: "Add fluffy rice and stir-fry gently with savory seasoning.", start: 12, end: 16 },
      { key: 'serve', action: 'serve', text: "Serve warm, colorful Vegetable Fried Rice in our favorite bowl!", start: 16, end: 20 }
    ],
    stepsTa: [
      { key: 'welcome', action: 'show', text: "வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று நாம் காய்கறி ஃப்ரைட் ரைஸ் செய்வோம்!", start: 0, end: 4 },
      { key: 'safe', action: 'show', text: "சூடான கடாய் மற்றும் அடுப்பை பயன்படுத்த பெரியவரின் உதவியை கேளுங்கள்.", start: 4, end: 8 },
      { key: 'veggies', action: 'add', text: "கேரட், பட்டாணி போன்ற காய்கறிகளை வாணலியில் சேர்க்கவும்.", start: 8, end: 12 },
      { key: 'stir', action: 'stir', text: "சாதத்தை சேர்த்து மெதுவாக கிளறி சுவையாக வதக்கவும்.", start: 12, end: 16 },
      { key: 'serve', action: 'serve', text: "சுவையான காய்கறி ஃப்ரைட் ரைஸ் தயார்! கிண்ணத்தில் பரிமாறுங்கள்!", start: 16, end: 20 }
    ]
  },
  'pancakes': {
    aliases: ['pancake', 'pancakes', 'fluffy pancakes'],
    titleEn: 'Fluffy Pancakes',
    titleTa: 'பான்கேக்',
    ingredientsEn: [
      { id: 'batter', name: 'Pancake Batter', color: '#f4e4a6' },
      { id: 'syrup', name: 'Maple Syrup', color: '#994d22' }
    ],
    ingredientsTa: [
      { id: 'batter', name: 'பான்கேக் மாவு', color: '#f4e4a6' },
      { id: 'syrup', name: 'தேன் மற்றும் வெண்ணெய்', color: '#994d22' }
    ],
    stepsEn: [
      { key: 'welcome', action: 'show', text: "Welcome little chefs! Today we make sweet Fluffy Pancakes!", start: 0, end: 4 },
      { key: 'safe', action: 'show', text: "Ask an adult to assist with the hot pan or skillet.", start: 4, end: 8 },
      { key: 'pour', action: 'pour', text: "Gently ladle the smooth golden batter onto the warm skillet.", start: 8, end: 12 },
      { key: 'flip', action: 'flip', text: "Watch for tiny bubbles, then flip carefully until golden brown.", start: 12, end: 16 },
      { key: 'serve', action: 'serve', text: "Stack warm pancakes on a plate and drizzle with sweet syrup!", start: 16, end: 20 }
    ],
    stepsTa: [
      { key: 'welcome', action: 'show', text: "வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று நாம் சுவையான பான்கேக் செய்வோம்!", start: 0, end: 4 },
      { key: 'safe', action: 'show', text: "சூடான தவா மற்றும் அடுப்பை பயன்படுத்த பெரியவரின் உதவியை கேளுங்கள்.", start: 4, end: 8 },
      { key: 'pour', action: 'pour', text: "பான்கேக் மாவை சூடான தவாவில் மெதுவாக ஊற்றவும்.", start: 8, end: 12 },
      { key: 'flip', action: 'flip', text: "குமிழிகள் வந்ததும் மெதுவாக மறுபுறம் திருப்பி வேகவைக்கவும்.", start: 12, end: 16 },
      { key: 'serve', action: 'serve', text: "மென்மையான பான்கேக் தயார்! தேன் ஊற்றி மகிழ்ச்சியாக சாப்பிடுங்கள்!", start: 16, end: 20 }
    ]
  }
};

function matchRecipeFromPrompt(prompt = '') {
  const lower = prompt.toLowerCase();
  for (const [id, data] of Object.entries(RECIPE_CATALOG)) {
    for (const alias of data.aliases) {
      if (lower.includes(alias)) {
        return { id, ...data };
      }
    }
  }
  return null;
}

function cleanRecipeTitle(prompt) {
  return String(prompt || 'Cooking Lesson')
    .replace(/teach\s+(children|kids|me)\s+(how\s+)?to\s+make/ig, '')
    .replace(/make\s+(a\s+)?(cheerful\s+)?(3d\s+)?(cartoon\s+)?cooking\s+video\s+(where\s+maya\s+makes\s+)?/ig, '')
    .replace(/step by step.*$/i, '')
    .replace(/[.?!]/g, ' ')
    .trim()
    .slice(0, 40) || 'Delicious Dish';
}

function getCustomRecipePlan(dishTitle, isTamil) {
  if (isTamil) {
    return {
      title: `${dishTitle}`,
      recipeId: dishTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      ingredients: [{ id: 'fresh_item', name: dishTitle, color: '#f1b85e' }],
      steps: [
        { key: 'welcome', action: 'show', text: `வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று நாம் சுவையான ${dishTitle} செய்வோம்!`, start: 0, end: 4 },
        { key: 'safe', action: 'show', text: 'சூடான பாத்திரங்களையும் அடுப்பையும் பயன்படுத்த பெரியவரின் உதவியை கேளுங்கள்.', start: 4, end: 8 },
        { key: 'add', action: 'add', text: `தேவையான புதிய பொருட்களை மெதுவாக சமையல் பாத்திரத்தில் சேர்க்கவும்.`, start: 8, end: 12 },
        { key: 'cook', action: 'cook', text: `நறுமணம் கமழ மெதுவாக கிளறி அழகாக வேகவைக்கவும்.`, start: 12, end: 16 },
        { key: 'serve', action: 'serve', text: `சுவையான ${dishTitle} தயார்! தட்டில் வைத்து பரிமாறி மகிழுங்கள்!`, start: 16, end: 20 }
      ]
    };
  }
  return {
    title: dishTitle,
    recipeId: dishTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    ingredients: [{ id: 'fresh_item', name: dishTitle, color: '#f1b85e' }],
    steps: [
      { key: 'welcome', action: 'show', text: `Welcome little chefs! Today we are making ${dishTitle}!`, start: 0, end: 4 },
      { key: 'safe', action: 'show', text: 'Wash your hands first, and always ask a grown-up for help around hot cookware.', start: 4, end: 8 },
      { key: 'add', action: 'add', text: `Gently add our fresh ingredients into the cooking bowl.`, start: 8, end: 12 },
      { key: 'cook', action: 'cook', text: `Stir and cook gently as delicious aromas fill the room.`, start: 12, end: 16 },
      { key: 'serve', action: 'serve', text: `Spoon our freshly cooked ${dishTitle} onto the plate. Great job!`, start: 16, end: 20 }
    ]
  };
}

async function generateSpeechAudio(text, voice) {
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    return await new Promise((resolve, reject) => {
      const chunks = [];
      audioStream.on('data', d => chunks.push(d));
      audioStream.on('end', () => resolve(Buffer.concat(chunks)));
      audioStream.on('error', reject);
    });
  } catch (err) {
    console.warn('TTS generation warning:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, voice, format } = req.body || {};
  const isTamil = voice === 'ta-IN-PallaviNeural';
  const selectedVoice = isTamil ? 'ta-IN-PallaviNeural' : (voice || 'en-US-JennyNeural');
  const selectedFormat = format === '9:16' ? '9:16' : '16:9';

  const matched = matchRecipeFromPrompt(prompt);
  let planData;
  if (matched) {
    planData = {
      title: isTamil ? matched.titleTa : matched.titleEn,
      recipeId: matched.id,
      ingredients: isTamil ? matched.ingredientsTa : matched.ingredientsEn,
      steps: isTamil ? matched.stepsTa : matched.stepsEn
    };
  } else {
    const dishTitle = cleanRecipeTitle(prompt);
    planData = getCustomRecipePlan(dishTitle, isTamil);
  }

  const duration = 20;

  // Generate voice audio
  const fullSpeechText = planData.steps.map(s => s.text).join(' ');
  const audioBuffer = await generateSpeechAudio(fullSpeechText, selectedVoice);

  let audioUrl = null;
  if (audioBuffer) {
    try {
      const audioKey = `audio/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.mp3`;
      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: audioKey,
        Body: audioBuffer,
        ContentType: 'audio/mpeg'
      }));
      audioUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${audioKey}`;
    } catch (err) {
      console.warn('Audio upload to S3 failed:', err.message);
    }
  }

  const plan = {
    recipe: planData.recipeId,
    title: planData.title,
    format: selectedFormat,
    voice: selectedVoice,
    ingredients: planData.ingredients,
    actions: planData.steps
  };

  const lesson = {
    duration,
    steps: planData.steps,
    captions: planData.steps.map(s => ({ start: s.start, end: s.end, text: s.text }))
  };

  const isPortrait = selectedFormat === '9:16';
  const width = isPortrait ? 720 : 1280;
  const height = isPortrait ? 1280 : 720;
  const fps = 24;

  try {
    const { renderId } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: 'LifeMotionCooking',
      inputProps: {
        plan,
        lesson,
        audioFile: audioUrl,
        fps,
        width,
        height,
        durationInFrames: duration * fps
      },
      concurrency: 4,
      codec: 'h264',
      privacy: 'public'
    });

    return res.status(202).json({
      id: `${bucketName}:${renderId}`,
      recipe: plan.recipe,
      title: plan.title,
      format: selectedFormat,
      voice: selectedVoice,
      status: 'rendering',
      progress: 5,
      message: isTamil
        ? `செஃப் மாயா "${planData.title}" வீடியோவை உருவாக்குகிறார்...`
        : `Chef Maya is creating the cartoon cooking video for ${plan.title}...`
    });
  } catch (err) {
    console.error('Video Render Error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}

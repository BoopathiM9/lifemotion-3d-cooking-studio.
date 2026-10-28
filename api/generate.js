import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { renderMediaOnLambda } from '@remotion/lambda/client';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const region = process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.REMOTION_BUCKET_NAME || 'remotionlambda-useast1-0wt9pieqmh';
const functionName = process.env.REMOTION_FUNCTION_NAME || 'remotion-render-4-0-539-mem2048mb-disk2048mb-120sec';
const serveUrl = process.env.REMOTION_SERVE_URL || 'https://remotionlambda-useast1-0wt9pieqmh.s3.us-east-1.amazonaws.com/sites/cooking-studio/index.html';

const s3 = new S3Client({ region });

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
    { key: 'welcome', action: 'show', text: `வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று நாம் சுவையான ${dishTitle} செய்வோம்!`, start: 0, end: 4 },
    { key: 'safe', action: 'show', text: 'சூடான பாத்திரங்களையும் அடுப்பையும் பயன்படுத்த பெரியவரின் உதவியை கேளுங்கள்.', start: 4, end: 8 },
    { key: 'add', action: 'add', text: `தேவையான புதிய பொருட்களை மெதுவாக சமையல் பாத்திரத்தில் சேர்க்கவும்.`, start: 8, end: 12 },
    { key: 'cook', action: 'cook', text: `நறுமணம் கமழ மெதுவாக கிளறி அழகாக வேகவைக்கவும்.`, start: 12, end: 16 },
    { key: 'serve', action: 'serve', text: `சுவையான ${dishTitle} தயார்! தட்டில் வைத்து பரிமாறி மகிழுங்கள்!`, start: 16, end: 20 }
  ];
}

function getEnglishSteps(dishTitle) {
  return [
    { key: 'welcome', action: 'show', text: `Welcome little chefs! Today we are making ${dishTitle}!`, start: 0, end: 4 },
    { key: 'safe', action: 'show', text: 'Wash your hands first, and always ask a grown-up for help around hot cookware.', start: 4, end: 8 },
    { key: 'add', action: 'add', text: `Gently add our fresh ingredients into the cooking bowl.`, start: 8, end: 12 },
    { key: 'cook', action: 'cook', text: `Stir and cook gently as delicious aromas fill the room.`, start: 12, end: 16 },
    { key: 'serve', action: 'serve', text: `Spoon our freshly cooked ${dishTitle} onto the plate. Great job!`, start: 16, end: 20 }
  ];
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
  const dishTitle = cleanRecipeTitle(prompt);

  const steps = isTamil ? getTamilSteps(dishTitle) : getEnglishSteps(dishTitle);
  const duration = 20;

  // Generate voice audio
  const fullSpeechText = steps.map(s => s.text).join(' ');
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
    recipe: dishTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: isTamil ? `${dishTitle}` : dishTitle,
    format: selectedFormat,
    voice: selectedVoice,
    ingredients: [{ id: 'fresh_item', name: dishTitle, color: '#f1b85e' }],
    actions: steps
  };

  const lesson = {
    duration,
    steps,
    captions: steps.map(s => ({ start: s.start, end: s.end, text: s.text }))
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
      framesPerLambda: 120,
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
        ? `செஃப் மாயா "${dishTitle}" வீடியோவை உருவாக்குகிறார்...`
        : `Chef Maya is creating the cartoon cooking video for ${plan.title}...`
    });
  } catch (err) {
    console.error('Video Render Error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}

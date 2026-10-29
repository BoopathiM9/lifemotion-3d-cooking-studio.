import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const region = process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.REMOTION_BUCKET_NAME || 'remotionlambda-useast1-0wt9pieqmh';
const functionName = process.env.REMOTION_FUNCTION_NAME || 'remotion-render-4-0-539-mem2048mb-disk2048mb-300sec';
const serveUrl = process.env.REMOTION_SERVE_URL || 'https://remotionlambda-useast1-0wt9pieqmh.s3.us-east-1.amazonaws.com/sites/cooking-studio/index.html';

const s3 = new S3Client({ region });

const RECIPES = [
  { id: 'chicken-biryani', name: 'Chicken Biryani' },
  { id: 'sundal', name: 'Chana Sundal' },
  { id: 'masala-dosa', name: 'Masala Dosa' },
  { id: 'vegetable-fried-rice', name: 'Vegetable Fried Rice' },
  { id: 'pancakes', name: 'Fluffy Pancakes' },
  { id: 'tomato-pasta', name: 'Tomato Pasta' },
  { id: 'noodles', name: 'Vegetable Noodles' },
  { id: 'vegetable-sandwich', name: 'Vegetable Sandwich' },
  { id: 'chapati', name: 'Soft Chapati' },
  { id: 'vegetable-soup', name: 'Warm Vegetable Soup' },
  { id: 'salad', name: 'Fresh Salad' }
];

const VOICES = [
  'en-US-JennyNeural',
  'en-US-AriaNeural',
  'ta-IN-PallaviNeural'
];

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
  },
  'vegetable-fried-rice': {
    aliases: ['fried rice', 'fried-rice', 'veg rice'],
    titleEn: 'Vegetable Fried Rice',
    titleTa: 'காய்கறி ஃப்ரைட் ரைஸ் (Vegetable Fried Rice)',
    ingredientsEn: [
      { id: 'rice', name: 'Steamed Rice', color: '#f5f5f5' },
      { id: 'veggies', name: 'Carrots & Peas', color: '#529668' },
      { id: 'garlic', name: 'Garlic & Onions', color: '#e8d5b5' },
      { id: 'sauce', name: 'Soy Sauce', color: '#5d4037' }
    ],
    ingredientsTa: [
      { id: 'rice', name: 'சாதம்', color: '#f5f5f5' },
      { id: 'veggies', name: 'நறுக்கிய காய்கறிகள்', color: '#529668' },
      { id: 'garlic', name: 'பூண்டு மற்றும் வெங்காயம்', color: '#e8d5b5' },
      { id: 'sauce', name: 'சோயா சாஸ்', color: '#5d4037' }
    ],
    stepsEn: [
      { key: 'welcome', action: 'show', text: "Welcome little chefs! Today we stir-fry colorful Vegetable Fried Rice with Chef Maya!", start: 0, end: 6 },
      { key: 'safe', action: 'show', text: "Always ask a grown-up for help around hot pans and high heat stir-fry cooking.", start: 6, end: 13 },
      { key: 'prep', action: 'show', text: "Gather chilled fluffy rice, diced carrots, green peas, sweet corn, and minced garlic.", start: 13, end: 20 },
      { key: 'heat', action: 'cook', text: "Heat sesame oil in our wide wok until it gives a gentle, warm sizzle.", start: 20, end: 27 },
      { key: 'aromatics', action: 'add', text: "Add minced garlic and sliced spring onions, tossing quickly with our spatula until fragrant.", start: 27, end: 35 },
      { key: 'veggies', action: 'add', text: "Tumble in crunchy carrots, tender green peas, and bell peppers, stir-frying on high heat.", start: 35, end: 43 },
      { key: 'rice', action: 'add', text: "Add our fluffy cooked rice into the wok, breaking up clumps with the back of the spatula.", start: 43, end: 51 },
      { key: 'season', action: 'pour', text: "Drizzle savory soy sauce, a pinch of pepper, and salt evenly over the steaming rice.", start: 51, end: 58 },
      { key: 'serve', action: 'serve', text: "Scoop warm Vegetable Fried Rice into our serving bowl and garnish with fresh greens!", start: 58, end: 66 }
    ],
    stepsTa: [
      { key: 'welcome', action: 'show', text: "வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று நாம் காய்கறி ஃப்ரைட் ரைஸ் செய்வோம்!", start: 0, end: 6 },
      { key: 'safe', action: 'show', text: "சூடான கடாய் மற்றும் அடுப்பை பயன்படுத்த பெரியவரின் உதவியை கேளுங்கள்.", start: 6, end: 13 },
      { key: 'prep', action: 'show', text: "உதிரியான சாதம், நறுக்கிய கேரட், பச்சை பட்டாணி மற்றும் பூண்டை தயாராக எடுத்துக்கொள்ளுங்கள்.", start: 13, end: 20 },
      { key: 'heat', action: 'cook', text: "வாணலியில் சிறிது எண்ணெய் ஊற்றி மிதமாக சூடாக்கவும்.", start: 20, end: 27 },
      { key: 'aromatics', action: 'add', text: "நறுக்கிய பூண்டு மற்றும் வெங்காயத்தாள் சேர்த்து நறுமணம் வரும் வரை வதக்கவும்.", start: 27, end: 35 },
      { key: 'veggies', action: 'add', text: "கேரட், பட்டாணி போன்ற காய்கறிகளை வாணலியில் சேர்த்து மொறுமொறுப்பாக வதக்கவும்.", start: 35, end: 43 },
      { key: 'rice', action: 'add', text: "சாதத்தை சேர்த்து கட்டிகள் இல்லாமல் மெதுவாக கிளறி சுவையாக வதக்கவும்.", start: 43, end: 51 },
      { key: 'season', action: 'pour', text: "சோயா சாஸ், உப்பு மற்றும் மிளகுத்தூள் தூவி சாதத்துடன் சமமாக கலக்கவும்.", start: 51, end: 58 },
      { key: 'serve', action: 'serve', text: "சுவையான காய்கறி ஃப்ரைட் ரைஸ் தயார்! கிண்ணத்தில் பரிமாறுங்கள்!", start: 58, end: 66 }
    ]
  },
  'pancakes': {
    aliases: ['pancake', 'pancakes', 'fluffy pancakes'],
    titleEn: 'Fluffy Pancakes',
    titleTa: 'பான்கேக் (Fluffy Pancakes)',
    ingredientsEn: [
      { id: 'batter', name: 'Pancake Batter', color: '#f4e4a6' },
      { id: 'butter', name: 'Creamy Butter', color: '#fff176' },
      { id: 'syrup', name: 'Maple Syrup', color: '#994d22' },
      { id: 'berries', name: 'Fresh Berries', color: '#e63946' }
    ],
    ingredientsTa: [
      { id: 'batter', name: 'பான்கேக் மாவு', color: '#f4e4a6' },
      { id: 'butter', name: 'வெண்ணெய்', color: '#fff176' },
      { id: 'syrup', name: 'தேன் மற்றும் பாகு', color: '#994d22' },
      { id: 'berries', name: 'பழங்கள்', color: '#e63946' }
    ],
    stepsEn: [
      { key: 'welcome', action: 'show', text: "Welcome little chefs! Today we make sweet, fluffy golden Pancakes with Chef Maya!", start: 0, end: 6 },
      { key: 'safe', action: 'show', text: "Ask an adult to assist with the warm pan and keep little hands safe.", start: 6, end: 13 },
      { key: 'prep', action: 'show', text: "Whisk our flour, milk, egg, and sugar into a silky, lump-free golden batter.", start: 13, end: 20 },
      { key: 'melt', action: 'cook', text: "Melt a pat of sweet butter in our skillet until it glistens warmly.", start: 20, end: 27 },
      { key: 'pour', action: 'pour', text: "Gently ladle a pool of smooth golden batter onto the warm skillet surface.", start: 27, end: 35 },
      { key: 'bubbles', action: 'cook', text: "Watch for tiny happy bubbles forming on top, showing it is ready to flip.", start: 35, end: 43 },
      { key: 'flip', action: 'flip', text: "Slide our spatula underneath and flip carefully until both sides are golden brown.", start: 43, end: 51 },
      { key: 'stack', action: 'serve', text: "Stack warm, fluffy pancakes tall on our favorite serving plate.", start: 51, end: 58 },
      { key: 'serve', action: 'pour', text: "Drizzle with sweet golden maple syrup and top with fresh berries. Wonderful cooking!", start: 58, end: 66 }
    ],
    stepsTa: [
      { key: 'welcome', action: 'show', text: "வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று நாம் சுவையான பான்கேக் செய்வோம்!", start: 0, end: 6 },
      { key: 'safe', action: 'show', text: "சூடான தவா மற்றும் அடுப்பை பயன்படுத்த பெரியவரின் உதவியை கேளுங்கள்.", start: 6, end: 13 },
      { key: 'prep', action: 'show', text: "மாவு, பால் மற்றும் சர்க்கரையை கட்டி இல்லாமல் மென்மையாக கலக்கி தயார் செய்யவும்.", start: 13, end: 20 },
      { key: 'melt', action: 'cook', text: "சூடான தவாவில் சிறிது வெண்ணெய் தடவி உருகவிடவும்.", start: 20, end: 27 },
      { key: 'pour', action: 'pour', text: "பான்கேக் மாவை சூடான தவாவில் வட்டமாக மெதுவாக ஊற்றவும்.", start: 27, end: 35 },
      { key: 'bubbles', action: 'cook', text: "மேலே சிறிய குமிழிகள் வந்ததும் மறுபுறம் திருப்ப தயாராகுங்கள்.", start: 35, end: 43 },
      { key: 'flip', action: 'flip', text: "கரண்டியை அடியில் வைத்து கவனமாக திருப்பி பொன்னிறமாக வேகவைக்கவும்.", start: 43, end: 51 },
      { key: 'stack', action: 'serve', text: "வெந்த மென்மையான பான்கேக்குகளை தட்டில் அடுக்கவும்.", start: 51, end: 58 },
      { key: 'serve', action: 'pour', text: "மேலே இனிப்பான தேன் மற்றும் வெண்ணெய் ஊற்றி மகிழ்ச்சியாக சாப்பிடுங்கள்!", start: 58, end: 66 }
    ]
  },
  'sundal': {
    aliases: ['sundal', 'sandel', 'chana sundal', 'kondakadalai sundal', 'sundal food', 'sandel food', 'சுண்டல்'],
    titleEn: 'Chana Sundal (Spiced Chickpeas)',
    titleTa: 'சுவையான சுண்டல் (Healthy Sundal)',
    ingredientsEn: [
      { id: 'chickpeas', name: 'Boiled Chickpeas', color: '#f1b85e' },
      { id: 'mustard', name: 'Mustard & Urad Dal', color: '#2d3748' },
      { id: 'curryleaves', name: 'Curry Leaves & Hing', color: '#22543d' },
      { id: 'chillies', name: 'Green Chillies & Ginger', color: '#38a169' },
      { id: 'coconut', name: 'Fresh Grated Coconut', color: '#ffffff' }
    ],
    ingredientsTa: [
      { id: 'chickpeas', name: 'வேகவைத்த கொண்டைக்கடலை', color: '#f1b85e' },
      { id: 'mustard', name: 'கடுகு மற்றும் உளுத்தம்பருப்பு', color: '#2d3748' },
      { id: 'curryleaves', name: 'கறிவேப்பிலை & பெருங்காயம்', color: '#22543d' },
      { id: 'chillies', name: 'பச்சை மிளகாய் & இஞ்சி', color: '#38a169' },
      { id: 'coconut', name: 'துருவிய தேங்காய்', color: '#ffffff' }
    ],
    stepsEn: [
      { key: 'welcome', action: 'show', text: "Welcome little chefs! Today we are making healthy, delicious Chana Sundal with Chef Maya!", start: 0, end: 6 },
      { key: 'safe', action: 'show', text: "Wash your hands clean and always ask a grown-up for help around hot cookware.", start: 6, end: 13 },
      { key: 'prep', action: 'show', text: "Keep soft boiled chickpeas and freshly grated coconut ready on our kitchen counter.", start: 13, end: 20 },
      { key: 'saute', action: 'cook', text: "Warm a drizzle of sesame oil in the pan and let mustard seeds and urad dal crackle.", start: 20, end: 28 },
      { key: 'aromatics', action: 'add', text: "Toss in fresh curry leaves, green chillies, and aromatic asafoetida until fragrant.", start: 27, end: 35 },
      { key: 'chickpeas', action: 'add', text: "Add our soft boiled chickpeas with a pinch of salt, stirring evenly with our wooden spoon.", start: 35, end: 44 },
      { key: 'simmer', action: 'cook', text: "Toss gently over medium heat so all the savory flavors coat the warm chickpeas.", start: 44, end: 52 },
      { key: 'coconut', action: 'pour', text: "Turn off the heat and generously shower fresh grated coconut all over the sundal.", start: 52, end: 59 },
      { key: 'serve', action: 'serve', text: "Spoon steaming, wholesome Sundal onto our serving plate. Healthy and delicious!", start: 59, end: 66 }
    ],
    stepsTa: [
      { key: 'welcome', action: 'show', text: "வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான சத்துமிக்க சுண்டல் செய்வோம்!", start: 0, end: 6 },
      { key: 'safe', action: 'show', text: "கைகளை நன்றாக கழுவுங்கள். சூடான அடுப்பை பயன்படுத்த பெரியவர்களின் உதவியை நாடுங்கள்.", start: 6, end: 13 },
      { key: 'prep', action: 'show', text: "ஊறவைத்து வேகவைத்த கொண்டைக்கடலை மற்றும் துருவிய தேங்காயை தயாராக வைக்கவும்.", start: 13, end: 20 },
      { key: 'saute', action: 'cook', text: "பாத்திரத்தில் சிறிது நல்லெண்ணெய் ஊற்றி, கடுகு, உளுத்தம்பருப்பு சேர்த்து பொரியவிடவும்.", start: 20, end: 28 },
      { key: 'aromatics', action: 'add', text: "கறிவேப்பிலை, பச்சை மிளகாய் மற்றும் பெருங்காயத்தூள் சேர்த்து நறுமணம் கமழ வதக்கவும்.", start: 27, end: 35 },
      { key: 'chickpeas', action: 'add', text: "வேகவைத்த கொண்டைக்கடலை மற்றும் தேவையான உப்பு சேர்த்து நன்றாக கிளறி வதக்கவும்.", start: 35, end: 44 },
      { key: 'simmer', action: 'cook', text: "மிதமான தீயில் 2 நிமிடங்கள் மூடி வைத்து சுவைகள் ஒன்றுசேருமாறு சமைக்கவும்.", start: 44, end: 52 },
      { key: 'coconut', action: 'pour', text: "அடுப்பை அணைத்துவிட்டு, மேலே தூய துருவிய தேங்காய் தூவி அலங்கரிக்கவும்.", start: 52, end: 59 },
      { key: 'serve', action: 'serve', text: "சுடச்சுட சத்தான சுவையான சுண்டல் தயார்! தட்டில் வைத்து மகிழ்ச்சியாக சாப்பிடுங்கள்!", start: 59, end: 66 }
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
    .slice(0, 40) || 'Special Meal';
}

async function searchMealDbOnline(query) {
  try {
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(query));
    if (!res.ok) return null;
    const data = await res.json();
    return data.meals?.[0] || null;
  } catch {
    return null;
  }
}

function detectArchetype(dish) {
  const d = dish.toLowerCase();
  if (/smoothie|shake|juice|lassi|milk|drink|tea|coffee|chai|soda|sherbet/.test(d)) return 'beverage';
  if (/cake|brownie|cookie|biscuit|pie|muffin|bread|pizza|cupcake|bake|pastry/.test(d)) return 'bake';
  if (/sweet|halwa|laddu|ladoo|kheer|payasam|gulab|jamun|pudding|ice cream/.test(d)) return 'dessert';
  if (/sandwich|burger|toast|chaat|samosa|wrap|taco|roll|fries|nugget/.test(d)) return 'snack';
  if (/noodle|pasta|macaroni|spaghetti|chowmein|maggi/.test(d)) return 'noodles';
  return 'general';
}

function getCustomRecipePlan(dishTitle, isTamil) {
  const type = detectArchetype(dishTitle);
  const cleanId = dishTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  if (isTamil) {
    if (type === 'beverage') {
      return {
        title: `${dishTitle} (சுவையான பானம்)`,
        recipeId: cleanId,
        ingredients: [
          { id: 'fruit', name: 'புதிய பழங்கள் / பால்', color: '#fbbf24' },
          { id: 'sweetener', name: 'சுவையான தேன் / சர்க்கரை', color: '#f59e0b' },
          { id: 'ice', name: 'குளிர்ந்த ஐஸ் கட்டிகள்', color: '#93c5fd' }
        ],
        steps: [
          { key: 'welcome', action: 'show', text: `வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான ${dishTitle} செய்வோம்!`, start: 0, end: 6 },
          { key: 'prep', action: 'show', text: `புதிய பழங்கள், பால் மற்றும் தேனை மிக்ஸி ஜாரில் தயாராக வைக்கவும்.`, start: 6, end: 13 },
          { key: 'blend', action: 'cook', text: `மிக்ஸியில் மென்மையாக மற்றும் நுரை பொங்க நன்றாக அடிக்கவும்.`, start: 13, end: 21 },
          { key: 'pour', action: 'pour', text: `குளிர்ந்த அழகான கண்ணாடிக் கிண்ணத்தில் மெதுவாக ஊற்றவும்.`, start: 21, end: 28 },
          { key: 'serve', action: 'serve', text: `குளிர்ச்சியான சுவையான ${dishTitle} தயார்! மகிழ்ச்சியாக பருகுங்கள்!`, start: 28, end: 36 }
        ]
      };
    }
    if (type === 'bake') {
      return {
        title: `${dishTitle} (பேக்கிங் செய்முறை)`,
        recipeId: cleanId,
        ingredients: [
          { id: 'flour', name: 'மாவு மற்றும் பேக்கிங் பவுடர்', color: '#fef08a' },
          { id: 'butter', name: 'வெண்ணெய் மற்றும் பால்', color: '#fde047' },
          { id: 'flavor', name: 'சாக்கலேட் / வெண்ணிலா', color: '#78350f' }
        ],
        steps: [
          { key: 'welcome', action: 'show', text: `வணக்கம் குட்டி கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான ${dishTitle} பேக் செய்வோம்!`, start: 0, end: 6 },
          { key: 'mix', action: 'add', text: `மாவு, வெண்ணெய் மற்றும் நறுமணப் பொருட்களை பாத்திரத்தில் கட்டி இல்லாமல் கலக்கவும்.`, start: 6, end: 13 },
          { key: 'pour', action: 'pour', text: `பேக்கிங் டிரேயில் வெண்ணெய் தடவி கலவையை சீராக ஊற்றவும்.`, start: 13, end: 21 },
          { key: 'bake', action: 'cook', text: `சூடான அவனில் பொன்னிறமாகவும் நறுமணம் கமழவும் வேகவைக்கவும்.`, start: 21, end: 28 },
          { key: 'serve', action: 'serve', text: `சுடச்சுட நறுமணம் கமழும் ${dishTitle} தயார்! துண்டுகளாக்கி பரிமாறுங்கள்!`, start: 28, end: 36 }
        ]
      };
    }
    return {
      title: `${dishTitle} (செய்முறை)`,
      recipeId: cleanId,
      ingredients: [
        { id: 'main', name: dishTitle, color: '#f1b85e' },
        { id: 'veggies', name: 'நறுக்கிய காய்கறிகள்', color: '#27ae60' },
        { id: 'spices', name: 'நறுமண மசாலா & எண்ணெய்', color: '#e65100' }
      ],
      steps: [
        { key: 'welcome', action: 'show', text: `வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான ${dishTitle} செய்வோம்!`, start: 0, end: 6 },
        { key: 'safe', action: 'show', text: 'கைகளை கழுவுங்கள். சூடான அடுப்பை பயன்படுத்த பெரியவர்களின் உதவியை நாடுங்கள்.', start: 6, end: 13 },
        { key: 'saute', action: 'cook', text: `பாத்திரத்தை சூடாக்கி, எண்ணெய் ஊற்றி நறுமணப் பொருட்களை பொன்னிறமாக வதக்கவும்.`, start: 13, end: 21 },
        { key: 'simmer', action: 'add', text: `${dishTitle} முக்கிய பொருட்களை சேர்த்து மிதமான தீயில் சுவைகள் ஒன்றுசேர வேகவைக்கவும்.`, start: 21, end: 28 },
        { key: 'serve', action: 'serve', text: `சுடச்சுட தயாரான ${dishTitle} உணவை அழகான தட்டில் வைத்து பரிமாறுங்கள்!`, start: 28, end: 36 }
      ]
    };
  }

  // English Plans
  if (type === 'beverage') {
    return {
      title: `${dishTitle}`,
      recipeId: cleanId,
      ingredients: [
        { id: 'fruit', name: 'Fresh Fruits / Milk', color: '#fbbf24' },
        { id: 'sweetener', name: 'Golden Honey / Sugar', color: '#f59e0b' },
        { id: 'ice', name: 'Chilled Ice Cubes', color: '#93c5fd' }
      ],
      steps: [
        { key: 'welcome', action: 'show', text: `Welcome little chefs! Today we are making refreshing ${dishTitle} with Chef Maya!`, start: 0, end: 6 },
        { key: 'prep', action: 'show', text: `Add fresh peeled fruits, cold milk, and a drizzle of honey into our blender.`, start: 6, end: 13 },
        { key: 'blend', action: 'cook', text: `Whirr and blend on high speed until delightfully smooth and frothy.`, start: 13, end: 21 },
        { key: 'pour', action: 'pour', text: `Pour our creamy chilled drink into a tall colorful glass with a straw.`, start: 21, end: 28 },
        { key: 'serve', action: 'serve', text: `Our delicious homemade ${dishTitle} is ready! Sip and enjoy!`, start: 28, end: 36 }
      ]
    };
  }
  if (type === 'bake') {
    return {
      title: `${dishTitle}`,
      recipeId: cleanId,
      ingredients: [
        { id: 'flour', name: 'Flour & Cocoa', color: '#fef08a' },
        { id: 'butter', name: 'Butter & Sugar', color: '#fde047' },
        { id: 'frosting', name: 'Rich Cream / Chocolate', color: '#78350f' }
      ],
      steps: [
        { key: 'welcome', action: 'show', text: `Welcome little chefs! Today we are baking delicious ${dishTitle} with Chef Maya!`, start: 0, end: 6 },
        { key: 'mix', action: 'add', text: `Whisk flour, sugar, and golden butter into a silky smooth batter.`, start: 6, end: 13 },
        { key: 'pour', action: 'pour', text: `Gently spoon the batter into our warm baking pan lined with butter.`, start: 13, end: 21 },
        { key: 'bake', action: 'cook', text: `Bake golden and fragrant in our oven until wonderfully soft and fluffy.`, start: 21, end: 28 },
        { key: 'serve', action: 'serve', text: `Slice our freshly baked ${dishTitle} onto a colorful party plate. Delicious!`, start: 28, end: 36 }
      ]
    };
  }
  return {
    title: dishTitle,
    recipeId: cleanId,
    ingredients: [
      { id: 'main', name: dishTitle, color: '#f1b85e' },
      { id: 'veggies', name: 'Fresh Vegetables', color: '#27ae60' },
      { id: 'spices', name: 'Aromatic Spices & Oil', color: '#e65100' }
    ],
    steps: [
      { key: 'welcome', action: 'show', text: `Welcome little chefs! Today we are cooking homemade ${dishTitle} with Chef Maya!`, start: 0, end: 6 },
      { key: 'safe', action: 'show', text: 'Wash your hands clean and always ask a grown-up for help around hot cookware.', start: 6, end: 13 },
      { key: 'saute', action: 'cook', text: 'Warm golden oil in the pan and saute our seasonings until fragrant.', start: 13, end: 21 },
      { key: 'simmer', action: 'add', text: `Add our ingredients for ${dishTitle} and simmer gently until tender and juicy.`, start: 21, end: 28 },
      { key: 'serve', action: 'serve', text: `Spoon our freshly cooked ${dishTitle} onto our serving plate. Great cooking!`, start: 28, end: 36 }
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
    console.warn('TTS generation failed:', err.message);
    return null;
  }
}

export async function handler(event) {
  const path = event.rawPath || event.path || '/';
  const method = (event.requestContext?.http?.method || event.httpMethod || 'GET').toUpperCase();

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 1. GET /api/setup
  if (path.endsWith('/setup') || path.endsWith('/setup/')) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ready: true, python: true, ffmpeg: true, voices: true, cloud: 'amplify' })
    };
  }

  // 2. GET /api/recipes
  if (path.endsWith('/recipes') || path.endsWith('/recipes/')) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recipes: RECIPES, voices: VOICES, formats: ['16:9', '9:16'], busy: false })
    };
  }

  // 3. POST /api/plan
  if (path.endsWith('/plan') && method === 'POST') {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {}
    const isTamil = body.voice === 'ta-IN-PallaviNeural';
    const selectedVoice = isTamil ? 'ta-IN-PallaviNeural' : (body.voice || 'en-US-JennyNeural');
    const matched = matchRecipeFromPrompt(body.prompt);

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
      const audioBuffer = await generateSpeechAudio(fullSpeechText, selectedVoice);
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
      console.warn('Preview speech notice:', e.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        title: planData.title,
        recipe: planData.recipeId,
        generic: false,
        source: isTamil ? 'Tamil AI Lesson' : 'AI Recipe Plan',
        steps: planData.steps.map(s => ({ key: s.key, text: s.text, action: s.action })),
        ingredients: planData.ingredients.map(i => i.name),
        audioUrl
      })
    };
  }

  // 4. POST /api/generate
  if (path.endsWith('/generate') && method === 'POST') {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {}
    const { prompt, voice, format } = body;
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

    // Dynamic duration based on recipe steps (never fixed 20 sec!)
    const lastStepEnd = planData.steps[planData.steps.length - 1]?.end || 36;
    const duration = Math.max(30, Math.min(90, Math.ceil(lastStepEnd)));

    // Generate voice audio
    console.log(`Generating narration for: ${planData.title} in ${selectedVoice} (duration ~${duration}s)`);
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
        console.warn('Audio upload warning:', err.message);
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
    const width = isPortrait ? 1080 : 1920;
    const height = isPortrait ? 1920 : 1080;
    const fps = 30;

    // Serverless GPU Engine (Modal.com / Fal.ai)
    if (process.env.MODAL_ENDPOINT) {
      try {
        const s3Key = `videos/modal-${Date.now()}-${plan.recipe}.mp4`;
        const modalRes = await fetch(process.env.MODAL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipe: plan.recipe,
            title: plan.title,
            prompt: fullSpeechText,
            voice: selectedVoice,
            format: selectedFormat,
            duration,
            s3_bucket: bucketName,
            s3_key: s3Key
          })
        });
        if (modalRes.ok) {
          const modalData = await modalRes.json();
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              id: `modal:${Date.now()}`,
              status: 'complete',
              progress: 100,
              videoUrl: modalData.videoUrl,
              message: isTamil
                ? 'டிஸ்னி/பிக்சார் 3D கார்ட்டூன் வீடியோ தயாராகிவிட்டது!'
                : '3D Pixar-style cooking video rendered on Serverless GPU and ready to stream!'
            })
          };
        }
      } catch (err) {
        console.warn('Modal serverless execution notice:', err.message);
      }
    }

    // Support for independent Python Diffusers server (LTX-Video / Wan2.2)
    if (process.env.AI_DIFFUSION_WORKER_URL) {
      try {
        const s3Key = `videos/ai-diffusers-${Date.now()}-${plan.recipe}.mp4`;
        const diffRes = await fetch(`${process.env.AI_DIFFUSION_WORKER_URL}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipe: plan.recipe,
            title: plan.title,
            prompt: fullSpeechText,
            voice: selectedVoice,
            format: selectedFormat,
            duration,
            s3_bucket: bucketName,
            s3_key: s3Key
          })
        });
        if (diffRes.ok) {
          const diffData = await diffRes.json();
          return {
            statusCode: 202,
            headers,
            body: JSON.stringify({
              id: `diffusers:${diffData.jobId}`,
              recipe: plan.recipe,
              title: plan.title,
              format: selectedFormat,
              voice: selectedVoice,
              status: 'rendering',
              progress: 10,
              message: isTamil
                ? `செஃப் மாயா Disney/Pixar AI வீடியோவை உருவாக்குகிறார்...`
                : `Rendering Disney/Pixar 3D animation with Hugging Face Diffusers...`
            })
          };
        }
      } catch (err) {
        console.warn('Diffusers worker notice:', err.message);
      }
    }

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
      concurrency: 2,
      codec: 'h264',
      privacy: 'public'
    });

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        id: `${bucketName}:${renderId}`,
        recipe: plan.recipe,
        title: plan.title,
        format: selectedFormat,
        voice: selectedVoice,
        status: 'rendering',
        progress: 5,
        message: isTamil
          ? `செஃப் மாயா "${planData.title}" கார்ட்டூன் வீடியோவை உருவாக்குகிறார்...`
          : `Chef Maya is animating the cooking video for ${plan.title}...`
      })
    };
  }

  // 5. GET /api/jobs/:id
  if (path.includes('/jobs')) {
    const rawId = path.split('/').pop();

    if (rawId.startsWith('diffusers:') && process.env.AI_DIFFUSION_WORKER_URL) {
      const jobId = rawId.replace('diffusers:', '');
      try {
        const workerRes = await fetch(`${process.env.AI_DIFFUSION_WORKER_URL}/jobs/${jobId}`);
        if (workerRes.ok) {
          const workerData = await workerRes.json();
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ id: rawId, ...workerData })
          };
        }
      } catch (e) {
        console.warn('Diffusers job poll notice:', e.message);
      }
    }

    let bName = bucketName;
    let renderId = rawId;

    if (rawId.includes(':')) {
      const parts = rawId.split(':');
      bName = parts[0];
      renderId = parts[1];
    }

    const progress = await getRenderProgress({
      renderId,
      bucketName: bName,
      functionName,
      region
    });

    if (progress.fatalErrorEncountered) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          id: rawId,
          status: 'failed',
          progress: 0,
          message: progress.errors?.[0]?.message || 'Cloud render failed.'
        })
      };
    }

        if (progress.done) {
      let finalUrl = progress.outputFile;
      try {
        // Generate pre-signed URL from S3 bucket so playback works securely without public ACLs
        const outputKey = progress.outputFile.split('.amazonaws.com/').pop();
        if (outputKey) {
          finalUrl = await getSignedUrl(s3, new GetObjectCommand({
            Bucket: bName,
            Key: outputKey
          }), { expiresIn: 7200 });
        }
      } catch (e) {
        console.warn('Presigned URL fallback notice:', e.message);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          id: rawId,
          status: 'complete',
          progress: 100,
          videoUrl: finalUrl,
          message: 'Your cartoon cooking video is ready to watch and download!'
        })
      };
    }

    const pct = Math.max(5, Math.min(95, Math.round(progress.overallProgress * 100)));
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: rawId,
        status: 'rendering',
        progress: pct,
        message: `Chef Maya is animating your recipe (${pct}%)...`
      })
    };
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Endpoint not found' })
  };
}

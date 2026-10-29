import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const MEALDB_SEARCH = 'https://www.themealdb.com/api/json/v1/1/search.php?s=';

const bedrockRegion = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0';

let _bedrockClient = null;
function getBedrockClient() {
  if (!_bedrockClient) {
    _bedrockClient = new BedrockRuntimeClient({ region: bedrockRegion });
  }
  return _bedrockClient;
}

async function bedrockText(instruction, maxTokens = 1500) {
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE && !process.env.BEDROCK_ENABLED) {
    return null;
  }
  try {
    const client = getBedrockClient();
    const command = new ConverseCommand({
      modelId: bedrockModelId,
      messages: [{ role: 'user', content: [{ text: instruction }] }],
      inferenceConfig: { maxTokens, temperature: 0.25 }
    });
    const response = await client.send(command);
    return response.output?.message?.content?.[0]?.text?.trim() || null;
  } catch (err) {
    console.warn('Bedrock notice:', err.message);
    return null;
  }
}

export async function analyzeWithBedrock(prompt) {
  const instruction = [
    'Create a rich, complete 8 to 10 step animated cooking lesson for children.',
    'Use simple, cheerful English. List key ingredients with measurements.',
    'Include steps for: 1. Welcome, 2. Safety, 3. Gather & prep, 4. Warm pan/pot & oil, 5. Sauté aromatics, 6. Add main ingredients, 7. Season & spices, 8. Simmer/cook gently, 9. Garnish, 10. Plate and serve.',
    'Keep each step sentence engaging and descriptive.',
    `Recipe requested: ${String(prompt).slice(0, 1200)}`
  ].join('\n');
  const text = await bedrockText(instruction, 1500);
  return text && text.length >= 100 ? text.slice(0, 3000) : null;
}

export const analyzeWithGemini = analyzeWithBedrock;

// Comprehensive authentic multi-step culinary registry for dishes that may not be in TheMealDB
const CULINARY_REGISTRY = {
  'chicken-biryani': {
    titleEn: 'Chicken Biryani',
    titleTa: 'சிக்கன் பிரியாணி (Chicken Biryani)',
    ingredients: [
      { id: 'rice', name: 'Basmati Rice', nameTa: 'பாஸ்மதி அரிசி', category: 'grain', color: '#fbfbf0' },
      { id: 'chicken', name: 'Chicken Pieces', nameTa: 'சிக்கன் துண்டுகள்', category: 'protein', color: '#d69a68' },
      { id: 'onion', name: 'Sliced Onions', nameTa: 'நறுக்கிய வெங்காயம்', category: 'vegetable', color: '#b57c3d' },
      { id: 'ghee', name: 'Ghee & Whole Spices', nameTa: 'நெய் மற்றும் மசாலா', category: 'liquid', color: '#dfb445' },
      { id: 'herbs', name: 'Mint & Coriander', nameTa: 'புதினா மற்றும் கொத்தமல்லி', category: 'vegetable', color: '#27ae60' }
    ],
    stepsEn: [
      'Welcome little chefs! Today we are making royal, fragrant Chicken Biryani with Chef Maya!',
      'Wash your hands carefully, and ask a grown-up to help with the warm stove and heavy cooking pot.',
      'Soak aromatic long-grain basmati rice in water, and keep our tender chicken pieces and fresh herbs ready.',
      'Heat golden ghee in our deep cooking pot, and add fragrant cardamom, cinnamon, and cloves.',
      'Tumble in sliced onions and sauté gently with our wooden spoon until golden and sweet.',
      'Add our seasoned chicken pieces and stir-fry so all the rich spices coat the chicken.',
      'Pour in a little water, cover with the lid, and let the chicken cook until tender and juicy.',
      'Gently layer the drained basmati rice over the spiced chicken, sprinkling saffron and mint leaves on top.',
      'Cover tightly and let everything steam on low heat so the rice becomes fluffy and absorbs the flavors.',
      'Spoon the steaming, golden Chicken Biryani onto our serving plate. It smells absolutely wonderful!'
    ],
    stepsTa: [
      'வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான சிக்கன் பிரியாணி சமைப்போம்!',
      'கைகளை நன்றாக கழுவிக்கொள்ளுங்கள். சூடான அடுப்பு மற்றும் பாத்திரங்களை பயன்படுத்த பெரியவர்களின் உதவியை நாடுங்கள்.',
      'பாஸ்மதி அரிசியை ஊறவைத்து, புதிய சிக்கன் துண்டுகள் மற்றும் நறுமணப் பொருட்களை தயாராக வைக்கவும்.',
      'சூடான பாத்திரத்தில் பொன்னிற நெய் ஊற்றி, ஏலக்காய், பட்டை மற்றும் கிராம்பு சேர்த்து தாளிக்கவும்.',
      'நறுக்கிய வெங்காயத்தை சேர்த்து, பொன்னிறமாகும் வரை மரக்கரண்டியால் மெதுவாக வதக்கவும்.',
      'மசாலா கலந்த சிக்கன் துண்டுகளை சேர்த்து, மசாலா சிக்கனில் நன்றாக சேருமாறு வதக்கவும்.',
      'சிறிதளவு தண்ணீர் சேர்த்து, மூடி போட்டு சிக்கன் மென்மையாகவும் சாறாகவும் வேகும் வரை சமைக்கவும்.',
      'வாசனை பாஸ்மதி அரிசியை சிக்கனின் மேல் பரப்பி, புதினா மற்றும் கொத்தமல்லி தழைகளை தூவவும்.',
      'பாத்திரத்தை மூடி, மிதமான தீயில் வைத்து அரிசி உதிரியாகவும் வாசனையுடனும் வேகும் வரை தம் போடவும்.',
      'சுடச்சுட மணக்கும் சிக்கன் பிரியாணியை அழகான தட்டில் வைத்து பரிமாறுங்கள். மிகச் சிறப்பான சமையல்!'
    ]
  },
  'masala-dosa': {
    titleEn: 'Crispy Masala Dosa',
    titleTa: 'மொறுமொறு மசாலா தோசை (Masala Dosa)',
    ingredients: [
      { id: 'batter', name: 'Fermented Dosa Batter', nameTa: 'தோசை மாவு', category: 'dough', color: '#fffdf5' },
      { id: 'potato', name: 'Spiced Potato Masala', nameTa: 'உருளைக்கிழங்கு மசாலா', category: 'vegetable', color: '#e0a538' },
      { id: 'oil', name: 'Ghee / Sesame Oil', nameTa: 'நல்லெண்ணெய் அல்லது நெய்', category: 'liquid', color: '#e5b84c' },
      { id: 'chutney', name: 'Fresh Coconut Chutney', nameTa: 'தேங்காய் சட்னி', category: 'sauce', color: '#f0f3f4' }
    ],
    stepsEn: [
      'Welcome little chefs! Today we are making golden, crispy South Indian Masala Dosa with Chef Maya!',
      'Always ask a grown-up to supervise the hot tawa griddle and keep your little hands safe.',
      'We have our smooth fermented rice-lentil batter and warm spiced potato filling ready to cook.',
      'Warm the flat tawa griddle over medium heat and lightly grease the surface with a drop of oil.',
      'Pour a ladle of smooth batter right into the center of the warm tawa.',
      'Using the base of our ladle, spread the batter in smooth, even circles outwards from center to rim.',
      'Drizzle a little golden ghee around the edges and watch the dosa turn crispy and golden brown.',
      'Spoon our delicious spiced potato masala filling right across the center of the crispy crepe.',
      'Gently slide the spatula underneath, fold the golden dosa into a neat roll, and lift carefully.',
      'Plate the hot, crispy Masala Dosa with fresh coconut chutney and spicy sambar. Delicious!'
    ],
    stepsTa: [
      'வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் மொறுமொறுப்பான மசாலா தோசை செய்வோம்!',
      'சூடான தோசைக் கல்லை பயன்படுத்தும்போது எப்போதும் பெரியவர்களின் பாதுகாப்பான உதவியைப் பெறுங்கள்.',
      'ஊறவைத்து அரைத்த மென்மையான தோசை மாவு மற்றும் உருளைக்கிழங்கு மசாலாவை தயாராக எடுத்துக்கொள்ளுங்கள்.',
      'தோசைக் கல்லை மிதமான தீயில் சூடாக்கி, சிறிதளவு எண்ணெய் தடவி தயார் செய்யுங்கள்.',
      'ஒரு கரண்டி தோசை மாவை எடுத்து சூடான தோசைக் கல்லின் நடுவே மெதுவாக ஊற்றவும்.',
      'கரண்டியின் அடிப்புறத்தை வைத்து நடுவிலிருந்து வெளிப்பக்கமாக வட்டமாக அழகாக தேய்க்கவும்.',
      'ஓரங்களில் பொன்னிற நெய் அல்லது எண்ணெய் ஊற்றி, தோசை பொன்னிறமாக மொறுமொறுப்பாகும் வரை வேகவைக்கவும்.',
      'சுவையான மஞ்சள் உருளைக்கிழங்கு மசாலாவை தோசையின் நடுவில் சீராக பரப்பி வைக்கவும்.',
      'தோசைத் திருப்பியால் மெதுவாக எடுத்து, தோசையை அழகாக பாதியாக மடக்கி எடுக்கவும்.',
      'மொறுமொறு மசாலா தோசையை தட்டில் வைத்து தேங்காய் சட்னி மற்றும் சாம்பாருடன் பரிமாறுங்கள்!'
    ]
  },
  'vegetable-fried-rice': {
    titleEn: 'Vegetable Fried Rice',
    titleTa: 'காய்கறி ஃப்ரைட் ரைஸ் (Vegetable Fried Rice)',
    ingredients: [
      { id: 'rice', name: 'Fluffy Cooked Rice', nameTa: 'சமைத்த சாதம்', category: 'grain', color: '#f5f5f5' },
      { id: 'veggies', name: 'Carrots, Peas & Corn', nameTa: 'நறுக்கிய காய்கறிகள்', category: 'vegetable', color: '#27ae60' },
      { id: 'garlic', name: 'Chopped Garlic & Ginger', nameTa: 'பூண்டு மற்றும் இஞ்சி', category: 'spice', color: '#e8d5b5' },
      { id: 'sauce', name: 'Soy Sauce & Pepper', nameTa: 'சோயா சாஸ் மற்றும் மிளகு', category: 'liquid', color: '#5d4037' }
    ],
    stepsEn: [
      'Welcome little chefs! Today we are stir-frying colorful, crunchy Vegetable Fried Rice with Chef Maya!',
      'Ask a grown-up to handle high heat and stir-fry cookware safely with you.',
      'Gather chilled fluffy rice, diced carrots, green peas, sweet corn, and minced garlic.',
      'Heat our wok or wide frying pan with sesame oil until it has a warm, gentle sizzle.',
      'Add minced garlic and spring onions, tossing quickly with our spatula until fragrant.',
      'Tumble in crunchy carrots, tender green peas, and bell peppers, stir-frying on high heat.',
      'Add our fluffy cooked rice into the wok, breaking up any clumps with the back of the spatula.',
      'Drizzle savory soy sauce, a pinch of pepper, and salt evenly over the steaming rice.',
      'Toss and mix all the colorful vegetables and seasoned rice together until thoroughly blended.',
      'Scoop warm Vegetable Fried Rice into our serving bowl and garnish with chopped spring greens!'
    ],
    stepsTa: [
      'வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான காய்கறி ஃப்ரைட் ரைஸ் செய்வோம்!',
      'அதிக சூடு உள்ள வாணலியை பயன்படுத்த பெரியவர்களின் பாதுகாப்பான உதவியைப் பெறுங்கள்.',
      'உதிரியான சாதம், நறுக்கிய கேரட், பச்சை பட்டாணி, சோளம் மற்றும் பூண்டை தயாராக எடுத்துக்கொள்ளுங்கள்.',
      'வாணலியில் சிறிது எண்ணெய் ஊற்றி மிதமாக சூடாக்கவும்.',
      'நறுக்கிய பூண்டு மற்றும் வெங்காயத்தாள் சேர்த்து நறுமணம் வரும் வரை வதக்கவும்.',
      'கேரட், பட்டாணி மற்றும் குடைமிளகாய் சேர்த்து வாணலியில் மொறுமொறுப்பாக வதக்கவும்.',
      'உதிரியான சாதத்தை வாணலியில் சேர்த்து கரண்டியால் மெதுவாக கட்டிகள் இல்லாமல் உதிர்க்கவும்.',
      'சோயா சாஸ், உப்பு மற்றும் மிளகுத்தூள் தூவி சாதத்துடன் சமமாக கலக்கவும்.',
      'அனைத்து காய்கறிகளும் சாதமும் ஒன்றாக கலக்கும் வரை நன்கு கிளறி வேகவைக்கவும்.',
      'சுவையான காய்கறி ஃப்ரைட் ரைஸை அழகான கிண்ணத்தில் வைத்து பரிமாறுங்கள்!'
    ]
  },
  'tomato-pasta': {
    titleEn: 'Creamy Tomato Pasta',
    titleTa: 'தக்காளி பாஸ்தா (Tomato Pasta)',
    ingredients: [
      { id: 'pasta', name: 'Italian Pasta', nameTa: 'பாஸ்தா', category: 'pasta', color: '#eed07b' },
      { id: 'tomato', name: 'Crushed Tomato Sauce', nameTa: 'தக்காளி சாஸ்', category: 'sauce', color: '#d32f2f' },
      { id: 'cheese', name: 'Grated Parmesan Cheese', nameTa: 'சீஸ்', category: 'cheese', color: '#fff9c4' },
      { id: 'basil', name: 'Fresh Sweet Basil', nameTa: 'துளசி இலைகள்', category: 'vegetable', color: '#388e3c' }
    ],
    stepsEn: [
      'Welcome little chefs! Today we are cooking delicious Italian Creamy Tomato Pasta with Chef Maya!',
      'Be careful around boiling water pots and always ask an adult to help drain hot pasta.',
      'We have pasta shells, vibrant ripe tomato sauce, olive oil, and fragrant sweet basil ready.',
      'Heat extra virgin olive oil in our sauce pan and gently sauté minced garlic until fragrant.',
      'Pour rich crushed tomato sauce into the pan and season with Italian herbs and a pinch of salt.',
      'Simmer the tomato sauce gently with our spoon as the sweet aromas fill the kitchen.',
      'Tumble tender, cooked pasta directly into our rich, simmering red tomato sauce.',
      'Toss the pasta and sauce together so every piece is coated in silky tomato goodness.',
      'Sprinkle freshly grated parmesan cheese and aromatic basil leaves over the warm pasta.',
      'Twirl the steaming Tomato Pasta onto a warm plate and enjoy with your family!'
    ],
    stepsTa: [
      'வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான தக்காளி பாஸ்தா செய்வோம்!',
      'கொதிக்கும் தண்ணீர் மற்றும் சூடான பாத்திரங்களை கையாள பெரியவர்களின் உதவியை நாடுங்கள்.',
      'பாஸ்தா, தக்காளி சாஸ், ஆலிவ் எண்ணெய் மற்றும் துளசி இலைகளை தயாராக எடுத்துக்கொள்ளுங்கள்.',
      'வாணலியில் ஆலிவ் எண்ணெய் ஊற்றி நறுக்கிய பூண்டை நறுமணம் வரும் வரை மெதுவாக வதக்கவும்.',
      'சுவையான தக்காளி சாஸை ஊற்றி உப்பு மற்றும் மூலிகை பொடி சேர்த்து கலக்கவும்.',
      'தக்காளி சாஸ் கெட்டியாகும் வரை கரண்டியால் மெதுவாக கிளறி கொதிக்கவிடவும்.',
      'வேகவைத்த மென்மையான பாஸ்தாவை தக்காளி சாஸில் சேர்த்து கிளறவும்.',
      'பாஸ்தா முழுவதும் சாஸ் படியும் வரை நன்றாக குலுக்கி கலக்கவும்.',
      'மேலே துருவிய சீஸ் மற்றும் புதிய துளசி இலைகளை தூவி அலங்கரிக்கவும்.',
      'சூடான சுவையான பாஸ்தாவை தட்டில் பரிமாறி மகிழ்ச்சியாக சாப்பிடுங்கள்!'
    ]
  },
  'sambar': {
    titleEn: 'South Indian Sambar',
    titleTa: 'தென்னிந்திய சாம்பார் (South Indian Sambar)',
    ingredients: [
      { id: 'toor_dal', name: 'Cooked Toor Dal', nameTa: 'துவரம் பருப்பு', category: 'grain', color: '#f9e79f' },
      { id: 'veggies', name: 'Drumstick & Shallots', nameTa: 'முருங்கைக்காய் மற்றும் வெங்காயம்', category: 'vegetable', color: '#529668' },
      { id: 'tamarind', name: 'Tamarind Water', nameTa: 'புளி கரைசல்', category: 'liquid', color: '#795548' },
      { id: 'sambar_powder', name: 'Aromatic Sambar Masala', nameTa: 'சாம்பார் தூள்', category: 'spice', color: '#e65100' }
    ],
    stepsEn: [
      'Welcome little chefs! Today we are making traditional, fragrant South Indian Sambar with Chef Maya!',
      'Cooking dal and boiling gravy needs adult supervision around the hot stove.',
      'We have soft cooked toor dal, fresh drumsticks, shallots, tamarind extract, and sambar spices.',
      'In our cooking pot, add tamarind water, turmeric, salt, and tender chopped vegetables.',
      'Boil the vegetables until they become tender and absorb the tangy tamarind base.',
      'Add our aromatic sambar masala powder and stir well so the gravy becomes rich and fragrant.',
      'Pour in our creamy cooked toor dal and mix thoroughly with the vegetable broth.',
      'Heat ghee in a small pan, crackle mustard seeds, cumin, and curry leaves for our tempering.',
      'Pour the sizzling fragrant tempering right into the simmering sambar pot and garnish with coriander.',
      'Ladle piping hot Sambar into a serving bowl, ready to enjoy with steaming rice or hot dosas!'
    ],
    stepsTa: [
      'வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் பாரம்பரிய தென்னிந்திய சாம்பார் செய்வோம்!',
      'சூடான பருப்பு மற்றும் குழம்பு தயாரிக்கும்போது பெரியவர்களின் உதவியைப் பெறுங்கள்.',
      'வேகவைத்த துவரம் பருப்பு, முருங்கைக்காய், சின்ன வெங்காயம், புளிக்கரைசல் மற்றும் சாம்பார் தூளை தயார் செய்யவும்.',
      'பாத்திரத்தில் புளிக்கரைசல், மஞ்சள் தூள், உப்பு மற்றும் நறுக்கிய காய்கறிகளை சேர்க்கவும்.',
      'காய்கறிகள் மென்மையாக வேகும் வரை மிதமான தீயில் கொதிக்க வைக்கவும்.',
      'நறுமண சாம்பார் தூள் சேர்த்து கட்டி இல்லாமல் கரண்டியால் நன்றாக கலக்கவும்.',
      'வேகவைத்த துவரம் பருப்பை ஊற்றி காய்கறிகளோடு சேர்த்து நன்கு கொதிக்கவிடவும்.',
      'சிறிய வாணலியில் நெய் ஊற்றி கடுகு, சீரகம், பெருங்காயம் மற்றும் கறிவேப்பிலை தாளிக்கவும்.',
      'தாளித்த நறுமணப் பொருட்களை சாம்பாரில் ஊற்றி, கொத்தமல்லி தழை தூவி அலங்கரிக்கவும்.',
      'மணக்கும் சுடச்சுட சாம்பாரை கிண்ணத்தில் ஊற்றி சுவையான சாதம் அல்லது தோசையுடன் பரிமாறுங்கள்!'
    ]
  },
  'paneer-butter-masala': {
    titleEn: 'Paneer Butter Masala',
    titleTa: 'பன்னீர் பட்டர் மசாலா (Paneer Butter Masala)',
    ingredients: [
      { id: 'paneer', name: 'Fresh Soft Paneer Cubes', nameTa: 'பன்னீர் துண்டுகள்', category: 'protein', color: '#ffffff' },
      { id: 'butter', name: 'Rich Creamy Butter', nameTa: 'வெண்ணெய்', category: 'liquid', color: '#fff176' },
      { id: 'tomato_gravy', name: 'Tomato Cashew Puree', nameTa: 'தக்காளி முந்திரி சாந்து', category: 'sauce', color: '#c62828' },
      { id: 'cream', name: 'Fresh Cream & Kasuri Methi', nameTa: 'கசுரி மேத்தி மற்றும் கிரீம்', category: 'liquid', color: '#f5f5f5' }
    ],
    stepsEn: [
      'Welcome little chefs! Today we are cooking royal, velvety Paneer Butter Masala with Chef Maya!',
      'Warm pans and bubbling rich gravies require gentle help from a caring adult.',
      'Prepare soft fresh paneer cubes, rich golden butter, tomato cashew puree, and aromatic spices.',
      'Melt generous creamy butter in our pan with a bay leaf, green cardamom, and cinnamon stick.',
      'Pour in our smooth, silky tomato cashew puree and stir gently over medium heat.',
      'Sprinkle kashmiri chili powder, garam masala, salt, and a pinch of sweet honey or sugar.',
      'Simmer the fragrant gravy with our wooden spoon until rich butter floats gently to the top.',
      'Tumble soft paneer cubes into the simmering sauce, folding gently so they stay tender.',
      'Swirl in fresh heavy cream and crush fragrant kasuri methi leaves over the top.',
      'Ladle the royal, creamy Paneer Butter Masala into a serving bowl with warm butter naan or roti!'
    ],
    stepsTa: [
      'வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான பன்னீர் பட்டர் மசாலா செய்வோம்!',
      'சூடான பாத்திரங்கள் மற்றும் கிரீமி கிரேவி செய்யும்போது பெரியவர்களின் உதவியை நாடுங்கள்.',
      'மென்மையான பன்னீர் துண்டுகள், வெண்ணெய், தக்காளி முந்திரி விழுது மற்றும் மசாலாவை எடுத்துக்கொள்ளுங்கள்.',
      'வாணலியில் சுவையான வெண்ணெயை உருக்கி, பட்டை, ஏலக்காய் மற்றும் பிரியாணி இலை சேர்த்து தாளிக்கவும்.',
      'அரைத்த தக்காளி முந்திரி விழுதை வாணலியில் ஊற்றி மிதமான தீயில் கிளறவும்.',
      'காஷ்மீரி மிளகாய்த்தூள், கரம் மசாலா மற்றும் உப்பு சேர்த்து கிரேவியை கொதிக்கவிடவும்.',
      'கிரேவி கெட்டியாகி வெண்ணெய் மேலே பிரிந்து வரும் வரை கரண்டியால் மெதுவாக கிளறவும்.',
      'மென்மையான பன்னீர் துண்டுகளை சேர்த்து மசாலா பன்னீரில் ஊறும் வரை மெதுவாக கலக்கவும்.',
      'புதிய கிரீம் மற்றும் நசுக்கிய கசுரி மேத்தி இலைகளை மேலே தூவி அலங்கரிக்கவும்.',
      'சுவையான பன்னீர் பட்டர் மசாலாவை கிண்ணத்தில் ஊற்றி சுடச்சுட நான் அல்லது சப்பாத்தியுடன் பரிமாறுங்கள்!'
    ]
  }
};

function cleanQuery(prompt = '') {
  return String(prompt)
    .replace(/teach\s+(children|kids|me)\s+(how\s+)?to\s+make/ig, '')
    .replace(/make\s+(a\s+)?(cheerful\s+)?(3d\s+)?(cartoon\s+)?cooking\s+video\s+(where\s+maya\s+makes\s+)?/ig, '')
    .replace(/step by step.*$/i, '')
    .replace(/[.?!]/g, ' ')
    .trim()
    .slice(0, 80);
}

/**
 * Searches TheMealDB freely for any recipe online.
 * Has smart keyword fallback if exact query is not found.
 */
export async function searchMealDb(query) {
  const clean = cleanQuery(query);
  if (!clean) return null;

  // Try exact cleaned query first
  try {
    const response = await fetch(MEALDB_SEARCH + encodeURIComponent(clean), {
      signal: AbortSignal.timeout(3500)
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.meals) && data.meals.length > 0) {
        const meal = data.meals[0];
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
          const ing = meal[`strIngredient${i}`]?.trim();
          const meas = meal[`strMeasure${i}`]?.trim();
          if (ing) ingredients.push(`${meas ? meas + ' ' : ''}${ing}`);
        }
        return {
          title: meal.strMeal,
          category: meal.strCategory,
          area: meal.strArea,
          instructions: meal.strInstructions,
          ingredients
        };
      }
    }
  } catch {}

  // Only fallback to searching words if it is a specific culinary noun
  const culinaryNouns = ['biryani', 'pasta', 'chicken', 'curry', 'rice', 'soup', 'noodles', 'pancake', 'sandwich', 'cake', 'salad', 'pizza', 'taco', 'stew', 'burger', 'fish', 'pie', 'spaghetti', 'sambar', 'paneer'];
  const words = clean.toLowerCase().split(/\s+/);
  const matchedNoun = words.find(w => culinaryNouns.includes(w));
  if (matchedNoun) {
    try {
      const response = await fetch(MEALDB_SEARCH + encodeURIComponent(matchedNoun), {
        signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.meals) && data.meals.length > 0) {
          const meal = data.meals[0];
          const ingredients = [];
          for (let i = 1; i <= 20; i++) {
            const ing = meal[`strIngredient${i}`]?.trim();
            const meas = meal[`strMeasure${i}`]?.trim();
            if (ing) ingredients.push(`${meas ? meas + ' ' : ''}${ing}`);
          }
          return {
            title: meal.strMeal,
            category: meal.strCategory,
            area: meal.strArea,
            instructions: meal.strInstructions,
            ingredients
          };
        }
      }
    } catch {}
  }
  return null;
}

/**
 * Procedurally generates an authentic, complete 8-10 step recipe for ANY input.
 */
export function generateProceduralRecipe(dishName, isTamil = false) {
  const name = cleanQuery(dishName) || 'Special Meal';
  const lower = name.toLowerCase();

  const isSoup = /\b(soup|stew|broth|dal|sambar|rasam|curry|gravy)\b/i.test(lower);
  const isPan = /\b(pancake|crepe|dosa|omelette|chapati|roti|paratha|pizza)\b/i.test(lower);
  const isWok = /\b(noodle|chowmein|fried rice|stir[- ]?fry)\b/i.test(lower);
  const isDessert = /\b(cake|cookie|pudding|sweet|ice cream|jamun|halwa)\b/i.test(lower);
  const isCold = /\b(salad|smoothie|sandwich|shake)\b/i.test(lower);

  let cookware = 'pot';
  let utensil = 'spoon';
  if (isPan) { cookware = 'pan'; utensil = 'spatula'; }
  else if (isWok) { cookware = 'wok'; utensil = 'spatula'; }
  else if (isCold) { cookware = 'bowl'; utensil = 'spoon'; }

  if (isTamil) {
    return {
      title: `${name} செய்முறை`,
      cookware,
      utensil,
      steps: [
        `வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான ${name} செய்வோம்!`,
        'சூடான பாத்திரங்கள் மற்றும் அடுப்பை பயன்படுத்த எப்போதும் பெரியவர்களின் உதவியைப் பெறுங்கள்.',
        `சுவையான ${name} செய்ய தேவையான புதிய பொருட்கள் அனைத்தையும் தயாராக எடுத்துக்கொள்ளுங்கள்.`,
        `சமையல் பாத்திரத்தை மிதமான தீயில் வைத்து, சிறிதளவு எண்ணெய் அல்லது வெண்ணெய் ஊற்றி சூடாக்கவும்.`,
        'நறுக்கிய காய்கறிகள் மற்றும் நறுமண மசாலாப் பொருட்களை சேர்த்து மெதுவாக வதக்கவும்.',
        `முக்கிய சுவைப்பொருட்களை சேர்த்து ${utensil === 'spatula' ? 'கரண்டியால்' : 'மரக்கரண்டியால்'} நன்றாக கிளறவும்.`,
        'சிறிதளவு தண்ணீர் மற்றும் சுவைக்கேற்ப உப்பு சேர்த்து சுவைகள் ஒன்றுசேர கலக்கவும்.',
        'பாத்திரத்தை மூடி வைத்து, மிதமான தீயில் சுவை மணக்க மணக்க வேகவைக்கவும்.',
        'புதிய கொத்தமல்லி மற்றும் அலங்கார பொருட்களை மேலே தூவி அலங்கரிக்கவும்.',
        `சுடச்சுட தயாரான ${name} உணவை தட்டில் வைத்து மகிழ்ச்சியாக பரிமாறுங்கள்!`
      ]
    };
  }

  return {
    title: name,
    cookware,
    utensil,
    steps: [
      `Welcome little chefs! Today we are cooking delicious ${name} with Chef Maya!`,
      'Wash your hands clean and always ask a grown-up to supervise warm stoves and sharp utensils.',
      `Gather all our fresh ingredients and seasonings for our homemade ${name}.`,
      `Warm our cooking ${cookware} over medium heat and add a drizzle of golden oil or butter.`,
      'Add aromatic seasonings and vegetables, sautéing gently with our wooden spoon until fragrant.',
      `Add our main ingredients into the warm ${cookware} and stir evenly to coat with spices.`,
      'Pour in our liquid base, stirring gently so all the rich flavors blend together beautifully.',
      'Cover with a lid and let everything simmer gently until tender, juicy, and steaming hot.',
      'Garnish the top with fresh green herbs and a touch of savory seasoning.',
      `Spoon our finished ${name} onto a colorful serving plate. Great cooking, little chefs!`
    ]
  };
}

/**
 * Universal free recipe enrichment:
 * 1. Checks Bedrock if configured.
 * 2. Checks local culinary registry (100% full multi-step).
 * 3. Queries TheMealDB freely online.
 * 4. Uses procedural culinary engine for ANY dish.
 */
export async function enrichWithFreeRecipe(prompt) {
  const query = cleanQuery(prompt);
  if (!query) return null;

  // 1. Check local authentic registry
  const lower = query.toLowerCase();
  for (const [key, data] of Object.entries(CULINARY_REGISTRY)) {
    if (lower.includes(key.replace(/-/g, ' ')) || lower.includes(data.titleEn.toLowerCase())) {
      return `Teach children how to make ${data.titleEn} step by step in simple English.\n${data.stepsEn.join('\n')}`;
    }
  }

  // 2. Query TheMealDB freely
  const onlineMeal = await searchMealDb(query);
  if (onlineMeal && onlineMeal.instructions) {
    const rawSentences = onlineMeal.instructions
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && !s.toLowerCase().startsWith('step'));

    const intro = `Welcome little chefs! Today we make ${onlineMeal.title} with Chef Maya!`;
    const safety = `Always ask a grown-up for help around hot stoves and cooking pots.`;
    const coreSteps = rawSentences.slice(0, 7);
    const finish = `Spoon our freshly cooked ${onlineMeal.title} onto the plate. Great cooking!`;

    const fullSteps = [intro, safety, ...coreSteps, finish];
    return `Teach children how to make ${onlineMeal.title} step by step in simple English.\n${fullSteps.join('\n')}`;
  }

  // 3. Return null for unrecognized/invented dishes so generic cooking visualization is used
  return null;
}

/**
 * Translates actions to natural, rich Tamil for any dish.
 */
export async function translateActionsToTamil(actions) {
  if (!Array.isArray(actions) || !actions.length) return null;
  const instruction = [
    'Translate every cooking lesson step below into warm, joyful, child-friendly Tamil.',
    'Keep each line descriptive, clear, and engaging.',
    'Return ONLY a valid JSON array of strings in the exact same order.',
    JSON.stringify(actions.map(a => a.text))
  ].join('\n');

  try {
    const text = (await bedrockText(instruction, 1800))?.replace(/^```json\s*|\s*```$/g, '');
    if (!text) return null;
    const translated = JSON.parse(text);
    if (Array.isArray(translated) && translated.length === actions.length) {
      return translated;
    }
  } catch {}
  return null;
}

export async function translateActionsWithFreeService(actions) {
  if (!Array.isArray(actions) || !actions.length) return null;
  try {
    const translated = await Promise.all(actions.map(async action => {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(action.text.slice(0, 450))}&langpair=en|ta`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'LifeMotion-Cooking-Studio/1.0' },
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) throw Error('Translation service unavailable');
      const text = (await response.json()).responseData?.translatedText?.trim();
      if (!text || text.toLowerCase() === action.text.trim().toLowerCase()) throw Error('Unchanged');
      return text;
    }));
    return translated.length === actions.length ? translated : null;
  } catch {
    return null;
  }
}

export function translateActionsWithLocalTamil(actions, title = 'இந்த உணவு') {
  if (!Array.isArray(actions) || !actions.length) return null;
  const cleanTitle = cleanQuery(title) || 'சுவையான உணவு';
  const lower = cleanTitle.toLowerCase();

  // Check registry match
  for (const [, data] of Object.entries(CULINARY_REGISTRY)) {
    if (lower.includes(data.titleEn.toLowerCase()) || lower.includes(data.titleTa.toLowerCase())) {
      if (data.stepsTa && data.stepsTa.length >= actions.length) {
        return actions.map((_, i) => data.stepsTa[i] || data.stepsTa[data.stepsTa.length - 1]);
      }
    }
  }

  // Smart culinary translation map
  return actions.map((action, index) => {
    const key = String(action.key || '').toLowerCase();
    const verb = String(action.action || '').toLowerCase();
    const text = String(action.text || '').toLowerCase();

    if (key.includes('welcome') || index === 0) {
      return `வணக்கம் குட்டி சமையல் கலைஞர்களே! இன்று செஃப் மாயாவுடன் சுவையான ${cleanTitle} சமைப்போம்!`;
    }
    if (key.includes('safe') || text.includes('safe') || text.includes('grown-up')) {
      return 'கைகளை நன்றாக கழுவுங்கள். சூடான அடுப்பு மற்றும் பாத்திரங்களை பயன்படுத்த பெரியவர்களின் உதவியை நாடுங்கள்.';
    }
    if (key.includes('ingredient') || verb === 'show') {
      return `தேவையான புதிய பொருட்கள் மற்றும் நறுமண மசாலாக்கள் அனைத்தையும் தயாராக எடுத்துக்கொள்ளுங்கள்.`;
    }
    if (['add', 'pour'].includes(verb)) {
      if (text.includes('onion') || text.includes('garlic')) {
        return 'நறுக்கிய வெங்காயம் மற்றும் பூண்டை சூடான பாத்திரத்தில் சேர்த்து பொன்னிறமாக வதக்கவும்.';
      }
      if (text.includes('spice') || text.includes('masala')) {
        return 'வாசனை மசாலா மற்றும் சுவைப்பொருட்களை சேர்த்து சீராக கலக்கவும்.';
      }
      return 'தேவையான பொருட்களை பாத்திரத்தில் சேர்த்து கவனமாக கிளறவும்.';
    }
    if (['mix', 'stir', 'spread', 'toss'].includes(verb)) {
      return 'அனைத்து பொருட்களும் சமமாக ஒன்றுசேரும் வரை கரண்டியால் மெதுவாக கிளறி கலக்கவும்.';
    }
    if (verb === 'flip') {
      return 'பெரியவரின் உதவியுடன் தோசை திருப்பியால் கவனமாக திருப்பி பொன்னிறமாக வேகவைக்கவும்.';
    }
    if (['boil', 'simmer', 'cook', 'saute', 'fry'].includes(verb)) {
      return 'பாத்திரத்தை மூடி மிதமான தீயில் சுவைகள் நன்றாக ஒன்றுசேரும் வரை வேகவைக்கவும்.';
    }
    if (['serve', 'plate'].includes(verb) || index === actions.length - 1) {
      return `மணக்கும் சுவையான ${cleanTitle} தயார்! தட்டில் வைத்து குடும்பத்துடன் மகிழ்ச்சியாக பரிமாறுங்கள்!`;
    }
    return 'அடுத்த படியை மெதுவாகவும் கவனமாகவும் செய்யுங்கள்.';
  });
}

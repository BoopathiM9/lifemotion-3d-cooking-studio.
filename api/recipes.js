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

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  return res.status(200).json({
    recipes: RECIPES,
    voices: VOICES,
    formats: ['16:9', '9:16'],
    busy: false
  });
}

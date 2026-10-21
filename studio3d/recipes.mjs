/**
 * LifeMotion 3D Cooking Studio
 * Reusable Recipe Storyboard & Catalog Interface
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateRecipePlan,
  createUnknownFood,
  cleanRecipeTitle,
  extractSentences,
  parseInstructionsToPlan,
  slugify
} from './recipe-planner.mjs';
import { buildVisualPlan, normalizeActionVerb } from './visual-plan.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'data', 'recipes');

export const voices = [
  'en-US-JennyNeural',
  'en-US-AriaNeural'
];

/**
 * Pre-loads all local authentic recipe JSONs synchronously on module load.
 */
function loadLocalRecipesSync() {
  const map = {};
  try {
    const files = readdirSync(DATA_DIR);
    for (const f of files) {
      if (f.endsWith('.json')) {
        const content = readFileSync(join(DATA_DIR, f), 'utf8');
        const r = JSON.parse(content);
        const id = r.recipeId || f.replace('.json', '');
        map[id] = {
          name: r.title,
          actions: Array.isArray(r.steps) ? r.steps.map(s => [s.key, s.text]) : [],
          ...r
        };
      }
    }
  } catch (err) {
    console.warn('Sync recipe load warning:', err.message);
  }
  return map;
}

export const recipes = loadLocalRecipesSync();

/**
 * Matches input text against pre-loaded recipes synchronously.
 * @param {string} prompt
 * @returns {any|null}
 */
export function matchRecipeSync(prompt = '') {
  const lower = prompt.toLowerCase();

  const aliases = [
    { id: 'masala-dosa', pattern: /\b(dosa|masala dosa)\b/i },
    { id: 'pancakes', pattern: /\b(pancake|pancakes|crepe)\b/i },
    { id: 'vegetable-sandwich', pattern: /\b(sandwich|sandwiches|veggie sandwich)\b/i },
    { id: 'chicken-biryani', pattern: /\b(biryani|biriyani|chicken biryani)\b/i },
    { id: 'vegetable-fried-rice', pattern: /\b(fried rice|fried-rice)\b/i },
    { id: 'tomato-pasta', pattern: /\b(pasta|spaghetti|macaroni)\b/i },
    { id: 'noodles', pattern: /\b(noodle|noodles|chowmein)\b/i },
    { id: 'chapati', pattern: /\b(chapati|roti|phulka|flatbread)\b/i },
    { id: 'vegetable-soup', pattern: /\b(soup|stew|broth)\b/i },
    { id: 'salad', pattern: /\b(salad)\b/i }
  ];

  for (const { id, pattern } of aliases) {
    if (pattern.test(lower)) {
      const found = recipes[id];
      if (found) {
        return JSON.parse(JSON.stringify(found));
      }
    }
  }

  for (const [id, r] of Object.entries(recipes)) {
    if (lower.includes(id.replace(/-/g, ' ')) || lower.includes(r.name.toLowerCase())) {
      return JSON.parse(JSON.stringify(r));
    }
  }

  return null;
}

/**
 * Universal Storyboard Generator.
 * Transforms user prompt into a structured RecipePlan and VisualPlan.
 * Supports:
 * - Structured JSON inputs
 * - Authentic dataset matching (Biryani, Pasta, Fried rice, Dosa, Pancakes, Sandwich, etc.)
 * - User-supplied multi-sentence instructions
 * - Honest generic cooking planner (with genericVisualization: true flag)
 *
 * @param {object} options
 * @param {string|object} options.prompt
 * @param {string} [options.recipe='auto']
 * @param {string} [options.voice=voices[0]]
 * @param {string} [options.format='16:9']
 * @returns {object} Validated visual plan
 */
export function storyboard({
  prompt = '',
  recipe = 'auto',
  voice = voices[0],
  format = '16:9'
} = {}) {
  if (!voices.includes(voice)) {
    throw new Error('Choose an available English voice: en-US-JennyNeural or en-US-AriaNeural.');
  }
  if (!['16:9', '9:16'].includes(format)) {
    throw new Error('Choose 16:9 or 9:16.');
  }

  // 1. Direct JSON input
  if (typeof prompt === 'object' && prompt.title && Array.isArray(prompt.steps)) {
    const validated = validateRecipePlan({ ...prompt, voice, format });
    return buildVisualPlan(validated);
  }

  if (typeof prompt === 'string' && prompt.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(prompt.trim());
      if (parsed.title && Array.isArray(parsed.steps)) {
        const validated = validateRecipePlan({ ...parsed, voice, format });
        return buildVisualPlan(validated);
      }
    } catch {}
  }

  const promptText = typeof prompt === 'string' ? prompt.trim() : '';
  if (!promptText) {
    throw new Error('Enter a recipe prompt between 1 and 2000 characters.');
  }

  // 2. Check local authentic recipe dataset
  const localMatch = matchRecipeSync(promptText);
  if (localMatch) {
    if (recipe !== 'auto' && recipe !== localMatch.recipeId) {
      throw new Error(`The selected recipe does not match your prompt.`);
    }
    localMatch.voice = voice;
    localMatch.format = format;
    localMatch.prompt = promptText;
    const validated = validateRecipePlan(localMatch);
    return buildVisualPlan(validated);
  }

  // 3. User-supplied multi-sentence cooking instructions
  const sentences = extractSentences(promptText);
  if (sentences.length >= 3) {
    const title = cleanRecipeTitle(sentences[0]);
    const plan = parseInstructionsToPlan(title, promptText);
    plan.voice = voice;
    plan.format = format;
    plan.prompt = promptText;
    return buildVisualPlan(plan);
  }

  // 4. Honest Generic Cooking RulePlanner Fallback
  // Clearly marked as generic cooking visualization rather than authentic recipe
  const title = cleanRecipeTitle(promptText);
  const unknownFood = createUnknownFood(title);

  const isSoupOrPot = /\b(soup|curry|stew|gravy|dal|broth)\b/i.test(promptText);
  const isPan = /\b(pancake|crepe|omelette|egg|chapati|flatbread|pizza)\b/i.test(promptText);
  const isWok = /\b(stir[- ]?fry|noodles|fried rice)\b/i.test(promptText);
  const isCold = /\b(salad|smoothie|sandwich|raw)\b/i.test(promptText);

  let primaryEquipment = 'pot';
  let utensil = 'spoon';
  if (isPan) { primaryEquipment = 'pan'; utensil = 'spatula'; }
  else if (isWok) { primaryEquipment = 'wok'; utensil = 'spatula'; }
  else if (isCold) { primaryEquipment = 'bowl'; utensil = 'spoon'; }

  const genericPlan = {
    title,
    recipeId: slugify(title),
    genericVisualization: true,
    uncertaintyNote: 'Generic cooking visualization; authentic recipe steps unavailable.',
    primaryEquipment,
    utensil,
    isColdDish: isCold,
    voice,
    format,
    prompt: promptText,
    equipment: [primaryEquipment, 'bowl', utensil, 'plate'],
    ingredients: [
      unknownFood,
      { id: 'veggies', name: 'Fresh Greens', category: 'vegetable', state: 'chopped', color: '#4caf50' },
      { id: 'seasoning', name: 'Seasoning', category: 'liquid', state: 'liquid', color: '#c0392b' }
    ],
    steps: [
      { key: 'welcome', action: 'show', target: primaryEquipment, text: `Hello, little chefs! I'm Chef Maya. Today we're cooking ${title}!` },
      { key: 'safe', action: 'show', target: primaryEquipment, text: 'Clean your hands thoroughly and ask a grown-up to supervise warm cookware.' },
      { key: 'ingredients', action: 'show', ingredient: unknownFood.id, target: 'bowl', text: `We have prepared our special ${unknownFood.name} and seasonings.` },
      { key: 'add_main', action: 'add', ingredient: unknownFood.id, source: 'bowl', target: primaryEquipment, text: `Gently add the ${unknownFood.name} into the ${primaryEquipment}.` },
      { key: 'add_veggies', action: 'add', ingredient: 'veggies', source: 'bowl', target: primaryEquipment, text: 'Tumble in fresh green vegetables for color and crunch.' },
      { key: 'season', action: 'pour', ingredient: 'seasoning', source: 'bowl', target: primaryEquipment, text: 'Drizzle our savory seasoning right over the ingredients.' },
      { key: 'cook_all', action: 'cook', ingredient: unknownFood.id, target: primaryEquipment, text: `Cook and simmer gently with our ${utensil} as wonderful aromas fill the room.` },
      { key: 'serve', action: 'serve', source: primaryEquipment, target: 'plate', text: `Spoon our freshly prepared ${title} onto the serving plate. Wonderful cooking, little chefs!` }
    ]
  };

  const validated = validateRecipePlan(genericPlan);
  return buildVisualPlan(validated);
}

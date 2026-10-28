/**
 * LifeMotion Cooking Studio
 * Recipe Planner & Intermediate Representation
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'data', 'recipes');

/**
 * Deterministic string hash (32-bit unsigned integer).
 * @param {string} str
 * @returns {number}
 */
export function hashString(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Deterministically creates an unknown food specification from an unrecognized ingredient name.
 * The same name produces the exact same appearance every time without crashing.
 * @param {string} name
 * @returns {{ id: string, name: string, category: string, state: string, color: string }}
 */
export function createUnknownFood(name = 'unknown') {
  const clean = name.trim().toLowerCase() || 'food';
  const id = clean.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const h = hashString(clean);

  const colors = [
    '#e0a96d', '#8bb5a4', '#d97d54', '#eed07b',
    '#9fc17a', '#c77dff', '#df9b86', '#e67e22'
  ];
  const color = colors[h % colors.length];

  const categories = ['vegetable', 'grain', 'protein', 'dough', 'unknown-food'];
  const category = categories[h % categories.length];

  return {
    id: id || 'unknown-item',
    name: name.trim() || 'Special Ingredient',
    category,
    state: 'whole',
    color
  };
}

/**
 * Normalizes a slug or identifier.
 * @param {string} str
 * @returns {string}
 */
export function slugify(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Validates a RecipePlan and fixes defaults.
 * @param {any} plan
 * @returns {any} Validated RecipePlan
 */
export function validateRecipePlan(plan) {
  if (!plan || typeof plan !== 'object') {
    throw new Error('RecipePlan must be a valid object');
  }

  if (typeof plan.title !== 'string' || !plan.title.trim()) {
    plan.title = 'Cooking Recipe';
  }

  plan.recipeId = slugify(plan.recipeId || plan.title);
  plan.voice = plan.voice || 'en-US-JennyNeural';
  plan.format = plan.format === '9:16' ? '9:16' : '16:9';
  plan.genericVisualization = Boolean(plan.genericVisualization);
  plan.isColdDish = Boolean(plan.isColdDish);

  if (!Array.isArray(plan.ingredients)) {
    plan.ingredients = [];
  }
  plan.ingredients = plan.ingredients.map(ing => {
    if (!ing || typeof ing !== 'object') {
      return createUnknownFood('ingredient');
    }
    const cleanId = slugify(ing.id || ing.name || 'item');
    return {
      id: cleanId,
      name: ing.name || cleanId,
      category: ing.category || 'vegetable',
      state: ing.state || 'whole',
      color: ing.color || '#e0a96d'
    };
  });

  const validEquipment = ['pan', 'wok', 'pot', 'saucepan', 'bowl', 'plate', 'board', 'tray'];
  if (!Array.isArray(plan.equipment) || plan.equipment.length === 0) {
    plan.equipment = ['pot', 'bowl', 'spoon', 'plate'];
  }
  plan.primaryEquipment = validEquipment.includes(plan.primaryEquipment) ? plan.primaryEquipment : 'pot';
  plan.utensil = plan.utensil || 'spoon';

  if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
    throw new Error('RecipePlan must contain at least one cooking step');
  }

  plan.steps = plan.steps.map((st, i) => {
    if (!st || typeof st !== 'object') {
      return {
        key: `step_${i}`,
        action: 'cook',
        target: plan.primaryEquipment,
        text: 'Let it cook gently and simmer.'
      };
    }
    return {
      key: st.key || `step_${i}`,
      action: st.action || 'cook',
      ingredient: st.ingredient || (plan.ingredients[0] ? plan.ingredients[0].id : undefined),
      source: st.source || 'bowl',
      target: st.target || plan.primaryEquipment,
      text: st.text || 'Cook carefully with Chef Maya.',
      childSafeReminder: Boolean(st.childSafeReminder)
    };
  });

  // Ensure serving step at the end
  const lastStep = plan.steps[plan.steps.length - 1];
  if (lastStep.action !== 'serve' && lastStep.action !== 'plate') {
    plan.steps.push({
      key: 'serve',
      action: 'serve',
      source: plan.primaryEquipment,
      target: 'plate',
      text: `Dish our delicious ${plan.title} onto the plate. Great cooking, little chefs!`
    });
  }

  return plan;
}

/**
 * Loads pre-defined local recipes from data/recipes directory.
 * @returns {Promise<Map<string, any>>}
 */
let cachedRecipes = null;
export async function getLocalRecipeDataset() {
  if (cachedRecipes) return cachedRecipes;
  const map = new Map();
  try {
    const files = await readdir(DATA_DIR);
    for (const f of files) {
      if (f.endsWith('.json')) {
        const content = await readFile(join(DATA_DIR, f), 'utf8');
        const r = JSON.parse(content);
        map.set(r.recipeId || f.replace('.json', ''), r);
      }
    }
  } catch (err) {
    console.warn('Could not load recipe dataset from data/recipes:', err.message);
  }
  cachedRecipes = map;
  return map;
}

/**
 * Matches input text against pre-defined recipes.
 * @param {string} prompt
 * @returns {Promise<any|null>}
 */
export async function matchLocalRecipe(prompt = '') {
  const dataset = await getLocalRecipeDataset();
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
      const found = dataset.get(id);
      if (found) {
        return JSON.parse(JSON.stringify(found));
      }
    }
  }

  // Exact match by recipeId
  for (const [id, r] of dataset.entries()) {
    if (lower.includes(id.replace(/-/g, ' ')) || lower.includes(r.title.toLowerCase())) {
      return JSON.parse(JSON.stringify(r));
    }
  }

  return null;
}

/**
 * Optional local LLM planner using Ollama if running.
 * Automatically times out after 1500ms to avoid blocking CPU.
 * @param {string} prompt
 * @returns {Promise<any|null>}
 */
export async function tryOllamaPlanner(prompt) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2', // or any installed lightweight model
        prompt: `Convert this recipe into a JSON RecipePlan with fields: title, primaryEquipment, utensil, isColdDish, ingredients (array of {id, name, category, state, color}), steps (array of {key, action, ingredient, source, target, text}). Respond with strict JSON only: ${prompt}`,
        stream: false,
        format: 'json'
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(data.response);
    return validateRecipePlan(parsed);
  } catch {
    return null; // Gracefully fall back if Ollama is not installed or unreachable
  }
}

/**
 * Extracts sentences and user instructions if provided.
 * @param {string} text
 * @returns {string[]}
 */
export function extractSentences(text = '') {
  return (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text])
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Parses user-supplied detailed cooking instructions directly into structured steps.
 * @param {string} title
 * @param {string} instructions
 * @returns {any}
 */
export function parseInstructionsToPlan(title, instructions) {
  const sentences = extractSentences(instructions);
  const steps = [
    {
      key: 'welcome',
      action: 'show',
      target: 'pot',
      text: `Hello, little chefs! I'm Chef Maya. Let's make ${title} together!`
    },
    {
      key: 'safe',
      action: 'show',
      target: 'pot',
      text: 'Wash your hands thoroughly and ask a grown-up to help with heat, stoves, and utensils.'
    }
  ];

  const lower = instructions.toLowerCase();
  const isCold = /\b(salad|cold|sandwich|smoothie)\b/i.test(lower);
  let primaryEquipment = 'pot';
  let utensil = 'spoon';

  if (/\b(pan|skillet|tawa|tava|crepe|pancake|dosa|chapati)\b/i.test(lower)) {
    primaryEquipment = 'pan';
    utensil = 'spatula';
  } else if (/\b(wok|stir[- ]?fry|noodles)\b/i.test(lower)) {
    primaryEquipment = 'wok';
    utensil = 'spatula';
  } else if (/\b(board|bread|slice|sandwich)\b/i.test(lower)) {
    primaryEquipment = 'board';
    utensil = 'knife';
  } else if (isCold) {
    primaryEquipment = 'bowl';
    utensil = 'spoon';
  }

  // Detect ingredients from text
  const detectedIngredients = [];
  const foodKeywords = [
    { id: 'rice', name: 'Rice', category: 'grain', color: '#fbfbf0' },
    { id: 'chicken', name: 'Chicken', category: 'protein', color: '#d69a68' },
    { id: 'cheese', name: 'Cheese', category: 'cheese', color: '#f9e79f' },
    { id: 'vegetables', name: 'Fresh Vegetables', category: 'vegetable', color: '#27ae60' },
    { id: 'tomato', name: 'Tomatoes', category: 'vegetable', color: '#e53935' },
    { id: 'onion', name: 'Onions', category: 'vegetable', color: '#b57c3d' },
    { id: 'pasta', name: 'Pasta', category: 'pasta', color: '#eed07b' },
    { id: 'noodles', name: 'Noodles', category: 'noodle', color: '#f3e1a8' },
    { id: 'dough', name: 'Dough', category: 'dough', color: '#d9b68c' },
    { id: 'sauce', name: 'Sauce', category: 'liquid', color: '#c0392b' },
    { id: 'oil', name: 'Cooking Oil', category: 'liquid', color: '#dfb445' }
  ];

  for (const item of foodKeywords) {
    if (new RegExp(`\\b${item.id}\\b`, 'i').test(lower)) {
      detectedIngredients.push(item);
    }
  }

  if (detectedIngredients.length === 0) {
    detectedIngredients.push(createUnknownFood(title));
  }

  // Map each sentence to a visual action
  sentences.forEach((sentence, idx) => {
    const sLower = sentence.toLowerCase();
    let action = 'cook';
    if (/\b(pour|drizzle)\b/i.test(sLower)) action = 'pour';
    else if (/\b(add|put|drop|place|tumble)\b/i.test(sLower)) action = 'add';
    else if (/\b(stir|mix|combine|toss)\b/i.test(sLower)) action = 'mix';
    else if (/\b(spread)\b/i.test(sLower)) action = 'spread';
    else if (/\b(flip|turn)\b/i.test(sLower)) action = 'flip';
    else if (/\b(boil|simmer)\b/i.test(sLower)) action = 'boil';
    else if (/\b(serve|dish|plate)\b/i.test(sLower)) action = 'serve';

    steps.push({
      key: `step_${idx + 1}`,
      action,
      ingredient: detectedIngredients[idx % detectedIngredients.length].id,
      source: 'bowl',
      target: action === 'serve' ? 'plate' : primaryEquipment,
      text: sentence
    });
  });

  return validateRecipePlan({
    title,
    recipeId: slugify(title),
    genericVisualization: false,
    primaryEquipment,
    utensil,
    isColdDish: isCold,
    equipment: [primaryEquipment, 'bowl', utensil, 'plate'],
    ingredients: detectedIngredients,
    steps
  });
}

/**
 * Clean recipe title from natural language preamble.
 * @param {string} prompt
 * @returns {string}
 */
export function cleanRecipeTitle(prompt = '') {
  let text = prompt.trim();
  const prefixes = [
    /^(a\s+)?(cheerful\s+)?(3d\s+)?(cartoon\s+)?cooking video where (chef\s+)?maya makes\s+/i,
    /^(chef\s+maya\s+)?(teach|teaches)\s+(me|children|kids)?\s*(how\s+to\s+make\s+|how\s+to\s+|to\s+make\s+)?/i,
    /^chef\s+maya\s+/i,
    /^please\s+/i, /^can you\s+(make\s+)?/i, /^could you\s+/i,
    /^i want to\s+(make\s+)?/i, /^how to\s+(make\s+)?/i,
    /^(make|cook|prepare|bake)\s+/i,
    /^(a\s+|an\s+)?(3d\s+)?(cartoon\s+)?cooking video (of|for|about)\s+/i
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of prefixes) {
      const next = text.replace(p, '').trim();
      if (next !== text) {
        text = next;
        changed = true;
      }
    }
  }
  text = text
    .replace(/\b(?:step[- ]by[- ]step|in simple (?:english|tamil)|for (?:children|kids)|with (?:english|tamil) narration)\b.*$/i, '')
    .replace(/\b(?:recipe|cooking lesson|cooking video)\b\s*$/i, '')
    .trim();
  text = text.replace(/[.!?,;:]+$/g, '').trim();
  const words = text.split(/\s+/).slice(0, 6).join(' ');
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Delicious Dish';
}

/**
 * Universal Recipe Planner.
 * Supports:
 * - Structured JSON inputs
 * - Local dataset matching
 * - User-supplied multi-sentence instructions
 * - Optional local Ollama model
 * - Honest generic cooking planner (with genericVisualization: true flag)
 * @param {any} input
 * @returns {Promise<any>}
 */
export async function planRecipe({ prompt = '', recipe = 'auto', voice = 'en-US-JennyNeural', format = '16:9' } = {}) {
  // 1. Direct JSON input mode
  if (typeof prompt === 'object' && prompt.title && Array.isArray(prompt.steps)) {
    return validateRecipePlan({ ...prompt, voice, format });
  }

  if (typeof prompt === 'string' && prompt.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(prompt.trim());
      if (parsed.title && Array.isArray(parsed.steps)) {
        return validateRecipePlan({ ...parsed, voice, format });
      }
    } catch {}
  }

  const promptText = typeof prompt === 'string' ? prompt.trim() : '';
  if (!promptText) {
    throw new Error('Please enter a recipe prompt.');
  }

  // 2. Check local authentic recipe dataset
  const localMatch = await matchLocalRecipe(promptText);
  if (localMatch) {
    localMatch.voice = voice;
    localMatch.format = format;
    localMatch.prompt = promptText;
    return validateRecipePlan(localMatch);
  }

  // 3. User-supplied multi-sentence cooking instructions
  const sentences = extractSentences(promptText);
  if (sentences.length >= 3) {
    const title = cleanRecipeTitle(sentences[0]);
    const plan = parseInstructionsToPlan(title, promptText);
    plan.voice = voice;
    plan.format = format;
    plan.prompt = promptText;
    return plan;
  }

  // 4. Try optional local LLM if installed
  const llmPlan = await tryOllamaPlanner(promptText);
  if (llmPlan) {
    llmPlan.voice = voice;
    llmPlan.format = format;
    llmPlan.prompt = promptText;
    return llmPlan;
  }

  // 5. Honest Generic Cooking RulePlanner Fallback
  // Clearly marked as generic cooking visualization rather than authentic recipe
  const title = cleanRecipeTitle(promptText);
  const unknownFood = createUnknownFood(title);

  const isSoupOrPot = /\b(soup|curry|stew|gravy|dal|broth)\b/i.test(promptText);
  const isPan = /\b(pancake|crepe|omelette|egg|chapati|flatbread)\b/i.test(promptText);
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

  return validateRecipePlan(genericPlan);
}

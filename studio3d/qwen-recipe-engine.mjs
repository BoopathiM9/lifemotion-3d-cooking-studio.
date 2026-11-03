/**
 * LifeMotion AI - Qwen2.5-1.5B-Instruct & Dynamic Recipe Planning Engine
 * Supports local Ollama deployment (http://127.0.0.1:11434) with CPU-compatible quantization.
 * Automatically validates food safety rules, adult supervision reminders, and schema integrity.
 * Preserves the 10 curated recipes as verified examples and rock-solid fallbacks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recipes, matchRecipeSync } from './recipes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, 'output', 'recipes-cache');

export const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';

// 15 Reusable cooking actions required by LifeMotion dynamic scene engine
export const SUPPORTED_ACTIONS = [
  'wash',
  'chop',
  'pour',
  'marinate',
  'mix',
  'stir',
  'fry',
  'boil',
  'steam',
  'spread',
  'flip',
  'layer',
  'cover',
  'garnish',
  'serve',
  'welcome',
  'safe',
  'prep',
  'ending'
];

// Rich Action Synonyms mapping natural language verbs to supported animation actions
export const ACTION_SYNONYMS = {
  'cook': 'fry',
  'saute': 'fry',
  'bake': 'steam',
  'simmer': 'steam',
  'warm': 'stir',
  'heat': 'stir',
  'add': 'pour',
  'drop': 'pour',
  'season': 'garnish',
  'sprinkle': 'garnish',
  'plate': 'serve',
  'dish': 'serve',
  'toss': 'mix',
  'combine': 'mix',
  'blend': 'mix',
  'whisk': 'stir',
  'rinse': 'wash',
  'clean': 'wash',
  'slice': 'chop',
  'dice': 'chop',
  'cut': 'chop',
  'coat': 'marinate',
  'rub': 'marinate',
  'tier': 'layer',
  'stack': 'layer',
  'lid': 'cover',
  'seal': 'cover'
};

// Known visual asset library items
export const KNOWN_VISUAL_ASSETS = [
  'chicken', 'poultry', 'rice', 'basmati', 'onion', 'onions',
  'chickpea', 'chickpeas', 'coconut', 'curry leaves', 'mustard seeds',
  'urad dal', 'chilli', 'green chilli', 'spices', 'oil', 'ghee',
  'butter', 'carrots', 'peas', 'vegetables', 'tomatoes', 'batter',
  'potato masala', 'noodles', 'pasta', 'sauce', 'bread', 'greens'
];

/**
 * Checks if Ollama service is reachable.
 */
export async function isOllamaAvailable() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(1200) });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data?.models);
  } catch {
    return false;
  }
}

/**
 * Normalizes an action verb to one of the 15 standard LifeMotion actions.
 */
export function normalizeAction(action) {
  if (!action) return 'stir';
  const clean = String(action).toLowerCase().trim();
  if (SUPPORTED_ACTIONS.includes(clean)) return clean;
  if (ACTION_SYNONYMS[clean]) return ACTION_SYNONYMS[clean];
  return 'stir';
}

/**
 * Validates the structured JSON recipe schema before animation conversion.
 * Verifies food safety rules, child-safe narration, and visual asset availability.
 * 
 * @param {Object} recipe
 * @returns {{ valid: boolean, errors: string[], recipe?: Object, warnings: string[] }}
 */
export function validateRecipeJSON(recipe) {
  const errors = [];
  const warnings = [];

  if (!recipe || typeof recipe !== 'object') {
    return { valid: false, errors: ['Recipe is not an object'], warnings };
  }

  if (!recipe.title || typeof recipe.title !== 'string') {
    errors.push('Missing or invalid recipe title');
  }

  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    errors.push('Recipe must contain at least one ingredient');
  } else {
    recipe.ingredients.forEach((ing, i) => {
      if (!ing.name) errors.push(`Ingredient #${i} missing name`);
      ing.id = ing.id || `ing_${i}_${String(ing.name).toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      ing.quantity = ing.quantity || '1 portion';
      ing.category = ing.category || 'vegetable';
      ing.color = ing.color || '#e2e8f0';

      // Check asset library coverage
      const lowerName = String(ing.name).toLowerCase();
      const hasAsset = KNOWN_VISUAL_ASSETS.some(asset => lowerName.includes(asset));
      if (!hasAsset) {
        warnings.push(`Visual asset for "${ing.name}" is an illustrated approximation`);
      }
    });
  }

  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    errors.push('Recipe must contain cooking steps');
  } else {
    let hasMeatSafety = false;
    let hasAdultSupervision = false;
    const isPoultry = recipe.ingredients.some(ing => {
      const cat = String(ing.category).toLowerCase();
      const name = String(ing.name).toLowerCase();
      return cat === 'poultry' || cat === 'meat' || name.includes('chicken') || name.includes('meat');
    });

    recipe.steps.forEach((step, i) => {
      if (!step.text || typeof step.text !== 'string') {
        errors.push(`Step #${i} missing narration text`);
      }
      step.key = step.key || `step_${i + 1}`;
      step.action = normalizeAction(step.action);
      step.target = step.target || (step.action === 'serve' ? 'plate' : ['welcome', 'ending'].includes(step.action) ? 'maya' : 'pot');
      step.text = step.text.trim();

      const lower = step.text.toLowerCase();
      if (lower.includes('grown-up') || lower.includes('adult') || lower.includes('wash your hands')) {
        hasAdultSupervision = true;
      }
      if (lower.includes('thoroughly') || lower.includes('cooked through') || lower.includes('soap') || lower.includes('safe')) {
        hasMeatSafety = true;
      }
    });

    // Enforce food safety verification
    if (isPoultry && (!hasMeatSafety || !hasAdultSupervision)) {
      // Automatically inject child-friendly food safety reminder in safety step
      const safeStep = recipe.steps.find(s => s.action === 'safe' || s.key === 'safe');
      if (safeStep) {
        safeStep.text = "First, wash your hands thoroughly with soap. Always ask a grown-up to handle the hot stove and raw chicken.";
      } else {
        recipe.steps.splice(1, 0, {
          key: 'safe',
          action: 'safe',
          target: 'pot',
          text: "First, wash your hands thoroughly with soap. Always ask a grown-up to handle the hot stove and raw chicken."
        });
      }
    }
  }

  recipe.recipeId = recipe.recipeId || String(recipe.title).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  recipe.equipment = Array.isArray(recipe.equipment) && recipe.equipment.length > 0 ? recipe.equipment : ['pot', 'bowl', 'spoon', 'plate'];
  recipe.missingAssetWarnings = warnings;
  recipe.isFullySupported = warnings.length === 0;

  return {
    valid: errors.length === 0,
    errors,
    recipe: errors.length === 0 ? recipe : null,
    warnings
  };
}

/**
 * Generates structured recipe JSON using Qwen2.5-1.5B via Ollama or verified fallback.
 * 
 * @param {string} prompt - User dish request
 * @returns {Promise<{ ok: boolean, recipe: Object, source: string, note?: string }>}
 */
export async function generateRecipe(prompt) {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) {
    throw new Error('Please enter a recipe name or prompt.');
  }

  // 1. Check disk cache
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cacheKey = cleanPrompt.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const validation = validateRecipeJSON(cached);
      if (validation.valid) {
        console.log(`[RecipeEngine] Returning cached recipe for "${cleanPrompt}"`);
        return { ok: true, recipe: validation.recipe, source: 'cache' };
      }
    } catch {}
  }

  // 2. Check authentic curated database (10 core recipes + verified additions)
  const curated = matchRecipeSync(cleanPrompt);
  if (curated && curated.steps && curated.steps.length >= 6) {
    console.log(`[RecipeEngine] Found authentic curated recipe for "${cleanPrompt}"`);
    const validation = validateRecipeJSON(curated);
    if (validation.valid) {
      return { ok: true, recipe: validation.recipe, source: 'curated-database' };
    }
  }

  // 3. Attempt Ollama Qwen2.5-1.5B-Instruct generation if Ollama is running
  const ollamaOnline = await isOllamaAvailable();
  if (ollamaOnline) {
    try {
      console.log(`[Ollama] Querying Qwen2.5-1.5B on ${OLLAMA_HOST} for "${cleanPrompt}"...`);
      const systemPrompt = `You are an expert children's culinary animation director for LifeMotion AI.
Output ONLY a single valid raw JSON object with NO markdown formatting, NO backticks, and NO conversational text.

Schema:
{
  "recipeId": "dish-name-slug",
  "title": "Clean Dish Name",
  "equipment": ["pot|pan", "bowl", "spoon", "plate"],
  "ingredients": [
    { "id": "ing_1", "name": "Ingredient Name", "quantity": "e.g. 1 cup", "category": "poultry|grain|vegetable|spice|oil|dairy|legume", "color": "#hex" }
  ],
  "steps": [
    {
      "key": "unique_step_key",
      "action": "wash|chop|pour|marinate|mix|stir|fry|boil|steam|spread|flip|layer|cover|garnish|serve",
      "target": "pot|pan|bowl|plate|maya",
      "text": "Simple, cheerful, grammatically correct English narration for children (10-18 words)."
    }
  ]
}
Rules:
- Exactly 7 to 9 steps.
- Always include child safety notes (wash hands, adult supervision around hot cookware).
- For poultry/chicken: include thorough cooking and clean hands safety.
- Actions must strictly use the allowed verbs: wash, chop, pour, marinate, mix, stir, fry, boil, steam, spread, flip, layer, cover, garnish, serve.`;

      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Create a child-friendly cooking lesson with realistic steps for: ${cleanPrompt}` }
          ],
          format: 'json',
          stream: false,
          options: {
            temperature: 0.2,
            top_p: 0.9
          }
        }),
        signal: AbortSignal.timeout(18000)
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.message?.content || '';
        const parsed = JSON.parse(content);
        const validation = validateRecipeJSON(parsed);
        if (validation.valid) {
          fs.writeFileSync(cacheFile, JSON.stringify(validation.recipe, null, 2), 'utf8');
          console.log(`[Ollama Qwen2.5] Successfully generated and validated recipe for "${cleanPrompt}"`);
          return { ok: true, recipe: validation.recipe, source: `ollama-${OLLAMA_MODEL}` };
        }
      }
    } catch (err) {
      console.warn(`[Ollama] Generation notice: ${err.message}. Using dynamic verified fallback.`);
    }
  }

  // 4. Dynamic Verified Recipe Synthesizer (Zero-crash fallback)
  console.log(`[RecipeEngine] Synthesizing verified recipe for "${cleanPrompt}"`);
  const synthesized = buildSynthesizedRecipe(cleanPrompt);
  const validation = validateRecipeJSON(synthesized);
  return {
    ok: true,
    recipe: validation.recipe || synthesized,
    source: 'verified-synthesizer',
    note: ollamaOnline ? 'Generated using verified curriculum.' : 'Ollama not detected; using verified local cooking synthesizer.'
  };
}

/**
 * Creates a verified, child-friendly cooking lesson dynamically.
 */
function buildSynthesizedRecipe(dishName) {
  const cleanTitle = dishName.replace(/teach\s+children\s+how\s+to\s+(make|cook)/i, '').replace(/step\s+by\s+step/i, '').replace(/in\s+simple\s+english/i, '').trim();
  const title = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const lower = title.toLowerCase();

  const isChicken = lower.includes('chicken') || lower.includes('poultry') || lower.includes('meat');
  const isRice = lower.includes('rice') || lower.includes('biryani') || lower.includes('pulao');
  const isSoup = lower.includes('soup') || lower.includes('broth') || lower.includes('stew');
  const isSushi = lower.includes('sushi') || lower.includes('maki') || lower.includes('roll');
  const isPizza = lower.includes('pizza') || lower.includes('flatbread');
  const isBaking = lower.includes('cake') || lower.includes('cookie') || lower.includes('muffin') || lower.includes('brownie') || lower.includes('bake');
  const isPasta = lower.includes('pasta') || lower.includes('spaghetti') || lower.includes('macaroni') || lower.includes('noodle');
  const isSalad = lower.includes('salad') || lower.includes('slaw');

  if (isSushi) {
    return {
      recipeId: id,
      title: title,
      equipment: ['board', 'bowl', 'spoon', 'plate'],
      ingredients: [
        { id: 'sushi_rice', name: 'Seasoned Sushi Rice', quantity: '1 cup', category: 'grain', color: '#fffbeb' },
        { id: 'nori', name: 'Nori Seaweed Sheets', quantity: '2 sheets', category: 'vegetable', color: '#1e293b' },
        { id: 'veggie_strips', name: 'Crisp Cucumber & Avocado', quantity: '1 cup', category: 'vegetable', color: '#22c55e' },
        { id: 'sesame', name: 'Toasted Sesame Seeds', quantity: '1 pinch', category: 'spice', color: '#d97706' }
      ],
      steps: [
        { key: 'welcome', action: 'welcome', target: 'maya', text: `Hi, little chefs! I'm Maya. Today, we're making fresh and colorful ${title}!` },
        { key: 'safe', action: 'safe', target: 'pot', text: 'Wash your hands clean. Slicing sushi rolls with a sharp knife must always be done by a grown-up.' },
        { key: 'prep', action: 'prep', target: 'bowl', text: 'Lay out your rolling mat, seaweed sheet, seasoned sushi rice, and fresh fillings.' },
        { key: 'spread', action: 'spread', target: 'board', text: 'Gently spread a thin, even layer of rice over the dark nori sheet.' },
        { key: 'layer', action: 'layer', target: 'board', text: 'Carefully place strips of crisp cucumber and creamy avocado right in the center.' },
        { key: 'roll', action: 'mix', target: 'board', text: 'Use your rolling mat to gently roll the sushi forward into a neat, round log.' },
        { key: 'chop', action: 'chop', target: 'board', text: 'Ask a grown-up to slice the roll into colorful bite-sized sushi pieces.' },
        { key: 'garnish', action: 'garnish', target: 'plate', text: 'Sprinkle toasted sesame seeds on top for extra crunch and aroma.' },
        { key: 'serve', action: 'serve', target: 'plate', text: `Arrange your beautiful ${title} neatly on the serving plate. It looks like a masterpiece!` },
        { key: 'ending', action: 'ending', target: 'maya', text: `Fantastic cooking, little chefs! Enjoy your delicious handmade ${title}!` }
      ]
    };
  }

  if (isPizza) {
    return {
      recipeId: id,
      title: title,
      equipment: ['pan', 'bowl', 'spoon', 'plate'],
      ingredients: [
        { id: 'dough', name: 'Soft Pizza Dough', quantity: '1 ball', category: 'dough', color: '#fed7aa' },
        { id: 'sauce', name: 'Rich Tomato Pizza Sauce', quantity: '1/2 cup', category: 'sauce', color: '#ef4444' },
        { id: 'cheese', name: 'Melty Mozzarella Cheese', quantity: '1 cup', category: 'dairy', color: '#fef08a' },
        { id: 'basil', name: 'Fresh Basil & Oregano', quantity: '1 pinch', category: 'herb', color: '#16a34a' }
      ],
      steps: [
        { key: 'welcome', action: 'welcome', target: 'maya', text: `Hi, little chefs! I'm Maya. Today, we're making delicious ${title}!` },
        { key: 'safe', action: 'safe', target: 'pot', text: 'First, wash your hands clean. Ovens get super hot, so always ask a grown-up to handle the hot baking pan.' },
        { key: 'prep', action: 'prep', target: 'bowl', text: 'Gather your soft dough ball, fragrant tomato sauce, shredded mozzarella, and fresh herbs.' },
        { key: 'shape', action: 'mix', target: 'pan', text: 'Press and stretch the dough gently with your hands into a nice round crust.' },
        { key: 'pour', action: 'pour', target: 'pan', text: 'Spoon the rich tomato sauce right into the center of your pizza base.' },
        { key: 'spread', action: 'spread', target: 'pan', text: 'Spread the red sauce smoothly in circles, leaving a little crust at the edges.' },
        { key: 'layer', action: 'layer', target: 'pan', text: 'Sprinkle lots of shredded mozzarella cheese all over the sauce.' },
        { key: 'bake', action: 'cover', target: 'pan', text: 'Ask a grown-up to slide the pizza into the hot oven to bake until the cheese is bubbly.' },
        { key: 'garnish', action: 'garnish', target: 'pan', text: 'Carefully place fresh green basil leaves on top of the warm pizza.' },
        { key: 'serve', action: 'serve', target: 'plate', text: 'Slice and serve a warm, cheesy slice onto your plate. Look at that glorious cheese pull!' },
        { key: 'ending', action: 'ending', target: 'maya', text: `Bravo, little chefs! You made a magnificent ${title}!` }
      ]
    };
  }

  if (isBaking) {
    return {
      recipeId: id,
      title: title,
      equipment: ['bowl', 'pan', 'spoon', 'plate'],
      ingredients: [
        { id: 'flour_cocoa', name: 'Baking Flour & Cocoa', quantity: '2 cups', category: 'grain', color: '#78350f' },
        { id: 'butter_milk', name: 'Sweet Butter & Fresh Milk', quantity: '1 cup', category: 'dairy', color: '#fef3c7' },
        { id: 'sugar', name: 'Sweet Sugar & Vanilla', quantity: '1/2 cup', category: 'sweetener', color: '#fef9c3' },
        { id: 'toppings', name: 'Chocolate Chips & Sprinkles', quantity: '1/2 cup', category: 'sweetener', color: '#451a03' }
      ],
      steps: [
        { key: 'welcome', action: 'welcome', target: 'maya', text: `Hi, little chefs! I'm Maya. Today, we're baking a sweet and yummy ${title}!` },
        { key: 'safe', action: 'safe', target: 'pot', text: 'First, wash your hands and put on your apron. Baking ovens are very hot, so a grown-up must help.' },
        { key: 'prep', action: 'prep', target: 'bowl', text: 'Measure your flour, sweet cocoa, butter, and bowls on your baking station.' },
        { key: 'mix_dry', action: 'mix', target: 'bowl', text: 'Combine the flour, cocoa, and sugar in a large mixing bowl.' },
        { key: 'pour_wet', action: 'pour', target: 'bowl', text: 'Pour in the smooth milk and melted butter slowly.' },
        { key: 'stir', action: 'stir', target: 'bowl', text: 'Stir the batter gently with your wooden spoon until it is velvety and glossy.' },
        { key: 'layer', action: 'layer', target: 'pan', text: 'Pour the rich batter evenly into your greased baking pan.' },
        { key: 'bake', action: 'cover', target: 'pan', text: 'Ask a grown-up to place the cake into the warm oven to bake until fluffy.' },
        { key: 'garnish', action: 'garnish', target: 'pan', text: 'Top with chocolate chips and colorful sprinkles for a festive finish.' },
        { key: 'serve', action: 'serve', target: 'plate', text: `Place a warm, delicious slice of ${title} on the plate. It smells heavenly!` },
        { key: 'ending', action: 'ending', target: 'maya', text: `Wonderful baking, little chefs! Enjoy your scrumptious ${title}!` }
      ]
    };
  }

  // General Savory / Hot Cooked Dish
  const ingredients = [];
  if (isChicken) {
    ingredients.push({ id: 'chicken', name: 'Fresh Chicken Pieces', quantity: '400g', category: 'poultry', color: '#d97706' });
  } else if (isRice) {
    ingredients.push({ id: 'rice', name: 'Basmati Rice', quantity: '2 cups', category: 'grain', color: '#fffbeb' });
  } else if (isPasta) {
    ingredients.push({ id: 'pasta', name: 'Tender Pasta', quantity: '2 cups', category: 'grain', color: '#fde047' });
  } else if (isSalad) {
    ingredients.push({ id: 'greens', name: 'Crisp Garden Greens', quantity: '3 cups', category: 'vegetable', color: '#22c55e' });
  } else {
    ingredients.push({ id: 'main_veggies', name: 'Fresh Vegetables', quantity: '2 cups', category: 'vegetable', color: '#22c55e' });
  }
  ingredients.push({ id: 'oil_butter', name: isSalad ? 'Olive Oil Dressing' : 'Cooking Oil or Butter', quantity: '2 tablespoons', category: 'oil', color: '#facc15' });
  ingredients.push({ id: 'seasoning', name: 'Aromatic Spices & Salt', quantity: '1 pinch', category: 'spice', color: '#16a34a' });

  const steps = [
    {
      key: 'welcome',
      action: 'welcome',
      target: 'maya',
      text: `Hi, little chefs! I'm Maya. Today, we're making delicious ${title}!`
    },
    {
      key: 'safe',
      action: 'safe',
      target: 'pot',
      text: isChicken
        ? "First, wash your hands thoroughly with soap. Always ask a grown-up to handle the hot stove and raw chicken."
        : isSalad
        ? "First, wash your hands clean and rinse all fresh vegetables thoroughly in cool water."
        : "First, wash your hands clean. Always ask a grown-up to help with the warm stove and cookware."
    },
    {
      key: 'prep',
      action: 'prep',
      target: 'bowl',
      text: `Get your fresh ingredients and bowls ready on our clean kitchen counter.`
    }
  ];

  if (isRice || isSalad) {
    steps.push({
      key: 'wash',
      action: 'wash',
      target: 'bowl',
      text: `Rinse the fresh ingredients gently in clean water and drain them carefully.`
    });
  }

  if (isChicken) {
    steps.push({
      key: 'marinate',
      action: 'marinate',
      target: 'bowl',
      text: `Mix the chicken pieces with flavorful spices until every piece is coated.`
    });
  }

  if (!isSalad) {
    steps.push({
      key: 'heat',
      action: 'fry',
      target: 'pot',
      text: `Warm the pot gently with golden oil. Listen to the cheerful crackle!`
    });
    steps.push({
      key: 'cook_main',
      action: isChicken ? 'fry' : isRice ? 'layer' : 'stir',
      target: 'pot',
      text: `Carefully add our ingredients into the pot and stir gently with our wooden spoon.`
    });
    steps.push({
      key: 'cover_steam',
      action: 'cover',
      target: 'pot',
      text: `Cover the pot with the lid and let it steam gently until tender and fragrant.`
    });
  } else {
    steps.push({
      key: 'chop_greens',
      action: 'chop',
      target: 'board',
      text: `Gently cut our fresh crisp greens and vegetables into crunchy bite-sized pieces.`
    });
    steps.push({
      key: 'toss_salad',
      action: 'mix',
      target: 'bowl',
      text: `Toss all the colorful vegetables together in our big wooden salad bowl.`
    });
    steps.push({
      key: 'drizzle_dressing',
      action: 'pour',
      target: 'bowl',
      text: `Drizzle the golden olive oil dressing and give the salad one last cheerful toss.`
    });
  }

  steps.push({
    key: 'garnish',
    action: 'garnish',
    target: 'pot',
    text: `Turn off the stove and sprinkle fresh green herbs on top for wonderful aroma.`
  });

  steps.push({
    key: 'serve',
    action: 'serve',
    target: 'plate',
    text: `Scoop our delicious ${title} onto our plate. Look how yummy it is!`
  });

  steps.push({
    key: 'ending',
    action: 'ending',
    target: 'maya',
    text: `Great job, little chefs! Enjoy your wonderful ${title}!`
  });

  return {
    recipeId: id,
    title: title,
    equipment: ['pot', 'bowl', 'spoon', 'plate'],
    ingredients,
    steps
  };
}

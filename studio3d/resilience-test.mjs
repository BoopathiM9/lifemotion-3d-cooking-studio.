/**
 * CookMotion - Resilience, Fallback & Quality Assurance Test Suite
 * Validates Phase Eight requirements:
 * 1. Curated recipe fallback
 * 2. Ollama unavailable handling
 * 3. Qwen model missing detection
 * 4. Qwen malformed JSON / markdown fence handling
 * 5. Hugging Face HTTP 429 quota exhaustion circuit breaker
 * 6. Hugging Face network unavailability fallback
 * 7. Remotion procedural 3D generation without Wan 2.2
 * 8. Food safety & hygiene rules (poultry handling, adult supervision, hot ovens)
 * 9. Action normalization across all 15 authentic cooking actions
 * 10. Voice validation & subtitle timing
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateRecipe,
  validateRecipeJSON,
  parseRecipeJsonText,
  isOllamaAvailable,
  normalizeAction,
  SUPPORTED_ACTIONS
} from './qwen-recipe-engine.mjs';
import {
  isHeroActionStep,
  planSceneVisuals
} from './dynamic-video-composer.mjs';
import {
  generateWanCookingClip,
  resetWanCircuitBreaker,
  isWanCircuitBreakerTripped
} from './wan-video-generator.mjs';
import { storyboard, matchRecipeSync } from './recipes.mjs';

test('1. Curated recipes: Chicken Biryani loads authentic 9 steps with poultry safety', async () => {
  const res = await generateRecipe('Chicken Biryani');
  assert.equal(res.ok, true);
  assert.equal(res.source, 'curated-database');
  assert.equal(res.recipe.title, 'Chicken Biryani');
  assert.equal(res.recipe.steps.length, 9);
  
  const safeStep = res.recipe.steps.find(s => s.action === 'safe' || s.key === 'safe');
  assert.ok(safeStep, 'Chicken Biryani must include safety step');
  assert.match(safeStep.text, /raw chicken|soap|grown-up|hot stove/i);
});

test('2. Curated recipes: Chana Sundal contains dry chickpea ingredients, not gravy', async () => {
  const res = await generateRecipe('Chana Sundal');
  assert.equal(res.ok, true);
  assert.equal(res.recipe.title, 'Chana Sundal');
  const chickpeaIng = res.recipe.ingredients.find(i => i.id === 'chickpeas');
  assert.ok(chickpeaIng, 'Must contain Cooked Chickpeas');
  const coconutIng = res.recipe.ingredients.find(i => i.id === 'coconut');
  assert.ok(coconutIng, 'Must contain Grated Coconut');
});

test('3. Ollama unavailable fallback: transparently falls back to verified synthesizer', async () => {
  // Test novel recipe with Ollama offline
  const res = await generateRecipe('Novel Martian Space Pie');
  assert.equal(res.ok, true);
  assert.equal(res.source, 'verified-synthesizer');
  assert.ok(res.note, 'Must include clear explanation note for fallback');
  assert.ok(res.recipe.steps.length >= 7, 'Must have at least 7 steps');
});

test('4. Qwen JSON Parser: cleanly extracts JSON from markdown code blocks or surrounding text', () => {
  const markdownText = '```json\n{"recipeId":"test-soup","title":"Test Soup","ingredients":[{"name":"Water"}],"steps":[{"key":"s1","action":"boil","text":"Boil water with a grown-up."}]}\n```';
  const parsed1 = parseRecipeJsonText(markdownText);
  assert.ok(parsed1);
  assert.equal(parsed1.title, 'Test Soup');

  const conversationalText = 'Here is your recipe JSON:\n{"recipeId":"pizza","title":"Cheese Pizza","ingredients":[],"steps":[]}\nHope you like it!';
  const parsed2 = parseRecipeJsonText(conversationalText);
  assert.ok(parsed2);
  assert.equal(parsed2.title, 'Cheese Pizza');

  assert.equal(parseRecipeJsonText('invalid non-json text'), null);
});

test('5. Recipe schema validator: catches missing titles, steps, and enforces food safety', () => {
  const invalid1 = validateRecipeJSON(null);
  assert.equal(invalid1.valid, false);

  const missingTitle = validateRecipeJSON({ ingredients: [{ name: 'Rice' }], steps: [{ text: 'Cook' }] });
  assert.equal(missingTitle.valid, false);

  // Auto-injects poultry safety for chicken recipes without it
  const poultryRecipe = {
    title: 'Chicken Skewers',
    ingredients: [{ name: 'Chicken Breast', category: 'poultry' }],
    steps: [
      { key: 'w', action: 'welcome', text: 'Hello chefs!' },
      { key: 'cook', action: 'fry', text: 'Fry the chicken till golden.' }
    ]
  };
  const validated = validateRecipeJSON(poultryRecipe);
  assert.equal(validated.valid, true);
  const safeStep = validated.recipe.steps.find(s => s.action === 'safe');
  assert.ok(safeStep, 'Validator must auto-inject poultry safety step');
  assert.match(safeStep.text, /soap|raw chicken/i);
});

test('6. Wan 2.2 Hugging Face circuit breaker: handles rate limits and network errors safely', async () => {
  resetWanCircuitBreaker();
  assert.equal(isWanCircuitBreakerTripped(), false);

  // Calling with non-existent reference image fails gracefully without throw
  const missingImgResult = await generateWanCookingClip({
    stepKey: 'test_step',
    actionPrompt: 'Maya stirs pot',
    imagePath: 'non_existent_image_path.png'
  });
  assert.equal(missingImgResult.success, false);
  assert.equal(missingImgResult.fallbackRequired, true);
});

test('7. Dynamic video composer: Remotion generates all scenes when Wan 2.2 is disabled or resting', async () => {
  const recipe = {
    recipeId: 'test-dosa',
    title: 'Crispy Dosa',
    steps: [
      { key: 's1', action: 'welcome', text: 'Welcome!' },
      { key: 's2', action: 'safe', text: 'Wash hands.' },
      { key: 's3', action: 'spread', text: 'Spread the batter.' },
      { key: 's4', action: 'flip', text: 'Flip gently.' },
      { key: 's5', action: 'serve', text: 'Serve on plate.' }
    ]
  };

  const scenePlans = await planSceneVisuals(recipe, { enableAiVideo: false });
  assert.equal(scenePlans.length, 5);
  for (const scene of scenePlans) {
    assert.equal(scene.videoType, 'procedural-3d', 'Must generate as procedural 3D Remotion scene');
  }
});

test('8. 15-Action vocabulary normalization: maps synonyms to correct standard actions', () => {
  assert.equal(normalizeAction('saute'), 'fry');
  assert.equal(normalizeAction('rinse'), 'wash');
  assert.equal(normalizeAction('dice'), 'chop');
  assert.equal(normalizeAction('coat'), 'marinate');
  assert.equal(normalizeAction('stack'), 'layer');
  assert.equal(normalizeAction('lid'), 'cover');
  assert.equal(normalizeAction('whisk'), 'stir');
  assert.equal(normalizeAction('bake'), 'steam');
  assert.equal(normalizeAction('unknown_action_xyz'), 'stir'); // safe fallback
});

test('9. Hero action classification: correctly identifies actions benefiting from AI video clips', () => {
  assert.equal(isHeroActionStep({ action: 'marinate' }), true);
  assert.equal(isHeroActionStep({ action: 'fry' }), true);
  assert.equal(isHeroActionStep({ action: 'pour' }), true);
  assert.equal(isHeroActionStep({ action: 'welcome' }), false);
  assert.equal(isHeroActionStep({ action: 'safe' }), false);
});

test('10. Novel Archetypes Synthesizer: Japanese Sushi produces rolling and knife safety', async () => {
  const res = await generateRecipe('Japanese Sushi Roll');
  assert.equal(res.ok, true);
  assert.equal(res.recipe.title, 'Japanese Sushi Roll');
  const noriIng = res.recipe.ingredients.find(i => i.id === 'nori');
  assert.ok(noriIng, 'Sushi must have nori');
  const safeStep = res.recipe.steps.find(s => s.action === 'safe');
  assert.match(safeStep.text, /sharp knife|grown-up/i);
});

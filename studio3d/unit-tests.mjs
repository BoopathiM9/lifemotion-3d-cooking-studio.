/**
 * LifeMotion Cooking Studio
 * Comprehensive Unit Test Suite for Generic Cooking Engine
 */

import assert from 'node:assert/strict';
import {
  validateRecipePlan,
  createUnknownFood,
  hashString,
  cleanRecipeTitle,
  extractSentences,
  parseInstructionsToPlan
} from './recipe-planner.mjs';
import { normalizeActionVerb, buildVisualPlan, VISUAL_ACTIONS } from './visual-plan.mjs';
import { storyboard, recipes, voices } from './recipes.mjs';
import { translateActionsWithLocalTamil } from './free-recipe-lookup.mjs';

console.log('=== STARTING UNIT TESTS ===\n');

// 1. Action Normalization Tests
console.log('Testing Action Normalization...');
assert.equal(normalizeActionVerb('stir'), 'stir');
assert.equal(normalizeActionVerb('whisk'), 'stir');
assert.equal(normalizeActionVerb('drop into'), 'add');
assert.equal(normalizeActionVerb('combine'), 'mix');
assert.equal(normalizeActionVerb('drizzle'), 'pour');
assert.equal(normalizeActionVerb('simmer'), 'simmer');
assert.equal(normalizeActionVerb('transfer to plate'), 'serve');
assert.equal(normalizeActionVerb('random-unknown-verb'), 'cook');
console.log('✔ Action normalization passed.');

// 2. Unknown Ingredient Fallback Tests (Deterministic Hashing)
console.log('Testing Unknown Ingredient Fallback...');
const unk1 = createUnknownFood('dragonfruit');
const unk2 = createUnknownFood('dragonfruit');
const unk3 = createUnknownFood('Martian Blue Moss');
assert.equal(unk1.name, 'dragonfruit');
assert.equal(unk1.color, unk2.color, 'Same ingredient must have deterministic color');
assert.equal(unk1.category, unk2.category, 'Same ingredient must have deterministic category');
assert.ok(unk3.id.includes('martian-blue-moss'));
console.log('✔ Unknown ingredient fallback passed.');

// 3. Unknown Recipe Fallback Tests
console.log('Testing Unknown Recipe Fallback...');
const unknownRecipe = storyboard({ prompt: 'Make Galactic Space Crunch' });
assert.ok(unknownRecipe.genericVisualization, 'Unknown recipe must be marked as genericVisualization');
assert.ok(unknownRecipe.uncertaintyNote.includes('Generic cooking visualization'));
assert.equal(unknownRecipe.primaryEquipment, 'pot');
assert.ok(unknownRecipe.actions.length >= 6);
assert.equal(unknownRecipe.title, 'Galactic Space Crunch');
const shortUnknown = storyboard({ prompt: 'Teach children how to make avocado toast step by step in simple English.' });
assert.equal(shortUnknown.title, 'Avocado toast');
assert.ok(shortUnknown.actions.length >= 6, 'A dish name alone must create a complete local video plan');
const naturalUnknown = storyboard({ prompt: 'Make a cheerful 3D cartoon cooking video where MAYA makes avocado toast in simple English.' });
assert.equal(naturalUnknown.title, 'Avocado toast');
console.log('✔ Unknown recipe fallback passed.');

// 4. RecipePlan Validation Tests
console.log('Testing RecipePlan Validation...');
assert.throws(() => validateRecipePlan(null), /valid object/);
assert.throws(() => validateRecipePlan({ title: 'Test', steps: [] }), /at least one cooking step/);
const validPlan = validateRecipePlan({
  title: 'Simple Tea',
  primaryEquipment: 'pot',
  steps: [{ key: 'boil', action: 'boil', target: 'pot', text: 'Boil water.' }]
});
assert.equal(validPlan.title, 'Simple Tea');
assert.equal(validPlan.steps[validPlan.steps.length - 1].action, 'serve', 'Must guarantee serving step at end');
const tamilFallback = translateActionsWithLocalTamil(unknownRecipe.actions, unknownRecipe.title);
assert.equal(tamilFallback.length, unknownRecipe.actions.length);
assert.ok(tamilFallback.every(line => /[\u0B80-\u0BFF]/.test(line)), 'Every fallback line must contain Tamil text');
console.log('✔ RecipePlan validation passed.');

// 5. Core Test Recipes Verification (Prompt-to-Plan Accuracy)
console.log('Testing Recipe Plans for Core Recipes...');
const testDishes = [
  { prompt: 'Make chicken biryani', expectedEquip: 'pot', keyIng: 'Chicken Pieces' },
  { prompt: 'Make tomato pasta', expectedEquip: 'pot', keyIng: 'Pasta' },
  { prompt: 'Make vegetable fried rice', expectedEquip: 'wok', keyIng: 'Steamed Rice' },
  { prompt: 'Make masala dosa', expectedEquip: 'pan', keyIng: 'Dosa Batter' },
  { prompt: 'Make fluffy pancakes', expectedEquip: 'pan', keyIng: 'Pancake Batter' },
  { prompt: 'Make vegetable sandwich', expectedEquip: 'board', keyIng: 'Soft Bread' },
  { prompt: 'Make stir-fried noodles', expectedEquip: 'wok', keyIng: 'Noodles' },
  { prompt: 'Make soft chapati', expectedEquip: 'pan', keyIng: 'Wheat Dough' },
  { prompt: 'Make garden vegetable soup', expectedEquip: 'pot', keyIng: 'Garden Veggies' },
  { prompt: 'Make rainbow salad', expectedEquip: 'bowl', keyIng: 'Crisp Lettuce' }
];

for (const { prompt, expectedEquip, keyIng } of testDishes) {
  const p = storyboard({ prompt });
  assert.equal(p.primaryEquipment, expectedEquip, `${prompt} must use ${expectedEquip}`);
  assert.ok(
    p.ingredients.some(i => i.name.toLowerCase().includes(keyIng.toLowerCase())),
    `${prompt} must include ingredient ${keyIng}`
  );
  assert.ok(p.actions.length >= 6, `${prompt} must have complete actions`);
}
console.log('✔ All 10 core recipe visual plans verified.');

// 6. User-Supplied Cooking Instructions Parsing Test
console.log('Testing User-Supplied Instructions Parsing...');
const customInstructions = `
Chef Maya teaches kids how to make Lemonade.
Squeeze fresh yellow lemons into a large bowl.
Pour sweet cool water into the bowl.
Add golden honey into the bowl.
Stir gently with a spoon to blend the sweet flavors.
Pour the refreshing lemonade into cups and enjoy.
`;
const customPlan = storyboard({ prompt: customInstructions });
assert.equal(customPlan.title, 'Lemonade');
assert.ok(customPlan.actions.some(a => a.action === 'pour'));
assert.ok(customPlan.actions.some(a => a.action === 'add'));
assert.ok(customPlan.actions.some(a => a.action === 'mix'));
assert.ok(customPlan.actions.some(a => a.action === 'serve'));
console.log('✔ User instructions parsing passed.');

// 7. Input Validation & Error Handling
console.log('Testing Input Validation...');
assert.throws(() => storyboard({ prompt: '' }), /Enter a recipe prompt/);
assert.throws(() => storyboard({ prompt: 'Make dosa', voice: 'unsupported-voice' }), /Choose an available narration voice/);
assert.throws(() => storyboard({ prompt: 'Make dosa', format: '4:3' }), /Choose 16:9 or 9:16/);
console.log('✔ Input validation passed.');

console.log('\n=== ALL UNIT TESTS PASSED SUCCESSFULLY! ===');

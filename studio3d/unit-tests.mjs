/**
 * LifeMotion 3D Cooking Studio
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
import { createCookware, createUtensil, ANCHORS } from './equipment-factory.mjs';
import { createIngredientMesh, createMaterial, transitionIngredientState } from './ingredient-factory.mjs';
import { animateAction } from './action-engine.mjs';

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
console.log('✔ RecipePlan validation passed.');

// 5. Equipment Factory & Anchors Tests
console.log('Testing Equipment Factory...');
assert.ok(ANCHORS.COOKING_CENTER);
assert.ok(ANCHORS.SERVING_CENTER);
for (const type of ['pan', 'pot', 'wok', 'saucepan', 'bowl', 'plate', 'board']) {
  const eq = createCookware(type);
  assert.equal(eq.name, `equipment_${type}`);
}
for (const u of ['spoon', 'ladle', 'spatula', 'knife', 'rolling pin']) {
  const ut = createUtensil(u);
  assert.equal(ut.name, `utensil_${u}`);
}
console.log('✔ Equipment factory passed.');

// 6. Ingredient Factory Tests
console.log('Testing Ingredient Factory...');
const categories = ['grain', 'protein', 'vegetable', 'liquid', 'dough', 'batter', 'pasta', 'noodle', 'bread', 'cheese', 'herb'];
for (const cat of categories) {
  const mesh = createIngredientMesh({ id: cat, name: cat, category: cat, state: 'raw', color: '#e0a96d' });
  assert.ok(mesh, `Mesh for category ${cat} must be created`);
  assert.equal(mesh.name, `ing_${cat}`);
}
console.log('✔ Ingredient factory passed.');

// 7. Core Test Recipes Verification (Prompt-to-Plan Accuracy)
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

// 8. User-Supplied Cooking Instructions Parsing Test
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

// 9. Input Validation & Error Handling
console.log('Testing Input Validation...');
assert.throws(() => storyboard({ prompt: '' }), /Enter a recipe prompt/);
assert.throws(() => storyboard({ prompt: 'Make dosa', voice: 'unsupported-voice' }), /Choose an available English voice/);
assert.throws(() => storyboard({ prompt: 'Make dosa', format: '4:3' }), /Choose 16:9 or 9:16/);
console.log('✔ Input validation passed.');

console.log('\n=== ALL UNIT TESTS PASSED SUCCESSFULLY! ===');

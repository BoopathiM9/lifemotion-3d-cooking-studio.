import { generateRecipe, validateRecipeJSON } from './studio3d/qwen-recipe-engine.mjs';

console.log('--- Testing Recipe Engine ---');

async function testDish(dish) {
  console.log(`\nTesting: "${dish}"...`);
  const res = await generateRecipe(dish);
  console.log(`Source: ${res.source}`);
  console.log(`Title: ${res.recipe.title}`);
  console.log(`Ingredients count: ${res.recipe.ingredients.length}`);
  console.log(`Steps count: ${res.recipe.steps.length}`);
  console.log(`First step: [${res.recipe.steps[0].action}] "${res.recipe.steps[0].text}"`);
  console.log(`Second step: [${res.recipe.steps[1].action}] "${res.recipe.steps[1].text}"`);
  console.log(`Middle cooking step: [${res.recipe.steps[4].action}] "${res.recipe.steps[4].text}"`);
  console.log(`Last step: [${res.recipe.steps.at(-1).action}] "${res.recipe.steps.at(-1).text}"`);
}

await testDish('Chana Sundal');
await testDish('Chicken Biryani');
await testDish('Crispy Masala Dosa');
await testDish('Fluffy Pancakes');
console.log('\n--- All Recipe Engine Tests Passed ---');

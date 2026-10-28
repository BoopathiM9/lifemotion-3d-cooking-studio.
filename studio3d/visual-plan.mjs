/**
 * LifeMotion Cooking Studio
 * Visual Plan & Action Vocabulary Normalization Layer
 */

import { extractSentences } from './recipe-planner.mjs';

/**
 * Standard Visual Action Vocabulary.
 */
export const VISUAL_ACTIONS = [
  'show', 'pick', 'place', 'add', 'pour', 'sprinkle', 'spread',
  'stir', 'mix', 'toss', 'boil', 'simmer', 'fry', 'saute', 'cook',
  'flip', 'layer', 'cover', 'uncover', 'chop', 'slice', 'knead',
  'roll', 'shape', 'transfer', 'plate', 'serve', 'wait'
];

/**
 * Normalizes any natural language action verb to the closest standard action.
 * Unknown actions map gracefully to the closest generic cooking action, never to hardcoded dosa.
 * @param {string} rawVerb
 * @returns {string} Normalized action verb
 */
export function normalizeActionVerb(rawVerb = '') {
  const v = rawVerb.trim().toLowerCase();

  if (VISUAL_ACTIONS.includes(v)) {
    return v;
  }

  // Synonyms & verb mappings
  if (['display', 'present', 'look', 'greet', 'welcome'].includes(v)) return 'show';
  if (['take', 'lift', 'grab', 'hold'].includes(v)) return 'pick';
  if (['put into', 'drop into', 'put', 'drop', 'set', 'insert'].includes(v)) return 'add';
  if (['tip', 'tumble', 'dump'].includes(v)) return 'add';
  if (['pour', 'stream', 'drizzle', 'splash', 'flow'].includes(v)) return 'pour';
  if (['dust', 'season', 'scatter', 'garnish'].includes(v)) return 'sprinkle';
  if (['smear', 'flatten', 'smooth'].includes(v)) return 'spread';
  if (['whisk', 'beat', 'swirl', 'churn'].includes(v)) return 'stir';
  if (['stir together', 'combine', 'mix well', 'blend', 'fold-in', 'merge'].includes(v)) return 'mix';
  if (['shake', 'toss-up'].includes(v)) return 'toss';
  if (['bubble', 'scald', 'poach'].includes(v)) return 'boil';
  if (['braise', 'stew', 'gentle-cook'].includes(v)) return 'simmer';
  if (['deep-fry', 'crisp'].includes(v)) return 'fry';
  if (['pan-fry', 'sear', 'brown'].includes(v)) return 'saute';
  if (['heat', 'warm', 'roast', 'bake'].includes(v)) return 'cook';
  if (['turn', 'reverse', 'invert'].includes(v)) return 'flip';
  if (['stack', 'tier', 'arrange'].includes(v)) return 'layer';
  if (['lid', 'cap', 'close'].includes(v)) return 'cover';
  if (['open', 'reveal'].includes(v)) return 'uncover';
  if (['cut', 'dice', 'mince'].includes(v)) return 'chop';
  if (['carve', 'shave'].includes(v)) return 'slice';
  if (['press', 'massage', 'work'].includes(v)) return 'knead';
  if (['flatten-dough', 'pin'].includes(v)) return 'roll';
  if (['form', 'mold', 'ball'].includes(v)) return 'shape';
  if (['move', 'shift'].includes(v)) return 'transfer';
  if (['dish', 'dish-out'].includes(v)) return 'plate';
  if (['present-dish', 'enjoy', 'finish', 'transfer to plate', 'place on plate', 'transfer to serving dish'].includes(v)) return 'serve';
  if (v.includes('to plate') || v.includes('serving dish')) return 'serve';
  if (['rest', 'cool', 'pause'].includes(v)) return 'wait';

  // Graceful fallback to neutral cooking action
  return 'cook';
}

/**
 * Builds the visual plan from a validated RecipePlan.
 * Produces the exact structure needed by narrate.py and the Remotion renderer.
 * @param {any} recipePlan
 * @returns {any} Complete visual plan
 */
export function buildVisualPlan(recipePlan) {
  const actions = recipePlan.steps.map((step, idx) => {
    const normAction = normalizeActionVerb(step.action);
    const sentences = extractSentences(step.text);

    return {
      key: step.key || `step_${idx}`,
      action: normAction,
      ingredient: step.ingredient,
      source: step.source || (normAction === 'serve' ? recipePlan.primaryEquipment : 'bowl'),
      target: step.target || (normAction === 'serve' ? 'plate' : recipePlan.primaryEquipment),
      text: step.text,
      sentences: sentences.length > 0 ? sentences : [step.text]
    };
  });

  return {
    ...recipePlan,
    recipe: recipePlan.recipeId || recipePlan.recipe,
    actions,
    limitations: recipePlan.genericVisualization
      ? 'Generic cooking visualization. Ingredients and cookware are illustrated approximations.'
      : 'Authentic procedural cooking plan animated with Remotion.'
  };
}

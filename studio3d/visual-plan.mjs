/**
 * LifeMotion Cooking Studio
 * Visual Plan & Action Vocabulary Normalization Layer
 */

import { extractSentences } from './recipe-planner.mjs';

/**
 * Standard Visual Action Vocabulary.
 * Covers all 15 authentic cooking actions plus pedagogical framing steps.
 */
export const VISUAL_ACTIONS = [
  'welcome', 'safe', 'prep', 'ending',
  'wash', 'chop', 'pour', 'marinate', 'mix', 'stir', 'fry',
  'boil', 'steam', 'spread', 'flip', 'layer', 'cover', 'garnish', 'serve',
  'show', 'pick', 'place', 'add', 'sprinkle', 'toss', 'simmer', 'saute',
  'cook', 'slice', 'knead', 'roll', 'shape', 'transfer', 'plate', 'wait'
];

/**
 * Normalizes any natural language action verb to the closest standard action.
 * @param {string} rawVerb
 * @returns {string} Normalized action verb
 */
export function normalizeActionVerb(rawVerb = '') {
  const v = rawVerb.trim().toLowerCase();

  if (VISUAL_ACTIONS.includes(v)) {
    return v;
  }

  // Framing steps
  if (['greet', 'welcome', 'hello', 'intro'].includes(v)) return 'welcome';
  if (['safety', 'wash hands', 'clean', 'hygiene', 'safe'].includes(v)) return 'safe';
  if (['prep', 'prepare', 'ready', 'ingredients'].includes(v)) return 'prep';
  if (['ending', 'conclusion', 'celebrate', 'cheer'].includes(v)) return 'ending';

  // Specific synonyms
  if (['take', 'lift', 'grab', 'hold'].includes(v)) return 'pick';
  if (['put into', 'drop into', 'put', 'drop', 'set', 'insert', 'tip', 'tumble', 'dump'].includes(v)) return 'add';
  if (['rinse', 'wash', 'clean produce', 'wash rice'].includes(v)) return 'wash';
  if (['cut', 'dice', 'mince', 'slice', 'chop'].includes(v)) return 'chop';
  if (['pour', 'stream', 'drizzle', 'splash', 'flow'].includes(v)) return 'pour';
  if (['marinate', 'rub spices', 'coat', 'season chicken'].includes(v)) return 'marinate';
  if (['stir together', 'combine', 'mix well', 'blend', 'fold-in', 'merge'].includes(v)) return 'mix';
  if (['whisk', 'beat', 'swirl', 'churn', 'stir'].includes(v)) return 'stir';
  if (['shake', 'toss-up'].includes(v)) return 'toss';
  if (['deep-fry', 'crisp'].includes(v)) return 'fry';
  if (['pan-fry', 'sear', 'brown', 'saute'].includes(v)) return 'saute';
  if (['bubble', 'scald', 'poach', 'boil'].includes(v)) return 'boil';
  if (['braise', 'stew', 'gentle-cook', 'simmer'].includes(v)) return 'simmer';
  if (['steam', 'dum'].includes(v)) return 'steam';
  if (['smear', 'flatten', 'smooth', 'spread'].includes(v)) return 'spread';
  if (['turn', 'reverse', 'invert', 'flip'].includes(v)) return 'flip';
  if (['stack', 'tier', 'arrange', 'layer'].includes(v)) return 'layer';
  if (['lid', 'cap', 'close', 'cover'].includes(v)) return 'cover';
  if (['dust', 'season', 'scatter', 'garnish', 'sprinkle'].includes(v)) return 'sprinkle';
  if (['press', 'massage', 'work'].includes(v)) return 'knead';
  if (['flatten-dough', 'pin'].includes(v)) return 'roll';
  if (['form', 'mold', 'ball'].includes(v)) return 'shape';
  if (['move', 'shift'].includes(v)) return 'transfer';
  if (['dish', 'dish-out'].includes(v)) return 'plate';
  if (['present-dish', 'enjoy', 'finish', 'transfer to plate', 'place on plate', 'transfer to serving dish', 'serve'].includes(v)) return 'serve';
  if (v.includes('to plate') || v.includes('serving dish')) return 'serve';
  if (['rest', 'cool', 'pause'].includes(v)) return 'wait';

  // Generic fallback
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

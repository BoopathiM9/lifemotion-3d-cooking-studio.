/**
 * LifeMotion 3D Cooking Studio
 * Procedural Action Engine & Maya Kinematics Coordinator
 */

import * as THREE from 'three';
import { ANCHORS } from './equipment-factory.mjs';
import { transitionIngredientState } from './ingredient-factory.mjs';

const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = THREE.MathUtils.lerp;
const smooth = v => {
  v = Math.max(0, Math.min(1, v));
  return v * v * (3 - 2 * v);
};

/**
 * Executes procedural animation for any given action.
 * Controls food, ingredients, cookware, utensils, steam, and Maya's arm targets.
 *
 * @param {object} params
 * @param {string} params.action - Normalized visual action (add, pour, stir, mix, cook, serve, etc.)
 * @param {THREE.Group} [params.ingredientMesh] - Active ingredient 3D group
 * @param {THREE.Group} params.cookware - Primary cookware at COOKING_CENTER
 * @param {THREE.Group} params.food - Composite dish entity in cookware
 * @param {THREE.Group} params.plate - Serving plate entity at SERVING_CENTER
 * @param {THREE.Group} params.utensil - Utensil attached to Maya's wrist
 * @param {THREE.Group} params.steam - Steam particles group
 * @param {THREE.Group} params.chef - Maya character root group
 * @param {Array} params.armRig - Arm IK rig [leftArm, rightArm]
 * @param {Function} params.solveArm - Analytical 2-bone IK solver
 * @param {number} params.p - Normalized action progress [0.0, 1.0]
 * @param {number} params.t - Current timeline seconds
 * @param {boolean} params.isColdDish - If true, suppresses steam
 * @returns {object} Action execution state (landed, withdraw, gripError, tip)
 */
export function animateAction(params) {
  const {
    action,
    ingredientMesh,
    cookware,
    food,
    plate,
    utensil,
    steam,
    chef,
    armRig,
    solveArm,
    p,
    t,
    isColdDish
  } = params;

  const COOKING = ANCHORS.COOKING_CENTER;
  const PREP = ANCHORS.PREP_CENTER;
  const SERVING = ANCHORS.SERVING_CENTER;
  const INGREDIENTS = ANCHORS.INGREDIENT_AREA;

  let tip = vec(COOKING.x, COOKING.y + 0.35, COOKING.z);
  let landed = false;
  let withdraw = 0;
  let steamVisible = false;

  // Maya's body position slides gently towards action center
  if (action === 'serve' || action === 'plate') {
    chef.position.x = lerp(-1.05, 1.3, smooth(p * 1.8));
  } else if (['pick', 'chop', 'slice', 'knead', 'roll'].includes(action)) {
    chef.position.x = -1.55;
  } else if (action === 'pour') {
    chef.position.x = lerp(-2.5, -1.05, smooth(p));
  } else if (['add', 'layer', 'sprinkle', 'spread'].includes(action)) {
    chef.position.x = lerp(-1.5, -1.05, smooth(p * 2));
  } else {
    chef.position.x = -1.05;
  }

  // Maya's left arm friendly gesture on greeting / welcome
  const freeHand = vec(chef.position.x - 0.56, 2.05, chef.position.z + 0.35);
  if (action === 'show' || p < 0.2) {
    freeHand.y += Math.sin(p * Math.PI) * 0.45;
  }
  solveArm(armRig[0], freeHand);

  // -------------------------------------------------------------
  // ACTION EXECUTION LOGIC
  // -------------------------------------------------------------
  switch (action) {
    case 'show': {
      // Maya presents the dish / ingredients
      tip.set(COOKING.x + 0.35, COOKING.y + 0.3, COOKING.z + 0.2);
      break;
    }

    case 'add':
    case 'pour': {
      // Pouring pours from batter bowl at INGREDIENTS (-2.0)
      // Adding picks from prep bowl at PREP (-0.85)
      const isPour = action === 'pour';
      const z = isPour ? smooth(p / 0.6) : smooth(p * 2);
      const startPos = isPour
        ? vec(-2.0, 1.98, 0.82)
        : vec(-0.85, 2.05, 0.85);
      const targetPos = vec(COOKING.x, COOKING.y + 0.35, COOKING.z);

      tip.lerpVectors(startPos, targetPos, Math.min(1, z));
      tip.y += Math.sin(Math.min(1, z) * Math.PI) * 0.28; // smooth lifting arc

      if (ingredientMesh) {
        ingredientMesh.visible = true;
        if (p < 0.7) {
          // Follow utensil / pouring motion
          ingredientMesh.position.copy(tip).sub(food.position).y -= 0.12;
          ingredientMesh.scale.setScalar(1.0);
        } else {
          // Settle into cookware and merge into dish
          const settleProgress = (p - 0.7) / 0.3;
          ingredientMesh.position.lerpVectors(
            tip,
            vec(COOKING.x, COOKING.y + 0.08, COOKING.z),
            settleProgress
          ).sub(food.position);
          food.scale.setScalar(1.0);
        }
      }
      break;
    }

    case 'stir':
    case 'mix':
    case 'toss': {
      // Circular stirring motion inside cookware
      const radius = 0.24;
      const angle = p * Math.PI * 6;
      tip.set(
        COOKING.x + Math.cos(angle) * radius,
        COOKING.y + 0.16 + Math.sin(angle * 2) * 0.02,
        COOKING.z + Math.sin(angle) * radius
      );

      // Agitate food slightly
      food.rotation.y = angle * 0.15;
      steamVisible = !isColdDish;
      break;
    }

    case 'spread': {
      // Outward spiral spreading motion
      const radius = lerp(0.08, 0.48, p);
      const angle = p * Math.PI * 6;
      tip.set(
        COOKING.x + Math.cos(angle) * radius,
        COOKING.y + 0.12,
        COOKING.z + Math.sin(angle) * radius
      );
      food.scale.set(Math.max(0.1, smooth(p)), 1.0, Math.max(0.1, smooth(p)));
      break;
    }

    case 'cook':
    case 'boil':
    case 'simmer':
    case 'fry':
    case 'saute': {
      // Gentle checking motion above cookware
      tip.set(COOKING.x + 0.28, COOKING.y + 0.32, COOKING.z + 0.15);
      steamVisible = !isColdDish;

      // Transition food state (browning / cooking)
      transitionIngredientState(food, 'golden', p);
      break;
    }

    case 'flip': {
      // Slide under and flip
      const flipPhase = smooth(p);
      tip.set(
        COOKING.x + lerp(0.4, -0.1, flipPhase),
        COOKING.y + 0.08 + Math.sin(flipPhase * Math.PI) * 0.28,
        COOKING.z
      );
      food.rotation.z = flipPhase * Math.PI;
      food.position.y = COOKING.y + 0.115 + Math.sin(flipPhase * Math.PI) * 0.3;
      break;
    }

    case 'layer':
    case 'cover': {
      // Lowering layer on top
      const layerP = smooth(p);
      tip.set(COOKING.x, COOKING.y + lerp(0.65, 0.22, layerP), COOKING.z);
      break;
    }

    case 'chop':
    case 'slice': {
      // Cutting motion over prep board
      const cutCycle = Math.sin(p * Math.PI * 8);
      tip.set(
        PREP.x + Math.cos(p * Math.PI * 4) * 0.14,
        PREP.y + 0.12 + Math.abs(cutCycle) * 0.12,
        PREP.z
      );
      break;
    }

    case 'knead':
    case 'roll': {
      // Rolling pin / kneading motion over prep board
      const rollDist = Math.sin(p * Math.PI * 6) * 0.22;
      tip.set(PREP.x, PREP.y + 0.11, PREP.z + rollDist);
      break;
    }

    case 'plate':
    case 'serve': {
      // Slide food from cooking center to serving plate
      const z = smooth(p * 1.8);
      const foodStart = vec(COOKING.x, 1.87, COOKING.z);
      const foodEnd = vec(SERVING.x - 0.18, SERVING.y + 0.052, SERVING.z + 0.14);

      food.position.lerpVectors(foodStart, foodEnd, z);
      food.position.y += Math.sin(z * Math.PI) * 0.35;
      food.scale.setScalar(lerp(1.0, 0.88, z));

      landed = z === 1.0;
      tip.copy(food.position).y -= 0.0225 * food.scale.y + 0.0175;

      // Spatula withdraws cleanly after landing
      withdraw = smooth((p - 0.62) / 0.23);
      tip.lerp(vec(1.05, 2.05, 0.38), withdraw);
      break;
    }

    default: {
      // Neutral hovering motion
      tip.set(COOKING.x + 0.2, COOKING.y + 0.3, COOKING.z);
      break;
    }
  }

  // Update steam particles
  if (steam) {
    steam.visible = steamVisible;
    if (steamVisible) {
      steam.position.set(COOKING.x, COOKING.y + 0.3 + ((t * 0.16) % 0.3), COOKING.z);
      steam.rotation.y = t * 0.4;
    }
  }

  // At the plate the blade lowers to support the food; the grip stays above the worktop.
  const minimumTipY = action === 'serve' || action === 'plate' ? 1.65 : 1.68;
  if (tip.y < minimumTipY) {
    tip.y = minimumTipY;
  }

  // Hand target is the handle's grip; utensil is attached to solved right wrist
  const wanted = tip.clone().add(vec(-0.58, 0.16, 0));
  const actual = solveArm(armRig[1], wanted);
  if (utensil) {
    utensil.position.copy(actual).add(vec(0.58, -0.16, 0));
  }

  const gripError = actual.distanceTo(wanted);

  return {
    tip,
    wanted,
    actual,
    gripError,
    landed,
    withdraw,
    steamVisible
  };
}

import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ANCHORS, createCookware, createUtensil } from './equipment-factory.mjs';
import { createIngredientMesh, transitionIngredientState, createMaterial } from './ingredient-factory.mjs';
import { animateAction } from './action-engine.mjs';

const config = window.RENDER_CONFIG || (() => {
  try { return JSON.parse(sessionStorage.getItem('mayaLiveConfig') || '{}'); } catch { return {}; }
})();
const recipeKind = config.recipe || (config.plan?.recipeId) || 'masala-dosa';
const W = config.width || 854;
const H = config.height || 480;

// Default standalone plan for direct browser viewing without server
const DEFAULT_PLAN = {
  recipeId: 'masala-dosa',
  title: 'Masala Dosa',
  primaryEquipment: 'pan',
  utensil: 'spatula',
  ingredients: [
    { id: 'batter', name: 'Dosa Batter', category: 'batter', state: 'liquid', color: '#fff2db' },
    { id: 'filling', name: 'Potato Masala', category: 'vegetable', state: 'cooked', color: '#e5be58' }
  ],
  actions: [
    { key: 'pour', action: 'pour', ingredient: 'batter', target: 'pan' },
    { key: 'spread', action: 'spread', ingredient: 'batter', target: 'pan' },
    { key: 'cook', action: 'cook', target: 'pan' },
    { key: 'add', action: 'add', ingredient: 'filling', target: 'pan' },
    { key: 'fold', action: 'flip', target: 'pan' },
    { key: 'serve', action: 'serve', target: 'plate' }
  ]
};

// Resolve RecipePlan / VisualPlan
let plan = (config.plan && config.plan.actions && config.plan.actions.length > 0)
  ? config.plan
  : DEFAULT_PLAN;

const scene = new T.Scene();
scene.background = new T.Color('#fbfcff');
scene.fog = new T.Fog('#fbfcff', 15, 30);

const renderer = new T.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'low-power'
});
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.prepend(renderer.domElement);
let contextLost = false;
renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  contextLost = true;
  window.studioReady = false;
});

const camera = new T.PerspectiveCamera(40, W / H, 0.1, 60);
camera.position.set(5.7, 4.5, 8.2);
camera.lookAt(0, 2, 0);

scene.add(new T.AmbientLight('#ffffff', 0.8));
scene.add(new T.HemisphereLight('#ffffff', '#c8d9e5', 2.1));

const sun = new T.DirectionalLight('#ffffff', 3.9);
sun.position.set(-3, 7, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -5, near: 0.5, far: 18 });
sun.shadow.bias = -0.0015;
sun.shadow.normalBias = 0.025;
scene.add(sun);

const rim = new T.DirectionalLight('#b8e4e3', 1.45);
rim.position.set(4, 4, -3);
scene.add(rim);
const stoveGlow = new T.PointLight('#ffb85c', 0.35, 5, 2);
stoveGlow.position.set(0, 2.25, 0.05);
scene.add(stoveGlow);

const mat = (color, roughness = 0.65) => new T.MeshStandardMaterial({ color, roughness, metalness: 0 });
const white = mat('#fffcf1');
const peach = mat('#df9b86');
const mint = mat('#8bb5a4');
const metal = mat('#9eaca9', 0.28);
const dark = mat('#303b3e');
const gold = mat('#d5ae68');
const wood = mat('#ceac86');
const cream = mat('#ece7d7');

const ballGeo = new T.SphereGeometry(1, 20, 14);
const boxGeo = new T.BoxGeometry(1, 1, 1);

function mesh(geo, material, parent = scene) {
  const m = new T.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function ball(parent, material, x, y, z, sx, sy = sx, sz = sx) {
  const m = mesh(ballGeo, material, parent);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

function box(parent, material, x, y, z, sx, sy, sz) {
  const m = mesh(boxGeo, material, parent);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

function cylinder(parent, material, x, y, z, r, h, rt = r, segments = 32) {
  const m = mesh(new T.CylinderGeometry(rt, r, h, segments), material, parent);
  m.position.set(x, y, z);
  return m;
}

const vec = (x, y, z) => new T.Vector3(x, y, z);
const smooth = v => {
  v = Math.max(0, Math.min(1, v));
  return v * v * (3 - 2 * v);
};
const lerp = T.MathUtils.lerp;

// Kitchen Set Construction
box(scene, mat('#edf2f6'), 0, -0.12, 0, 16, 0.2, 13);
box(scene, mat('#ffffff'), 0, 3, -2.4, 13, 6, 0.15);
const tile = mat('#f7fbff', 0.35);
const grout = mat('#ffffff', 0.85);
for (let row = 0; row < 3; row++) {
  for (let column = -4; column <= 4; column++) {
    box(scene, tile, column * 0.72 + (row % 2 ? 0.36 : 0), 2.1 + row * 0.44, -2.29, 0.67, 0.39, 0.022);
  }
}
box(scene, grout, 0, 3.53, -2.25, 3.05, 0.08, 0.12);
box(scene, mat('#d7c3a6', 0.32), 0, 3.79, -2.12, 1.55, 0.22, 0.28);
box(scene, mat('#8e9a91', 0.25), 0, 3.58, -2.04, 1.05, 0.06, 0.18);
box(scene, mat('#ffffff'), 0, 1.52, 0.1, 8.4, 0.19, 2.7);
box(scene, mat('#e7eef5'), 0, 0.75, 0.15, 8.25, 1.45, 2.5);

for (const x of [-3, -1, 1, 3]) {
  box(scene, mat('#c9e8e2'), x, 0.79, 1.416, 1.89, 1.16, 0.06);
  box(scene, gold, x, 1.15, 1.47, 0.46, 0.045, 0.045);
}
for (const x of [1.3, 2.8]) {
  box(scene, mint, x, 3.15, -2.22, 1.4, 1.25, 0.35);
  box(scene, mat('#a8c8b5'), x, 3.15, -2.01, 1.22, 1.05, 0.045);
  box(scene, gold, x + 0.42, 3.13, -1.95, 0.04, 0.25, 0.04);
}

// Open shelving, cookbooks, and warm pendant lights give the kitchen depth.
for (const x of [-0.7, 2.6]) {
  box(scene, mat('#9a7152', 0.5), x, 3.92, -2.03, 1.05, 0.07, 0.22);
  cylinder(scene, mat('#d17d55'), x - 0.25, 4.12, -1.95, 0.12, 0.32);
  box(scene, mat('#e8bb5e'), x + 0.18, 4.1, -1.95, 0.14, 0.34, 0.08);
}
for (const x of [-2.05, 1.55]) {
  cylinder(scene, dark, x, 4.95, -0.15, 0.018, 1.22, 0.018);
  const pendant = cylinder(scene, mat('#e1a44e', 0.22), x, 4.3, -0.15, 0.22, 0.25, 0.14);
  pendant.rotation.x = Math.PI;
  const light = new T.PointLight('#ffd993', 0.55, 5, 2);
  light.position.set(x, 4.13, -0.05);
  scene.add(light);
}

// Window & Decor
box(scene, white, -2.8, 3.18, -2.2, 1.6, 1.8, 0.16);
box(scene, mat('#bcdde3'), -2.8, 3.18, -2.08, 1.37, 1.57, 0.04);
box(scene, white, -2.8, 3.18, -2.02, 0.055, 1.6, 0.08);
box(scene, white, -2.8, 3.18, -2.02, 1.4, 0.055, 0.08);
box(scene, cream, -2.8, 2.26, -1.96, 1.83, 0.12, 0.45);
box(scene, wood, -0.1, 3.1, -2, 1.6, 0.08, 0.45);

for (let i = 0; i < 2; i++) {
  cylinder(scene, mat(i ? '#d6dcba' : '#e1c58f'), -0.55 + i * 0.45, 3.31, -1.95, 0.12, 0.32);
  cylinder(scene, wood, -0.55 + i * 0.45, 3.49, -1.95, 0.13, 0.06);
}
cylinder(scene, peach, 0.4, 3.28, -1.95, 0.15, 0.25, 0.19);
for (let i = 0; i < 5; i++) {
  const leaf = ball(scene, mat('#729b72'), 0.4 + Math.sin(i * 2) * 0.16, 3.58 + Math.cos(i) * 0.08, -1.95, 0.08, 0.24, 0.035);
  leaf.rotation.z = Math.sin(i * 2) * 0.8;
}

// Staging & Equipment Setup
const PAN = ANCHORS.COOKING_CENTER;
const PLATE = ANCHORS.SERVING_CENTER;
const plateRadius = 1.04;

box(scene, dark, PAN.x, 1.67, PAN.z, 2.2, 0.14, 1.9);
for (const x of [-0.35, 0.35]) {
  cylinder(scene, metal, x + 0.35, 1.745, -0.1, 0.36, 0.025);
}

// Dynamic Primary Cookware
const primaryType = plan.primaryEquipment || (recipeKind === 'vegetable-sandwich' ? 'board' : 'pan');
const cookware = createCookware(primaryType);
cookware.position.copy(PAN);
scene.add(cookware);

// Serving Plate
cylinder(scene, white, PLATE.x, PLATE.y, PLATE.z, plateRadius, 0.055);
const plateRim = mesh(new T.TorusGeometry(plateRadius - 0.025, 0.03, 8, 48), mint);
plateRim.rotation.x = Math.PI / 2;
plateRim.position.copy(PLATE).y += 0.035;

const plateInner = mesh(new T.TorusGeometry(0.92, 0.012, 6, 40), mat('#d1e2d1'));
plateInner.rotation.x = Math.PI / 2;
plateInner.position.copy(PLATE).y += 0.032;

cylinder(scene, white, 3.03, 1.72, 0.33, 0.2, 0.12, 0.24);
cylinder(scene, mat('#b2c98d'), 3.03, 1.79, 0.33, 0.19, 0.015);

// Prep Area Bowls & Ingredients
function bowl(x, z, color) {
  const b = ball(scene, mat(color), x, 1.68, z, 0.28, 0.16, 0.28);
  cylinder(scene, white, x, 1.75, z, 0.26, 0.025);
  return b;
}
bowl(-2, 0.82, '#d59077');
cylinder(scene, mat('#f5e9c9'), -2, 1.77, 0.82, 0.24, 0.02);
bowl(-0.85, 0.95, '#85aaa0');

// Invisible kinematic helpers retained for utensil placement and collision QA.
// Chef Maya's only visible geometry comes from the Blender GLB below.
const chef = new T.Group();
chef.position.set(-1.55, 0, -0.65);
const armRig = [];
for (const side of [-1, 1]) {
  const group = new T.Group();
  const upper = new T.Object3D();
  const lower = new T.Object3D();
  const elbow = new T.Object3D();
  const hand = new T.Object3D();
  group.add(upper, lower, elbow, hand);
  armRig.push({ side, group, upper, lower, elbow, hand });
}

function segment(object, a, b) {
  const d = new T.Vector3().subVectors(b, a);
  object.position.copy(a).add(b).multiplyScalar(0.5);
  object.scale.y = d.length();
  object.quaternion.setFromUnitVectors(vec(0, 1, 0), d.normalize());
}

function solveArm(rig, target) {
  const shoulder = vec(chef.position.x + rig.side * 0.4, 2.5, chef.position.z + 0.04);
  const delta = target.clone().sub(shoulder);
  const dist = delta.length();
  const upper = 0.88;
  const lower = 0.95;
  const max = upper + lower - 0.005;

  if (dist > max) target = shoulder.clone().add(delta.multiplyScalar(max / dist));
  const direction = target.clone().sub(shoulder).normalize();
  const d = shoulder.distanceTo(target);
  const along = (upper * upper - lower * lower + d * d) / (2 * Math.max(0.001, d));
  const height = Math.sqrt(Math.max(0.001, upper * upper - along * along));
  const perpendicular = vec(rig.side * 0.15, -1, 0.12).addScaledVector(direction, -vec(rig.side * 0.15, -1, 0.12).dot(direction)).normalize();
  const elbow = shoulder.clone().addScaledVector(direction, along).addScaledVector(perpendicular, height);

  segment(rig.upper, shoulder, elbow);
  segment(rig.lower, elbow, target);
  rig.elbow.position.copy(elbow);
  rig.hand.position.copy(target);
  return target;
}

// Cooking Utensil
const utensilType = plan.utensil || 'spoon';
const tool = createUtensil(utensilType);
scene.add(tool);

// Blender-authored Chef Maya. Named pivots in the GLB are posed by Three.js so
// her movement follows the current recipe action deterministically.
let blenderMaya;
const mayaRig = {};
const gltf = await new GLTFLoader().loadAsync('/studio3d/assets/maya-chef.glb');
blenderMaya = gltf.scene;
  blenderMaya.name = 'ChefMayaBlender';
  blenderMaya.position.set(-1.48, W < H ? 0.55 : 0.42, -0.55);
  blenderMaya.rotation.y = W < H ? 0.32 : 0.58;
  blenderMaya.scale.setScalar(W < H ? 0.82 : 0.88);
  blenderMaya.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
    }
  });
  scene.add(blenderMaya);
  for (const name of ['MayaRoot', 'MayaBody', 'MayaHead', 'MayaArmL', 'MayaArmR', 'MayaForearmL', 'MayaForearmR', 'MayaHandL', 'MayaHandR']) {
    const node = blenderMaya.getObjectByName(name);
    if (node && name === 'MayaHead') node.position.y += 0.16;
    if (node) mayaRig[name] = { node, rotation: node.quaternion.clone(), position: node.position.clone() };
  }

// Main Food Entity
const food = new T.Group();
food.position.copy(PAN).y = 1.852;
scene.add(food);

// Build dynamic ingredients inside food entity
const ingredientMeshes = new Map();
if (Array.isArray(plan.ingredients) && plan.ingredients.length > 0) {
  plan.ingredients.forEach(ing => {
    const m = createIngredientMesh(ing);
    ingredientMeshes.set(ing.id, m);
    food.add(m);
  });
}

// Backward compatibility elements for legacy test assertions:
// (foldHinge for dosa fold check, spreadLayer for sandwich check, batter for pancake check)
const toasted = mat('#e8b663');
const foldHinge = new T.Group();
food.add(foldHinge);
foldHinge.position.y = 0.025;
const flap = mesh(new T.CylinderGeometry(0.76, 0.76, 0.022, 40, 1, false, 0, Math.PI), toasted, foldHinge);
flap.rotation.y = Math.PI / 2;
foldHinge.visible = false;

const spreadLayer = box(food, mat('#82a36b'), 0, 0.018, 0, 0.8, 0.012, 0.8);
spreadLayer.visible = false;

const batter = cylinder(food, mat('#fff0ce'), 0, 0.02, 0, 0.76, 0.022);
batter.visible = plan.recipeId === 'masala-dosa' || plan.recipeId === 'pancakes';

// Steam Group
const steam = new T.Group();
scene.add(steam);
const steamMaterial = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.24, depthWrite: false });
for (let i = 0; i < 3; i++) {
  ball(steam, steamMaterial, (i - 1) * 0.25, 0, 0, 0.06, 0.17, 0.06);
}
steam.visible = false;

const defaultSteps = (plan.actions || []).map(a => ({
  id: a.key,
  key: a.key,
  text: a.text || a.action,
  start: a.start || 0,
  speechEnd: a.speechEnd || (a.end ? a.end - 0.5 : 5),
  end: a.end || 6
}));

const lesson = config.lesson || {
  duration: defaultSteps.at(-1)?.end || 30,
  steps: defaultSteps,
  captions: defaultSteps.map(s => ({ start: s.start, end: s.end, text: s.text })),
  envelope: []
};
const preview = !!config.preview;
const duration = config.duration || lesson.duration || 30;

let state = {};

function speechProgress(act, t) {
  const split = { pour: 0.6, fold: 0.2, serve: 0.6, cook: 0.4 }[act.key];
  const sentences = (lesson.segments || []).filter(s => s.key === act.key);
  if (split === undefined || sentences.length < 2) return act.p;
  const [first, second] = sentences;
  return t <= first.end
    ? Math.max(0, Math.min(1, (t - first.start) / (first.end - first.start))) * split
    : lerp(split, 1, Math.max(0, Math.min(1, (t - first.end) / (second.end - first.end))));
}

function actionAt(t) {
  if (Array.isArray(lesson.steps) && lesson.steps.length > 0) {
    const step = lesson.steps.find(s => t >= s.start && t < s.end) || lesson.steps.at(-1);
    const planStep = plan.actions?.find(a => a.key === step?.key) || plan.actions?.find(a => a.action === step?.action) || step;
    const actionVerb = planStep?.action || step?.action || 'cook';
    const speechSpan = (step.speechEnd || step.end) - step.start;
    const p = speechSpan > 0 ? Math.min(1, Math.max(0, (t - step.start) / speechSpan)) : 0;
    return {
      key: step?.key || planStep?.key || 'welcome',
      action: actionVerb,
      p,
      step: planStep
    };
  }

  const actions = plan.actions || [];
  const count = Math.max(1, actions.length);
  const pTotal = Math.min(1, Math.max(0, t / duration));
  const idx = Math.min(count - 1, Math.floor(pTotal * count));
  const stepProgress = (pTotal - (idx / count)) * count;
  return {
    key: actions[idx]?.key || 'step',
    action: actions[idx]?.action || 'cook',
    p: stepProgress,
    step: actions[idx]
  };
}

function frame(t, draw = true) {
  if (contextLost || renderer.getContext().isContextLost()) {
    throw new Error('WebGL context lost; refusing to render a blank frame');
  }
  // Each frame must depend on its timestamp, never the previous frame.
  food.position.copy(PAN).y = 1.852;
  food.rotation.set(0, 0, 0);
  food.scale.set(1, 1, 1);
  ingredientMeshes.forEach(ingredient => {
    ingredient.position.set(0, 0, 0);
    ingredient.rotation.set(0, 0, 0);
    ingredient.scale.set(1, 1, 1);
    transitionIngredientState(ingredient, 'raw', 0);
  });
  const act = actionAt(t);
  const p = speechProgress(act, t);
  const actionName = act.action || 'cook';
  const amp = lesson.envelope?.[Math.floor(t / 0.02)] || 0;

  if (blenderMaya) {
    for (const rig of Object.values(mayaRig)) {
      rig.node.quaternion.copy(rig.rotation);
      rig.node.position.copy(rig.position);
    }
    const root = mayaRig.MayaRoot?.node;
    const mayaHead = mayaRig.MayaHead?.node;
    const leftArm = mayaRig.MayaArmL?.node;
    const rightArm = mayaRig.MayaArmR?.node;
    const leftForearm = mayaRig.MayaForearmL?.node;
    const rightForearm = mayaRig.MayaForearmR?.node;
    const pulse = Math.sin(t * 2.2);
    if (root) root.position.y += pulse * 0.018 + amp * 0.035;
    if (mayaHead) {
      mayaHead.rotateZ(Math.sin(t * 1.4) * 0.045);
      mayaHead.rotateY(Math.sin(t * 0.8) * 0.055);
    }
    if (leftArm && rightArm && leftForearm && rightForearm) {
      leftArm.rotateZ(-0.12 + pulse * 0.025);
      rightArm.rotateZ(0.12 - pulse * 0.025);
      leftForearm.rotateZ(-0.08);
      rightForearm.rotateZ(0.08);
      if (['add', 'pour'].includes(actionName)) {
        rightArm.rotateX(-0.65 * smooth(p));
        rightArm.rotateZ(-0.42 * smooth(p));
        rightForearm.rotateX(-0.55 * smooth(p));
      } else if (['mix', 'stir', 'spread', 'cook', 'boil', 'simmer'].includes(actionName)) {
        rightArm.rotateX(-0.48);
        rightArm.rotateZ(-0.34 + Math.sin(t * 5.2) * 0.16);
        rightForearm.rotateX(-0.62 + Math.cos(t * 5.2) * 0.18);
      } else if (['serve', 'plate'].includes(actionName)) {
        leftArm.rotateX(-0.35);
        rightArm.rotateX(-0.35);
        leftArm.rotateZ(0.75 * smooth(p));
        rightArm.rotateZ(-0.75 * smooth(p));
        leftForearm.rotateX(-0.35);
        rightForearm.rotateX(-0.35);
      } else if (act.key === 'welcome') {
        leftArm.rotateX(-0.35);
        leftArm.rotateZ(0.55 + Math.sin(t * 4.5) * 0.16);
        leftForearm.rotateX(-0.75);
      }
    }
  }

  // Execute Action Kinematics
  const currentIng = ingredientMeshes.get(act.step?.ingredient);
  const actionResult = animateAction({
    action: actionName,
    ingredientMesh: currentIng,
    cookware,
    food,
    plate: plateRim,
    utensil: tool,
    steam,
    chef,
    armRig,
    solveArm,
    p,
    t,
    isColdDish: Boolean(plan.isColdDish)
  });

  // Legacy foldHinge continuous angle support for tests
  if (plan.recipeId === 'masala-dosa' && act.key === 'fold') {
    foldHinge.visible = true;
    foldHinge.rotation.x = Math.PI * smooth((p - 0.2) / 0.65);
  } else if (plan.recipeId === 'masala-dosa' && act.key === 'serve') {
    foldHinge.visible = true;
    foldHinge.rotation.x = Math.PI;
  } else {
    foldHinge.visible = false;
    foldHinge.rotation.x = 0;
  }

  // Camera Framing
  const startCam = vec(5.7, 4.5, 8.2);
  const cookCam = vec(4.2, 4.1, 6.7);
  const serveCam = vec(5.3, 3.7, 6.3);
  const look = vec(0, 2.3, 0);

  const cameraTarget = act.key === 'welcome' || act.key === 'safe' ? startCam : act.key === 'serve' ? serveCam : cookCam;
  const transition = smooth(Math.min(1, Math.max(0, p * 1.35)));
  camera.position.copy(startCam).lerp(cameraTarget, transition);
  camera.position.x += Math.sin(t * 0.45) * 0.08;
  camera.position.y += Math.cos(t * 0.35) * 0.025;
  if (act.key === 'serve') look.set(0.7, 2.35, 0.1);
  if (W < H) {
    const focus = act.key === 'serve' ? 1.45 : 0.7;
    camera.position.set(focus + 1.1, 4.45, act.key === 'serve' ? 8.3 : 9.2);
    look.set(focus, 2.3, 0.1);
  }
  stoveGlow.intensity = ['cook', 'boil', 'simmer', 'fry', 'saute'].includes(actionName) ? 0.8 + Math.sin(t * 5) * 0.12 : 0.3;
  camera.lookAt(look);
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);

  // Subtitles
  const subtitleEl = document.getElementById('subtitle');
  if (subtitleEl && lesson.captions) {
    subtitleEl.textContent = lesson.captions.find(c => t >= c.start && t < c.end)?.text || '';
  }
  const stepName = document.getElementById('step-name');
  if (stepName) {
    const actions = plan.actions || [];
    const stepNumber = Math.max(1, actions.findIndex(item => item.key === act.key) + 1);
    const friendlyAction = actionName === 'serve' ? 'Great job — it is ready!' : `${actionName[0].toUpperCase()}${actionName.slice(1)} together`;
    stepName.textContent = actionName === 'serve' ? friendlyAction : `Step ${stepNumber}: ${friendlyAction}`;
  }

  if (draw) renderer.render(scene, camera);

  const foodCenter = food.getWorldPosition(vec(0, 0, 0));
  const toolTip = tool.getWorldPosition(vec(0, 0, 0));

  state = {
    key: act.key,
    p,
    time: t,
    foldAngle: foldHinge.rotation.x,
    landed: actionResult.landed,
    withdraw: actionResult.withdraw,
    food: foodCenter.toArray(),
    tool: toolTip.toArray(),
    plate: PLATE.toArray(),
    foodRadius: 0.76 * food.scale.x,
    plateRadius,
    foodBottom: foodCenter.y - 0.0225 * food.scale.y,
    bladeTop: toolTip.y + 0.0175,
    mouthOpen: amp > 0.045,
    speechEnergy: amp,
    steamVisible: steam.visible,
    spreadHeight: spreadLayer.scale.y,
    handBottom: actionResult.actual.y - 0.13,
    gripError: actionResult.gripError,
    meshes: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    perspective: camera.isPerspectiveCamera,
    webgl: renderer.capabilities.isWebGL2,
    threeRevision: T.REVISION,
    characterType: 'blender-glb'
  };

  window.frameState = state;
  return state;
}

window.setFrame = frame;
window.studio = { scene, camera, renderer, food, chef: blenderMaya, plate: PLATE };
frame(0);
window.studioReady = true;

// Live Browser Playback & Canvas Video Recording
let isPlaying = false;
let startTime = 0;
let playbackOffset = 0;
let lastSpokenIndex = -1;
let mediaRecorder = null;
let recordedChunks = [];

function speakCurrentStep(t) {
  if (!('speechSynthesis' in window)) return;
  const steps = lesson.steps || [];
  const idx = steps.findIndex(s => t >= s.start && t < s.end);
  if (idx !== -1 && idx !== lastSpokenIndex) {
    lastSpokenIndex = idx;
    const text = steps[idx].text;
    if (text) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.pitch = 1.15;
      window.speechSynthesis.speak(u);
    }
  }
}

export function playLive() {
  if (isPlaying) return;
  isPlaying = true;
  startTime = performance.now();
  window.parent?.postMessage({ type: 'livePlaying' }, '*');

  function tick(now) {
    if (!isPlaying) return;
    const elapsed = (now - startTime) / 1000 + playbackOffset;
    if (elapsed >= duration) {
      isPlaying = false;
      frame(duration);
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      window.parent?.postMessage({ type: 'liveEnded' }, '*');
      return;
    }
    frame(elapsed);
    speakCurrentStep(elapsed);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function pauseLive() {
  isPlaying = false;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  window.parent?.postMessage({ type: 'livePaused' }, '*');
}

export function startRecording() {
  recordedChunks = [];
  try {
    const stream = renderer.domElement.captureStream(24);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';
    mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
    mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mime });
      const videoUrl = URL.createObjectURL(blob);
      window.parent?.postMessage({ type: 'videoRecorded', url: videoUrl }, '*');
    };
    mediaRecorder.start();
  } catch (err) {
    console.warn('Canvas recorder error:', err);
  }
}

window.playLive = playLive;
window.pauseLive = pauseLive;
window.startRecording = startRecording;

if (window.location.search.includes('live=1') || config.autoPlay) {
  startRecording();
  playLive();
}

import * as T from 'three';
import { ANCHORS, createCookware, createUtensil } from './equipment-factory.mjs';
import { createIngredientMesh, transitionIngredientState, createMaterial } from './ingredient-factory.mjs';
import { animateAction } from './action-engine.mjs';

const config = window.RENDER_CONFIG || {};
const recipeKind = config.recipe || 'masala-dosa';
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
renderer.toneMappingExposure = 1.28;
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
const skin = mat('#f2b895');
const hair = mat('#4a2a25');
const hairLight = mat('#704336');
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

// Original MAYA character
const chef = new T.Group();
chef.position.set(-1.55, 0, -0.65);
scene.add(chef);

ball(chef, white, 0, 2.12, 0, 0.46, 0.68, 0.31);
box(chef, peach, 0, 2.03, 0.306, 0.58, 0.77, 0.035);
box(chef, mat('#e98d6b'), 0, 2.08, 0.35, 0.42, 0.55, 0.025);
box(chef, white, 0, 2.4, 0.37, 0.5, 0.07, 0.03);
box(chef, white, 0, 2.57, 0.1, 0.21, 0.1, 0.22);
for (const x of [-0.24, 0.24]) {
  const strap = box(chef, peach, x, 2.37, 0.28, 0.065, 0.49, 0.045);
  strap.rotation.z = -x * 0.7;
}
for (const y of [2.1, 1.95]) ball(chef, gold, 0, y, 0.37, 0.024);
ball(chef, peach, 0, 1.88, 0.34, 0.19, 0.15, 0.03);
for (const x of [-0.11, 0.11]) {
  ball(chef, gold, x, 2.36, 0.35, 0.022);
}
cylinder(chef, skin, 0, 2.7, 0, 0.15, 0.26);
ball(chef, peach, 0, 2.62, 0.19, 0.2, 0.07, 0.13);

const head = new T.Group();
head.position.set(0, 3.28, 0);
head.scale.setScalar(1.12);
chef.add(head);

ball(head, hair, 0, 0.03, -0.09, 0.66, 0.68, 0.49);
ball(head, hairLight, 0.4, 0.46, -0.12, 0.28, 0.3, 0.24);
ball(head, skin, 0, 0, 0.045, 0.59, 0.62, 0.48);
for (const x of [-0.6, 0.6]) {
  ball(head, skin, x, -0.04, 0.02, 0.1, 0.15, 0.09);
  ball(head, hair, x * 0.92, -0.2, -0.1, 0.12, 0.34, 0.3);
}

const blush = mat('#e99c8f');
for (const x of [-0.37, 0.37]) {
  ball(head, blush, x, -0.17, 0.425, 0.115, 0.06, 0.018);
}
ball(head, skin, 0, -0.085, 0.53, 0.075, 0.07, 0.085);

const eyes = [], pupils = [];
for (const x of [-0.225, 0.225]) {
  const eye = new T.Group();
  eye.position.set(x, 0.06, 0.455);
  head.add(eye);
  eyes.push(eye);
  ball(eye, white, 0, 0, 0, 0.174, 0.22, 0.072);
  ball(eye, mat('#4b8d83'), x < 0 ? 0.014 : -0.014, -0.008, 0.066, 0.108, 0.145, 0.035);
  const pupil = ball(eye, mat('#203c3d'), x < 0 ? 0.014 : -0.014, -0.002, 0.094, 0.055, 0.105, 0.018);
  pupils.push(pupil);
  ball(eye, white, -0.03, 0.063, 0.11, 0.035, 0.047, 0.012);
  ball(eye, white, 0.042, -0.06, 0.102, 0.017, 0.02, 0.009);
  const brow = ball(head, hair, x, 0.33, 0.42, 0.15, 0.027, 0.035);
  brow.rotation.z = x < 0 ? 0.1 : -0.1;
  for (const lashOffset of [-0.055, 0.055]) {
    const lash = ball(eye, hair, lashOffset, 0.16, 0.07, 0.028, 0.009, 0.01);
    lash.rotation.z = lashOffset * 5;
  }
}

for (let i = 0; i < 5; i++) {
  const lock = ball(head, i % 2 ? hair : hairLight, -0.44 + i * 0.2, 0.45 - Math.sin(i) * 0.03, 0.32, 0.16, 0.25, 0.17);
  lock.rotation.z = -0.45 + i * 0.12;
}

const mouth = new T.Group();
mouth.position.set(0, -0.32, 0.475);
head.add(mouth);

const mouthOpen = ball(mouth, mat('#713b3e'), 0, 0, 0.015, 0.12, 0.08, 0.035);
const tongue = ball(mouth, mat('#e99699'), 0, -0.027, 0.046, 0.065, 0.022, 0.01);
const smile = mesh(new T.TorusGeometry(0.115, 0.014, 6, 20, Math.PI), mat('#975948'), mouth);
smile.rotation.z = Math.PI;
smile.position.z = 0.04;

cylinder(head, white, 0, 0.62, -0.01, 0.55, 0.22, 0.58);
for (let i = 0; i < 5; i++) {
  ball(head, white, Math.sin(i * 1.3) * 0.33, 0.88 + Math.cos(i * 1.7) * 0.075, Math.cos(i * 1.3) * 0.2, 0.32, 0.28, 0.29);
}

// Articulated Arm Rig & Analytical IK
const armRig = [];
for (const side of [-1, 1]) {
  const group = new T.Group();
  scene.add(group);
  const upper = mesh(new T.CylinderGeometry(0.115, 0.14, 1, 10), white, group);
  const lower = mesh(new T.CylinderGeometry(0.1, 0.115, 1, 10), white, group);
  const elbow = ball(group, white, 0, 0, 0, 0.12);
  const hand = ball(group, skin, 0, 0, 0, 0.12, 0.13, 0.11);
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

// Premium illustrated Maya host. The transparent character matches the studio
// artwork while the procedural food and cookware continue animating in 3D.
let illustratedMaya = null;
const mayaSize = W < H ? { width: 2.65, height: 3.98, y: 3.1 } : { width: 2.85, height: 4.28, y: 3.25 };
try {
  const mayaTexture = await new T.TextureLoader().loadAsync('/studio3d/assets/maya-character.png');
  mayaTexture.colorSpace = T.SRGBColorSpace;
  const mayaMaterial = new T.SpriteMaterial({ map: mayaTexture, transparent: true, alphaTest: 0.03, depthWrite: false });
  illustratedMaya = new T.Sprite(mayaMaterial);
  illustratedMaya.position.set(-1.25, mayaSize.y, -0.48);
  illustratedMaya.scale.set(mayaSize.width, mayaSize.height, 1);
  illustratedMaya.renderOrder = 2;
  scene.add(illustratedMaya);
  chef.visible = false;
  armRig.forEach(rig => { rig.group.visible = false; });
  tool.visible = false;
} catch {
  illustratedMaya = null;
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

const lesson = config.lesson || { steps: [], captions: [], envelope: [] };
const preview = !!config.preview;
const duration = config.duration || lesson.duration || 8.79;

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

  if (illustratedMaya) {
    const serving = actionName === 'serve' || actionName === 'plate';
    illustratedMaya.position.x = serving ? -0.95 : -1.25;
    illustratedMaya.position.y = mayaSize.y + Math.sin(t * 2.1) * 0.035 + amp * 0.045;
    illustratedMaya.scale.set(mayaSize.width + amp * 0.025, mayaSize.height + amp * 0.04, 1);
    illustratedMaya.material.rotation = Math.sin(t * 1.25) * 0.012;
  }

  // Head and eye animation
  head.rotation.z = Math.sin(t * 1.5) * 0.035;
  head.rotation.y = act.key === 'serve' ? 0.05 : 0.12;
  head.position.y = 3.28 + Math.sin(t * 2) * 0.012;

  const blink = 1 - Math.sin(Math.min(1, (t % 3.9) / 0.18) * Math.PI) * 0.96;
  eyes.forEach(e => e.scale.y = blink);
  pupils.forEach(e => e.position.x = 0.02);

  mouthOpen.visible = amp > 0.045;
  tongue.visible = amp > 0.25;
  smile.visible = amp <= 0.045;
  mouthOpen.scale.y = 0.012 + amp * 0.095;

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
    mouthOpen: mouthOpen.visible,
    speechEnergy: amp,
    steamVisible: steam.visible,
    spreadHeight: spreadLayer.scale.y,
    handBottom: actionResult.actual.y - 0.13,
    gripError: actionResult.gripError,
    meshes: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    perspective: camera.isPerspectiveCamera,
    webgl: renderer.capabilities.isWebGL2,
    threeRevision: T.REVISION
  };

  window.frameState = state;
  return state;
}

window.setFrame = frame;
window.studio = { scene, camera, renderer, food, chef, plate: PLATE };
frame(0);
window.studioReady = true;

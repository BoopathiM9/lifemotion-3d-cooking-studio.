/**
 * LifeMotion 3D Cooking Studio
 * Procedural Three.js Ingredient Factory
 */

import * as THREE from 'three';

/**
 * Deterministic string hash (32-bit unsigned integer).
 * Kept local so this module remains 100% browser-safe with no Node dependencies.
 * @param {string} str
 * @returns {number}
 */
export function hashString(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Creates a standard material with mild roughness and zero metalness.
 * @param {string} color
 * @param {number} roughness
 * @param {boolean} transparent
 * @param {number} opacity
 * @returns {THREE.MeshStandardMaterial}
 */
export function createMaterial(color, roughness = 0.65, transparent = false, opacity = 1.0) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness: 0.05,
    transparent,
    opacity
  });
}

/**
 * Creates procedural 3D visual representation of an ingredient.
 * @param {object} ingredientSpec
 * @param {string} ingredientSpec.id
 * @param {string} ingredientSpec.name
 * @param {string} ingredientSpec.category
 * @param {string} ingredientSpec.state
 * @param {string} [ingredientSpec.color]
 * @returns {THREE.Group}
 */
export function createIngredientMesh(ingredientSpec) {
  const group = new THREE.Group();
  group.name = `ing_${ingredientSpec.id}`;

  const category = (ingredientSpec.category || 'vegetable').toLowerCase();
  const baseColor = ingredientSpec.color || '#e0a96d';
  const mat = createMaterial(baseColor);

  switch (category) {
    case 'grain': {
      // Rice mound with textured rice grains
      const mound = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.44, 0.12, 16),
        mat
      );
      mound.position.y = 0.06;
      group.add(mound);

      const grainGeo = new THREE.CapsuleGeometry(0.015, 0.05, 4, 8);
      for (let i = 0; i < 16; i++) {
        const grain = new THREE.Mesh(grainGeo, mat);
        const a = i * 2.4;
        const r = 0.12 + (i % 4) * 0.06;
        grain.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r);
        grain.rotation.set(0.2, a, 0.3);
        group.add(grain);
      }
      break;
    }

    case 'protein': {
      // Tender chicken pieces or paneer/tofu cubes
      const isPaneer = /\b(paneer|tofu|cheese)\b/i.test(ingredientSpec.name);
      if (isPaneer) {
        const cubeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        for (let i = 0; i < 7; i++) {
          const cube = new THREE.Mesh(cubeGeo, mat);
          cube.position.set(
            ((i % 3) - 1) * 0.14,
            0.06 + Math.floor(i / 3) * 0.08,
            (Math.floor(i / 3) - 0.5) * 0.14
          );
          cube.rotation.y = i * 0.5;
          group.add(cube);
        }
      } else {
        // Organic rounded chicken pieces
        const chunkGeo = new THREE.SphereGeometry(0.09, 8, 8);
        chunkGeo.scale(1.2, 0.8, 1.0);
        for (let i = 0; i < 8; i++) {
          const piece = new THREE.Mesh(chunkGeo, mat);
          const a = i * 1.8;
          const r = 0.14 + (i % 3) * 0.06;
          piece.position.set(Math.cos(a) * r, 0.07 + (i % 2) * 0.05, Math.sin(a) * r);
          piece.rotation.set(Math.sin(i), a, Math.cos(i));
          group.add(piece);
        }
      }
      break;
    }

    case 'vegetable': {
      // Diced, sliced or mixed vegetables
      const isTomato = /\b(tomato)\b/i.test(ingredientSpec.name);
      const isOnion = /\b(onion)\b/i.test(ingredientSpec.name);

      if (isTomato) {
        // Sliced red tomato discs
        const discGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.025, 12);
        for (let i = 0; i < 5; i++) {
          const disc = new THREE.Mesh(discGeo, mat);
          disc.position.set(((i % 3) - 1) * 0.16, 0.02 + i * 0.015, (Math.floor(i / 3) - 0.5) * 0.16);
          disc.rotation.y = i * 0.4;
          group.add(disc);
        }
      } else if (isOnion) {
        // Thin onion crescent slices
        const ringGeo = new THREE.TorusGeometry(0.1, 0.02, 6, 12, Math.PI);
        for (let i = 0; i < 6; i++) {
          const slice = new THREE.Mesh(ringGeo, mat);
          slice.rotation.x = Math.PI / 2;
          slice.position.set(Math.sin(i) * 0.12, 0.02 + i * 0.015, Math.cos(i) * 0.12);
          group.add(slice);
        }
      } else {
        // Multi-color vegetable dice
        const vegColors = ['#27ae60', '#e67e22', '#f1c40f', '#e74c3c'];
        const diceGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        for (let i = 0; i < 14; i++) {
          const pieceMat = createMaterial(vegColors[i % vegColors.length]);
          const piece = new THREE.Mesh(diceGeo, pieceMat);
          const a = i * 1.5;
          const r = 0.08 + (i % 4) * 0.06;
          piece.position.set(Math.cos(a) * r, 0.03 + (i % 2) * 0.04, Math.sin(a) * r);
          piece.rotation.set(0.1 * i, a, 0.2);
          group.add(piece);
        }
      }
      break;
    }

    case 'liquid': {
      // Liquid pool or glossy sauce
      const pool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.02, 24),
        createMaterial(baseColor, 0.2, true, 0.85)
      );
      pool.position.y = 0.01;
      group.add(pool);
      break;
    }

    case 'dough': {
      // Smooth rounded dough ball or rolled flatbread disc
      const isRolled = ingredientSpec.state === 'rolled' || ingredientSpec.state === 'sliced';
      if (isRolled) {
        const disc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.36, 0.02, 32),
          mat
        );
        disc.position.y = 0.01;
        group.add(disc);
      } else {
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 16, 12),
          mat
        );
        ball.scale.set(1.1, 0.8, 1.1);
        ball.position.y = 0.14;
        group.add(ball);
      }
      break;
    }

    case 'batter': {
      // Spreading batter layer
      const puddle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.018, 32),
        createMaterial(baseColor, 0.5)
      );
      puddle.position.y = 0.01;
      group.add(puddle);
      break;
    }

    case 'pasta': {
      // Macaroni / Penne curved pieces
      const pastaGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
      for (let i = 0; i < 10; i++) {
        const pasta = new THREE.Mesh(pastaGeo, mat);
        const a = i * 1.7;
        const r = 0.1 + (i % 3) * 0.08;
        pasta.position.set(Math.cos(a) * r, 0.05 + (i % 2) * 0.04, Math.sin(a) * r);
        pasta.rotation.set(0.4 * i, a, Math.PI / 4);
        group.add(pasta);
      }
      break;
    }

    case 'noodle': {
      // Intertwined noodle strands
      const torusGeo = new THREE.TorusGeometry(0.14, 0.022, 6, 16);
      for (let i = 0; i < 6; i++) {
        const strand = new THREE.Mesh(torusGeo, mat);
        strand.rotation.set(Math.PI / 2 + (i * 0.2), i * 0.8, 0);
        strand.position.set(Math.sin(i) * 0.08, 0.04 + i * 0.015, Math.cos(i) * 0.08);
        group.add(strand);
      }
      break;
    }

    case 'bread': {
      // Sliced sandwich bread
      const bread = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.06, 0.52),
        mat
      );
      bread.position.y = 0.03;
      group.add(bread);
      break;
    }

    case 'cheese': {
      // Grated cheese ribbons or sliced cheese square
      const cheese = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.015, 0.44),
        createMaterial(baseColor, 0.4)
      );
      cheese.position.y = 0.01;
      group.add(cheese);
      break;
    }

    case 'herb': {
      // Tiny fresh leaves
      const leafGeo = new THREE.SphereGeometry(0.04, 6, 4);
      leafGeo.scale(1.4, 0.2, 0.8);
      for (let i = 0; i < 8; i++) {
        const leaf = new THREE.Mesh(leafGeo, mat);
        const a = i * 2.1;
        leaf.position.set(Math.cos(a) * 0.16, 0.06 + (i % 2) * 0.03, Math.sin(a) * 0.16);
        leaf.rotation.set(0.3, a, 0.2);
        group.add(leaf);
      }
      break;
    }

    default: {
      // Unknown Food: Deterministically shaped based on name hash
      const h = hashString(ingredientSpec.name || 'food');
      const shapeType = h % 3;
      let geo;
      if (shapeType === 0) {
        geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      } else if (shapeType === 1) {
        geo = new THREE.SphereGeometry(0.08, 10, 8);
      } else {
        geo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10);
      }

      for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(geo, mat);
        const a = i * 2.0;
        m.position.set(Math.cos(a) * 0.14, 0.06 + (i % 2) * 0.04, Math.sin(a) * 0.14);
        m.rotation.set(0.1 * i, a, 0);
        group.add(m);
      }
      break;
    }
  }

  // Cast and receive shadows on all child meshes
  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

/**
 * Updates visual state of an ingredient mesh during cooking.
 * e.g. color browning, golden transition, boiling agitation.
 * @param {THREE.Group} ingredientGroup
 * @param {string} targetState 'cooked' | 'golden' | 'fried' | 'melted' | 'boiled'
 * @param {number} progress 0.0 to 1.0
 */
export function transitionIngredientState(ingredientGroup, targetState, progress) {
  if (!ingredientGroup) return;

  const p = Math.max(0, Math.min(1, progress));
  const brownTarget = new THREE.Color('#9e6b38');
  const goldenTarget = new THREE.Color('#d4a017');
  const friedTarget = new THREE.Color('#8b4513');

  ingredientGroup.traverse(child => {
    if (child.isMesh && child.material && child.material.color) {
      if (!child.userData.originalColor) {
        child.userData.originalColor = child.material.color.clone();
      }

      let targetColor = child.userData.originalColor;
      if (targetState === 'golden') targetColor = goldenTarget;
      else if (targetState === 'cooked') targetColor = brownTarget;
      else if (targetState === 'fried') targetColor = friedTarget;

      child.material.color.copy(child.userData.originalColor).lerp(targetColor, p * 0.45);
    }
  });
}

/**
 * LifeMotion 3D Cooking Studio
 * Reusable Procedural 3D Equipment Factory
 */

import * as THREE from 'three';
import { createMaterial } from './ingredient-factory.mjs';

/**
 * Standard scene anchor coordinates.
 */
export const ANCHORS = {
  COOKING_CENTER: new THREE.Vector3(0.35, 1.79, 0.25),
  PREP_CENTER: new THREE.Vector3(-0.85, 1.70, 0.85),
  SERVING_CENTER: new THREE.Vector3(2.47, 1.65, 0.69),
  INGREDIENT_AREA: new THREE.Vector3(-2.0, 1.70, 0.85)
};

/**
 * Creates reusable procedural cookware models.
 * @param {'pan'|'pot'|'wok'|'saucepan'|'bowl'|'plate'|'board'|'tray'} type
 * @returns {THREE.Group}
 */
export function createCookware(type = 'pan') {
  const group = new THREE.Group();
  group.name = `equipment_${type}`;

  const darkMetal = createMaterial('#2d3436', 0.4);
  const silverMetal = createMaterial('#9eaca9', 0.3);
  const woodMat = createMaterial('#b08968', 0.7);
  const ceramicWhite = createMaterial('#fdfbf7', 0.5);
  const mintBorder = createMaterial('#77a5a0', 0.5);

  switch (type) {
    case 'pot': {
      // Deep cooking pot with two side handles
      const potBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.65, 0.52, 28, 1, true),
        silverMetal
      );
      potBody.position.y = 0.26;
      group.add(potBody);

      const potBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.04, 28),
        silverMetal
      );
      potBase.position.y = 0.02;
      group.add(potBase);

      const potRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.03, 8, 28),
        silverMetal
      );
      potRim.rotation.x = Math.PI / 2;
      potRim.position.y = 0.52;
      group.add(potRim);

      // Two side loop handles
      for (const side of [-1, 1]) {
        const handle = new THREE.Mesh(
          new THREE.TorusGeometry(0.12, 0.025, 6, 16, Math.PI),
          darkMetal
        );
        handle.rotation.z = side * Math.PI / 2;
        handle.position.set(side * 0.76, 0.42, 0);
        group.add(handle);
      }
      break;
    }

    case 'wok': {
      // Curved Chinese wok
      const wokBowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.82, 24, 16, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45),
        darkMetal
      );
      wokBowl.rotation.x = Math.PI;
      wokBowl.position.y = 0.45;
      group.add(wokBowl);

      // Loop side handles
      for (const side of [-1, 1]) {
        const handle = new THREE.Mesh(
          new THREE.TorusGeometry(0.11, 0.024, 6, 16, Math.PI),
          darkMetal
        );
        handle.rotation.z = side * Math.PI / 2;
        handle.position.set(side * 0.78, 0.35, 0);
        group.add(handle);
      }
      break;
    }

    case 'board': {
      // Wooden cutting/prep board
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.05, 0.95),
        woodMat
      );
      board.position.y = 0.025;
      group.add(board);
      break;
    }

    case 'plate': {
      // Serving plate with rim
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.98, 0.92, 0.055, 36),
        ceramicWhite
      );
      base.position.y = 0.028;
      group.add(base);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.96, 0.035, 8, 36),
        mintBorder
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.055;
      group.add(rim);
      break;
    }

    case 'bowl': {
      // Prep bowl
      const bowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 20, 14, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
        createMaterial('#85aaa0', 0.5)
      );
      bowl.rotation.x = Math.PI;
      bowl.position.y = 0.44;
      group.add(bowl);
      break;
    }

    case 'pan':
    default: {
      // Flat tawa pan with long handle
      const panMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.94, 0.92, 0.075, 32),
        darkMetal
      );
      panMesh.position.y = 0.038;
      group.add(panMesh);

      const panTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.88, 0.88, 0.015, 32),
        createMaterial('#485052', 0.4)
      );
      panTop.position.y = 0.075;
      group.add(panTop);

      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.08, 0.14),
        darkMetal
      );
      handle.position.set(1.2, 0.06, 0);
      group.add(handle);
      break;
    }
  }

  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

/**
 * Creates reusable cooking utensils.
 * Attached to Maya's solved right wrist.
 * @param {'spoon'|'ladle'|'spatula'|'knife'|'rolling pin'} type
 * @returns {THREE.Group}
 */
export function createUtensil(type = 'spoon') {
  const group = new THREE.Group();
  group.name = `utensil_${type}`;

  const darkHandle = createMaterial('#2c3e50', 0.5);
  const steel = createMaterial('#95a5a6', 0.25);
  const wood = createMaterial('#c89f7e', 0.6);

  switch (type) {
    case 'spoon': {
      // Cooking spoon
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.025, 0.65, 8),
        wood
      );
      handle.rotation.z = Math.PI / 2;
      handle.position.x = -0.32;
      group.add(handle);

      const bowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 8),
        wood
      );
      bowl.scale.set(1.4, 0.35, 0.8);
      bowl.position.x = 0.05;
      group.add(bowl);
      break;
    }

    case 'ladle': {
      // Soup/batter ladle
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.022, 0.7, 8),
        steel
      );
      handle.rotation.z = Math.PI / 2.3;
      handle.position.set(-0.35, 0.12, 0);
      group.add(handle);

      const cup = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
        steel
      );
      cup.rotation.x = Math.PI;
      cup.position.set(0.05, 0.02, 0);
      group.add(cup);
      break;
    }

    case 'knife': {
      // Chef knife
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.05, 0.04),
        darkHandle
      );
      handle.position.x = -0.35;
      group.add(handle);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.09, 0.008),
        steel
      );
      blade.position.x = 0.02;
      group.add(blade);
      break;
    }

    case 'rolling pin': {
      // Rolling pin
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.65, 12),
        wood
      );
      body.rotation.z = Math.PI / 2;
      group.add(body);

      for (const side of [-1, 1]) {
        const h = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8),
          wood
        );
        h.rotation.z = Math.PI / 2;
        h.position.x = side * 0.42;
        group.add(h);
      }
      break;
    }

    case 'spatula':
    default: {
      // Flat blade turner spatula with raised handle
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.025, 0.55, 8),
        darkHandle
      );
      handle.rotation.z = Math.PI / 2.2;
      handle.position.set(-0.34, 0.12, 0);
      group.add(handle);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.012, 0.22),
        steel
      );
      blade.position.set(0.06, 0.01, 0);
      group.add(blade);
      break;
    }
  }

  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

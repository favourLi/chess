import * as THREE from 'three';
import { easeOutQuad } from './interactionUtils.js';

function pushMat(materials, mat, targetOpacity) {
  mat.userData.targetOpacity = targetOpacity;
  mat.transparent = true;
  materials.push(mat);
  return mat;
}

function buildMoveHint(root, variant, hintMove, materials, geometries, localY) {
  const color = hintMove.color ?? 0x33cc55;
  const op = hintMove.opacity ?? 0.55;

  if (variant === 'cross') {
    const mat = pushMat(
      materials,
      new THREE.MeshBasicMaterial({
        color,
        opacity: op,
        depthWrite: false
      }),
      op
    );
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.08), mat);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.08), mat);
    bar1.position.y = localY;
    bar2.position.y = localY;
    bar1.rotation.y = Math.PI / 4;
    bar2.rotation.y = -Math.PI / 4;
    root.add(bar1, bar2);
    geometries.push(bar1.geometry, bar2.geometry);
    return;
  }

  if (variant === 'grid') {
    const mat = pushMat(
      materials,
      new THREE.MeshBasicMaterial({
        color,
        opacity: op,
        depthWrite: false
      }),
      op
    );
    const s = 0.08;
    const off = 0.14;
    for (const [dx, dz] of [
      [-off, -off],
      [off, -off],
      [-off, off],
      [off, off]
    ]) {
      const g = new THREE.BoxGeometry(s, s * 0.4, s);
      const m = new THREE.Mesh(g, mat);
      m.position.set(dx, localY, dz);
      root.add(m);
      geometries.push(g);
    }
    return;
  }

  if (variant === 'rune') {
    const mat = pushMat(
      materials,
      new THREE.MeshBasicMaterial({
        color,
        opacity: op,
        depthWrite: false
      }),
      op
    );
    const r1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.025, 8, 32),
      mat
    );
    r1.rotation.x = -Math.PI / 2;
    r1.position.y = localY;
    const r2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.015, 8, 32),
      mat
    );
    r2.rotation.x = -Math.PI / 2;
    r2.position.y = localY + 0.01;
    root.add(r1, r2);
    geometries.push(r1.geometry, r2.geometry);
    return;
  }

  if (variant === 'mine') {
    const mat = pushMat(
      materials,
      new THREE.MeshBasicMaterial({
        color,
        opacity: op,
        depthWrite: false
      }),
      op
    );
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 8), mat);
    cone.position.y = localY + 0.1;
    root.add(cone);
    geometries.push(cone.geometry);
    return;
  }

  // dot (default classical)
  const mat = pushMat(
    materials,
    new THREE.MeshBasicMaterial({
      color,
      opacity: op,
      depthWrite: false
    }),
    op
  );
  const sph = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mat);
  sph.position.y = localY;
  root.add(sph);
  geometries.push(sph.geometry);
}

function buildCaptureHint(root, variant, hintCapture, materials, geometries, localY) {
  const color = hintCapture.color ?? 0xcc2222;
  const op = hintCapture.opacity ?? 0.9;

  if (variant === 'x') {
    const mat = pushMat(
      materials,
      new THREE.MeshBasicMaterial({
        color,
        opacity: op,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      op
    );
    const w = 0.06;
    const L = 0.5;
    const b1 = new THREE.Mesh(new THREE.PlaneGeometry(L, w), mat);
    const b2 = new THREE.Mesh(new THREE.PlaneGeometry(L, w), mat);
    b1.rotation.x = -Math.PI / 2;
    b2.rotation.x = -Math.PI / 2;
    b1.rotation.z = Math.PI / 4;
    b2.rotation.z = -Math.PI / 4;
    b1.position.y = localY;
    b2.position.y = localY;
    root.add(b1, b2);
    geometries.push(b1.geometry, b2.geometry);
    return;
  }

  if (variant === 'glow') {
    const mat = pushMat(
      materials,
      new THREE.MeshBasicMaterial({
        color,
        opacity: op * 0.85,
        depthWrite: false,
        depthTest: false,
        transparent: true
      }),
      op
    );
    const sph = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 20), mat);
    sph.position.y = localY + 0.05;
    root.add(sph);
    geometries.push(sph.geometry);
    return;
  }

  if (variant === 'shock') {
    const mat = pushMat(
      materials,
      new THREE.MeshBasicMaterial({
        color,
        opacity: op * 0.8,
        depthWrite: false
      }),
      op
    );
    const t1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.04, 8, 40),
      mat
    );
    t1.rotation.x = -Math.PI / 2;
    t1.position.y = localY;
    const t2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.025, 8, 40),
      mat
    );
    t2.rotation.x = -Math.PI / 2;
    t2.position.y = localY + 0.01;
    root.add(t1, t2);
    geometries.push(t1.geometry, t2.geometry);
    return;
  }

  if (variant === 'blood') {
    const mat = pushMat(
      materials,
      new THREE.MeshBasicMaterial({
        color: 0xcc2200,
        opacity: op,
        depthWrite: false
      }),
      op
    );
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat);
    drop.scale.set(0.85, 1.15, 0.85);
    drop.position.y = localY + 0.08;
    root.add(drop);
    geometries.push(drop.geometry);
    return;
  }

  // ring (default)
  const mat = pushMat(
    materials,
    new THREE.MeshBasicMaterial({
      color,
      opacity: op,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    }),
    op
  );
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.07, 12, 40),
    mat
  );
  torus.rotation.x = -Math.PI / 2;
  torus.position.y = localY;
  root.add(torus);
  geometries.push(torus.geometry);
}

/**
 * 可落点 / 可吃子提示（todo 二.2、二.3）：淡入 + 脉冲 + 吃子震动
 */
export function createMoveHint(scene, position, isCapture, animPreset) {
  const hintMove = animPreset.hintMove || {};
  const hintCapture = animPreset.hintCapture || {};
  const pulsePeriodMs = isCapture
    ? (hintCapture.pulsePeriodMs ?? 500)
    : (hintMove.pulsePeriodMs ?? 500);
  const fadeInMs = isCapture
    ? (hintCapture.fadeInMs ?? 200)
    : (hintMove.fadeInMs ?? 200);
  const variant = isCapture
    ? (hintCapture.variant || 'ring')
    : (hintMove.variant || 'dot');

  const start = performance.now();
  const root = new THREE.Group();
  const materials = [];
  const geometries = [];

  const localY = isCapture ? 0.02 : 0;

  if (isCapture) {
    buildCaptureHint(root, variant, hintCapture, materials, geometries, localY);
  } else {
    buildMoveHint(root, variant, hintMove, materials, geometries, localY);
  }

  root.position.copy(position);
  root.position.y = isCapture ? 0.12 : 0.1;
  scene.add(root);

  const capShake = isCapture ? (hintCapture.shakeAmplitude ?? 0.055) : 0;
  const base = position.clone();

  const update = (now) => {
    const fadeT = Math.min(1, (now - start) / fadeInMs);
    const fadeOpacity = easeOutQuad(fadeT);
    const pulse = 0.5 + 0.5 * Math.sin((now / pulsePeriodMs) * Math.PI * 2);
    const scalePulse = 1 + (isCapture ? 0.07 : 0.11) * pulse;

    root.scale.setScalar(scalePulse * (0.9 + 0.1 * fadeOpacity));

    materials.forEach((m) => {
      const target = m.userData.targetOpacity ?? 0.7;
      const pulseMix = isCapture ? 0.78 + 0.22 * pulse : 0.65 + 0.35 * pulse;
      m.opacity = target * fadeOpacity * pulseMix;
    });

    root.position.x = base.x;
    root.position.z = base.z;
    root.position.y = isCapture ? 0.12 : 0.1;
    if (isCapture && capShake > 0) {
      const sh = Math.sin(now * (Math.PI * 2) / (hintCapture.flashPeriodMs ?? 200)) * capShake * fadeOpacity;
      root.position.x = base.x + sh;
      root.position.z = base.z + Math.cos(now * 0.052) * capShake * 0.55 * fadeOpacity;
    }
  };

  const dispose = () => {
    scene.remove(root);
    geometries.forEach((g) => {
      if (g) g.dispose();
    });
    materials.forEach((m) => m.dispose());
  };

  return { root, update, dispose, start };
}

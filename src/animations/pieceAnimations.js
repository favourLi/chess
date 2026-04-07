import * as THREE from 'three';
import { playCaptureSound } from '../utils/styleSounds.js';

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeInQuad(t) {
  return t * t;
}

function setMeshOpacity(root, opacity) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      // 带 map 的字牌平面：关闭 transparent 时透明纹素会变成黑块，须保持透明混合或 alphaTest
      const isTextLike =
        m.map &&
        (m.type === 'MeshBasicMaterial' || m.type === 'MeshLambertMaterial');
      const fullyOpaque = opacity >= 0.999;

      if (isTextLike && fullyOpaque) {
        m.transparent = true;
        m.opacity = 1;
        m.depthWrite = true;
        if (m.alphaTest === undefined || m.alphaTest === 0) {
          m.alphaTest = 0.02;
        }
      } else {
        m.transparent = opacity < 0.999;
        m.opacity = opacity;
        m.depthWrite = opacity > 0.98;
      }
      m.needsUpdate = true;
    });
  });
}

export function resetMeshVisuals(root) {
  root.scale.set(1, 1, 1);
  setMeshOpacity(root, 1);
}

function moveDuration(dist, cfg) {
  const minD = cfg.minDuration ?? 0.5;
  const maxD = cfg.maxDuration ?? 1.35;
  const t = minD + dist * 0.14;
  return Math.min(maxD, Math.max(minD, t));
}

function spawnParticlePoints(scene, origin, color, count, speed, spreadY = 1.2) {
  if (count <= 0) return null;
  const positions = new Float32Array(count * 3);
  const velocities = [];
  const c = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = origin.x;
    positions[i * 3 + 1] = origin.y + 0.1;
    positions[i * 3 + 2] = origin.z;
    const th = Math.random() * Math.PI * 2;
    const ph = (Math.random() - 0.3) * spreadY;
    const sp = speed * (0.45 + Math.random() * 0.55);
    velocities.push(
      new THREE.Vector3(Math.cos(th) * sp, ph * sp, Math.sin(th) * sp)
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: c,
    size: 0.09,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    sizeAttenuation: true
  });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = 500;
  scene.add(pts);
  return { points: pts, velocities, geo };
}

function disposeParticleSystem(scene, sys) {
  if (!sys) return;
  scene.remove(sys.points);
  sys.geo.dispose();
  sys.points.material.dispose();
}

/**
 * 吃子动画（todo：碎裂 / 溶解 / 能量爆 / 碎片）
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D} victimMesh
 * @param {object} animPreset ANIM_PRESETS 项
 * @param {string} [styleId] 游戏风格 id，用于短音效
 */
export function animateCapture(scene, victimMesh, animPreset, styleId) {
  if (styleId) playCaptureSound(styleId);
  const cap = animPreset.captureAnim || {
    type: 'dissolve',
    durationMs: 380,
    particleColor: 0xffffff,
    particleCount: 12
  };
  const duration = cap.durationMs / 1000;
  const start = performance.now();
  const origin = victimMesh.position.clone();
  origin.y += 0.12;

  let particles = null;
  const type = cap.type;

  if (type === 'shatter' || type === 'fragments' || type === 'burst') {
    const cnt =
      cap.particleCount ||
      (type === 'burst' ? 20 : type === 'fragments' ? 18 : 12);
    const spd = type === 'burst' ? 2.8 : type === 'fragments' ? 2.2 : 1.8;
    particles = spawnParticlePoints(
      scene,
      origin,
      cap.particleColor ?? 0xffaa55,
      cnt,
      spd,
      type === 'burst' ? 1.6 : 1.0
    );
  }

  let flash = null;
  if (type === 'burst') {
    flash = new THREE.PointLight(0xa29bfe, 2.2, 9);
    flash.position.copy(origin);
    scene.add(flash);
  }

  let lastT = start;
  return new Promise((resolve) => {
    function tick(now) {
      const dt = Math.min(0.045, (now - lastT) / 1000);
      lastT = now;
      const u = Math.min(1, (now - start) / 1000 / duration);
      const e = easeOutQuad(u);

      if (particles) {
        const pos = particles.geo.attributes.position.array;
        const g = 5.5;
        for (let i = 0; i < particles.velocities.length; i++) {
          particles.velocities[i].y -= g * dt;
          pos[i * 3] += particles.velocities[i].x * dt;
          pos[i * 3 + 1] += particles.velocities[i].y * dt;
          pos[i * 3 + 2] += particles.velocities[i].z * dt;
        }
        particles.geo.attributes.position.needsUpdate = true;
        particles.points.material.opacity = 1 - easeInQuad(u);
      }

      if (type === 'dissolve') {
        setMeshOpacity(victimMesh, 1 - e);
        victimMesh.scale.setScalar(1 - e * 0.25);
      } else if (type === 'burst') {
        if (u < 0.28) {
          victimMesh.scale.setScalar(1 + 0.4 * Math.sin((u / 0.28) * Math.PI));
        } else {
          victimMesh.scale.setScalar(Math.max(0.05, 1.35 * (1 - easeInQuad((u - 0.28) / 0.72))));
        }
        setMeshOpacity(victimMesh, 1 - easeInQuad(Math.max(0, u - 0.12) / 0.88));
        if (flash) flash.intensity = 2.5 * (1 - u);
      } else {
        setMeshOpacity(victimMesh, 1 - e);
        victimMesh.scale.setScalar(1 - e * 0.4);
      }

      if (u < 1) {
        requestAnimationFrame(tick);
      } else {
        if (flash) {
          scene.remove(flash);
        }
        disposeParticleSystem(scene, particles);
        resetMeshVisuals(victimMesh);
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

/**
 * 走子动画（todo：弧线 / 直线 / 传送 / 冲击）
 */
export function animateMove(scene, board, moverMesh, toBoardX, toBoardZ, animPreset) {
  const cfg = animPreset.moveAnim || {
    path: 'linear',
    minDuration: 0.5,
    maxDuration: 1.2,
    arcHeight: 0.6,
    landBounce: true
  };

  const start = moverMesh.position.clone();
  const endW = board.boardToWorldCoords(toBoardX, toBoardZ);
  const end = new THREE.Vector3(endW.x, start.y, endW.z);

  const dist = start.distanceTo(end);
  const duration = moveDuration(dist, cfg);
  const path = cfg.path || 'linear';
  const t0 = performance.now();

  const mid = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5)
    .add(new THREE.Vector3(0, cfg.arcHeight ?? 0.7, 0));

  let trail = null;
  let speedLine = null;
  if (path === 'arc' || path === 'linear') {
    const trailGeo = new THREE.BufferGeometry();
    const maxPts = Math.ceil(24 * duration);
    const arr = new Float32Array(maxPts * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    trailGeo.setDrawRange(0, 0);
    const trailMat = new THREE.LineBasicMaterial({
      color: path === 'arc' ? 0xd4af37 : 0x74b9ff,
      transparent: true,
      opacity: 0.55
    });
    trail = new THREE.Line(trailGeo, trailMat);
    trail.renderOrder = 400;
    scene.add(trail);
    trail.userData = { arr, count: 0, maxPts };
  }
  if (path === 'linear' && cfg.speedLines) {
    const sg = new THREE.BufferGeometry();
    const maxPts = Math.ceil(18 * duration);
    const arr2 = new Float32Array(maxPts * 3);
    sg.setAttribute('position', new THREE.BufferAttribute(arr2, 3));
    sg.setDrawRange(0, 0);
    const sm = new THREE.LineBasicMaterial({
      color: 0xffa726,
      transparent: true,
      opacity: 0.45
    });
    speedLine = new THREE.Line(sg, sm);
    speedLine.renderOrder = 399;
    scene.add(speedLine);
    speedLine.userData = { arr: arr2, count: 0, maxPts };
  }

  return new Promise((resolve) => {
    function cleanupTrail() {
      if (trail) {
        scene.remove(trail);
        trail.geometry.dispose();
        trail.material.dispose();
        trail = null;
      }
      if (speedLine) {
        scene.remove(speedLine);
        speedLine.geometry.dispose();
        speedLine.material.dispose();
        speedLine = null;
      }
    }

    function samplePos(u) {
      if (path === 'arc') {
        const t = easeInOutQuad(u);
        const a = (1 - t) * (1 - t);
        const b = 2 * (1 - t) * t;
        const c = t * t;
        return new THREE.Vector3()
          .addScaledVector(start, a)
          .addScaledVector(mid, b)
          .addScaledVector(end, c);
      }
      if (path === 'charge') {
        const t = easeInOutQuad(u);
        const p = new THREE.Vector3().lerpVectors(start, end, t);
        p.y =
          start.y +
          0.22 * Math.sin(t * Math.PI * 3) * (1 - t) +
          0.08 * Math.sin(t * Math.PI * 6) * (1 - t);
        return p;
      }
      return new THREE.Vector3().lerpVectors(start, end, easeInOutQuad(u));
    }

    function tick(now) {
      const raw = (now - t0) / 1000 / duration;
      let u = Math.min(1, raw);

      if (path === 'teleport') {
        if (raw < 0.38) {
          moverMesh.position.copy(start);
          moverMesh.scale.setScalar(
            Math.max(0.05, 1 - easeInQuad(raw / 0.38) * 0.94)
          );
        } else if (raw < 0.43) {
          moverMesh.position.copy(end);
          moverMesh.scale.setScalar(0.05);
        } else {
          const t2 = Math.min(1, (raw - 0.43) / 0.57);
          moverMesh.position.copy(end);
          moverMesh.scale.setScalar(0.05 + 0.95 * easeOutQuad(t2));
        }
      } else {
        const p = samplePos(u);
        moverMesh.position.copy(p);
      }

      if (trail && path !== 'teleport') {
        const td = trail.userData;
        if (td.count < td.maxPts) {
          const i = td.count * 3;
          td.arr[i] = moverMesh.position.x;
          td.arr[i + 1] = moverMesh.position.y;
          td.arr[i + 2] = moverMesh.position.z;
          td.count++;
          trail.geometry.setDrawRange(0, td.count);
          trail.geometry.attributes.position.needsUpdate = true;
        }
      }
      if (speedLine && path !== 'teleport') {
        const td = speedLine.userData;
        if (td.count < td.maxPts) {
          const i = td.count * 3;
          td.arr[i] = moverMesh.position.x;
          td.arr[i + 1] = moverMesh.position.y;
          td.arr[i + 2] = moverMesh.position.z;
          td.count++;
          speedLine.geometry.setDrawRange(0, td.count);
          speedLine.geometry.attributes.position.needsUpdate = true;
        }
      }

      if (raw < 1) {
        requestAnimationFrame(tick);
      } else {
        moverMesh.position.copy(end);
        resetMeshVisuals(moverMesh);

        const bounceMs =
          cfg.landBounce && path !== 'teleport' ? 140 : 0;
        if (bounceMs <= 0) {
          cleanupTrail();
          resolve();
          return;
        }
        const b0 = performance.now();
        const baseY = end.y;
        function bounceTick(tn) {
          const b = (tn - b0) / bounceMs;
          if (b >= 1) {
            moverMesh.position.y = baseY;
            cleanupTrail();
            resolve();
            return;
          }
          moverMesh.position.y = baseY + 0.11 * Math.sin(b * Math.PI);
          requestAnimationFrame(bounceTick);
        }
        requestAnimationFrame(bounceTick);
      }
    }

    requestAnimationFrame(tick);
  });
}

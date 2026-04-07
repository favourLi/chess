import * as THREE from 'three';
import { easeInOutQuad } from './interactionUtils.js';

const DEFAULT_SEL = {
  durationMs: 300,
  floatY: 0.07,
  scale: 1.06,
  ringColor: 0xffd700,
  ringColorInner: 0xfff8dc,
  ringOpacity: 0.92,
  shadowOpacity: 0.38,
  shadowRadius: 0.55
};

/**
 * 选中：光环 + 轻微上浮 + 底部投影（todo 二.1）
 */
export function attachSelectionVisual(piece, animPreset) {
  detachSelectionVisual(piece);
  const cfg = { ...DEFAULT_SEL, ...(animPreset.selection || {}) };

  const geo = piece.geometry;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const sx = piece.scale.x;
  const sy = piece.scale.y;
  const topY = bb.max.y * sy;
  const rx = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.5 * sx;
  const r = Math.max(0.36, rx * 1.08);

  const group = new THREE.Group();
  group.name = 'selectionRing';

  const ringMat = new THREE.MeshBasicMaterial({
    color: cfg.ringColor,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(r, 0.022, 10, 48),
    ringMat
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = topY + 0.02;
  group.add(ring);

  const innerMat = new THREE.MeshBasicMaterial({
    color: cfg.ringColorInner,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(r * 1.08, 0.01, 8, 48),
    innerMat
  );
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = topY + 0.018;
  group.add(inner);

  const shadowGeo = new THREE.CircleGeometry(cfg.shadowRadius, 32);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = bb.min.y * sy + 0.02;
  group.add(shadow);

  piece.add(group);

  const baseY = piece.position.y;
  const baseScale = piece.scale.x;
  piece.userData._selectionVisual = {
    group,
    ringMat,
    innerMat,
    shadowMat,
    baseY,
    baseScale,
    t0: performance.now(),
    durationMs: cfg.durationMs,
    floatY: cfg.floatY,
    targetScale: cfg.scale,
    shadowTargetOpacity: cfg.shadowOpacity,
    ringOpacityMax: cfg.ringOpacity
  };
}

export function detachSelectionVisual(piece) {
  const data = piece?.userData?._selectionVisual;
  if (!data) return;

  const g = data.group;
  if (g && g.parent) g.parent.remove(g);
  data.ringMat?.dispose();
  data.innerMat?.dispose();
  data.shadowMat?.dispose();
  g?.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });

  piece.position.y = data.baseY;
  piece.scale.setScalar(data.baseScale);
  delete piece.userData._selectionVisual;
}

/** 每帧推进选中态过渡 */
export function tickSelectionVisual(piece, now) {
  const data = piece?.userData?._selectionVisual;
  if (!data) return;

  const raw = (now - data.t0) / data.durationMs;
  const t = Math.min(1, Math.max(0, raw));
  const e = easeInOutQuad(t);

  piece.position.y = data.baseY + data.floatY * e;
  const s = data.baseScale * (1 + (data.targetScale - 1) * e);
  piece.scale.setScalar(s);

  data.shadowMat.opacity = data.shadowTargetOpacity * e;

  const pulse = 1 + 0.04 * Math.sin(now * 0.004);
  const ro = data.ringOpacityMax * e * (0.92 + 0.08 * pulse);
  data.ringMat.opacity = ro;
  data.innerMat.opacity = ro * 0.65;
}

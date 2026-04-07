import * as THREE from 'three';
import { loadPBRMaterials, getCurrentPBRMaterials } from './pbrMaterialLoader.js';

/**
 * 加载指定风格的PBR材质。
 * @param {string} style - 风格名称
 * @returns {Promise<{ board: THREE.MeshStandardMaterial, red: THREE.MeshStandardMaterial, black: THREE.MeshStandardMaterial }>}
 */
export function loadTextures(style) {
  return loadPBRMaterials(style);
}

/**
 * 获取当前风格的PBR材质（如果已加载）
 * @returns {{ board: THREE.MeshStandardMaterial, red: THREE.MeshStandardMaterial, black: THREE.MeshStandardMaterial } | null}
 */
export function getCurrentTextures() {
  return getCurrentPBRMaterials();
}

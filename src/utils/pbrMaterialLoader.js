import * as THREE from 'three';
import { textureManager } from '../assets/textures/TextureManager.js';
import { SKIN_PRESETS, STYLE_KEYS } from '../config/stylePresets.js';

function setupMapRepeat(tex, rx, ry) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
}

/**
 * 配置 PBR 贴图与色彩空间；位移默认关闭，避免棋子/棋盘在法线方向"抬高"产生缝隙。
 */
function configurePBRMaterial(material, textures, repeatXY = null) {
  material.map = textures.baseColor;
  material.normalMap = textures.normal;
  material.roughnessMap = textures.roughness;
  material.displacementMap = textures.height;

  const [rx, ry] = repeatXY || [1, 1];
  [textures.baseColor, textures.normal, textures.roughness, textures.height].forEach(
    (t) => setupMapRepeat(t, rx, ry)
  );

  // 支持 metallic 贴图（如果存在）
  if (textures.metallic) {
    material.metalnessMap = textures.metallic;
    setupMapRepeat(textures.metallic, rx, ry);
    material.metalnessMap.colorSpace = THREE.NoColorSpace;
    material.metalnessMap.anisotropy = 8;
  }

  material.map.colorSpace = THREE.SRGBColorSpace;
  material.normalMap.colorSpace = THREE.NoColorSpace;
  material.roughnessMap.colorSpace = THREE.NoColorSpace;
  material.displacementMap.colorSpace = THREE.NoColorSpace;

  material.map.anisotropy = 8;
  material.normalMap.anisotropy = 8;
  material.roughnessMap.anisotropy = 8;
  material.displacementMap.anisotropy = 4;

  // 高度贴图保留但不位移，避免与棋盘表面错位
  material.displacementScale = 0;
  material.displacementBias = 0;

  material.needsUpdate = true;
}

/**
 * 创建棋盘PBR材质
 * @param {object} textures - PBR纹理对象
 * @param {string} style - 风格名称
 * @returns {THREE.MeshStandardMaterial}
 */
function createBoardMaterial(textures, style) {
  const p = SKIN_PRESETS[style].classicalPBR.board;
  const material = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    color: 0xffffff,
    roughness: p.roughness,
    metalness: p.metalness,
    emissive: p.emissive,
    emissiveIntensity: p.emissiveIntensity,
    envMapIntensity: p.envMapIntensity
  });
  configurePBRMaterial(material, textures, [2.2, 2.6]);
  return material;
}

/**
 * 创建棋子PBR材质
 * @param {object} textures - PBR纹理对象
 * @param {'red'|'black'} side
 * @param {string} style - 风格名称
 * @returns {THREE.MeshStandardMaterial}
 */
function createPieceMaterial(textures, side, style) {
  const cfg = SKIN_PRESETS[style].classicalPBR;
  const base = cfg.piece;
  const tint = side === 'red' ? cfg.pieceRed : cfg.pieceBlack;
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: base.roughness,
    metalness: base.metalness,
    envMapIntensity: base.envMapIntensity
  });
  configurePBRMaterial(material, textures, [1, 1]);
  material.emissive.setHex(tint.emissive);
  material.emissiveIntensity = tint.emissiveIntensity;

  return material;
}

/**
 * 加载指定风格的PBR材质
 * @param {string} style - 风格名称
 * @returns {Promise<{ board: THREE.MeshStandardMaterial, red: THREE.MeshStandardMaterial, black: THREE.MeshStandardMaterial }>}
 */
export function loadPBRMaterials(style) {
  const textures = textureManager.getCurrentTextures();

  // 加载棋盘纹理（支持可选的 metallic 贴图）
  const loadBoardTextures = () => {
    const promises = [
      textureManager.loadTexture(textures.board.baseColor),
      textureManager.loadTexture(textures.board.normal),
      textureManager.loadTexture(textures.board.roughness),
      textureManager.loadTexture(textures.board.height)
    ];
    if (textures.board.metallic) {
      promises.push(textureManager.loadTexture(textures.board.metallic));
    }
    return Promise.all(promises).then(([baseColor, normal, roughness, height, metallic]) => ({
      baseColor, normal, roughness, height, metallic
    }));
  };

  // 加载红方棋子纹理（支持可选的 metallic 贴图）
  const loadRedTextures = () => {
    const promises = [
      textureManager.loadTexture(textures.pieceRed.baseColor),
      textureManager.loadTexture(textures.pieceRed.normal),
      textureManager.loadTexture(textures.pieceRed.roughness),
      textureManager.loadTexture(textures.pieceRed.height)
    ];
    if (textures.pieceRed.metallic) {
      promises.push(textureManager.loadTexture(textures.pieceRed.metallic));
    }
    return Promise.all(promises).then(([baseColor, normal, roughness, height, metallic]) => ({
      baseColor, normal, roughness, height, metallic
    }));
  };

  // 加载黑方棋子纹理（支持可选的 metallic 贴图）
  const loadBlackTextures = () => {
    const promises = [
      textureManager.loadTexture(textures.pieceBlack.baseColor),
      textureManager.loadTexture(textures.pieceBlack.normal),
      textureManager.loadTexture(textures.pieceBlack.roughness),
      textureManager.loadTexture(textures.pieceBlack.height)
    ];
    if (textures.pieceBlack.metallic) {
      promises.push(textureManager.loadTexture(textures.pieceBlack.metallic));
    }
    return Promise.all(promises).then(([baseColor, normal, roughness, height, metallic]) => ({
      baseColor, normal, roughness, height, metallic
    }));
  };

  return Promise.all([
    loadBoardTextures(),
    loadRedTextures(),
    loadBlackTextures()
  ])
  .then(([boardTextures, redTextures, blackTextures]) => {
    const boardMaterial = createBoardMaterial(boardTextures, style);
    const redMaterial = createPieceMaterial(redTextures, 'red', style);
    const blackMaterial = createPieceMaterial(blackTextures, 'black', style);

    return { board: boardMaterial, red: redMaterial, black: blackMaterial };
  })
  .catch((err) => {
    console.error(`[PBR materials ${style}]`, err);
    throw err;
  });
}

/**
 * 获取当前风格的PBR材质（如果已加载）
 * @returns {{ board: THREE.MeshStandardMaterial, red: THREE.MeshStandardMaterial, black: THREE.MeshStandardMaterial } | null}
 */
export function getCurrentPBRMaterials() {
  // 这里可以添加材质缓存逻辑
  return null;
}

/**
 * 清除材质缓存
 */
export function clearPBRMaterials() {
  // 清除材质缓存逻辑
}
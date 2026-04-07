import * as THREE from 'three';
import { CLASSICAL_PBR_TEXTURES } from '../assets/textures/classical/classicalTextureUrls.js';
import { SKIN_PRESETS, STYLE_KEYS } from '../config/stylePresets.js';

function getClassicalPBRConfig() {
  return SKIN_PRESETS[STYLE_KEYS.CLASSICAL].classicalPBR;
}

/** @type {{ board: THREE.MeshStandardMaterial, red: THREE.MeshStandardMaterial, black: THREE.MeshStandardMaterial } | null} */
let _materialCache = null;
/** @type {Promise<typeof _materialCache> | null} */
let _loading = null;

function setupMapRepeat(tex, rx, ry) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
}

/**
 * 配置 PBR 贴图与色彩空间；位移默认关闭，避免棋子/棋盘在法线方向”抬高”产生缝隙。
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
 * @returns {THREE.MeshStandardMaterial}
 */
function createBoardMaterial(textures) {
  const p = getClassicalPBRConfig().board;
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
 * 创建棋子PBR材质（仍为 MeshStandard + 原贴图；参数来自 stylePresets 古典定义）
 * @param {object} textures - PBR纹理对象
 * @param {'red'|'black'} side
 * @returns {THREE.MeshStandardMaterial}
 */
function createPieceMaterial(textures, side) {
  const cfg = getClassicalPBRConfig();
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
 * 加载古典风格PBR材质（单例缓存）
 * @returns {Promise<{ board: THREE.MeshStandardMaterial, red: THREE.MeshStandardMaterial, black: THREE.MeshStandardMaterial }>}
 */
export function loadClassicalPBRMaterials() {
  if (_materialCache) return Promise.resolve(_materialCache);
  if (_loading) return _loading;

  const loader = new THREE.TextureLoader();
  const loadTexture = (url) =>
    new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

  _loading = Promise.all([
    // 加载棋盘纹理
    Promise.all([
      loadTexture(CLASSICAL_PBR_TEXTURES.board.baseColor),
      loadTexture(CLASSICAL_PBR_TEXTURES.board.normal),
      loadTexture(CLASSICAL_PBR_TEXTURES.board.roughness),
      loadTexture(CLASSICAL_PBR_TEXTURES.board.height)
    ]).then(([baseColor, normal, roughness, height]) => ({
      baseColor, normal, roughness, height
    })),

    // 加载红方棋子纹理
    Promise.all([
      loadTexture(CLASSICAL_PBR_TEXTURES.pieceRed.baseColor),
      loadTexture(CLASSICAL_PBR_TEXTURES.pieceRed.normal),
      loadTexture(CLASSICAL_PBR_TEXTURES.pieceRed.roughness),
      loadTexture(CLASSICAL_PBR_TEXTURES.pieceRed.height)
    ]).then(([baseColor, normal, roughness, height]) => ({
      baseColor, normal, roughness, height
    })),

    // 加载黑方棋子纹理
    Promise.all([
      loadTexture(CLASSICAL_PBR_TEXTURES.pieceBlack.baseColor),
      loadTexture(CLASSICAL_PBR_TEXTURES.pieceBlack.normal),
      loadTexture(CLASSICAL_PBR_TEXTURES.pieceBlack.roughness),
      loadTexture(CLASSICAL_PBR_TEXTURES.pieceBlack.height)
    ]).then(([baseColor, normal, roughness, height]) => ({
      baseColor, normal, roughness, height
    }))
  ])
  .then(([boardTextures, redTextures, blackTextures]) => {
    const boardMaterial = createBoardMaterial(boardTextures);
    const redMaterial = createPieceMaterial(redTextures, 'red');
    const blackMaterial = createPieceMaterial(blackTextures, 'black');

    _materialCache = { board: boardMaterial, red: redMaterial, black: blackMaterial };
    _loading = null;
    return _materialCache;
  })
  .catch((err) => {
    _loading = null;
    console.error('[classical PBR materials]', err);
    throw err;
  });

  return _loading;
}

/**
 * 获取材质缓存（如果已加载）
 * @returns {{ board: THREE.MeshStandardMaterial, red: THREE.MeshStandardMaterial, black: THREE.MeshStandardMaterial } | null}
 */
export function getClassicalPBRMaterials() {
  return _materialCache;
}

/**
 * 清除材质缓存
 */
export function clearClassicalPBRMaterials() {
  _materialCache = null;
  _loading = null;
}
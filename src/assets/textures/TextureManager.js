/**
 * 材质管理器 - 负责加载和管理不同风格的PBR材质
 */
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { CLASSICAL_PBR_TEXTURES } from './classical/classicalTextureUrls.js';
import { MODERN_PBR_TEXTURES } from './modern/modernTextureUrls.js';
import { FANTASY_PBR_TEXTURES } from './fantasy/fantasyTextureUrls.js';
import { WAR_PBR_TEXTURES } from './war/warTextureUrls.js';

export class TextureManager {
  constructor() {
    this.currentStyle = 'classical'; // 默认风格
    this.textures = {
      classical: CLASSICAL_PBR_TEXTURES,
      modern: MODERN_PBR_TEXTURES,
      fantasy: FANTASY_PBR_TEXTURES,
      war: WAR_PBR_TEXTURES
    };
    this.textureCache = new Map();
    this.loadingCache = new Map();
    this.loader = new THREE.TextureLoader();
    this.envMapLoader = new EXRLoader();
    /** @type {Map<string, THREE.Texture>} */
    this.envMapCache = new Map();
    /** @type {Map<string, Promise<THREE.Texture>>} */
    this.envMapLoadingCache = new Map();
    /** 环境贴图文件名映射 */
    this.envMapFiles = {
      classical: 'classical.exr',
      modern: 'modern.exr',
      fantasy: 'fantasy.exr',
      war: 'war.exr'
    };
  }

  /**
   * 获取当前风格的材质
   * @returns {object} 当前风格的PBR材质
   */
  getCurrentTextures() {
    return this.textures[this.currentStyle];
  }

  /**
   * 切换材质风格
   * @param {string} style - 风格名称 ('classical', 'modern', 'fantasy', 'war')
   */
  setStyle(style) {
    if (this.textures[style]) {
      this.currentStyle = style;
      console.log(`材质风格已切换到: ${style}`);
      return true;
    }
    console.warn(`未知的材质风格: ${style}`);
    return false;
  }

  /**
   * 获取所有可用风格
   * @returns {Array} 风格名称数组
   */
  getAvailableStyles() {
    return Object.keys(this.textures);
  }

  /**
   * 获取风格名称的中文名称
   * @param {string} style - 风格名称
   * @returns {string} 风格中文名称
   */
  getStyleDisplayName(style) {
    const styleNames = {
      classical: '古典风格',
      modern: '现代简约',
      fantasy: '奇幻魔法',
      war: '战争史诗'
    };
    return styleNames[style] || style;
  }

  /**
   * 预加载材质
   * @param {string} style - 风格名称
   */
  preloadTextures(style) {
    const textures = this.textures[style];
    if (!textures) return;

    // 预加载棋盘材质
    const boardTextures = textures.board;
    this.loadTexture(boardTextures.baseColor);
    this.loadTexture(boardTextures.normal);
    this.loadTexture(boardTextures.roughness);
    this.loadTexture(boardTextures.height);
    if (boardTextures.metallic) {
      this.loadTexture(boardTextures.metallic);
    }

    // 预加载红色棋子材质
    const redTextures = textures.pieceRed;
    this.loadTexture(redTextures.baseColor);
    this.loadTexture(redTextures.normal);
    this.loadTexture(redTextures.roughness);
    this.loadTexture(redTextures.height);
    if (redTextures.metallic) {
      this.loadTexture(redTextures.metallic);
    }

    // 预加载黑色棋子材质
    const blackTextures = textures.pieceBlack;
    this.loadTexture(blackTextures.baseColor);
    this.loadTexture(blackTextures.normal);
    this.loadTexture(blackTextures.roughness);
    this.loadTexture(blackTextures.height);
    if (blackTextures.metallic) {
      this.loadTexture(blackTextures.metallic);
    }
  }

  /**
   * 加载单个材质（使用 Three.js TextureLoader）
   * @param {string} textureUrl - 材质URL
   * @returns {Promise<THREE.Texture>}
   */
  loadTexture(textureUrl) {
    // 检查缓存
    if (this.textureCache.has(textureUrl)) {
      return Promise.resolve(this.textureCache.get(textureUrl));
    }

    // 检查是否正在加载
    if (this.loadingCache.has(textureUrl)) {
      return this.loadingCache.get(textureUrl);
    }

    // 创建加载 Promise
    const promise = new Promise((resolve, reject) => {
      this.loader.load(
        textureUrl,
        (texture) => {
          // 设置各向异性过滤以提高纹理质量
          texture.anisotropy = 8;
          this.textureCache.set(textureUrl, texture);
          this.loadingCache.delete(textureUrl);
          resolve(texture);
        },
        undefined,
        (err) => {
          this.loadingCache.delete(textureUrl);
          reject(err);
        }
      );
    });

    this.loadingCache.set(textureUrl, promise);
    return promise;
  }

  /**
   * 获取材质URL
   * @param {string} type - 材质类型 ('board', 'pieceRed', 'pieceBlack')
   * @param {string} channel - 通道 ('baseColor', 'normal', 'roughness', 'height', 'metallic')
   * @returns {string} 材质URL
   */
  getTextureUrl(type, channel) {
    const textures = this.getCurrentTextures();
    return textures[type][channel];
  }

  /**
   * 加载环境贴图（EXR 格式）
   * @param {string} style - 风格名称
   * @returns {Promise<THREE.Texture>}
   */
  loadEnvMap(style) {
    const fileName = this.envMapFiles[style];
    if (!fileName) {
      console.warn(`未找到风格 ${style} 的环境贴图`);
      return Promise.reject(new Error(`No env map for style: ${style}`));
    }

    // 检查缓存
    if (this.envMapCache.has(style)) {
      return Promise.resolve(this.envMapCache.get(style));
    }

    // 检查是否正在加载
    if (this.envMapLoadingCache.has(style)) {
      return this.envMapLoadingCache.get(style);
    }

    // public/exrs/*.exr；与 webpack publicPath 对齐（避免子路径部署时 404）
    const publicBase =
      typeof __webpack_public_path__ === 'string' && __webpack_public_path__
        ? __webpack_public_path__.replace(/\/?$/, '/')
        : '/';
    const exrUrl = `${publicBase}exrs/${fileName}`.replace(/([^:]\/)\/+/g, '$1');

    const promise = fetch(exrUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load env map: ${response.statusText}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        // parse() 返回的是数据描述对象，不是 Texture；须包成 DataTexture（与 EXRLoader.load 内部一致）
        const texData = this.envMapLoader.parse(arrayBuffer);
        const texture = new THREE.DataTexture(
          texData.data,
          texData.width,
          texData.height,
          texData.format,
          texData.type
        );
        texture.colorSpace =
          texData.colorSpace || THREE.LinearSRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.flipY = false;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.needsUpdate = true;
        this.envMapCache.set(style, texture);
        this.envMapLoadingCache.delete(style);
        return texture;
      })
      .catch((err) => {
        this.envMapLoadingCache.delete(style);
        console.error(
          `加载环境贴图失败（请把 EXR 放到 public/exrs/${fileName} 或通过 devServer 能访问的同级路径）:`,
          err
        );
        throw err;
      });

    this.envMapLoadingCache.set(style, promise);
    return promise;
  }

  /**
   * 获取当前风格的环境贴图
   * @returns {Promise<THREE.Texture>}
   */
  loadCurrentEnvMap() {
    return this.loadEnvMap(this.currentStyle);
  }

  /**
   * 清除环境贴图缓存
   */
  clearEnvMapCache() {
    this.envMapCache.forEach((texture) => {
      texture.dispose();
    });
    this.envMapCache.clear();
    this.envMapLoadingCache.clear();
  }
}

// 创建全局材质管理器实例
export const textureManager = new TextureManager();

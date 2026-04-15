import * as THREE from 'three';
import { textureManager } from './assets/textures/TextureManager.js';
import { GameScene } from './scenes/GameScene.js';
import { GameUI } from './ui/GameUI.js';

/** 重复打开同一 URL 时走内存缓存，减轻二次进入负担 */
THREE.Cache.enabled = true;

class ChessGame {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.gameScene = null;
    this.gameUI = null;
    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupLighting();
    this.setupGame();
    this.setupEventListeners();
    this.animate();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('gameCanvas'),
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;

    const cap = this.renderer.capabilities.getMaxAnisotropy();
    const mobile = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 768px)')?.matches;
    textureManager.setMaxAnisotropy(Math.max(2, Math.min(8, Math.floor(cap * (mobile ? 0.65 : 1)))));
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2c3e50);
    this.scene.fog = new THREE.Fog(0x2c3e50, 10, 50);
  }

  setupCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 15, 15);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);
  }

  setupLighting() {
    this._ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this._ambientLight);

    this._directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this._directionalLight.position.set(10, 20, 10);
    this._directionalLight.castShadow = true;
    this._directionalLight.shadow.camera.left = -20;
    this._directionalLight.shadow.camera.right = 20;
    this._directionalLight.shadow.camera.top = 20;
    this._directionalLight.shadow.camera.bottom = -20;
    this._directionalLight.shadow.mapSize.width = 2048;
    this._directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(this._directionalLight);

    this._pointLight = new THREE.PointLight(0x3498db, 0.5, 30);
    this._pointLight.position.set(-5, 10, -5);
    this.scene.add(this._pointLight);

    // 天光略冷、地光偏暖木色，衬托棋具（古典风格下与 stylePresets 柔光一致）
    this._hemisphereLight = new THREE.HemisphereLight(0xc8dae8, 0x6b5344, 0.36);
    this.scene.add(this._hemisphereLight);
  }

  setupGame() {
    this.gameScene = new GameScene(this.scene, this.camera, {
      ambient: this._ambientLight,
      directional: this._directionalLight,
      point: this._pointLight,
      renderer: this.renderer
    });
    this.gameUI = new GameUI({
      getGameScene: () => this.gameScene,
      applyStyleConfig: (cfg) => this.gameScene.applyStyleConfig(cfg)
    });

    // 首帧后空闲时预取当前皮肤 PBR 与环境贴图，不阻塞进入菜单（命中缓存后切换皮肤更快）
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 800));
    idle(
      () => {
        try {
          textureManager.preloadTextures(textureManager.currentStyle);
          textureManager.loadEnvMap(textureManager.currentStyle).catch(() => {});
        } catch {
          /* ignore */
        }
      },
      { timeout: 5000 }
    );
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());
    // 鼠标和触摸事件将在GameScene中处理
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // 更新游戏逻辑
    if (this.gameScene) {
      this.gameScene.update();
    }
    if (this.gameUI && this.gameScene) {
      this.gameUI.syncGameState(this.gameScene);
    }

    // 渲染场景
    this.renderer.render(this.scene, this.camera);
  }
}

// 隐藏加载界面
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loading').style.display = 'none';
  }, 1000);
});

// 启动游戏
const game = new ChessGame();

export default ChessGame;

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ChessBoard } from '../chess/ChessBoard.js';
import { ChessPieces } from '../chess/ChessPieces.js';
import { CameraController } from '../utils/CameraController.js';
import { ChessRules } from '../chess/ChessRules.js';
import {
  getSkinPreset,
  getAnimPreset,
  STYLE_KEYS
} from '../config/stylePresets.js';
import {
  attachSelectionVisual,
  detachSelectionVisual,
  tickSelectionVisual
} from '../animations/selectionVisual.js';
import { createMoveHint as createMoveHintMesh } from '../animations/moveHintMeshes.js';
import { loadPBRMaterials } from '../utils/pbrMaterialLoader.js';
import { textureManager } from '../assets/textures/TextureManager.js';
import {
  animateCapture,
  animateMove,
  resetMeshVisuals
} from '../animations/pieceAnimations.js';
import {
  filterArithmeticMoves,
  computeReplayStateAtStep,
  getReplayMaxStep
} from '../replay/replayState.js';

export class GameScene {
  constructor(scene, camera, lights = null) {
    this.scene = scene;
    this.camera = camera;
    this.lights = lights;
    /** @type {THREE.WebGLRenderer | null} */
    this.renderer = lights?.renderer ?? null;
    /** @type {THREE.PMREMGenerator | null} */
    this._pmremGenerator = null;
    /** @type {THREE.WebGLRenderTarget | null} */
    this._envRenderTarget = null;
    this._pieceAnimBusy = false;
    /** 联机动画世代：新 state 打断未完成的上一手动画 */
    this._onlineAnimGen = 0;
    this.board = null;
    this.pieces = null;
    this.cameraController = null;
    this.selectedPiece = null;
    this.currentPlayer = 'red'; // 'red' 或 'black'
    this.chessRules = null;
    this.gameOver = false;
    this.gameOverUI = null;
    this.moveHints = [];
    this._moveHintForPiece = null;
    this.halfMoveCount = 0;
    this.uiStatusLine = '';
    /** @type {'local'|'online'|'replay'} */
    this.networkMode = 'local';
    /** @type {object | null} */
    this._replayDoc = null;
    /** @type {object[]} */
    this._replayPieceMoves = [];
    this._replayStep = 0;
    /** @type {'red'|'black'|null} */
    this.myOnlineColor = null;
    /** @type {import('../net/onlineClient.js').OnlineGameClient | null} */
    this._onlineClient = null;
    this._shownOnlineEnd = false;
    /** 防止快速切换皮肤时旧的环境加载回调覆盖新状态 */
    this._envApplyGeneration = 0;
    this.animPreset = getAnimPreset(STYLE_KEYS.CLASSICAL);
    /** @type {string} 游戏风格，用于吃子音效等 */
    this.animStyleId = STYLE_KEYS.CLASSICAL;
    this._lastTouchTap = null;
    this.init();
  }

  init() {
    this.createBoard();
    this.createPieces();
    this.setupCameraController();
    this.setupChessRules();
    this.setupRaycaster();
    this.setupEventListeners();
    this.applyStyleConfig({
      skin: STYLE_KEYS.CLASSICAL,
      animStyle: STYLE_KEYS.CLASSICAL
    });
  }

  /**
   * 应用皮肤与游戏风格（落点/选中等）。由菜单在开局前或预览时调用。
   * @param {{ skin: string, animStyle: string }} cfg
   */
  applyStyleConfig(cfg) {
    // 更新 TextureManager 的当前风格
    textureManager.setStyle(cfg.skin);

    const skin = getSkinPreset(cfg.skin);
    const anim = getAnimPreset(cfg.animStyle);
    this.animPreset = anim;
    this.animStyleId = cfg.animStyle;
    this.skinStyleId = cfg.skin;

    if (this.board) this.board.applySkinPreset(skin);
    if (this.pieces) this.pieces.applySkinPreset(skin);

    // 加载PBR材质
    loadPBRMaterials(cfg.skin)
      .then((materials) => {
        if (this.board) this.board.applyBoardMaterial(materials.board);
        if (this.pieces) {
          this.pieces.applyPieceMaterial('red', materials.red);
          this.pieces.applyPieceMaterial('black', materials.black);
        }
      })
      .catch(() => {});

    // 环境贴图：EXR 需经 PMREM 预过滤后赋给 scene.environment；另将 HDR 设为 background 才能在画面上「看见」环境
    this._envApplyGeneration += 1;
    const envGen = this._envApplyGeneration;
    textureManager
      .loadEnvMap(cfg.skin)
      .then((equirectTex) => {
        if (envGen !== this._envApplyGeneration) return;
        this._applyEnvironmentFromEquirectangular(equirectTex);
        // 若环境贴图已成功应用，则先不使用额外灯光，便于观察 IBL 效果
        this._setExtraLightsEnabled(false);
      })
      .catch((err) => {
        if (envGen !== this._envApplyGeneration) return;
        console.warn('[GameScene] EXR 环境未加载:', err?.message || err);
        this._disposeSceneEnvironment();
        this._applyRoomEnvironmentFallback();
        // EXR 加载失败时仍保留传统灯光，避免画面过暗
        this._setExtraLightsEnabled(true);
      });

    this.scene.background = new THREE.Color(skin.scene.background);
    if (this.scene.fog) {
      this.scene.fog.color.setHex(skin.scene.fogColor);
      this.scene.fog.near = skin.scene.fogNear;
      this.scene.fog.far = skin.scene.fogFar;
    }

    // 先保留颜色等配置，但额外灯光是否启用由 _setExtraLightsEnabled 控制
    const L = skin.lighting;
    if (this.lights?.ambient) this.lights.ambient.color.setHex(L.ambient.color);
    if (this.lights?.directional) this.lights.directional.color.setHex(L.directional.color);
    if (this.lights?.point) this.lights.point.color.setHex(L.point.color);
    if (this.lights?.point && typeof L.point.distance === 'number') {
      this.lights.point.distance = L.point.distance;
    }

    this.clearMoveHints();
    if (this.selectedPiece) {
      detachSelectionVisual(this.selectedPiece);
      this.pieces.deselectAll();
      this.selectedPiece = null;
    }
  }

  /**
   * 额外灯光开关（用于对比环境贴图 IBL 效果）。
   * @param {boolean} enabled
   */
  _setExtraLightsEnabled(enabled) {
    const skin = getSkinPreset(this.skinStyleId || STYLE_KEYS.CLASSICAL);
    const L = skin?.lighting;
    if (!L) return;
    if (this.lights?.ambient) {
      this.lights.ambient.intensity = enabled ? L.ambient.intensity : 0;
    }
    if (this.lights?.directional) {
      this.lights.directional.intensity = enabled ? L.directional.intensity : 0;
    }
    if (this.lights?.point) {
      this.lights.point.intensity = enabled ? L.point.intensity : 0;
    }
  }

  /**
   * 将 EXR 等距柱状图转为 PMREM，供 PBR 环境反射使用
   * @param {THREE.Texture} equirectTex
   */
  _applyEnvironmentFromEquirectangular(equirectTex) {
    if (!equirectTex) {
      this._disposeSceneEnvironment();
      this.scene.environment = null;
      return;
    }

    equirectTex.mapping = THREE.EquirectangularReflectionMapping;
    if ('colorSpace' in equirectTex) {
      equirectTex.colorSpace = THREE.LinearSRGBColorSpace;
    }
    equirectTex.needsUpdate = true;

    if (!this.renderer) {
      console.warn('[GameScene] 无 WebGLRenderer，无法生成 PMREM，环境反射可能无效');
      this.scene.environment = equirectTex;
      this.scene.background = equirectTex;
      return;
    }

    if (!this._pmremGenerator) {
      this._pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this._pmremGenerator.compileEquirectangularShader();
    }

    if (this._envRenderTarget) {
      this._envRenderTarget.dispose();
      this._envRenderTarget = null;
    }

    this._envRenderTarget = this._pmremGenerator.fromEquirectangular(equirectTex);
    this.scene.environment = this._envRenderTarget.texture;
    // environment 只贡献反射；要看到 HDR 天空需设置 background（与 three.js 示例一致）
    this.scene.background = equirectTex;
    this.scene.backgroundIntensity = 1;
    this.scene.backgroundBlurriness = 0;
  }

  /**
   * EXR 缺失或加载失败时，用内置 Room 场景烘焙 PMREM，保证 IBL 与可见背景
   */
  _applyRoomEnvironmentFallback() {
    if (!this.renderer) return;

    if (!this._pmremGenerator) {
      this._pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    }

    if (this._envRenderTarget) {
      this._envRenderTarget.dispose();
      this._envRenderTarget = null;
    }

    const room = new RoomEnvironment(this.renderer);
    this._envRenderTarget = this._pmremGenerator.fromScene(room, 0.04);
    this.scene.environment = this._envRenderTarget.texture;
    this.scene.background = this._envRenderTarget.texture;
    this.scene.backgroundIntensity = 1;
    this.scene.backgroundBlurriness = 0;
  }

  _disposeSceneEnvironment() {
    if (this._envRenderTarget) {
      this._envRenderTarget.dispose();
      this._envRenderTarget = null;
    }
    this.scene.environment = null;
  }

  createBoard() {
    this.board = new ChessBoard(this.scene);
  }

  createPieces() {
    this.pieces = new ChessPieces(this.scene, this.board);
  }

  setupCameraController() {
    this.cameraController = new CameraController(
      this.camera,
      document.getElementById('gameCanvas')
    );
  }

  setupChessRules() {
    this.chessRules = new ChessRules(this.board);
  }

  setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  setupEventListeners() {
    const canvas = document.getElementById('gameCanvas');

    // 鼠标事件
    canvas.addEventListener('click', (event) => this.onMouseClick(event));
    canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
    canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
    canvas.addEventListener('mouseup', (event) => this.onMouseUp(event));

    // 触摸事件（移动设备支持）
    // 重要：移动端触摸会合成 click；若同时处理 touch+click，容易造成“双触发”与页面闪白/高亮。
    // 这里用非 passive 监听并在 touch 中 preventDefault，彻底阻断合成 click。
    canvas.addEventListener('touchstart', (event) => this.onTouchStart(event), {
      passive: false
    });
    canvas.addEventListener('touchmove', (event) => this.onTouchMove(event), {
      passive: false
    });
    canvas.addEventListener('touchend', (event) => this.onTouchEnd(event), {
      passive: false
    });

    // 防止右键菜单
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    // 显示游戏状态
    this.showGameStatus();
  }

  onMouseClick(event) {
    if (this._pieceAnimBusy) return;

    this.updateMousePosition(event);

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.pieces.getAllPieces());

    if (intersects.length > 0) {
      const piece = intersects[0].object;
      this.selectPiece(piece);
    } else {
      // 点击棋盘空白位置
      this.boardClick();
    }
  }

  onMouseMove(event) {
    if (this._pieceAnimBusy) return;
    if (
      this.networkMode === 'replay' ||
      (this.networkMode === 'online' && !this.myOnlineColor)
    ) {
      const canvas = event.target;
      canvas.style.cursor = 'default';
      this.clearMoveHints();
      return;
    }

    this.updateMousePosition(event);

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.pieces.getAllPieces());

    const canvas = event.target;
    // 仅清除非选中棋子的悬停 emissive（古典 PBR 每子独立材质，否则会误改共享材质）
    this.pieces.resetHoverState(this.selectedPiece);

    if (intersects.length > 0) {
      const piece = intersects[0].object;

      // 只能悬停当前玩家的棋子
      if (piece.userData.color === this.currentPlayer) {
        const em =
          piece === this.selectedPiece
            ? this.animPreset.selectedEmissive
            : this.animPreset.hoverEmissive;
        piece.material.emissive.setHex(em);
        canvas.style.cursor = 'pointer';

        // 显示可移动位置提示
        this.showPossibleMoves(piece);
      } else {
        canvas.style.cursor = 'default';
        this.clearMoveHints();
      }
    } else {
      canvas.style.cursor = 'default';
      this.clearMoveHints();
    }
  }

  onMouseDown(event) {
    // 处理鼠标按下事件
  }

  onMouseUp(event) {
    // 处理鼠标释放事件
  }

  onTouchStart(event) {
    if (event.touches.length !== 1) return;
    event.preventDefault();
    const t = event.touches[0];
    this._lastTouchTap = { x: t.clientX, y: t.clientY };
  }

  onTouchMove(event) {
    if (event.touches.length !== 1) return;
    event.preventDefault();
    const t = event.touches[0];
    // 仅悬停提示：按需更新鼠标位置与提示
    this.onMouseMove({ clientX: t.clientX, clientY: t.clientY, target: event.target });
  }

  onTouchEnd(event) {
    event.preventDefault();
    const tap = this._lastTouchTap;
    this._lastTouchTap = null;
    if (!tap) return;
    // 以 touchend 为准触发一次“点击”
    this.onMouseClick({ clientX: tap.x, clientY: tap.y, target: event.target });
  }

  updateMousePosition(event) {
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    let cx = event.clientX;
    let cy = event.clientY;
    if ((cx == null || cy == null) && event.touches?.length) {
      cx = event.touches[0].clientX;
      cy = event.touches[0].clientY;
    }
    if (cx == null || cy == null) return;
    this.mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;
  }

  selectPiece(piece) {
    if (this.gameOver) return;
    if (this.networkMode === 'replay') return;
    if (this.networkMode === 'online' && !this.myOnlineColor) return;

    const clickedIsMine = piece?.userData?.color === this.currentPlayer;

    // 已选中其它棋子：若点到己方棋子则切换选中；若点到对方棋子则尝试吃子
    if (this.selectedPiece && this.selectedPiece !== piece) {
      const mover = this.selectedPiece;

      // 点己方棋子：直接切换选中（修复：不再需要点两次）
      if (clickedIsMine) {
        detachSelectionVisual(mover);
        this.pieces.deselectAll();
        this.selectedPiece = null;
        this.clearMoveHints();

        piece.material.emissive.setHex(this.animPreset.selectedEmissive);
        this.selectedPiece = piece;
        attachSelectionVisual(piece, this.animPreset);
        this.showPossibleMoves(piece);
        return;
      }

      // 点对方棋子：尝试吃子
      const result = this.isValidMove(mover, piece);
      if (result.valid) {
        detachSelectionVisual(mover);
        this.movePiece(mover, piece);
      } else {
        this.clearMoveHints();
        detachSelectionVisual(mover);
        this.pieces.deselectAll();
        this.selectedPiece = null;
      }
      return;
    }

    // 未选中：只能选中己方棋子
    if (clickedIsMine) {
      if (this.selectedPiece) detachSelectionVisual(this.selectedPiece);
      this.pieces.deselectAll();
      piece.material.emissive.setHex(this.animPreset.selectedEmissive);
      this.selectedPiece = piece;
      attachSelectionVisual(piece, this.animPreset);
      this.showPossibleMoves(piece);
      return;
    }

    // 点到对方棋子且未选中：清空选择
    if (this.selectedPiece) detachSelectionVisual(this.selectedPiece);
    this.pieces.deselectAll();
    this.selectedPiece = null;
    this.clearMoveHints();
  }

  boardClick() {
    if (this.networkMode === 'replay') return;
    if (this.networkMode === 'online' && !this.myOnlineColor) return;
    // 处理棋盘点击（移动棋子到指定位置）
    if (this.selectedPiece) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.board.getBoardMesh());

      if (intersects.length > 0) {
        const point = intersects[0].point;
        this.movePieceToPosition(this.selectedPiece, point);
      }
    }
  }

  isValidMove(fromPiece, toPiece) {
    if (this.gameOver) return { valid: false, message: '游戏已结束' };

    // 只能移动当前玩家的棋子
    if (fromPiece.userData.color !== this.currentPlayer) {
      return { valid: false, message: '不是你的棋子' };
    }

    // 使用规则引擎验证移动
    const allPieces = this.pieces.getAllPieces();
    const result = this.chessRules.isValidMove(fromPiece, toPiece.position, allPieces);

    return result;
  }

  movePiece(piece, targetPiece) {
    if (this.networkMode === 'replay') return;
    if (!targetPiece || this.gameOver || this._pieceAnimBusy) return;
    const toBoard = this.board.worldToBoardCoords(targetPiece.position);
    const victim = targetPiece;

    if (this.networkMode === 'online') {
      if (
        piece.userData.color !== this.myOnlineColor ||
        this.currentPlayer !== this.myOnlineColor
      ) {
        return;
      }
      const allPieces = this.pieces.getAllPieces();
      const moveResult = this.chessRules.isValidMove(
        piece,
        targetPiece.position,
        allPieces
      );
      if (!moveResult.valid) return;
      this._onlineClient?.emitMove(
        { x: piece.userData.boardX, z: piece.userData.boardZ },
        { x: toBoard.x, z: toBoard.z }
      );
      return;
    }

    this._pieceAnimBusy = true;
    detachSelectionVisual(piece);
    this.clearMoveHints();
    this.pieces.deselectAll();
    this.selectedPiece = null;

    const run = async () => {
      try {
        await animateMove(
          this.scene,
          this.board,
          piece,
          toBoard.x,
          toBoard.z,
          this.animPreset
        );
        await animateCapture(this.scene, victim, this.animPreset, this.animStyleId);
        this.pieces.removePiece(victim);
        this.pieces.movePiece(piece, toBoard.x, toBoard.z);
        resetMeshVisuals(piece);
        this._finalizeTurnAfterMove();
      } catch (err) {
        console.error(err);
      } finally {
        this._pieceAnimBusy = false;
      }
    };
    run();
  }

  movePieceToPosition(piece, position) {
    if (this.networkMode === 'replay') return;
    if (this.gameOver || this._pieceAnimBusy) return;
    if (piece.userData.color !== this.currentPlayer) return;

    const boardPosition = this.board.worldToBoardCoords(position);
    if (!this.chessRules.isPositionOnBoard(boardPosition.x, boardPosition.z)) {
      return;
    }

    const targetWorld = this.board.boardToWorldCoords(boardPosition.x, boardPosition.z);
    const allPieces = this.pieces.getAllPieces();
    const moveResult = this.chessRules.isValidMove(piece, targetWorld, allPieces);

    if (!moveResult.valid) return;

    const { x, z } = boardPosition;
    const captured = moveResult.capturedPiece;

    if (this.networkMode === 'online') {
      if (
        piece.userData.color !== this.myOnlineColor ||
        this.currentPlayer !== this.myOnlineColor
      ) {
        return;
      }
      this._onlineClient?.emitMove(
        { x: piece.userData.boardX, z: piece.userData.boardZ },
        { x, z }
      );
      return;
    }

    this._pieceAnimBusy = true;
    detachSelectionVisual(piece);
    this.clearMoveHints();
    this.pieces.deselectAll();
    this.selectedPiece = null;

    const run = async () => {
      try {
        await animateMove(this.scene, this.board, piece, x, z, this.animPreset);
        if (captured) {
          await animateCapture(this.scene, captured, this.animPreset, this.animStyleId);
          this.pieces.removePiece(captured);
        }
        this.pieces.movePiece(piece, x, z);
        resetMeshVisuals(piece);
        this._finalizeTurnAfterMove();
      } catch (err) {
        console.error(err);
      } finally {
        this._pieceAnimBusy = false;
      }
    };
    run();
  }

  _finalizeTurnAfterMove() {
    this.checkGameStateAfterMove();
    if (!this.gameOver) {
      this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
    }
    this.halfMoveCount += 1;
  }

  isValidPosition(position) {
    return this.chessRules.isPositionOnBoard(position.x, position.z);
  }

  /** 走棋方仍为 currentPlayer 时调用：检测「下一手行棋方」是否被将/将死 */
  checkGameStateAfterMove() {
    const mover = this.currentPlayer;
    const nextPlayer = mover === 'red' ? 'black' : 'red';
    const allPieces = this.pieces.getAllPieces();

    this.uiStatusLine = '';

    // 将/帅已被吃：对方无将，行棋方（刚走完的一方）获胜
    if (!this.chessRules.findKing(nextPlayer, allPieces)) {
      this.gameOver = true;
      const winner = mover === 'red' ? '红方' : '黑方';
      this.uiStatusLine = `${winner}胜`;
      alert(`${winner}获胜！`);
      this.showGameOver(winner);
      return;
    }

    const inCheck = this.chessRules.isKingChecked(nextPlayer, allPieces);

    if (this.chessRules.isCheckmate(nextPlayer, allPieces)) {
      this.gameOver = true;
      const winner = nextPlayer === 'red' ? '黑方' : '红方';
      this.uiStatusLine = `${winner}胜`;
      alert(`${winner}获胜！`);
      this.showGameOver(winner);
    } else if (inCheck) {
      const name = nextPlayer === 'red' ? '红方' : '黑方';
      this.uiStatusLine = `${name}被将军`;
      this.showCheckAlert(nextPlayer);
    }
  }

  showCheckAlert(defenderColor) {
    const name = defenderColor === 'red' ? '红方' : '黑方';
    console.log(`将军：${name}被将军`);
  }

  showGameOver(winner) {
    // 游戏结束UI（可以扩展为3D UI）
    console.log(`游戏结束：${winner}获胜！`);
    // 这里可以添加重置游戏或返回主菜单的功能
  }

  showGameStatus() {
    // 在控制台显示游戏状态（可以扩展为3D UI）
    console.log(`当前回合：${this.currentPlayer === 'red' ? '红方' : '黑方'}`);
    console.log(`游戏状态：${this.gameOver ? '已结束' : '进行中'}`);

    // 可以在这里添加3D UI显示
    // 例如：在场景中显示当前玩家信息
  }

  showPossibleMoves(piece) {
    if (this._moveHintForPiece === piece && this.moveHints.length > 0) {
      return;
    }
    this.clearMoveHints();
    this._moveHintForPiece = piece;

    const allPieces = this.pieces.getAllPieces();
    const possibleMoves = this.chessRules.getPossibleMoves(piece, allPieces);

    this.moveHints = [];

    possibleMoves.forEach((entry) => {
      const hint = createMoveHintMesh(
        this.scene,
        entry.position,
        entry.capture,
        this.animPreset
      );
      this.moveHints.push(hint);
    });
  }

  clearMoveHints() {
    this._moveHintForPiece = null;
    if (!this.moveHints?.length) {
      this.moveHints = [];
      return;
    }
    this.moveHints.forEach((hint) => {
      if (hint?.dispose) hint.dispose();
    });
    this.moveHints = [];
  }

  enterOnlineMode(myColor, client) {
    this.networkMode = 'online';
    this.myOnlineColor = myColor;
    this._onlineClient = client;
    this._shownOnlineEnd = false;
  }

  leaveOnlineMode() {
    this.networkMode = 'local';
    this.myOnlineColor = null;
    this._onlineClient = null;
    this._shownOnlineEnd = false;
  }

  /**
   * @param {object} state 服务端 serialize 局面
   * @param {{ lastMove?: { from:{x:number,z:number}, to:{x:number,z:number}, pieceId:string, capture?:boolean } }} [opts]
   */
  applyServerGameState(state, opts = {}) {
    if (!state?.pieces || !this.pieces) return;
    if (this.networkMode === 'replay') return;

    if (this.networkMode === 'online' && this._pieceAnimBusy) {
      this._onlineAnimGen += 1;
      this._pieceAnimBusy = false;
      this._applyServerStateImmediate(state);
      return;
    }

    const lm = opts.lastMove;
    const validLastMove =
      lm &&
      !lm.forfeit &&
      lm.pieceId &&
      lm.from &&
      typeof lm.from.x === 'number' &&
      typeof lm.from.z === 'number' &&
      lm.to &&
      typeof lm.to.x === 'number' &&
      typeof lm.to.z === 'number';

    if (this.networkMode === 'online' && validLastMove) {
      const prep = this._resolveOnlineMoveMeshes(lm);
      if (prep.ok) {
        this._applyServerMetaOnly(state);
        this._playOnlineMoveAnimation(state, lm, prep.moverMesh, prep.victimMesh);
        return;
      }
    }

    this._applyServerStateImmediate(state);
  }

  _applyServerMetaOnly(state) {
    this.currentPlayer = state.currentTurn;
    this.halfMoveCount = state.halfMoveCount ?? 0;
    this.gameOver = !!state.gameOver;
    this.uiStatusLine = state.uiStatusLine || '';
  }

  _applyServerStateImmediate(state) {
    this._applyServerMetaOnly(state);
    this.pieces.syncFromServer(state.pieces);
    if (state.gameOver && state.winner && !this._shownOnlineEnd) {
      this._shownOnlineEnd = true;
      const w = state.winner === 'red' ? '红方' : '黑方';
      alert(`${w}获胜！`);
    }
  }

  /**
   * @param {object} lm
   * @returns {{ ok: true, moverMesh: import('three').Object3D, victimMesh: import('three').Object3D | null } | { ok: false }}
   */
  _resolveOnlineMoveMeshes(lm) {
    const list = this.pieces.pieces;
    const pid = lm.pieceId;
    const fx = lm.from.x;
    const fz = lm.from.z;
    const tx = lm.to.x;
    const tz = lm.to.z;
    const moverEntry = list.find(
      (e) =>
        e.isAlive &&
        e.mesh.userData.logicalId === pid &&
        e.x === fx &&
        e.z === fz
    );
    if (!moverEntry) return { ok: false };
    let victimMesh = null;
    if (lm.capture) {
      const victimEntry = list.find(
        (e) =>
          e.isAlive &&
          e.x === tx &&
          e.z === tz &&
          e.mesh.userData.logicalId !== pid
      );
      if (!victimEntry) return { ok: false };
      victimMesh = victimEntry.mesh;
    }
    return { ok: true, moverMesh: moverEntry.mesh, victimMesh };
  }

  _playOnlineMoveAnimation(state, lastMove, moverMesh, victimMesh) {
    const gen = (this._onlineAnimGen += 1);
    this._pieceAnimBusy = true;
    if (this.selectedPiece === moverMesh) {
      detachSelectionVisual(moverMesh);
      this.selectedPiece = null;
    }
    this.clearMoveHints();
    this.pieces.deselectAll();
    const tx = lastMove.to.x;
    const tz = lastMove.to.z;

    const run = async () => {
      try {
        await animateMove(this.scene, this.board, moverMesh, tx, tz, this.animPreset);
        if (gen !== this._onlineAnimGen) return;
        if (victimMesh && lastMove.capture) {
          await animateCapture(
            this.scene,
            victimMesh,
            this.animPreset,
            this.animStyleId
          );
          if (gen !== this._onlineAnimGen) return;
          this.pieces.removePiece(victimMesh);
        }
        this.pieces.movePiece(moverMesh, tx, tz);
        resetMeshVisuals(moverMesh);
        if (gen !== this._onlineAnimGen) return;
        this.pieces.syncFromServer(state.pieces);
      } catch (err) {
        console.error(err);
        this.pieces.syncFromServer(state.pieces);
      } finally {
        if (gen === this._onlineAnimGen) {
          this._pieceAnimBusy = false;
          if (state.gameOver && state.winner && !this._shownOnlineEnd) {
            this._shownOnlineEnd = true;
            const w = state.winner === 'red' ? '红方' : '黑方';
            alert(`${w}获胜！`);
          }
        }
      }
    };
    run();
  }

  /** 联机匹配成功：清空本局面并进入在线模式（随后 applyServerGameState） */
  beginOnlineMatch(myColor, client) {
    this._clearReplayState();
    this.leaveOnlineMode();
    this.gameOver = false;
    if (this.selectedPiece) detachSelectionVisual(this.selectedPiece);
    this.selectedPiece = null;
    this.clearMoveHints();
    this.halfMoveCount = 0;
    this.uiStatusLine = '';
    this.currentPlayer = 'red';
    if (this.pieces) this.pieces.reset();
    if (this.cameraController) this.cameraController.reset();
    this._onlineAnimGen = 0;
    this.enterOnlineMode(myColor, client);
  }

  _clearReplayState() {
    this._replayDoc = null;
    this._replayPieceMoves = [];
    this._replayStep = 0;
  }

  /**
   * @param {object} doc GET /api/replays/:id 完整 JSON
   */
  beginReplay(doc) {
    this.leaveOnlineMode();
    if (this.selectedPiece) detachSelectionVisual(this.selectedPiece);
    this.selectedPiece = null;
    this.clearMoveHints();
    this.pieces.deselectAll();
    this._clearReplayState();
    this._replayDoc = doc;
    this._replayPieceMoves = filterArithmeticMoves(doc.moves || []);
    this.networkMode = 'replay';
    this.gameOver = false;
    this._shownOnlineEnd = false;
    this.uiStatusLine = '';
    this.halfMoveCount = 0;
    this.currentPlayer = 'red';
    this.pieces.reset();
    if (this.cameraController) this.cameraController.reset();
    this._applyReplayVisualState(0);
  }

  exitReplay() {
    if (this.networkMode !== 'replay') return;
    this.networkMode = 'local';
    this._clearReplayState();
    this.resetGame();
  }

  getReplayUiState() {
    if (this.networkMode !== 'replay' || !this._replayDoc) return null;
    const max = getReplayMaxStep(this._replayPieceMoves, this._replayDoc.final);
    return { step: this._replayStep, maxStep: max };
  }

  replaySeek(step) {
    this._applyReplayVisualState(step);
  }

  replayNext() {
    this._applyReplayVisualState(this._replayStep + 1);
  }

  replayPrev() {
    this._applyReplayVisualState(this._replayStep - 1);
  }

  replayToStart() {
    this._applyReplayVisualState(0);
  }

  replayToEnd() {
    const max = getReplayMaxStep(this._replayPieceMoves, this._replayDoc?.final);
    this._applyReplayVisualState(max);
  }

  _applyReplayVisualState(s) {
    if (!this._replayDoc) return;
    const m = this._replayPieceMoves.length;
    const maxS = getReplayMaxStep(this._replayPieceMoves, this._replayDoc.final);
    this._replayStep = Math.max(0, Math.min(s, maxS));
    if (this._replayDoc.final && this._replayStep > m) {
      const f = this._replayDoc.final;
      this.pieces.syncFromServer(f.pieces);
      this.currentPlayer = f.currentTurn;
      this.halfMoveCount = f.halfMoveCount ?? 0;
      this.gameOver = !!f.gameOver;
      this.uiStatusLine = f.uiStatusLine || '';
      return;
    }
    const st = computeReplayStateAtStep(this._replayPieceMoves, this._replayStep);
    this.pieces.syncFromServer(st.pieces);
    this.currentPlayer = st.currentTurn;
    this.halfMoveCount = st.halfMoveCount;
    this.gameOver = false;
    this.uiStatusLine = this._replayStep > 0 ? '复盘' : '';
  }

  resetGame() {
    this._clearReplayState();
    this.leaveOnlineMode();
    this.gameOver = false;
    this.currentPlayer = 'red';
    if (this.selectedPiece) detachSelectionVisual(this.selectedPiece);
    this.selectedPiece = null;
    this.halfMoveCount = 0;
    this.uiStatusLine = '';
    this.clearMoveHints();

    if (this.pieces) {
      this.pieces.reset();
    }

    // 重开后棋子 Mesh 会重建，需要重新套用当前皮肤（棋盘也同步一次，避免局部贴图状态丢失）
    try {
      const skin = getSkinPreset(this.skinStyleId || STYLE_KEYS.CLASSICAL);
      if (this.board) this.board.applySkinPreset(skin);
      if (this.pieces) this.pieces.applySkinPreset(skin);
    } catch {
      /* ignore */
    }

    if (this.cameraController) {
      this.cameraController.reset();
    }
  }

  /** 仅本地自由对弈可重置棋盘 */
  canRestartLocal() {
    return this.networkMode === 'local';
  }

  update() {
    const now = performance.now();
    if (this.moveHints?.length) {
      this.moveHints.forEach((h) => h.update?.(now));
    }
    if (this.selectedPiece) {
      tickSelectionVisual(this.selectedPiece, now);
    }
    if (this.cameraController) {
      this.cameraController.update();
    }
  }
}
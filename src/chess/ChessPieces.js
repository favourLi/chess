import * as THREE from 'three';
import { SKIN_PRESETS, STYLE_KEYS } from '../config/stylePresets.js';
import { buildPiecesWithIds, XIANGQI_INITIAL_LAYOUT } from './initialBoard.js';

export class ChessPieces {
  constructor(scene, board) {
    this.scene = scene;
    this.board = board;
    this.piecesGroup = new THREE.Group();
    this.pieces = [];
    this.pieceGeometry = null;
    this._skinPreset = SKIN_PRESETS[STYLE_KEYS.CLASSICAL];
    /** @type {{ red: THREE.MeshStandardMaterial, black: THREE.MeshStandardMaterial } | null} */
    this._classicalPieceMaterials = null;
    this.init();
  }

  init() {
    this.createPieceGeometry();
    this.setupInitialPosition();
    this.scene.add(this.piecesGroup);
  }

  createPieceGeometry() {
    // 创建基础棋子几何体（圆柱体）
    this.pieceGeometry = new THREE.CylinderGeometry(0.4, 0.45, 0.3, 32);
  }

  setupInitialPosition() {
    buildPiecesWithIds().forEach((pos) => {
      const piece = this.createPiece(pos.type, pos.color, pos.x, pos.z, pos.id);
      this.pieces.push({
        mesh: piece,
        type: pos.type,
        color: pos.color,
        x: pos.x,
        z: pos.z,
        isAlive: true
      });
    });
  }

  /** @deprecated 使用 initialBoard.XIANGQI_INITIAL_LAYOUT */
  getInitialPositions() {
    return XIANGQI_INITIAL_LAYOUT.map((p) => ({ ...p }));
  }

  /**
   * @param {string | null} logicalId 联机同步用稳定 id（p0..p31）
   */
  createPiece(type, color, boardX, boardZ, logicalId = null) {
    const worldPos = this.board.boardToWorldCoords(boardX, boardZ);

    // 根据类型创建不同的几何体
    let geometry = this.pieceGeometry.clone();
    let material = this.createPieceMaterial(color);

    switch (type) {
      case 'king':
        geometry.scale(1.2, 1.2, 1.2);
        break;
      case 'cannon':
        geometry.scale(0.9, 1, 0.9);
        break;
      case 'pawn':
        geometry.scale(0.8, 0.8, 0.8);
        break;
    }

    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const boardTopY = 0.003;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(worldPos);
    mesh.position.y = -bb.min.y + boardTopY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const side = color === 'red' ? this._skinPreset.piece.red : this._skinPreset.piece.black;
    mesh.userData = {
      type: type,
      color: color,
      boardX: boardX,
      boardZ: boardZ,
      baseEmissive: side.emissive,
      logicalId: logicalId || undefined
    };

    const textMesh = this.createPieceText(type, color);
    // 须在圆柱顶面之上，否则会埋进 MeshStandard 顶盖里导致字完全不可见
    textMesh.position.y = bb.max.y + 0.018;
    textMesh.renderOrder = 2;
    mesh.add(textMesh);

    this.piecesGroup.add(mesh);

    return mesh;
  }

  createPieceMaterial(color) {
    const p = this._skinPreset.piece;
    const side = color === 'red' ? p.red : p.black;
    return new THREE.MeshPhongMaterial({
      color: side.color,
      emissive: side.emissive,
      shininess: side.shininess
    });
  }

  _createPieceTextTexture(type, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    const text = this.getPieceText(type, color);
    ctx.font =
      'bold 56px "Microsoft YaHei","PingFang SC","Noto Sans SC",SimHei,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  createPieceText(type, color) {
    const texture = this._createPieceTextTexture(type, color);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      alphaTest: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -0.5,
      polygonOffsetUnits: -0.5
    });

    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(0.8, 0.8, 1);
    mesh.rotation.x = -Math.PI / 2;
    // 不参与射线检测，避免命中文字平面（MeshBasicMaterial 无 emissive）
    mesh.raycast = () => {};

    return mesh;
  }

  getPieceText(type, color) {
    if (type === 'king') {
      return color === 'red' ? '帅' : '将';
    }
    const textMap = {
      'advisor': '仕',
      'elephant': '相',
      'horse': '馬',
      'rook': '車',
      'cannon': '炮',
      'pawn': '兵'
    };
    return textMap[type] || type;
  }

  getAllPieces() {
    return this.piecesGroup.children;
  }

  deselectAll() {
    this.pieces.forEach(piece => {
      if (piece.isAlive) {
        const base = piece.mesh.userData.baseEmissive ?? 0;
        piece.mesh.material.emissive.setHex(base);
      }
    });
  }

  /**
   * @param {THREE.Mesh | null} exceptMesh 当前选中的棋子，不清除其 emissive（由选中态单独设置）
   */
  resetHoverState(exceptMesh = null) {
    this.pieces.forEach(piece => {
      if (piece.isAlive && piece.mesh !== exceptMesh) {
        const base = piece.mesh.userData.baseEmissive ?? 0;
        piece.mesh.material.emissive.setHex(base);
      }
    });
  }

  /** 释放棋子身体材质；不 dispose 古典共享模板（loader 缓存） */
  _disposePieceBodyMaterialIfOwned(material, templates) {
    if (!material) return;
    if (templates && (material === templates.red || material === templates.black)) {
      return;
    }
    material.dispose();
  }

  /**
   * 应用PBR棋子材质
   * @param {'red'|'black'} color - 棋子颜色
   * @param {THREE.MeshStandardMaterial} material - 材质
   */
  applyPieceMaterial(color, material) {
    if (!material) return;

    const materials = this._classicalPieceMaterials || {};
    materials[color] = material;
    this._classicalPieceMaterials = materials;
    // 必须红/黑模板都就绪再刷新，否则仅一侧存在时 clone(undefined) 会抛错
    if (materials.red && materials.black) {
      this._refreshPieceBodyMaterials();
    }
  }

  /**
   * 应用古典风格资源棋子贴图（由 TextureLoader 加载，勿 dispose）
   * @param {THREE.MeshStandardMaterial} redMaterial
   * @param {THREE.MeshStandardMaterial} blackMaterial
   */
  applyClassicalPieceMaps(redMaterial, blackMaterial) {
    this.applyPieceMaterial('red', redMaterial);
    this.applyPieceMaterial('black', blackMaterial);
  }

  clearClassicalPieceMaps() {
    this._classicalPieceMaterials = null;
    this._refreshPieceBodyMaterials();
  }

  _refreshPieceBodyMaterials() {
    const preset = this._skinPreset;
    if (!preset?.piece) return;
    const materials = this._classicalPieceMaterials;
    this.pieces.forEach((entry) => {
      if (!entry.isAlive) return;
      const { mesh, color } = entry;
      const side = color === 'red' ? preset.piece.red : preset.piece.black;
      const prev = mesh.material;
      if (preset.usePbrTextures && materials) {
        const template = color === 'red' ? materials.red : materials.black;
        if (template) {
          mesh.material = template.clone();
          mesh.userData.baseEmissive = mesh.material.emissive.getHex();
        } else {
          mesh.material = this.createPieceMaterial(color);
          mesh.userData.baseEmissive = side.emissive;
        }
      } else {
        mesh.material = this.createPieceMaterial(color);
        mesh.userData.baseEmissive = side.emissive;
      }
      this._disposePieceBodyMaterialIfOwned(prev, materials);
      mesh.material.needsUpdate = true;
    });
  }

  /** @param {object} preset 见 config/stylePresets.js */
  applySkinPreset(preset) {
    if (!preset?.piece) return;
    this._skinPreset = preset;
    if (!preset.usePbrTextures) {
      this._classicalPieceMaterials = null;
    }
    this._refreshPieceBodyMaterials();
    this.pieces.forEach((entry) => {
      if (!entry.isAlive) return;
      const { mesh, type, color } = entry;
      const textMesh = mesh.children[0];
      if (textMesh?.material?.map) {
        textMesh.material.map.dispose();
        textMesh.material.map = this._createPieceTextTexture(type, color);
        textMesh.material.needsUpdate = true;
      }
    });
  }

  reset() {
    // 清除所有现有棋子
    while (this.piecesGroup.children.length > 0) {
      this.piecesGroup.remove(this.piecesGroup.children[0]);
    }

    // 重置棋子数组
    this.pieces = [];

    // 重新初始化棋子
    this.setupInitialPosition();

    // reset() 会重新创建 Mesh（默认材质为 createPieceMaterial），因此需要重新应用当前皮肤，
    // 以恢复 PBR/贴图模板、emissive 基准值与文字贴图。
    this.applySkinPreset(this._skinPreset);
  }

  removePiece(pieceMesh) {
    const index = this.pieces.findIndex(p => p.mesh === pieceMesh);
    if (index !== -1) {
      this.pieces[index].isAlive = false;
      this.piecesGroup.remove(pieceMesh);
    }
  }

  movePiece(pieceMesh, newX, newZ) {
    const worldPos = this.board.boardToWorldCoords(newX, newZ);
    pieceMesh.position.x = worldPos.x;
    pieceMesh.position.z = worldPos.z;
    pieceMesh.userData.boardX = newX;
    pieceMesh.userData.boardZ = newZ;

    const piece = this.pieces.find((p) => p.mesh === pieceMesh);
    if (piece) {
      piece.x = newX;
      piece.z = newZ;
    }
  }

  /**
   * 按服务器权威列表同步棋子（联机）；id 与 buildPiecesWithIds 一致
   * @param {{ id: string, type: string, color: string, x: number, z: number }[]} pieceList
   */
  syncFromServer(pieceList) {
    const byId = Object.fromEntries(pieceList.map((p) => [p.id, p]));
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const entry = this.pieces[i];
      if (!entry.isAlive) continue;
      const id = entry.mesh.userData.logicalId;
      if (!id) continue;
      const s = byId[id];
      if (!s) {
        this.piecesGroup.remove(entry.mesh);
        entry.isAlive = false;
      } else if (s.x !== entry.x || s.z !== entry.z) {
        this.movePiece(entry.mesh, s.x, s.z);
      }
    }
  }
}

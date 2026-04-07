import * as THREE from 'three';

export class ChessBoard {
  constructor(scene) {
    this.scene = scene;
    this.boardGroup = new THREE.Group();
    this.boardMesh = null;
    this._borderMaterial = null;
    this._gridLineMaterial = null;
    this._riverMeshes = [];
    /** 底板 map 是否为程序生成的 CanvasTexture（可 dispose） */
    this._boardMapOwned = false;
    /** 当前是否使用古典资源贴图（共享纹理，不可 dispose） */
    this._boardClassicalAsset = false;
    this.gridSize = 9; // 横向格子数
    this.fileCount = 9; // 纵线 9 路，索引 0..8；居中时 worldX = (file - 4) * cellSize
    this.boardWidth = 8; // 纵线间隔数，用于底板宽度：8 * cellSize + 边距
    this.boardHeight = 9; // 纵向间隔数（10 条横线 0..9）
    this.rankCount = 10; // 横线数量（0..9）
    this.cellSize = 1; // 每个格子的大小
    this.init();
  }

  init() {
    this.createBoard();
    this.createGrid();
    this.createRiver();
    this.createPalace();
    this.scene.add(this.boardGroup);
  }

  createBoard() {
    // 创建棋盘底板
    const boardGeometry = new THREE.BoxGeometry(
      this.boardWidth * this.cellSize + 2,
      0.5,
      this.boardHeight * this.cellSize + 2
    );

    const woodTex = this.createWoodTexture('#d4a574', '#c19660');
    const boardMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      map: woodTex
    });
    this._boardMapOwned = true;

    this.boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
    this.boardMesh.position.y = -0.25;
    this.boardMesh.receiveShadow = true;
    this.boardGroup.add(this.boardMesh);

    // 添加边框
    this.createBoardBorder();
  }

  createWoodTexture(baseHex = '#d4a574', stripeHex = '#c19660') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = stripeHex;
    ctx.lineWidth = 1;
    for (let i = 0; i < 256; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  createBoardBorder() {
    this._borderMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      emissive: 0x222222
    });
    const borderMaterial = this._borderMaterial;

    // 与 createBoard 中底板 BoxGeometry 完全一致，避免边框与木板错位
    const boardW = this.boardWidth * this.cellSize + 2;
    const boardD = this.boardHeight * this.cellSize + 2;
    const halfW = boardW / 2;
    const halfD = boardD / 2;

    const borderHeight = 0.6;
    const borderThick = 0.2;
    const y = borderHeight / 2;

    const borders = [
      { size: [boardW, borderHeight, borderThick], pos: [0, y, -halfD + borderThick / 2] },
      { size: [boardW, borderHeight, borderThick], pos: [0, y, halfD - borderThick / 2] },
      { size: [borderThick, borderHeight, boardD], pos: [-halfW + borderThick / 2, y, 0] },
      { size: [borderThick, borderHeight, boardD], pos: [halfW - borderThick / 2, y, 0] }
    ];

    borders.forEach((border) => {
      const geometry = new THREE.BoxGeometry(...border.size);
      const mesh = new THREE.Mesh(geometry, borderMaterial);
      mesh.position.set(...border.pos);
      mesh.castShadow = true;
      this.boardGroup.add(mesh);
    });
  }

  /** 棋盘行 0..9 → 世界 Z（与底板中心对齐） */
  boardZToWorldZ(boardZ) {
    return (boardZ - (this.rankCount - 1) / 2) * this.cellSize;
  }

  createGrid() {
    this._gridLineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const lineMaterial = this._gridLineMaterial;
    const linesGroup = new THREE.Group();

    const halfFiles = (this.fileCount - 1) / 2;
    const xLineMin = (0 - halfFiles) * this.cellSize;
    const xLineMax = (this.fileCount - 1 - halfFiles) * this.cellSize;

    // 横线 10 条（行 0..9），Z 居中于原点
    for (let r = 0; r < this.rankCount; r++) {
      const z = this.boardZToWorldZ(r);
      const points = [
        new THREE.Vector3(xLineMin, 0.01, z),
        new THREE.Vector3(xLineMax, 0.01, z)
      ];
      linesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
    }

    const z0 = this.boardZToWorldZ(0);
    const z9 = this.boardZToWorldZ(this.rankCount - 1);
    const zRank4 = this.boardZToWorldZ(4);
    const zRank5 = this.boardZToWorldZ(5);

    // 竖线 9 条（列 0..8），楚河汉界处断开
    for (let i = 0; i < this.fileCount; i++) {
      const centerX = (i - halfFiles) * this.cellSize;

      if (i === 0 || i === this.fileCount - 1) {
        const points = [
          new THREE.Vector3(centerX, 0.01, z0),
          new THREE.Vector3(centerX, 0.01, z9)
        ];
        linesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
      } else {
        const points1 = [
          new THREE.Vector3(centerX, 0.01, z0),
          new THREE.Vector3(centerX, 0.01, zRank4)
        ];
        linesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points1), lineMaterial));

        const points2 = [
          new THREE.Vector3(centerX, 0.01, zRank5),
          new THREE.Vector3(centerX, 0.01, z9)
        ];
        linesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points2), lineMaterial));
      }
    }

    this.boardGroup.add(linesGroup);
  }

  createRiver() {
    // 楚河汉界文字
    const riverGroup = new THREE.Group();
    riverGroup.position.y = 0.1;

    // 创建文字纹理
    const createTextTexture = (text, color = 0x000000) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#f4e4c1';
      ctx.fillRect(0, 0, 256, 128);

      ctx.font = 'bold 60px Arial';
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 64);

      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    };

    // 楚河
    const chuRiverGeometry = new THREE.PlaneGeometry(2, 1);
    const chuRiverMaterial = new THREE.MeshBasicMaterial({
      map: createTextTexture('楚河', 0x8b0000),
      transparent: true
    });
    const chuRiver = new THREE.Mesh(chuRiverGeometry, chuRiverMaterial);
    chuRiver.position.set(-1, 0, 0);
    chuRiver.rotation.x = -Math.PI / 2;
    riverGroup.add(chuRiver);
    this._riverMeshes.push({ mesh: chuRiver, text: '楚河' });

    const hanRiverGeometry = new THREE.PlaneGeometry(2, 1);
    const hanRiverMaterial = new THREE.MeshBasicMaterial({
      map: createTextTexture('汉界', 0x8b0000),
      transparent: true
    });
    const hanRiver = new THREE.Mesh(hanRiverGeometry, hanRiverMaterial);
    hanRiver.position.set(1, 0, 0);
    hanRiver.rotation.x = -Math.PI / 2;
    riverGroup.add(hanRiver);
    this._riverMeshes.push({ mesh: hanRiver, text: '汉界' });

    this.boardGroup.add(riverGroup);
  }

  createPalace() {
    const lineMaterial = this._gridLineMaterial;
    const palaceGroup = new THREE.Group();

    const z7 = this.boardZToWorldZ(7);
    const z9 = this.boardZToWorldZ(9);
    const z0 = this.boardZToWorldZ(0);
    const z2 = this.boardZToWorldZ(2);

    // 九宫为第 3～5 路（world x = -1, 0, 1），斜线仅连宫角
    const px = this.cellSize;
    const topPalaceLines = [
      [[-px, 0.01, z7], [px, 0.01, z9]],
      [[px, 0.01, z7], [-px, 0.01, z9]]
    ];

    const bottomPalaceLines = [
      [[-px, 0.01, z0], [px, 0.01, z2]],
      [[px, 0.01, z0], [-px, 0.01, z2]]
    ];

    [...topPalaceLines, ...bottomPalaceLines].forEach(line => {
      const points = line.map(p => new THREE.Vector3(...p));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMesh = new THREE.Line(geometry, lineMaterial);
      palaceGroup.add(lineMesh);
    });

    this.boardGroup.add(palaceGroup);
  }

  // 工具方法：世界坐标转棋盘坐标
  worldToBoardCoords(worldPosition) {
    const boardX = Math.round(
      worldPosition.x / this.cellSize + (this.fileCount - 1) / 2
    );
    const boardZ = Math.round(
      worldPosition.z / this.cellSize + (this.rankCount - 1) / 2
    );
    return { x: boardX, z: boardZ };
  }

  boardToWorldCoords(boardX, boardZ) {
    const worldX = (boardX - (this.fileCount - 1) / 2) * this.cellSize;
    const worldZ = this.boardZToWorldZ(boardZ);
    return new THREE.Vector3(worldX, 0, worldZ);
  }

  getBoardMesh() {
    return this.boardMesh;
  }

  createRiverLabelTexture(text, bgCss, textColorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgCss;
    ctx.fillRect(0, 0, 256, 128);
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = `#${textColorHex.toString(16).padStart(6, '0')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  _disposeOwnedBoardMap() {
    const mat = this.boardMesh?.material;
    if (!mat?.map || !this._boardMapOwned) return;
    mat.map.dispose();
    mat.map = null;
    this._boardMapOwned = false;
  }

  /**
   * 应用PBR棋盘材质
   * @param {THREE.MeshStandardMaterial} boardMaterial
   */
  applyBoardMaterial(boardMaterial) {
    if (!this.boardMesh || !boardMaterial) return;
    const mat = this.boardMesh.material;
    this._disposeOwnedBoardMap();
    this.boardMesh.material = boardMaterial;
    this._boardMapOwned = false;
    this._boardClassicalAsset = true;
    mat.needsUpdate = true;
  }

  /**
   * 应用古典风格资源棋盘贴图（由 TextureLoader 加载，勿 dispose）
   * @param {THREE.MeshStandardMaterial} boardMaterial
   */
  applyClassicalBoardMap(boardMaterial) {
    this.applyBoardMaterial(boardMaterial);
  }

  /** @param {object} preset 见 config/stylePresets.js SKIN_PRESETS */
  applySkinPreset(preset) {
    if (!this.boardMesh || !preset?.board) return;

    const mat = this.boardMesh.material;

    if (!preset.usePbrTextures && this._boardClassicalAsset) {
      mat.map = null;
      this._boardClassicalAsset = false;
    }

    if (preset.boardMode === 'wood') {
      if (preset.usePbrTextures) {
        if (!this._boardClassicalAsset) {
          this._disposeOwnedBoardMap();
          const w = preset.wood || { base: '#d4a574', stripe: '#c19660' };
          mat.map = this.createWoodTexture(w.base, w.stripe);
          this._boardMapOwned = true;
        }
        mat.color.setHex(0xffffff);
        mat.emissive.setHex(0x000000);
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0;
      } else {
        this._disposeOwnedBoardMap();
        if (mat.map && this._boardClassicalAsset) {
          mat.map = null;
          this._boardClassicalAsset = false;
        }
        const w = preset.wood || { base: '#d4a574', stripe: '#c19660' };
        mat.map = this.createWoodTexture(w.base, w.stripe);
        this._boardMapOwned = true;
        mat.color.setHex(0xffffff);
        mat.emissive.setHex(0x000000);
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0;
      }
    } else {
      this._disposeOwnedBoardMap();
      if (mat.map && this._boardClassicalAsset) {
        mat.map = null;
        this._boardClassicalAsset = false;
      }
      mat.color.setHex(preset.boardSolid);
      if (preset.boardEmissive != null) {
        mat.emissive.setHex(preset.boardEmissive);
        if ('emissiveIntensity' in mat) {
          mat.emissiveIntensity = preset.boardEmissiveIntensity ?? 0.22;
        }
      } else {
        mat.emissive.setHex(0x000000);
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0;
      }
    }
    mat.needsUpdate = true;

    const b = preset.board;
    this._borderMaterial.color.setHex(b.borderColor);
    this._borderMaterial.emissive.setHex(b.borderEmissive ?? 0x000000);

    this._gridLineMaterial.color.setHex(b.gridLineColor);

    this._riverMeshes.forEach(({ mesh, text }) => {
      if (mesh.material.map) mesh.material.map.dispose();
      mesh.material.map = this.createRiverLabelTexture(text, b.riverBg, b.riverTextRed);
      mesh.material.needsUpdate = true;
    });
  }
}
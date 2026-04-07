import * as THREE from 'three';

export class ChessRules {
  constructor(board) {
    this.board = board;
    this.boardWidth = 9; // 9列 (0-8)
    this.boardHeight = 10; // 10行 (0-9)
    this.cellSize = 1;
  }

  /**
   * 验证移动是否合法
   * @param {THREE.Mesh} piece - 要移动的棋子
   * @param {THREE.Vector3} targetPosition - 目标位置
   * @param {Array} allPieces - 所有棋子的数组
   * @returns {Object} - {valid: boolean, message: string}
   */
  isValidMove(piece, targetPosition, allPieces) {
    // 获取棋子信息
    const pieceInfo = this.getPieceInfo(piece);
    if (!pieceInfo) {
      return { valid: false, message: '无法识别棋子' };
    }

    // 获取目标位置的棋子
    const targetPiece = this.getPieceAtPosition(targetPosition, allPieces);

    if (targetPiece && this.isSameTeam(pieceInfo, targetPiece)) {
      return { valid: false, message: '不能吃自己的棋子' };
    }

    // 根据棋子类型验证移动规则
    const moveValid = this.validatePieceMove(pieceInfo, targetPosition, allPieces);

    return {
      valid: moveValid.valid,
      message: moveValid.message || '',
      capturedPiece: targetPiece
    };
  }

  /**
   * 获取棋子信息
   */
  getPieceInfo(piece) {
    // 从piece.userData获取棋子信息，如果没有则从父级查找
    let data = piece.userData;
    if (!data.type) {
      // 检查是否有父级对象（棋子组）
      const parent = piece.parent;
      if (parent && parent.userData) {
        data = parent.userData;
      }
    }

    return {
      mesh: piece,
      type: data.type,
      color: data.color,
      position: piece.position.clone()
    };
  }

  /**
   * 按棋盘交叉点（整数格）查找棋子，避免世界坐标浮点与 y 高度差导致漏检（炮吃子提示依赖此结果）
   */
  getPieceAtBoardCell(boardX, boardZ, allPieces) {
    for (const p of allPieces) {
      const b = this.worldToBoard(p.position);
      if (b.x === boardX && b.z === boardZ) {
        return p;
      }
    }
    return null;
  }

  getPieceAtPosition(position, allPieces) {
    const cell = this.worldToBoard(position);
    return this.getPieceAtBoardCell(cell.x, cell.z, allPieces);
  }

  /**
   * 判断两个位置是否相同
   */
  isPositionEqual(pos1, pos2) {
    return (
      Math.abs(pos1.x - pos2.x) < 0.01 && Math.abs(pos1.z - pos2.z) < 0.01
    );
  }

  /**
   * 判断是否是同一边的棋子
   */
  isSameTeam(a, b) {
    const c1 = a?.color ?? a?.userData?.color;
    const c2 = b?.color ?? b?.userData?.color;
    return c1 && c2 && c1 === c2;
  }

  /**
   * 根据棋子类型验证移动
   */
  validatePieceMove(pieceInfo, targetPosition, allPieces) {
    const fromWorld = pieceInfo.position;
    const toWorld = targetPosition;

    // 转换为棋盘坐标
    const fromBoard = this.worldToBoard(fromWorld);
    const toBoard = this.worldToBoard(toWorld);

    // 检查目标位置是否在棋盘内
    if (!this.isPositionOnBoard(toBoard.x, toBoard.z)) {
      return { valid: false, message: '目标位置超出棋盘范围' };
    }

    // 根据棋子类型进行验证
    switch (pieceInfo.type) {
      case 'king':
        return this.validateKingMove(fromBoard, toBoard, pieceInfo.color);
      case 'advisor':
        return this.validateAdvisorMove(fromBoard, toBoard, pieceInfo.color);
      case 'elephant':
        return this.validateElephantMove(fromBoard, toBoard, pieceInfo.color, allPieces);
      case 'horse':
        return this.validateHorseMove(fromBoard, toBoard, allPieces);
      case 'rook':
        return this.validateRookMove(fromBoard, toBoard, allPieces);
      case 'cannon':
        return this.validateCannonMove(fromBoard, toBoard, allPieces);
      case 'pawn':
        return this.validatePawnMove(fromBoard, toBoard, pieceInfo.color);
      default:
        return { valid: false, message: '未知的棋子类型' };
    }
  }

  /**
   * 世界坐标转棋盘坐标
   */
  worldToBoard(worldPosition) {
    const p = this.board.worldToBoardCoords(worldPosition);
    return { x: p.x, z: p.z };
  }

  /**
   * 检查位置是否在棋盘内
   */
  isPositionOnBoard(x, z) {
    return x >= 0 && x < this.boardWidth && z >= 0 && z < this.boardHeight;
  }

  /**
   * 帅/将的移动规则
   */
  validateKingMove(from, to, color) {
    // 与 ChessPieces 布局一致：红方在下 (z=0–2)，黑方在上 (z=7–9)
    const palace =
      color === 'red'
        ? { minZ: 0, maxZ: 2, minX: 3, maxX: 5 }
        : { minZ: 7, maxZ: 9, minX: 3, maxX: 5 };

    if (to.z < palace.minZ || to.z > palace.maxZ ||
        to.x < palace.minX || to.x > palace.maxX) {
      return { valid: false, message: '帅/将只能在九宫格内移动' };
    }

    // 只能移动一格
    const dx = Math.abs(to.x - from.x);
    const dz = Math.abs(to.z - from.z);

    if (dx + dz !== 1) {
      return { valid: false, message: '帅/只能走直线，每次一格' };
    }

    // 将帅不能对面
    if (this.isFacingKings(to.x, color)) {
      return { valid: false, message: '将帅不能对面' };
    }

    return { valid: true };
  }

  /**
   * 检查将帅是否对面
   */
  isFacingKings(x, color) {
    // 检查该列是否有对方的帅/将
    const targetColor = color === 'red' ? 'black' : 'red';
    const targetPalace = targetColor === 'red' ?
      { minZ: 7, maxZ: 9 } : { minZ: 0, maxZ: 2 };

    // 这里简化处理，实际需要遍历所有棋子
    // 暂时返回false，后续完善
    return false;
  }

  /**
   * 仕/士的移动规则
   */
  validateAdvisorMove(from, to, color) {
    const palace =
      color === 'red'
        ? { minZ: 0, maxZ: 2, minX: 3, maxX: 5 }
        : { minZ: 7, maxZ: 9, minX: 3, maxX: 5 };

    if (to.z < palace.minZ || to.z > palace.maxZ ||
        to.x < palace.minX || to.x > palace.maxX) {
      return { valid: false, message: '仕/士只能在九宫格内移动' };
    }

    // 只能斜着走一格
    const dx = Math.abs(to.x - from.x);
    const dz = Math.abs(to.z - from.z);

    if (dx !== 1 || dz !== 1) {
      return { valid: false, message: '仕/士只能斜着走一格' };
    }

    return { valid: true };
  }

  /**
   * 相/象的移动规则
   */
  validateElephantMove(from, to, color, allPieces) {
    if (color === 'red' && to.z > 4) {
      return { valid: false, message: '红相不能过河' };
    }
    if (color === 'black' && to.z < 5) {
      return { valid: false, message: '黑象不能过河' };
    }

    const dx = Math.abs(to.x - from.x);
    const dz = Math.abs(to.z - from.z);

    if (dx !== 2 || dz !== 2) {
      return { valid: false, message: '相/象走田字' };
    }

    const eyeX = (from.x + to.x) / 2;
    const eyeZ = (from.z + to.z) / 2;
    const eyeWorld = this.boardToWorldCoords(eyeX, eyeZ);
    if (this.getPieceAtPosition(eyeWorld, allPieces)) {
      return { valid: false, message: '塞象眼' };
    }

    return { valid: true };
  }

  /**
   * 马的移动规则
   */
  validateHorseMove(from, to, allPieces) {
    const dx = Math.abs(to.x - from.x);
    const dz = Math.abs(to.z - from.z);

    // 走日字
    if (!((dx === 1 && dz === 2) || (dx === 2 && dz === 1))) {
      return { valid: false, message: '马走日字' };
    }

    // 检查是否被蹩马腿
    let legX, legZ;
    if (dx === 1 && dz === 2) {
      // 走竖日
      legX = from.x;
      legZ = from.z + (to.z - from.z) / 2;
    } else {
      // 走横日
      legX = from.x + (to.x - from.x) / 2;
      legZ = from.z;
    }

    // 检查马腿位置是否有棋子
    const legWorld = this.boardToWorldCoords(legX, legZ);
    const pieceAtLeg = this.getPieceAtPosition(legWorld, allPieces);

    if (pieceAtLeg) {
      return { valid: false, message: '马腿被蹩' };
    }

    return { valid: true };
  }

  /**
   * 车的移动规则
   */
  validateRookMove(from, to, allPieces) {
    // 只能走直线
    if (from.x !== to.x && from.z !== to.z) {
      return { valid: false, message: '车走直线' };
    }

    // 检查路径上是否有其他棋子
    if (!this.isPathClear(from, to, allPieces)) {
      return { valid: false, message: '路径上有阻挡' };
    }

    return { valid: true };
  }

  /**
   * 炮的移动规则
   */
  validateCannonMove(from, to, allPieces) {
    // 只能走直线
    if (from.x !== to.x && from.z !== to.z) {
      return { valid: false, message: '炮走直线' };
    }

    const targetPiece = this.getPieceAtPosition(this.boardToWorldCoords(to.x, to.z), allPieces);
    const piecesBetween = this.countPiecesBetween(from, to, allPieces);

    if (targetPiece) {
      // 吃子时必须隔一个棋子
      if (piecesBetween !== 1) {
        return { valid: false, message: '炮必须隔子吃棋' };
      }
    } else {
      // 移动时路径必须畅通
      if (piecesBetween > 0) {
        return { valid: false, message: '炮移动时路径必须畅通' };
      }
    }

    return { valid: true };
  }

  /**
   * 兵/卒的移动规则
   */
  validatePawnMove(from, to, color) {
    const dx = Math.abs(to.x - from.x);
    const dz = to.z - from.z;

    if (dx + Math.abs(dz) !== 1 || (dx !== 0 && dz !== 0)) {
      return { valid: false, message: '兵/卒只能直或横走一格' };
    }

    if (color === 'red') {
      if (dz < 0) {
        return { valid: false, message: '红兵不能后退' };
      }
      if (from.z <= 4) {
        if (!(dx === 0 && dz === 1)) {
          return { valid: false, message: '过河前兵只能向前走一格' };
        }
      } else if (!((dx === 0 && dz === 1) || (dz === 0 && dx === 1))) {
        return { valid: false, message: '兵只能走一步' };
      }
    } else {
      if (dz > 0) {
        return { valid: false, message: '黑卒不能后退' };
      }
      if (from.z >= 5) {
        if (!(dx === 0 && dz === -1)) {
          return { valid: false, message: '过河前卒只能向前走一格' };
        }
      } else if (!((dx === 0 && dz === -1) || (dz === 0 && dx === 1))) {
        return { valid: false, message: '卒只能走一步' };
      }
    }

    return { valid: true };
  }

  /**
   * 检查路径是否畅通
   */
  isPathClear(from, to, allPieces) {
    const minZ = Math.min(from.z, to.z);
    const maxZ = Math.max(from.z, to.z);
    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);

    if (from.x === to.x) {
      // 竢向移动
      for (let z = minZ + 1; z < maxZ; z++) {
        const worldPos = this.boardToWorldCoords(from.x, z);
        if (this.getPieceAtPosition(worldPos, allPieces)) {
          return false;
        }
      }
    } else {
      // 横向移动
      for (let x = minX + 1; x < maxX; x++) {
        const worldPos = this.boardToWorldCoords(x, from.z);
        if (this.getPieceAtPosition(worldPos, allPieces)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 计算两点之间的棋子数量
   */
  countPiecesBetween(from, to, allPieces) {
    let count = 0;
    const minZ = Math.min(from.z, to.z);
    const maxZ = Math.max(from.z, to.z);
    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);

    if (from.x === to.x) {
      // 竢向移动
      for (let z = minZ + 1; z < maxZ; z++) {
        const worldPos = this.boardToWorldCoords(from.x, z);
        if (this.getPieceAtPosition(worldPos, allPieces)) {
          count++;
        }
      }
    } else {
      // 横向移动
      for (let x = minX + 1; x < maxX; x++) {
        const worldPos = this.boardToWorldCoords(x, from.z);
        if (this.getPieceAtPosition(worldPos, allPieces)) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * 棋盘坐标转世界坐标
   */
  boardToWorldCoords(boardX, boardZ) {
    return this.board.boardToWorldCoords(boardX, boardZ);
  }

  /**
   * 检查是否将军
   */
  isKingChecked(kingColor, allPieces) {
    // 找到己方帅/将
    const king = this.findKing(kingColor, allPieces);
    if (!king) return false;

    // 检查是否有对方棋子可以攻击帅/将
    const enemyPieces = allPieces.filter(p => p.userData.color !== kingColor);

    for (const piece of enemyPieces) {
      const result = this.isValidMove(piece, king.position, allPieces);
      if (result.valid) {
        return true; // 被将军
      }
    }

    return false;
  }

  /**
   * 查找帅/将
   */
  findKing(color, allPieces) {
    return allPieces.find(p =>
      p.userData.type === 'king' && p.userData.color === color
    );
  }

  /**
   * 检查是否将死
   */
  isCheckmate(kingColor, allPieces) {
    if (!this.isKingChecked(kingColor, allPieces)) {
      return false; // 没有被将军，不算将死
    }

    // 尝试所有可能的移动，看是否能解除将军
    const king = this.findKing(kingColor, allPieces);
    const friendlyPieces = allPieces.filter(p => p.userData.color === kingColor);

    for (const piece of friendlyPieces) {
      // 生成所有可能的位置
      const possibleMoves = this.getPossibleMoves(piece, allPieces);

      for (const move of possibleMoves) {
        const moveDest = move.position;
        const originalPosition = piece.position.clone();
        const capturedPiece = this.getPieceAtPosition(moveDest, allPieces);
        let capPos = null;
        if (capturedPiece) {
          capPos = capturedPiece.position.clone();
          capturedPiece.position.set(1e6, 1e6, 1e6);
        }

        const dest = moveDest.clone();
        dest.y = originalPosition.y;
        piece.position.copy(dest);

        const stillChecked = this.isKingChecked(kingColor, allPieces);

        piece.position.copy(originalPosition);
        if (capturedPiece && capPos) {
          capturedPiece.position.copy(capPos);
        }

        if (!stillChecked) {
          return false;
        }
      }
    }

    return true; // 所有移动都无法解除将军
  }

  /**
   * 合法走法列表，供提示与将死检测使用
   * @returns {{ position: THREE.Vector3, capture: boolean }[]}
   */
  getPossibleMoves(piece, allPieces) {
    const type = piece.userData?.type;
    if (!type) return [];

    switch (type) {
      case 'horse':
        return this._candidateOffsetsMoves(piece, allPieces, [
          [1, 2],
          [2, 1],
          [-1, 2],
          [-2, 1],
          [1, -2],
          [2, -1],
          [-1, -2],
          [-2, -1]
        ]);
      case 'elephant':
        return this._candidateOffsetsMoves(piece, allPieces, [
          [2, 2],
          [2, -2],
          [-2, 2],
          [-2, -2]
        ]);
      case 'king':
        return this._candidateOffsetsMoves(piece, allPieces, [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0]
        ]);
      case 'advisor':
        return this._candidateOffsetsMoves(piece, allPieces, [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1]
        ]);
      case 'pawn':
        return this._getPawnCandidateMoves(piece, allPieces);
      case 'rook':
      case 'cannon':
        return this._getSlidingMoves(piece, allPieces);
      default:
        return [];
    }
  }

  _tryMoveToSquare(piece, boardX, boardZ, allPieces) {
    if (!this.isPositionOnBoard(boardX, boardZ)) return null;
    const worldPos = this.boardToWorldCoords(boardX, boardZ);
    const result = this.isValidMove(piece, worldPos, allPieces);
    if (!result.valid) return null;
    return {
      position: worldPos.clone(),
      capture: !!result.capturedPiece
    };
  }

  _candidateOffsetsMoves(piece, allPieces, offsets) {
    const from = this.worldToBoard(piece.position);
    const out = [];
    const seen = new Set();
    for (const [dx, dz] of offsets) {
      const x = from.x + dx;
      const z = from.z + dz;
      const key = `${x},${z}`;
      if (seen.has(key)) continue;
      const m = this._tryMoveToSquare(piece, x, z, allPieces);
      if (m) {
        seen.add(key);
        out.push(m);
      }
    }
    return out;
  }

  _getPawnCandidateMoves(piece, allPieces) {
    const color = piece.userData.color;
    const from = this.worldToBoard(piece.position);
    const squares = [];
    if (color === 'red') {
      squares.push([from.x, from.z + 1]);
      if (from.z >= 5) {
        squares.push([from.x - 1, from.z], [from.x + 1, from.z]);
      }
    } else {
      squares.push([from.x, from.z - 1]);
      if (from.z <= 4) {
        squares.push([from.x - 1, from.z], [from.x + 1, from.z]);
      }
    }
    const out = [];
    const seen = new Set();
    for (const [x, z] of squares) {
      const key = `${x},${z}`;
      if (seen.has(key)) continue;
      const m = this._tryMoveToSquare(piece, x, z, allPieces);
      if (m) {
        seen.add(key);
        out.push(m);
      }
    }
    return out;
  }

  _getSlidingMoves(piece, allPieces) {
    const from = this.worldToBoard(piece.position);
    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ];
    const moves = [];
    for (const [dx, dz] of dirs) {
      for (let i = 1; i <= 9; i++) {
        const nx = from.x + dx * i;
        const nz = from.z + dz * i;
        if (!this.isPositionOnBoard(nx, nz)) break;
        const worldPos = this.boardToWorldCoords(nx, nz);
        const result = this.isValidMove(piece, worldPos, allPieces);
        if (result.valid) {
          moves.push({
            position: worldPos.clone(),
            capture: !!result.capturedPiece
          });
          if (result.capturedPiece) break;
        } else if (piece.userData.type === 'cannon') {
          // 炮：中间格可能「不能落子」但仍可打更远的目标（如 7 路炮打 9 路马，7 路黑炮只是炮架）
          continue;
        } else {
          break;
        }
      }
    }
    return moves;
  }
}
'use strict';

/**
 * 中国象棋纯逻辑（无 Three.js），供服务端权威校验。
 * 坐标：x 0..8，z 0..9；红方在 z=0 侧，黑方在 z=9 侧（与前端 ChessBoard 一致）。
 */

const W = 9;
const H = 10;

function clonePieces(pieces) {
  return pieces.map((p) => ({ ...p }));
}

function getAt(pieces, x, z) {
  return pieces.find((p) => p.x === x && p.z === z) || null;
}

function isOnBoard(x, z) {
  return x >= 0 && x < W && z >= 0 && z < H;
}

function findKing(pieces, color) {
  return pieces.find((p) => p.type === 'king' && p.color === color) || null;
}

function countBetween(pieces, x1, z1, x2, z2) {
  let n = 0;
  if (x1 === x2) {
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);
    for (let z = minZ + 1; z < maxZ; z++) {
      if (getAt(pieces, x1, z)) n++;
    }
  } else if (z1 === z2) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX + 1; x < maxX; x++) {
      if (getAt(pieces, x, z1)) n++;
    }
  }
  return n;
}

function pathClear(pieces, x1, z1, x2, z2) {
  return countBetween(pieces, x1, z1, x2, z2) === 0;
}

/** 将帅是否「对脸」（同列且无子阻隔） */
function kingsFaceToFace(pieces) {
  const rk = findKing(pieces, 'red');
  const bk = findKing(pieces, 'black');
  if (!rk || !bk || rk.x !== bk.x) return false;
  return countBetween(pieces, rk.x, rk.z, bk.x, bk.z) === 0;
}

function validateKingMove(from, to, color) {
  const palace =
    color === 'red'
      ? { minZ: 0, maxZ: 2, minX: 3, maxX: 5 }
      : { minZ: 7, maxZ: 9, minX: 3, maxX: 5 };
  if (
    to.z < palace.minZ ||
    to.z > palace.maxZ ||
    to.x < palace.minX ||
    to.x > palace.maxX
  ) {
    return { ok: false, msg: '帅/将只能在九宫格内移动' };
  }
  const dx = Math.abs(to.x - from.x);
  const dz = Math.abs(to.z - from.z);
  if (dx + dz !== 1) return { ok: false, msg: '帅/将每次走一格' };
  return { ok: true };
}

function validateAdvisorMove(from, to, color) {
  const palace =
    color === 'red'
      ? { minZ: 0, maxZ: 2, minX: 3, maxX: 5 }
      : { minZ: 7, maxZ: 9, minX: 3, maxX: 5 };
  if (
    to.z < palace.minZ ||
    to.z > palace.maxZ ||
    to.x < palace.minX ||
    to.x > palace.maxX
  ) {
    return { ok: false, msg: '仕/士只能在九宫格内' };
  }
  const dx = Math.abs(to.x - from.x);
  const dz = Math.abs(to.z - from.z);
  if (dx !== 1 || dz !== 1) return { ok: false, msg: '仕/士只能斜走一格' };
  return { ok: true };
}

function validateElephantMove(from, to, color, pieces) {
  if (color === 'red' && to.z > 4) return { ok: false, msg: '相不能过河' };
  if (color === 'black' && to.z < 5) return { ok: false, msg: '象不能过河' };
  const dx = Math.abs(to.x - from.x);
  const dz = Math.abs(to.z - from.z);
  if (dx !== 2 || dz !== 2) return { ok: false, msg: '相/象走田' };
  const eyeX = (from.x + to.x) / 2;
  const eyeZ = (from.z + to.z) / 2;
  if (getAt(pieces, eyeX, eyeZ)) return { ok: false, msg: '塞象眼' };
  return { ok: true };
}

function validateHorseMove(from, to, pieces) {
  const dx = Math.abs(to.x - from.x);
  const dz = Math.abs(to.z - from.z);
  if (!((dx === 1 && dz === 2) || (dx === 2 && dz === 1)))
    return { ok: false, msg: '马走日' };
  let legX;
  let legZ;
  if (dx === 1 && dz === 2) {
    legX = from.x;
    legZ = from.z + (to.z - from.z) / 2;
  } else {
    legX = from.x + (to.x - from.x) / 2;
    legZ = from.z;
  }
  if (getAt(pieces, legX, legZ)) return { ok: false, msg: '蹩马腿' };
  return { ok: true };
}

function validateRookMove(from, to, pieces) {
  if (from.x !== to.x && from.z !== to.z) return { ok: false, msg: '车走直线' };
  if (!pathClear(pieces, from.x, from.z, to.x, to.z))
    return { ok: false, msg: '路径有子' };
  return { ok: true };
}

function validateCannonMove(from, to, pieces, target) {
  if (from.x !== to.x && from.z !== to.z) return { ok: false, msg: '炮走直线' };
  const between = countBetween(pieces, from.x, from.z, to.x, to.z);
  if (target) {
    if (between !== 1) return { ok: false, msg: '炮需隔子吃' };
  } else if (between > 0) {
    return { ok: false, msg: '炮移动路径须空' };
  }
  return { ok: true };
}

function validatePawnMove(from, to, color) {
  const dx = Math.abs(to.x - from.x);
  const dz = to.z - from.z;
  if (dx + Math.abs(dz) !== 1 || (dx !== 0 && dz !== 0))
    return { ok: false, msg: '兵/卒一步' };
  if (color === 'red') {
    if (dz < 0) return { ok: false, msg: '红兵不退' };
    if (from.z <= 4) {
      if (!(dx === 0 && dz === 1)) return { ok: false, msg: '未过河只能直进' };
    } else if (!((dx === 0 && dz === 1) || (dz === 0 && dx === 1)))
      return { ok: false, msg: '兵走一步' };
  } else {
    if (dz > 0) return { ok: false, msg: '黑卒不退' };
    if (from.z >= 5) {
      if (!(dx === 0 && dz === -1)) return { ok: false, msg: '未过河只能直进' };
    } else if (!((dx === 0 && dz === -1) || (dz === 0 && dx === 1)))
      return { ok: false, msg: '卒走一步' };
  }
  return { ok: true };
}

function geometricMoveOk(mover, toX, toZ, pieces) {
  const from = { x: mover.x, z: mover.z };
  const to = { x: toX, z: toZ };
  const target = getAt(pieces, toX, toZ);
  if (target && target.color === mover.color) {
    return { ok: false, msg: '不能吃己方' };
  }

  let g;
  switch (mover.type) {
    case 'king':
      g = validateKingMove(from, to, mover.color);
      break;
    case 'advisor':
      g = validateAdvisorMove(from, to, mover.color);
      break;
    case 'elephant':
      g = validateElephantMove(from, to, mover.color, pieces);
      break;
    case 'horse':
      g = validateHorseMove(from, to, pieces);
      break;
    case 'rook':
      g = validateRookMove(from, to, pieces);
      break;
    case 'cannon':
      g = validateCannonMove(from, to, pieces, target);
      break;
    case 'pawn':
      g = validatePawnMove(from, to, mover.color);
      break;
    default:
      return { ok: false, msg: '未知棋子' };
  }
  if (!g.ok) return g;
  return { ok: true, target: target || null };
}

/** 某格是否被 color 方棋子「攻击」（可走到并吃子，几何意义） */
function isSquareAttacked(pieces, x, z, byColor) {
  const victim = getAt(pieces, x, z);
  for (const p of pieces) {
    if (p.color !== byColor) continue;
    const g = geometricMoveOk(p, x, z, pieces);
    if (g.ok) {
      if (!victim) return true;
      if (victim && victim.color !== byColor) return true;
    }
  }
  return false;
}

function kingInCheck(pieces, kingColor) {
  const k = findKing(pieces, kingColor);
  if (!k) return false;
  const enemy = kingColor === 'red' ? 'black' : 'red';
  return isSquareAttacked(pieces, k.x, k.z, enemy);
}

/**
 * 在 next 上执行吃子与移动；必须先按 id 吃掉目标，再重新 findIndex 走子方，
 * 否则 splice 后 mover 下标可能错位（联机「双炮」类显示 bug 的根源）。
 */
function applyMoveInPlace(next, moverId, captureId, toX, toZ) {
  if (captureId != null) {
    const ti = next.findIndex((q) => q.id === captureId);
    if (ti >= 0) next.splice(ti, 1);
  }
  const mi = next.findIndex((q) => q.id === moverId);
  if (mi < 0) return false;
  next[mi] = { ...next[mi], x: toX, z: toZ };
  return true;
}

function hasLegalMove(pieces, side) {
  for (const p of pieces) {
    if (p.color !== side) continue;
    for (let tx = 0; tx < W; tx++) {
      for (let tz = 0; tz < H; tz++) {
        if (p.x === tx && p.z === tz) continue;
        const g = geometricMoveOk(p, tx, tz, pieces);
        if (!g.ok) continue;
        const target = getAt(pieces, tx, tz);
        const next = clonePieces(pieces);
        if (!applyMoveInPlace(next, p.id, target ? target.id : null, tx, tz)) {
          continue;
        }
        if (kingsFaceToFace(next)) continue;
        if (kingInCheck(next, side)) continue;
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {object} game
 * @param {string} game.currentTurn 'red'|'black'
 * @param {object[]} game.pieces
 * @param {number} game.halfMoveCount
 * @param {boolean} game.gameOver
 * @param {object[]} game.moveHistory
 * @param {number} fromX
 * @param {number} fromZ
 * @param {number} toX
 * @param {number} toZ
 * @param {string} byColor 必须为 currentTurn
 */
function tryApplyMove(game, fromX, fromZ, toX, toZ, byColor) {
  if (game.gameOver) return { ok: false, error: '对局已结束' };
  if (byColor !== game.currentTurn) return { ok: false, error: '非己方回合' };

  const mover = getAt(game.pieces, fromX, fromZ);
  if (!mover || mover.color !== byColor) return { ok: false, error: '无己方棋子' };

  const g = geometricMoveOk(mover, toX, toZ, game.pieces);
  if (!g.ok) return { ok: false, error: g.msg || '非法走法' };

  const target = getAt(game.pieces, toX, toZ);
  const next = clonePieces(game.pieces);
  if (!applyMoveInPlace(next, mover.id, target ? target.id : null, toX, toZ)) {
    return { ok: false, error: '内部状态错误' };
  }

  if (kingsFaceToFace(next)) return { ok: false, error: '将帅不能对面' };
  // 允许「送将」：认输或故意送吃，不再校验己方老将是否仍被将军

  const opp = byColor === 'red' ? 'black' : 'red';
  const capturedKing = target && target.type === 'king';

  let gameOver = false;
  let winner = null;
  let uiStatusLine = '';

  if (capturedKing) {
    gameOver = true;
    winner = byColor;
    uiStatusLine = `${byColor === 'red' ? '红方' : '黑方'}胜`;
  } else if (!findKing(next, opp)) {
    gameOver = true;
    winner = byColor;
    uiStatusLine = `${byColor === 'red' ? '红方' : '黑方'}胜`;
  } else {
    const oppInCheck = kingInCheck(next, opp);
    const mate = oppInCheck && !hasLegalMove(next, opp);
    if (mate) {
      gameOver = true;
      winner = byColor;
      uiStatusLine = `${byColor === 'red' ? '红方' : '黑方'}胜`;
    } else if (oppInCheck) {
      uiStatusLine = `${opp === 'red' ? '红方' : '黑方'}被将军`;
    }
  }

  const moveEntry = {
    from: { x: fromX, z: fromZ },
    to: { x: toX, z: toZ },
    pieceId: mover.id,
    capture: !!target,
    capturedType: target ? target.type : null
  };

  game.pieces = next;
  game.halfMoveCount = (game.halfMoveCount || 0) + 1;
  game.currentTurn = opp;
  game.moveHistory = game.moveHistory || [];
  game.moveHistory.push(moveEntry);
  game.gameOver = gameOver;
  game.winner = winner;
  game.uiStatusLine = uiStatusLine;

  return { ok: true, move: moveEntry, gameOver, winner, uiStatusLine };
}

function createNewGame(initialPieces) {
  return {
    pieces: clonePieces(initialPieces),
    currentTurn: 'red',
    halfMoveCount: 0,
    gameOver: false,
    winner: null,
    uiStatusLine: '',
    moveHistory: []
  };
}

function serializeGame(game) {
  return {
    pieces: clonePieces(game.pieces),
    currentTurn: game.currentTurn,
    halfMoveCount: game.halfMoveCount,
    gameOver: game.gameOver,
    winner: game.winner,
    uiStatusLine: game.uiStatusLine || '',
    moveHistory: (game.moveHistory || []).slice()
  };
}

module.exports = {
  tryApplyMove,
  createNewGame,
  serializeGame,
  clonePieces,
  kingInCheck,
  hasLegalMove,
  kingsFaceToFace,
  findKing,
  isOnBoard,
  getAt
};

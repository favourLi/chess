import { buildPiecesWithIds } from '../chess/initialBoard.js';

/**
 * @param {object[]} moves 服务端 moveHistory
 * @returns {object[]} 仅含可还原盘面的着法（含 from/to/pieceId）
 */
export function filterArithmeticMoves(moves) {
  return (moves || []).filter(
    (m) =>
      m &&
      !m.forfeit &&
      m.pieceId &&
      m.from &&
      typeof m.from.x === 'number' &&
      typeof m.from.z === 'number' &&
      m.to &&
      typeof m.to.x === 'number' &&
      typeof m.to.z === 'number'
  );
}

function clonePieceList(list) {
  return list.map((p) => ({ ...p }));
}

/**
 * @param {{ id: string, type: string, color: string, x: number, z: number }[]} pieces
 * @param {object} m
 */
export function applyMoveToPieceList(pieces, m) {
  const next = pieces
    .filter((p) => {
      if (!m.capture) return true;
      return !(
        p.x === m.to.x &&
        p.z === m.to.z &&
        p.id !== m.pieceId
      );
    })
    .map((p) => ({ ...p }));
  const mover = next.find((p) => p.id === m.pieceId);
  if (mover) {
    mover.x = m.to.x;
    mover.z = m.to.z;
  }
  return next;
}

/**
 * 从标准开局应用前 step 步着法后的棋子列表与半回合数
 * @param {object[]} pieceMoves filterArithmeticMoves 结果
 * @param {number} step 已应用着法数 0..pieceMoves.length
 */
export function computeReplayStateAtStep(pieceMoves, step) {
  let pieces = clonePieceList(buildPiecesWithIds());
  const n = Math.max(0, Math.min(step, pieceMoves.length));
  for (let i = 0; i < n; i++) {
    pieces = applyMoveToPieceList(pieces, pieceMoves[i]);
  }
  return {
    pieces,
    halfMoveCount: n,
    currentTurn: n % 2 === 0 ? 'red' : 'black'
  };
}

/**
 * @param {object[]} pieceMoves
 * @param {object | null | undefined} finalState serializeGame 终局
 */
export function getReplayMaxStep(pieceMoves, finalState) {
  const m = pieceMoves.length;
  return finalState ? m + 1 : m;
}

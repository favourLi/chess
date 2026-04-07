import {
  filterArithmeticMoves,
  applyMoveToPieceList,
  computeReplayStateAtStep
} from './replayState.js';
import { buildPiecesWithIds } from '../chess/initialBoard.js';

describe('replayState', () => {
  test('filterArithmeticMoves 忽略认输', () => {
    const moves = [
      { forfeit: true, byColor: 'black' },
      {
        from: { x: 0, z: 3 },
        to: { x: 0, z: 4 },
        pieceId: 'p11',
        capture: false
      }
    ];
    const f = filterArithmeticMoves(moves);
    expect(f).toHaveLength(1);
    expect(f[0].pieceId).toBe('p11');
  });

  test('computeReplayStateAtStep 走一步兵', () => {
    const moves = [
      {
        from: { x: 0, z: 3 },
        to: { x: 0, z: 4 },
        pieceId: 'p11',
        capture: false
      }
    ];
    const st0 = computeReplayStateAtStep(moves, 0);
    expect(st0.pieces.find((p) => p.id === 'p11').z).toBe(3);
    const st1 = computeReplayStateAtStep(moves, 1);
    expect(st1.pieces.find((p) => p.id === 'p11').z).toBe(4);
    expect(st1.currentTurn).toBe('black');
  });

  test('applyMoveToPieceList 吃子', () => {
    let pieces = buildPiecesWithIds();
    const m = {
      from: { x: 0, z: 3 },
      to: { x: 0, z: 6 },
      pieceId: 'p11',
      capture: true
    };
    pieces = applyMoveToPieceList(pieces, m);
    expect(pieces.some((p) => p.id === 'p11' && p.z === 6)).toBe(true);
    expect(pieces.some((p) => p.id === 'p32')).toBe(false);
  });
});

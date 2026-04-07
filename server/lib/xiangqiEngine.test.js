'use strict';

const {
  tryApplyMove,
  createNewGame,
  getAt,
  clonePieces
} = require('./xiangqiEngine');
const { buildPiecesWithIds } = require('./initialBoard');

describe('xiangqiEngine', () => {
  test('开局红兵可直进一格', () => {
    const g = createNewGame(buildPiecesWithIds());
    const r = tryApplyMove(g, 0, 3, 0, 4, 'red');
    expect(r.ok).toBe(true);
    expect(g.currentTurn).toBe('black');
    expect(getAt(g.pieces, 0, 4).type).toBe('pawn');
  });

  test('非回合方走子拒绝', () => {
    const g = createNewGame(buildPiecesWithIds());
    const r = tryApplyMove(g, 0, 9, 0, 8, 'black');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/回合/);
  });

  test('不能吃己方', () => {
    const g = createNewGame(buildPiecesWithIds());
    const r = tryApplyMove(g, 0, 0, 1, 0, 'red');
    expect(r.ok).toBe(false);
  });

  test('将帅不能对面（挪开唯一隔子后同列无遮挡）', () => {
    const pieces = [
      { id: 'rk', type: 'king', color: 'red', x: 3, z: 0 },
      { id: 'bk', type: 'king', color: 'black', x: 3, z: 9 },
      { id: 'rp', type: 'pawn', color: 'red', x: 3, z: 5 }
    ];
    const g = createNewGame(pieces);
    g.currentTurn = 'red';
    const r = tryApplyMove(g, 3, 5, 4, 5, 'red');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/将帅/);
  });

  test('吃子时若被吃子在数组中排在走子方前面，仍只更新正确的子（regression：避免双炮/幽灵子）', () => {
    const pieces = [
      { id: 'rp', type: 'pawn', color: 'red', x: 4, z: 4 },
      { id: 'br', type: 'rook', color: 'black', x: 4, z: 9 }
    ];
    const g = createNewGame(pieces);
    g.currentTurn = 'black';
    const r = tryApplyMove(g, 4, 9, 4, 4, 'black');
    expect(r.ok).toBe(true);
    expect(getAt(g.pieces, 4, 4).id).toBe('br');
    expect(getAt(g.pieces, 4, 9)).toBeNull();
    expect(g.pieces.length).toBe(1);
  });

  test('允许送将（可走完后己方老将仍被车将军的棋）', () => {
    const pieces = [
      { id: 'rk', type: 'king', color: 'red', x: 4, z: 0 },
      { id: 'bk', type: 'king', color: 'black', x: 4, z: 9 },
      { id: 'br', type: 'rook', color: 'black', x: 3, z: 0 }
    ];
    const g = createNewGame(pieces);
    g.currentTurn = 'red';
    const r = tryApplyMove(g, 4, 0, 5, 0, 'red');
    expect(r.ok).toBe(true);
    expect(getAt(g.pieces, 5, 0).type).toBe('king');
  });

  test('将死后局终且胜方正确', () => {
    let pieces = buildPiecesWithIds();
    pieces = pieces.filter(
      (p) =>
        p.type === 'king' ||
        (p.type === 'rook' && p.color === 'red')
    );
    pieces = clonePieces(pieces);
    const bk = pieces.find((p) => p.type === 'king' && p.color === 'black');
    const rr = pieces.find((p) => p.type === 'rook' && p.color === 'red');
    rr.x = 5;
    rr.z = 9;
    bk.x = 4;
    bk.z = 9;
    const g = createNewGame(pieces);
    g.currentTurn = 'red';
    const r = tryApplyMove(g, 5, 9, 4, 9, 'red');
    expect(r.ok).toBe(true);
    expect(r.gameOver).toBe(true);
    expect(r.winner).toBe('red');
  });
});

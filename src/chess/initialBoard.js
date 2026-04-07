/**
 * 标准开局棋子布局（与 ChessPieces.getInitialPositions 一致）
 * 索引 i → 稳定 id `p${i}`，供联机同步与服务器权威局面共用。
 */
export const XIANGQI_INITIAL_LAYOUT = [
  { type: 'rook', color: 'red', x: 0, z: 0 },
  { type: 'horse', color: 'red', x: 1, z: 0 },
  { type: 'elephant', color: 'red', x: 2, z: 0 },
  { type: 'advisor', color: 'red', x: 3, z: 0 },
  { type: 'king', color: 'red', x: 4, z: 0 },
  { type: 'advisor', color: 'red', x: 5, z: 0 },
  { type: 'elephant', color: 'red', x: 6, z: 0 },
  { type: 'horse', color: 'red', x: 7, z: 0 },
  { type: 'rook', color: 'red', x: 8, z: 0 },
  { type: 'cannon', color: 'red', x: 1, z: 2 },
  { type: 'cannon', color: 'red', x: 7, z: 2 },
  { type: 'pawn', color: 'red', x: 0, z: 3 },
  { type: 'pawn', color: 'red', x: 2, z: 3 },
  { type: 'pawn', color: 'red', x: 4, z: 3 },
  { type: 'pawn', color: 'red', x: 6, z: 3 },
  { type: 'pawn', color: 'red', x: 8, z: 3 },
  { type: 'rook', color: 'black', x: 0, z: 9 },
  { type: 'horse', color: 'black', x: 1, z: 9 },
  { type: 'elephant', color: 'black', x: 2, z: 9 },
  { type: 'advisor', color: 'black', x: 3, z: 9 },
  { type: 'king', color: 'black', x: 4, z: 9 },
  { type: 'advisor', color: 'black', x: 5, z: 9 },
  { type: 'elephant', color: 'black', x: 6, z: 9 },
  { type: 'horse', color: 'black', x: 7, z: 9 },
  { type: 'rook', color: 'black', x: 8, z: 9 },
  { type: 'cannon', color: 'black', x: 1, z: 7 },
  { type: 'cannon', color: 'black', x: 7, z: 7 },
  { type: 'pawn', color: 'black', x: 0, z: 6 },
  { type: 'pawn', color: 'black', x: 2, z: 6 },
  { type: 'pawn', color: 'black', x: 4, z: 6 },
  { type: 'pawn', color: 'black', x: 6, z: 6 },
  { type: 'pawn', color: 'black', x: 8, z: 6 }
];

export function buildPiecesWithIds() {
  return XIANGQI_INITIAL_LAYOUT.map((p, i) => ({
    id: `p${i}`,
    type: p.type,
    color: p.color,
    x: p.x,
    z: p.z
  }));
}

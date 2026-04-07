/**
 * 古典风格PBR贴图入口；替换资源时改此处 import 即可。
 */
import boardBaseColor from './board/ParquetFlooring08_1K_BaseColor.png';
import boardNormal from './board/ParquetFlooring08_1K_Normal.png';
import boardRoughness from './board/ParquetFlooring08_1K_Roughness.png';
import boardHeight from './board/ParquetFlooring08_1K_Height.png';

import pieceRedBaseColor from './piece/red/Marble07_1K_BaseColor.png';
import pieceRedNormal from './piece/red/Marble07_1K_Normal.png';
import pieceRedRoughness from './piece/red/Marble07_1K_Roughness.png';
import pieceRedHeight from './piece/red/Marble07_1K_Height.png';

import pieceBlackBaseColor from './piece/black/Marble03_1K_BaseColor.png';
import pieceBlackNormal from './piece/black/Marble03_1K_Normal.png';
import pieceBlackRoughness from './piece/black/Marble03_1K_Roughness.png';
import pieceBlackHeight from './piece/black/Marble03_1K_Height.png';

export const CLASSICAL_PBR_TEXTURES = {
  board: {
    baseColor: boardBaseColor,
    normal: boardNormal,
    roughness: boardRoughness,
    height: boardHeight
  },
  pieceRed: {
    baseColor: pieceRedBaseColor,
    normal: pieceRedNormal,
    roughness: pieceRedRoughness,
    height: pieceRedHeight
  },
  pieceBlack: {
    baseColor: pieceBlackBaseColor,
    normal: pieceBlackNormal,
    roughness: pieceBlackRoughness,
    height: pieceBlackHeight
  }
};

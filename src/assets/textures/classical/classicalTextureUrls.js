/**
 * 古典风格PBR贴图入口；替换资源时改此处 import 即可。
 */
import boardBaseColor from './board/ParquetFlooring08_1K_BaseColor_compressed.jpg';
import boardNormal from './board/ParquetFlooring08_1K_Normal_compressed.jpg';
import boardRoughness from './board/ParquetFlooring08_1K_Roughness_compressed.jpg';
import boardHeight from './board/ParquetFlooring08_1K_Height_compressed.jpg';

import pieceRedBaseColor from './piece/red/Marble07_1K_BaseColor_compressed.jpg';
import pieceRedNormal from './piece/red/Marble07_1K_Normal_compressed.jpg';
import pieceRedRoughness from './piece/red/Marble07_1K_Roughness_compressed.jpg';
import pieceRedHeight from './piece/red/Marble07_1K_Height_compressed.jpg';

import pieceBlackBaseColor from './piece/black/Marble03_1K_BaseColor_compressed.jpg';
import pieceBlackNormal from './piece/black/Marble03_1K_Normal_compressed.jpg';
import pieceBlackRoughness from './piece/black/Marble03_1K_Roughness_compressed.jpg';
import pieceBlackHeight from './piece/black/Marble03_1K_Height_compressed.jpg';

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

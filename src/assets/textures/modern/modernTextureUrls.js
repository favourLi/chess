/**
 * 现代简约风格PBR贴图入口；替换资源时改此处 import 即可。
 */
import boardBaseColor from './board/Wood05_1K_BaseColor_compressed.jpg';
import boardNormal from './board/Wood05_1K_Normal_compressed.jpg';
import boardRoughness from './board/Wood05_1K_Roughness_compressed.jpg';
import boardHeight from './board/Wood05_1K_Height_compressed.jpg';

import pieceRedBaseColor from './piece/red/RedLeather02_1K_BaseColor_compressed.jpg';
import pieceRedNormal from './piece/red/RedLeather02_1K_Normal_compressed.jpg';
import pieceRedRoughness from './piece/red/RedLeather02_1K_NormRough_compressed.jpg';
import pieceRedHeight from './piece/red/RedLeather02_1K_NormHeight_compressed.jpg';

import pieceBlackBaseColor from './piece/black/BlackLeather02_1K_BaseColor_compressed.jpg';
import pieceBlackNormal from './piece/black/BlackLeather02_1K_Normal_compressed.jpg';
import pieceBlackRoughness from './piece/black/BlackLeather02_1K_Roughness_compressed.jpg';
import pieceBlackHeight from './piece/black/BlackLeather02_1K_Height_compressed.jpg';

export const MODERN_PBR_TEXTURES = {
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
    height: pieceBlackHeight,
  }
};

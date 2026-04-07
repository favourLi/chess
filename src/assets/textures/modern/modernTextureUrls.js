/**
 * 现代简约风格PBR贴图入口；替换资源时改此处 import 即可。
 */
import boardBaseColor from './board/Wood05_1K_BaseColor.png';
import boardNormal from './board/Wood05_1K_Normal.png';
import boardRoughness from './board/Wood05_1K_Roughness.png';
import boardHeight from './board/Wood05_1K_Height.png';

import pieceRedBaseColor from './piece/red/RedLeather02_1K_BaseColor.png';
import pieceRedNormal from './piece/red/RedLeather02_1K_Normal.png';
import pieceRedRoughness from './piece/red/RedLeather02_1K_NormRough.png';
import pieceRedHeight from './piece/red/RedLeather02_1K_NormHeight.png';

import pieceBlackBaseColor from './piece/black/BlackLeather02_1K_BaseColor.png';
import pieceBlackNormal from './piece/black/BlackLeather02_1K_Normal.png';
import pieceBlackRoughness from './piece/black/BlackLeather02_1K_Roughness.png';
import pieceBlackHeight from './piece/black/BlackLeather02_1K_Height.png';

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

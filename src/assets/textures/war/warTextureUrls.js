/**
 * 战争史诗风格PBR贴图入口；替换资源时改此处 import 即可。
 */
import boardBaseColor from './board/RedRock05_1K_BaseColor_compressed.jpg';
import boardNormal from './board/RedRock05_1K_Normal_compressed.jpg';
import boardRoughness from './board/RedRock05_1K_Roughness_compressed.jpg';
import boardHeight from './board/RedRock05_1K_Height_compressed.jpg';
import boardMetallic from './board/RedRock05_1K_Metallic_compressed.jpg';

import pieceRedBaseColor from './piece/red/Bronze03_1K_BaseColor_compressed.jpg';
import pieceRedNormal from './piece/red/Bronze03_1K_Normal_compressed.jpg';
import pieceRedRoughness from './piece/red/Bronze03_1K_Roughness_compressed.jpg';
import pieceRedHeight from './piece/red/Bronze03_1K_Height_compressed.jpg';
import pieceRedMetallic from './piece/red/Bronze03_1K_Metallic_compressed.jpg';

import pieceBlackBaseColor from './piece/black/Soapstone01_1K_BaseColor_compressed.jpg';
import pieceBlackNormal from './piece/black/Soapstone01_1K_Normal_compressed.jpg';
import pieceBlackRoughness from './piece/black/Soapstone01_1K_Roughness_compressed.jpg';
import pieceBlackHeight from './piece/black/Soapstone01_1K_Height_compressed.jpg';

export const WAR_PBR_TEXTURES = {
  board: {
    baseColor: boardBaseColor,
    normal: boardNormal,
    roughness: boardRoughness,
    height: boardHeight,
    metallic: boardMetallic
  },
  pieceRed: {
    baseColor: pieceRedBaseColor,
    normal: pieceRedNormal,
    roughness: pieceRedRoughness,
    height: pieceRedHeight,
    metallic: pieceRedMetallic
  },
  pieceBlack: {
    baseColor: pieceBlackBaseColor,
    normal: pieceBlackNormal,
    roughness: pieceBlackRoughness,
    height: pieceBlackHeight
  }
};

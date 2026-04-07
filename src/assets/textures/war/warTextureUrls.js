/**
 * 战争史诗风格PBR贴图入口；替换资源时改此处 import 即可。
 */
import boardBaseColor from './board/RedRock05_1K_BaseColor.png';
import boardNormal from './board/RedRock05_1K_Normal.png';
import boardRoughness from './board/RedRock05_1K_Roughness.png';
import boardHeight from './board/RedRock05_1K_Height.png';
import boardMetallic from './board/RedRock05_1K_Metallic.png';

import pieceRedBaseColor from './piece/red/Bronze03_1K_BaseColor.png';
import pieceRedNormal from './piece/red/Bronze03_1K_Normal.png';
import pieceRedRoughness from './piece/red/Bronze03_1K_Roughness.png';
import pieceRedHeight from './piece/red/Bronze03_1K_Height.png';
import pieceRedMetallic from './piece/red/Bronze03_1K_Metallic.png';

import pieceBlackBaseColor from './piece/black/Soapstone01_1K_BaseColor.png';
import pieceBlackNormal from './piece/black/Soapstone01_1K_Normal.png';
import pieceBlackRoughness from './piece/black/Soapstone01_1K_Roughness.png';
import pieceBlackHeight from './piece/black/Soapstone01_1K_Height.png';

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
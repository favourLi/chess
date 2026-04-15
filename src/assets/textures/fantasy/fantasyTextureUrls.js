/**
 * 奇幻魔法风格PBR贴图入口；替换资源时改此处 import 即可。
 */
import boardBaseColor from './board/1K-amethyst_1-diffuse_compressed.jpg';
import boardNormal from './board/1K-amethyst_1-normal_compressed.jpg';
import boardRoughness from './board/1K-amethyst_1-specular_compressed.jpg';
import boardHeight from './board/1K-amethyst_1-displacement_compressed.jpg';

// 奇幻风格红色棋子（金属板风格）
import pieceRedBaseColor from './piece/red/CorrugatedMetalPanel01_1K_BaseColor_compressed.jpg';
import pieceRedNormal from './piece/red/CorrugatedMetalPanel01_1K_Normal_compressed.jpg';
import pieceRedRoughness from './piece/red/CorrugatedMetalPanel01_1K_Roughness_compressed.jpg';
import pieceRedHeight from './piece/red/CorrugatedMetalPanel01_1K_Height_compressed.jpg';

// 奇幻风格黑色棋子
import pieceBlackBaseColor from './piece/black/Granite07small_1K_BaseColor_compressed.jpg';
import pieceBlackNormal from './piece/black/Granite07small_1K_Normal_compressed.jpg';
import pieceBlackRoughness from './piece/black/Granite07small_1K_Roughness_compressed.jpg';
import pieceBlackHeight from './piece/black/Granite07small_1K_Height_compressed.jpg';

export const FANTASY_PBR_TEXTURES = {
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

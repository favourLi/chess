/**
 * 奇幻魔法风格PBR贴图入口；替换资源时改此处 import 即可。
 */
import boardBaseColor from './board/1K-amethyst_1-diffuse.jpg';
import boardNormal from './board/1K-amethyst_1-normal.jpg';
import boardRoughness from './board/1K-amethyst_1-specular.jpg';
import boardHeight from './board/1K-amethyst_1-displacement.jpg';

// 奇幻风格红色棋子（金属板风格）
import pieceRedBaseColor from './piece/red/CorrugatedMetalPanel01_1K_BaseColor.png';
import pieceRedNormal from './piece/red/CorrugatedMetalPanel01_1K_Normal.png';
import pieceRedRoughness from './piece/red/CorrugatedMetalPanel01_1K_Roughness.png';
import pieceRedHeight from './piece/red/CorrugatedMetalPanel01_1K_Height.png';

// 奇幻风格黑色棋子（刷铁风格，含 metallic）
import pieceBlackBaseColor from './piece/black/BrushedIron02_1K_BaseColor.png';
import pieceBlackNormal from './piece/black/BrushedIron02_1K_Normal.png';
import pieceBlackRoughness from './piece/black/BrushedIron02_1K_Roughness.png';
import pieceBlackHeight from './piece/black/BrushedIron02_1K_Height.png';
import pieceBlackMetallic from './piece/black/BrushedIron02_1K_Metallic.png';

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
    metallic: pieceBlackMetallic
  }
};

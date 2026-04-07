/**
 * 皮肤（材质/光照/场景）与游戏风格（选中、落点、吃子提示等）预设
 * 对应 todo.md 中四类视觉方案
 */

export const STYLE_KEYS = {
  CLASSICAL: 'classical',
  MODERN: 'modern',
  FANTASY: 'fantasy',
  WAR: 'war'
};

export const STYLE_LABELS = {
  [STYLE_KEYS.CLASSICAL]: '传统古典',
  [STYLE_KEYS.MODERN]: '现代简约',
  [STYLE_KEYS.FANTASY]: '奇幻魔法',
  [STYLE_KEYS.WAR]: '战争史诗'
};

/** @type {Record<string, { label: string, boardMode: 'wood'|'solid', scene: object, lighting: object, board: object, piece: object }>} */
export const SKIN_PRESETS = {
  [STYLE_KEYS.CLASSICAL]: {
    label: '传统古典',
    boardMode: 'wood',
    /** 使用 TextureManager 中 classical 的 PBR 贴图（棋盘+棋子） */
    usePbrTextures: true,
    wood: { base: '#c9a06c', stripe: '#a67c52' },
    scene: {
      // 室内窗光感，略偏暖，与 todo「柔和自然光下的木器」一致
      background: 0x354a5c,
      fogColor: 0x3a4f60,
      fogNear: 12,
      fogFar: 52
    },
    lighting: {
      ambient: { color: 0xfff4ea, intensity: 0.68 },
      directional: { color: 0xfff1dc, intensity: 3 },
      point: { color: 0xf0dcc4, intensity: 0.5, distance: 50 }
    },
    board: {
      borderColor: 0x6b3e1e,
      borderEmissive: 0x1a1008,
      gridLineColor: 0x1a1208,
      riverBg: '#f0e6d4',
      riverTextRed: 0x6b0000
    },
    piece: {
      // 非古典贴图时的 Phong：朱红 / 墨黑，略提高 shininess 贴近「仿玉光泽」
      red: { color: 0xc42b1e, emissive: 0x3a1010, shininess: 52 },
      black: { color: 0x14161c, emissive: 0x06080c, shininess: 48 },
      textRedBg: '#ffd4d4',
      textRedFill: '#6b0000',
      textBlackBg: '#d8d4d0',
      textBlackFill: '#0d0d0d'
    },
    /**
     * 古典 PBR 数值（todo：仿玉细微光泽、朱红/墨黑、深色木纹；不改变贴图与材质类型）
     * @type {{
     *   board: { roughness: number, metalness: number, envMapIntensity: number, emissive: number, emissiveIntensity: number },
     *   piece: { roughness: number, metalness: number, envMapIntensity: number },
     *   pieceRed: { emissive: number, emissiveIntensity: number },
     *   pieceBlack: { emissive: number, emissiveIntensity: number }
     * }}
     */
    classicalPBR: {
      board: {
        roughness: 0.84,
        metalness: 0.028,
        envMapIntensity: 0.88,
        emissive: 0x2e241a,
        emissiveIntensity: 0.15
      },
      piece: {
        roughness: 0.36,
        metalness: 0.04,
        envMapIntensity: 1.32
      },
      pieceRed: { emissive: 0x6a2418, emissiveIntensity: 0.41 },
      pieceBlack: { emissive: 0x0a0e14, emissiveIntensity: 0.3 }
    }
  },
  [STYLE_KEYS.MODERN]: {
    label: '现代简约',
    boardMode: 'solid',
    /** 使用 TextureManager 中 modern 的 PBR 贴图 */
    usePbrTextures: true,
    boardSolid: 0xe8e8e2,
    scene: {
      background: 0xecf0f1,
      fogColor: 0xdfe6e9,
      fogNear: 14,
      fogFar: 55
    },
    lighting: {
      ambient: { color: 0xffffff, intensity: 0.75 },
      directional: { color: 0xffffff, intensity: 1.0 },
      point: { color: 0x74b9ff, intensity: 0.35, distance: 40 }
    },
    board: {
      borderColor: 0xb2bec3,
      borderEmissive: 0x000000,
      gridLineColor: 0x2d3436,
      riverBg: '#dfe6e9',
      riverTextRed: 0x2d3436
    },
    piece: {
      red: { color: 0xe74c3c, emissive: 0x1a0505, shininess: 90 },
      black: { color: 0x636e72, emissive: 0x0d0f10, shininess: 95 },
      textRedBg: '#ffebee',
      textRedFill: '#c0392b',
      textBlackBg: '#eceff1',
      textBlackFill: '#263238'
    },
    /**
     * 现代 PBR 数值（金属风格，冷色调）
     * @type {{
     *   board: { roughness: number, metalness: number, envMapIntensity: number, emissive: number, emissiveIntensity: number },
     *   piece: { roughness: number, metalness: number, envMapIntensity: number },
     *   pieceRed: { emissive: number, emissiveIntensity: number },
     *   pieceBlack: { emissive: number, emissiveIntensity: number }
     * }}
     */
    classicalPBR: {
      board: {
        roughness: 0.75,
        metalness: 0.05,
        envMapIntensity: 1.0,
        emissive: 0x1a1a1a,
        emissiveIntensity: 0.08
      },
      piece: {
        roughness: 0.42,
        metalness: 0.15,
        envMapIntensity: 1.2
      },
      pieceRed: { emissive: 0x2a0508, emissiveIntensity: 0.35 },
      pieceBlack: { emissive: 0x0a0a10, emissiveIntensity: 0.28 }
    }
  },
  [STYLE_KEYS.FANTASY]: {
    label: '奇幻魔法',
    boardMode: 'solid',
    /** 使用 TextureManager 中 fantasy 的 PBR 贴图 */
    usePbrTextures: true,
    boardSolid: 0x2d1f4e,
    boardEmissive: 0x1a0a3e,
    boardEmissiveIntensity: 0.25,
    scene: {
      background: 0x1a0a2e,
      fogColor: 0x2d1b4e,
      fogNear: 8,
      fogFar: 42
    },
    lighting: {
      ambient: { color: 0x9b59b6, intensity: 0.05 },
      directional: { color: 0xe8d4ff, intensity: 0.03 },
      point: { color: 0x00cec9, intensity: 0.05, distance: 35 }
    },
    board: {
      borderColor: 0x5f27cd,
      borderEmissive: 0x2d0a5c,
      gridLineColor: 0xfeca57,
      riverBg: '#3d2a5c',
      riverTextRed: 0xfeca57
    },
    piece: {
      red: { color: 0xff6b6b, emissive: 0x551010, shininess: 65 },
      black: { color: 0x6c5ce7, emissive: 0x1a1040, shininess: 65 },
      textRedBg: '#ff9f9f',
      textRedFill: '#4a0000',
      textBlackBg: '#a29bfe',
      textBlackFill: '#1e0a3d'
    },
    /**
     * 奇幻 PBR 数值（魔法水晶风格，高 emissive）
     * @type {{
     *   board: { roughness: number, metalness: number, envMapIntensity: number, emissive: number, emissiveIntensity: number },
     *   piece: { roughness: number, metalness: number, envMapIntensity: number },
     *   pieceRed: { emissive: number, emissiveIntensity: number },
     *   pieceBlack: { emissive: number, emissiveIntensity: number }
     * }}
     */
    classicalPBR: {
      board: {
        roughness: 0.65,
        metalness: 0.08,
        envMapIntensity: 1.5,
        emissive: 0x2d0a4e,
        emissiveIntensity: 0.32
      },
      piece: {
        roughness: 0.28,
        metalness: 0.06,
        envMapIntensity: 1.8
      },
      pieceRed: { emissive: 0x4a1018, emissiveIntensity: 0.48 },
      pieceBlack: { emissive: 0x1a0838, emissiveIntensity: 0.42 }
    }
  },
  [STYLE_KEYS.WAR]: {
    label: '战争史诗',
    boardMode: 'wood',
    /** 使用 TextureManager 中 war 的 PBR 贴图 */
    usePbrTextures: true,
    wood: { base: '#7a7368', stripe: '#5c564d' },
    scene: {
      background: 0x2d2a26,
      fogColor: 0x3d3830,
      fogNear: 9,
      fogFar: 48
    },
    lighting: {
      ambient: { color: 0x8b8680, intensity: 1 },
      directional: { color: 0xffeaa7, intensity: 3 },
      point: { color: 0xd35400, intensity: 1, distance: 28 }
    },
    board: {
      borderColor: 0x3d3630,
      borderEmissive: 0x0a0806,
      gridLineColor: 0x1a1815,
      riverBg: '#6d665c',
      riverTextRed: 0x2c1810
    },
    piece: {
      red: { color: 0xb85c38, emissive: 0x2a1008, shininess: 55 },
      black: { color: 0x3d3d42, emissive: 0x050508, shininess: 45 },
      textRedBg: '#d4a574',
      textRedFill: '#3e1a0a',
      textBlackBg: '#9e9e9e',
      textBlackFill: '#1a1a1a'
    },
    /**
     * 战争 PBR 数值（岩石/金属风格，低光泽）
     * @type {{
     *   board: { roughness: number, metalness: number, envMapIntensity: number, emissive: number, emissiveIntensity: number },
     *   piece: { roughness: number, metalness: number, envMapIntensity: number },
     *   pieceRed: { emissive: number, emissiveIntensity: number },
     *   pieceBlack: { emissive: number, emissiveIntensity: number }
     * }}
     */
    classicalPBR: {
      board: {
        roughness: 0.88,
        metalness: 0.03,
        envMapIntensity: 0.85,
        emissive: 0x1a1210,
        emissiveIntensity: 0.12
      },
      piece: {
        roughness: 0.58,
        metalness: 0.12,
        envMapIntensity: 1.1
      },
      pieceRed: { emissive: 0x2a0808, emissiveIntensity: 0.38 },
      pieceBlack: { emissive: 0x080808, emissiveIntensity: 0.25 }
    }
  }
};

/** 交互与落子提示（游戏风格） */
export const ANIM_PRESETS = {
  [STYLE_KEYS.CLASSICAL]: {
    label: '传统',
    hoverEmissive: 0x5a5530,
    selectedEmissive: 0x2d6b40,
    hintMove: {
      color: 0x3d9e5c,
      opacity: 0.5,
      variant: 'dot',
      pulsePeriodMs: 500,
      fadeInMs: 200
    },
    hintCapture: {
      color: 0xc62828,
      opacity: 0.92,
      variant: 'ring',
      pulsePeriodMs: 500,
      fadeInMs: 200,
      flashPeriodMs: 200,
      shakeAmplitude: 0.05
    },
    selection: {
      durationMs: 300,
      floatY: 0.07,
      scale: 1.06,
      ringColor: 0xffd700,
      ringColorInner: 0xfff8dc,
      ringOpacity: 0.9,
      shadowOpacity: 0.36
    },
    /** @see pieceAnimations.js */
    moveAnim: {
      path: 'arc',
      minDuration: 0.48,
      maxDuration: 1.35,
      arcHeight: 0.78,
      landBounce: true
    },
    captureAnim: {
      type: 'shatter',
      durationMs: 420,
      particleColor: 0xffcc66,
      particleCount: 14
    }
  },
  [STYLE_KEYS.MODERN]: {
    label: '现代',
    hoverEmissive: 0x0984e3,
    selectedEmissive: 0x00b894,
    hintMove: {
      color: 0x00cec9,
      opacity: 0.65,
      variant: 'grid',
      pulsePeriodMs: 500,
      fadeInMs: 200
    },
    hintCapture: {
      color: 0xd63031,
      opacity: 0.98,
      variant: 'glow',
      pulsePeriodMs: 500,
      fadeInMs: 180,
      flashPeriodMs: 200,
      shakeAmplitude: 0.04
    },
    selection: {
      durationMs: 300,
      floatY: 0.06,
      scale: 1.05,
      ringColor: 0x0984e3,
      ringColorInner: 0x74b9ff,
      ringOpacity: 0.88,
      shadowOpacity: 0.32
    },
    moveAnim: {
      path: 'linear',
      minDuration: 0.42,
      maxDuration: 1.1,
      arcHeight: 0,
      landBounce: false,
      speedLines: true
    },
    captureAnim: {
      type: 'dissolve',
      durationMs: 360,
      particleColor: 0x74b9ff,
      particleCount: 0
    }
  },
  [STYLE_KEYS.FANTASY]: {
    label: '奇幻',
    hoverEmissive: 0x6c3483,
    selectedEmissive: 0xfeca57,
    hintMove: {
      color: 0xfdcb6e,
      opacity: 0.7,
      variant: 'rune',
      pulsePeriodMs: 500,
      fadeInMs: 200
    },
    hintCapture: {
      color: 0xe056fd,
      opacity: 0.95,
      variant: 'shock',
      pulsePeriodMs: 480,
      fadeInMs: 200,
      flashPeriodMs: 180,
      shakeAmplitude: 0.065
    },
    selection: {
      durationMs: 300,
      floatY: 0.08,
      scale: 1.07,
      ringColor: 0xfeca57,
      ringColorInner: 0xe056fd,
      ringOpacity: 0.9,
      shadowOpacity: 0.34
    },
    moveAnim: {
      path: 'teleport',
      minDuration: 0.38,
      maxDuration: 0.85,
      arcHeight: 0,
      landBounce: false
    },
    captureAnim: {
      type: 'burst',
      durationMs: 400,
      particleColor: 0xe056fd,
      particleCount: 22
    }
  },
  [STYLE_KEYS.WAR]: {
    label: '战争',
    hoverEmissive: 0x8b4513,
    selectedEmissive: 0xcc5500,
    hintMove: {
      color: 0xc4a35a,
      opacity: 0.6,
      variant: 'mine',
      pulsePeriodMs: 520,
      fadeInMs: 220
    },
    hintCapture: {
      color: 0x8b0000,
      opacity: 0.98,
      variant: 'blood',
      pulsePeriodMs: 500,
      fadeInMs: 200,
      flashPeriodMs: 220,
      shakeAmplitude: 0.05
    },
    selection: {
      durationMs: 300,
      floatY: 0.065,
      scale: 1.055,
      ringColor: 0xc9a227,
      ringColorInner: 0xfff8dc,
      ringOpacity: 0.88,
      shadowOpacity: 0.4
    },
    moveAnim: {
      path: 'charge',
      minDuration: 0.45,
      maxDuration: 1.05,
      arcHeight: 0.25,
      landBounce: true
    },
    captureAnim: {
      type: 'fragments',
      durationMs: 450,
      particleColor: 0x8b2500,
      particleCount: 20
    }
  }
};

export function getSkinPreset(id) {
  return SKIN_PRESETS[id] || SKIN_PRESETS[STYLE_KEYS.CLASSICAL];
}

export function getAnimPreset(id) {
  return ANIM_PRESETS[id] || ANIM_PRESETS[STYLE_KEYS.CLASSICAL];
}

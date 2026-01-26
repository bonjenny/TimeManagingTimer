/**
 * 컬러 팔레트 시스템
 * - Coolors 스타일 다양한 팔레트 지원
 * - 작업별 고유 색상 할당
 */

// Coolors 스타일 팔레트 정의
export const COOLORS_PALETTES = {
  // 네이비 & 오렌지 (인기 팔레트)
  'navy-orange': {
    name: '네이비 & 오렌지',
    colors: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#287271', '#8ab17d', '#e9c46a', '#efb366', '#d68c45'],
  },
  // 올리브 & 노랑
  'olive-yellow': {
    name: '올리브 & 노랑',
    colors: ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25', '#7f9172', '#9b9b7a', '#d9ae94', '#c9b79c', '#e3d5ca'],
  },
  // 파스텔 레인보우
  'pastel-rainbow': {
    name: '파스텔 레인보우',
    colors: ['#c9cba3', '#ffe1a8', '#e26d5c', '#723d46', '#472d30', '#ffcad4', '#f4acb7', '#9d8189', '#d8e2dc', '#ece4db'],
  },
  // 오션 블루
  'ocean-blue': {
    name: '오션 블루',
    colors: ['#03045e', '#023e8a', '#0077b6', '#0096c7', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8', '#a2d2ff'],
  },
  // 선셋 워터멜론
  'sunset': {
    name: '선셋',
    colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#f72585', '#b5179e', '#7209b7', '#560bad', '#480ca8'],
  },
  // 포레스트 그린
  'forest': {
    name: '포레스트',
    colors: ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7', '#d8f3dc', '#1b4332', '#081c15', '#344e41'],
  },
  // 베이지 & 브라운
  'beige-brown': {
    name: '베이지 & 브라운',
    colors: ['#582f0e', '#7f4f24', '#936639', '#a68a64', '#b6ad90', '#c2c5aa', '#a4ac86', '#656d4a', '#414833', '#333d29'],
  },
  // 핑크 & 퍼플
  'pink-purple': {
    name: '핑크 & 퍼플',
    colors: ['#ffcbf2', '#f3c4fb', '#ecbcfd', '#e5b3fe', '#e2afff', '#deaaff', '#d8bbff', '#d0d1ff', '#c8e7ff', '#c0fdff'],
  },
  // 테라코타
  'terracotta': {
    name: '테라코타',
    colors: ['#d4a373', '#ccd5ae', '#e9edc9', '#fefae0', '#faedcd', '#e6ccb2', '#ddb892', '#b08968', '#9c6644', '#7f5539'],
  },
  // 민트 & 코랄
  'mint-coral': {
    name: '민트 & 코랄',
    colors: ['#006d77', '#83c5be', '#edf6f9', '#ffddd2', '#e29578', '#457b9d', '#a8dadc', '#f1faee', '#e63946', '#ffb4a2'],
  },
};

// 팔레트 타입 (새로운 방식)
export type PaletteType = keyof typeof COOLORS_PALETTES | 'pastel' | 'default' | 'tone-on-tone' | 'custom';

// 기존 호환성을 위한 파스텔 팔레트
export const PASTEL_PALETTE = [
  '#FFB5BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
  '#D4A5FF', '#FFB5E8', '#B5DEFF', '#C4FAF8', '#E7FFAC',
  '#FFC9DE', '#DBDCFF', '#FFCBC1', '#C1FFC1', '#FFF5BA',
];

// 기존 호환성을 위한 기본 팔레트
export const DEFAULT_PALETTE = [
  '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f97316',
  '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#6366f1',
  '#84cc16', '#f43f5e', '#0ea5e9', '#a855f7', '#22c55e',
];

// 톤온톤 팔레트 생성 함수
export const generateToneOnTonePalette = (base_color: string): string[] => {
  const hex_to_hsl = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 50];
    
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return [h * 360, s * 100, l * 100];
  };
  
  const hsl_to_hex = (h: number, s: number, l: number): string => {
    h /= 360;
    s /= 100;
    l /= 100;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const to_hex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${to_hex(r)}${to_hex(g)}${to_hex(b)}`;
  };
  
  const [h, s] = hex_to_hsl(base_color);
  
  const palette: string[] = [];
  const lightness_values = [85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15];
  
  for (const l of lightness_values) {
    palette.push(hsl_to_hex(h, Math.min(s + 10, 100), l));
  }
  
  return palette;
};

// 팔레트 설정 인터페이스
export interface PaletteSettings {
  type: PaletteType;
  custom_base_color?: string;
  custom_colors?: string[]; // 사용자 커스텀 팔레트 색상 배열
}

// 팔레트 가져오기
export const getPalette = (settings: PaletteSettings): string[] => {
  // 사용자 커스텀 팔레트
  if (settings.type === 'custom' && settings.custom_colors && settings.custom_colors.length > 0) {
    return settings.custom_colors;
  }
  
  // Coolors 팔레트 확인
  if (settings.type in COOLORS_PALETTES) {
    return COOLORS_PALETTES[settings.type as keyof typeof COOLORS_PALETTES].colors;
  }
  
  // 기존 팔레트 타입
  switch (settings.type) {
    case 'pastel':
      return PASTEL_PALETTE;
    case 'default':
      return DEFAULT_PALETTE;
    case 'tone-on-tone':
      return generateToneOnTonePalette(settings.custom_base_color || '#3b82f6');
    default:
      return COOLORS_PALETTES['navy-orange'].colors;
  }
};

// 팔레트 목록 가져오기 (UI용)
export const getPaletteList = () => {
  return [
    { type: 'navy-orange' as PaletteType, ...COOLORS_PALETTES['navy-orange'] },
    { type: 'olive-yellow' as PaletteType, ...COOLORS_PALETTES['olive-yellow'] },
    { type: 'pastel-rainbow' as PaletteType, ...COOLORS_PALETTES['pastel-rainbow'] },
    { type: 'ocean-blue' as PaletteType, ...COOLORS_PALETTES['ocean-blue'] },
    { type: 'sunset' as PaletteType, ...COOLORS_PALETTES['sunset'] },
    { type: 'forest' as PaletteType, ...COOLORS_PALETTES['forest'] },
    { type: 'beige-brown' as PaletteType, ...COOLORS_PALETTES['beige-brown'] },
    { type: 'pink-purple' as PaletteType, ...COOLORS_PALETTES['pink-purple'] },
    { type: 'terracotta' as PaletteType, ...COOLORS_PALETTES['terracotta'] },
    { type: 'mint-coral' as PaletteType, ...COOLORS_PALETTES['mint-coral'] },
    { type: 'pastel' as PaletteType, name: '파스텔', colors: PASTEL_PALETTE },
    { type: 'default' as PaletteType, name: '기본 선명', colors: DEFAULT_PALETTE },
  ];
};

// 작업 제목 기반 해시 함수
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// 작업 제목에 따른 색상 가져오기
export const getColorForTask = (title: string, palette: string[]): string => {
  const index = hashString(title) % palette.length;
  return palette[index];
};

// LocalStorage 키
export const PALETTE_STORAGE_KEY = 'timekeeper-color-palette';

// 저장된 팔레트 설정 가져오기
export const loadPaletteSettings = (): PaletteSettings => {
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // 무시
  }
  return { type: 'navy-orange' }; // 기본값: Coolors 네이비 & 오렌지
};

// 팔레트 설정 저장
export const savePaletteSettings = (settings: PaletteSettings): void => {
  localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(settings));
  
  // 같은 탭 내 다른 컴포넌트에 팔레트 변경 알림
  window.dispatchEvent(new CustomEvent('palette-changed', { detail: settings }));
};

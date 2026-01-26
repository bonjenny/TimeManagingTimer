/**
 * 컬러 팔레트 시스템
 * - 파스텔톤, 기본, 톤온톤 컬러 팔레트 지원
 * - 작업별 고유 색상 할당
 */

// 파스텔톤 컬러 팔레트 (부드럽고 눈에 편한 색상)
export const PASTEL_PALETTE = [
  '#FFB5BA', // 분홍
  '#FFDFBA', // 살구
  '#FFFFBA', // 연노랑
  '#BAFFC9', // 민트
  '#BAE1FF', // 하늘
  '#D4A5FF', // 라벤더
  '#FFB5E8', // 연분홍
  '#B5DEFF', // 연파랑
  '#C4FAF8', // 청록
  '#E7FFAC', // 라임
  '#FFC9DE', // 로즈
  '#DBDCFF', // 연보라
  '#FFCBC1', // 피치
  '#C1FFC1', // 연초록
  '#FFF5BA', // 크림
];

// 기본 컬러 팔레트 (선명한 색상)
export const DEFAULT_PALETTE = [
  '#3b82f6', // 파랑
  '#10b981', // 초록
  '#8b5cf6', // 보라
  '#ef4444', // 빨강
  '#f97316', // 주황
  '#06b6d4', // 청록
  '#eab308', // 노랑
  '#ec4899', // 분홍
  '#14b8a6', // 틸
  '#6366f1', // 인디고
  '#84cc16', // 라임
  '#f43f5e', // 로즈
  '#0ea5e9', // 스카이
  '#a855f7', // 퍼플
  '#22c55e', // 그린
];

// 톤온톤 팔레트 생성 함수 (특정 색상의 밝기 변형)
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
  
  // 밝기 변형으로 15개 색상 생성 (밝은 것부터 어두운 것까지)
  const palette: string[] = [];
  const lightness_values = [85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15];
  
  for (const l of lightness_values) {
    palette.push(hsl_to_hex(h, Math.min(s + 10, 100), l));
  }
  
  return palette;
};

// 컬러 팔레트 타입
export type PaletteType = 'pastel' | 'default' | 'tone-on-tone';

// 팔레트 설정 인터페이스
export interface PaletteSettings {
  type: PaletteType;
  custom_base_color?: string; // 톤온톤일 때 기준 색상
}

// 팔레트 가져오기
export const getPalette = (settings: PaletteSettings): string[] => {
  switch (settings.type) {
    case 'pastel':
      return PASTEL_PALETTE;
    case 'default':
      return DEFAULT_PALETTE;
    case 'tone-on-tone':
      return generateToneOnTonePalette(settings.custom_base_color || '#3b82f6');
    default:
      return PASTEL_PALETTE;
  }
};

// 작업 제목 기반 해시 함수 (일관된 색상 할당)
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
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
  return { type: 'pastel' }; // 기본값: 파스텔톤
};

// 팔레트 설정 저장
export const savePaletteSettings = (settings: PaletteSettings): void => {
  localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(settings));
};

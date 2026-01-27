import { generateToneOnTonePalette, adjustColorForDarkMode } from './colorUtils';

// 팔레트 타입 정의
export type PaletteType = 'navy-orange' | 'olive-yellow' | 'pastel-rainbow' | 'ocean-blue' | 'sunset' | 'forest' | 'beige-brown' | 'pink-purple' | 'terracotta' | 'custom';

// 팔레트 설정 인터페이스
export interface PaletteSettings {
  type: PaletteType;
  custom_colors?: string[]; // 커스텀일 때 사용
  custom_base_color?: string; // 커스텀 생성 기준 색상
}

// 팔레트 데이터 인터페이스 (대표 색상 포함)
export interface PaletteData {
  type: PaletteType;
  name: string;
  colors: string[];
  primary: string; // 앱 테마 Primary 색상
  accent: string;  // 앱 테마 Accent 색상
}

// Coolors 스타일 팔레트 정의
export const COOLORS_PALETTES: Record<Exclude<PaletteType, 'custom'>, Omit<PaletteData, 'type'>> = {
  // 네이비 & 오렌지 (인기 팔레트)
  'navy-orange': {
    name: '네이비 & 오렌지',
    colors: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#287271', '#8ab17d', '#e9c46a', '#efb366', '#d68c45'],
    primary: '#264653',
    accent: '#e76f51',
  },
  // 올리브 & 노랑
  'olive-yellow': {
    name: '올리브 & 노랑',
    colors: ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25', '#7f9172', '#9b9b7a', '#d9ae94', '#c9b79c', '#e3d5ca'],
    primary: '#606c38',
    accent: '#bc6c25',
  },
  // 파스텔 레인보우
  'pastel-rainbow': {
    name: '파스텔 레인보우',
    colors: ['#c9cba3', '#ffe1a8', '#e26d5c', '#723d46', '#472d30', '#ffcad4', '#f4acb7', '#9d8189', '#d8e2dc', '#ece4db'],
    primary: '#723d46', // 조금 진한 색으로 Primary
    accent: '#e26d5c',
  },
  // 오션 블루
  'ocean-blue': {
    name: '오션 블루',
    colors: ['#03045e', '#023e8a', '#0077b6', '#0096c7', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8', '#a2d2ff'],
    primary: '#0077b6',
    accent: '#48cae4',
  },
  // 선셋 워터멜론
  'sunset': {
    name: '선셋',
    colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#f72585', '#b5179e', '#7209b7', '#560bad', '#480ca8'],
    primary: '#6a4c93',
    accent: '#ff595e',
  },
  // 포레스트 그린
  'forest': {
    name: '포레스트',
    colors: ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7', '#d8f3dc', '#1b4332', '#081c15', '#344e41'],
    primary: '#2d6a4f',
    accent: '#52b788',
  },
  // 베이지 & 브라운
  'beige-brown': {
    name: '베이지 & 브라운',
    colors: ['#582f0e', '#7f4f24', '#936639', '#a68a64', '#b6ad90', '#c2c5aa', '#a4ac86', '#656d4a', '#414833', '#333d29'],
    primary: '#582f0e',
    accent: '#a68a64',
  },
  // 핑크 & 퍼플
  'pink-purple': {
    name: '핑크 & 퍼플',
    colors: ['#ffcbf2', '#f3c4fb', '#ecbcfd', '#e5b3fe', '#e2afff', '#deaaff', '#d8bbff', '#d0d1ff', '#c8e7ff', '#c0fdff'],
    primary: '#e2afff',
    accent: '#f3c4fb',
  },
  // 테라코타
  'terracotta': {
    name: '테라코타',
    colors: ['#edc4b3', '#e6b8a2', '#deab90', '#d69f7e', '#cd9777', '#c38e70', '#b07d62', '#9d6b53', '#8a5a44', '#774936'],
    primary: '#9d6b53',
    accent: '#cd9777',
  },
};

// Storage Key
export const PALETTE_STORAGE_KEY = 'timekeeper-palette-settings';

// 팔레트 설정 저장
export const savePaletteSettings = (settings: PaletteSettings) => {
  localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(settings));
  // 이벤트 발생 (다른 컴포넌트 업데이트용)
  window.dispatchEvent(new Event('palette-changed'));
};

// 팔레트 설정 로드
export const loadPaletteSettings = (): PaletteSettings => {
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  // 기본값
  return { type: 'navy-orange' };
};

// 현재 팔레트 색상 배열 가져오기
export const getPalette = (settings: PaletteSettings): string[] => {
  if (settings.type === 'custom') {
    return settings.custom_colors || [];
  }
  return COOLORS_PALETTES[settings.type].colors;
};

/**
 * 다크모드에서 보정된 팔레트 색상 배열 가져오기
 * 너무 어두운 색상은 밝기를 높여서 가시성 확보
 * 
 * @param settings - 팔레트 설정
 * @param isDark - 다크모드 여부
 * @param minLightness - 최소 밝기 (기본값: 45%)
 * @returns 보정된 색상 배열
 */
export const getAdjustedPalette = (
  settings: PaletteSettings,
  isDark: boolean,
  minLightness: number = 45
): string[] => {
  const palette = getPalette(settings);
  
  if (!isDark) return palette;
  
  return palette.map(color => adjustColorForDarkMode(color, true, minLightness));
};

/**
 * 다크모드에서 보정된 단일 색상 가져오기
 * 
 * @param color - 원본 색상
 * @param isDark - 다크모드 여부
 * @param minLightness - 최소 밝기 (기본값: 45%)
 * @returns 보정된 색상
 */
export const getAdjustedColor = (
  color: string,
  isDark: boolean,
  minLightness: number = 45
): string => {
  return adjustColorForDarkMode(color, isDark, minLightness);
};

// 현재 팔레트의 대표 색상 가져오기
export const getPaletteThemeColors = (settings: PaletteSettings): { primary: string; accent: string } => {
  if (settings.type === 'custom') {
    // 커스텀인 경우 custom_colors의 첫 번째와 두 번째 색상을 사용하거나,
    // custom_base_color를 primary로 사용
    const primary = settings.custom_base_color || settings.custom_colors?.[0] || '#000000';
    const accent = settings.custom_colors?.[1] || primary;
    return { primary, accent };
  }
  
  const palette = COOLORS_PALETTES[settings.type];
  return {
    primary: palette.primary,
    accent: palette.accent,
  };
};

// 팔레트 목록 가져오기 (UI용)
export const getPaletteList = (): PaletteData[] => {
  return Object.entries(COOLORS_PALETTES).map(([type, data]) => ({
    type: type as PaletteType,
    ...data,
  }));
};

// 톤온톤 생성 (간이 구현 - 실제로는 colorUtils.ts 등에 있어야 함)
export { generateToneOnTonePalette } from './colorUtils';

// 작업 제목에 따른 색상 결정 (해시 기반) - deprecated, getColorByIndex 사용 권장
export const getColorForTask = (title: string, palette: string[]): string => {
  if (!palette || palette.length === 0) return '#ccc';
  
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % palette.length;
  return palette[index];
};

/**
 * 인덱스 기반 색상 반환
 * 글로벌 색상 인덱스와 함께 사용하여 색상 충돌 방지
 * 
 * @param index - 글로벌 색상 인덱스 (useTimerStore.getOrAssignColorIndex로 획득)
 * @param palette - 색상 팔레트 배열
 * @returns 해당 인덱스의 색상 (팔레트 길이를 넘으면 순환)
 */
export const getColorByIndex = (index: number, palette: string[]): string => {
  if (!palette || palette.length === 0) return '#ccc';
  return palette[index % palette.length];
};

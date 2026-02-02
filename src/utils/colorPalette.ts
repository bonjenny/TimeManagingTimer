import { generateToneOnTonePalette, adjustColorForDarkMode } from './colorUtils';

// 팔레트 타입 정의
export type PaletteType = 
  | 'navy-orange' 
  | 'olive-yellow' 
  | 'pastel-rainbow' 
  | 'ocean-blue' 
  | 'sunset' 
  | 'beige-brown' 
  | 'pink-purple' 
  | 'sky-sunset' 
  | 'forest-green' 
  | 'custom';

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
  // 올리브 & 노랑 (노란색 + 올리브 - 명도 다양화)
  'olive-yellow': {
    name: '올리브 & 노랑',
    colors: ['#4a5428', '#808000', '#a0a050', '#6a6a00', '#b0a040', '#5a6030', '#8a8a30', '#7a6a18', '#606c38', '#90a048'],
    primary: '#808000',
    accent: '#a0a050',
  },
  // 파스텔 레인보우 (흰색 계열 수정)
  'pastel-rainbow': {
    name: '파스텔 레인보우',
    colors: ['#a8a978', '#d4a574', '#e26d5c', '#723d46', '#472d30', '#c9889a', '#b8848f', '#9d8189', '#8a9a8e', '#a69082'],
    primary: '#723d46',
    accent: '#e26d5c',
  },
  // 오션 딥블루 (색조 다양화: 네이비, 청록, 딥블루 + 딥바이올렛)
  'ocean-blue': {
    name: '오션 딥블루',
    colors: ['#1a365d', '#3a3a8c', '#234e70', '#4a90b8', '#3182ce', '#3a7090', '#2b6cb0', '#4a80a0', '#3a7a9a', '#285e61'],
    primary: '#2b6cb0',
    accent: '#3182ce',
  },
  // 선셋 워터멜론
  'sunset': {
    name: '선셋',
    colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#f72585', '#b5179e', '#7209b7', '#560bad', '#480ca8'],
    primary: '#6a4c93',
    accent: '#ff595e',
  },
  // 브라운 그린 (브라운 → 그린 → 베이지 그라데이션)
  'beige-brown': {
    name: '브라운 그린',
    colors: ['#582f0e', '#a68a64', '#6b8e5a', '#3d5a45', '#4a6b52', '#7a9a30', '#556b2f', '#8b7355', '#936639', '#7f4f24'],
    primary: '#582f0e',
    accent: '#6b8e5a',
  },
  // 핑크 & 퍼플 (여린 핑크 + 퍼플-바이올렛 + 채도 높은 색)
  'pink-purple': {
    name: '핑크 & 퍼플',
    colors: ['#a0607a', '#c74080', '#d080a0', '#9932cc', '#b070c0', '#8060a0', '#c090d0', '#a040a0', '#d0a0e0', '#b080c0'],
    primary: '#9932cc',
    accent: '#c74080',
  },
  // 스카이 선셋 (청록/블루/그린 계열)
  'sky-sunset': {
    name: '스카이 선셋',
    colors: ['#0d4060', '#1e6091', '#168aad', '#52b69a', '#6aaac0', '#34a0a4', '#4a8a9a', '#7ab0a0', '#1a5a6a', '#2a6a7a'],
    primary: '#168aad',
    accent: '#52b69a',
  },
  // 포레스트 그린 (짙은 그린 + 밝은 그린 분산)
  'forest-green': {
    name: '포레스트 그린',
    colors: ['#2d5a45', '#20796c', '#3a8a6a', '#6b8e23', '#228b22', '#2e8b57', '#4a9a7a', '#556b2f', '#6b9a52', '#3d6b4a'],
    primary: '#2d5a45',
    accent: '#2e8b57',
  },
  // 핑크 스카이 (라벤더 → 스카이블루 → 핑크 → 딥블루 → 청록 → 베이지 그라데이션)
  'pink-sky': {
    name: '핑크 스카이',
    colors: ['#9070a0', '#4a90c0', '#c07088', '#0a5a8a', '#7080a8', '#2090a0', '#4a9a9a', '#a08070', '#9a8060', '#806850'],
    primary: '#2090a0',
    accent: '#c07088',
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

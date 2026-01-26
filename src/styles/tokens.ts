/**
 * 디자인 토큰 - 중앙 집중식 색상/스타일 관리
 * 
 * 클린 아키텍처 원칙:
 * 1. 모든 색상 값은 이 파일에서 정의
 * 2. 컴포넌트는 CSS 변수 또는 이 파일의 토큰을 참조
 * 3. 변경 시 한 곳만 수정하면 전체 적용
 */

// ============================================================
// 시맨틱 색상 토큰 (의미 기반)
// ============================================================

export const semanticColors = {
  // 기본 텍스트
  textPrimary: 'var(--text-primary, #000000)',
  textSecondary: 'var(--text-secondary, #666666)',
  textDisabled: 'var(--text-disabled, #999999)',
  textInverse: 'var(--text-inverse, #ffffff)',

  // 배경
  bgPrimary: 'var(--bg-primary, #fafafa)',
  bgSecondary: 'var(--bg-secondary, #ffffff)',
  bgTertiary: 'var(--bg-tertiary, #f5f5f5)',
  bgHover: 'var(--bg-hover, #f0f0f0)',
  bgSelected: 'var(--bg-selected, #e8e8e8)',

  // 테두리
  borderDefault: 'var(--border-color, #eaeaea)',
  borderHover: 'var(--border-hover, #cccccc)',
  borderFocus: 'var(--border-focus, #000000)',

  // 강조색 (컬러 팔레트 연동)
  highlight: 'var(--highlight-color, #000000)',
  highlightHover: 'var(--highlight-hover, #333333)',
  highlightLight: 'var(--highlight-light, #f5f5f5)',

  // 상태 색상
  success: 'var(--success-color, #10b981)',
  warning: 'var(--warning-color, #f59e0b)',
  error: 'var(--error-color, #ef4444)',
  info: 'var(--info-color, #3b82f6)',
};

// ============================================================
// 컴포넌트별 토큰
// ============================================================

export const componentTokens = {
  // 버튼
  button: {
    primary: {
      bg: semanticColors.highlight,
      bgHover: semanticColors.highlightHover,
      text: semanticColors.textInverse,
    },
    secondary: {
      bg: semanticColors.bgTertiary,
      bgHover: semanticColors.bgHover,
      text: semanticColors.textPrimary,
    },
    outlined: {
      border: semanticColors.borderDefault,
      borderHover: semanticColors.highlight,
      text: semanticColors.textPrimary,
    },
  },

  // 카드/패널
  card: {
    bg: semanticColors.bgSecondary,
    border: semanticColors.borderDefault,
    shadow: '0px 2px 4px rgba(0,0,0,0.05)',
  },

  // 입력 필드
  input: {
    bg: semanticColors.bgSecondary,
    border: semanticColors.borderDefault,
    borderFocus: semanticColors.highlight,
    placeholder: semanticColors.textDisabled,
  },

  // 날짜 선택기
  datePicker: {
    todayBg: semanticColors.highlight,
    todayText: semanticColors.textInverse,
    otherBg: semanticColors.bgTertiary,
    otherText: semanticColors.textPrimary,
  },

  // 칩/태그
  chip: {
    bg: semanticColors.bgTertiary,
    text: semanticColors.textPrimary,
    border: semanticColors.borderDefault,
  },

  // 타임라인/간트
  timeline: {
    headerBg: semanticColors.bgTertiary,
    gridLine: semanticColors.borderDefault,
    currentTime: semanticColors.error,
  },
};

// ============================================================
// CSS 변수 업데이트 함수
// ============================================================

export interface ThemeColors {
  primary: string;
  accent: string;
  highlight?: string;
}

/**
 * 테마 색상 적용
 * 설정 페이지에서 테마 변경 시 호출
 */
export const applyThemeColors = (colors: ThemeColors): void => {
  const root = document.documentElement;
  root.style.setProperty('--primary-color', colors.primary);
  root.style.setProperty('--accent-color', colors.accent);
  
  // 강조색 (하이라이트) - 테마 색상 사용
  root.style.setProperty('--highlight-color', colors.primary);
  root.style.setProperty('--highlight-hover', colors.accent);
  
  // 연한 강조색 (primary 기반)
  const light_highlight = hexToRgba(colors.primary, 0.1);
  root.style.setProperty('--highlight-light', light_highlight);
};

/**
 * 컬러 팔레트 강조색 적용
 * 팔레트 변경 시 첫 번째 색상을 강조색으로 사용
 */
export const applyPaletteHighlight = (palette_colors: string[]): void => {
  if (palette_colors.length === 0) return;
  
  const root = document.documentElement;
  const primary = palette_colors[0];
  
  // 팔레트 첫 번째 색상을 강조색으로
  root.style.setProperty('--palette-primary', primary);
  
  // 연한 버전
  const light = hexToRgba(primary, 0.15);
  root.style.setProperty('--palette-light', light);
};

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * HEX를 RGBA로 변환
 */
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * 색상 밝기 조절
 */
export const adjustBrightness = (hex: string, percent: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);
  
  r = Math.min(255, Math.max(0, r + (r * percent / 100)));
  g = Math.min(255, Math.max(0, g + (g * percent / 100)));
  b = Math.min(255, Math.max(0, b + (b * percent / 100)));
  
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
};

// ============================================================
// SX Props 헬퍼 (MUI 컴포넌트용)
// ============================================================

/**
 * 공통 버튼 스타일
 */
export const buttonStyles = {
  primary: {
    bgcolor: semanticColors.highlight,
    color: semanticColors.textInverse,
    '&:hover': { bgcolor: semanticColors.highlightHover },
    '&.Mui-disabled': { bgcolor: semanticColors.bgTertiary },
  },
  secondary: {
    bgcolor: semanticColors.bgTertiary,
    color: semanticColors.textPrimary,
    '&:hover': { bgcolor: semanticColors.bgHover },
  },
  outlined: {
    borderColor: semanticColors.borderDefault,
    color: semanticColors.textPrimary,
    '&:hover': { borderColor: semanticColors.highlight },
  },
};

/**
 * 공통 카드 스타일
 */
export const cardStyles = {
  default: {
    bgcolor: semanticColors.bgSecondary,
    borderColor: semanticColors.borderDefault,
  },
  hover: {
    bgcolor: semanticColors.bgSecondary,
    borderColor: semanticColors.borderDefault,
    '&:hover': { borderColor: semanticColors.borderHover },
  },
};

/**
 * 날짜 뱃지 스타일 (오늘/다른 날)
 */
export const dateBadgeStyles = {
  today: {
    bgcolor: semanticColors.highlight,
    color: semanticColors.textInverse,
  },
  other: {
    bgcolor: semanticColors.bgTertiary,
    color: semanticColors.textPrimary,
  },
};

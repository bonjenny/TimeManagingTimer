// Hex to HSL 변환
export const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  
  r /= 255;
  g /= 255;
  b /= 255;
  
  const cmin = Math.min(r,g,b),
        cmax = Math.max(r,g,b),
        delta = cmax - cmin;
  let h = 0,
      s = 0,
      l = 0;

  if (delta === 0)
    h = 0;
  else if (cmax === r)
    h = ((g - b) / delta) % 6;
  else if (cmax === g)
    h = (b - r) / delta + 2;
  else
    h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  if (h < 0)
    h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
};

// HSL to Hex 변환
export const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;

  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = l - c / 2,
      r = 0,
      g = 0,
      b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return "#" + toHex(r) + toHex(g) + toHex(b);
};

// 톤온톤 팔레트 생성 (10가지 색상)
// 색상/채도/명도 다양화, 너무 밝은 색상 제외
export const generateToneOnTonePalette = (baseColor: string): string[] => {
  const { h, s } = hexToHsl(baseColor);
  
  const palette: string[] = [];
  
  // 색조 변화 함수 (±15도 범위)
  const shiftHue = (hue: number, shift: number) => (hue + shift + 360) % 360;
  
  // 1. 밝은 톤 (명도 65~70%, 너무 밝은 95%는 제외)
  palette.push(hslToHex(h, Math.max(s - 10, 30), 70));
  palette.push(hslToHex(shiftHue(h, 10), Math.max(s, 40), 65));
  
  // 2. 중간 밝기 (명도 50~60%)
  palette.push(hslToHex(h, Math.min(s + 10, 100), 60));
  palette.push(hslToHex(shiftHue(h, -10), Math.min(s + 20, 100), 55));
  palette.push(hslToHex(h, Math.min(s + 30, 100), 50));
  
  // 3. 진한 톤 (명도 35~45%)
  palette.push(hslToHex(shiftHue(h, 15), Math.min(s + 20, 100), 45));
  palette.push(hslToHex(h, Math.min(s + 40, 100), 40));
  palette.push(hslToHex(shiftHue(h, -15), Math.min(s + 30, 100), 35));
  
  // 4. 어두운 톤 (명도 20~30%)
  palette.push(hslToHex(h, Math.max(s - 10, 20), 25));
  
  // 5. 강조용 (채도 높은 중간 명도)
  palette.push(hslToHex(h, Math.min(s + 50, 100), 45));
  
  return palette;
};

/**
 * 다크모드에서 색상 밝기 자동 보정
 * 색상이 너무 어두우면 같은 색조(hue)를 유지하면서 밝기를 높임
 * 
 * @param hex - HEX 색상 코드 (#RRGGBB 또는 #RGB)
 * @param isDark - 다크모드 여부
 * @param minLightness - 다크모드에서 최소 밝기 (기본값: 45%)
 * @returns 보정된 HEX 색상 코드
 */
export const adjustColorForDarkMode = (
  hex: string,
  isDark: boolean,
  minLightness: number = 45
): string => {
  if (!isDark || !hex || !hex.startsWith('#')) return hex;
  
  const { h, s, l } = hexToHsl(hex);
  
  // 밝기가 최소값보다 낮으면 보정
  if (l < minLightness) {
    // 채도도 약간 높여서 색감 유지
    const adjustedSaturation = Math.min(s + 10, 100);
    return hslToHex(h, adjustedSaturation, minLightness);
  }
  
  return hex;
};

/**
 * 색상의 밝기(luminance) 계산
 * 0 (어두움) ~ 100 (밝음)
 */
export const getColorLightness = (hex: string): number => {
  const { l } = hexToHsl(hex);
  return l;
};

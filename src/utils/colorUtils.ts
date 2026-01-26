// Hex to HSL 변환
const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
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
const hslToHex = (h: number, s: number, l: number): string => {
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
export const generateToneOnTonePalette = (baseColor: string): string[] => {
  const { h, s, l } = hexToHsl(baseColor);
  
  const palette: string[] = [];
  
  // 다양한 명도와 채도로 10가지 색상 생성
  // 1. 아주 밝은
  palette.push(hslToHex(h, Math.max(s - 10, 10), 95));
  palette.push(hslToHex(h, Math.max(s - 5, 20), 85));
  palette.push(hslToHex(h, s, 75));
  
  // 2. 중간 (기준 색상 포함)
  palette.push(hslToHex(h, Math.min(s + 10, 100), 65));
  palette.push(hslToHex(h, Math.min(s + 20, 100), 55)); // 기준 명도에 가까움
  
  // 3. 진한
  palette.push(hslToHex(h, Math.min(s + 30, 100), 45));
  palette.push(hslToHex(h, Math.min(s + 40, 100), 35));
  palette.push(hslToHex(h, Math.min(s + 30, 100), 25));
  
  // 4. 아주 어두운 / 다른 톤
  palette.push(hslToHex(h, Math.max(s - 20, 10), 15));
  
  // 5. 강조용 (보색에 가까운 톤온톤? 또는 채도가 매우 높은)
  palette.push(hslToHex(h, 100, 50));
  
  // 기준 색상이 포함되지 않았을 수 있으므로 중간쯤에 강제로 넣거나, 생성 로직을 따름
  // 여기서는 단순히 자동 생성된 10개를 반환
  
  return palette;
};

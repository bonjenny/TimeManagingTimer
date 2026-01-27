/**
 * v0.10.4 테스트: 색상 유틸리티 함수
 * - hexToHsl / hslToHex 변환
 * - adjustColorForDarkMode 다크모드 색상 보정
 * - getColorLightness 밝기 계산
 */
import {
  hexToHsl,
  hslToHex,
  adjustColorForDarkMode,
  getColorLightness,
  generateToneOnTonePalette,
} from '../../utils/colorUtils';

describe('colorUtils', () => {
  describe('hexToHsl', () => {
    it('순수 빨간색(#ff0000)을 HSL로 변환한다', () => {
      const result = hexToHsl('#ff0000');
      expect(result.h).toBe(0);
      expect(result.s).toBe(100);
      expect(result.l).toBe(50);
    });

    it('순수 초록색(#00ff00)을 HSL로 변환한다', () => {
      const result = hexToHsl('#00ff00');
      expect(result.h).toBe(120);
      expect(result.s).toBe(100);
      expect(result.l).toBe(50);
    });

    it('순수 파란색(#0000ff)을 HSL로 변환한다', () => {
      const result = hexToHsl('#0000ff');
      expect(result.h).toBe(240);
      expect(result.s).toBe(100);
      expect(result.l).toBe(50);
    });

    it('검정색(#000000)은 밝기 0이다', () => {
      const result = hexToHsl('#000000');
      expect(result.l).toBe(0);
    });

    it('흰색(#ffffff)은 밝기 100이다', () => {
      const result = hexToHsl('#ffffff');
      expect(result.l).toBe(100);
    });

    it('짧은 HEX 형식(#f00)도 처리한다', () => {
      const result = hexToHsl('#f00');
      expect(result.h).toBe(0);
      expect(result.s).toBe(100);
      expect(result.l).toBe(50);
    });

    it('어두운 색상(#264653)의 밝기가 낮다', () => {
      const result = hexToHsl('#264653');
      expect(result.l).toBeLessThan(30);
    });
  });

  describe('hslToHex', () => {
    it('HSL(0, 100, 50)을 빨간색(#ff0000)으로 변환한다', () => {
      const result = hslToHex(0, 100, 50);
      expect(result.toLowerCase()).toBe('#ff0000');
    });

    it('HSL(120, 100, 50)을 초록색(#00ff00)으로 변환한다', () => {
      const result = hslToHex(120, 100, 50);
      expect(result.toLowerCase()).toBe('#00ff00');
    });

    it('HSL(240, 100, 50)을 파란색(#0000ff)으로 변환한다', () => {
      const result = hslToHex(240, 100, 50);
      expect(result.toLowerCase()).toBe('#0000ff');
    });

    it('HSL(0, 0, 0)을 검정색(#000000)으로 변환한다', () => {
      const result = hslToHex(0, 0, 0);
      expect(result.toLowerCase()).toBe('#000000');
    });

    it('HSL(0, 0, 100)을 흰색(#ffffff)으로 변환한다', () => {
      const result = hslToHex(0, 0, 100);
      expect(result.toLowerCase()).toBe('#ffffff');
    });
  });

  describe('hexToHsl + hslToHex 왕복 변환', () => {
    const test_colors = ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'];

    test_colors.forEach((color) => {
      it(`${color}의 왕복 변환이 유사한 값을 반환한다`, () => {
        const hsl = hexToHsl(color);
        const back = hslToHex(hsl.h, hsl.s, hsl.l);
        
        // HEX 값이 완전히 같거나, RGB 차이가 1 이내여야 함
        const original_r = parseInt(color.slice(1, 3), 16);
        const original_g = parseInt(color.slice(3, 5), 16);
        const original_b = parseInt(color.slice(5, 7), 16);
        
        const back_r = parseInt(back.slice(1, 3), 16);
        const back_g = parseInt(back.slice(3, 5), 16);
        const back_b = parseInt(back.slice(5, 7), 16);
        
        expect(Math.abs(original_r - back_r)).toBeLessThanOrEqual(1);
        expect(Math.abs(original_g - back_g)).toBeLessThanOrEqual(1);
        expect(Math.abs(original_b - back_b)).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('adjustColorForDarkMode', () => {
    it('라이트모드에서는 색상을 변경하지 않는다', () => {
      const dark_color = '#264653';
      const result = adjustColorForDarkMode(dark_color, false);
      expect(result).toBe(dark_color);
    });

    it('다크모드에서 어두운 색상(밝기 < 45%)을 밝게 보정한다', () => {
      const dark_color = '#264653'; // 밝기 약 25%
      const result = adjustColorForDarkMode(dark_color, true, 45);
      
      const original_lightness = getColorLightness(dark_color);
      const result_lightness = getColorLightness(result);
      
      expect(original_lightness).toBeLessThan(45);
      expect(result_lightness).toBeGreaterThanOrEqual(45);
    });

    it('다크모드에서 이미 밝은 색상은 변경하지 않는다', () => {
      const bright_color = '#e9c46a'; // 밝기 약 66%
      const result = adjustColorForDarkMode(bright_color, true, 45);
      
      expect(result).toBe(bright_color);
    });

    it('같은 색조(hue)를 유지한다', () => {
      const dark_color = '#264653';
      const result = adjustColorForDarkMode(dark_color, true, 45);
      
      const original_hsl = hexToHsl(dark_color);
      const result_hsl = hexToHsl(result);
      
      // 색조(hue)가 같아야 함
      expect(result_hsl.h).toBe(original_hsl.h);
    });

    it('유효하지 않은 HEX 값은 그대로 반환한다', () => {
      expect(adjustColorForDarkMode('invalid', true)).toBe('invalid');
      expect(adjustColorForDarkMode('', true)).toBe('');
      expect(adjustColorForDarkMode('rgb(0,0,0)', true)).toBe('rgb(0,0,0)');
    });

    it('minLightness 파라미터를 커스텀할 수 있다', () => {
      const dark_color = '#333333'; // 밝기 약 20%
      
      const result_45 = adjustColorForDarkMode(dark_color, true, 45);
      const result_60 = adjustColorForDarkMode(dark_color, true, 60);
      
      const lightness_45 = getColorLightness(result_45);
      const lightness_60 = getColorLightness(result_60);
      
      // 반올림 오차 허용 (0.5%)
      expect(lightness_45).toBeGreaterThanOrEqual(44);
      expect(lightness_60).toBeGreaterThanOrEqual(59);
    });
  });

  describe('getColorLightness', () => {
    it('검정색(#000000)의 밝기는 0이다', () => {
      expect(getColorLightness('#000000')).toBe(0);
    });

    it('흰색(#ffffff)의 밝기는 100이다', () => {
      expect(getColorLightness('#ffffff')).toBe(100);
    });

    it('중간 회색(#808080)의 밝기는 약 50이다', () => {
      const lightness = getColorLightness('#808080');
      expect(lightness).toBeGreaterThan(45);
      expect(lightness).toBeLessThan(55);
    });

    it('어두운 색상(#264653)의 밝기가 30 미만이다', () => {
      const lightness = getColorLightness('#264653');
      expect(lightness).toBeLessThan(30);
    });

    it('밝은 색상(#e9c46a)의 밝기가 60 이상이다', () => {
      const lightness = getColorLightness('#e9c46a');
      expect(lightness).toBeGreaterThan(60);
    });
  });

  describe('generateToneOnTonePalette', () => {
    it('10가지 색상을 생성한다', () => {
      const palette = generateToneOnTonePalette('#264653');
      expect(palette.length).toBe(10);
    });

    it('모든 색상이 유효한 HEX 형식이다', () => {
      const palette = generateToneOnTonePalette('#2a9d8f');
      const hex_regex = /^#[0-9a-f]{6}$/i;
      
      palette.forEach((color) => {
        expect(color).toMatch(hex_regex);
      });
    });

    it('다양한 밝기의 색상을 포함한다', () => {
      const palette = generateToneOnTonePalette('#e76f51');
      const lightness_values = palette.map(getColorLightness);
      
      // 밝은 색상(L > 70)과 어두운 색상(L < 30)이 모두 포함되어야 함
      const has_bright = lightness_values.some(l => l > 70);
      const has_dark = lightness_values.some(l => l < 30);
      
      expect(has_bright).toBe(true);
      expect(has_dark).toBe(true);
    });
  });
});

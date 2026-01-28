/**
 * v0.7.0/v0.8.0/v0.10.5 테스트: 컬러 팔레트 기능
 * - v0.10.5: getAdjustedPalette, getAdjustedColor 추가
 */
import {
  COOLORS_PALETTES,
  getPalette,
  getAdjustedPalette,
  getAdjustedColor,
  getPaletteList,
  getColorForTask,
  getColorByIndex,
  loadPaletteSettings,
  savePaletteSettings,
  PALETTE_STORAGE_KEY,
  PaletteSettings,
} from '../../utils/colorPalette';
import { getColorLightness } from '../../utils/colorUtils';

describe('colorPalette', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('COOLORS_PALETTES', () => {
    it('모든 팔레트가 10개의 색상을 가진다', () => {
      Object.values(COOLORS_PALETTES).forEach((palette) => {
        expect(palette.colors.length).toBe(10);
      });
    });

    it('모든 색상이 유효한 HEX 형식이다', () => {
      const hex_regex = /^#[0-9A-Fa-f]{6}$/;
      
      Object.values(COOLORS_PALETTES).forEach((palette) => {
        palette.colors.forEach((color) => {
          expect(color).toMatch(hex_regex);
        });
      });
    });

    it('각 팔레트가 고유한 이름을 가진다', () => {
      const names = Object.values(COOLORS_PALETTES).map((p) => p.name);
      const unique_names = new Set(names);
      expect(unique_names.size).toBe(names.length);
    });

    it('10개의 Coolors 팔레트가 있다', () => {
      const palette_count = Object.keys(COOLORS_PALETTES).length;
      expect(palette_count).toBe(10);
    });
  });

  describe('getPalette', () => {
    it('Coolors 팔레트 타입으로 올바른 팔레트를 반환한다', () => {
      const settings: PaletteSettings = { type: 'navy-orange' };
      const palette = getPalette(settings);

      expect(palette).toEqual(COOLORS_PALETTES['navy-orange'].colors);
    });

    it('ocean-blue 타입으로 올바른 팔레트를 반환한다', () => {
      const settings: PaletteSettings = { type: 'ocean-blue' };
      const palette = getPalette(settings);

      expect(palette).toEqual(COOLORS_PALETTES['ocean-blue'].colors);
    });

    it('커스텀 타입은 custom_colors를 반환한다', () => {
      const custom_colors = ['#ff0000', '#00ff00', '#0000ff'];
      const settings: PaletteSettings = { type: 'custom', custom_colors };
      const palette = getPalette(settings);

      expect(palette).toEqual(custom_colors);
    });

    it('커스텀 타입에 custom_colors가 없으면 빈 배열을 반환한다', () => {
      const settings: PaletteSettings = { type: 'custom' };
      const palette = getPalette(settings);

      expect(palette).toEqual([]);
    });
  });

  describe('getPaletteList', () => {
    it('10개의 팔레트 옵션을 반환한다', () => {
      const list = getPaletteList();
      expect(list.length).toBe(10); // Coolors 10개
    });

    it('각 팔레트에 type, name, colors가 포함된다', () => {
      const list = getPaletteList();

      list.forEach((palette) => {
        expect(palette).toHaveProperty('type');
        expect(palette).toHaveProperty('name');
        expect(palette).toHaveProperty('colors');
        expect(Array.isArray(palette.colors)).toBe(true);
      });
    });

    it('각 팔레트에 primary와 accent 색상이 포함된다', () => {
      const list = getPaletteList();

      list.forEach((palette) => {
        expect(palette).toHaveProperty('primary');
        expect(palette).toHaveProperty('accent');
        expect(palette.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(palette.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('getColorForTask', () => {
    const test_palette = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];

    it('같은 제목에 대해 항상 같은 색상을 반환한다', () => {
      const color1 = getColorForTask('테스트 작업', test_palette);
      const color2 = getColorForTask('테스트 작업', test_palette);
      const color3 = getColorForTask('테스트 작업', test_palette);

      expect(color1).toBe(color2);
      expect(color2).toBe(color3);
    });

    it('다른 제목에 대해 (대부분) 다른 색상을 반환한다', () => {
      const colors = new Set<string>();
      const titles = ['작업 A', '작업 B', '작업 C', '작업 D', '작업 E'];

      titles.forEach((title) => {
        colors.add(getColorForTask(title, test_palette));
      });

      // 최소 2개 이상의 다른 색상이 할당되어야 함
      expect(colors.size).toBeGreaterThan(1);
    });

    it('반환된 색상이 팔레트에 존재한다', () => {
      const titles = ['회의', '개발', '테스트', '분석', '배포'];

      titles.forEach((title) => {
        const color = getColorForTask(title, test_palette);
        expect(test_palette).toContain(color);
      });
    });

    it('빈 문자열 제목도 유효한 색상을 반환한다', () => {
      const color = getColorForTask('', test_palette);
      expect(test_palette).toContain(color);
    });

    it('한글, 영어, 숫자 조합 제목도 처리한다', () => {
      const titles = ['작업123', 'Task123', '작업Task', '123', '!@#'];

      titles.forEach((title) => {
        const color = getColorForTask(title, test_palette);
        expect(test_palette).toContain(color);
      });
    });

    it('빈 팔레트는 기본색을 반환한다', () => {
      const color = getColorForTask('테스트', []);
      expect(color).toBe('#ccc');
    });
  });

  describe('savePaletteSettings / loadPaletteSettings', () => {
    it('설정을 저장하고 로드할 수 있다', () => {
      const settings: PaletteSettings = {
        type: 'ocean-blue',
      };

      savePaletteSettings(settings);
      const loaded = loadPaletteSettings();

      expect(loaded.type).toBe('ocean-blue');
    });

    it('저장된 설정이 없으면 기본값(navy-orange)을 반환한다', () => {
      const loaded = loadPaletteSettings();
      expect(loaded.type).toBe('navy-orange');
    });

    it('잘못된 JSON이 저장된 경우 기본값을 반환한다', () => {
      localStorage.setItem(PALETTE_STORAGE_KEY, 'invalid-json');

      const loaded = loadPaletteSettings();
      expect(loaded.type).toBe('navy-orange');
    });

    it('localStorage에 올바른 키로 저장된다', () => {
      const settings: PaletteSettings = { type: 'sunset' };

      savePaletteSettings(settings);

      const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(settings);
    });

    it('커스텀 설정을 저장하고 로드할 수 있다', () => {
      const settings: PaletteSettings = {
        type: 'custom',
        custom_colors: ['#ff0000', '#00ff00'],
        custom_base_color: '#ff0000',
      };

      savePaletteSettings(settings);
      const loaded = loadPaletteSettings();

      expect(loaded.type).toBe('custom');
      expect(loaded.custom_colors).toEqual(['#ff0000', '#00ff00']);
      expect(loaded.custom_base_color).toBe('#ff0000');
    });
  });

  describe('팔레트 색상 품질', () => {
    it('모든 팔레트에 최소 5개 이상의 색상이 있다', () => {
      const palette_list = getPaletteList();

      palette_list.forEach((palette) => {
        expect(palette.colors.length).toBeGreaterThanOrEqual(5);
      });
    });

    it('모든 Coolors 팔레트가 10개의 색상을 가진다', () => {
      Object.values(COOLORS_PALETTES).forEach((palette) => {
        expect(palette.colors.length).toBe(10);
      });
    });
  });

  // v0.10.5: 다크모드 색상 보정 함수 테스트
  describe('getAdjustedPalette (v0.10.5)', () => {
    it('라이트모드에서는 원본 팔레트를 그대로 반환한다', () => {
      const settings: PaletteSettings = { type: 'navy-orange' };
      const original = getPalette(settings);
      const adjusted = getAdjustedPalette(settings, false);
      
      expect(adjusted).toEqual(original);
    });

    it('다크모드에서 어두운 색상들이 보정된 팔레트를 반환한다', () => {
      const settings: PaletteSettings = { type: 'navy-orange' };
      const adjusted = getAdjustedPalette(settings, true, 45);
      
      // 보정된 팔레트의 모든 색상 밝기가 최소 45% 이상이어야 함
      adjusted.forEach((color) => {
        const lightness = getColorLightness(color);
        expect(lightness).toBeGreaterThanOrEqual(44); // 반올림 오차 허용
      });
    });

    it('다크모드에서 이미 밝은 색상은 변경하지 않는다', () => {
      const settings: PaletteSettings = { type: 'pink-purple' }; // 밝은 색상 팔레트
      const original = getPalette(settings);
      const adjusted = getAdjustedPalette(settings, true, 45);
      
      // 원래 밝기가 45% 이상인 색상은 변경되지 않아야 함
      original.forEach((color, idx) => {
        const original_lightness = getColorLightness(color);
        if (original_lightness >= 45) {
          expect(adjusted[idx]).toBe(color);
        }
      });
    });

    it('minLightness 파라미터가 적용된다', () => {
      const settings: PaletteSettings = { type: 'navy-orange' };
      const adjusted_45 = getAdjustedPalette(settings, true, 45);
      const adjusted_60 = getAdjustedPalette(settings, true, 60);
      
      // 더 높은 minLightness로 보정된 팔레트가 더 밝아야 함
      adjusted_45.forEach((color_45, idx) => {
        const lightness_45 = getColorLightness(color_45);
        const lightness_60 = getColorLightness(adjusted_60[idx]);
        
        expect(lightness_60).toBeGreaterThanOrEqual(lightness_45);
      });
    });

    it('커스텀 팔레트에서도 동작한다', () => {
      const settings: PaletteSettings = {
        type: 'custom',
        custom_colors: ['#000000', '#333333', '#666666', '#ffffff'],
      };
      const adjusted = getAdjustedPalette(settings, true, 45);
      
      expect(adjusted.length).toBe(4);
      adjusted.forEach((color) => {
        const lightness = getColorLightness(color);
        expect(lightness).toBeGreaterThanOrEqual(44);
      });
    });

    it('빈 커스텀 팔레트는 빈 배열을 반환한다', () => {
      const settings: PaletteSettings = {
        type: 'custom',
        custom_colors: [],
      };
      const adjusted = getAdjustedPalette(settings, true);
      
      expect(adjusted).toEqual([]);
    });
  });

  describe('getAdjustedColor (v0.10.5)', () => {
    it('라이트모드에서는 원본 색상을 그대로 반환한다', () => {
      const dark_color = '#264653';
      const result = getAdjustedColor(dark_color, false);
      
      expect(result).toBe(dark_color);
    });

    it('다크모드에서 어두운 색상을 밝게 보정한다', () => {
      const dark_color = '#264653'; // 밝기 약 25%
      const result = getAdjustedColor(dark_color, true, 45);
      
      const result_lightness = getColorLightness(result);
      expect(result_lightness).toBeGreaterThanOrEqual(44);
    });

    it('다크모드에서 이미 밝은 색상은 변경하지 않는다', () => {
      const bright_color = '#e9c46a'; // 밝기 약 66%
      const result = getAdjustedColor(bright_color, true, 45);
      
      expect(result).toBe(bright_color);
    });

    it('minLightness 파라미터를 커스텀할 수 있다', () => {
      const dark_color = '#333333';
      
      const result_45 = getAdjustedColor(dark_color, true, 45);
      const result_60 = getAdjustedColor(dark_color, true, 60);
      
      const lightness_45 = getColorLightness(result_45);
      const lightness_60 = getColorLightness(result_60);
      
      expect(lightness_45).toBeGreaterThanOrEqual(44);
      expect(lightness_60).toBeGreaterThanOrEqual(59);
    });

    it('유효하지 않은 HEX 값은 그대로 반환한다', () => {
      expect(getAdjustedColor('invalid', true)).toBe('invalid');
      expect(getAdjustedColor('', true)).toBe('');
      expect(getAdjustedColor('rgb(0,0,0)', true)).toBe('rgb(0,0,0)');
    });
  });

  // v0.12.2: 글로벌 색상 인덱스 기반 색상 할당
  describe('getColorByIndex (v0.12.2)', () => {
    const test_palette = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];

    it('인덱스에 해당하는 색상을 반환한다', () => {
      expect(getColorByIndex(0, test_palette)).toBe('#ff0000');
      expect(getColorByIndex(1, test_palette)).toBe('#00ff00');
      expect(getColorByIndex(2, test_palette)).toBe('#0000ff');
      expect(getColorByIndex(3, test_palette)).toBe('#ffff00');
      expect(getColorByIndex(4, test_palette)).toBe('#ff00ff');
    });

    it('팔레트 길이를 초과하는 인덱스는 순환한다', () => {
      expect(getColorByIndex(5, test_palette)).toBe('#ff0000'); // 5 % 5 = 0
      expect(getColorByIndex(6, test_palette)).toBe('#00ff00'); // 6 % 5 = 1
      expect(getColorByIndex(10, test_palette)).toBe('#ff0000'); // 10 % 5 = 0
      expect(getColorByIndex(11, test_palette)).toBe('#00ff00'); // 11 % 5 = 1
    });

    it('연속된 인덱스는 서로 다른 색상을 반환한다', () => {
      const colors = [];
      for (let i = 0; i < test_palette.length; i++) {
        colors.push(getColorByIndex(i, test_palette));
      }
      
      // 팔레트 길이 내에서 모든 색상이 다름
      const unique_colors = new Set(colors);
      expect(unique_colors.size).toBe(test_palette.length);
    });

    it('빈 팔레트는 기본색을 반환한다', () => {
      expect(getColorByIndex(0, [])).toBe('#ccc');
      expect(getColorByIndex(5, [])).toBe('#ccc');
    });

    it('같은 인덱스는 항상 같은 색상을 반환한다', () => {
      const index = 3;
      const color1 = getColorByIndex(index, test_palette);
      const color2 = getColorByIndex(index, test_palette);
      const color3 = getColorByIndex(index, test_palette);

      expect(color1).toBe(color2);
      expect(color2).toBe(color3);
    });
  });
});

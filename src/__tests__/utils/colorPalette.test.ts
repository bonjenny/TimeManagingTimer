/**
 * v0.7.0/v0.8.0 테스트: 컬러 팔레트 기능
 */
import {
  COOLORS_PALETTES,
  PASTEL_PALETTE,
  DEFAULT_PALETTE,
  getPalette,
  getPaletteList,
  getColorForTask,
  loadPaletteSettings,
  savePaletteSettings,
  PALETTE_STORAGE_KEY,
  PaletteSettings,
} from '../../utils/colorPalette';

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
  });

  describe('getPalette', () => {
    it('Coolors 팔레트 타입으로 올바른 팔레트를 반환한다', () => {
      const settings: PaletteSettings = { type: 'navy-orange' };
      const palette = getPalette(settings);

      expect(palette).toEqual(COOLORS_PALETTES['navy-orange'].colors);
    });

    it('pastel 타입으로 PASTEL_PALETTE를 반환한다', () => {
      const settings: PaletteSettings = { type: 'pastel' };
      const palette = getPalette(settings);

      expect(palette).toEqual(PASTEL_PALETTE);
    });

    it('default 타입으로 DEFAULT_PALETTE를 반환한다', () => {
      const settings: PaletteSettings = { type: 'default' };
      const palette = getPalette(settings);

      expect(palette).toEqual(DEFAULT_PALETTE);
    });

    it('알 수 없는 타입은 기본값(navy-orange)을 반환한다', () => {
      const settings = { type: 'unknown-type' } as PaletteSettings;
      const palette = getPalette(settings);

      expect(palette).toEqual(COOLORS_PALETTES['navy-orange'].colors);
    });
  });

  describe('getPaletteList', () => {
    it('12개의 팔레트 옵션을 반환한다', () => {
      const list = getPaletteList();
      expect(list.length).toBe(12); // Coolors 10개 + pastel + default
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
  });

  describe('팔레트 색상 품질', () => {
    it('모든 팔레트에 최소 5개 이상의 색상이 있다', () => {
      const palette_list = getPaletteList();

      palette_list.forEach((palette) => {
        expect(palette.colors.length).toBeGreaterThanOrEqual(5);
      });
    });

    it('PASTEL_PALETTE에 15개의 색상이 있다', () => {
      expect(PASTEL_PALETTE.length).toBe(15);
    });

    it('DEFAULT_PALETTE에 15개의 색상이 있다', () => {
      expect(DEFAULT_PALETTE.length).toBe(15);
    });
  });
});

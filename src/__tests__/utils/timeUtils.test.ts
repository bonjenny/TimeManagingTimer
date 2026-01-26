/**
 * 시간 유틸리티 함수 테스트
 * v0.1.0: 기본 포맷팅 함수
 * v0.7.0: 점심시간 제외 계산 기능
 */
import { 
  formatDuration, 
  formatTimeRange, 
  calculateDurationExcludingLunch,
  getDurationSecondsExcludingLunch,
  LunchTimeSettings,
} from '../../utils/timeUtils';

describe('timeUtils', () => {
  describe('formatDuration', () => {
    it('0초를 올바르게 포맷한다', () => {
      const result = formatDuration(0);
      expect(result).toContain('0분');
    });

    it('60초를 1분으로 포맷한다', () => {
      const result = formatDuration(60);
      expect(result).toContain('1분');
    });

    it('3600초를 1시간으로 포맷한다', () => {
      const result = formatDuration(3600);
      expect(result).toContain('01:00');
    });

    it('3661초를 1시간 1분 1초로 포맷한다', () => {
      const result = formatDuration(3661);
      expect(result).toContain('01:01');
    });

    it('90분(5400초)을 올바르게 포맷한다', () => {
      const result = formatDuration(5400);
      expect(result).toContain('90분');
      expect(result).toContain('01:30');
    });
  });

  describe('formatTimeRange', () => {
    it('시작 시간과 종료 시간을 올바르게 포맷한다', () => {
      const start = new Date('2026-01-26T09:00:00').getTime();
      const end = new Date('2026-01-26T10:30:00').getTime();

      const result = formatTimeRange(start, end);

      expect(result).toContain('09:00');
      expect(result).toContain('10:30');
    });

    it('종료 시간이 없으면 현재 시간까지 표시한다', () => {
      const start = new Date('2026-01-26T09:00:00').getTime();

      const result = formatTimeRange(start);

      expect(result).toContain('09:00');
      expect(result).toContain('~');
    });
  });

  /**
   * v0.7.0 테스트: 점심시간 제외 계산 기능
   */
  describe('calculateDurationExcludingLunch', () => {
    // 점심시간 12:00~13:00 설정
    const lunch_settings: LunchTimeSettings = {
      start: '12:00',
      end: '13:00',
      exclude_enabled: true,
    };

    it('점심시간과 겹치지 않는 작업은 전체 시간을 반환한다', () => {
      // 09:00 ~ 11:00 (2시간 = 7200000ms)
      const start = new Date('2026-01-26T09:00:00').getTime();
      const end = new Date('2026-01-26T11:00:00').getTime();

      const result = calculateDurationExcludingLunch(start, end, lunch_settings);

      expect(result).toBe(2 * 60 * 60 * 1000); // 2시간
    });

    it('점심시간 전체가 포함된 작업에서 1시간을 제외한다', () => {
      // 11:30 ~ 13:30 (2시간) - 점심 1시간 제외 = 1시간
      const start = new Date('2026-01-26T11:30:00').getTime();
      const end = new Date('2026-01-26T13:30:00').getTime();

      const result = calculateDurationExcludingLunch(start, end, lunch_settings);

      expect(result).toBe(1 * 60 * 60 * 1000); // 1시간
    });

    it('점심시간 일부만 겹치는 경우 겹친 시간만 제외한다', () => {
      // 11:30 ~ 12:30 (1시간) - 점심 30분 제외 = 30분
      const start = new Date('2026-01-26T11:30:00').getTime();
      const end = new Date('2026-01-26T12:30:00').getTime();

      const result = calculateDurationExcludingLunch(start, end, lunch_settings);

      expect(result).toBe(30 * 60 * 1000); // 30분
    });

    it('점심시간 중간에 시작하는 작업에서 겹친 시간을 제외한다', () => {
      // 12:30 ~ 14:00 (1.5시간) - 점심 30분 제외 = 1시간
      const start = new Date('2026-01-26T12:30:00').getTime();
      const end = new Date('2026-01-26T14:00:00').getTime();

      const result = calculateDurationExcludingLunch(start, end, lunch_settings);

      expect(result).toBe(60 * 60 * 1000); // 1시간
    });

    it('점심시간 제외가 비활성화되면 전체 시간을 반환한다', () => {
      const disabled_settings: LunchTimeSettings = {
        start: '12:00',
        end: '13:00',
        exclude_enabled: false,
      };

      // 11:30 ~ 13:30 (2시간) - 제외 비활성화 = 2시간
      const start = new Date('2026-01-26T11:30:00').getTime();
      const end = new Date('2026-01-26T13:30:00').getTime();

      const result = calculateDurationExcludingLunch(start, end, disabled_settings);

      expect(result).toBe(2 * 60 * 60 * 1000); // 2시간
    });

    it('작업이 점심시간 전에 끝나면 제외 없이 전체 시간을 반환한다', () => {
      // 09:00 ~ 11:30 (2.5시간)
      const start = new Date('2026-01-26T09:00:00').getTime();
      const end = new Date('2026-01-26T11:30:00').getTime();

      const result = calculateDurationExcludingLunch(start, end, lunch_settings);

      expect(result).toBe(2.5 * 60 * 60 * 1000); // 2.5시간
    });

    it('작업이 점심시간 후에 시작하면 제외 없이 전체 시간을 반환한다', () => {
      // 14:00 ~ 16:00 (2시간)
      const start = new Date('2026-01-26T14:00:00').getTime();
      const end = new Date('2026-01-26T16:00:00').getTime();

      const result = calculateDurationExcludingLunch(start, end, lunch_settings);

      expect(result).toBe(2 * 60 * 60 * 1000); // 2시간
    });
  });

  describe('getDurationSecondsExcludingLunch', () => {
    it('밀리초 결과를 초 단위로 변환하고 일시정지 시간을 제외한다', () => {
      // 11:30 ~ 13:30 (2시간 = 7200초) - 점심 1시간(3600초) - 일시정지 600초 = 2400초
      const start = new Date('2026-01-26T11:30:00').getTime();
      const end = new Date('2026-01-26T13:30:00').getTime();
      const paused_duration = 600; // 10분

      // localStorage 모킹
      const original_get_item = localStorage.getItem;
      localStorage.getItem = jest.fn(() => JSON.stringify({
        lunchStart: '12:00',
        lunchEnd: '13:00',
        lunchExcludeEnabled: true,
      }));

      const result = getDurationSecondsExcludingLunch(start, end, paused_duration);

      expect(result).toBe(3600 - 600); // 1시간 - 10분 = 2400초

      localStorage.getItem = original_get_item;
    });

    it('일시정지 시간이 없으면 점심시간만 제외한다', () => {
      const start = new Date('2026-01-26T11:30:00').getTime();
      const end = new Date('2026-01-26T13:30:00').getTime();

      const original_get_item = localStorage.getItem;
      localStorage.getItem = jest.fn(() => JSON.stringify({
        lunchStart: '12:00',
        lunchEnd: '13:00',
        lunchExcludeEnabled: true,
      }));

      const result = getDurationSecondsExcludingLunch(start, end);

      expect(result).toBe(3600); // 1시간

      localStorage.getItem = original_get_item;
    });
  });
});

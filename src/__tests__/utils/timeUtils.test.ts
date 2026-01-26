/**
 * v0.1.0 테스트: 시간 유틸리티 함수 테스트
 */
import { formatDuration, formatTimeRange } from '../../utils/timeUtils';

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
});

/**
 * v0.7.0/v0.8.0 테스트: 날짜 유틸리티 기능
 * - 날짜 범위 계산 (06:00 기준 하루)
 * - 로그 필터링을 위한 날짜 연산
 */
import { getStartOfDay, getEndOfDay, getDateRange } from '../../utils/dateUtils';

describe('dateUtils', () => {
  describe('getStartOfDay', () => {
    it('해당 날짜의 00:00:00.000을 반환한다', () => {
      const date = new Date('2026-01-26T15:30:45.123');
      const result = getStartOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('원본 Date 객체를 수정하지 않는다', () => {
      const original = new Date('2026-01-26T15:30:45.123');
      const original_time = original.getTime();
      
      getStartOfDay(original);

      expect(original.getTime()).toBe(original_time);
    });

    it('날짜(년, 월, 일)는 유지된다', () => {
      const date = new Date('2026-01-26T15:30:45.123');
      const result = getStartOfDay(date);

      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // 1월
      expect(result.getDate()).toBe(26);
    });
  });

  describe('getEndOfDay', () => {
    it('해당 날짜의 23:59:59.999를 반환한다', () => {
      const date = new Date('2026-01-26T09:00:00.000');
      const result = getEndOfDay(date);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });

    it('원본 Date 객체를 수정하지 않는다', () => {
      const original = new Date('2026-01-26T09:00:00.000');
      const original_time = original.getTime();
      
      getEndOfDay(original);

      expect(original.getTime()).toBe(original_time);
    });
  });

  describe('getDateRange', () => {
    describe('today', () => {
      it('오늘 06:00부터 내일 06:00까지의 범위를 반환한다', () => {
        const { start, end } = getDateRange('today');

        expect(start.getHours()).toBe(6);
        expect(start.getMinutes()).toBe(0);
        expect(end.getHours()).toBe(6);
        expect(end.getMinutes()).toBe(0);

        // end는 start보다 24시간 후
        const diff_hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        expect(diff_hours).toBe(24);
      });
    });

    describe('week', () => {
      it('이번 주 월요일 06:00부터 다음 주 월요일 06:00까지의 범위를 반환한다', () => {
        const { start, end } = getDateRange('week');

        expect(start.getHours()).toBe(6);
        expect(end.getHours()).toBe(6);

        // start는 월요일 (getDay() === 1)
        expect(start.getDay()).toBe(1);

        // end는 7일 후
        const diff_days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        expect(diff_days).toBe(7);
      });
    });

    describe('month', () => {
      it('이번 달 1일 06:00부터 다음 달 1일 06:00까지의 범위를 반환한다', () => {
        const { start, end } = getDateRange('month');

        expect(start.getDate()).toBe(1);
        expect(start.getHours()).toBe(6);

        expect(end.getDate()).toBe(1);
        expect(end.getHours()).toBe(6);

        // end의 월은 start의 다음 달
        const expected_end_month = (start.getMonth() + 1) % 12;
        expect(end.getMonth()).toBe(expected_end_month);
      });
    });
  });

  /**
   * v0.8.0: 날짜 선택에 따른 필터링 테스트
   */
  describe('날짜 기반 로그 필터링 (통합 테스트)', () => {
    const DAY_START_HOUR = 6;

    // 선택된 날짜의 범위 계산 (06:00 ~ 익일 06:00)
    const getSelectedDateRange = (date: Date) => {
      const start = new Date(date);
      start.setHours(DAY_START_HOUR, 0, 0, 0);
      
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      
      return { start: start.getTime(), end: end.getTime() };
    };

    // 모의 로그 데이터
    const mock_logs = [
      { id: '1', title: '작업 1', startTime: new Date('2026-01-25T09:00:00').getTime() },
      { id: '2', title: '작업 2', startTime: new Date('2026-01-25T15:00:00').getTime() },
      { id: '3', title: '작업 3', startTime: new Date('2026-01-26T10:00:00').getTime() },
      { id: '4', title: '작업 4', startTime: new Date('2026-01-26T23:30:00').getTime() },
      { id: '5', title: '작업 5', startTime: new Date('2026-01-27T02:00:00').getTime() }, // 26일 06:00 이후, 27일 06:00 이전 (26일로 계산)
      { id: '6', title: '작업 6', startTime: new Date('2026-01-27T08:00:00').getTime() },
    ];

    it('선택된 날짜(2026-01-25)의 로그만 필터링한다', () => {
      const selected_date = new Date('2026-01-25');
      const { start, end } = getSelectedDateRange(selected_date);

      const filtered = mock_logs.filter(
        (log) => log.startTime >= start && log.startTime < end
      );

      expect(filtered.length).toBe(2);
      expect(filtered.map((l) => l.title)).toEqual(['작업 1', '작업 2']);
    });

    it('선택된 날짜(2026-01-26)의 로그만 필터링한다', () => {
      const selected_date = new Date('2026-01-26');
      const { start, end } = getSelectedDateRange(selected_date);

      const filtered = mock_logs.filter(
        (log) => log.startTime >= start && log.startTime < end
      );

      // 26일 06:00 ~ 27일 06:00 사이의 로그
      // 작업 3 (26일 10:00), 작업 4 (26일 23:30), 작업 5 (27일 02:00)
      expect(filtered.length).toBe(3);
      expect(filtered.map((l) => l.title)).toEqual(['작업 3', '작업 4', '작업 5']);
    });

    it('06:00 이전 작업(새벽)은 전날로 분류된다', () => {
      // 작업 5는 2026-01-27T02:00:00이지만, 06:00 이전이므로 26일로 분류
      const selected_date_26 = new Date('2026-01-26');
      const { start: start_26, end: end_26 } = getSelectedDateRange(selected_date_26);

      const on_26 = mock_logs.filter(
        (log) => log.startTime >= start_26 && log.startTime < end_26
      );
      expect(on_26.find((l) => l.title === '작업 5')).toBeDefined();

      // 27일에는 작업 5가 포함되지 않음
      const selected_date_27 = new Date('2026-01-27');
      const { start: start_27, end: end_27 } = getSelectedDateRange(selected_date_27);

      const on_27 = mock_logs.filter(
        (log) => log.startTime >= start_27 && log.startTime < end_27
      );
      expect(on_27.find((l) => l.title === '작업 5')).toBeUndefined();
      expect(on_27.find((l) => l.title === '작업 6')).toBeDefined();
    });

    it('날짜를 변경하면 다른 로그가 표시된다', () => {
      const date_25 = new Date('2026-01-25');
      const date_26 = new Date('2026-01-26');
      const date_27 = new Date('2026-01-27');

      const range_25 = getSelectedDateRange(date_25);
      const range_26 = getSelectedDateRange(date_26);
      const range_27 = getSelectedDateRange(date_27);

      const logs_25 = mock_logs.filter(
        (l) => l.startTime >= range_25.start && l.startTime < range_25.end
      );
      const logs_26 = mock_logs.filter(
        (l) => l.startTime >= range_26.start && l.startTime < range_26.end
      );
      const logs_27 = mock_logs.filter(
        (l) => l.startTime >= range_27.start && l.startTime < range_27.end
      );

      // 각 날짜별로 다른 로그가 표시됨
      expect(logs_25.map((l) => l.id)).not.toEqual(logs_26.map((l) => l.id));
      expect(logs_26.map((l) => l.id)).not.toEqual(logs_27.map((l) => l.id));
    });

    it('해당 날짜에 로그가 없으면 빈 배열을 반환한다', () => {
      const empty_date = new Date('2026-01-20');
      const { start, end } = getSelectedDateRange(empty_date);

      const filtered = mock_logs.filter(
        (log) => log.startTime >= start && log.startTime < end
      );

      expect(filtered.length).toBe(0);
    });
  });
});

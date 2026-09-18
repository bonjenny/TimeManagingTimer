import { formatDateToString, getMonthWeekMondays, getWeekOfMonth } from '../../utils/calendar_export';
import { getHolidayName } from '../../constants/krHolidays';

const mondays = (year: number, month: number) => getMonthWeekMondays(year, month).map(formatDateToString);

describe('월 고정 보기 주 계산 (그 달 평일이 든 주 전부)', () => {
  it('2026년 9월: 8/31 주부터 9/28~30 주까지 5주', () => {
    expect(mondays(2026, 8)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
  });

  it('2026년 10월: 1일(목)이 든 9/28 주부터 10/26 주까지', () => {
    expect(mondays(2026, 9)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
  });

  it('1일이 토요일이면 그 주 평일은 전부 전달이라 빼고, 31일(월)이 든 주는 넣는다 (2026년 8월)', () => {
    expect(mondays(2026, 7)).toEqual(['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31']);
  });

  it('평일만 보므로 어떤 달도 5주를 넘지 않는다', () => {
    for (let year = 2025; year <= 2027; year++) {
      for (let month = 0; month < 12; month++) {
        expect(getMonthWeekMondays(year, month).length).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe('공휴일', () => {
  it('추석·대체공휴일을 돌려준다', () => {
    expect(getHolidayName('2026-09-25')).toBe('추석');
    expect(getHolidayName('2026-10-05')).toBe('대체공휴일');
    expect(getHolidayName('2026-09-23')).toBeUndefined();
  });
});

describe('주차 (금요일 기준 n번째 주)', () => {
  const label = (y: number, m: number, d: number) => {
    const w = getWeekOfMonth(new Date(y, m, d));
    return `${w.month}월 ${w.week}주차`;
  };
  it('8/24 주는 8월 4주차, 8/31 주는 9월 1주차, 9/7 주는 2주차, 9/14 주는 3주차', () => {
    expect(label(2026, 7, 24)).toBe('8월 4주차');
    expect(label(2026, 7, 31)).toBe('9월 1주차');
    expect(label(2026, 8, 7)).toBe('9월 2주차');
    expect(label(2026, 8, 14)).toBe('9월 3주차');
  });
});

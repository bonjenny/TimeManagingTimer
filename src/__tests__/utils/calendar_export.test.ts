/**
 * 캘린더 내보내기 유틸리티 테스트
 * v0.14.0: 배포 캘린더 HTML 내보내기
 */
import {
  formatDateToString,
  formatDateToDisplay,
  getMonday,
  addDays,
  generateCalendarHtml,
} from '../../utils/calendar_export';
import { DeployEvent, JobColor } from '../../store/useDeployCalendarStore';

describe('calendar_export 유틸리티', () => {
  describe('formatDateToString', () => {
    it('Date를 YYYY-MM-DD 형식으로 변환한다', () => {
      const date = new Date(2026, 0, 27); // 2026년 1월 27일
      expect(formatDateToString(date)).toBe('2026-01-27');
    });

    it('한 자리 월/일도 0 패딩된다', () => {
      const date = new Date(2026, 0, 5); // 2026년 1월 5일
      expect(formatDateToString(date)).toBe('2026-01-05');
    });
  });

  describe('formatDateToDisplay', () => {
    it('Date를 M/D(요일) 형식으로 변환한다', () => {
      const date = new Date(2026, 0, 27); // 2026년 1월 27일 (화요일)
      expect(formatDateToDisplay(date)).toBe('1/27(화)');
    });

    it('일요일도 정상 표시된다', () => {
      const date = new Date(2026, 1, 1); // 2026년 2월 1일 (일요일)
      expect(formatDateToDisplay(date)).toBe('2/1(일)');
    });
  });

  describe('getMonday', () => {
    it('주어진 날짜가 속한 주의 월요일을 반환한다', () => {
      // 2026년 1월 27일 (화요일)
      const tuesday = new Date(2026, 0, 27);
      const monday = getMonday(tuesday);
      expect(monday.getDay()).toBe(1); // 월요일
      expect(formatDateToString(monday)).toBe('2026-01-26');
    });

    it('월요일을 입력하면 그대로 반환한다', () => {
      const monday_input = new Date(2026, 0, 26);
      const monday = getMonday(monday_input);
      expect(formatDateToString(monday)).toBe('2026-01-26');
    });

    it('일요일을 입력하면 전 주 월요일을 반환한다', () => {
      // 2026년 2월 1일 (일요일)
      const sunday = new Date(2026, 1, 1);
      const monday = getMonday(sunday);
      expect(monday.getDay()).toBe(1);
      expect(formatDateToString(monday)).toBe('2026-01-26');
    });
  });

  describe('addDays', () => {
    it('날짜에 일수를 더한다', () => {
      const date = new Date(2026, 0, 27);
      const result = addDays(date, 3);
      expect(formatDateToString(result)).toBe('2026-01-30');
    });

    it('음수도 처리한다', () => {
      const date = new Date(2026, 0, 27);
      const result = addDays(date, -7);
      expect(formatDateToString(result)).toBe('2026-01-20');
    });

    it('월을 넘어가는 경우도 처리한다', () => {
      const date = new Date(2026, 0, 30);
      const result = addDays(date, 5);
      expect(formatDateToString(result)).toBe('2026-02-04');
    });
  });

  describe('generateCalendarHtml', () => {
    const mock_events: DeployEvent[] = [
      {
        id: '1',
        date: '2026-01-27',
        job_code: 'A25_07788',
        job_name: 'HTML 다크모드',
        status: '스테이지',
        is_holiday: false,
      },
      {
        id: '2',
        date: '2026-01-28',
        job_code: 'A25_07788',
        job_name: 'HTML 다크모드',
        status: '수시',
        is_holiday: false,
      },
      {
        id: '3',
        date: '2026-01-29',
        job_code: '',
        job_name: '연차',
        status: '',
        is_holiday: true,
      },
    ];

    const mock_job_colors: JobColor[] = [
      { job_code: 'A25_07788', color: '#b3e5fc' },
    ];

    it('HTML 테이블을 생성한다', () => {
      const html = generateCalendarHtml({
        events: mock_events,
        job_colors: mock_job_colors,
        start_date: new Date(2026, 0, 26), // 월요일
        weeks: 1,
      });

      expect(html).toContain('<table');
      expect(html).toContain('</table>');
    });

    it('colgroup으로 열 너비가 고정되어 붙여넣기 시 찌그러짐을 방지한다', () => {
      const html = generateCalendarHtml({
        events: mock_events,
        job_colors: mock_job_colors,
        start_date: new Date(2026, 0, 26),
        weeks: 1,
      });

      expect(html).toContain('<colgroup>');
      expect(html).toContain('</colgroup>');
      expect(html).toMatch(/table-layout:\s*fixed/);
      expect(html).toMatch(/width:\s*835px/);
    });

    it('날짜 헤더가 포함된다', () => {
      const html = generateCalendarHtml({
        events: mock_events,
        job_colors: mock_job_colors,
        start_date: new Date(2026, 0, 26),
        weeks: 1,
      });

      expect(html).toContain('1/26(월)');
      expect(html).toContain('1/27(화)');
      expect(html).toContain('1/28(수)');
      expect(html).toContain('1/29(목)');
      expect(html).toContain('1/30(금)');
    });

    it('이벤트 이름과 상태가 포함된다', () => {
      const html = generateCalendarHtml({
        events: mock_events,
        job_colors: mock_job_colors,
        start_date: new Date(2026, 0, 26),
        weeks: 1,
      });

      expect(html).toContain('HTML 다크모드 스테이지');
      expect(html).toContain('HTML 다크모드 수시');
    });

    it('잡 색상이 배경색으로 적용된다', () => {
      const html = generateCalendarHtml({
        events: mock_events,
        job_colors: mock_job_colors,
        start_date: new Date(2026, 0, 26),
        weeks: 1,
      });

      expect(html).toContain('background-color: #b3e5fc');
    });

    it('휴일은 빨간색 텍스트로 표시된다', () => {
      const html = generateCalendarHtml({
        events: mock_events,
        job_colors: mock_job_colors,
        start_date: new Date(2026, 0, 26),
        weeks: 1,
      });

      expect(html).toContain('color: #ca3626');
      expect(html).toContain('연차');
    });

    it('휴일 이벤트명은 가운데 정렬로 출력된다', () => {
      const html = generateCalendarHtml({
        events: mock_events,
        job_colors: mock_job_colors,
        start_date: new Date(2026, 0, 26),
        weeks: 1,
      });

      expect(html).toContain('text-align: center');
      expect(html).toContain('연차');
    });

    it('2주 분량으로 생성할 수 있다', () => {
      const html = generateCalendarHtml({
        events: mock_events,
        job_colors: mock_job_colors,
        start_date: new Date(2026, 0, 26),
        weeks: 2,
      });

      // 첫째 주 날짜
      expect(html).toContain('1/26(월)');
      // 둘째 주 날짜
      expect(html).toContain('2/2(월)');
    });
  });
});

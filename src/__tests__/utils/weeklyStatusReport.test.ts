import { buildWeeklyReport, deriveStatus, formatHourMinute, generateReportHtml, BuildReportInput } from '../../utils/weeklyStatusReport';
import type { TimerLog } from '../../store/useTimerStore';
import type { DeployEvent } from '../../store/useDeployCalendarStore';

const at = (date: string, hour: number) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime();
const log = (code: string, date: string, from: number, to: number): TimerLog =>
  ({ id: `${code}-${date}-${from}`, title: '작업', projectCode: code, startTime: at(date, from), endTime: at(date, to), status: 'COMPLETED', pausedDuration: 0 }) as TimerLog;
const ev = (code: string, date: string, status: string): DeployEvent => ({ id: `${code}-${date}`, date, job_code: code, job_name: '배포명', status, is_holiday: false });

const base = (over: Partial<BuildReportInput> = {}): BuildReportInput => ({
  week_start: new Date(2026, 9, 12), // 10/12(월)
  logs: [],
  projects: [{ code: 'A26_05087', name: 'deploy flag 관리 개선' }],
  events: [],
  tm_rows: [],
  excluded_codes: [],
  project_overrides: {},
  week_overrides: {},
  extras: [],
  now: at('2026-10-20', 9),
  ...over,
});

describe('deriveStatus (배포 캘린더 → 진행상태·비고, 기준일 금요일)', () => {
  it('금요일 뒤에 잡힌 수시 → 배포대기 + 예정', () => {
    expect(deriveStatus([ev('A', '2026-10-15', '스테이지'), ev('A', '2026-10-19', '수시')], '2026-10-12', '2026-10-16')).toEqual({
      status: '배포대기',
      note: '10/19(월) 수시배포 예정',
    });
  });
  it('이번 주 마지막이 수시 → 배포완료', () => {
    expect(deriveStatus([ev('A', '2026-10-14', '스테이지'), ev('A', '2026-10-15', '수시')], '2026-10-12', '2026-10-16')).toEqual({
      status: '배포완료',
      note: '10/15(목) 수시배포',
    });
  });
  it('이번 주 테스트 → 테스트, 일정 없으면 진행중', () => {
    expect(deriveStatus([ev('A', '2026-10-14', '테스트요청')], '2026-10-12', '2026-10-16').status).toBe('테스트');
    expect(deriveStatus([ev('A', '2026-09-30', '수시')], '2026-10-12', '2026-10-16')).toEqual({ status: '진행중', note: '' });
  });
});

describe('buildWeeklyReport', () => {
  it('이번 주 기록이 있는 프로젝트를 한 줄로: 작업명·시작일·누적시간(그 주까지 전체)·종료예정일', () => {
    const rows = buildWeeklyReport(
      base({
        logs: [log('A26_05087', '2026-09-28', 9, 11), log('A26_05087', '2026-10-13', 14, 16), log('A26_05087', '2026-10-21', 9, 10)],
        tm_rows: [{ project_name: 'A26_05087', date: '2026-10-13', end_date: '2026-10-16' }],
        events: [ev('A26_05087', '2026-10-19', '수시')],
      })
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      task: 'A26_05087 deploy flag 관리 개선',
      start_date: '2026-09-28',
      end_date: '2026-10-16',
      total: '04:00', // 다음 주 기록(10/21)은 빼고 2h + 2h
      status: '배포대기',
      note: '10/19(월) 수시배포 예정',
    });
  });

  it('빼기로 한 프로젝트·숨긴 프로젝트는 없고, 고친 값이 자동값보다 앞선다', () => {
    const rows = buildWeeklyReport(
      base({
        logs: [log('A25_05591', '2026-10-13', 9, 10), log('A26_05087', '2026-10-13', 9, 10), log('일일로그점검', '2026-10-13', 9, 10)],
        excluded_codes: ['A25_05591'],
        project_overrides: { 일일로그점검: { hidden: true }, A26_05087: { end_date: '2026-10-30' } },
        week_overrides: { '2026-10-12|A26_05087': { status: '테스트', note: '10/14(수) 테스트요청' } },
      })
    );
    expect(rows.map((r) => r.key)).toEqual(['A26_05087']);
    expect(rows[0]).toMatchObject({ status: '테스트', note: '10/14(수) 테스트요청', end_date: '2026-10-30', edited: true });
  });

  it('직접 추가한 행은 진행상태 순서대로 뒤에 붙는다', () => {
    const rows = buildWeeklyReport(
      base({
        logs: [log('A26_05087', '2026-10-13', 9, 10)],
        extras: [{ id: 'm1', task: 'ECLazyLoaderScript 개선', status: '진행예정', start_date: '', end_date: '', note: '' }],
      })
    );
    expect(rows.map((r) => r.status)).toEqual(['진행중', '진행예정']);
  });
});

it('표 HTML: 녹색 머리 + 담당자는 첫 줄에만', () => {
  const html = generateReportHtml(
    [
      { key: 'a', status: '배포완료', task: 'A <b>', start_date: '', end_date: '', total: '01:00', note: '', manual: false, edited: false },
      { key: 'b', status: '진행중', task: 'B', start_date: '', end_date: '', total: '', note: '', manual: false, edited: false },
    ],
    '홍길동'
  );
  expect(html).toContain('#a9d08e');
  expect(html.match(/홍길동/g)).toHaveLength(1);
  expect(html).toContain('A &lt;b&gt;');
  expect(formatHourMinute(16 * 3600 + 50 * 60)).toBe('16:50');
});

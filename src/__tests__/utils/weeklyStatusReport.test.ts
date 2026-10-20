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

describe('ERP 게시글 값 사용', () => {
  it('erp_info 가 있으면 진행상태·비고·시작·종료를 ERP 값으로, 누적시간은 10분 단위 반올림', () => {
    const rows = buildWeeklyReport(
      base({
        logs: [log('A26_05087', '2026-10-13', 9, 11), { ...log('A26_05087', '2026-10-14', 9, 10), endTime: at('2026-10-14', 9) + 40 * 60000 }],
        events: [ev('A26_05087', '2026-10-19', '수시')],
        erp_info: { A26_05087: { status: '테스트중', changed: '2026-10-14', dates: ['2026-09-28', '2026-09-30'], board: 'dev' } },
      })
    );
    expect(rows[0]).toMatchObject({
      status: '테스트',
      note: '10/14(수) 테스트요청',
      start_date: '2026-09-28',
      end_date: '2026-09-30',
      total: '02:40', // 2시간 40분 그대로
    });
  });

  it('ERP 진행상태 이름을 현황표 말로 바꾼다', () => {
    const { mapErpStatus } = jest.requireActual('../../utils/weeklyStatusReport');
    expect(['예정', '테스트중', '개발진행중', '배포예정', '배포완료', '폐기'].map(mapErpStatus)).toEqual([
      '진행예정', '테스트', '진행중', '배포대기', '배포완료', '폐기',
    ]);
  });
});

describe('ERP 목록 한 줄 요약', () => {
  it('진행상태 이름, 수정일, 채워진 날짜 칸만 오름차순 (연결 글 칸은 무시)', () => {
    const { summarizeErpRow } = jest.requireActual('../../utils/erpTimelog');
    expect(
      summarizeErpRow(
        {
          'board_s$progress_status': { sid: '3000', code: '3000', name: '진행중' },
          'board_s$update_dtm': '∬D:2026-10-14T02:35:44.190Z∬',
          'board_s$dt_002': '20260930',
          'board_s$dt_003': '20260928',
          'board_s$dt_004': '',
          'b_000000e074008_001$board_s$dt_004': '20260101',
        },
        'dev'
      )
    ).toEqual({ status: '진행중', changed: '2026-10-14', dates: ['2026-09-28', '2026-09-30'], board: 'dev' });
  });
});

it('누적시간 10분 단위 반올림', () => {
  const { formatRoundedHours } = jest.requireActual('../../utils/weeklyStatusReport');
  expect(formatRoundedHours((29 * 60 + 52) * 60)).toBe('29:50');
  expect(formatRoundedHours((9 * 60 + 55) * 60)).toBe('10:00');
  expect(formatRoundedHours(3 * 60)).toBe('00:10');
  expect(formatRoundedHours(0)).toBe('');
});

describe('ERP 비고는 개발완료 이후 단계만', () => {
  const erpRow = (status: string, events: DeployEvent[] = []) =>
    buildWeeklyReport(
      base({
        logs: [log('A26_05087', '2026-10-13', 9, 10)],
        events,
        erp_info: { A26_05087: { status, changed: '2026-10-14', dates: [], board: 'dev' } },
      })
    )[0];
  it('진행중·예정이면 비고 없음', () => {
    expect(erpRow('진행중').note).toBe('');
    expect(erpRow('예정').note).toBe('');
  });
  it('테스트·보류·폐기는 날짜 + 상태', () => {
    expect(erpRow('테스트중').note).toBe('10/14(수) 테스트요청');
    expect(erpRow('보류').note).toBe('10/14(수) 보류');
  });
  it('배포대기·배포완료는 배포 캘린더 비고 우선, 없으면 수시배포', () => {
    expect(erpRow('배포대기', [ev('A26_05087', '2026-10-19', '수시')]).note).toBe('10/19(월) 수시배포 예정');
    expect(erpRow('배포완료').note).toBe('10/14(수) 수시배포');
  });
});

describe('작업 개발 전 단계면 개발 게시글로 판단', () => {
  const { resolveErpStatus } = jest.requireActual('../../utils/weeklyStatusReport');
  const s = (status: string, dev_statuses?: string[]) => resolveErpStatus({ status, changed: '', dates: [], board: 'work', dev_statuses });
  it('개발 게시글이 하나라도 진행중이면 진행중', () => {
    expect(s('PO배정완료', ['예정', '진행중'])).toBe('진행중');
  });
  it('개발 게시글이 모두 예정이면 진행예정, 개발완료가 가장 앞서면 개발완료', () => {
    expect(s('PO배정완료', ['예정'])).toBe('진행예정');
    expect(s('개발진행중', ['진행중', '개발완료'])).toBe('개발완료');
  });
  it('작업이 테스트 이후·폐기·보류면 작업 상태 그대로', () => {
    expect(s('테스트중', ['배포완료', '진행중'])).toBe('테스트');
    expect(s('보류', ['진행중'])).toBe('보류');
  });
  it('개발 게시글 정보가 없으면 작업 상태', () => {
    expect(s('PO배정완료')).toBe('진행예정');
  });
});

describe('기준일·스테이지 → 수시배포', () => {
  const { stageToReleaseDate } = jest.requireActual('../../utils/weeklyStatusReport');
  it('월→화, 화→수, 수→목, 목→다음 월, 금→다음 월', () => {
    expect(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'].map(stageToReleaseDate)).toEqual([
      '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-19', '2026-10-19',
    ]);
  });

  it('스테이지만 잡혀 있어도 수시배포 날로 예정을 쓴다 (스테이지 예정은 안 씀)', () => {
    // 10/5 주, 기준일 10/9(금). 10/14(수) 스테이지 → 10/15(목) 수시배포
    expect(deriveStatus([ev('A', '2026-10-14', '스테이지')], '2026-10-05', '2026-10-09')).toEqual({
      status: '배포대기',
      note: '10/15(목) 수시배포 예정',
    });
  });

  it('금요일 전이면 오늘이 기준일: 오늘 뒤 일정은 예정, 지난 테스트는 테스트', () => {
    const rows = buildWeeklyReport(
      base({
        week_start: new Date(2026, 9, 19), // 10/19 주
        now: at('2026-10-20', 9), // 화요일
        logs: [log('A26_05087', '2026-10-19', 9, 10)],
        events: [ev('A26_05087', '2026-10-19', '테스트요청'), ev('A26_05087', '2026-10-22', '수시')],
      })
    );
    expect(rows[0]).toMatchObject({ status: '배포대기', note: '10/22(목) 수시배포 예정' });
  });

  it('ERP 진행상태가 기준일 뒤에 바뀐 것이면 그 주에는 쓰지 않고 배포 캘린더로', () => {
    const row = buildWeeklyReport(
      base({
        week_start: new Date(2026, 9, 5), // 10/5 주, 기준일 10/9
        logs: [log('A26_05087', '2026-10-06', 9, 10)],
        events: [ev('A26_05087', '2026-10-14', '스테이지')],
        erp_info: { A26_05087: { status: '배포완료', changed: '2026-10-16', dates: [], board: 'work' } },
      })
    )[0];
    expect(row).toMatchObject({ status: '배포대기', note: '10/15(목) 수시배포 예정' });
  });
});

it('지난주 테스트요청 뒤 아직 배포 전이면 이번 주도 테스트', () => {
  expect(deriveStatus([ev('A', '2026-10-01', '테스트요청')], '2026-10-05', '2026-10-09')).toEqual({ status: '테스트', note: '10/01(목) 테스트요청' });
  expect(deriveStatus([ev('A', '2026-10-01', '테스트요청'), ev('A', '2026-10-02', '수시')], '2026-10-05', '2026-10-09').status).toBe('진행중');
});

it('테스트는 테스트 요청일: 배포 캘린더 테스트 일정 우선, 문구는 테스트요청', () => {
  const row = buildWeeklyReport(
    base({
      logs: [log('A26_05087', '2026-10-13', 9, 10)],
      events: [ev('A26_05087', '2026-10-13', '테스트')],
      erp_info: { A26_05087: { status: '테스트중', changed: '2026-10-15', dates: [], board: 'work' } },
    })
  )[0];
  expect(row).toMatchObject({ status: '테스트', note: '10/13(화) 테스트요청' });
  expect(deriveStatus([ev('A', '2026-10-13', '테스트 재요청')], '2026-10-12', '2026-10-16').note).toBe('10/13(화) 테스트 재요청');
});

it('테스트 요청일은 테스트/배포 게시글 작성일이 가장 우선 (기준일까지 가장 최근)', () => {
  const row = buildWeeklyReport(
    base({
      logs: [log('A26_04864', '2026-10-13', 9, 10)],
      projects: [{ code: 'A26_04864', name: 'PageSetup' }],
      events: [ev('A26_04864', '2026-10-12', '테스트')],
      erp_info: { A26_04864: { status: '테스트중', changed: '2026-10-15', dates: [], board: 'work', test_dates: ['2026-09-20', '2026-10-14', '2026-10-21'] } },
    })
  )[0];
  expect(row.note).toBe('10/14(수) 테스트요청');
});

describe('상태 변경 이력으로 그 주 시점 상태', () => {
  // 12221 이력 (2026-10-20 캡처에서 상태변경만)
  const history = [
    { date: '2026-09-11', status: '개발예정' },
    { date: '2026-09-14', status: '개발진행중' },
    { date: '2026-10-14', status: '테스트예정' },
    { date: '2026-10-19', status: '배포예정' },
    { date: '2026-10-19', status: '테스트중' },
  ];
  const rowAt = (week_start: Date) =>
    buildWeeklyReport(
      base({
        week_start,
        logs: [log('A26_04864', '2026-09-15', 9, 10), log('A26_04864', '2026-10-06', 9, 10), log('A26_04864', '2026-10-13', 9, 10), log('A26_04864', '2026-10-19', 9, 10)],
        projects: [{ code: 'A26_04864', name: 'PageSetup' }],
        erp_info: {
          A26_04864: {
            status: '테스트중', changed: '2026-10-19', dates: [], board: 'work',
            dev_statuses: ['배포완료'], test_dates: ['2026-10-14'], status_history: history,
          },
        },
      })
    )[0];

  it('10/5 주(기준일 10/9): 개발진행중 → 진행중, 지금 개발 게시글 상태(배포완료)는 안 씀', () => {
    expect(rowAt(new Date(2026, 9, 5))).toMatchObject({ status: '진행중', note: '' });
  });
  it('10/12 주(기준일 10/16): 테스트예정 → 테스트, 테스트/배포 작성일로 비고', () => {
    expect(rowAt(new Date(2026, 9, 12))).toMatchObject({ status: '테스트', note: '10/14(수) 테스트요청' });
  });
  it('9/14 주(기준일 9/18): 개발진행중', () => {
    expect(rowAt(new Date(2026, 8, 14)).status).toBe('진행중');
  });
});

describe('테스트/배포 게시글 이력 (7534 deploy flag 관리 개선, 2026-10-20 캡처)', () => {
  const { testPostAtRef } = jest.requireActual('../../utils/weeklyStatusReport');
  const post = {
    created: '2026-09-30',
    history: [
      { date: '2026-09-30', status: 'QC배정완료' },
      { date: '2026-10-01', status: '테스트예정' },
      { date: '2026-10-01', status: '테스트' },
      { date: '2026-10-01', status: '테스트중단' },
      { date: '2026-10-13', status: '테스트' },
      { date: '2026-10-14', status: '테스트완료' },
      { date: '2026-10-15', status: '스테이지확정' },
      { date: '2026-10-15', status: '배포프로그램확인' },
      { date: '2026-10-15', status: '푸시확인' },
      { date: '2026-10-15', status: '스테이지확인' },
      { date: '2026-10-19', status: '수시확인(B,E,I)' },
    ],
  };
  it('9/28 주(기준 10/2): 테스트중단', () => {
    expect(testPostAtRef(post, '2026-09-28', '2026-10-02')).toEqual({ status: '테스트', note: '10/01(목) 테스트중단' });
  });
  it('10/12 주(기준 10/16): 목 스테이지 → 다음 주 월 수시배포 예정', () => {
    expect(testPostAtRef(post, '2026-10-12', '2026-10-16')).toEqual({ status: '배포대기', note: '10/19(월) 수시배포 예정' });
  });
  it('10/19 주(기준 10/20): 수시확인 → 배포완료', () => {
    expect(testPostAtRef(post, '2026-10-19', '2026-10-20')).toEqual({ status: '배포완료', note: '10/19(월) 수시배포' });
  });
  it('지난 주에 끝난 배포, 아직 글이 없던 주는 null', () => {
    expect(testPostAtRef(post, '2026-10-26', '2026-10-30')).toBeNull();
    expect(testPostAtRef(post, '2026-09-21', '2026-09-25')).toBeNull();
  });
  it('현황표에서는 작업 게시글 상태보다 테스트/배포 게시글을 먼저 쓴다', () => {
    const row = buildWeeklyReport(
      base({
        logs: [log('A26_05087', '2026-10-13', 9, 10)],
        erp_info: { A26_05087: { status: '테스트중', changed: '2026-10-14', dates: [], board: 'work', test_posts: [post] } },
      })
    )[0];
    expect(row).toMatchObject({ status: '배포대기', note: '10/19(월) 수시배포 예정' });
  });
});

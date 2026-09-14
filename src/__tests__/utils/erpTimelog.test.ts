import { buildErpPayload, buildErpConsoleScript, DEFAULT_ERP_MAPPING, DEFAULT_ERP_USER } from '../../utils/erpTimelog';
import { TimeManagementRow } from '../../store/useTimeManagementStore';

const row = (p: Partial<TimeManagementRow>): TimeManagementRow => ({
  id: 'x', checked: false, project_name: 'A26_04719', work_type: '작업', schedule_name: '일정',
  category_code: '10', category_name: '질의응답', time_minutes: 10, note: '', date: '2026-09-11', ...p,
});

describe('buildErpPayload', () => {
  it('작업/개발/관리업무/alias 를 9월 11일 ERP 게시글과 같게 푼다', () => {
    const rows = [
      row({ project_name: 'A25_05591', category_code: '11', category_name: '문서작업', schedule_name: '시간관리 입력', time_minutes: 42 }),
      row({ project_name: 'A26_03380', schedule_name: 'EBD2 대현님 문의', time_minutes: 23 }),
      row({ project_name: 'A26_02392', category_code: '11', category_name: '문서작업', schedule_name: '체크리스트', time_minutes: 41 }),
      row({ work_type: '개발', category_code: '17', category_name: '분석', schedule_name: 'Chrome 93', note: '메모', time_minutes: 20 }),
    ];
    const r = buildErpPayload(rows, '2026-09-11', DEFAULT_ERP_MAPPING, DEFAULT_ERP_USER, new Date(2026, 8, 14));
    expect(r.errors).toEqual([]);
    expect(r.total).toBe(126);
    expect(r.resolved.map((x) => [x.work.title, x.bizz_nm, x.trx.title])).toEqual([
      ['시간관리 보고서 작성', '작업', '시간관리 보고서 작성'],
      ['질의응답', '작업', '질의응답'],
      ['issue.3712 render http endpoint 사용처 제거 추가작업', '작업', 'issue.3712 render http endpoint 사용처 제거 추가작업'],
      ['ES2022 미지원 브라우저 사용자 알럿 띄우도록', '개발', 'ES2022 미지원 브라우저 사용자 알럿 띄우도록'],
    ]);
    expect(r.resolved[3].note).toBe('Chrome 93 // 메모');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dm = (r.payload as any).data.slip_data_model.data_model;
    expect(dm.boardXmaster[0]['board_s$num_001']).toBe('∬N:126∬');
    expect(dm.boardXmaster[0]['board_s$dt_001']).toBe('20260911');
    expect(dm.boardXmaster[0]['board_s$data_dt']).toBe('20260914');
    expect(dm.boardXdetail[3]['board_m$dynamic_bizz_sid']).toBe('B_000000E074010');
    expect(dm.boardXdetail[3]['board_m$conn_data_bizz_sid_002']).toBe('B_000000E074008');
    expect(dm.boardXdetail[0]['board_m$num_001']).toBe('∬N:42∬');
  });

  it('매핑 없는 프로젝트는 errors 로 보고하고 나머지는 계속 푼다', () => {
    const r = buildErpPayload([row({ project_name: 'NOPE' }), row({})], '2026-09-11', DEFAULT_ERP_MAPPING, DEFAULT_ERP_USER);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('NOPE');
    expect(r.resolved).toHaveLength(1);
  });

  it('콘솔 스크립트는 payload 를 문자열 리터럴로 심는다', () => {
    const s = buildErpConsoleScript({ a: [1] }, '2026-09-11', 1, 10);
    expect(s).toContain('body: "{\\"a\\":[1]}"');
    expect(s).toContain('confirm(');
  });
});

describe('parseErpSession', () => {
  it('ERP URL 과 세션키 문자열을 모두 읽는다', () => {
    const { parseErpSession } = jest.requireActual('../../utils/erpTimelog');
    expect(parseErpSession('https://logine.ecount.com/ec56/view/erp?w_flag=1&ec_req_sid=E-ETqBSjHE9g4JF#menuType=1'))
      .toEqual({ sid: 'E-ETqBSjHE9g4JF', origin: 'https://logine.ecount.com' });
    expect(parseErpSession(' E-ETqBSjHE9g4JF ')).toEqual({ sid: 'E-ETqBSjHE9g4JF', origin: 'https://logine.ecount.com' });
    expect(parseErpSession('https://logind.ecount.com/ec5/view/erp?ec_req_sid=D-abc')?.origin).toBe('https://logind.ecount.com');
    expect(parseErpSession('아무거나')).toBeNull();
  });
});

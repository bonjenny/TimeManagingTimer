/* eslint-disable @typescript-eslint/no-explicit-any */
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
    expect(r.resolved[3].note).toBe('메모'); // 시간관리 표의 비고 그대로
    expect(r.resolved[0].note).toBe(''); // 비고가 비면 빈칸
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dm = (r.payload as any).data.slip_data_model.data_model;
    expect(dm.boardXmaster[0]['board_s$num_001']).toBe('∬N:126∬');
    expect(dm.boardXmaster[0]['board_s$dt_001']).toBe('20260911');
    expect(dm.boardXmaster[0]['board_s$data_dt']).toBe('20260914');
    expect(dm.boardXdetail[3]['board_m$dynamic_bizz_sid']).toBe('B_000000E074010');
    expect(dm.boardXdetail[3]['board_m$conn_data_bizz_sid_002']).toBe('B_000000E074008');
    expect(dm.boardXdetail[0]['board_m$num_001']).toBe('∬N:42∬');
  });

  it('종료예정일은 행의 end_date, 없으면 행 일자', () => {
    const r = buildErpPayload(
      [row({ end_date: '2026-09-30' }), row({})],
      '2026-09-11', DEFAULT_ERP_MAPPING, DEFAULT_ERP_USER
    );
    const dm = (r.payload as any).data.slip_data_model.data_model;
    expect(dm.boardXdetail[0]['board_m$dt_001']).toBe('20260930');
    expect(dm.boardXdetail[1]['board_m$dt_001']).toBe('20260911');
    expect(dm.boardXmaster[0]['board_s$dt_001']).toBe('20260911');
  });

  it('비고가 비면 빈칸으로 보낸다 (작업명 포함 여부는 불러오기 설정에서 결정)', () => {
    const rows = [row({ note: '', schedule_name: '일정만 있음' })];
    expect(buildErpPayload(rows, '2026-09-11', DEFAULT_ERP_MAPPING, DEFAULT_ERP_USER).resolved[0].note).toBe('');
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

  it("세션키에 '!' 같은 기호가 있어도 끝까지 읽는다", () => {
    const { parseErpSession } = jest.requireActual('../../utils/erpTimelog');
    expect(parseErpSession('https://logine.ecount.com/ec56/view/erp?w_flag=1&ec_req_sid=E-ETq!GArilaadh')?.sid)
      .toBe('E-ETq!GArilaadh');
    expect(parseErpSession('E-ETq!GArilaadh')?.sid).toBe('E-ETq!GArilaadh');
    // 주소창에서 인코딩된 채 복사된 경우
    expect(parseErpSession('https://logine.ecount.com/ec56/view/erp?ec_req_sid=E-a%2Bb')?.sid).toBe('E-a+b');
  });
});

describe('게시글 매핑 자동 찾기', () => {
  const session = { sid: 'E-test', origin: 'https://loginlxe1.ecount.com' };
  const ok = (Data: unknown) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ Status: 200, Data })) });
  const bodies: { url: string; body: any }[] = [];
  const mockFetch = (...responses: unknown[]) => {
    bodies.length = 0;
    (global as any).fetch = jest.fn((url: string, init: RequestInit) => {
      bodies.push({ url, body: JSON.parse(String(init.body)) });
      return ok(responses.shift());
    });
  };
  const { findErpWorkPosts, findErpDevPosts } = jest.requireActual('../../utils/erpTimelog');

  it('프로젝트 코드: 코드 검색 후 작업 게시판을 pjt 조건으로 검색한다', async () => {
    mockFetch(
      { data: [{ 'pjt$pjt_cd': 'A26_04864', 'pjt$pjt_des': 'PageSetup v2 Page내 함수 개발 및 적용' }] },
      { data: [{ 'board_s$data_no': 12221, 'board_s$data_sid': '87FA7HFA5O755GB', 'board_s$title_ctt': 'PageSetup v2 Page내 함수 개발 및 적용' }] }
    );
    const posts = await findErpWorkPosts(session, 'A26_04864');
    expect(posts).toEqual([{ no: 12221, sid: '87FA7HFA5O755GB', title: 'PageSetup v2 Page내 함수 개발 및 적용' }]);
    expect(bodies[0].url).toContain('SelectBasicCodeSearchPopupAction:board:list?ec_req_sid=E-test');
    expect(bodies[0].body.param).toBe('A26_04864');
    expect(bodies[1].url).toContain('SelectBoardSearchListAction:board:list');
    expect(bodies[1].body.bizz_sid).toBe('B_000000E074008');
    expect(bodies[1].body.condition['board_s$pjt'].value[0].code).toBe('A26_04864');
  });

  it('작업 번호: data_no 로 검색하고 번호가 정확히 같은 것만 남긴다', async () => {
    mockFetch({ data: [
      { 'board_s$data_no': 12101, 'board_s$data_sid': 'A', 'board_s$title_ctt': 'x' },
      { 'board_s$data_no': 121010, 'board_s$data_sid': 'B', 'board_s$title_ctt': 'y' },
    ] });
    const posts = await findErpWorkPosts(session, '12101');
    expect(posts.map((p: any) => p.sid)).toEqual(['A']);
    expect(bodies[0].body.condition['board_s$data_no']).toEqual({ type: 'like', value: '12101' });
  });

  it('개발 게시글: 작업 data_sid 로 연결된 것만 고른다', async () => {
    mockFetch({ data: [
      { 'board_s$data_no': 22247, 'board_s$data_sid': 'DEV1', 'board_s$title_ctt': 't', 'b_000000e074008_001$board_s$data_sid': '87FA7HFA5O755GB' },
      { 'board_s$data_no': 22248, 'board_s$data_sid': 'DEV2', 'board_s$title_ctt': 't', 'b_000000e074008_001$board_s$data_sid': 'OTHER' },
    ] });
    const devs = await findErpDevPosts(session, { no: 12221, sid: '87FA7HFA5O755GB', title: 't' });
    expect(devs).toEqual([{ no: 22247, sid: 'DEV1', title: 't' }]);
    expect(bodies[0].body.bizz_sid).toBe('B_000000E074010');
    expect(bodies[0].body.condition['board_s$title_ctt']).toEqual({ type: 'like', value: 't' });
  });

  it('없는 프로젝트 코드는 번호로 찾으라고 안내한다', async () => {
    mockFetch({ data: [] });
    await expect(findErpWorkPosts(session, 'A26_99999')).rejects.toThrow('작업 게시글 번호');
  });
});

describe('ERP 카테고리', () => {
  const { buildErpPayload: build, DEFAULT_ERP_MAPPING: M, DEFAULT_ERP_USER: U } = jest.requireActual('../../utils/erpTimelog');
  const base = { id: 'x', checked: false, project_name: 'A26_04719', work_type: '작업', schedule_name: '일정', time_minutes: 10, note: '', date: '2026-09-11' };

  it('옛 이름 탐색업무는 07 팀장업무로 보낸다', () => {
    const r = build([{ ...base, category_code: '07', category_name: '탐색업무' }], '2026-09-11', M, U);
    expect(r.errors).toEqual([]);
    const d = r.payload.data.slip_data_model.data_model.boardXdetail[0];
    expect(d['board_m$cd_sid_001']).toBe('07');
    expect(d['board_m$cd_nm_001']).toBe('팀장업무');
  });

  it('ERP 목록에 없는 카테고리는 저장 전에 오류로 막는다', () => {
    const r = build([{ ...base, category_code: '내맘대로', category_name: '내맘대로' }], '2026-09-11', M, U);
    expect(r.errors[0]).toContain('ERP 카테고리 목록에 없습니다');
  });
});

describe('fetchErpWorkSummary (작업 기준)', () => {
  it('진행상태는 작업 게시글, 날짜는 연결된 개발 게시글 전체(폐기 제외·다른 작업 제외)', async () => {
    const { fetchErpWorkSummary } = jest.requireActual('../../utils/erpTimelog');
    const reply = (data: unknown[]) =>
      Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ Status: 200, Data: { data } })) });
    const link = 'b_000000e074008_001$board_s$data_sid';
    global.fetch = jest
      .fn()
      .mockReturnValueOnce(
        reply([{ 'board_s$data_no': 12221, 'board_s$progress_status': { name: '테스트중' }, 'board_s$update_dtm': '∬D:2026-10-14T01:00:00.000Z∬' }])
      )
      .mockReturnValueOnce(
        reply([
          { [link]: 'W1', 'board_s$progress_status': { name: '배포완료' }, 'board_s$dt_002': '20260914', 'board_s$dt_003': '20260915' },
          { [link]: 'W1', 'board_s$progress_status': { name: '테스트중' }, 'board_s$dt_002': '20261007', 'board_s$dt_003': '20261012' },
          { [link]: 'W1', 'board_s$progress_status': { name: '폐기' }, 'board_s$dt_002': '20260901' },
          { [link]: 'OTHER', 'board_s$progress_status': { name: '진행중' }, 'board_s$dt_002': '20250101' },
        ])
      ) as unknown as typeof fetch;
    const summary = await fetchErpWorkSummary({ sid: 'E-x', origin: 'https://logine.ecount.com' }, { no: 12221, sid: 'W1', title: 'PageSetup' });
    expect(summary).toEqual({
      status: '테스트중',
      changed: '2026-10-14',
      dates: ['2026-09-14', '2026-09-15', '2026-10-07', '2026-10-12'],
      board: 'work',
      dev_statuses: ['배포완료', '테스트중'],
      test_dates: undefined,
    });
  });
});

it('연결된 개발 게시글 조회가 시간 초과여도 작업 게시글 값은 살린다', async () => {
  const { fetchErpWorkSummary } = jest.requireActual('../../utils/erpTimelog');
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({ Status: 200, Data: { data: [{ 'board_s$data_no': 12818, 'board_s$progress_status': { name: 'PO배정완료' }, 'board_s$data_dt': '20261002', 'board_s$record_sid': 'R1' }] } })
        ),
    })
    .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('{"Status":"500","Data":{"Name":"[Sql-PG-T/O]"}}') }) as unknown as typeof fetch;
  const summary = await fetchErpWorkSummary({ sid: 'E-x', origin: 'https://logine.ecount.com' }, { no: 12818, sid: 'W', title: 't' });
  expect(summary).toMatchObject({ status: 'PO배정완료', created: '2026-10-02' });
  expect(summary.dev_error).toContain('Sql-PG-T/O');
  // 두 번째 요청(개발 게시판)은 작업 작성일부터만 조회
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
  expect(body.condition['board_s$data_dt'].value.from).toBe('20261002');
  // 연결 칸 조건에 작업 record_sid 를 같이 넣는다 (ERP 화면과 같은 모양)
  expect(body.condition['board_s$conn_data_001'].value[0]).toEqual({ sid: 'W', code: 'W', name: 't', additional_info: { record_sid: 'R1' } });
  // 작업 게시글 조회는 2000년부터가 아니라 최근 1년
  const work_body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(Number(work_body.condition['board_s$data_dt'].value.from)).toBeGreaterThan(20000101);
});

it('테스트/배포 게시판에서 연결된 글 작성일을 테스트 요청일로', async () => {
  const { fetchErpWorkSummary } = jest.requireActual('../../utils/erpTimelog');
  const reply = (data: unknown[]) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ Status: 200, Data: { data } })) });
  global.fetch = jest
    .fn()
    .mockReturnValueOnce(reply([{ 'board_s$data_no': 12221, 'board_s$progress_status': { name: '테스트중' }, 'board_s$record_sid': 'R1', 'board_s$data_dt': '20260911' }]))
    .mockReturnValueOnce(reply([]))
    .mockReturnValueOnce(
      reply([
        { 'board_s$conn_data_sid_001': 'W1', 'board_s$data_dt': '20261014', 'board_s$progress_status': { name: '테스트' } },
        { 'board_s$conn_data_sid_001': 'W1', 'board_s$data_dt': '20260920', 'board_s$progress_status': { name: '폐기' } },
        { 'board_s$conn_data_sid_001': 'OTHER', 'board_s$data_dt': '20261001' },
      ])
    ) as unknown as typeof fetch;
  const summary = await fetchErpWorkSummary({ sid: 'E-x', origin: 'https://logine.ecount.com' }, { no: 12221, sid: 'W1', title: 'PageSetup' });
  expect(summary.test_dates).toEqual(['2026-10-14']);
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[2][1].body);
  expect(body.bizz_sid).toBe('B_000000E074020');
  expect(body.condition['board_s$conn_data_001'].value[0].additional_info).toEqual({ record_sid: 'R1' });
});

it('진행상태 이력: 신규·상태변경만, 로컬 날짜로', async () => {
  const { fetchErpStatusHistory } = jest.requireActual('../../utils/erpTimelog');
  const slip = [
    { write_dtm: '∬D:2026-09-11T00:24:57.980Z∬', target_progress_status_nm: '개발예정', act_type_nm: '신규' },
    { write_dtm: '∬D:2026-09-14T01:51:13.930Z∬', target_progress_status_nm: '개발예정', act_type_nm: '수정' },
    { write_dtm: '∬D:2026-10-13T23:43:19.020Z∬', target_progress_status_nm: '테스트예정', act_type_nm: '상태변경' },
  ];
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ Status: 200, Data: { history_slip: slip } })),
  }) as unknown as typeof fetch;
  const history = await fetchErpStatusHistory(
    { sid: 'E-x', origin: 'https://logine.ecount.com' },
    { bizz_sid: 'B_000000E074008', data_sid: 'D', record_sid: 'R', data_dt8: '20260911', data_no: 12221 }
  );
  // 10/13 23:43 UTC = 10/14 08:43 KST (테스트 환경 시간대 기준 로컬 날짜)
  expect(history.map((h: { status: string }) => h.status)).toEqual(['개발예정', '테스트예정']);
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body).toMatchObject({ target_bizz_sid: 'B_000000E074008', target_data_sid: 'D', target_record_sid: 'R', data_dt: '20260911', data_no: 12221 });
  expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('GetHistoryCommonAction:slip_history:input');
});

it('이력: 「수정」 행에서 바뀐 진행상태도 잡고, 같은 상태가 이어지면 하나로', async () => {
  const { fetchErpStatusHistory } = jest.requireActual('../../utils/erpTimelog');
  const slip = [
    { write_dtm: '∬D:2026-10-01T06:45:54.270Z∬', target_progress_status_nm: '테스트', act_type_nm: '상태변경' },
    { write_dtm: '∬D:2026-10-01T07:05:48.838Z∬', target_progress_status_nm: '테스트', act_type_nm: '수정' },
    { write_dtm: '∬D:2026-10-01T08:20:48.392Z∬', target_progress_status_nm: '테스트중단', act_type_nm: '수정' },
  ];
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ Status: 200, Data: { history_slip: slip } })),
  }) as unknown as typeof fetch;
  const history = await fetchErpStatusHistory(
    { sid: 'E-x', origin: 'https://logine.ecount.com' },
    { bizz_sid: 'B_000000E074020', data_sid: 'D', record_sid: 'R', data_dt8: '20260930', data_no: 7534 }
  );
  expect(history.map((h: { status: string }) => h.status)).toEqual(['테스트', '테스트중단']);
});

describe('ERP 기준 현황표: 시간 로그 작업별 집계', () => {
  // ERP 시간 로그 현황(보고서용_집계양식) 응답 한 줄 (2026-10-22 캡처, 필요한 칸만)
  const W = 'b_000000e074008_m002$board_s$';
  const agg = (no: number, sid: string, title: string, minutes: string, status: string, dt: string) => ({
    'board_m$conn_data_sid_002': sid,
    'board_m$conn_data_nm_002': title,
    'board_m$num_001_sum': minutes,
    [`${W}data_no`]: no,
    [`${W}data_dt`]: dt,
    [`${W}progress_status_nm`]: status,
  });

  it('작업 번호·제목·작성일·진행상태·분을 읽는다 (작업 미지정 줄은 버림)', () => {
    const { parseTimeByWork } = jest.requireActual('../../utils/erpTimelog');
    const rows = [
      agg(12221, '87FA7HFA5O755GB', 'PageSetup v2 Page내 함수 개발 및 적용', '∬N:708∬', '테스트중', '20260911'),
      agg(12036, '879WR9IPJEH18RP', 'ECFetch에서 Load failed', '∬N:1041.0000000000∬', '배포완료', '20260904'),
      { 'board_m$num_001_sum': '∬N:30∬' },
    ];
    expect(parseTimeByWork(rows)).toEqual([
      { work: { no: 12221, sid: '87FA7HFA5O755GB', title: 'PageSetup v2 Page내 함수 개발 및 적용' }, created: '2026-09-11', work_status: '테스트중', minutes: 708 },
      { work: { no: 12036, sid: '879WR9IPJEH18RP', title: 'ECFetch에서 Load failed' }, created: '2026-09-04', work_status: '배포완료', minutes: 1041 },
    ]);
  });

  it('담당자·기간을 검색조건에 넣어 집계 API 를 부른다', async () => {
    const { fetchErpTimeByWork } = jest.requireActual('../../utils/erpTimelog');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ Status: 200, Data: { data: [] } })),
    }) as unknown as typeof fetch;
    await fetchErpTimeByWork({ sid: 'E-x', origin: 'https://logine.ecount.com' }, { sid: '2023-026', name: '엄지희' }, '20260901', '20260930');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('SelectBoardSearchStatusAction:board:status');
    const body = JSON.parse(init.body);
    expect(body.bizz_sid).toBe('B_000000E074025');
    expect(body.condition['board_s$data_dt']).toEqual({ type: 'range', value: { from: '20260901', to: '20260930' } });
    expect(body.condition['board_s$pic']).toEqual({ type: 'contains', value: [{ sid: '2023-026', code: '2023-026', name: '엄지희' }] });
  });
});

describe('담당자 검색', () => {
  it('이름으로 찾으면 동명이인이 모두 온다 (사번·이름)', async () => {
    const { searchErpEmployees } = jest.requireActual('../../utils/erpTimelog');
    const data = [
      { 'emp$business_no': '2020-029', 'emp$cust_name': '김민주', 'emp$cancel': 'N' },
      { 'emp$business_no': '2022-009', 'emp$cust_name': '김민주', 'emp$cancel': 'N' },
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ Status: 200, Data: { total_count: 2, data } })),
    }) as unknown as typeof fetch;
    const found = await searchErpEmployees({ sid: 'E-x', origin: 'https://logine.ecount.com' }, ' 김민주 ');
    expect(found).toEqual([{ sid: '2020-029', name: '김민주' }, { sid: '2022-009', name: '김민주' }]);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('SelectBasicCodeSearchPopupAction:emp:search');
    expect(JSON.parse(init.body).condition_quick.value).toBe('김민주');
  });
});

describe('관리업무 팀장업무·팀회의 매핑', () => {
  const { buildErpPayload: build, DEFAULT_ERP_MAPPING: M, DEFAULT_ERP_USER: U } = jest.requireActual('../../utils/erpTimelog');
  it('카테고리 07 팀장업무 → 6010, 일정명에 팀회의 → 6029', () => {
    const rows = [
      row({ project_name: 'A25_05591', category_code: '07', category_name: '팀장업무', schedule_name: '면담', time_minutes: 30 }),
      row({ project_name: 'A25_05591', category_code: '05', category_name: '회의', schedule_name: '주간 팀회의', time_minutes: 60 }),
      row({ project_name: 'A25_05591', category_code: '05', category_name: '회의', schedule_name: '설계 리뷰', time_minutes: 20 }),
    ];
    const r = build(rows, '2026-10-26', M, U, new Date(2026, 9, 26));
    expect(r.errors).toEqual([]);
    expect(r.resolved.map((x: { work: { no: number } }) => x.work.no)).toEqual([6010, 6029, 6113]);
  });
});

it('저장된 매핑에 팀장업무·팀회의가 없으면 채우고, 고친 값은 그대로 둔다', () => {
  const { useTimeManagementStore } = jest.requireActual('../../store/useTimeManagementStore');
  const migrate = useTimeManagementStore.persist.getOptions().migrate!;
  const saved = {
    erp_mapping: {
      A25_05591: {
        by_category: { '05': { no: 1, sid: 'mine', title: '내가 고친 회의' }, '07': { no: 2, sid: 'keep', title: '이미 있던 07' } },
        by_note: { 주간일정: { no: 3, sid: 's', title: '주간' } },
      },
    },
  };
  const out = migrate(saved, 0) as any;
  expect(out.erp_mapping.A25_05591.by_category['05'].sid).toBe('mine');
  expect(out.erp_mapping.A25_05591.by_category['07'].sid).toBe('keep');
  expect(out.erp_mapping.A25_05591.by_note['팀회의'].no).toBe(6029);
  expect(out.erp_mapping.A25_05591.by_note['주간일정'].no).toBe(3);
});

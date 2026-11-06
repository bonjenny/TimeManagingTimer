import { attendanceDates, attendanceLabel, parseAttendance, parseEmployees, parseSites } from '../../utils/erpAttendance';

describe('ERP 근태현황 → 캘린더 근태', () => {
  // 2026-11-06 근태현황 응답 모양 그대로 (이름만 바꿈). 마지막 줄은 합계
  const rows = [
    { 'INSA511.EMP_CD': 'E1', 'INSA511.EMP_KNAME': '가나다', 'INSA501.ATTEND_DES': '연차', 'INSA511.USING_DAY': '0.600000', 'INSA511.REMARKS1': '11/06 오후반차', SLIP_DATE: '20261106' },
    { 'INSA511.EMP_CD': 'E2', 'INSA511.EMP_KNAME': '라마바', 'INSA501.ATTEND_DES': '건강검진 오전반차', 'INSA511.USING_DAY': '0.400000', 'INSA511.REMARKS1': '11/2(월) 건강검진 오전반차', SLIP_DATE: '20261102' },
    { 'INSA511.USING_DAY': '1.600000', _ROW_TYPE: 'total' },
  ];

  it('합계 줄은 빼고, 적요에서 날짜를 뗀 말을 라벨로', () => {
    expect(parseAttendance(rows)).toEqual([
      { date: '2026-11-06', emp_cd: 'E1', name: '가나다', kind: '연차', days: 0.6, note: '11/06 오후반차', label: '오후반차' },
      { date: '2026-11-02', emp_cd: 'E2', name: '라마바', kind: '건강검진 오전반차', days: 0.4, note: '11/2(월) 건강검진 오전반차', label: '건강검진 오전반차' },
    ]);
  });

  it('적요가 날짜뿐이면 근태종류를 라벨로', () => {
    expect(attendanceLabel('11/3~11/5', '가나다', '연차')).toBe('연차');
    expect(parseAttendance([{ ...rows[0], 'INSA511.REMARKS1': '11/06' }])[0].label).toBe('연차');
  });

  it('적요의 날짜(연도 2자리 포함)·기간 기호·본인 이름·마침표를 걷어 낸다 (2026-11-06 실제 화면)', () => {
    expect(attendanceLabel('26.11.30 ~ 26.12.2. 엄지희. 연차.', '엄지희', '연차')).toBe('연차');
    expect(attendanceLabel('11/12(목). 조한빈. 연차.', '조한빈', '연차')).toBe('연차');
    expect(attendanceLabel('11/2(월) 건강검진 오전반차', '라마바', '건강검진 오전반차')).toBe('건강검진 오전반차');
    expect(attendanceLabel('10/2 조한빈 EFA팀 / / 오후 반차', '조한빈', '연차', 'EFA팀')).toBe('오후 반차');
  });

  it('하루마다 같은 적요로 온 기간 휴가 줄은 펼친 뒤 겹치지 않게 하나씩', () => {
    const row = { 'INSA511.EMP_CD': 'E9', 'INSA511.EMP_KNAME': '엄지희', 'INSA501.ATTEND_DES': '연차', 'INSA511.USING_DAY': '1', 'INSA511.REMARKS1': '26.11.30 ~ 26.12.2. 엄지희. 연차.', SLIP_DATE: '20261130' };
    expect(parseAttendance([row, row, row]).map((a) => [a.date, a.label])).toEqual([
      ['2026-11-30', '연차'],
      ['2026-12-01', '연차'],
      ['2026-12-02', '연차'],
    ]);
  });

  it('적요에 기간이 있으면 그 사이 평일로 펼친다 (주말 제외, 해 넘김)', () => {
    expect(attendanceDates('20261105', '11/5(목)~11/9(월) 연차')).toEqual(['2026-11-05', '2026-11-06', '2026-11-09']);
    expect(attendanceDates('20261103', '11/3~5 연차')).toEqual(['2026-11-03', '2026-11-04', '2026-11-05']);
    expect(attendanceDates('20261231', '12/31~1/1')).toEqual(['2026-12-31', '2027-01-01']);
    expect(attendanceDates('20261106', '11/06 오후반차')).toEqual(['2026-11-06']);
  });
});

describe('ERP 부서 검색 응답', () => {
  it('부서 코드·이름·상위 부서(∬ 구분)를 읽고, 폐기 부서는 뺀다', () => {
    expect(
      parseSites([
        { SITE: 'EFA팀', SITE_DES: 'EFA팀', CANCEL: 'N', NM_PARENT: '개발본부∬FE부문' },
        { SITE: 'OLD', SITE_DES: '옛 팀', CANCEL: 'Y' },
      ])
    ).toEqual([{ code: 'EFA팀', name: 'EFA팀', parent: '개발본부 › FE부문' }]);
  });
});

describe('ERP 사원 검색 응답', () => {
  it('사번·이름·부서·직급만 읽는다 (연락처·주민번호 같은 칸은 버림)', () => {
    const [emp] = parseEmployees([
      { EMP_CD: '2023-026', EMP_KNAME: '엄지희', EMP_SITE_DES: 'EFA팀', JOB_POSITION_DES: '선임', HP_NO: 'x', E_MAIL: 'x', JUMIN_NO: 'x' },
    ]);
    expect(emp).toEqual({ type: 'emp', code: '2023-026', name: '엄지희', sub: 'EFA팀 선임' });
  });
});

describe('근태수정 전표로 정확한 근태일자 (EPD020M LoadData)', () => {
  const { extractJsonArray, fetchErpAttendance, searchErpSites, sortSites } = jest.requireActual('../../utils/erpAttendance');
  const session = { sid: 'E-test', origin: 'https://logine.ecount.com' };
  // 근태현황: 11/30 전표 하나에 줄 3개 (적요엔 기간이 없다고 치고)
  const listRow = (ser: number) => ({ 'INSA511.EMP_CD': 'E9', 'INSA511.EMP_KNAME': '엄지희', 'INSA501.ATTEND_DES': '연차', 'INSA511.USING_DAY': '1', 'INSA511.REMARKS1': '연차', SLIP_DATE: '20261130', SLIP_NO: 1, SER_NO: ser, HID: 44012529 });
  const slipHtml = `<script>window["viewBag"] = $.xextend({"InitDatas":{"LoadData":[` +
    [['2026-11-30', 1], ['2026-12-01', 2], ['2026-12-02', 3]].map(([d, n]) => `{"FROM_DATE":"${d}","TO_DATE":"${d}T00:00:00","SER_NO":${n},"REMARKS1":"a [b] {c}"}`).join(',') +
    `],"sendInside":{}}});</script>`;

  it('HTML 안의 LoadData 배열을 꺼낸다 (문자열 안 괄호는 무시)', () => {
    expect(extractJsonArray(slipHtml, 'LoadData').map((r: any) => r.FROM_DATE)).toEqual(['2026-11-30', '2026-12-01', '2026-12-02']);
    expect(extractJsonArray('<html>없음</html>', 'LoadData')).toBeNull();
  });

  it('줄이 여러 개인 전표는 전표를 열어 줄마다 근태일자를 쓴다', async () => {
    (global as any).fetch = jest.fn((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(url.includes('EPD020M') ? slipHtml : JSON.stringify({ Status: '200', Data: { Data: [listRow(3), listRow(2), listRow(1)] } })),
      })
    );
    const list = await fetchErpAttendance(session, { type: 'emp', code: 'E9', name: '엄지희' }, '20261101', '20261204');
    expect(list.map((a: any) => a.date).sort()).toEqual(['2026-11-30', '2026-12-01', '2026-12-02']);
    const slipCall = ((global as any).fetch as jest.Mock).mock.calls.find(([u]) => u.includes('EPD020M'));
    expect(JSON.parse(slipCall[1].body).Request).toMatchObject({ SLIP_DATE: '20261130', SLIP_NO: 1, HID: 44012529 });
    expect(((global as any).fetch as jest.Mock).mock.calls.filter(([u]) => u.includes('EPD020M'))).toHaveLength(1); // 전표당 한 번
  });

  it('전표를 못 읽으면 적요의 기간으로 짐작한다', async () => {
    (global as any).fetch = jest.fn((url: string) =>
      url.includes('EPD020M')
        ? Promise.reject(new Error('network'))
        : Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ Status: '200', Data: { Data: [1, 2].map((n) => ({ ...listRow(n), 'INSA511.REMARKS1': '11/30~12/1 연차' })) } })) })
    );
    const list = await fetchErpAttendance(session, { type: 'emp', code: 'E9', name: '엄지희' }, '20261101', '20261204');
    expect(list.map((a: any) => a.date)).toEqual(['2026-11-30', '2026-12-01']);
  });

  it('부서 검색: GetSiteList 를 부서명 조건으로 부르고, 검색어로 시작하는 부서를 앞으로', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ Status: '200', Data: { Data: [
        { SITE: '10.Malaysia', SITE_DES: 'Malaysia Service', CANCEL: 'N', NM_PARENT: '해외지사' },
        { SITE: 'EFA팀', SITE_DES: 'EFA팀', CANCEL: 'N', NM_PARENT: '개발본부∬FE부문' },
        { SITE: 'EBD1', SITE_DES: 'EBD1팀', CANCEL: 'N', NM_PARENT: null },
      ] } })) })
    );
    const sites = await searchErpSites(session, 'E');
    expect(sites.map((x: any) => x.name)).toEqual(['EBD1팀', 'EFA팀', 'Malaysia Service']);
    const [url, init] = ((global as any).fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/ECAPI/SVC/Account/Basic/GetSiteList?ec_req_sid=E-test');
    expect(JSON.parse(init.body).Request.Data).toMatchObject({ PARAM: 'E', SEARCH_CRITERIA: ['SITE_DES'], CANCEL: 'N' });
    expect(sortSites([], 'E')).toEqual([]);
  });
});

it('한 줄짜리 전표도 열어서 근태일자를 쓴다 (9/22 전표 · 9/23 연차)', async () => {
  const { fetchErpAttendance } = jest.requireActual('../../utils/erpAttendance');
  (global as any).fetch = jest.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          url.includes('EPD020M')
            ? '<script>({"LoadData":[{"FROM_DATE":"2026-09-23","SER_NO":1}],"x":1})</script>'
            : JSON.stringify({ Status: '200', Data: { Data: [{ 'INSA511.EMP_CD': 'E9', 'INSA511.EMP_KNAME': '엄지희', 'INSA501.ATTEND_DES': '연차', 'INSA511.USING_DAY': '1', 'INSA511.REMARKS1': '2026.09.23. 엄지희. 연차', SLIP_DATE: '20260922', SLIP_NO: 18, SER_NO: 1, HID: 1 }] } })
        ),
    })
  );
  const [a] = await fetchErpAttendance({ sid: 'E-test', origin: 'https://logine.ecount.com' }, { type: 'emp', code: 'E9', name: '엄지희' }, '20260801', '20261002');
  expect(a).toMatchObject({ date: '2026-09-23', label: '연차' });
});

import { ErpSession } from './erpTimelog';

// 캘린더 근태 표시: ERP 「근태현황」(인사 > 근태, PRG_ID E020715) 화면이 부르는 조회 그대로 (2026-11-06 캡처).
// ec5 Action 이 아니라 옛 ECAPI 경로라 응답 모양이 다르다 ({ Data: { Data: [...] }, Status: "200" })
// 읽기 전용. 쓰지 않는다

export interface ErpAttendance {
  /** 근태일 YYYY-MM-DD (여러 날 휴가면 날마다 한 건씩 펼친다) */
  date: string;
  emp_cd: string;
  name: string;
  /** 연차 · 건강검진 오전반차 … (ERP 근태종류) */
  kind: string;
  /** 사용 일수 (반차 0.4·0.6 등) */
  days: number;
  /** 적요 원문 (예: "11/2(월) 건강검진 오전반차") */
  note: string;
  /** 캘린더에 붙일 짧은 글: 적요에서 날짜를 뺀 말, 없으면 근태종류 (예: "오후반차") */
  label: string;
}

type Row = Record<string, unknown>;

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 적요의 날짜 한 개: "11/2", "11/12(목)", "26.11.30", "2026.12.2" (연도는 2·4자리, 없어도 됨)
const DATE_RE = /(?:(\d{2,4})[./])?(\d{1,2})[./](\d{1,2})(?:\([^)]*\))?/;

/**
 * 칩에 붙일 짧은 말: 적요에서 날짜 · 기간 기호 · 본인 이름 · 마침표를 걷어 낸 나머지, 없으면 근태종류.
 * 예) "11/06 오후반차" → 오후반차 / "26.11.30 ~ 26.12.2. 엄지희. 연차." → 연차 / "11/12(목). 조한빈. 연차." → 연차
 */
export function attendanceLabel(note: string, name: string, kind: string, site = ''): string {
  const cleaned = [name, site].filter(Boolean).reduce((t, word) => t.split(word).join(' '), note.replace(new RegExp(DATE_RE.source, 'g'), ' '))
    .replace(/[~.,·/]/g, ' ')
    .replace(/(^|\s)-(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || kind;
}

/**
 * 근태일. 전표일자가 근태일이고(반차·하루 휴가), 적요에 "11/3~11/5" · "26.11.30 ~ 26.12.2" 처럼 기간이 있으면
 * 그 사이 평일로 펼친다.
 * ponytail: 기간은 적요 글자로만 안다. ERP 에 기간 칸(DUR_DATE)이 따로 있지만 이 양식 응답엔 없어서
 */
export function attendanceDates(slip_date8: string, note: string): string[] {
  const y = Number(slip_date8.slice(0, 4));
  const start = new Date(y, Number(slip_date8.slice(4, 6)) - 1, Number(slip_date8.slice(6, 8)));
  // 시작일 ~ 끝날 (끝날은 "5" 처럼 일만 써도 된다)
  const m = note.match(new RegExp(`${DATE_RE.source}\\.?\\s*[~-]\\s*(?:(?:(\\d{2,4})[./])?(\\d{1,2})[./])?(\\d{1,2})`));
  if (!m) return [ymd(start)];
  const year = (v: string | undefined) => (v ? (Number(v) < 100 ? 2000 + Number(v) : Number(v)) : y);
  const from = new Date(year(m[1]), Number(m[2]) - 1, Number(m[3]));
  const to = new Date(m[4] ? year(m[4]) : from.getFullYear(), Number(m[5] ?? m[2]) - 1, Number(m[6]));
  if (to < from) to.setFullYear(to.getFullYear() + 1); // 12/30~1/2
  const out: string[] = [];
  for (let d = new Date(from); d <= to && out.length < 31; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(ymd(d));
  }
  return out.length ? out : [ymd(start)];
}

/** 근태현황 줄의 전표 키 (전표일자-번호). 근태수정 전표의 줄(SER_NO)과 맞출 때 쓴다 */
export const slipKey = (r: Row) => `${r['SLIP_DATE']}-${r['SLIP_NO']}`;

/**
 * 근태현황 줄 → 근태. slip_dates(전표키 → SER_NO → 근태일자)가 있으면 그 날짜가 정확한 근태일자다.
 * 없으면(전표 조회 실패 등) 적요의 기간 글자로 짐작한다
 */
export function parseAttendance(rows: Row[], slip_dates?: Map<string, Map<number, string>>): ErpAttendance[] {
  const seen = new Set<string>();
  return rows
    .filter((r) => r['SLIP_DATE'] && r['INSA511.EMP_KNAME'] && r['_ROW_TYPE'] !== 'total')
    .flatMap((r) => {
      const note = String(r['INSA511.REMARKS1'] ?? '').trim();
      const kind = String(r['INSA501.ATTEND_DES'] ?? '').trim();
      const name = String(r['INSA511.EMP_KNAME']);
      const base = {
        emp_cd: String(r['INSA511.EMP_CD'] ?? ''),
        name,
        kind,
        days: Number(r['INSA511.USING_DAY']) || 0,
        note,
        label: attendanceLabel(note, name, kind, String(r['INSA511.SITE_DES'] ?? '')),
      };
      const exact = slip_dates?.get(slipKey(r))?.get(Number(r['SER_NO']));
      return (exact ? [exact] : attendanceDates(String(r['SLIP_DATE']), note)).map((date) => ({ ...base, date }));
    })
    // 기간 휴가는 하루마다 같은 적요의 줄이 따로 와서(3일 → 3줄) 펼치면 겹친다 → 사람·날짜·라벨이 같으면 하나만
    .filter((a) => {
      const key = `${a.emp_cd}|${a.date}|${a.kind}|${a.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// 옛 ECAPI 경로 공통: 본문은 JSON 인데 Content-Type 은 form-urlencoded (캡처 그대로). 응답은 { Data: { Data: [...] }, Status: "200" }
async function ecapiList(session: ErpSession, path: string, body: unknown): Promise<Row[]> {
  const url = `${session.origin}${path}?ec_req_sid=${encodeURIComponent(session.sid)}&__disableMin=Y&xct=json`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-ECCSVER': '{"to":"v3http","v":{"v3http":"639294781520687358","v5http":"639294781520687358"}}',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: '*/*',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (/InvalidSession/i.test(text)) throw new Error('세션 만료 또는 잘못된 세션키입니다.');
  let json: { Status?: string | number; Data?: Row[] | { Data?: Row[] }; Error?: { Message?: string } | null };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${res.status} ${text.replace(/\s+/g, ' ').slice(0, 120)}`);
  }
  if (!res.ok || String(json.Status) !== '200' || !json.Data) {
    throw new Error(json.Error?.Message || `HTTP ${res.status} ${text.replace(/\s+/g, ' ').slice(0, 120)}`);
  }
  // 목록 화면은 { Data: { Data: [...] } }, 검색 팝업은 { Data: [...] }
  return Array.isArray(json.Data) ? json.Data : json.Data.Data || [];
}

/** 근태를 볼 대상: 부서 하나 또는 사원 한 명. 여러 개를 골라 합쳐 본다 */
export interface AttendanceTarget {
  type: 'site' | 'emp';
  /** 부서 코드(SITE) 또는 사번(EMP_CD) */
  code: string;
  name: string;
  /** 목록에 같이 보일 설명 (사원: "EFA팀 선임", 부서: 상위 부서) */
  sub?: string;
}

export const targetKey = (t: AttendanceTarget) => `${t.type}:${t.code}`;

/**
 * 대상(부서 또는 사원)의 근태. 날짜는 YYYYMMDD 이고 ERP 는 전표일자로 거른다.
 * 여러 날 휴가는 첫날 전표 하나에 날마다 줄이 달려(11/30 전표에 11/30·12/1·12/2), 보는 기간보다 앞서 시작한 휴가도
 * 잡히도록 호출하는 쪽에서 시작일을 앞당겨 부른다
 */
export async function fetchErpAttendance(session: ErpSession, target: AttendanceTarget, from8: string, to8: string): Promise<ErpAttendance[]> {
  const site = target.type === 'site' ? target.code : '';
  const emp_cd = target.type === 'emp' ? target.code : '';
  const rows = await ecapiList(session, '/ECAPI/SVC/Manage/TimeMgmt/GetTimeAttendance', {
    Request: {
      Data: {
        useSignBox: true, SAL_TYPE_CD: 'P', BASE_DATE_FROM: from8, BASE_DATE_TO: to8, DUR_DATE_FROM: '', DUR_DATE_TO: '',
        EMP_CD: emp_cd, PJT_CD: '', TENURE: '1', IsFromZaOnly: false, PAGE_CURRENT: 1, PARAM: '',
        MENU_SEQ: '490', PRG_ID: 'E020715', FORM_TYPE: 'PO710', FORM_SEQ: '1', IS_LIMIT: true, IsAppliedSort: false,
        MainsetOutSort: [], Columns: [], PAGE_SIZE: 3000, LIMIT_FLAG: 1, LIMIT_COUNT: 3000, SEARCH_RANGE: 'A', DELETE_RANGE: 'A',
        WriteDateColNm: 'INSA511.WRITE_DT', EditDateColNm: 'INSA511.EDIT_DT', IsChangeDateFormat: true, RowSeqColNm: 'INSA511.SERIAL',
        SEARCH_CRITERIA: ['EMP_CD', 'REMARKS1', 'TIME_CODE'], QUICK_SEARCH_TYPE: '', REPORT_TYPE: '0',
        BASE_DATE_SELECT: 'month', DUR_DATE_SELECT: 'ddlExYeardirect', SITE: site, SITE_LEVEL_GROUP: '', SITE_LEVEL_GROUP_CHK: '1',
        PJT_CODE1: '', PJT_CODE2: '', TIME_CODE: '', PAID_LEAVE_CODE: '', TIME_GROUP: '', REMARKS1_INPUT: '', REMARKS1_SELECT: 'Contain',
        USER_PAY: '2', WRITER_ID: '', EDITOR_ID: '', FORMLIST: '1', cbRptConfirm: [], TABLE_TYPE: 'grid', TabCd: 'A1',
      },
    },
  });
  // 근태일자는 전표일자와 다를 수 있다 (9/22 전표에 9/23 연차, 11/30 전표에 11/30·12/1·12/2).
  // 그래서 전표마다 근태수정 전표를 열어 줄마다 근태일자를 읽는다
  // ponytail: 전표마다 한 번씩(동시 4개) 부른다. 받은 근태는 저장해 두므로 ↻ 할 때만 다시 부른다
  const rows_by_slip = new Map<string, Row>();
  rows.filter((r) => r['SLIP_DATE'] && r['_ROW_TYPE'] !== 'total').forEach((r) => rows_by_slip.set(slipKey(r), r));
  const slips = [...rows_by_slip.entries()];
  const slip_dates = new Map<string, Map<number, string>>();
  for (let i = 0; i < slips.length; i += 4) {
    await Promise.all(
      slips.slice(i, i + 4).map(([k, r]) =>
        fetchSlipDates(session, String(r['SLIP_DATE']), Number(r['SLIP_NO']), Number(r['HID']))
          .then((m) => m.size && slip_dates.set(k, m))
          .catch(() => undefined) // 못 읽으면 적요로 짐작
      )
    );
  }
  return parseAttendance(rows, slip_dates);
}

/** 화면 HTML 안에 박힌 "key":[...] 배열을 꺼낸다 (괄호 짝 맞추기, 문자열 안 괄호는 건너뜀) */
export function extractJsonArray(text: string, key: string): Row[] | null {
  const at = text.indexOf(`"${key}":[`);
  if (at < 0) return null;
  const start = text.indexOf('[', at);
  let depth = 0;
  let in_str = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (in_str) {
      if (ch === '\\') i++;
      else if (ch === '"') in_str = false;
    } else if (ch === '"') in_str = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * 근태수정 전표(EPD020M) 한 장의 줄별 근태일자: SER_NO → YYYY-MM-DD (2026-11-06 캡처).
 * 응답은 화면 HTML 이고, 안의 LoadData 배열에 줄마다 FROM_DATE(근태일자)가 있다
 */
export async function fetchSlipDates(session: ErpSession, slip_date8: string, slip_no: number, hid: number): Promise<Map<number, string>> {
  const url = `${session.origin}/ECERP/SVC/EPD/EPD020M?ec_req_sid=${encodeURIComponent(session.sid)}&__disableMin=Y`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-ECCSVER': '{"to":"v3http","v":{"v3http":"639294781520687358","v5http":"639294781520687358"}}',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      EditFlag: 'M', isOpenPopup: true, URL: '/ECERP/SVC/EPD/EPD025R', FromProgramId: 'E020715',
      Request: { EDIT_FLAG: 'M', SLIP_DATE: slip_date8, SLIP_NO: slip_no, HID: hid, EditMode: '02', FromProgramId: 'E020715' },
    }),
  });
  const text = await res.text();
  if (/InvalidSession/i.test(text)) throw new Error('세션 만료 또는 잘못된 세션키입니다.');
  const load = extractJsonArray(text, 'LoadData') || [];
  return new Map(
    load
      .filter((r) => r['SER_NO'] != null && /^\d{4}-\d{2}-\d{2}/.test(String(r['FROM_DATE'] ?? '')))
      .map((r) => [Number(r['SER_NO']), String(r['FROM_DATE']).slice(0, 10)])
  );
}

// ---------------------------------------------------------------------------
// 부서 검색 (ERP 부서 검색 팝업, PRG_ID E010105 · FORM_TYPE AP774, 2026-11-06 캡처)
// ---------------------------------------------------------------------------

export interface ErpSite {
  /** 부서 코드 = 근태현황 조회의 SITE 값 */
  code: string;
  name: string;
  /** 상위 부서 (예: "개발본부 › FE부문") */
  parent: string;
}

// 부서 검색: ERP 부서 검색 팝업이 부르는 목록 (2026-11-06 캡처). 부서명(SITE_DES)으로 찾는다
export const SITE_SEARCH_PATH = '/ECAPI/SVC/Account/Basic/GetSiteList';

export function parseSites(rows: Row[]): ErpSite[] {
  return rows
    .filter((r) => r['SITE'] && r['CANCEL'] !== 'Y')
    .map((r) => ({
      code: String(r['SITE']),
      name: String(r['SITE_DES'] ?? r['SITE']),
      parent: String(r['NM_PARENT'] ?? '').split('∬').filter(Boolean).join(' › '),
    }));
}

/** 이름이 검색어로 시작하는 부서를 앞으로 (E → EBD1팀·EFA팀 … 먼저, 이름 중간에 e 가 든 Malaysia Service 등은 뒤) */
export function sortSites(sites: ErpSite[], keyword: string): ErpSite[] {
  const q = keyword.trim().toLowerCase();
  const starts = (s: ErpSite) => s.name.toLowerCase().startsWith(q) || s.code.toLowerCase().startsWith(q);
  return [...sites.filter(starts).sort((a, b) => a.name.localeCompare(b.name)), ...sites.filter((s) => !starts(s))];
}

export async function searchErpSites(session: ErpSession, keyword: string): Promise<ErpSite[]> {
  const q = keyword.trim();
  const rows = await ecapiList(session, SITE_SEARCH_PATH, {
    Request: {
      Data: {
        CANCEL: 'N', SEARCH_FORM_TYPE: 'AN774', PARAM: q, isReceiveDataAll: false, CHK_FLAG: 'P', isOthersDataFlag: 'Y',
        CHK_FLAG_ORGCHT: null, ALLSITE: null, IsFromZaOnly: false, PAGE_CURRENT: 1, MENU_SEQ: '490', PRG_ID: 'E010105',
        FORM_TYPE: 'AP774', FORM_SEQ: 1, IS_LIMIT: true, PAGE_SIZE: 100, LIMIT_FLAG: 1, LIMIT_COUNT: 200,
        SEARCH_RANGE: 'A', DELETE_RANGE: 'A', RowSeqColNm: null, SEARCH_CRITERIA: ['SITE_DES'], QUICK_SEARCH_TYPE: '',
        SITE: '', SITE_DES: '', OTHER_ESTABLISH: '', SITE_LEVEL_GROUP: '', SITE_LEVEL_GROUP_CHK: '1', BASE_DATE_CHK: '',
        txtOtherEstablishment: '', TabCd: 'A1',
      },
    },
  });
  return sortSites(parseSites(rows), q);
}

// ---------------------------------------------------------------------------
// 사원 검색 (ERP 사원 검색 팝업, 2026-11-06 캡처). 응답의 연락처·주민번호 같은 칸은 읽지 않는다
// ---------------------------------------------------------------------------

export function parseEmployees(rows: Row[]): AttendanceTarget[] {
  return rows
    .filter((r) => r['EMP_CD'] && r['EMP_KNAME'])
    .map((r) => ({
      type: 'emp' as const,
      code: String(r['EMP_CD']),
      name: String(r['EMP_KNAME']),
      sub: [r['EMP_SITE_DES'] ?? r['SITE_DES'], r['JOB_POSITION_DES']].filter(Boolean).join(' '),
    }));
}

export async function searchErpEmployees(session: ErpSession, keyword: string): Promise<AttendanceTarget[]> {
  const q = keyword.trim();
  const rows = await ecapiList(session, '/ECAPI/SVC/Manage/HR/GetListForSearchEmployeeHR', {
    Request: { Data: { isApplyDisplayFlag: true, isIncludeInactive: false, isNewDisplayFlag: false, PARAM: '' } },
    keyword: q,
    PARAM: q,
  });
  return parseEmployees(rows);
}

/** 부서 · 사원을 한 번에 찾는다. 부서 검색 주소가 없으면 사원만. 한쪽이 실패해도 다른 쪽 결과는 쓴다 */
export async function searchAttendanceTargets(session: ErpSession, keyword: string): Promise<AttendanceTarget[]> {
  const [sites, emps] = await Promise.allSettled([
    SITE_SEARCH_PATH ? searchErpSites(session, keyword) : Promise.resolve([] as ErpSite[]),
    searchErpEmployees(session, keyword),
  ]);
  if (sites.status === 'rejected' && emps.status === 'rejected') throw emps.reason;
  const site_targets = sites.status === 'fulfilled'
    ? sites.value.map((x) => ({ type: 'site' as const, code: x.code, name: x.name, sub: x.parent }))
    : [];
  return [...site_targets, ...(emps.status === 'fulfilled' ? emps.value : [])];
}

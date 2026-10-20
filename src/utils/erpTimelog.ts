import { TimeManagementRow } from '../store/useTimeManagementStore';
import { CATEGORY_CODE_MAP, getCategoryCode } from '../constants/categoryCodeMap';

// ECOUNT ERP 시간 로그 게시판(CreateBoardAction) payload 생성기.
// 검증 경로: eccp-timelog 스킬 scripts/timelog_api.py (2026-09-12).

export const BOARD_WORK = 'B_000000E074008';
export const BOARD_DEV = 'B_000000E074010';
export const BOARD_TIMELOG = 'B_000000E074025';
export const ERP_DEFAULT_ORIGIN = 'https://logine.ecount.com';
export const ERP_TIMELOG_URL =
  'https://logine.ecount.com/ec56/view/erp?w_flag=1#menuType=MENUTREE_000007&menuSeq=MENUTREE_002624&groupSeq=MENUTREE_000044&prgId=E200469&depth=4';

export interface ErpPost {
  no: number;
  sid: string;
  title: string;
}

export interface ErpProjectMapping {
  work?: ErpPost;
  dev?: ErpPost;
  alias?: string;
  by_category?: Record<string, ErpPost>; // 관리업무: 카테고리 코드별 (default 키 허용)
  by_note?: Record<string, ErpPost>; // 관리업무: 일정명 부분일치 오버라이드
}

export type ErpMapping = Record<string, ErpProjectMapping>;

export interface ErpUser {
  pic_sid: string;
  name: string;
  dept: string;
}

const W = (no: number, sid: string, title: string): ErpPost => ({ no, sid, title });

export const DEFAULT_ERP_USER: ErpUser = { pic_sid: '2023-026', name: '엄지희', dept: 'EFA팀' };

export const DEFAULT_ERP_MAPPING: ErpMapping = {
  A26_04677: {
    work: W(12036, '879WR9IPJEH18RP', 'ECFetch에서 Load failed, NetworkError 에러로그 안남기도록'),
    dev: W(22018, '87A2H3GD11873WQ', 'ECFetch에서 Load failed, NetworkError 에러로그 안남기도록'),
  },
  A26_04719: {
    work: W(12101, '87CDG3I44BB1EJT', 'ES2022 미지원 브라우저 사용자 알럿 띄우도록'),
    dev: W(22057, '87CDH6RP95R1ERS', 'ES2022 미지원 브라우저 사용자 알럿 띄우도록'),
  },
  A26_02392: {
    work: W(8758, '8499IKOP8MH6NK3', 'issue.3712 render http endpoint 사용처 제거 추가작업'),
    dev: W(19103, '85I4SLLJA6S6EAE', '브라우저에서 PDF를 다운로드 받기위한 메신저 Client 추가 요청'),
  },
  'UI 에러 로그 ECFetch Error 분석': {
    work: W(11989, '8796OFHQSC33OAM', 'UI 에러 로그 ECFetch Error 분석'),
    dev: W(21964, '8796ORNJKMV1HD3', 'UI 에러 로그 ECFetch Error 분석'),
  },
  A26_03358: { work: W(12263, '87FJ855LJ898EU1', '5.6 로그인 페이지 - 5.0 브라우저 커밋 선배포') },
  A26_00899: { work: W(7132, '82F1535CD7U3PWD', '5.6 판매 원셋') },
  A25_05591: {
    by_category: {
      '05': W(6113, '81BU63SAOMR453R', '회의'),
      '10': W(6091, '81BOK7SO3VV6AIR', '질의응답'),
      '11': W(9066, '84KDE7RH2HE52Q8', '문서작업'),
      '28': W(6409, '81JIMS9D1AC4IN5', '센터오류 확인'),
      default: W(9066, '84KDE7RH2HE52Q8', '문서작업'),
    },
    by_note: {
      '시간관리 입력': W(6106, '81BSKBKWFVU48EF', '시간관리 보고서 작성'),
      회고보고서: W(6785, '821KAA2ECKT619F', '시간관리 회고보고서 작성'),
      주간일정: W(6207, '81DG4A8BD3M46S1', '주간일정 작성'),
    },
  },
  'PageSetup Playground': { alias: 'A25_05591' },
  A26_03380: { alias: 'A25_05591' },
};

export interface ErpResolvedRow {
  work: ErpPost;
  trx: ErpPost;
  bizz_sid: string;
  bizz_nm: '작업' | '개발';
  category_code: string;
  category_name: string;
  minutes: number;
  end_date: string; // YYYY-MM-DD
  note: string;
}

function resolveWork(
  project: string,
  category_code: string,
  note: string,
  mapping: ErpMapping,
  depth = 0
): { work: ErpPost; dev?: ErpPost } {
  const m = mapping[project];
  if (!m) throw new Error(`매핑 없음: ${project || '(프로젝트 없음)'}`);
  if (m.alias) {
    if (depth > 5) throw new Error(`alias 순환: ${project}`);
    return resolveWork(m.alias, category_code, note, mapping, depth + 1);
  }
  if (m.by_category) {
    const by_note = Object.entries(m.by_note || {}).find(([key]) => note.includes(key));
    const work = by_note?.[1] || m.by_category[category_code] || m.by_category.default;
    if (!work) throw new Error(`${project} 카테고리 ${category_code} 매핑 없음`);
    return { work };
  }
  if (!m.work) throw new Error(`${project} 작업 게시글 매핑 없음`);
  return { work: m.work, dev: m.dev };
}

/** 행의 카테고리를 ERP 카테고리 코드/이름으로. ERP 목록에 없으면 kind='category' 오류. */
export function resolveErpCategory(row: TimeManagementRow): { code: string; name: string } {
  const code = CATEGORY_CODE_MAP[row.category_code] ? row.category_code : getCategoryCode(row.category_name);
  if (!CATEGORY_CODE_MAP[code]) {
    throw Object.assign(
      new Error(`카테고리 "${row.category_name || row.category_code}" 는 ERP 카테고리 목록에 없습니다. 시간관리 표에서 카테고리를 바꿔주세요.`),
      { kind: 'category' }
    );
  }
  return { code, name: CATEGORY_CODE_MAP[code] };
}

export function resolveErpRow(row: TimeManagementRow, mapping: ErpMapping): ErpResolvedRow {
  const category = resolveErpCategory(row);
  const schedule = row.schedule_name.trim();
  const note = (row.note || '').trim(); // 시간관리 표의 비고 그대로 (작업명 포함 여부는 불러오기 설정에서 결정)
  const target = resolveWork(row.project_name, row.category_code, schedule, mapping);
  const is_dev = row.work_type.trim() === '개발';
  if (is_dev && !target.dev) throw new Error(`${row.project_name} 개발 게시글 매핑 없음`);
  return {
    work: target.work,
    trx: is_dev ? target.dev! : target.work,
    bizz_sid: is_dev ? BOARD_DEV : BOARD_WORK,
    bizz_nm: is_dev ? '개발' : '작업',
    category_code: category.code,
    category_name: category.name, // ERP 에 등록된 이름으로 보낸다 (옛 이름 "탐색업무" 등 방지)
    minutes: Math.round(row.time_minutes),
    end_date: row.end_date || row.date,
    note,
  };
}

const ref = (sid: string, name: string, extra?: Record<string, string>) => ({ sid, code: sid, name, ...extra });

function buildDetail(r: ErpResolvedRow) {
  return {
    'board_m$record_sid': '',
    'board_m$default_value_init': true,
    'board_m$txt_001': '',
    'board_m$cd_sid_001': r.category_code,
    'board_m$cd_nm_001': r.category_name,
    'board_m$dt_001': r.end_date.replace(/-/g, ''),
    'board_m$num_001': `∬N:${r.minutes}∬`,
    'board_m$atxt_001': r.note,
    'board_m$dynamic_bizz': ref(r.bizz_sid, r.bizz_nm),
    'board_m$dynamic_bizz_sid': r.bizz_sid,
    'board_m$dynamic_bizz_cd': r.bizz_sid,
    'board_m$dynamic_bizz_nm': r.bizz_nm,
    'board_m$dynamic_trx': ref(r.trx.sid, r.trx.title),
    'board_m$dynamic_trx_sid': r.trx.sid,
    'board_m$dynamic_trx_cd': r.trx.sid,
    'board_m$dynamic_trx_nm': r.trx.title,
    'board_m$conn_data_002': ref(r.work.sid, r.work.title, { bizz_sid: BOARD_WORK }),
    'board_m$conn_data_sid_002': r.work.sid,
    'board_m$conn_data_cd_002': r.work.sid,
    'board_m$conn_data_nm_002': r.work.title,
    'board_m$conn_data_bizz_sid_002': BOARD_WORK,
    'board_m$cd_001': ref(r.category_code, r.category_name),
    'board_m$cd_cd_001': r.category_code,
  };
}

function buildMaster(date_iso: string, date8: string, today8: string, total: number, user: ErpUser) {
  const e = () => ({ sid: '', code: '', name: '' });
  const codes = (type: string) => ({ type, codes: [] as string[] });
  return {
    'board_s$tenant_sid': '80000',
    'board_s$bizz_sid': BOARD_TIMELOG,
    'board_s$bizz_class_sid': 'BC_00000E074025',
    'board_s$menu_sid': 'M_000000E074025',
    'board_s$repo_sid': 'R_000000E074025',
    'board_s$data_dt_no': { data_dt: today8 },
    'board_s$confirm_type': 'Y',
    'board_s$status_type': 'U',
    'board_s$record_seq_no': 0,
    'board_s$title_ctt': `[ ​ ${date_iso.replace(/-/g, '/')}   ​] ​${user.dept} ​${user.name}`,
    'board_s$cust': e(), 'board_s$cust_sid': '', 'board_s$cust_cd': '', 'board_s$cust_nm': '',
    'board_s$dept': ref(user.dept, user.dept), 'board_s$dept_sid': user.dept, 'board_s$dept_cd': user.dept, 'board_s$dept_nm': user.dept,
    'board_s$pjt': e(), 'board_s$pjt_sid': '', 'board_s$pjt_cd': '', 'board_s$pjt_nm': '',
    'board_s$pic': ref(user.pic_sid, user.name), 'board_s$pic_sid': user.pic_sid, 'board_s$pic_cd': user.pic_sid, 'board_s$pic_nm': user.name,
    'board_s$prod': e(), 'board_s$prod_sid': '', 'board_s$prod_cd': '', 'board_s$prod_nm': '',
    'board_s$anounc_tf': false,
    'board_s$record_range_dtm': {},
    'board_s$record_depth_no': 0,
    'board_s$ver_no': 0,
    'board_s$progress_status': ref('1000', '내시간관리'), 'board_s$progress_status_sid': '1000', 'board_s$progress_status_cd': '1000', 'board_s$progress_status_nm': '내시간관리',
    'board_s$writer': ref(user.name, user.name),
    'board_s$update_sid': user.name,
    'board_s$deliver': codes('A'), 'board_s$deliver_dept': [],
    'board_s$referrer': codes('S'), 'board_s$referrer_dept': [],
    'board_s$sharer': codes('S'), 'board_s$sharer_dept': [],
    'board_s$viewer': codes('S'), 'board_s$viewer_dept': [],
    'board_s$cs_sharer': codes('S'),
    'board_s$label': [],
    'board_s$slip_authority': {
      authority_setup_type: 'BaseSetup',
      slip_authority_value: [
        { target: 'G', modify: true, create_reply: true, view_others_reply: true },
        { target: 'R', modify: false, create_reply: true, view_others_reply: true },
        { target: 'S', modify: false, create_reply: false, view_others_reply: true },
        { target: 'V', modify: false, create_reply: false, view_others_reply: false },
        { target: 'C', modify: false, create_reply: true, view_others_reply: true },
      ],
    },
    'board_s$data_input_type': 'I',
    'board_s$num_001': `∬N:${total}∬`,
    'board_s$dt_001': date8,
    'board_s$write_sid': user.name,
    'board_s$record_type': 'main',
    'board_s$action_mode': '',
    'board_s$data_dt': today8,
    'board_s$data_no': null,
    'board_s$data_sid': '',
    'board_s$hid': null,
    'board_s$record_sid': '',
    'board_s$slip_link': { slip_info: {}, file_info: {} },
    'board_s$updater': e(),
  };
}

export interface ErpPayloadResult {
  resolved: ErpResolvedRow[];
  errors: string[]; // 행별 매핑 실패 (index 포함)
  total: number;
  payload: unknown;
}

export function buildErpPayload(
  rows: TimeManagementRow[],
  date_iso: string,
  mapping: ErpMapping,
  user: ErpUser,
  today: Date = new Date()
): ErpPayloadResult {
  const date8 = date_iso.replace(/-/g, '');
  const today8 = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const resolved: ErpResolvedRow[] = [];
  const errors: string[] = [];
  rows.forEach((row, i) => {
    try {
      resolved.push(resolveErpRow(row, mapping));
    } catch (e) {
      errors.push(`${i + 1}행 (${row.schedule_name || '-'}): ${(e as Error).message}`);
    }
  });
  const total = resolved.reduce((s, r) => s + r.minutes, 0);
  const off = () => ({ visible: true, use: false });
  const payload = {
    bizz_sid: BOARD_TIMELOG,
    action_mode: 'NEW',
    menu_sid: 'M_000000E074025',
    menu_type: 'input',
    data: {
      bizz_sid: BOARD_TIMELOG,
      additional_info: { confirm_type: 'Y' },
      slip_data_model: {
        bizz_sid: BOARD_TIMELOG,
        menu_sid: 'M_000000E074025',
        menu_type: 'input',
        action_mode: 'NEW',
        data_model: {
          boardXmaster: [buildMaster(date_iso, date8, today8, total, user)],
          boardXdetail: resolved.map((r) => buildDetail(r)),
          boardXeditor: [{ 'board_b$body_html_ctt': { code: {}, content: '' }, 'board_b$body_ctt': '' }],
          boardXnotification_master_input: [
            {
              noti_target: { writer: { use: false, codes: [] }, deliver: { use: false, codes: [] } },
              noti_channel: {
                email: off(), sms: off(), attach_link: off(), kakao: off(), messenger: off(), memo: off(), app_push: off(),
              },
              noti_message: { email_title: '', mobile_content: '', internal_notification_content: '' },
              custom_target_id: [], custom_target_dept: [], bizz_sid: '', data_sid: '', record_sid: '', repo_sid: '',
            },
          ],
        },
        data_dt: today8,
        data_no: null,
        data_sid: '',
      },
      current_template: '7VC6DMBMUFD7GKP',
      is_za_from_only: false,
    },
  };
  return { resolved, errors, total, payload };
}

// 로그인된 ERP 탭 콘솔에 붙여넣어 실행하는 스크립트.
// payload는 여기서 미리 직렬화해 문자열로 심는다 — ERP 페이지의 Array.prototype.toJSON 이
// 페이지 안 JSON.stringify 를 망가뜨리기 때문(서버 500 [Sql-PG-T/O]).
export function buildErpConsoleScript(payload: unknown, date_iso: string, row_count: number, total: number): string {
  const body = JSON.stringify(JSON.stringify(payload));
  const msg = JSON.stringify(`${date_iso} 시간 로그 ${row_count}행 ${total}분을 ERP에 저장할까요?`);
  return `(async () => {
  const sid = new URLSearchParams(location.search).get('ec_req_sid');
  if (!sid) { alert('ec_req_sid 없음: 로그인된 ERP 탭에서 실행하세요'); return; }
  if (!confirm(${msg})) return;
  const r = await fetch('/ec5/api/app.board/action/CreateBoardAction:board:input?ec_req_sid=' + sid + '&__disableMin=Y', {
    method: 'POST', credentials: 'include',
    headers: {
      'X-ECCSVER': '{"to":"v5http","v":{"v3http":"639246419025975313","v5http":"639246419025975313"}}',
      'Accept': 'application/keypack,*/*', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest',
    },
    body: ${body},
  });
  const t = await r.text();
  const m = t.match(/"board_num":(\\d+)/);
  const line = 'HTTP ' + r.status + ' board_num=' + (m ? m[1] : '?') + ' ' + t.replace(/\\s+/g, ' ').slice(0, 160);
  document.title = 'TL ' + line.slice(0, 120);
  alert(line);
  console.log(line);
})();`;
}

// "E-xxxx" 또는 ERP 주소창 URL 전체를 받아 { sid, origin } 으로. 못 읽으면 null.
export function parseErpSession(input: string): { sid: string; origin: string } | null {
  const text = input.trim();
  // sid 에는 '!' 같은 기호도 들어간다(E-ETq!GAri...). URL 이면 & # 앞까지, 아니면 입력 전체.
  const from_url = text.match(/ec_req_sid=([^&#\s]+)/);
  const raw = from_url ? from_url[1] : /^[A-Za-z]-\S+$/.test(text) ? text : '';
  let sid = raw;
  try {
    sid = decodeURIComponent(raw);
  } catch {
    // 이미 디코딩된 값이면 그대로 쓴다
  }
  if (!sid) return null;
  const origin = text.match(/^https:\/\/[a-z0-9.-]+\.ecount\.com/i)?.[0] || ERP_DEFAULT_ORIGIN;
  return { sid, origin };
}

export interface ErpPostResult {
  ok: boolean;
  status: number;
  board_num?: string;
  message: string;
}

// ERP 서버는 요청 Origin 을 그대로 허용(credentials 포함)하므로 developer.ecount.com 에서 직접 호출 가능.
// 쿠키는 같은 사이트(ecount.com)라 credentials: 'include' 로 붙는다.
// ponytail: ERP 버전값 하드코딩. 배포로 바뀌어 오류 나면 브라우저 요청의 X-ECCSVER 값으로 교체
const ERP_HEADERS = {
  'X-ECCSVER': '{"to":"v5http","v":{"v3http":"639249702076253196","v5http":"639249702076253196"}}',
  'Accept': 'application/keypack,*/*',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
};

export async function postErpTimelog(payload: unknown, sid: string, origin: string = ERP_DEFAULT_ORIGIN): Promise<ErpPostResult> {
  const url = `${origin}/ec5/api/app.board/action/CreateBoardAction:board:input?ec_req_sid=${encodeURIComponent(sid)}&__disableMin=Y`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: ERP_HEADERS,
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { ok: false, status: 0, message: `네트워크/CORS 오류: ${(e as Error).message}` };
  }
  const text = await res.text();
  const board_num = text.match(/"board_num":(\d+)/)?.[1];
  if (/InvalidSession/i.test(text)) {
    return { ok: false, status: res.status, message: '세션 만료 또는 잘못된 세션키입니다. ec_req_sid 는 로그인할 때마다 바뀌고, ERP 탭을 닫으면 만료됩니다. ERP 탭을 열어 둔 채 그 탭 주소를 다시 복사해 붙여넣으세요.' };
  }
  return {
    ok: res.ok && !!board_num,
    status: res.status,
    board_num,
    message: board_num ? `저장 완료: 시간 로그 ${board_num}번` : `HTTP ${res.status} ${text.replace(/\s+/g, ' ').slice(0, 200)}`,
  };
}

// ---------------------------------------------------------------------------
// 게시글 매핑 자동 생성: 프로젝트 코드 또는 작업 게시글 번호 → 작업/개발 게시글
// ---------------------------------------------------------------------------

export interface ErpSession {
  sid: string;
  origin: string;
}

async function erpQuery<T>(session: ErpSession, action: string, body: unknown): Promise<T> {
  const url = `${session.origin}/ec5/api/${action}?ec_req_sid=${encodeURIComponent(session.sid)}&__disableMin=Y`;
  const res = await fetch(url, { method: 'POST', credentials: 'include', headers: ERP_HEADERS, body: JSON.stringify(body) });
  const text = await res.text();
  if (/InvalidSession/i.test(text)) throw new Error('세션 만료 또는 잘못된 세션키입니다.');
  let json: { Status?: number; Data?: T };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`);
  }
  if (!res.ok || json.Status !== 200 || !json.Data) throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`);
  return json.Data;
}

type Row = Record<string, unknown>;

export async function searchErpProject(session: ErpSession, code: string): Promise<{ code: string; name: string } | null> {
  const data = await erpQuery<{ data: Row[] }>(session, 'app.basiccode/action/SelectBasicCodeSearchPopupAction:board:list', {
    menu_type: 'search', bizz_sid: 'B_000000E010112', menu_sid: 'M_000000E200617', is_from_bottom: true,
    from_bizz_type: 'board', param: code, condition: {}, additional: { balance_option: {} },
  });
  const hit = data.data.find((r) => r['pjt$pjt_cd'] === code);
  return hit ? { code, name: String(hit['pjt$pjt_des']) } : null;
}

const ymd8 = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const today8 = () => ymd8(new Date());
const yearAgo8 = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return ymd8(d);
};
const range = () => ({ type: 'range', value: {} });
const contains = (value: unknown[] = []) => ({ type: 'contains', value });
const like = (value = '') => ({ type: 'like', value });
const eq = () => ({ type: '=', value: '' });

// ERP 게시판 목록 화면에서 캡처한 조건 그대로. 기본 기간은 최근 1년 (전체 기간은 DB 시간 초과가 난다).
// ponytail: 1년보다 오래된 게시글은 못 찾는다. 필요하면 호출하는 쪽에서 board_s$data_dt 를 넘긴다
function listBody(bizz_sid: string, template: string, menu_sid: string, condition: Row) {
  return {
    menu_type: 'list', bizz_sid, page: { current_index: 1, row_count: 50 }, limit: 5000,
    condition: {
      'board_s$data_dt': { type: 'range', value: { from: yearAgo8(), to: today8() } },
      'board_s$data_no': like(), 'board_s$title_ctt': like(), 'board_b$body_ctt': like(),
      'board_s$conn_data_001': contains(), 'board_s$conn_data_002': contains(),
      'board_s$dept': contains(), 'board_s$cd_001': contains(), 'board_s$data_no_02': like(),
      'board_s$updater': contains(), 'board_s$update_dtm': range(), 'board_s$write_dtm': range(),
      'board_s$record_type': contains(['main']), 'board_s$user': contains(), 'board_s$status_type': contains(['U']),
      'board_s$modified_sort': contains(), 'board_s$data_input_type': { type: 'contains' }, 'board_s$label': contains(),
      'board_s$bizz_sid': eq(), 'board_s$confirm_type': eq(), 'board_s$data_sid': eq(),
      'board_s$parent_record_sid': eq(), 'board_s$progress_status': contains(),
      'board_s$record_depth_no': { type: '=' }, 'board_s$record_seq_no': { type: '=' }, 'board_s$record_sid': eq(),
      'board_s$tenant_sid': eq(), 'board_s$update_sid': eq(), 'board_s$ver_no': { type: '=' },
      ...condition,
    },
    additional: { expand_all: false, notice_count: 0, confirm_type: '' },
    target: null, current_template: template, template_sub_type: 'fixed', menu_sid,
  };
}

const toPost = (r: Row, prefix = ''): ErpPost => ({
  no: Number(r[`${prefix}board_s$data_no`]),
  sid: String(r[`${prefix}board_s$data_sid`]),
  title: String(r[`${prefix}board_s$title_ctt`] ?? ''),
});

async function listBoard(session: ErpSession, body: unknown): Promise<Row[]> {
  const data = await erpQuery<{ data: Row[] }>(session, 'app.board/action/SelectBoardSearchListAction:board:list', body);
  return data.data;
}

/** 작업 게시글 후보. query 가 숫자면 게시글 번호, 아니면 프로젝트 코드로 검색. */
export async function findErpWorkPosts(session: ErpSession, query: string): Promise<ErpPost[]> {
  const q = query.trim();
  const by_no = /^\d+$/.test(q);
  let condition: Row;
  if (by_no) {
    condition = { 'board_s$data_no': like(q) };
  } else {
    const pjt = await searchErpProject(session, q);
    if (!pjt) throw new Error(`ERP에 프로젝트 코드 ${q} 가 없습니다. 작업 게시글 번호로 찾아주세요.`);
    condition = { 'board_s$pjt': contains([{ sid: pjt.code, code: pjt.code, name: pjt.name }]) };
  }
  const rows = await listBoard(session, listBody(BOARD_WORK, 'BRDUSCRM0043501', 'M_000000N000351', condition));
  const posts = rows.map((r) => toPost(r));
  return by_no ? posts.filter((p) => String(p.no) === q) : posts;
}

/**
 * 작업 게시글에 연결된 개발 게시글. dev_no 가 있으면 번호로, 없으면 작업 제목으로 개발 게시판을 검색한 뒤
 * 연결 필드(작업 data_sid)로 거른다. 개발 제목이 작업 제목과 다르면 제목 검색에 안 걸리므로 번호로 찾는다.
 */
export async function findErpDevPosts(session: ErpSession, work: ErpPost, dev_no = ''): Promise<ErpPost[]> {
  const no = dev_no.trim();
  const rows = await listBoard(
    session,
    listBody(BOARD_DEV, 'BRDUSCRM0043901', 'M_000000N000353', {
      ...(no ? { 'board_s$data_no': like(no) } : { 'board_s$title_ctt': like(work.title) }),
      'board_s$pic': contains(), 'board_s$num_010': { type: 'range' },
      'board_s$dt_002': range(), 'board_s$dt_003': range(), 'board_s$dt_004': range(),
    })
  );
  return rows.filter((r) => r['b_000000e074008_001$board_s$data_sid'] === work.sid).map((r) => toPost(r));
}

// ---------------------------------------------------------------------------
// 주간 진행 현황표용: 매핑된 작업·개발 게시글의 진행상태·날짜
// ---------------------------------------------------------------------------

export interface ErpPostSummary {
  /** 게시글 진행상태 이름 (예정, 진행중, 테스트중, 배포대기, 배포완료 …) */
  status: string;
  /** 마지막 수정일 YYYY-MM-DD. 진행상태를 바꾼 날로 쓴다 (목록 API 에는 상태 변경일이 따로 없다) */
  changed: string;
  /** 게시글 날짜 칸(dt_00n) 가운데 채워진 값 YYYY-MM-DD, 오름차순 */
  dates: string[];
  board: 'work' | 'dev';
  /** 작업 기준일 때: 연결된 개발 게시글들의 진행상태 (폐기 제외) */
  dev_statuses?: string[];
  /** 게시글 작성일 YYYY-MM-DD */
  created?: string;
  /** 게시글 record_sid (연결 칸 조건에 같이 넘겨야 한다) */
  record_sid?: string;
  /** 연결된 개발 게시글 조회가 실패했을 때 이유 (작업 게시글 값만 씀) */
  dev_error?: string;
  /** 작업에 연결된 테스트/배포 게시글 작성일들 = 테스트 요청일 (오름차순) */
  test_dates?: string[];
  /** 작업에 연결된 테스트/배포 게시글과 그 진행상태 이력 (폐기 제외). 테스트 이후 단계는 이게 가장 정확하다 */
  test_posts?: { created: string; history: { date: string; status: string }[] }[];
  /** 작업 게시글 진행상태 변경 이력 (신규·상태변경만, 오래된 순). 기준일 시점 상태를 구할 때 쓴다 */
  status_history?: { date: string; status: string }[];
}

/**
 * 게시글 이력 → 진행상태가 바뀐 시점만. ERP 「이력조회」 화면 API (2026-10-20 캡처).
 * 응답 history_slip[]: { write_dtm, target_progress_status_nm, act_type_nm: 신규|수정|상태변경 }
 */
export async function fetchErpStatusHistory(
  session: ErpSession,
  target: { bizz_sid: string; data_sid: string; record_sid: string; data_dt8: string; data_no: number }
): Promise<{ date: string; status: string }[]> {
  const data = await erpQuery<{ history_slip?: Row[] }>(session, 'app.common/action/GetHistoryCommonAction:slip_history:input', {
    bizz_sid: 'B_000000E040716',
    target_bizz_sid: target.bizz_sid,
    target_data_sid: target.data_sid,
    target_record_sid: target.record_sid,
    data_dt: target.data_dt8,
    data_no: target.data_no,
    menu_sid: 'M_000000E040716',
  });
  // 「상태변경」 행만 보면 안 된다: 테스트/배포 게시판은 「수정」 행에서도 진행상태가 바뀐다 (7534: 테스트→테스트중단).
  // 시간순으로 놓고 앞 행과 진행상태가 달라진 지점만 남긴다
  const rows = (data.history_slip || [])
    .map((h) => ({ at: String(h.write_dtm ?? ''), date: parseErpDate(h.write_dtm), status: String(h.target_progress_status_nm ?? '') }))
    .filter((h) => h.date && h.status)
    .sort((a, b) => a.at.localeCompare(b.at));
  return rows.filter((h, i) => i === 0 || h.status !== rows[i - 1].status).map(({ date, status }) => ({ date, status }));
}

/** "20260928" · "2026-09-28" · "∬D:2026-09-28T…Z∬" → 로컬 날짜 YYYY-MM-DD. 아니면 '' */
export function parseErpDate(value: unknown): string {
  const text = String(value ?? '').trim();
  const iso = text.match(/∬D:([^∬]+)∬/)?.[1];
  if (iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const m = text.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** 목록 응답 한 줄 → 요약. 연결 글 칸(b_…$)은 보지 않는다 */
export function summarizeErpRow(r: Row, board: 'work' | 'dev'): ErpPostSummary {
  const ps = r['board_s$progress_status'] as { name?: string } | undefined;
  const dates = Object.keys(r)
    .filter((k) => /^board_s\$dt_\d+$/.test(k))
    .map((k) => parseErpDate(r[k]))
    .filter(Boolean)
    .sort();
  return {
    status: String(ps?.name ?? r['board_s$progress_status_nm'] ?? ''),
    changed: parseErpDate(r['board_s$update_dtm']),
    dates,
    board,
    created: parseErpDate(r['board_s$data_dt']) || undefined,
    record_sid: r['board_s$record_sid'] ? String(r['board_s$record_sid']) : undefined,
  };
}

/** 게시글 번호로 작업·개발 게시판 한 줄 조회 */
export async function fetchErpPostSummary(session: ErpSession, board: 'work' | 'dev', no: number): Promise<ErpPostSummary | null> {
  const body =
    board === 'dev'
      ? listBody(BOARD_DEV, 'BRDUSCRM0043901', 'M_000000N000353', {
          'board_s$data_no': like(String(no)),
          'board_s$pic': contains(), 'board_s$num_010': { type: 'range' },
          'board_s$dt_002': range(), 'board_s$dt_003': range(), 'board_s$dt_004': range(),
        })
      : listBody(BOARD_WORK, 'BRDUSCRM0043501', 'M_000000N000351', { 'board_s$data_no': like(String(no)) });
  const rows = await listBoard(session, body);
  const hit = rows.find((r) => Number(r['board_s$data_no']) === no);
  return hit ? summarizeErpRow(hit, board) : null;
}

/** 프로젝트 코드 → 매핑의 작업·개발 게시글 (alias 따라감, 관리업무처럼 카테고리별이면 없음) */
export function findMappedPosts(mapping: ErpMapping, code: string, depth = 0): { work?: ErpPost; dev?: ErpPost } {
  const m = mapping[code];
  if (!m) return {};
  if (m.alias && depth < 5) return findMappedPosts(mapping, m.alias, depth + 1);
  return { work: m.work, dev: m.dev };
}

/**
 * 작업 게시글 기준 요약. 한 작업에 개발 게시글이 여러 개 달리므로(예: 12221 아래 22247·22483·22985 …)
 * 매핑된 개발 글 하나만 보면 이미 끝난 옛 개발 글의 "배포완료" 가 나온다.
 * - 진행상태·수정일: 작업 게시글
 * - 날짜: 그 작업에 연결된 개발 게시글 전체 (폐기 제외) 의 가장 이른 날 ~ 가장 늦은 날
 */
export const BOARD_TEST = 'B_000000E074020';

/** 테스트/배포 게시판에서 작업에 연결된 글 찾기. ERP 테스트/배포 목록 화면 요청 그대로 (2026-10-20 캡처) */
function testBoardBody(work: ErpPost, record_sid: string, from8: string) {
  return {
    menu_type: 'list', bizz_sid: BOARD_TEST, page: { current_index: 1, row_count: 100 }, limit: 5000,
    condition: {
      'board_s$data_dt': { type: 'range', value: { from: from8, to: today8() } },
      'board_s$conn_data_001': contains([{ sid: work.sid, code: work.sid, name: work.title, additional_info: { record_sid } }]),
      'board_s$dt_001': range(), 'board_s$record_range_dtm': range(), 'board_s$pic': contains(),
      'board_s$txt_001': like(), 'board_s$pjt': contains(), 'board_s$txt_002': like(),
      'board_s$record_type': contains(['main']), 'board_s$label': contains(),
      'board_s$write_dtm': range(), 'board_s$update_dtm': range(),
      'board_b$body_ctt': like(), 'board_s$data_no': like(), 'board_s$title_ctt': like(),
      'board_s$status_type': contains(['U']), 'board_s$modified_sort': contains(), 'board_s$data_input_type': { type: 'contains' },
      'board_s$bizz_sid': eq(), 'board_s$cd_015': contains(), 'board_s$confirm_type': eq(),
      'board_s$conn_data_002': contains(), 'board_s$conn_data_003': contains(), 'board_s$data_no_02': like(),
      'board_s$data_sid': eq(), 'board_s$deliver_dept': contains(),
      'board_s$dt_002': range(), 'board_s$dt_003': range(), 'board_s$dt_004': range(),
      'board_s$parent_record_sid': eq(), 'board_s$progress_status': contains(),
      'board_s$record_depth_no': { type: '=' }, 'board_s$record_seq_no': { type: '=' }, 'board_s$record_sid': eq(),
      'board_s$tenant_sid': eq(), 'board_s$txt_003': like(), 'board_s$update_sid': eq(), 'board_s$updater': contains(),
      'board_s$ver_no': { type: '=' },
      ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [`board_s$tf_00${n}`, { type: '=' }])),
    },
    additional: { expand_all: false, notice_count: 0, confirm_type: '' },
    target: null, current_template: 'BRDUSCRM0045901', template_sub_type: 'fixed', menu_sid: 'M_000000N000363',
  };
}

export async function fetchErpWorkSummary(session: ErpSession, work: ErpPost): Promise<ErpPostSummary | null> {
  const work_summary = await fetchErpPostSummary(session, 'work', work.no);
  if (!work_summary) return null;
  // 개발 게시판의 작업 연결 칸(conn_data_001)으로 거른다. ERP 개발 화면에서 「작업」 조건으로 찾을 때와 같은 모양:
  // { sid, code, name, additional_info: { record_sid } }. record_sid 가 없으면 DB 시간 초과([Sql-PG-T/O])가 난다.
  // 기간은 작업 작성일부터, 실패해도 작업 게시글 값은 살린다. 결과는 연결 sid 로 한 번 더 확인
  let rows: Row[];
  try {
    rows = await listBoard(
      session,
      listBody(BOARD_DEV, 'BRDUSCRM0043901', 'M_000000N000353', {
        'board_s$data_dt': { type: 'range', value: { from: work_summary.created ? work_summary.created.replace(/-/g, '') : yearAgo8(), to: today8() } },
        'board_s$conn_data_001': contains([
          { sid: work.sid, code: work.sid, name: work.title, additional_info: { record_sid: work_summary.record_sid ?? '' } },
        ]),
        'board_s$pic': contains(), 'board_s$num_010': { type: 'range' },
        'board_s$dt_002': range(), 'board_s$dt_003': range(), 'board_s$dt_004': range(),
      })
    );
  } catch (e) {
    return { ...work_summary, dev_error: (e as Error).message };
  }
  const devs = rows
    .filter((r) => r['b_000000e074008_001$board_s$data_sid'] === work.sid)
    .map((r) => summarizeErpRow(r, 'dev'))
    .filter((d) => d.status !== '폐기');
  const dev_dates = devs.flatMap((d) => d.dates).sort();

  // 테스트 요청일 = 연결된 테스트/배포 게시글 작성일. 실패해도 나머지 값은 살린다
  let test_dates: string[] | undefined;
  let test_posts: { created: string; history: { date: string; status: string }[] }[] | undefined;
  try {
    const from8 = work_summary.created ? work_summary.created.replace(/-/g, '') : yearAgo8();
    const tests = (await listBoard(session, testBoardBody(work, work_summary.record_sid ?? '', from8)))
      .filter((r) => r['board_s$conn_data_sid_001'] === work.sid || r['b_000000e074008_001$board_s$data_sid'] === work.sid)
      .filter((r) => !/폐기/.test(String((r['board_s$progress_status'] as { name?: string } | undefined)?.name ?? '')))
      .filter((r) => parseErpDate(r['board_s$data_dt']));
    test_dates = tests.map((r) => parseErpDate(r['board_s$data_dt'])).sort();
    // 테스트/배포 게시글마다 진행상태 이력. 실패하면 지금 상태 하나로 대신한다
    test_posts = [];
    for (const r of tests) {
      const created = parseErpDate(r['board_s$data_dt']);
      const now_status = String((r['board_s$progress_status'] as { name?: string } | undefined)?.name ?? r['board_s$progress_status_nm'] ?? '');
      let history: { date: string; status: string }[];
      try {
        history = await fetchErpStatusHistory(session, {
          bizz_sid: BOARD_TEST,
          data_sid: String(r['board_s$data_sid'] ?? ''),
          record_sid: String(r['board_s$record_sid'] ?? ''),
          data_dt8: created.replace(/-/g, ''),
          data_no: Number(r['board_s$data_no']),
        });
      } catch {
        history = [];
      }
      test_posts.push({ created, history: history.length ? history : [{ date: parseErpDate(r['board_s$update_dtm']) || created, status: now_status }] });
    }
  } catch {
    test_dates = undefined;
    test_posts = undefined;
  }

  // 진행상태 변경 이력: 지난 주 표를 그 주 시점 상태로 쓰기 위해. 실패해도 나머지 값은 살린다
  let status_history: { date: string; status: string }[] | undefined;
  if (work_summary.record_sid && work_summary.created) {
    try {
      status_history = await fetchErpStatusHistory(session, {
        bizz_sid: BOARD_WORK,
        data_sid: work.sid,
        record_sid: work_summary.record_sid,
        data_dt8: work_summary.created.replace(/-/g, ''),
        data_no: work.no,
      });
    } catch {
      status_history = undefined;
    }
  }

  return {
    ...work_summary,
    dates: dev_dates.length ? dev_dates : work_summary.dates,
    dev_statuses: devs.map((d) => d.status).filter(Boolean),
    test_dates,
    test_posts,
    status_history,
  };
}

import { TimeManagementRow } from '../store/useTimeManagementStore';

// ECOUNT ERP 시간 로그 게시판(CreateBoardAction) payload 생성기.
// 검증 경로: eccp-timelog 스킬 scripts/timelog_api.py (2026-09-12).

export const BOARD_WORK = 'B_000000E074008';
export const BOARD_DEV = 'B_000000E074010';
export const BOARD_TIMELOG = 'B_000000E074025';
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

export function resolveErpRow(row: TimeManagementRow, mapping: ErpMapping): ErpResolvedRow {
  const schedule = row.schedule_name.trim();
  const extra = (row.note || '').trim();
  const note = extra ? `${schedule} // ${extra}` : schedule;
  const target = resolveWork(row.project_name, row.category_code, schedule, mapping);
  const is_dev = row.work_type.trim() === '개발';
  if (is_dev && !target.dev) throw new Error(`${row.project_name} 개발 게시글 매핑 없음`);
  return {
    work: target.work,
    trx: is_dev ? target.dev! : target.work,
    bizz_sid: is_dev ? BOARD_DEV : BOARD_WORK,
    bizz_nm: is_dev ? '개발' : '작업',
    category_code: row.category_code,
    category_name: row.category_name,
    minutes: Math.round(row.time_minutes),
    note,
  };
}

const ref = (sid: string, name: string, extra?: Record<string, string>) => ({ sid, code: sid, name, ...extra });

function buildDetail(r: ErpResolvedRow, date8: string) {
  return {
    'board_m$record_sid': '',
    'board_m$default_value_init': true,
    'board_m$txt_001': '',
    'board_m$cd_sid_001': r.category_code,
    'board_m$cd_nm_001': r.category_name,
    'board_m$dt_001': date8,
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
          boardXdetail: resolved.map((r) => buildDetail(r, date8)),
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

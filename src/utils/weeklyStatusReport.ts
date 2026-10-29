import type { TimerLog } from '../store/useTimerStore';
import type { Project } from '../store/useProjectStore';
import type { DeployEvent } from '../store/useDeployCalendarStore';
import { getDurationSecondsExcludingLunch } from './timeUtils';
import { addDays, formatDateToString } from './calendar_export';
import type { ErpPostSummary } from './erpTimelog';

// 주간 진행 현황표: 프로젝트(잡)마다 한 줄. 주간보고에 붙여넣는 표.
// 자동값은 일간 기록·배포 캘린더·시간관리 표에서 만들고, 손으로 고친 값이 있으면 그것을 쓴다.

export const REPORT_STATUSES = ['배포완료', '배포대기', '테스트', '개발완료', '진행중', '진행예정', '보류', '폐기'] as const;

/** ERP 게시판 진행상태 → 현황표 진행상태 */
export function mapErpStatus(name: string): string {
  const s = name.trim();
  if (/^(예정|개발예정|설계예정|PO배정완료|요청|기획)$/.test(s)) return '진행예정';
  if (/^(테스트중|테스트예정)$/.test(s)) return '테스트';
  if (/^(개발진행중|설계중|진행)$/.test(s)) return '진행중';
  if (s === '배포예정') return '배포대기';
  return s;
}

export interface ReportRow {
  /** 프로젝트 코드 또는 직접 추가한 행 id */
  key: string;
  status: string;
  task: string;
  start_date: string;
  end_date: string;
  /** 누적시간 HH:MM */
  total: string;
  note: string;
  /** 직접 추가한 행 */
  manual: boolean;
  /** 손으로 고친 칸이 있는지 */
  edited: boolean;
}

/** 주가 바뀌어도 유지되는 칸 */
export interface ReportProjectOverride {
  task?: string;
  start_date?: string;
  end_date?: string;
  hidden?: boolean;
}

/** 그 주에만 해당하는 칸 (진행상태·비고는 주마다 바뀐다) */
export interface ReportWeekOverride {
  status?: string;
  note?: string;
}

export interface ReportExtraRow {
  id: string;
  task: string;
  status: string;
  start_date: string;
  end_date: string;
  note: string;
}

export interface BuildReportInput {
  week_start: Date; // 그 주 월요일
  logs: TimerLog[];
  projects: Project[];
  events: DeployEvent[];
  /** 시간관리 표 행 (종료예정일 기본값) */
  tm_rows: { project_name: string; date: string; end_date?: string }[];
  excluded_codes: string[];
  project_overrides: Record<string, ReportProjectOverride>;
  week_overrides: Record<string, ReportWeekOverride>;
  extras: ReportExtraRow[];
  /** 「ERP에서 가져오기」로 받은 게시글 요약 (프로젝트 코드별) */
  erp_info?: Record<string, ErpPostSummary>;
  now?: number;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export const weekKey = (week_start: Date) => formatDateToString(week_start);

/** "2026-10-07" → "10/07(수)" */
export function formatMonthDay(date_str: string): string {
  const [y, m, d] = date_str.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}(${DAY_NAMES[date.getDay()]})`;
}

/** 초 → 10분 단위 반올림 "HH:MM" (10분 미만 기록은 00:10) */
export function formatRoundedHours(seconds: number): string {
  if (seconds <= 0) return '';
  const minutes = Math.max(10, Math.round(seconds / 600) * 10);
  return formatHourMinute(minutes * 60);
}

/** 초 → "HH:MM" (100시간 넘으면 그대로 늘어남) */
export function formatHourMinute(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** 기준일 뒤 며칠까지를 "예정"으로 볼지. 다음 주 금요일까지 */
const LOOKAHEAD_DAYS = 7;

const shiftDate = (date_str: string, days: number) => {
  const [y, m, d] = date_str.split('-').map(Number);
  return formatDateToString(addDays(new Date(y, m - 1, d), days));
};

const dayOfWeek = (date_str: string) => {
  const [y, m, d] = date_str.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

/**
 * 스테이지 날 → 수시배포 날.
 * 월→화, 화→수, 수→목, 목·금→다음 주 월 (금요일에는 수시배포가 없다)
 */
export function stageToReleaseDate(stage_date: string): string {
  const shift: Record<number, number> = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 4, 5: 3, 6: 2 };
  return shiftDate(stage_date, shift[dayOfWeek(stage_date)]);
}

type DeployPoint = { date: string; kind: 'release' | 'test'; label: string };

/** 테스트 일정 문구: 재요청·완료만 그대로, 나머지(테스트, 테스트요청/테스트시작 …)는 "테스트요청" */
const testLabel = (status: string) => (/재요청/.test(status) ? '테스트 재요청' : /완료/.test(status) ? '테스트완료' : '테스트요청');

/**
 * 배포 캘린더 일정 하나 → 비고에 쓸 시점.
 * 스테이지(카나리 포함)는 그날이 아니라 정해진 수시배포 날로 바꾼다. back·취소는 버린다.
 */
function toDeployPoint(e: DeployEvent): DeployPoint | null {
  const status = (e.status || '').trim();
  if (e.is_holiday || !status || /back|취소|백/i.test(status)) return null;
  if (/수시/.test(status)) return { date: e.date, kind: 'release', label: '수시배포' };
  if (/스테이지|stage|카나리/i.test(status)) return { date: stageToReleaseDate(e.date), kind: 'release', label: '수시배포' };
  if (/테스트/.test(status)) return { date: e.date, kind: 'test', label: testLabel(status) };
  return null;
}

/** 이 일정이 비고에 영향을 주는 날 (스테이지면 수시배포 날) */
export const deployPointDate = (e: DeployEvent) => toDeployPoint(e)?.date ?? null;

/**
 * 배포 캘린더로 진행상태·비고를 정한다. 기준일(ref)은 그 주 금요일, 금요일 전이면 오늘.
 * - 기준일 뒤 다음 주 안에 수시배포가 잡혀 있으면: 배포대기 + "10/15(목) 수시배포 예정"
 *   (스테이지만 잡혀 있어도 수시배포 날이 정해진 것으로 본다)
 * - 이번 주 기준일까지 마지막이 수시배포면: 배포완료 + "10/15(목) 수시배포"
 * - 기준일까지 마지막이 테스트면(지난주 것이어도 아직 배포 전이면): 테스트 + "10/14(수) 테스트요청"
 * - 그 밖에는 진행중 (비고 없음)
 */
export function deriveStatus(
  events: DeployEvent[],
  week_start_str: string,
  ref_str: string
): { status: string; note: string } {
  const points = events.map(toDeployPoint).filter((p): p is DeployPoint => !!p).sort((a, b) => a.date.localeCompare(b.date));
  const limit = shiftDate(ref_str, LOOKAHEAD_DAYS);
  const future = points.find((p) => p.kind === 'release' && p.date > ref_str && p.date <= limit);
  if (future) return { status: '배포대기', note: `${formatMonthDay(future.date)} 수시배포 예정` };
  // 테스트는 수시배포 전까지 이어진다 (지난주 테스트요청 → 이번 주도 테스트). 지난주에 끝난 배포는 이번 주 비고로 안 씀
  const past = [...points].reverse().find((p) => p.date <= ref_str);
  if (!past || (past.kind === 'release' && past.date < week_start_str)) return { status: '진행중', note: '' };
  const note = `${formatMonthDay(past.date)} ${past.label}`;
  return past.kind === 'release' ? { status: '배포완료', note } : { status: '테스트', note };
}

/** 정식 코드처럼 보이는지 (A26_05087, 작업.12946 …) */
const is_code_like = (key: string) => /^[A-Z]\d{2}_\d+$/.test(key) || /^(작업|개발|dev)\.\d+$/i.test(key);

/** 작업 칸 자동값: "코드 이름". 이름이 없으면 배포 캘린더 표시명, 코드가 아닌 키면 이름만 */
function taskLabel(key: string, projects: Project[], events: DeployEvent[]): string {
  const project_name = projects.find((p) => p.code === key)?.name;
  const event_name = events
    .filter((e) => e.job_code === key)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.job_name;
  const name = project_name && project_name !== key ? project_name : event_name && event_name !== key ? event_name : '';
  if (!name) return key;
  if (!is_code_like(key)) return name.includes(key) ? name : key;
  return name.startsWith(key) ? name : `${key} ${name}`;
}

/** 개발 게시글 진행 단계 (뒤로 갈수록 진행됨) */
const DEV_STAGES = ['예정', '진행중', '개발완료', '테스트중', '배포대기', '배포완료'];
/** 작업 게시글이 이 단계면 작업 상태를 그대로 쓴다 */
const WORK_DECIDES = ['테스트', '배포대기', '배포완료', '폐기', '보류'];

/**
 * ERP 진행상태 → 현황표 진행상태.
 * 작업 게시글이 테스트 이후(또는 폐기·보류)면 작업 상태를,
 * 그 전 단계(PO배정완료·개발예정 등)면 연결된 개발 게시글 중 가장 앞선 단계를 쓴다.
 * 개발 게시글이 하나라도 진행중이면 개발에 착수한 것이므로 진행중.
 */
export function resolveErpStatus(erp: ErpPostSummary): string {
  const work = mapErpStatus(erp.status);
  if (WORK_DECIDES.includes(work) || !erp.dev_statuses?.length) return work;
  const top = erp.dev_statuses.reduce(
    (best, s) => (DEV_STAGES.indexOf(s) > DEV_STAGES.indexOf(best) ? s : best),
    '예정'
  );
  // 테스트/배포 게시글이 없으면 배포가 있는 작업이 아니다. 개발 게시글이 테스트중·배포완료여도 개발완료까지만
  // (예: 작업.13065 는 작업 개발진행중 · 테스트/배포 글 없음 ➡️ 개발완료, 비고는 개발스프린트 종료일)
  if (!erp.test_posts?.length && DEV_STAGES.indexOf(top) > DEV_STAGES.indexOf('개발완료')) return '개발완료';
  return mapErpStatus(top);
}

/**
 * 기준일 시점의 ERP 요약.
 * - 상태 변경 이력이 있으면 기준일까지 마지막 변경을 그 주 상태로, 변경일을 그 날로 쓴다.
 *   그게 지금 상태가 아니면(지난 주) 개발 게시글 상태도 "지금" 값이라 쓰지 않는다.
 * - 이력이 없으면 지금 상태를 쓰되, 기준일 뒤에 고친 글이면 그 주 상태로 볼 수 없어 null (배포 캘린더로)
 */
function erpAtRef(erp: ErpPostSummary, ref_str: string): ErpPostSummary | null {
  const history = erp.status_history;
  if (history && history.length) {
    const upto = history.filter((h) => h.date <= ref_str);
    const at = upto[upto.length - 1];
    if (!at) return null; // 기준일엔 아직 게시글이 없었다
    const is_current = upto.length === history.length;
    return { ...erp, status: at.status, changed: at.date, dev_statuses: is_current ? erp.dev_statuses : undefined };
  }
  if (!erp.status || (erp.changed && erp.changed > ref_str)) return null;
  return erp;
}

/**
 * 테스트/배포 게시글 이력 → 기준일 시점의 진행상태·비고. 테스트 이후 단계는 이게 가장 정확하다.
 * - 테스트 요청 단계(QC배정완료 · 테스트예정 · 테스트 …): 테스트 + "작성일 테스트요청"
 * - 테스트중단: 테스트 + "그 날 테스트중단" / 테스트완료: 배포대기 + "그 날 테스트완료"
 * - 스테이지확정 · 배포프로그램확인 · 푸시확인 · 스테이지확인: 배포대기 + 스테이지 날로 정한 "수시배포 예정"
 * - 수시확인 · 동기화완료: 배포완료 + "그 날 수시배포" (지난 주에 끝난 배포면 null → 이번 주 비고 아님)
 * 기준일에 아직 글이 없었거나 폐기면 null
 */
export function testPostAtRef(
  post: { created: string; history: { date: string; status: string }[] },
  week_start_str: string,
  ref_str: string
): { status: string; note: string } | null {
  if (!post.created || post.created > ref_str) return null;
  const upto = post.history.filter((h) => h.date <= ref_str);
  const at = upto[upto.length - 1] ?? { date: post.created, status: '테스트' };
  const s = at.status;
  if (/폐기/.test(s)) return null;
  if (/수시확인|동기화완료/.test(s)) {
    // 배포일은 수시확인 날. 뒤에 동기화완료가 와도 배포일은 그대로 (예: 10/22 수시확인 · 10/26 동기화완료 ➡️ 10/22 배포)
    // 배포일이 기간 전이면 그 기간 일이 아니다 → null (작업·개발 게시글로 판단, 배포 비고는 쓰지 않음)
    const released = [...upto].reverse().find((h) => /수시확인/.test(h.status))?.date ?? at.date;
    if (released < week_start_str) return null;
    return { status: '배포완료', note: `${formatMonthDay(released)} 수시배포` };
  }
  if (/스테이지|배포프로그램|푸시확인/.test(s)) {
    const stage = [...upto].reverse().find((h) => /스테이지확정/.test(h.status))?.date ?? at.date;
    return { status: '배포대기', note: `${formatMonthDay(stageToReleaseDate(stage))} 수시배포 예정` };
  }
  if (/테스트완료/.test(s)) return { status: '배포대기', note: `${formatMonthDay(at.date)} 테스트완료` };
  if (/테스트중단/.test(s)) return { status: '테스트', note: `${formatMonthDay(at.date)} 테스트중단` };
  if (/^백$|정상화/.test(s)) return { status: '배포대기', note: `${formatMonthDay(at.date)} ${s}` };
  return { status: '테스트', note: `${formatMonthDay(post.created)} 테스트요청` };
}

type TestPost = { created: string; history: { date: string; status: string }[] };
const latestTestPost = (posts: TestPost[], ref_str: string) =>
  posts.filter((p) => p.created && p.created <= ref_str).sort((a, b) => b.created.localeCompare(a.created))[0];

/** 기준일까지 작성된 테스트/배포 게시글 중 가장 최근 글 기준 */
function latestTestState(posts: TestPost[], week_start_str: string, ref_str: string): { status: string; note: string } | null {
  const post = latestTestPost(posts, ref_str);
  return post ? testPostAtRef(post, week_start_str, ref_str) : null;
}

/** 가장 최근 테스트/배포 게시글이 기준일까지 배포(수시확인)까지 끝났으면 그 수시확인 날, 아니면 '' */
function releasedDate(posts: TestPost[] | undefined, ref_str: string): string {
  const post = posts?.length ? latestTestPost(posts, ref_str) : undefined;
  if (!post) return '';
  const upto = post.history.filter((h) => h.date <= ref_str);
  if (!/수시확인|동기화완료/.test(upto[upto.length - 1]?.status ?? '')) return '';
  return [...upto].reverse().find((h) => /수시확인/.test(h.status))?.date ?? upto[upto.length - 1].date;
}

/** 비고에 남길 만한 진행상황: 개발완료 이후 단계만 (진행중·시작 같은 건 쓰지 않는다) */
const NOTE_STATUSES = ['개발완료', '테스트', '배포대기', '배포완료', '폐기', '보류'];

/**
 * ERP 게시글 진행상태로 비고를 만든다.
 * - 배포대기·배포완료는 배포 캘린더 비고("10/19(월) 수시배포 예정")가 더 구체적이라 그것을 먼저
 * - 진행예정·진행중처럼 개발완료 전 단계는 비고를 비운다
 */
function erpNote(erp: ErpPostSummary, calendar_note: string, ref_str: string): string {
  const status = resolveErpStatus(erp);
  if (!NOTE_STATUSES.includes(status)) return '';
  if ((status === '배포대기' || status === '배포완료') && calendar_note) return calendar_note;
  // 테스트는 테스트 요청일로: 테스트/배포 게시글 작성일(기준일까지 가장 최근) → 배포 캘린더 테스트 일정 → 게시글 수정일
  if (status === '테스트') {
    const requested = (erp.test_dates || []).filter((d) => d <= ref_str).pop();
    if (requested) return `${formatMonthDay(requested)} 테스트요청`;
    if (/테스트/.test(calendar_note)) return calendar_note;
  }
  // 개발완료는 개발스프린트 종료일(기준일까지 가장 늦은 날)로. 없으면 게시글 상태 바뀐 날
  if (status === '개발완료') {
    const done = (erp.dev_done_dates || []).filter((d) => d <= ref_str).pop();
    if (done) return `${formatMonthDay(done)} 개발완료`;
  }
  if (!erp.changed) return '';
  const label = status === '배포완료' ? '수시배포' : status === '테스트' ? '테스트요청' : status;
  return `${formatMonthDay(erp.changed)} ${label}`;
}

/** 진행상태·비고 자동값. 1순위 테스트/배포 게시글 이력 → 2순위 작업·개발 게시글 → 3순위 배포 캘린더 */
// no_event_status: 배포 캘린더 일정도 없을 때 진행상태 (내 기록 기준은 진행중, ERP 기준은 ''= 모름)
function autoStatusNote(
  erp: ErpPostSummary | undefined,
  project_events: DeployEvent[],
  ws_str: string,
  ref_str: string,
  no_event_status = '진행중'
): { status: string; note: string } {
  const calendar = project_events.length ? deriveStatus(project_events, ws_str, ref_str) : { status: no_event_status, note: '' };
  const test_state = erp?.test_posts?.length ? latestTestState(erp.test_posts, ws_str, ref_str) : null;
  if (test_state) return test_state;
  const erp_at_ref = erp ? erpAtRef(erp, ref_str) : null;
  const erp_status = erp_at_ref ? resolveErpStatus(erp_at_ref) : '';
  if (!erp_status) return calendar;
  // 배포 날짜는 테스트/배포 게시글의 수시확인 날이 기준. 앞 주에 배포한 작업도 그 날로 쓴다
  // (작업 게시글은 동기화완료 날에 배포완료로 바뀌어 그 날이 배포일처럼 보인다. 예: 10/22 수시확인 · 10/26 동기화완료 ➡️ 10/22 수시배포)
  const released = erp_status === '배포완료' ? releasedDate(erp?.test_posts, ref_str) : '';
  if (released) return { status: erp_status, note: `${formatMonthDay(released)} 수시배포` };
  return { status: erp_status, note: erpNote(erp_at_ref!, calendar.note, ref_str) };
}

const status_rank = (status: string) => {
  const i = (REPORT_STATUSES as readonly string[]).indexOf(status);
  return i === -1 ? REPORT_STATUSES.length : i;
};

export function buildWeeklyReport(input: BuildReportInput): ReportRow[] {
  const { week_start, logs, projects, events, tm_rows, excluded_codes, project_overrides, week_overrides, extras } = input;
  const erp_info = input.erp_info || {};
  const now = input.now ?? Date.now();
  const ws = new Date(week_start);
  ws.setHours(0, 0, 0, 0);
  const we = addDays(ws, 7).getTime(); // 다음 주 월요일 0시
  const ws_str = formatDateToString(ws);
  // 기준일: 그 주 금요일. 아직 금요일 전이면 오늘 (그날 기준으로 비고를 쓴다)
  const ref_str = [formatDateToString(addDays(ws, 4)), formatDateToString(new Date(now))].sort()[0];
  const sun_str = formatDateToString(addDays(ws, 6));
  const week = weekKey(ws);
  const excluded = new Set(excluded_codes);

  const real_logs = logs.filter((l) => l.status !== 'SCHEDULED' && l.projectCode);

  // 이번 주에 기록이 있거나, 이번 주·앞으로 배포 일정이 잡힌 프로젝트
  const keys = new Set<string>();
  real_logs.forEach((l) => {
    if (l.startTime >= ws.getTime() && l.startTime < we) keys.add(l.projectCode!);
  });
  events.forEach((e) => {
    if (e.is_holiday || !e.job_code) return;
    const point = deployPointDate(e);
    if (point && point >= ws_str && point <= shiftDate(ref_str, LOOKAHEAD_DAYS)) keys.add(e.job_code);
  });

  // 작업명이 같은 키(예: "작업.12946" 과 "작업.12946 vmc의 …")는 한 줄로 합친다
  const groups = new Map<string, string[]>();
  [...keys].sort().forEach((key) => {
    if (excluded.has(key)) return;
    const label = taskLabel(key, projects, events);
    groups.set(label, [...(groups.get(label) || []), key]);
  });

  const rows: ReportRow[] = [];
  groups.forEach((group, auto_task) => {
    const key = group[0]; // 고친 값은 첫 키에 저장
    if (group.some((k) => project_overrides[k]?.hidden)) return;
    const po = project_overrides[key] || {};
    const wo = week_overrides[`${week}|${key}`] || {};
    const in_group = (code?: string) => !!code && group.includes(code);

    const project_logs = real_logs.filter((l) => in_group(l.projectCode) && l.startTime < we);
    const first = project_logs.reduce((min, l) => Math.min(min, l.startTime), Infinity);
    const seconds = project_logs.reduce(
      (sum, l) => sum + getDurationSecondsExcludingLunch(l.startTime, Math.min(l.endTime ?? now, we), l.pausedDuration || 0),
      0
    );
    const project_events = events.filter((e) => in_group(e.job_code));

    const end_dates = tm_rows
      .filter((r) => in_group(r.project_name) && r.end_date && r.date <= sun_str)
      .map((r) => r.end_date!)
      .sort();
    // ERP 게시글이 있으면 그 진행상태·날짜를 먼저, 없으면 배포 캘린더
    const erp = group.map((k) => erp_info[k]).find(Boolean);
    const auto = autoStatusNote(erp, project_events, ws_str, ref_str);
    const auto_start = erp?.dates[0] || (Number.isFinite(first) ? formatDateToString(new Date(first)) : '');
    const auto_end = (erp && erp.dates.length > 1 ? erp.dates[erp.dates.length - 1] : '') || end_dates[end_dates.length - 1] || '';

    rows.push({
      key,
      status: wo.status ?? auto.status,
      task: po.task ?? auto_task,
      start_date: po.start_date ?? auto_start,
      end_date: po.end_date ?? auto_end,
      total: formatRoundedHours(seconds),
      note: wo.note ?? auto.note,
      manual: false,
      edited: [po.task, po.start_date, po.end_date, wo.status, wo.note].some((v) => v !== undefined),
    });
  });

  return finishRows(rows, extras);
}

/** 직접 추가한 행을 붙이고 진행상태 → 시작일 → 작업명 순으로 */
function finishRows(rows: ReportRow[], extras: ReportExtraRow[]): ReportRow[] {
  extras.forEach((x) => {
    rows.push({ key: x.id, status: x.status, task: x.task, start_date: x.start_date, end_date: x.end_date, total: '', note: x.note, manual: true, edited: false });
  });

  return rows.sort(
    (a, b) =>
      status_rank(a.status) - status_rank(b.status) ||
      Number(a.manual) - Number(b.manual) ||
      (a.start_date || '9999').localeCompare(b.start_date || '9999') ||
      a.task.localeCompare(b.task)
  );
}

// ---------------------------------------------------------------------------
// ERP 기준 현황표: 일간 기록 없이 담당자·기간만으로. 줄 = 그 기간 시간 로그에 시간을 쓴 작업 게시글
// ---------------------------------------------------------------------------

export interface ErpReportWork {
  /** "작업.12221" (고친 값·숨김을 이 키로 기억) */
  key: string;
  title: string;
  /** 작업 시작일부터 기준일까지 쓴 시간 (분) */
  total_minutes: number;
  /** 작업 게시글 작성일 YYYY-MM-DD (개발 게시글 날짜가 없을 때 시작일) */
  created: string;
  /** 시간 로그 집계에 같이 오는 작업 게시글 진행상태 (게시글 조회가 실패했을 때 씀) */
  work_status?: string;
  summary?: ErpPostSummary;
}

export interface BuildErpReportInput {
  /** 기간 YYYY-MM-DD */
  from_str: string;
  to_str: string;
  works: ErpReportWork[];
  events: DeployEvent[];
  project_overrides: Record<string, ReportProjectOverride>;
  week_overrides: Record<string, ReportWeekOverride>;
  extras: ReportExtraRow[];
  now?: number;
}

export interface ErpPic {
  sid: string;
  name: string;
}

/**
 * 담당자 칸 입력 → 사번·이름. ERP 검색조건은 사번으로 거르므로 둘 다 있어야 한다.
 * - 전에 쓴 사람이면 이름이나 사번 하나만 쳐도 된다
 * - 처음 찾는 사람은 "2023-026 엄지희" / "엄지희 2023-026" 처럼 둘 다 (숫자가 든 쪽이 사번)
 */
export function parsePic(input: string, people: ErpPic[]): ErpPic | null {
  const q = input.trim();
  if (!q) return null;
  const known = people.find((p) => p.sid === q || p.name === q || `${p.name} (${p.sid})` === q);
  if (known) return known;
  const tokens = q.split(/[\s,/()]+/).filter(Boolean);
  const sid = tokens.find((t) => /\d/.test(t));
  const name = tokens.filter((t) => t !== sid).join(' ');
  return sid && name ? { sid, name } : null;
}

/** 기간 고친 값 키: 주 단위 대신 "from~to" */
export const erpPeriodKey = (from_str: string, to_str: string) => `${from_str}~${to_str}`;

export function buildErpWeeklyReport(input: BuildErpReportInput): ReportRow[] {
  const { from_str, to_str, works, events, project_overrides, week_overrides, extras } = input;
  // 기준일: 기간 끝. 아직 안 왔으면 오늘
  const ref_str = [to_str, formatDateToString(new Date(input.now ?? Date.now()))].sort()[0];
  const period = erpPeriodKey(from_str, to_str);
  const rows: ReportRow[] = [];
  works.forEach((w) => {
    if (project_overrides[w.key]?.hidden) return;
    const po = project_overrides[w.key] || {};
    const wo = week_overrides[`${period}|${w.key}`] || {};
    // 테스트/배포 게시글이 없는 작업도 줄은 생긴다 (시간 로그가 기준). 진행상태는 작업·개발 게시글로.
    // 그래도 비면(기준일 뒤에 고친 글·게시글 조회 실패) 지금 작업·개발 상태 → 시간 로그 집계의 작업 상태
    const found = autoStatusNote(w.summary, events.filter((e) => e.job_code === w.key), from_str, ref_str, '');
    const auto = found.status
      ? found
      : { status: w.summary ? resolveErpStatus(w.summary) : mapErpStatus(w.work_status || ''), note: '' };
    const dates = w.summary?.dates || [];
    rows.push({
      key: w.key,
      status: wo.status ?? auto.status,
      task: po.task ?? w.title,
      start_date: po.start_date ?? (dates[0] || w.created),
      end_date: po.end_date ?? (dates.length > 1 ? dates[dates.length - 1] : ''),
      total: formatRoundedHours(w.total_minutes * 60),
      note: wo.note ?? auto.note,
      manual: false,
      edited: [po.task, po.start_date, po.end_date, wo.status, wo.note].some((v) => v !== undefined),
    });
  });
  return finishRows(rows, extras);
}

/** 누적 시간 조회 시작일: 작업마다 시작일(개발 게시글 첫 날짜) · 작성일 중 이른 날, 그 가운데 가장 이른 날 */
export function earliestStart(works: { created: string; summary?: ErpPostSummary }[], fallback: string): string {
  const starts = works.flatMap((w) => [w.summary?.dates[0], w.summary?.created, w.created]).filter((d): d is string => !!d);
  return starts.length ? starts.sort()[0] : fallback;
}

// ---------------------------------------------------------------------------
// 붙여넣기용 표 (엑셀·웹에디터). 주간보고 양식과 같은 열·녹색 머리
// ---------------------------------------------------------------------------

const COLUMNS: { label: string; width: number; align: 'left' | 'right' | 'center' }[] = [
  { label: '담당자', width: 70, align: 'left' },
  { label: '진행상태', width: 90, align: 'left' },
  { label: '작업', width: 480, align: 'left' },
  { label: '시작일자', width: 95, align: 'right' },
  { label: '종료예정일', width: 175, align: 'right' },
  { label: '누적시간', width: 85, align: 'right' },
  { label: '비고', width: 420, align: 'left' },
];
const BLANK_ROWS = 2;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch);

const rowCells = (row: ReportRow | null, owner: string, index: number) =>
  row
    ? [index === 0 ? owner : '', row.status, row.task, row.start_date, row.end_date, row.total, row.note]
    : ['', '', '', '', '', '', ''];

export function generateReportHtml(rows: ReportRow[], owner: string): string {
  const cell = 'border: 1px solid #000000; padding: 2px 4px; font-size: 10pt; white-space: nowrap; vertical-align: middle;';
  const head = `${cell} background-color: #a9d08e; font-weight: 700; text-align: center;`;
  let html = '<table cellspacing="0" cellpadding="0" style="border-collapse: collapse; table-layout: fixed;">';
  html += `<colgroup>${COLUMNS.map((c) => `<col style="width: ${c.width}px;">`).join('')}</colgroup>`;
  html += `<tr>${COLUMNS.map((c) => `<td bgcolor="#a9d08e" style="${head}">${c.label}</td>`).join('')}</tr>`;
  const all = [...rows, ...Array<null>(BLANK_ROWS).fill(null)];
  all.forEach((row, i) => {
    const cells = rowCells(row, owner, i);
    html += `<tr>${cells
      .map((v, c) => `<td style="${cell} text-align: ${COLUMNS[c].align};">${v ? escapeHtml(v) : '&nbsp;'}</td>`)
      .join('')}</tr>`;
  });
  return html + '</table>';
}

/** 메모장 붙여넣기용 탭 구분 텍스트 */
export function generateReportTsv(rows: ReportRow[], owner: string): string {
  return [COLUMNS.map((c) => c.label), ...rows.map((r, i) => rowCells(r, owner, i))].map((cells) => cells.join('\t')).join('\n');
}

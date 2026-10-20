import type { TimerLog } from '../store/useTimerStore';
import type { Project } from '../store/useProjectStore';
import type { DeployEvent } from '../store/useDeployCalendarStore';
import { getDurationSecondsExcludingLunch } from './timeUtils';
import { addDays, formatDateToString } from './calendar_export';

// 주간 진행 현황표: 프로젝트(잡)마다 한 줄. 주간보고에 붙여넣는 표.
// 자동값은 일간 기록·배포 캘린더·시간관리 표에서 만들고, 손으로 고친 값이 있으면 그것을 쓴다.

export const REPORT_STATUSES = ['배포완료', '배포대기', '테스트', '진행중', '진행예정', '보류'] as const;

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

/** 초 → "HH:MM" (100시간 넘으면 그대로 늘어남) */
export function formatHourMinute(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

const is_deploy = (status: string) => /수시|카나리|스테이지|stage|login8|back/i.test(status);
const is_test = (status: string) => /테스트/.test(status);

/** 배포 캘린더 진행상태 → 비고에 쓸 말 */
function deployLabel(status: string): string {
  if (/^수시$/.test(status.trim())) return '수시배포';
  if (/카나리/.test(status)) return '카나리배포';
  if (/^스테이지$/.test(status.trim())) return '스테이지배포';
  return status.trim();
}

/** 기준일(금요일) 뒤 며칠까지를 "예정"으로 볼지. 다음 주 금요일까지 */
const LOOKAHEAD_DAYS = 7;

const shiftDate = (date_str: string, days: number) => {
  const [y, m, d] = date_str.split('-').map(Number);
  return formatDateToString(addDays(new Date(y, m - 1, d), days));
};

/**
 * 배포 캘린더로 진행상태·비고를 정한다. 기준일은 그 주 금요일.
 * - 다음 주 안에 잡힌 일정이 있으면: 배포대기(또는 테스트) + "10/19(월) 수시배포 예정"
 * - 이번 주 안에 마지막 일정이 수시면: 배포완료 + "10/15(목) 수시배포"
 * - 이번 주 안에 스테이지·카나리면 배포대기, 테스트면 테스트
 * - 그 밖에는 진행중 (비고 없음)
 */
export function deriveStatus(
  events: DeployEvent[],
  week_start_str: string,
  ref_str: string
): { status: string; note: string } {
  const sorted = [...events].filter((e) => !e.is_holiday && e.status).sort((a, b) => a.date.localeCompare(b.date));
  const limit = shiftDate(ref_str, LOOKAHEAD_DAYS);
  const future = sorted.find((e) => e.date > ref_str && e.date <= limit);
  if (future) {
    return {
      status: is_test(future.status) && !is_deploy(future.status) ? '테스트' : '배포대기',
      note: `${formatMonthDay(future.date)} ${deployLabel(future.status)} 예정`,
    };
  }
  const past = [...sorted].reverse().find((e) => e.date <= ref_str && e.date >= week_start_str);
  if (!past) return { status: '진행중', note: '' };
  const note = `${formatMonthDay(past.date)} ${deployLabel(past.status)}`;
  if (/수시/.test(past.status) && !/back|취소/i.test(past.status)) return { status: '배포완료', note };
  if (is_deploy(past.status)) return { status: '배포대기', note };
  if (is_test(past.status)) return { status: '테스트', note };
  return { status: '진행중', note };
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

const status_rank = (status: string) => {
  const i = (REPORT_STATUSES as readonly string[]).indexOf(status);
  return i === -1 ? REPORT_STATUSES.length : i;
};

export function buildWeeklyReport(input: BuildReportInput): ReportRow[] {
  const { week_start, logs, projects, events, tm_rows, excluded_codes, project_overrides, week_overrides, extras } = input;
  const now = input.now ?? Date.now();
  const ws = new Date(week_start);
  ws.setHours(0, 0, 0, 0);
  const we = addDays(ws, 7).getTime(); // 다음 주 월요일 0시
  const ws_str = formatDateToString(ws);
  const ref_str = formatDateToString(addDays(ws, 4)); // 금요일
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
    if (e.date >= ws_str && e.date <= shiftDate(ref_str, LOOKAHEAD_DAYS)) keys.add(e.job_code);
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
    const auto = deriveStatus(project_events, ws_str, ref_str);

    rows.push({
      key,
      status: wo.status ?? auto.status,
      task: po.task ?? auto_task,
      start_date: po.start_date ?? (Number.isFinite(first) ? formatDateToString(new Date(first)) : ''),
      end_date: po.end_date ?? end_dates[end_dates.length - 1] ?? '',
      total: seconds > 0 ? formatHourMinute(seconds) : '',
      note: wo.note ?? auto.note,
      manual: false,
      edited: [po.task, po.start_date, po.end_date, wo.status, wo.note].some((v) => v !== undefined),
    });
  });

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

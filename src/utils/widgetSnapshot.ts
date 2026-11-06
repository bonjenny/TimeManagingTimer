import { useDeployCalendarStore } from '../store/useDeployCalendarStore';
import type { DeployEvent, JobColor, StoredAttendance } from '../store/useDeployCalendarStore';
import type { AttendanceTarget } from './erpAttendance';
import { KR_HOLIDAYS } from '../constants/krHolidays';
import { writeToBackupDirectory } from './backupDirectory';

// 바탕화면 캘린더 위젯(desktop-widget, Electron)에 넘길 캘린더 스냅숏.
// 위젯은 브라우저와 저장소가 달라 이 앱 데이터를 직접 못 읽는다 → 자동 백업 폴더에 이 파일을 써 두면 위젯이 지켜보다 그린다.
// 캘린더 값이 바뀔 때마다(1.5초 모아서) 쓴다. 백업 폴더가 없거나 권한이 없으면 조용히 건너뛴다

export const WIDGET_SNAPSHOT_FILE = 'timekeeper-calendar-widget.json';

export interface WidgetSnapshot {
  version: 1;
  updated_at: number;
  show_today: boolean;
  /** 일정 칩: 날짜 · 글자 · 잡 색. 휴일 이벤트는 빨간 글씨 */
  events: { date: string; text: string; color?: string; holiday?: boolean }[];
  /** 근태 칩 (캘린더에서 근태를 켜 둔 경우만) */
  attendance: { date: string; text: string }[];
  /** 공휴일 이름 */
  holidays: Record<string, string>;
}

interface SnapshotSource {
  events: DeployEvent[];
  job_colors: JobColor[];
  show_today: boolean;
  show_attendance: boolean;
  attendance_targets: AttendanceTarget[];
  attendance_records: StoredAttendance[];
}

export function buildWidgetSnapshot(s: SnapshotSource, now = Date.now()): WidgetSnapshot {
  const color_of = new Map(s.job_colors.map((c) => [c.job_code, c.color]));
  // 캘린더 화면과 같게: 고른 대상의 근태만, 부서와 그 사람이 겹치면 하나만
  const keys = new Set(s.attendance_targets.map((t) => `${t.type}:${t.code}`));
  const seen = new Set<string>();
  const attendance = s.show_attendance
    ? s.attendance_records
        .filter((a) => {
          const k = `${a.emp_cd}|${a.date}|${a.kind}|${a.label}`;
          if (!keys.has(a.target) || seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .map((a) => ({ date: a.date, text: `${a.name} ${a.label}` }))
    : [];
  return {
    version: 1,
    updated_at: now,
    show_today: s.show_today,
    events: s.events.map((e) => ({
      date: e.date,
      text: e.is_holiday || !e.status ? e.job_name : `${e.job_name} ${e.status}`,
      ...(e.is_holiday ? { holiday: true } : { color: color_of.get(e.job_code) }),
    })),
    attendance,
    holidays: KR_HOLIDAYS,
  };
}

let timer: number | undefined;
let last_written = '';

/** 앱을 켤 때 한 번 부른다. 지금 값을 쓰고, 캘린더 값이 바뀔 때마다 다시 쓴다 */
export function startWidgetSnapshot(): () => void {
  const write = () => {
    const snap = buildWidgetSnapshot(useDeployCalendarStore.getState());
    const content = JSON.stringify({ ...snap, updated_at: 0 });
    if (content === last_written) return; // 바뀐 게 없으면 안 쓴다
    // 써졌을 때만 기억한다 (폴더 권한이 아직 없으면 다음 변경 때 다시 시도)
    void writeToBackupDirectory(WIDGET_SNAPSHOT_FILE, JSON.stringify(snap)).then((ok) => {
      if (ok) last_written = content;
    });
  };
  write();
  const unsubscribe = useDeployCalendarStore.subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(write, 1500);
  });
  return () => {
    unsubscribe();
    window.clearTimeout(timer);
  };
}

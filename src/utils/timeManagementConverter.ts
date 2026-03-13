import { v4 as uuidv4 } from 'uuid';
import { TimerLog } from '../store/useTimerStore';
import { TimeManagementRow } from '../store/useTimeManagementStore';
import { getCategoryCode } from '../constants/categoryCodeMap';

interface GroupedTask {
  title: string;
  projectCode?: string;
  category?: string;
  note?: string;
  total_minutes: number;
  original_log_ids: string[];
  is_preset: boolean;
}

export function convertLogsToTimeManagement(
  logs: TimerLog[],
  date: string,
  default_work_type: string = '작업',
  category_work_type_map: Record<string, string> = {},
  project_work_type_map: Record<string, string> = {}
): TimeManagementRow[] {
  const filtered_logs = logs.filter((log) => {
    if (!log.endTime) return false;
    const log_date = new Date(log.startTime);
    const target_date = new Date(date);
    return (
      log_date.getFullYear() === target_date.getFullYear() &&
      log_date.getMonth() === target_date.getMonth() &&
      log_date.getDate() === target_date.getDate()
    );
  });

  const grouped_map = new Map<string, GroupedTask>();

  filtered_logs.forEach((log) => {
    const duration_ms = (log.endTime || 0) - log.startTime;
    const paused_ms = (log.pausedDuration || 0) * 1000;
    const actual_duration_ms = duration_ms - paused_ms;
    const time_minutes = Math.round(actual_duration_ms / 60000);

    const existing = grouped_map.get(log.title);
    const is_from_preset = !!log.dailyGroupKey;

    if (existing) {
      existing.total_minutes += time_minutes > 0 ? time_minutes : 0;
      existing.original_log_ids.push(log.id);
      if (log.projectCode) existing.projectCode = log.projectCode;
      if (log.category) existing.category = log.category;
      if (log.note) existing.note = log.note;
      if (is_from_preset) existing.is_preset = true;
    } else {
      grouped_map.set(log.title, {
        title: log.title,
        projectCode: log.projectCode,
        category: log.category,
        note: log.note,
        total_minutes: time_minutes > 0 ? time_minutes : 0,
        original_log_ids: [log.id],
        is_preset: is_from_preset,
      });
    }
  });

  return Array.from(grouped_map.values()).map((group) => {
    const category_code = group.category ? getCategoryCode(group.category) : '9999';
    
    let work_type: string;
    if (group.is_preset) {
      work_type = '작업';
    } else if (group.projectCode && project_work_type_map[group.projectCode]) {
      work_type = project_work_type_map[group.projectCode];
    } else if (group.category && category_work_type_map[group.category]) {
      work_type = category_work_type_map[group.category];
    } else {
      work_type = default_work_type;
    }

    return {
      id: uuidv4(),
      checked: false,
      project_name: group.projectCode || '',
      work_type: work_type,
      schedule_name: group.title || '',
      category_code: category_code,
      category_name: group.category || '기타',
      time_minutes: group.total_minutes,
      note: group.note || '',
      date: date,
      original_log_id: group.original_log_ids[0],
    };
  });
}

export function mergeTimeManagementRows(
  existing: TimeManagementRow[],
  converted: TimeManagementRow[]
): TimeManagementRow[] {
  const existing_log_ids = new Set(
    existing.map((row) => row.original_log_id).filter(Boolean)
  );

  const new_rows = converted.filter(
    (row) => !row.original_log_id || !existing_log_ids.has(row.original_log_id)
  );

  return [...existing, ...new_rows];
}

export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

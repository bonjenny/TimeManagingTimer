/**
 * 주간일정 HTML 복사용 유틸 (잡 라벨 색상·bold, ecount 호환)
 */

export const DEFAULT_JOB_COLOR = '#e5e7eb';

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

function formatTimeHHMM(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export interface ProjectGroupForHtml {
  projectCode: string;
  projectName: string;
  status: 'completed' | 'in_progress';
  startDate: string;
  totalSeconds: number;
  cumulativeSeconds: number;
  tasks: { title: string; seconds: number; cumulativeSeconds: number }[];
}

export interface DayDataForHtml {
  dateKey: string;
  projects: ProjectGroupForHtml[];
}

export function generateWeeklyScheduleHtml(
  days: DayDataForHtml[],
  statusOverrides: Record<string, 'completed' | 'in_progress'>,
  getJobColor: (projectCode: string) => string | undefined,
  getStatusLabel: (status: 'completed' | 'in_progress') => string,
  getDisplayProjectName: (project: ProjectGroupForHtml) => string,
  timeDisplayMode: 'cumulative' | 'daily' = 'cumulative'
): string {
  const time_label = timeDisplayMode === 'daily' ? '' : '누적시간';
  const fmt = (seconds: number) => time_label ? `${time_label}: ${formatTimeHHMM(seconds)}` : formatTimeHHMM(seconds);
  const parts: string[] = [];
  days.forEach((day) => {
    day.projects.forEach((project) => {
      const projectKey = `${day.dateKey}-${project.projectCode}`;
      const status = statusOverrides[projectKey] || project.status;
      const statusText = getStatusLabel(status);
      const displayName = getDisplayProjectName(project);
      const nameSection = displayName ? ` ${escapeHtml(displayName)}` : '';
      const bgHex = getJobColor(project.projectCode) || DEFAULT_JOB_COLOR;
      const project_time = timeDisplayMode === 'daily' ? project.totalSeconds : project.cumulativeSeconds;
      const labelHtml =
        `<span style="font-weight: bold; font-size: 13px; background-color: ${bgHex}; color: #000000;">[${escapeHtml(project.projectCode)}]${nameSection}</span>`;
      const metaHtml =
        `<span style="font-size: 13px;">(진행상태: ${escapeHtml(statusText)}, 시작일자: ${escapeHtml(project.startDate)}, ${fmt(project_time)})</span>`;
      parts.push(labelHtml + metaHtml);
      project.tasks.forEach((task) => {
        const task_time = timeDisplayMode === 'daily' ? task.seconds : task.cumulativeSeconds;
        parts.push(
          `&nbsp;&nbsp;· ${escapeHtml(task.title)} (${fmt(task_time)})<br>`
        );
      });
      parts.push('<br>');
    });
  });
  return parts.join('');
}

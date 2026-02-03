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
  cumulativeSeconds: number;
  tasks: { title: string; cumulativeSeconds: number }[];
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
  getDisplayProjectName: (project: ProjectGroupForHtml) => string
): string {
  const parts: string[] = [];
  days.forEach((day) => {
    day.projects.forEach((project) => {
      const projectKey = `${day.dateKey}-${project.projectCode}`;
      const status = statusOverrides[projectKey] || project.status;
      const statusText = getStatusLabel(status);
      const displayName = getDisplayProjectName(project);
      const nameSection = displayName ? ` ${escapeHtml(displayName)}` : '';
      const bgHex = getJobColor(project.projectCode) || DEFAULT_JOB_COLOR;
      const labelHtml =
        `<span style="font-weight: bold; font-size: 13px; background-color: ${bgHex}; color: #000000;">[${escapeHtml(project.projectCode)}]${nameSection}</span>`;
      const metaHtml =
        `<span style="font-size: 13px;">(진행상태: ${escapeHtml(statusText)}, 시작일자: ${escapeHtml(project.startDate)}, 누적시간: ${formatTimeHHMM(project.cumulativeSeconds)})</span>`;
      parts.push(labelHtml + metaHtml);
      project.tasks.forEach((task) => {
        parts.push(
          `&nbsp;&nbsp;· ${escapeHtml(task.title)} (누적시간: ${formatTimeHHMM(task.cumulativeSeconds)})<br>`
        );
      });
      parts.push('<br>');
    });
  });
  return parts.join('');
}

import { DeployEvent, JobColor } from '../store/useDeployCalendarStore';

// ----------------------------------------------------------------------
// 날짜 유틸리티
// ----------------------------------------------------------------------

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * Date를 "YYYY-MM-DD" 형식으로 변환
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Date를 "M/D(요일)" 형식으로 변환
 */
export function formatDateToDisplay(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const day_name = DAY_NAMES[date.getDay()];
  return `${month}/${day}(${day_name})`;
}

/**
 * 주어진 날짜가 속한 주의 월요일 반환
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 날짜에 일수를 더함
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ----------------------------------------------------------------------
// HTML 테이블 생성 (ecount 웹에디터 호환, 열 너비 유지 + 잡 색상 인라인 적용)
// ----------------------------------------------------------------------

/** 테이블 전체 너비(px). colgroup과 동일하게 사용 */
const TABLE_WIDTH_PX = 835;
/** 열 수 (월~금) */
const COL_COUNT = 5;
/** 열당 고정 너비(px) */
const COL_WIDTH_PX = Math.floor(TABLE_WIDTH_PX / COL_COUNT);

interface GenerateHtmlOptions {
  events: DeployEvent[];
  job_colors: JobColor[];
  start_date: Date;
  weeks: number;
}

/**
 * 잡 코드로 색상 조회 (항상 hex 반환)
 */
function getColorForJob(job_code: string, job_colors: JobColor[]): string {
  const found = job_colors.find(jc => jc.job_code === job_code);
  return found?.color || '#e5e7eb';
}

/**
 * 캘린더를 HTML 테이블로 생성 (첨부 이미지와 동일한 비주얼).
 * - 전체 그리드: 얇은 회색 테두리 + 둥근 모서리
 * - 날짜 헤더: 옅은 회색 배경(#f3f4f6), 가운데 정렬
 * - 라벨: 둥근 모서리, 텍스트와 박스 가장자리 사이 패딩, 말줄임표
 */
export function generateCalendarHtml(options: GenerateHtmlOptions): string {
  const { events, job_colors, start_date, weeks } = options;
  const monday = getMonday(start_date);

  // 날짜 헤더: 옅은 회색 배경, 가운데 정렬, 명시적 높이
  const header_row_height_px = 36;
  const header_style = [
    'background-color: #f3f4f6',
    'border: 1px solid #e5e7eb',
    'text-align: center',
    'font-weight: 600',
    'font-size: 13px',
    'padding: 12px 10px',
    'height: ' + header_row_height_px + 'px',
    'color: #000000',
  ].join('; ');

  // 바디 셀: 칸과 라벨 사이 여백, 명시적 최소 높이
  const body_cell_min_height_px = 72;
  const cell_style = [
    'border: 1px solid #e5e7eb',
    'padding: 10px 12px',
    'vertical-align: top',
    'font-size: 13px',
    'color: #000000',
    'background-color: #ffffff',
    'min-height: ' + body_cell_min_height_px + 'px',
    'height: ' + body_cell_min_height_px + 'px',
  ].join('; ');

  const table_style = [
    'border-collapse: collapse',
    'border-spacing: 0',
    'table-layout: fixed',
    'width: ' + TABLE_WIDTH_PX + 'px',
    'font-size: 13px',
    'font-weight: 400',
    'text-align: left',
    'border: 0',
  ].join('; ');

  // 라벨 공통: 둥근 모서리, 말줄임표, 텍스트와 박스 가장자리 사이 패딩
  const chip_base = [
    'padding: 8px 12px 10px 12px',
    'font-size: 13px',
    'color: #000000',
    'border: 0',
    'border-radius: 6px',
    'max-width: 100%',
    'overflow: hidden',
    'text-overflow: ellipsis',
    'white-space: nowrap',
    'box-sizing: border-box',
  ].join('; ');

  let html = '<div style="font-size: 13px; font-weight: 400; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">';
  html += `<table cellspacing="0" cellpadding="0" style="${table_style}">`;
  html += '<colgroup>';
  for (let i = 0; i < COL_COUNT; i++) {
    html += `<col style="width: ${COL_WIDTH_PX}px;">`;
  }
  html += '</colgroup>';
  html += '<thead style="border: 0;">';

  for (let week = 0; week < weeks; week++) {
    html += '<tr>';
    for (let day = 0; day < COL_COUNT; day++) {
      const current_date = addDays(monday, week * 7 + day);
      const date_str = formatDateToDisplay(current_date);
      html += `<td style="${header_style}">${date_str}</td>`;
    }
    html += '</tr>';
    html += '<tr>';
    for (let day = 0; day < COL_COUNT; day++) {
      const current_date = addDays(monday, week * 7 + day);
      const date_key = formatDateToString(current_date);
      const day_events = events.filter(e => e.date === date_key);

      html += `<td style="${cell_style}">`;
      if (day_events.length === 0) {
        html += '&nbsp;';
      } else {
        const inner_table_style = 'border: 0; border-collapse: separate; border-spacing: 6px 6px; width: 100%;';
        html += '<div style="padding: 0 12px;">';
        html += `<table cellspacing="0" cellpadding="0" border="0" style="${inner_table_style}">`;
        day_events.forEach((event) => {
          if (event.is_holiday) {
            html += `<tr><td style="${chip_base} text-align: center; color: #ca3626;"><div style="text-align: center;">${escapeHtml(event.job_name)}</div></td></tr>`;
          } else {
            const bg_hex = getColorForJob(event.job_code, job_colors);
            const display_text = event.status
              ? `${event.job_name} ${event.status}`
              : event.job_name;
            html += `<tr><td bgcolor="${bg_hex}" style="background-color: ${bg_hex}; ${chip_base}">${escapeHtml(display_text)}</td></tr>`;
          }
        });
        html += '</table>';
        html += '</div>';
      }
      html += '</td>';
    }
    html += '</tr>';
  }

  html += '</thead>';
  html += '<tbody style="border: 0;"></tbody>';
  html += '</table>';
  html += '</div>';
  return html;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

// ----------------------------------------------------------------------
// 클립보드 복사
// ----------------------------------------------------------------------

/**
 * HTML을 클립보드에 복사 (웹에디터 붙여넣기용)
 */
export async function copyHtmlToClipboard(html: string): Promise<boolean> {
  try {
    // ClipboardItem API 사용 (HTML 형식 유지)
    const blob = new Blob([html], { type: 'text/html' });
    const item = new ClipboardItem({ 'text/html': blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (error) {
    console.error('Failed to copy HTML to clipboard:', error);
    
    // 폴백: 텍스트로 복사
    try {
      await navigator.clipboard.writeText(html);
      return true;
    } catch {
      return false;
    }
  }
}

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
// HTML 테이블 생성
// ----------------------------------------------------------------------

interface GenerateHtmlOptions {
  events: DeployEvent[];
  job_colors: JobColor[];
  start_date: Date;
  weeks: number;
}

/**
 * 잡 코드로 색상 조회
 */
function getColorForJob(job_code: string, job_colors: JobColor[]): string {
  const found = job_colors.find(jc => jc.job_code === job_code);
  return found?.color || '#e0e0e0';
}

/**
 * 캘린더를 HTML 테이블로 생성 (ecount 웹에디터 호환)
 */
export function generateCalendarHtml(options: GenerateHtmlOptions): string {
  const { events, job_colors, start_date, weeks } = options;
  
  // 시작일을 월요일로 맞춤
  const monday = getMonday(start_date);
  
  // 헤더 스타일
  const header_style = `
    background-color: rgb(210, 197, 193);
    text-align: center;
    font-weight: bold;
    font-size: 13px;
    border: 1px solid rgb(0, 0, 0);
    padding: 6px;
  `.replace(/\s+/g, ' ').trim();
  
  // 셀 스타일
  const cell_style = `
    border: 1px solid rgb(0, 0, 0);
    padding: 6px;
    vertical-align: top;
    font-size: 13px;
  `.replace(/\s+/g, ' ').trim();
  
  let html = `<table border="2" cellspacing="0" cellpadding="6" style="border-collapse: collapse; border-spacing: 0px; font-size: 13px; table-layout: fixed;">`;
  
  for (let week = 0; week < weeks; week++) {
    // 헤더 행 (날짜)
    html += '<tr>';
    for (let day = 0; day < 5; day++) { // 월~금
      const current_date = addDays(monday, week * 7 + day);
      const date_str = formatDateToDisplay(current_date);
      html += `<td style="${header_style}">${date_str}</td>`;
    }
    html += '</tr>';
    
    // 데이터 행 (이벤트)
    html += '<tr>';
    for (let day = 0; day < 5; day++) {
      const current_date = addDays(monday, week * 7 + day);
      const date_key = formatDateToString(current_date);
      const day_events = events.filter(e => e.date === date_key);
      
      html += `<td style="${cell_style}">`;
      
      if (day_events.length === 0) {
        html += '&nbsp;';
      } else {
        const event_htmls = day_events.map(event => {
          if (event.is_holiday) {
            // 휴일: 빨간색 텍스트, 가운데 정렬
            return `<div style="text-align: center; color: #ca3626;">${event.job_name}</div>`;
          } else {
            // 일반 이벤트: 배경색 적용
            const bg_color = getColorForJob(event.job_code, job_colors);
            const display_text = event.status 
              ? `${event.job_name} ${event.status}`
              : event.job_name;
            return `<span style="background-color: ${bg_color}; color: #000000; padding: 2px 4px;">${display_text}</span>`;
          }
        });
        html += event_htmls.join('<br>');
      }
      
      html += '</td>';
    }
    html += '</tr>';
  }
  
  html += '</table>';
  
  return html;
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

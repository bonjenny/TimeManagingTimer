// 설정 저장 키
const SETTINGS_STORAGE_KEY = 'timekeeper-settings';

// 기본 점심시간 설정
const DEFAULT_LUNCH_START = '12:00';
const DEFAULT_LUNCH_END = '13:00';

/**
 * 점심시간 설정 로드
 */
export interface LunchTimeSettings {
  start: string; // HH:MM 형식
  end: string;   // HH:MM 형식
  exclude_enabled: boolean;
}

export const loadLunchTimeSettings = (): LunchTimeSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const settings = JSON.parse(saved);
      return {
        start: settings.lunchStart || DEFAULT_LUNCH_START,
        end: settings.lunchEnd || DEFAULT_LUNCH_END,
        exclude_enabled: settings.lunchExcludeEnabled ?? true, // 기본값: 활성화
      };
    }
  } catch {
    // 무시
  }
  return {
    start: DEFAULT_LUNCH_START,
    end: DEFAULT_LUNCH_END,
    exclude_enabled: true,
  };
};

/**
 * 시간 문자열(HH:MM)을 해당 날짜의 타임스탬프로 변환
 */
const timeStringToTimestamp = (time_str: string, date: Date): number => {
  const [hours, minutes] = time_str.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result.getTime();
};

/**
 * 두 시간 범위의 겹치는 구간 계산 (밀리초)
 */
const calculateOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): number => {
  const overlap_start = Math.max(start1, start2);
  const overlap_end = Math.min(end1, end2);
  return Math.max(0, overlap_end - overlap_start);
};

/**
 * 작업 시간에서 점심시간을 제외한 실제 소요 시간 계산 (밀리초)
 * @param start_time 작업 시작 타임스탬프
 * @param end_time 작업 종료 타임스탬프 (없으면 현재 시간)
 * @param lunch_settings 점심시간 설정 (없으면 자동 로드)
 */
export const calculateDurationExcludingLunch = (
  start_time: number,
  end_time?: number,
  lunch_settings?: LunchTimeSettings
): number => {
  const actual_end = end_time || Date.now();
  const total_duration = actual_end - start_time;

  // 점심시간 설정 로드
  const settings = lunch_settings || loadLunchTimeSettings();
  
  // 점심시간 제외가 비활성화된 경우
  if (!settings.exclude_enabled) {
    return total_duration;
  }

  // 작업 시작 날짜 기준으로 점심시간 계산
  const start_date = new Date(start_time);
  const lunch_start = timeStringToTimestamp(settings.start, start_date);
  const lunch_end = timeStringToTimestamp(settings.end, start_date);

  // 점심시간과 작업 시간의 겹침 계산
  const overlap = calculateOverlap(start_time, actual_end, lunch_start, lunch_end);

  // 작업이 여러 날에 걸쳐 있는 경우 (드물지만 처리)
  // 간단히 하루 단위만 계산 (자정을 넘기는 경우 점심시간은 시작 날짜 기준)
  
  return Math.max(0, total_duration - overlap);
};

/**
 * 초 단위로 점심시간 제외된 소요 시간 반환
 */
export const getDurationSecondsExcludingLunch = (
  start_time: number,
  end_time?: number,
  paused_duration: number = 0
): number => {
  const duration_ms = calculateDurationExcludingLunch(start_time, end_time);
  const durationSec = duration_ms / 1000;
  // pausedDuration이 전체 duration보다 크면 비정상 데이터로 간주하여 무시
  const safePaused = paused_duration > durationSec ? 0 : paused_duration;
  return Math.max(0, Math.floor(durationSec - safePaused));
};

// 초 단위 시간을 받아서 "80분 / 01:20 시간" 형식의 문자열로 반환
export const formatDuration = (seconds: number): string => {
  const validSeconds = Math.max(0, Math.floor(seconds));
  
  const minutes = Math.floor(validSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  // HH:MM 형식 (01:20)
  const hh = hours.toString().padStart(2, '0');
  const mm = remainingMinutes.toString().padStart(2, '0');

  // "80분 / 01:20 시간"
  return `${minutes}분 / ${hh}:${mm} 시간`;
};

// HH:MM 형식 (큰 디스플레이용)
export const formatTimeDisplay = (seconds: number): string => {
  const validSeconds = Math.max(0, Math.floor(seconds));
  
  const hours = Math.floor(validSeconds / 3600);
  const minutes = Math.floor((validSeconds % 3600) / 60);

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');

  return `${hh}:${mm}`;
};

export const formatTimeRange = (startTime: number, endTime?: number): string => {
  const start = new Date(startTime);
  const startStr = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  if (!endTime) return `${startStr} ~ 진행 중`;

  const end = new Date(endTime);
  const endStr = end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  return `${startStr} ~ ${endStr}`;
};

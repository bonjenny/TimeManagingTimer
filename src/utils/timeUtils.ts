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

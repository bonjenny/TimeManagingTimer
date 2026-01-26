import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Chip
} from '@mui/material';
import { useTimerStore, TimerLog } from '../../store/useTimerStore';
import { formatTimeRange, formatDuration } from '../../utils/timeUtils';

// 리사이즈 핸들 너비
const RESIZE_HANDLE_WIDTH = 8;

// 24시간 = 1440분
const TOTAL_MINUTES = 1440;
// 시작 시간: 06:00
const START_HOUR = 6;
// 행 높이
const ROW_HEIGHT = 32;
// 행 간격
const ROW_GAP = 4;
// 헤더 높이 (시간축 라벨)
const HEADER_HEIGHT = 24;
// 왼쪽 라벨 너비
const LABEL_WIDTH = 180;

const CATEGORIES = ['분석', '개발', '개발자테스트', '테스트오류수정', '센터오류수정', '환경세팅', '회의', '기타'];

// 카테고리별 색상
const CATEGORY_COLORS: Record<string, string> = {
  '분석': '#3b82f6',      // 파랑
  '개발': '#10b981',      // 초록
  '개발자테스트': '#8b5cf6', // 보라
  '테스트오류수정': '#ef4444', // 빨강
  '센터오류수정': '#f97316',  // 주황
  '환경세팅': '#06b6d4',   // 청록
  '회의': '#eab308',       // 노랑
  '기타': '#6b7280',       // 회색
  'default': '#000000',    // 기본 검정
};

const GanttChart: React.FC = () => {
  const { logs, activeTimer, addLog, updateLog } = useTimerStore();

  // 실시간 업데이트를 위한 현재 시간 상태 (1초마다 갱신)
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // 1초마다 업데이트

    return () => clearInterval(interval);
  }, []);

  // 드래그 상태 관리 (새 작업 생성용)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPercent, setDragStartPercent] = useState<number | null>(null);
  const [dragCurrentPercent, setDragCurrentPercent] = useState<number | null>(null);
  const [dragRowIndex, setDragRowIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 리사이즈 상태 관리
  const [isResizing, setIsResizing] = useState(false);
  const [resizeLogId, setResizeLogId] = useState<string | null>(null);
  const [resizeType, setResizeType] = useState<'start' | 'end' | null>(null);
  const [resizeStartPercent, setResizeStartPercent] = useState<number | null>(null);
  const [resizeCurrentPercent, setResizeCurrentPercent] = useState<number | null>(null);
  const [resizeOriginalStart, setResizeOriginalStart] = useState<number>(0);
  const [resizeOriginalEnd, setResizeOriginalEnd] = useState<number>(0);

  // 드래그 생성 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLogStart, setNewLogStart] = useState<number>(0);
  const [newLogEnd, setNewLogEnd] = useState<number>(0);
  const [newTitle, setNewTitle] = useState('');
  const [newBoardNo, setNewBoardNo] = useState('');
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [isAddingSession, setIsAddingSession] = useState(false); // 기존 작업에 세션 추가 여부
  const [isHoveringBar, setIsHoveringBar] = useState(false); // 작업 막대 hover 상태

  // 오늘 날짜의 06:00 기준 시작 시간
  const getTodayBaseTime = () => {
    const now = new Date();
    const base = new Date(now);
    base.setHours(START_HOUR, 0, 0, 0);

    // 현재 시간이 06:00 이전이면 어제 06:00을 기준으로
    if (now.getHours() < START_HOUR) {
      base.setDate(base.getDate() - 1);
    }
    return base.getTime();
  };

  // 오늘의 로그만 필터링 (06:00 ~ 익일 06:00)
  const todayLogs = useMemo(() => {
    const base_time = getTodayBaseTime();
    const end_time = base_time + TOTAL_MINUTES * 60 * 1000;

    let filtered_logs = logs.filter(log => {
      return log.startTime >= base_time && log.startTime < end_time;
    });

    if (activeTimer) {
      filtered_logs = [...filtered_logs, activeTimer];
    }

    // 시작 시간순 정렬
    return filtered_logs.sort((a, b) => a.startTime - b.startTime);
  }, [logs, activeTimer]);

  // 06:00 기준 오프셋 계산 (분 단위)
  const getOffsetMinutes = (timestamp: number) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes();

    // 06:00 이전이면(예: 01:00) 24시간을 더해서 계산 (익일 새벽)
    if (hours < START_HOUR) {
      hours += 24;
    }

    return (hours - START_HOUR) * 60 + minutes;
  };

  // 너비 계산 (분 단위) - 실시간 업데이트를 위해 currentTime 사용
  const getWidthMinutes = (start: number, end?: number) => {
    const end_time = end || currentTime;
    return (end_time - start) / 1000 / 60; // 분
  };

  // 제목별로 그룹화하여 같은 제목은 같은 행에 표시
  const { chartItems, uniqueRows } = useMemo(() => {
    // 1. 제목별로 그룹화하고 row_index 할당
    const title_to_row_index = new Map<string, number>();
    const rows: { title: string; boardNo?: string; category?: string; color: string }[] = [];

    todayLogs.forEach(log => {
      if (!title_to_row_index.has(log.title)) {
        const row_index = rows.length;
        title_to_row_index.set(log.title, row_index);
        const color = log.category ? (CATEGORY_COLORS[log.category] || CATEGORY_COLORS['default']) : CATEGORY_COLORS['default'];
        rows.push({
          title: log.title,
          boardNo: log.boardNo,
          category: log.category,
          color
        });
      }
    });

    // 2. 각 로그에 row_index와 위치 정보 추가
    const items = todayLogs.map(log => {
      const start_offset = getOffsetMinutes(log.startTime);
      let width = getWidthMinutes(log.startTime, log.endTime);

      // 최소 너비 (5분)
      if (width < 5) width = 5;

      // 전체 1440분 중 비율 (%)
      const left_percent = (start_offset / TOTAL_MINUTES) * 100;
      const width_percent = (width / TOTAL_MINUTES) * 100;

      // 색상 결정
      const color = log.category ? (CATEGORY_COLORS[log.category] || CATEGORY_COLORS['default']) : CATEGORY_COLORS['default'];

      const row_index = title_to_row_index.get(log.title) ?? 0;

      return {
        ...log,
        row_index,
        left_percent,
        width_percent,
        color
      };
    });

    return { chartItems: items, uniqueRows: rows };
  }, [todayLogs, currentTime]);

  // 시간축 라벨 생성 (06, 08, 10 ... 04, 06)
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i <= 24; i += 2) {
      let hour = START_HOUR + i;
      const display_hour = hour >= 24 ? hour - 24 : hour;
      labels.push({
        label: `${display_hour.toString().padStart(2, '0')}:00`,
        left_percent: (i * 60 / TOTAL_MINUTES) * 100
      });
    }
    return labels;
  }, []);

  // 전체 차트 높이 계산 (고유 행 수 기준 + 드래그 여유 공간)
  const chart_height = Math.max(
    uniqueRows.length * (ROW_HEIGHT + ROW_GAP) + HEADER_HEIGHT + ROW_HEIGHT,
    100 // 최소 높이
  );

  // --- 드래그 핸들러 ---

  const getPercentFromEvent = (e: React.MouseEvent) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - LABEL_WIDTH;
    const width = rect.width - LABEL_WIDTH;
    return Math.min(Math.max((x / width) * 100, 0), 100);
  };

  const getRowFromEvent = (e: React.MouseEvent) => {
    if (!containerRef.current) return uniqueRows.length;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top - HEADER_HEIGHT;
    const row = Math.floor(y / (ROW_HEIGHT + ROW_GAP));
    // 음수(헤더 영역) 또는 기존 작업 행 범위 밖이면 새 작업 생성으로 처리
    if (row < 0 || row >= uniqueRows.length) {
      return uniqueRows.length; // uniqueRows.length는 새 작업 생성을 의미
    }
    return row;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const percent = getPercentFromEvent(e);
    const row = getRowFromEvent(e);

    // 왼쪽 라벨 영역이면 무시
    if (percent < 0) return;

    setIsDragging(true);
    setDragStartPercent(percent);
    setDragCurrentPercent(percent);
    setDragRowIndex(row);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragCurrentPercent(getPercentFromEvent(e));
  };

  const handleMouseUp = () => {
    if (!isDragging || dragStartPercent === null || dragCurrentPercent === null) return;

    setIsDragging(false);

    // 드래그 거리가 너무 짧으면 무시 (단순 클릭 방지)
    if (Math.abs(dragCurrentPercent - dragStartPercent) < 1) {
      setDragStartPercent(null);
      setDragCurrentPercent(null);
      setDragRowIndex(null);
      return;
    }

    // 시간 변환 로직
    const start_p = Math.min(dragStartPercent, dragCurrentPercent);
    const end_p = Math.max(dragStartPercent, dragCurrentPercent);

    // 퍼센트 -> 분 (0~1440)
    const start_minutes = (start_p / 100) * TOTAL_MINUTES;
    const end_minutes = (end_p / 100) * TOTAL_MINUTES;

    // 분 -> 실제 타임스탬프 (오늘 날짜 기준)
    const base_time = getTodayBaseTime();

    const start_time = base_time + start_minutes * 60 * 1000;
    const end_time = base_time + end_minutes * 60 * 1000;

    setNewLogStart(start_time);
    setNewLogEnd(end_time);

    // 기존 작업 행에 드래그한 경우: 해당 작업의 정보를 자동으로 채움
    if (dragRowIndex !== null && dragRowIndex < uniqueRows.length) {
      const existing_row = uniqueRows[dragRowIndex];
      setNewTitle(existing_row.title);
      setNewBoardNo(existing_row.boardNo || '');
      setNewCategory(existing_row.category || null);
      setIsAddingSession(true);
    } else {
      // 새 작업 생성
      setNewTitle('');
      setNewBoardNo('');
      setNewCategory(null);
      setIsAddingSession(false);
    }

    setShowCreateModal(true);

    // 상태 초기화는 모달 닫을 때
    setDragStartPercent(null);
    setDragCurrentPercent(null);
    setDragRowIndex(null);
  };

  const handleCreateSave = () => {
    if (!newTitle.trim()) return;

    const new_log: TimerLog = {
      id: crypto.randomUUID(),
      title: newTitle,
      boardNo: newBoardNo,
      category: newCategory || undefined,
      startTime: newLogStart,
      endTime: newLogEnd,
      status: 'COMPLETED',
      pausedDuration: 0
    };

    addLog(new_log);
    handleCreateClose();
  };

  const handleCreateClose = () => {
    setShowCreateModal(false);
    setNewTitle('');
    setNewBoardNo('');
    setNewCategory(null);
    setIsAddingSession(false);
  };

  // 현재 시간 위치 계산 (실시간 업데이트)
  const current_time_percent = (getOffsetMinutes(currentTime) / TOTAL_MINUTES) * 100;

  // --- 리사이즈 핸들러 ---
  
  // 퍼센트를 타임스탬프로 변환
  const percentToTimestamp = useCallback((percent: number) => {
    const base_time = getTodayBaseTime();
    const minutes = (percent / 100) * TOTAL_MINUTES;
    return base_time + minutes * 60 * 1000;
  }, []);

  // 리사이즈 시작
  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    log_id: string,
    type: 'start' | 'end',
    original_start: number,
    original_end: number | undefined
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    const percent = getPercentFromEvent(e);
    
    setIsResizing(true);
    setResizeLogId(log_id);
    setResizeType(type);
    setResizeStartPercent(percent);
    setResizeCurrentPercent(percent);
    setResizeOriginalStart(original_start);
    setResizeOriginalEnd(original_end || currentTime);
  }, [currentTime]);

  // 리사이즈 중 마우스 이동 (document 레벨)
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - LABEL_WIDTH;
      const width = rect.width - LABEL_WIDTH;
      const percent = Math.min(Math.max((x / width) * 100, 0), 100);
      setResizeCurrentPercent(percent);
    };

    const handleMouseUp = () => {
      if (resizeLogId && resizeType && resizeStartPercent !== null && resizeCurrentPercent !== null) {
        const delta_percent = resizeCurrentPercent - resizeStartPercent;
        const delta_ms = (delta_percent / 100) * TOTAL_MINUTES * 60 * 1000;

        let new_start = resizeOriginalStart;
        let new_end = resizeOriginalEnd;

        if (resizeType === 'start') {
          new_start = resizeOriginalStart + delta_ms;
          // 시작 시간이 종료 시간보다 늦어지지 않도록 (최소 5분 간격)
          if (new_start >= new_end - 5 * 60 * 1000) {
            new_start = new_end - 5 * 60 * 1000;
          }
        } else {
          new_end = resizeOriginalEnd + delta_ms;
          // 종료 시간이 시작 시간보다 빨라지지 않도록 (최소 5분 간격)
          if (new_end <= new_start + 5 * 60 * 1000) {
            new_end = new_start + 5 * 60 * 1000;
          }
        }

        // 시간이 변경되었을 때만 업데이트
        if (new_start !== resizeOriginalStart || new_end !== resizeOriginalEnd) {
          updateLog(resizeLogId, {
            startTime: new_start,
            endTime: new_end
          });
        }
      }

      // 상태 초기화
      setIsResizing(false);
      setResizeLogId(null);
      setResizeType(null);
      setResizeStartPercent(null);
      setResizeCurrentPercent(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeLogId, resizeType, resizeStartPercent, resizeCurrentPercent, resizeOriginalStart, resizeOriginalEnd, updateLog]);

  // 리사이즈 중인 아이템의 미리보기 계산
  const getResizePreview = useCallback((item: typeof chartItems[0]) => {
    if (!isResizing || resizeLogId !== item.id || resizeStartPercent === null || resizeCurrentPercent === null) {
      return { left_percent: item.left_percent, width_percent: item.width_percent };
    }

    const delta_percent = resizeCurrentPercent - resizeStartPercent;

    if (resizeType === 'start') {
      let new_left = item.left_percent + delta_percent;
      let new_width = item.width_percent - delta_percent;
      
      // 최소 너비 유지
      if (new_width < 0.35) { // 약 5분
        new_width = 0.35;
        new_left = item.left_percent + item.width_percent - new_width;
      }
      if (new_left < 0) {
        new_width = new_width + new_left;
        new_left = 0;
      }
      
      return { left_percent: new_left, width_percent: new_width };
    } else {
      let new_width = item.width_percent + delta_percent;
      
      // 최소 너비 유지
      if (new_width < 0.35) {
        new_width = 0.35;
      }
      // 최대 범위 제한
      if (item.left_percent + new_width > 100) {
        new_width = 100 - item.left_percent;
      }
      
      return { left_percent: item.left_percent, width_percent: new_width };
    }
  }, [isResizing, resizeLogId, resizeStartPercent, resizeCurrentPercent, resizeType, chartItems]);

  return (
    <Paper variant="outlined" sx={{ p: 2, overflowX: 'auto', userSelect: 'none' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        일간 타임라인 ({new Date().toLocaleDateString('ko-KR')})
      </Typography>

      <Tooltip
        title="빈 영역을 드래그하여 작업을 추가하세요"
        placement="top"
        followCursor
        enterDelay={500}
        disableHoverListener={isHoveringBar}
      >
        <Box
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          sx={{
            position: 'relative',
            height: chart_height,
            minWidth: 800,
            cursor: 'crosshair',
          }}
        >
          {/* 시간축 헤더 */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: LABEL_WIDTH,
            right: 0,
            height: HEADER_HEIGHT,
            borderBottom: '1px solid #eaeaea'
          }}>
            {timeLabels.map((item, index) => (
              <Typography
                key={index}
                variant="caption"
                sx={{
                  position: 'absolute',
                  left: `${item.left_percent}%`,
                  top: 4,
                  transform: 'translateX(-50%)',
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.label}
              </Typography>
            ))}
          </Box>

          {/* 세로 그리드 라인 */}
          {timeLabels.map((item, index) => (
            <Box
              key={index}
              sx={{
                position: 'absolute',
                left: `calc(${LABEL_WIDTH}px + ${item.left_percent}% * (100% - ${LABEL_WIDTH}px) / 100%)`,
                top: HEADER_HEIGHT,
                bottom: 0,
                borderLeft: '1px dashed #f0f0f0',
                zIndex: 0,
                pointerEvents: 'none'
              }}
            />
          ))}

          {/* 작업 행들 - 제목별로 그룹화 */}
          {uniqueRows.map((row, row_index) => {
            // 해당 행에 속하는 모든 막대들
            const row_items = chartItems.filter(item => item.row_index === row_index);
            const has_running = row_items.some(item => item.status === 'RUNNING');

            return (
              <Box
                key={row.title}
                sx={{
                  position: 'absolute',
                  top: HEADER_HEIGHT + row_index * (ROW_HEIGHT + ROW_GAP),
                  left: 0,
                  right: 0,
                  height: ROW_HEIGHT,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {/* 왼쪽 작업명 라벨 */}
                <Box sx={{
                  width: LABEL_WIDTH,
                  px: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  overflow: 'hidden'
                }}>
                  {row.boardNo && (
                    <Chip
                      label={`#${row.boardNo}`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        bgcolor: row.color,
                        color: '#fff',
                        '& .MuiChip-label': { px: 0.5 }
                      }}
                    />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: has_running ? 600 : 400,
                      color: has_running ? 'primary.main' : 'text.primary'
                    }}
                    title={row.title}
                  >
                    {row.title}
                  </Typography>
                </Box>

                {/* 오른쪽 타임라인 영역 */}
                <Box sx={{
                  flex: 1,
                  position: 'relative',
                  height: '100%'
                }}>
                  {/* 해당 행의 모든 작업 막대들 */}
                  {row_items.map((item) => (
                    <Tooltip
                      key={item.id}
                      title={
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="subtitle2">{item.title}</Typography>
                          {item.category && (
                            <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              {item.category}
                            </Typography>
                          )}
                          <Typography variant="caption" display="block">
                            {formatTimeRange(item.startTime, item.endTime)}
                          </Typography>
                          <Typography variant="caption">
                            {formatDuration((item.endTime ? item.endTime - item.startTime : currentTime - item.startTime) / 1000)}
                          </Typography>
                        </Box>
                      }
                      arrow
                    >
                      <Box
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseEnter={() => setIsHoveringBar(true)}
                        onMouseLeave={() => setIsHoveringBar(false)}
                        sx={{
                          position: 'absolute',
                          left: `${item.left_percent}%`,
                          width: `${item.width_percent}%`,
                          top: 4,
                          bottom: 4,
                          bgcolor: item.color,
                          opacity: item.status === 'RUNNING' ? 1 : 0.85,
                          borderRadius: 0.5,
                          cursor: 'pointer',
                          zIndex: 1,
                          boxShadow: item.status === 'RUNNING' ? '0 0 8px rgba(0,0,0,0.3)' : 'none',
                          transition: 'all 0.15s',
                          '&:hover': {
                            opacity: 1,
                            transform: 'scaleY(1.15)',
                            zIndex: 2,
                          }
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            );
          })}


          {/* 드래그 중인 영역 표시 */}
          {isDragging && dragStartPercent !== null && dragCurrentPercent !== null && dragRowIndex !== null && (
            <Box
              sx={{
                position: 'absolute',
                left: `calc(${LABEL_WIDTH}px + ${Math.min(dragStartPercent, dragCurrentPercent)}% * (100% - ${LABEL_WIDTH}px) / 100%)`,
                width: `calc(${Math.abs(dragCurrentPercent - dragStartPercent)}% * (100% - ${LABEL_WIDTH}px) / 100%)`,
                top: HEADER_HEIGHT + Math.min(dragRowIndex, uniqueRows.length) * (ROW_HEIGHT + ROW_GAP) + 4,
                height: ROW_HEIGHT - 8,
                bgcolor: 'rgba(0, 0, 0, 0.15)',
                border: '2px dashed #000',
                borderRadius: 0.5,
                zIndex: 10,
                pointerEvents: 'none'
              }}
            />
          )}

          {/* 현재 시간 표시 라인 */}
          <Box
            sx={{
              position: 'absolute',
              left: `calc(${LABEL_WIDTH}px + ${current_time_percent}% * (100% - ${LABEL_WIDTH}px) / 100%)`,
              top: 0,
              bottom: 0,
              borderLeft: '2px solid #ef4444',
              zIndex: 5,
              pointerEvents: 'none'
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: HEADER_HEIGHT - 6,
                left: -5,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: '#ef4444'
              }}
            />
          </Box>
        </Box>
      </Tooltip>

      {/* 수동 입력 모달 */}
      <Dialog open={showCreateModal} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isAddingSession ? `"${newTitle}" 세션 추가` : '새 업무 기록 (수동)'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              시간: {formatTimeRange(newLogStart, newLogEnd)}
            </Typography>
            {isAddingSession ? (
              // 기존 작업에 세션 추가: 제목 표시 + 다른 작업으로 변경 옵션
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      작업
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {newTitle}
                    </Typography>
                  </Box>
                  <Button 
                    size="small" 
                    onClick={() => {
                      setIsAddingSession(false);
                      setNewTitle('');
                      setNewBoardNo('');
                      setNewCategory(null);
                    }}
                    sx={{ fontSize: '0.75rem', minWidth: 'auto' }}
                  >
                    다른 작업으로 변경
                  </Button>
                </Box>
                {(newBoardNo || newCategory) && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {newBoardNo && (
                      <Chip label={`#${newBoardNo}`} size="small" variant="outlined" />
                    )}
                    {newCategory && (
                      <Chip label={newCategory} size="small" sx={{ bgcolor: '#f0f0f0' }} />
                    )}
                  </Box>
                )}
              </Box>
            ) : (
              // 새 작업 생성: 제목 입력 가능
              <>
                <TextField
                  label="업무 제목"
                  fullWidth
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="게시판 번호"
                    value={newBoardNo}
                    onChange={(e) => setNewBoardNo(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <Autocomplete
                    options={CATEGORIES}
                    value={newCategory}
                    onChange={(_e, newValue) => setNewCategory(newValue)}
                    renderInput={(params) => <TextField {...params} label="카테고리" />}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose}>취소</Button>
          <Button onClick={handleCreateSave} variant="contained" color="primary">
            {isAddingSession ? '세션 추가' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GanttChart;

import React, { useMemo, useState, useRef, useEffect } from 'react';
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
    Autocomplete
} from '@mui/material';
import { useTimerStore, TimerLog } from '../../store/useTimerStore';
import { formatTimeRange, formatDuration } from '../../utils/timeUtils';

// 24시간 = 1440분
const TOTAL_MINUTES = 1440;
// 시작 시간: 06:00
const START_HOUR = 6;

const CATEGORIES = ['분석', '개발', '개발자테스트', '테스트오류수정', '센터오류수정', '환경세팅', '회의', '기타'];

const GanttChart: React.FC = () => {
  const { logs, activeTimer, addLog } = useTimerStore();
  
  // 드래그 상태 관리
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPercent, setDragStartPercent] = useState<number | null>(null);
  const [dragCurrentPercent, setDragCurrentPercent] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 드래그 생성 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLogStart, setNewLogStart] = useState<number>(0);
  const [newLogEnd, setNewLogEnd] = useState<number>(0);
  const [newTitle, setNewTitle] = useState('');
  const [newBoardNo, setNewBoardNo] = useState('');
  const [newCategory, setNewCategory] = useState<string | null>(null);

  // 모든 업무 로그 (완료됨 + 현재 활성 포함)
  const allLogs = useMemo(() => {
    let combinedLogs = [...logs];
    if (activeTimer) {
      combinedLogs.push(activeTimer);
    }
    return combinedLogs;
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

  // 너비 계산 (분 단위)
  const getWidthMinutes = (start: number, end?: number) => {
    const startTime = start;
    const endTime = end || Date.now();
    return (endTime - startTime) / 1000 / 60; // 분
  };

  // 차트 렌더링용 데이터 변환
  const chartItems = allLogs.map(log => {
    const startOffset = getOffsetMinutes(log.startTime);
    let width = getWidthMinutes(log.startTime, log.endTime);
    
    // 최소 1px은 보이게 (너무 짧은 업무도 보이도록)
    if (width < 2) width = 2;

    // 전체 1440분 중 비율 (%)
    const leftPercent = (startOffset / TOTAL_MINUTES) * 100;
    const widthPercent = (width / TOTAL_MINUTES) * 100;

    return {
      ...log,
      leftPercent,
      widthPercent
    };
  });

  // 시간축 라벨 생성 (06, 08, 10 ... 04)
  const timeLabels = [];
  for (let i = 0; i <= 24; i += 2) {
    let hour = START_HOUR + i;
    const displayHour = hour >= 24 ? hour - 24 : hour;
    timeLabels.push({
      label: `${displayHour.toString().padStart(2, '0')}:00`,
      leftPercent: (i * 60 / TOTAL_MINUTES) * 100
    });
  }

  // --- 드래그 핸들러 ---

  const getPercentFromEvent = (e: React.MouseEvent) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return Math.min(Math.max((x / rect.width) * 100, 0), 100);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 배경 클릭 시에만 동작하도록 (이미 있는 바 클릭 제외)
    // -> 이벤트 버블링 처리 필요하지만, 여기선 Bar가 Tooltip 내부에 있고 z-index가 높아서 괜찮을 수 있음.
    // e.target 체크 필요할 수 있음.
    
    setIsDragging(true);
    const percent = getPercentFromEvent(e);
    setDragStartPercent(percent);
    setDragCurrentPercent(percent);
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
        return;
    }

    // 시간 변환 로직
    const startP = Math.min(dragStartPercent, dragCurrentPercent);
    const endP = Math.max(dragStartPercent, dragCurrentPercent);
    
    // 퍼센트 -> 분 (0~1440)
    const startMinutes = (startP / 100) * TOTAL_MINUTES;
    const endMinutes = (endP / 100) * TOTAL_MINUTES;

    // 분 -> 실제 타임스탬프 (오늘 날짜 기준)
    const now = new Date();
    // 기준 시각: 오늘 06:00
    const baseTime = new Date(now);
    baseTime.setHours(START_HOUR, 0, 0, 0);
    
    // 만약 현재 시각이 06:00 이전이라면(새벽작업), baseTime은 어제 06:00 이어야 함.
    // 하지만 PRD상 "06:00 ~ 익일 06:00"이 하루이므로,
    // 현재 시각이 어떻든 "화면에 보이는 차트"는 오늘(혹은 조회중인 날짜) 기준이어야 함.
    // 일단은 "오늘"을 기준으로 한다.
    
    const startTime = baseTime.getTime() + startMinutes * 60 * 1000;
    const endTime = baseTime.getTime() + endMinutes * 60 * 1000;

    setNewLogStart(startTime);
    setNewLogEnd(endTime);
    setShowCreateModal(true);
    
    // 상태 초기화는 모달 닫을 때
    setDragStartPercent(null);
    setDragCurrentPercent(null);
  };

  const handleCreateSave = () => {
    if (!newTitle.trim()) return;

    const newLog: TimerLog = {
        id: crypto.randomUUID(),
        title: newTitle,
        boardNo: newBoardNo,
        category: newCategory || undefined,
        startTime: newLogStart,
        endTime: newLogEnd,
        status: 'COMPLETED', // 수동 입력은 완료 상태로
        pausedDuration: 0
    };

    addLog(newLog);
    handleCreateClose();
  };

  const handleCreateClose = () => {
    setShowCreateModal(false);
    setNewTitle('');
    setNewBoardNo('');
    setNewCategory(null);
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 4, overflowX: 'auto', userSelect: 'none' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>타임라인 (Today)</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        빈 공간을 드래그하여 업무를 수동으로 기록할 수 있습니다.
      </Typography>
      
      <Box 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        sx={{ 
            position: 'relative', 
            height: 120, 
            minWidth: 600, 
            cursor: 'crosshair',
            bgcolor: '#fafafa' // 드래그 영역 명시
        }}
      >
        {/* 시간축 배경 그리드 */}
        {timeLabels.map((item, index) => (
            <Box 
                key={index} 
                sx={{ 
                    position: 'absolute', 
                    left: `${item.leftPercent}%`, 
                    top: 0, 
                    bottom: 0, 
                    borderLeft: '1px dashed #e0e0e0',
                    zIndex: 0,
                    pointerEvents: 'none' // 그리드가 클릭 방해하지 않도록
                }}
            >
                <Typography 
                    variant="caption" 
                    sx={{ 
                        position: 'absolute', 
                        top: -20, 
                        left: -15, 
                        color: 'text.disabled',
                        fontSize: '0.7rem'
                    }}
                >
                    {item.label}
                </Typography>
            </Box>
        ))}

        {/* 업무 바 (Bars) */}
        {chartItems.map((item) => (
          <Tooltip 
            key={item.id} 
            title={
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2">{item.title}</Typography>
                <Typography variant="caption" display="block">
                  {formatTimeRange(item.startTime, item.endTime)}
                </Typography>
                <Typography variant="caption">
                    {formatDuration((item.endTime ? item.endTime - item.startTime : Date.now() - item.startTime) / 1000)}
                </Typography>
              </Box>
            }
            arrow
          >
            <Box
              onMouseDown={(e) => e.stopPropagation()} // 바 위에서 드래그 시작 방지
              sx={{
                position: 'absolute',
                left: `${item.leftPercent}%`,
                width: `${item.widthPercent}%`,
                top: 40,
                height: 30,
                bgcolor: item.status === 'RUNNING' ? 'primary.main' : 'secondary.light',
                opacity: item.status === 'RUNNING' ? 1 : 0.8,
                borderRadius: 1,
                cursor: 'pointer', // 상세 보기나 수정 팝업?
                zIndex: 1,
                boxShadow: item.status === 'RUNNING' ? '0 0 10px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.2s',
                '&:hover': {
                    transform: 'scaleY(1.1)',
                    zIndex: 2,
                    opacity: 1
                }
              }}
            />
          </Tooltip>
        ))}

        {/* 드래그 중인 영역 표시 (Ghost Bar) */}
        {isDragging && dragStartPercent !== null && dragCurrentPercent !== null && (
             <Box
                sx={{
                    position: 'absolute',
                    left: `${Math.min(dragStartPercent, dragCurrentPercent)}%`,
                    width: `${Math.abs(dragCurrentPercent - dragStartPercent)}%`,
                    top: 40,
                    height: 30,
                    bgcolor: 'rgba(0, 0, 0, 0.1)',
                    border: '1px dashed #000',
                    borderRadius: 1,
                    zIndex: 0,
                    pointerEvents: 'none'
                }}
             />
        )}

        {/* 현재 시간 표시 바 (Red Line) */}
        <Box 
            sx={{
                position: 'absolute',
                left: `${(getOffsetMinutes(Date.now()) / TOTAL_MINUTES) * 100}%`,
                top: 0,
                bottom: 0,
                borderLeft: '2px solid red',
                zIndex: 2,
                pointerEvents: 'none'
            }}
        >
            <Box 
                sx={{ 
                    position: 'absolute', 
                    top: -4, 
                    left: -4, 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: 'red' 
                }} 
            />
        </Box>
      </Box>

      {/* 수동 입력 모달 */}
      <Dialog open={showCreateModal} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>새 업무 기록 (수동)</DialogTitle>
        <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    시간: {formatTimeRange(newLogStart, newLogEnd)}
                </Typography>
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
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCreateClose}>취소</Button>
            <Button onClick={handleCreateSave} variant="contained" color="primary">저장</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GanttChart;

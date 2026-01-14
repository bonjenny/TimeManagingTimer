import React, { useMemo } from 'react';
import { Box, Typography, Paper, Tooltip } from '@mui/material';
import { useTimerStore, TimerLog } from '../../store/useTimerStore';
import { formatTimeRange, formatDuration } from '../../utils/timeUtils';

// 24시간 = 1440분
const TOTAL_MINUTES = 1440;
// 시작 시간: 06:00
const START_HOUR = 6;

const GanttChart: React.FC = () => {
  const { logs, activeTimer } = useTimerStore();

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

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 4, overflowX: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>타임라인 (Today)</Typography>
      
      <Box sx={{ position: 'relative', height: 120, minWidth: 600 }}>
        {/* 시간축 배경 그리드 */}
        {timeLabels.map((item, index) => (
            <Box 
                key={index} 
                sx={{ 
                    position: 'absolute', 
                    left: `${item.leftPercent}%`, 
                    top: 0, 
                    bottom: 0, 
                    borderLeft: '1px dashed #eee',
                    zIndex: 0 
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
              sx={{
                position: 'absolute',
                left: `${item.leftPercent}%`,
                width: `${item.widthPercent}%`,
                top: 40, // 고정 높이 (나중에 겹치면 조정 로직 필요)
                height: 30,
                bgcolor: item.status === 'RUNNING' ? 'primary.main' : 'secondary.light',
                opacity: item.status === 'RUNNING' ? 1 : 0.7,
                borderRadius: 1,
                cursor: 'pointer',
                zIndex: 1,
                boxShadow: item.status === 'RUNNING' ? '0 0 10px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.2s',
                '&:hover': {
                    transform: 'scaleY(1.2)',
                    zIndex: 2,
                    opacity: 1
                }
              }}
            />
          </Tooltip>
        ))}

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
    </Paper>
  );
};

export default GanttChart;

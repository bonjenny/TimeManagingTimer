import React, { useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Chip, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import CheckIcon from '@mui/icons-material/Check';
import { useTimerStore } from '../../store/useTimerStore';
import { useTimerLogic } from '../../hooks/useTimerLogic';
import { formatTimeDisplay, formatDuration } from '../../utils/timeUtils';

const ActiveTimer: React.FC = () => {
  const { activeTimer, elapsedSeconds, showSeconds } = useTimerLogic();
  const { logs, pauseTimer, resumeTimer, completeTimer, stopTimer } = useTimerStore();

  // 같은 제목의 모든 로그 누적 시간 계산 (현재 세션 포함)
  const totalAccumulatedSeconds = useMemo(() => {
    if (!activeTimer) return 0;
    
    // 같은 제목의 완료된 로그들의 시간 합산
    const completed_duration = logs
      .filter(log => log.title === activeTimer.title)
      .reduce((sum, log) => {
        const end = log.endTime || Date.now();
        const duration = Math.floor((end - log.startTime) / 1000 - log.pausedDuration);
        return sum + Math.max(0, duration);
      }, 0);
    
    // 현재 진행 중인 세션 시간 추가
    return completed_duration + elapsedSeconds;
  }, [activeTimer, logs, elapsedSeconds]);

  if (!activeTimer) {
    return null;
  }

  const isRunning = activeTimer.status === 'RUNNING';

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        border: '1px solid',
        borderColor: isRunning ? 'primary.main' : 'var(--border-color)',
        bgcolor: 'var(--card-bg)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
      }}
    >
      {/* 상태 표시줄 (좌측 라인) */}
      <Box 
        sx={{ 
          position: 'absolute', 
          left: 0, 
          top: 0, 
          bottom: 0, 
          width: 4, 
          bgcolor: isRunning ? 'primary.main' : 'text.disabled' 
        }} 
      />

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, gap: 2 }}>
        {/* 타이머 정보 */}
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip 
              label={isRunning ? "진행 중" : "일시정지"} 
              color={isRunning ? "primary" : "default"} 
              size="small" 
              variant="outlined"
            />
            {activeTimer.category && (
              <Chip 
                label={activeTimer.category} 
                size="small" 
                sx={{ bgcolor: 'var(--bg-hover)', color: 'var(--text-secondary)' }} 
              />
            )}
            {activeTimer.boardNo && (
              <Typography variant="caption" color="text.secondary">
                #{activeTimer.boardNo}
              </Typography>
            )}
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {activeTimer.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            시작: {new Date(activeTimer.startTime).toLocaleTimeString()}
          </Typography>
        </Box>

        {/* 시간 표시 */}
        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
          {/* 00:00:00 형태로 표시, 5초 이후 초 부분 fade out */}
          <Box 
            sx={{ 
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: { xs: 'flex-start', md: 'flex-end' }
            }}
          >
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 300, 
                fontFamily: 'monospace', 
                letterSpacing: '-2px',
                lineHeight: 1
              }}
            >
              {formatTimeDisplay(elapsedSeconds)}
            </Typography>
            {/* 초 부분: 시작/재개 후 5초 동안 표시 */}
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 300, 
                fontFamily: 'monospace', 
                letterSpacing: '-2px',
                lineHeight: 1,
                opacity: showSeconds ? 1 : 0,
                maxWidth: showSeconds ? '100px' : 0,
                overflow: 'hidden',
                transition: 'opacity 0.5s ease-out, max-width 0.3s ease-out',
                whiteSpace: 'nowrap',
                color: 'text.secondary'
              }}
            >
              :{String(elapsedSeconds % 60).padStart(2, '0')}
            </Typography>
          </Box>
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 0.5,
              color: 'text.primary',
              fontWeight: 500
            }}
          >
            {formatDuration(totalAccumulatedSeconds)}
          </Typography>
        </Box>

        {/* 컨트롤 버튼 */}
        <Box sx={{ display: 'flex', gap: 1, mt: { xs: 2, md: 0 }, alignItems: 'center' }}>
          <IconButton 
            onClick={isRunning ? pauseTimer : resumeTimer}
            color="primary"
            sx={{ 
              width: 40, 
              height: 40, 
              border: '1px solid',
              borderColor: isRunning ? 'primary.main' : 'divider',
              bgcolor: isRunning ? 'var(--bg-hover)' : 'transparent'
            }}
          >
            {isRunning ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          
          <Button 
            variant="contained" 
            startIcon={<CheckIcon />} 
            onClick={completeTimer}
            sx={{ 
                bgcolor: 'var(--primary-color)', 
                color: 'var(--bg-primary)', // 텍스트 색상 반전 (검정 배경엔 흰 글씨, 흰 배경엔 검정 글씨)
                '&:hover': { bgcolor: 'var(--accent-color)' } 
            }}
          >
            완료
          </Button>

          <IconButton onClick={stopTimer} sx={{ color: 'text.secondary' }} title="삭제(중단)">
            <StopIcon />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

export default ActiveTimer;

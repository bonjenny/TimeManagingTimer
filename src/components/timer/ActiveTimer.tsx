import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Box, Typography, Button, Paper, Chip, IconButton, TextField } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CheckIcon from '@mui/icons-material/Check';
import { useTimerStore } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTimerLogic } from '../../hooks/useTimerLogic';
import { formatTimeDisplay, formatDuration } from '../../utils/timeUtils';

const ActiveTimer: React.FC = () => {
  const { activeTimer, elapsedSeconds, showSeconds } = useTimerLogic();
  const { logs, resumeTimer, completeTimer, updateActiveTimer, pauseAndMoveToLogs } = useTimerStore();
  const { getProjectName } = useProjectStore();
  
  // 제목 편집 상태
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  // 제목 편집 시작
  const handleTitleClick = () => {
    if (activeTimer) {
      setEditTitle(activeTimer.title);
      setIsEditingTitle(true);
    }
  };

  // 제목 저장
  const handleTitleSave = () => {
    if (activeTimer && editTitle.trim() && editTitle.trim() !== activeTimer.title) {
      updateActiveTimer({ title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  // 제목 편집 취소
  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setEditTitle('');
  };

  // 편집 모드 진입 시 input에 포커스
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

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
            {activeTimer.projectCode && (
              <Chip 
                label={getProjectName(activeTimer.projectCode)} 
                size="small" 
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem' }}
                title={`[${activeTimer.projectCode}]`}
              />
            )}
          </Box>
          {isEditingTitle ? (
            <TextField
              inputRef={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTitleSave();
                }
                if (e.key === 'Escape') {
                  handleTitleCancel();
                }
              }}
              variant="standard"
              fullWidth
              InputProps={{ 
                disableUnderline: true,
                sx: { 
                  fontSize: '1.5rem', 
                  fontWeight: 700,
                  lineHeight: 1.334,
                  py: 0,
                }
              }}
              sx={{ mb: 0.5 }}
            />
          ) : (
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                mb: 0.5,
                cursor: 'pointer',
                borderRadius: 1,
                px: 0.5,
                mx: -0.5,
                '&:hover': { 
                  bgcolor: 'action.hover',
                }
              }}
              onClick={handleTitleClick}
              title="클릭하여 제목 수정"
            >
              {activeTimer.title}
            </Typography>
          )}
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
            onClick={isRunning ? pauseAndMoveToLogs : resumeTimer}
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
                color: 'white', 
                '&:hover': { bgcolor: 'var(--accent-color)' } 
            }}
          >
            완료
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default ActiveTimer;

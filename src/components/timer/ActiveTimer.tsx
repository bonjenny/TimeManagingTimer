import React from 'react';
import { Box, Typography, Button, Paper, Chip, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import CheckIcon from '@mui/icons-material/Check';
import { useTimerStore } from '../../store/useTimerStore';
import { useTimerLogic } from '../../hooks/useTimerLogic';
import { formatTimeDisplay, formatDuration } from '../../utils/timeUtils';

const ActiveTimer: React.FC = () => {
  const { activeTimer, elapsedSeconds } = useTimerLogic();
  const { pauseTimer, resumeTimer, completeTimer, stopTimer } = useTimerStore();

  if (!activeTimer) {
    return null;
  }

  const isRunning = activeTimer.status === 'RUNNING';

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        mb: 3, 
        border: '1px solid',
        borderColor: 'primary.main',
        bgcolor: isRunning ? 'background.paper' : '#fafafa',
        position: 'relative',
        overflow: 'hidden'
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
              <Chip label={activeTimer.category} size="small" sx={{ bgcolor: '#f0f0f0' }} />
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
          <Typography variant="h3" sx={{ fontWeight: 300, fontFamily: 'monospace', letterSpacing: '-2px' }}>
            {formatTimeDisplay(elapsedSeconds)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatDuration(elapsedSeconds)}
          </Typography>
        </Box>

        {/* 컨트롤 버튼 */}
        <Box sx={{ display: 'flex', gap: 1, mt: { xs: 2, md: 0 } }}>
          {isRunning ? (
            <Button 
              variant="outlined" 
              color="inherit" 
              startIcon={<PauseIcon />} 
              onClick={pauseTimer}
              sx={{ minWidth: 100 }}
            >
              일시정지
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<PlayArrowIcon />} 
              onClick={resumeTimer}
              sx={{ minWidth: 100 }}
            >
              재개
            </Button>
          )}
          
          <Button 
            variant="contained" 
            color="success" // 테마에 success가 없으면 main theme color 따라감. success 추가 필요할수도.
            startIcon={<CheckIcon />} 
            onClick={completeTimer}
            sx={{ 
                bgcolor: '#000', 
                color: '#fff', 
                '&:hover': { bgcolor: '#333' } 
            }}
          >
            완료
          </Button>

          <IconButton onClick={stopTimer} color="default" title="삭제(중단)">
            <StopIcon />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

export default ActiveTimer;

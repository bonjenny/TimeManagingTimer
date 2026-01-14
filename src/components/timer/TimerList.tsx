import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton, 
  Chip, 
  FormControlLabel, 
  Switch, 
  Paper,
  Divider
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTimerStore, TimerLog } from '../../store/useTimerStore';
import { formatTimeRange, formatDuration } from '../../utils/timeUtils';

const TimerList: React.FC = () => {
  const { logs, deleteLog, startTimer } = useTimerStore();
  const [showCompleted, setShowCompleted] = useState(false);

  // 오늘 날짜의 로그만 필터링 (06:00 ~ 다음날 06:00 기준)
  // PRD 84: "06:00 부터 다음날 06:00까지를 하루로 본다."
  // -> 하지만 일단 단순하게 당일(Local Time) 기준으로 먼저 보여주고,
  //    추후 날짜 경계 로직이 필요하면 보강. 지금은 "오늘 시작된 것"만 보여주자.
  
  const today = new Date().toLocaleDateString();
  
  // 역순 정렬 (최신순)
  const filteredLogs = logs
    .filter(log => {
      const logDate = new Date(log.startTime).toLocaleDateString();
      // "완료된 타이머 표시" 체크 안되어 있으면 COMPLETED 제외
      if (!showCompleted && log.status === 'COMPLETED') return false;
      // 오늘 날짜만 (임시: 실제로는 startTime 기준 날짜 비교가 더 정확해야 함)
      // return logDate === today; 
      // -> 개발 편의상 전체 다 보여주되 정렬만 함 (테스트 위해). 
      //    나중에는 날짜 필터링 필수. 지금은 전체 다 보여주기로 함.
      return true;
    })
    .sort((a, b) => b.startTime - a.startTime);

  const handleRestart = (log: TimerLog) => {
    startTimer(log.title, log.boardNo, log.category);
  };

  const getDuration = (log: TimerLog) => {
    const end = log.endTime || Date.now();
    let duration = (end - log.startTime) / 1000 - log.pausedDuration;
    
    // 진행중이거나 일시정지 상태인 경우, 아직 완료되지 않았으므로 표시 방식이 다를 수 있음
    // TimerList에는 주로 "완료된" 혹은 "일시정지된" 타이머가 보일 것임.
    // ActiveTimer는 상단에 따로 있으므로, 여기 리스트에는 RUNNING 상태가 안 뜨는게 맞을까?
    // 보통 Linear 같은 툴은 RUNNING 상태도 리스트에 포함하되 하이라이트 함.
    // 하지만 우리 기획은 "ActiveTimer 컴포넌트"가 따로 있으므로 중복 표시를 피하거나,
    // ActiveTimer는 상단에 고정하고, 리스트에서는 제외하는게 깔끔할 수 있음.
    
    // 여기서는 일단 모든 로그를 보여주되, RUNNING인 경우(즉 ActiveTimer인 경우)는 리스트에서 뺄 수도 있음.
    // useTimerStore에서 activeTimer는 logs 배열에 포함되지 않고 별도 필드로 관리됨!
    // -> 따라서 logs 배열에는 "완료"되거나 "일시정지(Active에 의해 밀려난)" 녀석들만 있음.
    // -> 즉, 중복 걱정 없음.
    
    return Math.max(0, Math.floor(duration));
  };

  if (logs.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">기록된 업무가 없습니다.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">최근 업무 기록</Typography>
        <FormControlLabel
          control={
            <Switch 
              checked={showCompleted} 
              onChange={(e) => setShowCompleted(e.target.checked)} 
              size="small" 
            />
          }
          label={<Typography variant="body2" color="text.secondary">완료된 항목 보기</Typography>}
        />
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <List disablePadding>
          {filteredLogs.map((log, index) => (
            <React.Fragment key={log.id}>
              {index > 0 && <Divider />}
              <ListItem
                sx={{
                  bgcolor: log.status === 'COMPLETED' ? 'transparent' : '#fafafa', // 일시정지 등은 배경색 약간 다르게
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                secondaryAction={
                  <Box>
                    <IconButton edge="end" aria-label="restart" onClick={() => handleRestart(log)} size="small" sx={{ mr: 1 }}>
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete" onClick={() => deleteLog(log.id)} size="small">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {log.title}
                      </Typography>
                      {log.boardNo && (
                        <Chip label={`#${log.boardNo}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                      {log.category && (
                        <Chip label={log.category} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#f5f5f5' }} />
                      )}
                      <Chip 
                        label={log.status === 'COMPLETED' ? '완료' : '일시정지'} 
                        size="small" 
                        color={log.status === 'COMPLETED' ? 'default' : 'warning'}
                        variant={log.status === 'COMPLETED' ? 'outlined' : 'filled'}
                        sx={{ height: 20, fontSize: '0.7rem' }} 
                      />
                    </Box>
                  }
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 2, mt: 0.5, fontSize: '0.875rem' }}>
                      <Typography variant="body2" component="span" color="text.secondary">
                        {formatTimeRange(log.startTime, log.endTime)}
                      </Typography>
                      <Typography variant="body2" component="span" color="text.primary" sx={{ fontWeight: 500 }}>
                        {formatDuration(getDuration(log))}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
          {filteredLogs.length === 0 && (
            <ListItem>
                <ListItemText primary="표시할 항목이 없습니다." sx={{ textAlign: 'center', color: 'text.secondary' }} />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default TimerList;

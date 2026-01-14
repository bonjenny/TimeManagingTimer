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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import { useTimerStore, TimerLog } from '../../store/useTimerStore';
import { formatTimeRange, formatDuration } from '../../utils/timeUtils';

const CATEGORIES = ['분석', '개발', '개발자테스트', '테스트오류수정', '센터오류수정', '환경세팅', '회의', '기타'];

const TimerList: React.FC = () => {
  const { logs, deleteLog, startTimer, updateLog } = useTimerStore();
  const [showCompleted, setShowCompleted] = useState(false);
  
  // 수정 모달 상태
  const [editingLog, setEditingLog] = useState<TimerLog | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBoardNo, setEditBoardNo] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);

  const today = new Date().toLocaleDateString();
  
  const filteredLogs = logs
    .filter(log => {
      // const logDate = new Date(log.startTime).toLocaleDateString();
      if (!showCompleted && log.status === 'COMPLETED') return false;
      return true;
    })
    .sort((a, b) => b.startTime - a.startTime);

  const handleRestart = (log: TimerLog) => {
    startTimer(log.title, log.boardNo, log.category);
  };

  const getDuration = (log: TimerLog) => {
    const end = log.endTime || Date.now();
    let duration = (end - log.startTime) / 1000 - log.pausedDuration;
    return Math.max(0, Math.floor(duration));
  };

  // 수정 핸들러
  const handleEditClick = (log: TimerLog) => {
    setEditingLog(log);
    setEditTitle(log.title);
    setEditBoardNo(log.boardNo || '');
    setEditCategory(log.category || null);
  };

  const handleEditSave = () => {
    if (editingLog && editTitle.trim()) {
      updateLog(editingLog.id, {
        title: editTitle,
        boardNo: editBoardNo,
        category: editCategory || undefined
      });
      handleEditClose();
    }
  };

  const handleEditClose = () => {
    setEditingLog(null);
    setEditTitle('');
    setEditBoardNo('');
    setEditCategory(null);
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
                  bgcolor: log.status === 'COMPLETED' ? 'transparent' : '#fafafa',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                secondaryAction={
                  <Box>
                    <IconButton edge="end" aria-label="edit" onClick={() => handleEditClick(log)} size="small" sx={{ mr: 1 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => handleEditClick(log)}>
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

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editingLog} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>업무 기록 수정</DialogTitle>
        <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField
                    label="업무 제목"
                    fullWidth
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        label="게시판 번호"
                        value={editBoardNo}
                        onChange={(e) => setEditBoardNo(e.target.value)}
                        sx={{ flex: 1 }}
                    />
                    <Autocomplete
                        options={CATEGORIES}
                        value={editCategory}
                        onChange={(_e, newValue) => setEditCategory(newValue)}
                        renderInput={(params) => <TextField {...params} label="카테고리" />}
                        sx={{ flex: 1 }}
                    />
                </Box>
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleEditClose}>취소</Button>
            <Button onClick={handleEditSave} variant="contained" color="primary">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimerList;

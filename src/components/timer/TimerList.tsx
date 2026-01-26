import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Chip, 
  FormControlLabel, 
  Switch, 
  Paper,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Tooltip
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import RestoreIcon from '@mui/icons-material/Restore';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import { useTimerStore, TimerLog, DeletedLog } from '../../store/useTimerStore';
import { formatDuration, getDurationSecondsExcludingLunch } from '../../utils/timeUtils';

const CATEGORIES = ['분석', '개발', '개발자테스트', '테스트오류수정', '센터오류수정', '환경세팅', '회의', '기타'];

// 하루 시작 기준 (06:00)
const DAY_START_HOUR = 6;

// 선택된 날짜의 범위 계산 (06:00 ~ 익일 06:00)
const getDateRange = (date: Date) => {
  const start = new Date(date);
  start.setHours(DAY_START_HOUR, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  
  return { start: start.getTime(), end: end.getTime() };
};

interface TimerListProps {
  selectedDate: Date;
}

// 시간 포맷 (HH:mm)
const formatTime = (timestamp: number | undefined) => {
  if (!timestamp) return '진행 중';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// 날짜 포맷 (YYYY-MM-DD)
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
};

// 그룹화된 업무 타입
interface TaskGroup {
  title: string;
  boardNo?: string;
  category?: string;
  sessions: TimerLog[];
  total_duration: number; // 초 단위
  first_start: number;
  last_end: number | undefined;
  has_running: boolean;
}

const TimerList: React.FC<TimerListProps> = ({ selectedDate }) => {
  const { logs, deleteLog, startTimer, updateLog, deleted_logs, restoreLog, permanentlyDeleteLog, emptyTrash } = useTimerStore();
  const [showCompleted, setShowCompleted] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // 수정 모달 상태
  const [editingLog, setEditingLog] = useState<TimerLog | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBoardNo, setEditBoardNo] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);

  // 휴지통 모달 상태
  const [trash_modal_open, setTrashModalOpen] = useState(false);

  // 로그를 제목별로 그룹화 (선택된 날짜만)
  const groupedTasks = useMemo(() => {
    const date_range = getDateRange(selectedDate);
    
    const filtered_logs = logs.filter(log => {
      // 선택된 날짜 필터링 (06:00 ~ 익일 06:00)
      if (log.startTime < date_range.start || log.startTime >= date_range.end) {
        return false;
      }
      if (!showCompleted && log.status === 'COMPLETED') return false;
      return true;
    });

    // 제목별로 그룹화
    const groups = new Map<string, TaskGroup>();
    
    filtered_logs.forEach(log => {
      const existing = groups.get(log.title);
      
      const get_duration = (l: TimerLog) => {
        // 점심시간 제외 적용
        return getDurationSecondsExcludingLunch(l.startTime, l.endTime, l.pausedDuration);
      };
      
      if (existing) {
        existing.sessions.push(log);
        existing.total_duration += get_duration(log);
        if (log.startTime < existing.first_start) {
          existing.first_start = log.startTime;
        }
        if (!existing.last_end || (log.endTime && log.endTime > existing.last_end)) {
          existing.last_end = log.endTime;
        }
        if (log.status === 'RUNNING' || log.status === 'PAUSED') {
          existing.has_running = true;
          existing.last_end = undefined;
        }
        // 최신 boardNo, category로 업데이트
        if (log.boardNo) existing.boardNo = log.boardNo;
        if (log.category) existing.category = log.category;
      } else {
        groups.set(log.title, {
          title: log.title,
          boardNo: log.boardNo,
          category: log.category,
          sessions: [log],
          total_duration: get_duration(log),
          first_start: log.startTime,
          last_end: log.endTime,
          has_running: log.status === 'RUNNING' || log.status === 'PAUSED'
        });
      }
    });

    // 세션들을 시작 시간순으로 정렬
    groups.forEach(group => {
      group.sessions.sort((a, b) => a.startTime - b.startTime);
    });

    // 그룹을 최신 first_start 기준으로 정렬
    return Array.from(groups.values()).sort((a, b) => b.first_start - a.first_start);
  }, [logs, showCompleted, selectedDate]);

  const toggleExpand = (title: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const handleRestart = (title: string, boardNo?: string, category?: string) => {
    startTimer(title, boardNo, category);
  };

  const getDuration = (log: TimerLog) => {
    // 점심시간 제외 적용
    return getDurationSecondsExcludingLunch(log.startTime, log.endTime, log.pausedDuration);
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

  // 선택된 날짜 로그 확인
  const date_range = getDateRange(selectedDate);
  const date_logs = logs.filter(log => 
    log.startTime >= date_range.start && log.startTime < date_range.end
  );

  // 오늘인지 확인
  const now = new Date();
  let today = new Date(now);
  if (now.getHours() < DAY_START_HOUR) {
    today.setDate(today.getDate() - 1);
  }
  const is_today = 
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate();

  if (date_logs.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">
          {is_today ? '오늘 기록된 업무가 없습니다.' : '해당 날짜에 기록된 업무가 없습니다.'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">최근 업무 기록</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
          <Tooltip title={`휴지통 (${deleted_logs.length})`}>
            <IconButton 
              size="small" 
              onClick={() => setTrashModalOpen(true)}
              sx={{ 
                color: deleted_logs.length > 0 ? 'warning.main' : 'text.secondary',
              }}
            >
              <RestoreFromTrashIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* 헤더 */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '40px 1fr 90px 110px 120px 60px',
          gap: 1,
          px: 2,
          py: 1,
          bgcolor: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'text.secondary'
        }}>
          <Box></Box>
          <Box>업무명</Box>
          <Box>카테고리</Box>
          <Box>시간</Box>
          <Box>시작-종료</Box>
          <Box>세션</Box>
        </Box>

        {/* 업무 목록 */}
        {groupedTasks.map((task) => {
          const is_expanded = expandedTasks.has(task.title);
          const all_completed = task.sessions.every(s => s.status === 'COMPLETED');
          
          return (
            <Box key={task.title}>
              {/* 업무 행 */}
              <Box 
                onClick={() => toggleExpand(task.title)}
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '40px 1fr 90px 110px 120px 60px',
                  gap: 1,
                  px: 2,
                  py: 1.5,
                  alignItems: 'center',
                  borderBottom: '1px solid #f0f0f0',
                  bgcolor: task.has_running ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  }
                }}
              >
                {/* 좌측: 재시작/복원 버튼 */}
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {all_completed ? (
                    <Tooltip title="이 업무 다시 시작">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestart(task.title, task.boardNo, task.category);
                        }}
                        sx={{ p: 0.5, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                      >
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="이 업무 재시작">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestart(task.title, task.boardNo, task.category);
                        }}
                        sx={{ p: 0.5 }}
                      >
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                {/* 업무명 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                  {task.boardNo && (
                    <Chip 
                      label={`#${task.boardNo}`} 
                      size="small" 
                      variant="outlined" 
                      sx={{ height: 20, fontSize: '0.7rem', flexShrink: 0 }} 
                    />
                  )}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      color: task.has_running ? 'primary.main' : all_completed ? 'text.secondary' : 'text.primary',
                      textDecoration: all_completed ? 'line-through' : 'none'
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </Typography>
                </Box>

                {/* 카테고리 */}
                <Box>
                  {task.category && (
                    <Chip 
                      label={task.category} 
                      size="small" 
                      sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#f0f0f0' }} 
                    />
                  )}
                </Box>

                {/* 총 시간 */}
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatDuration(task.total_duration)}
                </Typography>

                {/* 시작-종료 */}
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  {formatTime(task.first_start)} ~ {task.last_end ? formatTime(task.last_end) : '진행 중'}
                </Typography>

                {/* 세션 수 */}
                <Typography variant="body2" color="text.secondary">
                  {task.sessions.length}회
                </Typography>
              </Box>

              {/* 세션 상세 (펼침) */}
              <Collapse in={is_expanded}>
                <Box sx={{ bgcolor: '#fafafa', py: 1, px: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    작업 이력 (총 {task.sessions.length}회 작업)
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 40, py: 0.5 }}>#</TableCell>
                          <TableCell sx={{ width: 100, py: 0.5 }}>날짜</TableCell>
                          <TableCell sx={{ width: 80, py: 0.5 }}>시작 시간</TableCell>
                          <TableCell sx={{ width: 80, py: 0.5 }}>종료 시간</TableCell>
                          <TableCell sx={{ width: 80, py: 0.5 }}>소요 시간</TableCell>
                          <TableCell sx={{ width: 80, py: 0.5 }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {task.sessions.map((session, idx) => (
                          <TableRow key={session.id} hover>
                            <TableCell sx={{ py: 0.5 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ py: 0.5 }}>{formatDate(session.startTime)}</TableCell>
                            <TableCell sx={{ py: 0.5 }}>{formatTime(session.startTime)}</TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              {session.endTime ? formatTime(session.endTime) : (
                                <Chip 
                                  label={session.status === 'RUNNING' ? '진행 중' : '일시정지'} 
                                  size="small" 
                                  color={session.status === 'RUNNING' ? 'primary' : 'warning'}
                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                              )}
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              {Math.floor(getDuration(session) / 60)}분
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEditClick(session)}
                                  sx={{ p: 0.25 }}
                                >
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  onClick={() => deleteLog(session.id)}
                                  sx={{ p: 0.25 }}
                                >
                                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    첫 시작: {formatTime(task.first_start)} | 마지막 종료: {task.last_end ? formatTime(task.last_end) : '진행 중'} | 총 {formatDuration(task.total_duration)}
                  </Typography>
                </Box>
              </Collapse>
            </Box>
          );
        })}

        {groupedTasks.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">표시할 항목이 없습니다.</Typography>
          </Box>
        )}
      </Paper>

      {/* 수정 다이얼로그 */}
      <Dialog 
        open={!!editingLog} 
        onClose={handleEditClose} 
        maxWidth="sm" 
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && editTitle.trim()) {
            e.preventDefault();
            handleEditSave();
          }
        }}
      >
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

      {/* 휴지통 모달 */}
      <Dialog open={trash_modal_open} onClose={() => setTrashModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RestoreFromTrashIcon />
            휴지통
          </Box>
          {deleted_logs.length > 0 && (
            <Button 
              color="error" 
              size="small" 
              startIcon={<DeleteForeverIcon />}
              onClick={() => {
                if (window.confirm('휴지통을 비우시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                  emptyTrash();
                }
              }}
            >
              휴지통 비우기
            </Button>
          )}
        </DialogTitle>
        <DialogContent>
          {deleted_logs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Typography variant="body2">휴지통이 비어 있습니다.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>업무명</TableCell>
                    <TableCell>카테고리</TableCell>
                    <TableCell>삭제 시각</TableCell>
                    <TableCell sx={{ width: 120 }}>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deleted_logs
                    .sort((a, b) => b.deleted_at - a.deleted_at)
                    .map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {log.boardNo && (
                            <Chip label={`#${log.boardNo}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                          <Typography variant="body2">{log.title}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {log.category && (
                          <Chip label={log.category} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#f0f0f0' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(log.deleted_at).toLocaleString('ko-KR')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="복원">
                            <IconButton 
                              size="small" 
                              onClick={() => restoreLog(log.id)}
                              sx={{ color: 'success.main' }}
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="영구 삭제">
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                if (window.confirm('영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                                  permanentlyDeleteLog(log.id);
                                }
                              }}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteForeverIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            💡 삭제된 작업은 복원하거나 영구 삭제할 수 있습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrashModalOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimerList;

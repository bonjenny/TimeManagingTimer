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
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PauseIcon from '@mui/icons-material/Pause';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import RestoreIcon from '@mui/icons-material/Restore';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import { useTimerStore, TimerLog, DeletedLog } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import { formatDuration, getDurationSecondsExcludingLunch } from '../../utils/timeUtils';
import CategoryAutocomplete from '../common/CategoryAutocomplete';

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
  projectCode?: string;
  category?: string;
  sessions: TimerLog[];
  total_duration: number; // 초 단위
  first_start: number;
  last_end: number | undefined;
  has_running: boolean;
}

const TimerList: React.FC<TimerListProps> = ({ selectedDate }) => {
  const { logs, deleteLog, startTimer, updateLog, deleted_logs, restoreLog, permanentlyDeleteLog, emptyTrash, reopenTimer, activeTimer, pauseAndMoveToLogs, themeConfig } = useTimerStore();
  const { getProjectName, projects } = useProjectStore();
  const [showCompleted, setShowCompleted] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // 수정 모달 상태
  const [editingLog, setEditingLog] = useState<TimerLog | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editProjectCode, setEditProjectCode] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  
  // 인라인 편집 상태
  const [editingInlineTitle, setEditingInlineTitle] = useState<string | null>(null); // 편집 중인 task.title
  const [inlineTitle, setInlineTitle] = useState('');
  const [editingInlineProject, setEditingInlineProject] = useState<string | null>(null); // 편집 중인 task.title
  const [inlineProjectCode, setInlineProjectCode] = useState('');
  
  // 인라인 시간 편집 상태
  const [editingSessionTime, setEditingSessionTime] = useState<{
    sessionId: string;
    field: 'start' | 'end';
  } | null>(null);
  const [inlineTimeValue, setInlineTimeValue] = useState('');
  
  // 프로젝트 옵션 (코드 + 이름 형태로 표시)
  const projectOptions = useMemo(() => {
    return projects.map(p => `[${p.code}] ${p.name}`);
  }, [projects]);

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
        // 최신 projectCode, category로 업데이트
        if (log.projectCode) existing.projectCode = log.projectCode;
        if (log.category) existing.category = log.category;
      } else {
        groups.set(log.title, {
          title: log.title,
          projectCode: log.projectCode,
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

    // 정렬: 미완료 우선 → 프로젝트 코드 오름차순 → 작업명 오름차순
    return Array.from(groups.values()).sort((a, b) => {
      // 1. 완료 여부 (미완료 우선)
      const a_all_completed = a.sessions.every(s => s.status === 'COMPLETED');
      const b_all_completed = b.sessions.every(s => s.status === 'COMPLETED');
      
      if (!a_all_completed && b_all_completed) return -1; // a가 미완료, b가 완료 → a 우선
      if (a_all_completed && !b_all_completed) return 1;  // a가 완료, b가 미완료 → b 우선
      
      // 2. 프로젝트 코드 오름차순 (없는 것은 맨 뒤로)
      const a_code = a.projectCode || '';
      const b_code = b.projectCode || '';
      if (a_code && !b_code) return -1; // a만 있으면 a 우선
      if (!a_code && b_code) return 1;  // b만 있으면 b 우선
      if (a_code !== b_code) return a_code.localeCompare(b_code);
      
      // 3. 작업명 오름차순
      return a.title.localeCompare(b.title);
    });
  }, [logs, showCompleted, selectedDate]);

  // 총 시간 합계 계산
  const totalDurationSeconds = useMemo(() => {
    return groupedTasks.reduce((sum, task) => sum + task.total_duration, 0);
  }, [groupedTasks]);

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

  const handleRestart = (title: string, projectCode?: string, category?: string) => {
    startTimer(title, projectCode, category);
  };

  const getDuration = (log: TimerLog) => {
    // 점심시간 제외 적용
    return getDurationSecondsExcludingLunch(log.startTime, log.endTime, log.pausedDuration);
  };

  // timestamp를 datetime-local 형식으로 변환
  const timestampToDatetimeLocal = (timestamp: number | undefined): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    // 로컬 시간대 기준으로 YYYY-MM-DDTHH:MM 형식 생성
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // datetime-local 값을 timestamp로 변환
  const datetimeLocalToTimestamp = (value: string): number | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return date.getTime();
  };

  // 수정 핸들러
  const handleEditClick = (log: TimerLog) => {
    setEditingLog(log);
    setEditTitle(log.title);
    setEditProjectCode(log.projectCode || '');
    setEditCategory(log.category || null);
    setEditStartTime(timestampToDatetimeLocal(log.startTime));
    setEditEndTime(timestampToDatetimeLocal(log.endTime));
  };

  const handleEditSave = () => {
    if (editingLog && editTitle.trim()) {
      const newStartTime = datetimeLocalToTimestamp(editStartTime);
      const newEndTime = datetimeLocalToTimestamp(editEndTime);
      
      // 시작시간 유효성 검사
      if (!newStartTime) {
        alert('시작 시간을 입력해주세요.');
        return;
      }
      
      // 종료시간이 있는 경우 시작시간보다 뒤인지 확인
      if (newEndTime && newEndTime <= newStartTime) {
        alert('종료 시간은 시작 시간보다 뒤여야 합니다.');
        return;
      }
      
      updateLog(editingLog.id, {
        title: editTitle,
        projectCode: editProjectCode || undefined,
        category: editCategory || undefined,
        startTime: newStartTime,
        endTime: newEndTime
      });
      handleEditClose();
    }
  };

  const handleEditClose = () => {
    setEditingLog(null);
    setEditTitle('');
    setEditProjectCode('');
    setEditCategory(null);
    setEditStartTime('');
    setEditEndTime('');
  };

  // 인라인 제목 편집 시작
  const startInlineTitleEdit = (task: TaskGroup) => {
    setEditingInlineTitle(task.title);
    setInlineTitle(task.title);
  };

  // 인라인 제목 저장
  const saveInlineTitle = (task: TaskGroup) => {
    if (inlineTitle.trim() && inlineTitle !== task.title) {
      // 모든 세션의 제목 업데이트
      task.sessions.forEach(session => {
        updateLog(session.id, { title: inlineTitle.trim() });
      });
    }
    setEditingInlineTitle(null);
    setInlineTitle('');
  };

  // 인라인 제목 편집 취소
  const cancelInlineTitleEdit = () => {
    setEditingInlineTitle(null);
    setInlineTitle('');
  };

  // 인라인 프로젝트 코드 편집 시작
  const startInlineProjectEdit = (task: TaskGroup) => {
    setEditingInlineProject(task.title);
    setInlineProjectCode(task.projectCode || '');
  };

  // 인라인 프로젝트 코드 저장
  const saveInlineProject = (task: TaskGroup, newCode: string) => {
    // [코드] 이름 형태에서 코드 추출
    const match = newCode.match(/^\[([^\]]+)\]/);
    const code = match ? match[1] : newCode;
    
    if (code !== task.projectCode) {
      // 모든 세션의 프로젝트 코드 업데이트
      task.sessions.forEach(session => {
        updateLog(session.id, { projectCode: code || undefined });
      });
    }
    setEditingInlineProject(null);
    setInlineProjectCode('');
  };

  // 인라인 프로젝트 편집 취소
  const cancelInlineProjectEdit = () => {
    setEditingInlineProject(null);
    setInlineProjectCode('');
  };

  // 인라인 시간 편집 시작
  const startInlineTimeEdit = (session: TimerLog, field: 'start' | 'end') => {
    const timestamp = field === 'start' ? session.startTime : session.endTime;
    if (!timestamp && field === 'end') return; // 진행 중인 작업의 종료시간은 편집 불가
    
    setEditingSessionTime({ sessionId: session.id, field });
    const date = new Date(timestamp!);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    setInlineTimeValue(`${hours}:${minutes}`);
  };

  // 인라인 시간 저장 (충돌 시 자동 조정)
  const saveInlineTime = (session: TimerLog, field: 'start' | 'end', newTimeStr: string) => {
    if (!newTimeStr) {
      setEditingSessionTime(null);
      return;
    }
    
    // HH:mm 형태를 timestamp로 변환 (같은 날짜 유지)
    const [hours, minutes] = newTimeStr.split(':').map(Number);
    const baseDate = new Date(field === 'start' ? session.startTime : (session.endTime || session.startTime));
    baseDate.setHours(hours, minutes, 0, 0);
    const newTimestamp = baseDate.getTime();
    
    if (field === 'end') {
      // 종료 시간이 시작 시간보다 이전이면 무시
      if (newTimestamp <= session.startTime) {
        setEditingSessionTime(null);
        return;
      }
      
      // 다음 세션과 충돌 체크 및 자동 조정
      const task = groupedTasks.find(t => t.sessions.some(s => s.id === session.id));
      if (task) {
        const sessionIndex = task.sessions.findIndex(s => s.id === session.id);
        const nextSession = task.sessions[sessionIndex + 1];
        
        if (nextSession && newTimestamp > nextSession.startTime) {
          // 다음 세션의 시작 시간을 조정
          updateLog(nextSession.id, { startTime: newTimestamp });
        }
      }
      
      updateLog(session.id, { endTime: newTimestamp });
    } else {
      // 시작 시간 변경
      if (session.endTime && newTimestamp >= session.endTime) {
        setEditingSessionTime(null);
        return;
      }
      
      // 이전 세션과 충돌 체크 및 자동 조정
      const task = groupedTasks.find(t => t.sessions.some(s => s.id === session.id));
      if (task) {
        const sessionIndex = task.sessions.findIndex(s => s.id === session.id);
        const prevSession = task.sessions[sessionIndex - 1];
        
        if (prevSession && prevSession.endTime && newTimestamp < prevSession.endTime) {
          // 이전 세션의 종료 시간을 조정
          updateLog(prevSession.id, { endTime: newTimestamp });
        }
      }
      
      updateLog(session.id, { startTime: newTimestamp });
    }
    
    setEditingSessionTime(null);
  };

  // 인라인 시간 편집 취소
  const cancelInlineTimeEdit = () => {
    setEditingSessionTime(null);
    setInlineTimeValue('');
  };
  
  // 프로젝트 코드 입력 처리 (자동완성 선택 또는 직접 입력)
  const handleProjectCodeChange = (value: string) => {
    // [코드] 이름 형태에서 코드 추출
    const match = value.match(/^\[([^\]]+)\]/);
    if (match) {
      setEditProjectCode(match[1]);
    } else {
      setEditProjectCode(value);
    }
  };
  
  // 프로젝트 코드에서 표시용 문자열 생성
  const getProjectDisplayValue = (code: string) => {
    if (!code) return '';
    const name = getProjectName(code);
    if (name && name !== code) {
      return `[${code}] ${name}`;
    }
    return code;
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
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <Typography variant="h6">최근 업무 기록</Typography>
          {totalDurationSeconds > 0 && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
            >
              총 {formatDuration(totalDurationSeconds)}
            </Typography>
          )}
        </Box>
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
          gridTemplateColumns: '56px 140px 1fr 90px 130px 120px 60px 60px',
          gap: 1,
          px: 2,
          py: 1,
          bgcolor: 'var(--bg-secondary)',
          borderBottom: 1,
          borderColor: 'var(--border-color)',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-secondary)'
        }}>
          <Box></Box>
          <Box>프로젝트 코드</Box>
          <Box>기록명</Box>
          <Box>카테고리</Box>
          <Box>시간</Box>
          <Box>시작-종료</Box>
          <Box>세션</Box>
          <Box></Box>
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
                  gridTemplateColumns: '56px 140px 1fr 90px 130px 120px 60px 60px',
                  gap: 1,
                  px: 2,
                  py: 1.5,
                  alignItems: 'center',
                  borderBottom: 1,
                  borderColor: 'var(--border-color)',
                  bgcolor: activeTimer?.title === task.title ? 'var(--highlight-light)' : 'var(--card-bg)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    bgcolor: 'var(--bg-hover)',
                  }
                }}
              >
                {/* 좌측: 완료상태 토글 버튼 + 시작/재시작 버튼 */}
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.25 }}>
                  {/* 완료 상태 토글 버튼 */}
                  <Tooltip title={all_completed ? "완료 취소" : "모든 세션 완료됨"}>
                    <span>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (all_completed && task.sessions.length > 0) {
                            // 마지막 세션을 완료 취소
                            const lastSession = task.sessions[task.sessions.length - 1];
                            reopenTimer(lastSession.id);
                          }
                        }}
                        disabled={!all_completed}
                        sx={{ 
                          p: 0.25, 
                          color: all_completed ? 'success.main' : 'text.disabled',
                          '&:hover': { color: all_completed ? 'warning.main' : 'text.disabled' }
                        }}
                      >
                        {all_completed ? (
                          <CheckCircleIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  
                  {/* 시작/재시작/일시정지 버튼 */}
                  {(() => {
                    const is_active_task = activeTimer?.title === task.title;
                    const tooltip_text = is_active_task 
                      ? "일시정지 후 기록으로 이동" 
                      : all_completed 
                        ? "완료 취소 후 새 타이머 시작" 
                        : "이 업무로 새 타이머 시작";
                    
                    return (
                      <Tooltip title={tooltip_text}>
                        <span>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (is_active_task) {
                                // 진행중인 타이머 → 일시정지 후 logs로 이동
                                pauseAndMoveToLogs();
                              } else if (all_completed && task.sessions.length > 0) {
                                // 완료된 항목 → 완료 취소 후 새 타이머 시작
                                handleRestart(task.title, task.projectCode, task.category);
                              } else {
                                // 미완료 항목 → 새 타이머 시작
                                handleRestart(task.title, task.projectCode, task.category);
                              }
                            }}
                            sx={{ 
                              p: 0.25, 
                              color: is_active_task ? 'warning.main' : 'text.secondary',
                              '&:hover': { color: is_active_task ? 'warning.dark' : 'primary.main' }
                            }}
                          >
                            {is_active_task ? (
                              <PauseIcon sx={{ fontSize: 18 }} />
                            ) : (
                              <PlayArrowIcon sx={{ fontSize: 18 }} />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    );
                  })()}
                </Box>

                {/* 프로젝트 코드 */}
                <Box sx={{ overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                  {editingInlineProject === task.title ? (
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={projectOptions}
                      value={getProjectDisplayValue(inlineProjectCode)}
                      onInputChange={(_e, newValue) => setInlineProjectCode(newValue)}
                      onChange={(_e, newValue) => {
                        saveInlineProject(task, newValue || '');
                      }}
                      onBlur={() => saveInlineProject(task, inlineProjectCode)}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          variant="standard"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveInlineProject(task, inlineProjectCode);
                            } else if (e.key === 'Escape') {
                              cancelInlineProjectEdit();
                            }
                          }}
                          InputProps={{ ...params.InputProps, disableUnderline: true }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.7rem', p: 0 } }}
                        />
                      )}
                      sx={{ width: '100%' }}
                    />
                  ) : (
                    <Chip 
                      label={task.projectCode ? getProjectName(task.projectCode) : '-'} 
                      size="small" 
                      color={task.projectCode ? "primary" : "default"}
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        startInlineProjectEdit(task);
                      }}
                      sx={{ 
                        height: 22, 
                        fontSize: '0.7rem',
                        maxWidth: '100%',
                        cursor: 'pointer',
                        '& .MuiChip-label': {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }
                      }} 
                      title={task.projectCode ? `[${task.projectCode}] ${getProjectName(task.projectCode)} - 클릭하여 변경` : '클릭하여 프로젝트 설정'}
                    />
                  )}
                </Box>

                {/* 기록명 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                  {editingInlineTitle === task.title ? (
                    <TextField
                      size="small"
                      variant="standard"
                      value={inlineTitle}
                      onChange={(e) => setInlineTitle(e.target.value)}
                      onBlur={() => saveInlineTitle(task)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveInlineTitle(task);
                        } else if (e.key === 'Escape') {
                          cancelInlineTitleEdit();
                        }
                      }}
                      autoFocus
                      fullWidth
                      InputProps={{ disableUnderline: true }}
                      sx={{ 
                        '& .MuiInputBase-input': { 
                          fontSize: '0.875rem',
                          fontWeight: activeTimer?.title === task.title ? 600 : 500,
                          p: 0
                        }
                      }}
                    />
                  ) : (
                    <Typography 
                      variant="body2" 
                      onClick={() => startInlineTitleEdit(task)}
                      sx={{ 
                        fontWeight: activeTimer?.title === task.title ? 600 : 500, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        color: all_completed ? 'text.secondary' : 'text.primary',
                        textDecoration: all_completed ? 'line-through' : 'none',
                        cursor: 'text',
                        '&:hover': { bgcolor: 'action.hover', borderRadius: 0.5 }
                      }}
                      title={`${task.title} - 클릭하여 편집`}
                    >
                      {task.title}
                    </Typography>
                  )}
                </Box>

                {/* 카테고리 */}
                <Box>
                  {task.category && (
                    <Chip 
                      label={task.category} 
                      size="small" 
                      sx={{ 
                        height: 20, 
                        fontSize: '0.65rem', 
                        // bgcolor 제거 -> MUI default
                      }} 
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

                {/* 수정/삭제 버튼 */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25 }}>
                  <Tooltip title="상세 수정">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (task.sessions.length > 0) {
                          handleEditClick(task.sessions[0]);
                        }
                      }}
                      sx={{ 
                        p: 0.25, 
                        color: 'text.secondary',
                        '&:hover': { color: 'primary.main' }
                      }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="이 업무의 모든 세션 삭제">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        // 활성 타이머가 이 작업이면 삭제 불가
                        if (activeTimer?.title === task.title) {
                          return;
                        }
                        // 모든 세션 삭제
                        task.sessions.forEach(session => {
                          deleteLog(session.id);
                        });
                      }}
                      disabled={activeTimer?.title === task.title}
                      sx={{ 
                        p: 0.25, 
                        color: 'text.secondary',
                        '&:hover': { color: 'error.main' },
                        '&.Mui-disabled': { color: 'text.disabled' }
                      }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* 세션 상세 (펼침) */}
              <Collapse in={is_expanded}>
                <Box sx={{ bgcolor: 'var(--bg-tertiary)', py: 1, px: 2, borderBottom: 1, borderColor: 'var(--border-color)' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    작업 이력 (총 {task.sessions.length}회 작업)
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 40, py: 0.5 }}>#</TableCell>
                          <TableCell sx={{ width: 100, py: 0.5 }}>날짜</TableCell>
                          <TableCell sx={{ width: 120, py: 0.5 }}>시작 시간</TableCell>
                          <TableCell sx={{ width: 120, py: 0.5 }}>종료 시간</TableCell>
                          <TableCell sx={{ width: 80, py: 0.5 }}>소요 시간</TableCell>
                          <TableCell sx={{ width: 80, py: 0.5 }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {task.sessions.map((session, idx) => (
                          <TableRow key={session.id} hover>
                            <TableCell sx={{ py: 0.5 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ py: 0.5 }}>{formatDate(session.startTime)}</TableCell>
                            <TableCell 
                              sx={{ py: 0.5, cursor: 'pointer' }}
                              onClick={() => startInlineTimeEdit(session, 'start')}
                            >
                              {editingSessionTime?.sessionId === session.id && editingSessionTime.field === 'start' ? (
                                <TextField
                                  type="time"
                                  size="small"
                                  variant="standard"
                                  value={inlineTimeValue}
                                  onChange={(e) => setInlineTimeValue(e.target.value)}
                                  onBlur={() => saveInlineTime(session, 'start', inlineTimeValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveInlineTime(session, 'start', inlineTimeValue);
                                    } else if (e.key === 'Escape') {
                                      cancelInlineTimeEdit();
                                    }
                                  }}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                  InputProps={{ disableUnderline: true }}
                                  sx={{ 
                                    width: 110,
                                    '& input': { 
                                      fontSize: '0.8rem', 
                                      p: 0,
                                      color: themeConfig.isDark ? '#fff' : 'inherit',
                                      '&::-webkit-calendar-picker-indicator': {
                                        filter: themeConfig.isDark ? 'invert(1)' : 'none'
                                      }
                                    }
                                  }}
                                />
                              ) : (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontSize: '0.8rem',
                                    '&:hover': { bgcolor: 'action.hover', borderRadius: 0.5, px: 0.5 }
                                  }}
                                >
                                  {formatTime(session.startTime)}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell 
                              sx={{ py: 0.5, cursor: session.endTime ? 'pointer' : 'default' }}
                              onClick={() => session.endTime && startInlineTimeEdit(session, 'end')}
                            >
                              {editingSessionTime?.sessionId === session.id && editingSessionTime.field === 'end' ? (
                                <TextField
                                  type="time"
                                  size="small"
                                  variant="standard"
                                  value={inlineTimeValue}
                                  onChange={(e) => setInlineTimeValue(e.target.value)}
                                  onBlur={() => saveInlineTime(session, 'end', inlineTimeValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveInlineTime(session, 'end', inlineTimeValue);
                                    } else if (e.key === 'Escape') {
                                      cancelInlineTimeEdit();
                                    }
                                  }}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                  InputProps={{ disableUnderline: true }}
                                  sx={{ 
                                    width: 110,
                                    '& input': { 
                                      fontSize: '0.8rem', 
                                      p: 0,
                                      color: themeConfig.isDark ? '#fff' : 'inherit',
                                      '&::-webkit-calendar-picker-indicator': {
                                        filter: themeConfig.isDark ? 'invert(1)' : 'none'
                                      }
                                    }
                                  }}
                                />
                              ) : session.endTime ? (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontSize: '0.8rem',
                                    '&:hover': { bgcolor: 'action.hover', borderRadius: 0.5, px: 0.5 }
                                  }}
                                >
                                  {formatTime(session.endTime)}
                                </Typography>
                              ) : session.status === 'RUNNING' ? (
                                <Chip 
                                  label="진행 중" 
                                  size="small" 
                                  color="primary"
                                  sx={{ 
                                    height: 18, 
                                    fontSize: '0.65rem',
                                    color: 'white'
                                  }}
                                />
                              ) : (
                                // PAUSED 상태: lastPausedAt을 종료 시간으로 표시
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontSize: '0.8rem',
                                    color: 'warning.main',
                                    fontWeight: 500
                                  }}
                                >
                                  {session.lastPausedAt ? formatTime(session.lastPausedAt) : '일시정지'}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              {Math.floor(getDuration(session) / 60)}분
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {/* 완료된 세션에만 재진행 버튼 표시 */}
                                {session.status === 'COMPLETED' && (
                                  <Tooltip title="새 세션으로 다시 시작 (현재 시간 기준)">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => {
                                        // 기존 activeTimer는 startTimer 내부에서 자동으로 logs로 이동됨
                                        // 새 세션을 현재 시간으로 시작
                                        startTimer(session.title, session.projectCode, session.category);
                                      }}
                                      sx={{ p: 0.25, color: 'success.main' }}
                                      aria-label="재진행"
                                    >
                                      <PlayCircleOutlineIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="수정">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleEditClick(session)}
                                    sx={{ p: 0.25 }}
                                    aria-label="수정"
                                  >
                                    <EditIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="삭제">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => deleteLog(session.id)}
                                    sx={{ p: 0.25 }}
                                    aria-label="삭제"
                                  >
                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
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
              <Autocomplete
                freeSolo
                options={projectOptions}
                value={getProjectDisplayValue(editProjectCode)}
                onInputChange={(_e, newValue) => handleProjectCodeChange(newValue)}
                renderInput={(params) => <TextField {...params} label="프로젝트 코드" />}
                sx={{ flex: 1 }}
              />
              <CategoryAutocomplete
                value={editCategory}
                onChange={(newValue) => setEditCategory(newValue)}
                label="카테고리"
                variant="outlined"
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="시작 시간"
                type="datetime-local"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="종료 시간"
                type="datetime-local"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                helperText={editingLog?.status !== 'COMPLETED' ? '진행 중인 작업은 종료 시간이 없습니다' : ''}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>취소</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">저장(Enter)</Button>
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
                    .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0))
                    .map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {log.projectCode && (
                            <Chip label={getProjectName(log.projectCode)} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                          <Typography variant="body2">{log.title}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {log.category && (
                          <Chip label={log.category} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'var(--bg-tertiary)' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {log.deletedAt ? new Date(log.deletedAt).toLocaleString('ko-KR') : '-'}
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

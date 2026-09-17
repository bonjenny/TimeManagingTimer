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
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PauseIcon from '@mui/icons-material/Pause';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestoreIcon from '@mui/icons-material/Restore';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTimerStore, TimerLog, DeletedLog } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import NewProjectDialog from '../common/NewProjectDialog';
import { NEW_PROJECT_OPTION, filterProjectCodeOptions, renderNewProjectOption, renderProjectOption } from '../common/projectOptions';
import { formatDuration, formatDurationShort, getDurationSecondsExcludingLunch } from '../../utils/timeUtils';
import { getItem, setItem as setStorageItem } from '../../utils/storage';
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

// 시작시간이 선택된 날짜 범위 밖이면 날짜 포함 (M/D HH:mm)
const formatTimeWithDate = (timestamp: number, date_range: { start: number; end: number }) => {
  const date = new Date(timestamp);
  const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  // 선택된 날짜 범위 밖이면 날짜 표시
  if (timestamp < date_range.start) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day} ${timeStr}`;
  }
  return timeStr;
};

// 짧은 날짜 포맷 (M/D) - 모바일 작업 이력용
const formatShortDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// 날짜 포맷 (YYYY-MM-DD)
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
};

// title+category로 그룹 키 생성
const makeGroupKey = (title: string, category?: string) => `${title}||${category || ''}`;

// 그룹화된 업무 타입
interface TaskGroup {
  group_key: string;
  title: string;
  projectCode?: string;
  category?: string;
  note?: string;
  sessions: TimerLog[];
  total_duration: number; // 초 단위 (해당 업무의 전체 작업 시간)
  today_duration: number; // 초 단위 (오늘 날짜 범위 내 작업 시간)
  first_start: number;
  last_end: number | undefined;
  has_running: boolean;
}

const TimerList: React.FC<TimerListProps> = ({ selectedDate }) => {
  const { logs, deleteLog, startTimer, updateLog, updateActiveTimer, deleted_logs, restoreLog, permanentlyDeleteLog, emptyTrash, reopenTimer, activeTimer, pauseAndMoveToLogs, themeConfig } = useTimerStore();
  const { getProjectName, projects, addProject, deleteProject } = useProjectStore();
  const theme = useTheme();
  const is_compact = useMediaQuery(theme.breakpoints.down('md')); // md 미만: 카드 목록 레이아웃
  // 모바일 ⋮ 메뉴 상태
  const [task_menu, setTaskMenu] = useState<{ anchor: HTMLElement; group_key: string } | null>(null);
  const [session_menu, setSessionMenu] = useState<{ anchor: HTMLElement; session_id: string } | null>(null);
  const [showCompleted, setShowCompleted] = useState(() => {
    const saved = getItem('timerlist-show-completed');
    return saved !== null ? saved === 'true' : true;
  });
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // 수정 모달 상태
  const [editingLog, setEditingLog] = useState<TimerLog | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editProjectCode, setEditProjectCode] = useState('');
  const [editProjectName, setEditProjectName] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  
  // 인라인 편집 상태
  const [editingInlineTitle, setEditingInlineTitle] = useState<string | null>(null); // 편집 중인 task.title
  const [inlineTitle, setInlineTitle] = useState('');
  const [editingInlineProject, setEditingInlineProject] = useState<string | null>(null); // 편집 중인 task.title
  const [inlineProjectCode, setInlineProjectCode] = useState('');
  // 목록에 없는 코드를 인라인으로 넣었을 때 이름을 물어보는 창
  const [new_project_code, setNewProjectCode] = useState('');
  const [editingInlineCategory, setEditingInlineCategory] = useState<string | null>(null); // 편집 중인 task.title
  const [inlineCategory, setInlineCategory] = useState<string | null>(null);
  
  // 인라인 시간 편집 상태
  const [editingSessionTime, setEditingSessionTime] = useState<{
    sessionId: string;
    field: 'start' | 'end';
  } | null>(null);
  const [inlineTimeValue, setInlineTimeValue] = useState('');
  
  // 인라인 비고 편집 상태
  const [editingSessionNote, setEditingSessionNote] = useState<string | null>(null);
  const [inlineNoteValue, setInlineNoteValue] = useState('');
  
  // 프로젝트 옵션 (코드 + 이름 형태로 표시)
  const projectCodeOptions = useMemo(() => projects.map((p) => p.code), [projects]);
  const projectNameOptions = useMemo(() => projects.map((p) => p.name), [projects]);

  const projectOptions = useMemo(() => {
    return projects.map(p => `[${p.code}] ${p.name}`);
  }, [projects]);

  // 복사 다이얼로그 상태
  const [copyingTask, setCopyingTask] = useState<TaskGroup | null>(null);
  const [copyCategory, setCopyCategory] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState<string>('');

  // 휴지통 모달 상태
  const [trash_modal_open, setTrashModalOpen] = useState(false);

  // 세션 정렬 상태 (asc: 오래된 순, desc: 최근 순)
  const [session_sort_order, setSessionSortOrder] = useState<'asc' | 'desc'>(() => {
    const saved = getItem('timerlist-session-sort-order');
    return (saved === 'asc' || saved === 'desc') ? saved : 'asc';
  });

  // 오늘인지 확인 (useMemo 전에 계산)
  const now = new Date();
  let todayForCheck = new Date(now);
  if (now.getHours() < DAY_START_HOUR) {
    todayForCheck.setDate(todayForCheck.getDate() - 1);
  }
  const is_today = 
    selectedDate.getFullYear() === todayForCheck.getFullYear() &&
    selectedDate.getMonth() === todayForCheck.getMonth() &&
    selectedDate.getDate() === todayForCheck.getDate();

  // 로그를 제목별로 그룹화 (선택된 날짜만)
  const groupedTasks = useMemo(() => {
    const date_range = getDateRange(selectedDate);
    
    const filtered_logs = logs.filter(log => {
      if (log.status === 'SCHEDULED') return false;

      // 미완료 상태(PAUSED, RUNNING)는 오늘 날짜에서 항상 표시
      const is_incomplete = log.status === 'PAUSED' || log.status === 'RUNNING';
      
      if (is_today && is_incomplete) {
        if (!showCompleted && log.status === 'COMPLETED') return false;
        return true;
      }
      
      // 그 외에는 기존 날짜 필터링 적용
      if (log.startTime < date_range.start || log.startTime >= date_range.end) {
        return false;
      }
      if (!showCompleted && log.status === 'COMPLETED') return false;
      return true;
    });

    // 제목+카테고리별로 그룹화
    const groups = new Map<string, TaskGroup>();
    
    filtered_logs.forEach(log => {
      const key = makeGroupKey(log.title, log.category);
      const existing = groups.get(key);
      
      const get_duration = (l: TimerLog) => {
        const effectiveEndTime = l.endTime || l.lastPausedAt || l.startTime;
        return getDurationSecondsExcludingLunch(l.startTime, effectiveEndTime, l.pausedDuration);
      };
      
      // 세션이 오늘 날짜 범위에 해당하는지 확인
      const is_in_today_range = log.startTime >= date_range.start && log.startTime < date_range.end;
      const duration = get_duration(log);
      
      if (existing) {
        existing.sessions.push(log);
        existing.total_duration += duration;
        if (is_in_today_range) {
          existing.today_duration += duration;
        }
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
        if (log.projectCode) existing.projectCode = log.projectCode;
        if (log.note) existing.note = log.note;
      } else {
        groups.set(key, {
          group_key: key,
          title: log.title,
          projectCode: log.projectCode,
          category: log.category,
          note: log.note,
          sessions: [log],
          total_duration: duration,
          today_duration: is_in_today_range ? duration : 0,
          first_start: log.startTime,
          last_end: log.endTime,
          has_running: log.status === 'RUNNING' || log.status === 'PAUSED'
        });
      }
    });

    // activeTimer가 있으면 해당 그룹에 반영 (first_start 업데이트)
    if (activeTimer) {
      const date_range_check = activeTimer.startTime >= date_range.start && activeTimer.startTime < date_range.end;
      if (date_range_check) {
        const active_key = makeGroupKey(activeTimer.title, activeTimer.category);
        const existingGroup = groups.get(active_key);
        if (existingGroup) {
          if (activeTimer.startTime < existingGroup.first_start) {
            existingGroup.first_start = activeTimer.startTime;
          }
          existingGroup.has_running = true;
          existingGroup.last_end = undefined;
          if (activeTimer.note) existingGroup.note = activeTimer.note;
        } else {
          groups.set(active_key, {
            group_key: active_key,
            title: activeTimer.title,
            projectCode: activeTimer.projectCode,
            category: activeTimer.category,
            note: activeTimer.note,
            sessions: [],
            total_duration: 0,
            today_duration: 0,
            first_start: activeTimer.startTime,
            last_end: undefined,
            has_running: true
          });
        }
      }
    }

    // 세션들을 시작 시간순으로 정렬
    groups.forEach(group => {
      group.sessions.sort((a, b) => a.startTime - b.startTime);
    });

    // 미완료 업무는 전체 logs에서 같은 제목+카테고리의 가장 이른 startTime으로 first_start 업데이트
    groups.forEach(group => {
      if (group.has_running) {
        const all_sessions_for_group = logs.filter(log => log.title === group.title && (log.category || '') === (group.category || ''));
        if (all_sessions_for_group.length > 0) {
          const earliest_start = Math.min(...all_sessions_for_group.map(s => s.startTime));
          if (earliest_start < group.first_start) {
            group.first_start = earliest_start;
          }
        }
      }
    });

    // 총시간을 선택된 날짜까지의 전체 누적시간으로 재계산
    // dailyGroupKey가 있는 작업은 같은 키끼리만 합산
    groups.forEach(group => {
      const reference_daily_key = group.sessions[0]?.dailyGroupKey;
      const all_sessions_for_group = logs.filter(log =>
        log.title === group.title && (log.category || '') === (group.category || '') &&
        log.startTime < date_range.end &&
        (!reference_daily_key || log.dailyGroupKey === reference_daily_key)
      );
      group.total_duration = all_sessions_for_group.reduce((sum, log) => {
        const effectiveEndTime = log.endTime || log.lastPausedAt || log.startTime;
        return sum + getDurationSecondsExcludingLunch(log.startTime, effectiveEndTime, log.pausedDuration);
      }, 0);
    });

    // 정렬: 진행 중 우선 → 미완료 우선 → 프로젝트 코드 오름차순 → 작업명 오름차순
    return Array.from(groups.values()).sort((a, b) => {
      const active_key = activeTimer ? makeGroupKey(activeTimer.title, activeTimer.category) : '';
      const a_is_active = active_key === a.group_key;
      const b_is_active = active_key === b.group_key;
      
      if (a_is_active && !b_is_active) return -1; // a가 진행 중 → a 우선
      if (!a_is_active && b_is_active) return 1;  // b가 진행 중 → b 우선
      
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
  }, [logs, showCompleted, selectedDate, activeTimer, is_today]);

  // 총 시간 합계 계산 (상단 헤더는 오늘 시간 합계)
  const totalDurationSeconds = useMemo(() => {
    return groupedTasks.reduce((sum, task) => sum + task.today_duration, 0);
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

  const handleRestart = (title: string, projectCode?: string, category?: string, note?: string, dailyGroupKey?: string) => {
    startTimer(title, projectCode, category, note, dailyGroupKey);
  };

  // ---- 업무 그룹 액션 (데스크톱 아이콘 / 모바일 ⋮ 메뉴 공용) ----
  const handleToggleTaskComplete = (task: TaskGroup, all_completed: boolean) => {
    if (all_completed && task.sessions.length > 0) {
      // 완료된 작업 → 마지막 세션을 완료 취소
      const lastSession = task.sessions[task.sessions.length - 1];
      reopenTimer(lastSession.id);
    } else if (!all_completed && task.sessions.length > 0) {
      // 미완료 작업 → 모든 세션을 완료 상태로 변경
      task.sessions.forEach(session => {
        if (session.status !== 'COMPLETED') {
          updateLog(session.id, { 
            status: 'COMPLETED', 
            endTime: session.endTime || session.lastPausedAt || Date.now() 
          });
        }
      });
    }
  };

  const handlePlayPauseTask = (task: TaskGroup, is_active_task: boolean) => {
    if (is_active_task) {
      // 진행중인 타이머 → 일시정지 후 logs로 이동
      pauseAndMoveToLogs();
    } else {
      // 완료/미완료 항목 → 같은 업무로 새 타이머 시작
      handleRestart(task.title, task.projectCode, task.category, task.note, task.sessions[0]?.dailyGroupKey);
    }
  };

  const openCopyDialog = (task: TaskGroup) => {
    setCopyingTask(task);
    setCopyCategory(task.category || null);
    setCopyNote('');
  };

  const handleEditTask = (task: TaskGroup, is_active_task: boolean) => {
    if (is_active_task && activeTimer) {
      handleEditClick(activeTimer);
    } else if (task.sessions.length > 0) {
      handleEditClick(task.sessions[0]);
    }
  };

  const handleDeleteTask = (task: TaskGroup, is_active_task: boolean) => {
    if (is_active_task) {
      return;
    }
    task.sessions.forEach(session => {
      deleteLog(session.id);
    });
  };

  const handleRestartSession = (session: TimerLog) => {
    // 기존 activeTimer는 startTimer 내부에서 자동으로 logs로 이동됨
    // 새 세션을 현재 시간으로 시작
    startTimer(session.title, session.projectCode, session.category, session.note, session.dailyGroupKey);
  };

  const getSortedSessions = (task: TaskGroup) => (
    session_sort_order === 'desc' ? [...task.sessions].reverse() : task.sessions
  );

  const handleCopyWithCategory = () => {
    if (!copyingTask) return;

    startTimer(
      copyingTask.title,
      copyingTask.projectCode,
      copyCategory || undefined,
      copyNote || undefined,
      copyingTask.sessions[0]?.dailyGroupKey
    );

    setCopyingTask(null);
    setCopyCategory(null);
    setCopyNote('');
  };

  const getDuration = (log: TimerLog) => {
    // 점심시간 제외 적용
    // PAUSED 상태에서 endTime이 없으면 lastPausedAt 사용
    const effectiveEndTime = log.endTime || log.lastPausedAt || log.startTime;
    return getDurationSecondsExcludingLunch(log.startTime, effectiveEndTime, log.pausedDuration);
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
    setEditProjectName(log.projectCode ? (projects.find((p) => p.code === log.projectCode)?.name ?? '') : '');
    setEditCategory(log.category || null);
    setEditNote(log.note || '');
    setEditStartTime(timestampToDatetimeLocal(log.startTime));
    setEditEndTime(timestampToDatetimeLocal(log.endTime));
  };

  const handleEditSave = () => {
    if (editingLog && editTitle.trim()) {
      // 코드와 이름을 모두 넣었으면 프로젝트 목록에 등록/갱신
      if (editProjectCode.trim() && editProjectName.trim()) {
        addProject({ code: editProjectCode.trim(), name: editProjectName.trim() });
      }
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
      
      // 진행 중인 작업(activeTimer)인 경우 updateActiveTimer 사용
      if (activeTimer && activeTimer.id === editingLog.id) {
        updateActiveTimer({
          title: editTitle,
          projectCode: editProjectCode || undefined,
          category: editCategory || undefined,
          note: editNote.trim() || undefined,
          startTime: newStartTime,
        });
      } else {
        updateLog(editingLog.id, {
          title: editTitle,
          projectCode: editProjectCode || undefined,
          category: editCategory || undefined,
          note: editNote.trim() || undefined,
          startTime: newStartTime,
          endTime: newEndTime
        });
      }
      handleEditClose();
    }
  };

  const handleEditClose = () => {
    setEditingLog(null);
    setEditProjectName('');
    setEditTitle('');
    setEditProjectCode('');
    setEditCategory(null);
    setEditNote('');
    setEditStartTime('');
    setEditEndTime('');
  };

  // 인라인 제목 편집 시작
  const startInlineTitleEdit = (task: TaskGroup) => {
    setEditingInlineTitle(task.group_key);
    setInlineTitle(task.title);
  };

  // 인라인 제목 저장
  const saveInlineTitle = (task: TaskGroup) => {
    if (inlineTitle.trim() && inlineTitle !== task.title) {
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
    setEditingInlineProject(task.group_key);
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
    // 목록에 없는 코드면 이름을 받아 새 프로젝트로 등록할 수 있게 한다
    if (code && !projects.some((p) => p.code === code)) {
      setNewProjectCode(code);
      }
    setEditingInlineProject(null);
    setInlineProjectCode('');
  };

  // 인라인 프로젝트 편집 취소
  const cancelInlineProjectEdit = () => {
    setEditingInlineProject(null);
    setInlineProjectCode('');
  };

  // 인라인 카테고리 편집 시작
  const startInlineCategoryEdit = (task: TaskGroup) => {
    setEditingInlineCategory(task.group_key);
    setInlineCategory(task.category || null);
  };

  // 인라인 카테고리 저장
  const saveInlineCategory = (task: TaskGroup, newCategory: string | null) => {
    if (newCategory !== task.category) {
      // 모든 세션의 카테고리 업데이트
      task.sessions.forEach(session => {
        updateLog(session.id, { category: newCategory || undefined });
      });
    }
    setEditingInlineCategory(null);
    setInlineCategory(null);
  };

  // 인라인 카테고리 편집 취소
  const cancelInlineCategoryEdit = () => {
    setEditingInlineCategory(null);
    setInlineCategory(null);
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

  // 인라인 비고 편집 시작
  const startInlineNoteEdit = (session: TimerLog) => {
    setEditingSessionNote(session.id);
    setInlineNoteValue(session.note || '');
  };

  // 인라인 비고 저장
  const saveInlineNote = (session: TimerLog) => {
    if (inlineNoteValue.trim() !== (session.note || '')) {
      updateLog(session.id, { note: inlineNoteValue.trim() || undefined });
    }
    setEditingSessionNote(null);
  };

  // 인라인 비고 편집 취소
  const cancelInlineNoteEdit = () => {
    setEditingSessionNote(null);
  };

  // 세션 정렬 토글
  const toggleSessionSortOrder = () => {
    const new_order = session_sort_order === 'asc' ? 'desc' : 'asc';
    setSessionSortOrder(new_order);
    setStorageItem('timerlist-session-sort-order', new_order);
  };
  
  // 프로젝트 코드 입력 처리 (자동완성 선택 또는 직접 입력)
  // 이름을 고르면 코드도 채운다 (이름을 지워도 코드는 남긴다)
  const handleProjectNameChange = (value: string) => {
    setEditProjectName(value);
    if (!value) return;
    const matched = projects.find((p) => p.name === value);
    if (matched) setEditProjectCode(matched.code);
  };

  const handleProjectCodeChange = (value: string) => {
    // [코드] 이름 형태에서 코드 추출
    const match = value.match(/^\[([^\]]+)\]/);
    const code = match ? match[1] : value;
    setEditProjectCode(code);
    // 아는 코드면 이름도 채운다. 코드를 지워도 이름은 남긴다.
    const matched = projects.find((p) => p.code === code);
    if (matched) setEditProjectName(matched.name);
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

  // 선택된 날짜 로그 확인 (미완료 업무 포함)
  const date_range = getDateRange(selectedDate);
  const date_logs = logs.filter(log => {
    // 미완료 상태는 오늘일 때 항상 포함
    const is_incomplete = log.status === 'PAUSED' || log.status === 'RUNNING';
    if (is_today && is_incomplete) {
      return true;
    }
    return log.startTime >= date_range.start && log.startTime < date_range.end;
  });

  if (date_logs.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">
          {is_today ? '오늘 기록된 업무가 없습니다.' : '해당 날짜에 기록된 업무가 없습니다.'}
        </Typography>
      </Box>
    );
  }

  // ---- 행 표시 조각 (데스크톱 grid / 모바일 카드 공용) ----
  const renderTaskProject = (task: TaskGroup, compact: boolean) => (
    editingInlineProject === task.group_key ? (
      <Autocomplete
        freeSolo
        size="small"
        options={projectCodeOptions}
        // value 대신 inputValue 만 제어한다 — value 가 입력값과 같으면 MUI 가 목록을 거르지 않는다
        value={null}
        inputValue={inlineProjectCode}
        filterOptions={(options, state) => filterProjectCodeOptions(options, state.inputValue, projects)}
        onInputChange={(_e, newValue) => setInlineProjectCode(newValue)}
        onChange={(_e, newValue) => {
          const value = newValue || '';
          // 새 프로젝트 줄을 골랐으면 코드만 적용하고 이름 받는 창을 띄운다 (saveInlineProject 가 처리)
          const code = value.startsWith(NEW_PROJECT_OPTION) ? value.slice(NEW_PROJECT_OPTION.length) : value;
          saveInlineProject(task, code);
        }}
        onBlur={() => saveInlineProject(task, inlineProjectCode)}
        renderOption={(props, option) =>
          option.startsWith(NEW_PROJECT_OPTION)
            ? renderNewProjectOption(props, option.slice(NEW_PROJECT_OPTION.length))
            : renderProjectOption(props, option, projects.find((p) => p.code === option)?.name, () => deleteProject(option))
        }
        // 목록 칸이 좁아 글자가 세 줄로 접히던 문제 — 드롭다운만 넓게
        componentsProps={{ popper: { style: { width: 300 }, placement: 'bottom-start' } }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            autoFocus
            placeholder="코드 입력 / 선택"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveInlineProject(task, inlineProjectCode);
              } else if (e.key === 'Escape') {
                cancelInlineProjectEdit();
              }
            }}
            InputProps={{ ...params.InputProps, disableUnderline: true }}
            sx={{ '& .MuiInputBase-input': { fontSize: compact ? 16 : '0.7rem', p: 0 } }}
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
    )
  );

  const renderTaskTitle = (task: TaskGroup, is_active_task: boolean, all_completed: boolean, compact: boolean) => (
    editingInlineTitle === task.group_key ? (
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
            fontSize: compact ? 16 : '0.875rem',
            fontWeight: is_active_task ? 600 : 500,
            p: 0
          }
        }}
      />
    ) : (
      <Typography
        variant="body2"
        onClick={() => startInlineTitleEdit(task)}
        sx={{
          fontWeight: is_active_task ? 600 : 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: all_completed ? 'text.secondary' : 'text.primary',
          textDecoration: all_completed ? 'line-through' : 'none',
          cursor: 'text',
          '&:hover': { bgcolor: 'action.hover', borderRadius: 0.5 },
          // 모바일: 15px/600, 2줄까지 줄바꿈
          ...(compact && {
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.35,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }),
        }}
        title={`${task.title} - 클릭하여 편집`}
      >
        {task.title}
      </Typography>
    )
  );

  const renderTaskCategory = (task: TaskGroup, compact: boolean) => (
    editingInlineCategory === task.group_key ? (
      <CategoryAutocomplete
        value={inlineCategory}
        onChange={(newValue) => {
          saveInlineCategory(task, newValue);
        }}
        size="small"
        variant="standard"
        autoFocus
        onBlur={() => cancelInlineCategoryEdit()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            cancelInlineCategoryEdit();
          }
        }}
        sx={{
          width: compact ? 160 : '100%',
          '& .MuiInputBase-input': { fontSize: compact ? 16 : '0.65rem', p: 0 }
        }}
      />
    ) : (
      <Chip
        label={task.category || '-'}
        size="small"
        color={task.category ? "default" : "default"}
        onClick={(e) => {
          e.stopPropagation();
          startInlineCategoryEdit(task);
        }}
        sx={{
          height: 20,
          fontSize: '0.65rem',
          cursor: 'pointer',
          ...(compact && { maxWidth: '100%' }),
        }}
        title={task.category ? `${task.category} - 클릭하여 변경` : '클릭하여 카테고리 설정'}
      />
    )
  );

  // ---- 세션 인라인 편집 조각 (데스크톱 표 / 모바일 목록 공용) ----
  const session_text_size = (compact: boolean) => (compact ? 13 : '0.8rem');
  const session_input_size = (compact: boolean) => (compact ? 16 : '0.8rem');

  const renderSessionTimeEditor = (session: TimerLog, field: 'start' | 'end', compact: boolean) => (
    <TextField
      type="time"
      size="small"
      variant="standard"
      value={inlineTimeValue}
      onChange={(e) => setInlineTimeValue(e.target.value)}
      onBlur={() => saveInlineTime(session, field, inlineTimeValue)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          saveInlineTime(session, field, inlineTimeValue);
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
          fontSize: session_input_size(compact),
          p: 0,
          color: themeConfig.isDark ? '#fff' : 'inherit',
          '&::-webkit-calendar-picker-indicator': {
            filter: themeConfig.isDark ? 'invert(1)' : 'none'
          }
        }
      }}
    />
  );

  const renderSessionStart = (session: TimerLog, compact: boolean) => (
    editingSessionTime?.sessionId === session.id && editingSessionTime.field === 'start' ? (
      renderSessionTimeEditor(session, 'start', compact)
    ) : (
      <Typography
        variant="body2"
        sx={{
          fontSize: session_text_size(compact),
          '&:hover': { bgcolor: 'action.hover', borderRadius: 0.5, px: 0.5 }
        }}
      >
        {formatTime(session.startTime)}
      </Typography>
    )
  );

  const renderSessionEnd = (session: TimerLog, compact: boolean) => (
    editingSessionTime?.sessionId === session.id && editingSessionTime.field === 'end' ? (
      renderSessionTimeEditor(session, 'end', compact)
    ) : session.endTime ? (
      <Typography
        variant="body2"
        sx={{
          fontSize: session_text_size(compact),
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
      // PAUSED 상태: lastPausedAt 또는 endTime을 종료 시간으로 표시 (기존 데이터 호환)
      <Typography
        variant="body2"
        sx={{
          fontSize: session_text_size(compact),
          color: 'warning.main',
          fontWeight: 500
        }}
      >
        {formatTime(session.lastPausedAt || session.endTime || session.startTime)}
      </Typography>
    )
  );

  const renderSessionNote = (session: TimerLog, compact: boolean) => (
    editingSessionNote === session.id ? (
      <TextField
        size="small"
        variant="standard"
        value={inlineNoteValue}
        onChange={(e) => setInlineNoteValue(e.target.value)}
        onBlur={() => saveInlineNote(session)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            saveInlineNote(session);
          } else if (e.key === 'Escape') {
            cancelInlineNoteEdit();
          }
        }}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        InputProps={{ disableUnderline: true }}
        sx={{
          width: '100%',
          '& input': {
            fontSize: session_input_size(compact),
            p: 0,
            color: themeConfig.isDark ? '#fff' : 'inherit'
          }
        }}
      />
    ) : (
      <Typography
        variant="body2"
        sx={{
          fontSize: session_text_size(compact),
          color: session.note ? 'text.primary' : 'text.disabled',
          minHeight: 20,
          '&:hover': { bgcolor: 'action.hover', borderRadius: 0.5, px: 0.5 }
        }}
      >
        {session.note || '비고 추가'}
      </Typography>
    )
  );

  const show_completed_switch = (
    <FormControlLabel
      control={
        <Switch
          checked={showCompleted}
          onChange={(e) => {
            const new_value = e.target.checked;
            setShowCompleted(new_value);
            setStorageItem('timerlist-show-completed', String(new_value));
          }}
          size="small"
        />
      }
      label={<Typography variant="body2" color="text.secondary">완료된 항목 보기</Typography>}
    />
  );

  const trash_button = (
    <Tooltip title={`휴지통 (${deleted_logs.length})`}>
      <IconButton
        size="small"
        onClick={() => setTrashModalOpen(true)}
        sx={{
          color: deleted_logs.length > 0 ? 'warning.main' : 'text.secondary',
          ...(is_compact && { width: 40, height: 40 }),
        }}
      >
        <RestoreFromTrashIcon />
      </IconButton>
    </Tooltip>
  );

  return (
    <Box>
      {is_compact ? (
        // 모바일: 1줄 = 제목 + 합계, 2줄 = 완료 항목 스위치 + 휴지통
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap' }}>최근 업무 기록</Typography>
            {totalDurationSeconds > 0 && (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                오늘 <Box component="span" sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>{formatDurationShort(totalDurationSeconds)}</Box>
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {show_completed_switch}
            {trash_button}
          </Box>
        </Box>
      ) : (
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
          {show_completed_switch}
          {trash_button}
        </Box>
      </Box>
      )}

      <Paper
        variant="outlined"
        sx={is_compact
          // 모바일: 바깥 테두리 없이 카드 목록
          ? { border: 'none', bgcolor: 'transparent', display: 'flex', flexDirection: 'column', gap: 1 }
          : { borderRadius: 2, overflow: 'visible' }}
      >
        {/* 헤더 */}
        {!is_compact && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: '56px 140px 1fr 90px 110px 110px 130px 50px 50px',
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
          <Box sx={{ color: 'var(--text-primary)', fontWeight: 700 }}>오늘시간</Box>
          <Box sx={{ color: 'var(--text-secondary)', fontWeight: 400 }}>총시간</Box>
          <Box>시작-종료</Box>
          <Box>세션</Box>
          <Box></Box>
        </Box>
        )}

        {/* 업무 목록 */}
        {groupedTasks.map((task) => {
          const is_expanded = expandedTasks.has(task.group_key);
          const active_group_key = activeTimer ? makeGroupKey(activeTimer.title, activeTimer.category) : '';
          const is_active_task = active_group_key === task.group_key;
          const all_completed = !is_active_task && task.sessions.every(s => s.status === 'COMPLETED');
          const is_highlighted = false;

          if (is_compact) {
            return (
              <Box
                key={task.group_key}
                sx={{
                  border: '1px solid',
                  borderColor: is_active_task ? 'color-mix(in srgb, var(--primary-color) 45%, transparent)' : 'var(--border-color)',
                  borderRadius: 3,
                  bgcolor: is_active_task ? 'color-mix(in srgb, var(--primary-color) 7%, var(--card-bg))' : 'var(--card-bg)',
                }}
              >
                {/* 카드 본문: 탭하면 작업 이력 펼침 */}
                <Box
                  onClick={() => toggleExpand(task.group_key)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1.5, pl: 1.5, pr: 0.5, cursor: 'pointer' }}
                >
                  <IconButton
                    aria-label={is_active_task ? '일시정지' : '진행'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPauseTask(task, is_active_task);
                    }}
                    sx={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      border: '1px solid',
                      borderColor: is_active_task ? 'var(--primary-color)' : 'var(--border-color)',
                      bgcolor: is_active_task ? 'var(--primary-color)' : 'transparent',
                      color: is_active_task ? '#fff' : 'var(--primary-color)',
                      '&:hover': { bgcolor: is_active_task ? 'var(--accent-color)' : 'var(--bg-hover)', color: is_active_task ? '#fff' : 'var(--primary-color)' },
                    }}
                  >
                    {is_active_task ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box onClick={(e) => e.stopPropagation()} sx={{ width: 'fit-content', maxWidth: '100%' }}>
                      {renderTaskTitle(task, is_active_task, all_completed, true)}
                    </Box>
                    <Box
                      onClick={(e) => e.stopPropagation()}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, minWidth: 0, width: 'fit-content', maxWidth: '100%' }}
                    >
                      <Box sx={{ maxWidth: editingInlineProject === task.group_key ? 160 : '50%', minWidth: 0, display: 'flex' }}>
                        {renderTaskProject(task, true)}
                      </Box>
                      <Box sx={{ minWidth: 0, display: 'flex' }}>
                        {renderTaskCategory(task, true)}
                      </Box>
                      {task.sessions.length > 1 && (
                        <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap', ml: 0.25 }}>
                          {task.sessions.length}회
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, color: task.today_duration > 0 ? 'text.primary' : 'text.disabled', whiteSpace: 'nowrap' }}>
                      {formatDurationShort(task.today_duration)}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      총 {formatDurationShort(task.total_duration)}
                    </Typography>
                  </Box>

                  <IconButton
                    aria-label="더보기"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTaskMenu({ anchor: e.currentTarget, group_key: task.group_key });
                    }}
                    sx={{ width: 40, height: 40, flexShrink: 0, mt: -0.5, color: 'text.secondary' }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                <Menu
                  anchorEl={task_menu?.anchor}
                  open={task_menu?.group_key === task.group_key}
                  onClose={() => setTaskMenu(null)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MenuItem
                    disabled={task.sessions.length === 0 || is_active_task}
                    onClick={() => {
                      setTaskMenu(null);
                      handleToggleTaskComplete(task, all_completed);
                    }}
                  >
                    <ListItemIcon>
                      {all_completed ? <CheckCircleIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{all_completed ? '완료 취소' : '완료'}</ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setTaskMenu(null);
                      openCopyDialog(task);
                    }}
                  >
                    <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>카테고리 변경 복사</ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setTaskMenu(null);
                      handleEditTask(task, is_active_task);
                    }}
                  >
                    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>상세 수정</ListItemText>
                  </MenuItem>
                  <MenuItem
                    disabled={is_active_task}
                    onClick={() => {
                      setTaskMenu(null);
                      handleDeleteTask(task, is_active_task);
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText>이 업무의 모든 세션 삭제</ListItemText>
                  </MenuItem>
                </Menu>

                {/* 작업 이력 (펼침) */}
                <Collapse in={is_expanded}>
                  <Box sx={{ bgcolor: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-color)', borderRadius: '0 0 12px 12px', px: 1.5, py: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        작업 이력 (총 {task.sessions.length}회 작업)
                      </Typography>
                      <Button
                        size="small"
                        onClick={toggleSessionSortOrder}
                        endIcon={session_sort_order === 'asc' ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                        sx={{ color: 'text.secondary', whiteSpace: 'nowrap', minHeight: 36 }}
                      >
                        {session_sort_order === 'asc' ? '오래된 순' : '최근 순'}
                      </Button>
                    </Box>
                    {getSortedSessions(task).map((session, idx) => (
                      <Box
                        key={session.id}
                        sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, py: 0.5, borderTop: idx > 0 ? '1px solid var(--border-color)' : 'none' }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 0.5, minHeight: 36, fontSize: 13, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                            <span>{formatShortDate(session.startTime)} ·</span>
                            <Box
                              onClick={() => startInlineTimeEdit(session, 'start')}
                              sx={{ cursor: 'pointer', color: 'text.primary', display: 'flex', alignItems: 'center', minHeight: 32 }}
                            >
                              {renderSessionStart(session, true)}
                            </Box>
                            <span>–</span>
                            <Box
                              onClick={() => session.endTime && startInlineTimeEdit(session, 'end')}
                              sx={{ cursor: session.endTime ? 'pointer' : 'default', color: 'text.primary', display: 'flex', alignItems: 'center', minHeight: 32 }}
                            >
                              {renderSessionEnd(session, true)}
                            </Box>
                            <span>· {Math.floor(getDuration(session) / 60)}분</span>
                          </Box>
                          <Box onClick={() => startInlineNoteEdit(session)} sx={{ cursor: 'pointer', minHeight: 28 }}>
                            {renderSessionNote(session, true)}
                          </Box>
                        </Box>
                        <IconButton
                          aria-label="세션 메뉴"
                          onClick={(e) => setSessionMenu({ anchor: e.currentTarget, session_id: session.id })}
                          sx={{ width: 40, height: 40, flexShrink: 0, color: 'text.secondary' }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                        <Menu
                          anchorEl={session_menu?.anchor}
                          open={session_menu?.session_id === session.id}
                          onClose={() => setSessionMenu(null)}
                        >
                          {session.status === 'COMPLETED' && (
                            <MenuItem
                              onClick={() => {
                                setSessionMenu(null);
                                handleRestartSession(session);
                              }}
                            >
                              <ListItemIcon><PlayCircleOutlineIcon fontSize="small" color="success" /></ListItemIcon>
                              <ListItemText>새 세션으로 다시 시작</ListItemText>
                            </MenuItem>
                          )}
                          <MenuItem
                            onClick={() => {
                              setSessionMenu(null);
                              handleEditClick(session);
                            }}
                          >
                            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                            <ListItemText>수정</ListItemText>
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              setSessionMenu(null);
                              deleteLog(session.id);
                            }}
                            sx={{ color: 'error.main' }}
                          >
                            <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
                            <ListItemText>삭제</ListItemText>
                          </MenuItem>
                        </Menu>
                      </Box>
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      첫 시작: {formatTimeWithDate(task.first_start, date_range)} | 마지막 종료: {task.last_end ? formatTime(task.last_end) : (is_active_task ? '진행 중' : '일시정지')} | 총 {formatDuration(task.total_duration)}
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            );
          }

          return (
            <Box key={task.group_key}>
              {/* 업무 행 */}
              <Box
                onClick={() => toggleExpand(task.group_key)}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '56px 140px 1fr 90px 110px 110px 130px 50px 50px',
                  gap: 1,
                  px: 2,
                  py: 1.5,
                  alignItems: 'center',
                  borderBottom: 1,
                  borderColor: 'var(--border-color)',
                  bgcolor: is_highlighted
                    ? 'rgba(76, 175, 80, 0.2)'
                    : is_active_task ? 'var(--highlight-light)' : 'var(--card-bg)',
                  cursor: 'pointer',
                  boxShadow: is_highlighted ? 'inset 0 0 0 2px rgba(76, 175, 80, 0.5)' : 'none',
                  '&:hover': {
                    bgcolor: is_highlighted ? 'rgba(76, 175, 80, 0.15)' : 'var(--bg-hover)',
                  }
                }}
              >
                {/* 좌측: 펼치기 토글 + 완료상태 토글 버튼 + 시작/재시작 버튼 */}
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.25 }}>
                  {/* 펼치기/접기 토글 아이콘 */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: 'text.secondary',
                      cursor: 'pointer',
                    }}
                  >
                    {is_expanded ? (
                      <ExpandLessIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 16 }} />
                    )}
                  </Box>
                  {/* 완료 상태 토글 버튼 */}
                  <Tooltip title={all_completed ? "완료 취소" : "완료"}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTaskComplete(task, all_completed);
                        }}
                        disabled={task.sessions.length === 0 || is_active_task}
                        sx={{
                          p: 0.25,
                          color: all_completed ? 'success.main' : 'text.secondary',
                          '&:hover': { color: all_completed ? 'warning.main' : 'success.main' }
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
                    const tooltip_text = is_active_task
                      ? "일시정지"
                      : "진행";

                    return (
                      <Tooltip title={tooltip_text}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPauseTask(task, is_active_task);
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
                  {renderTaskProject(task, false)}
                </Box>

                {/* 기록명 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                  {renderTaskTitle(task, is_active_task, all_completed, false)}
                </Box>

                {/* 카테고리 */}
                <Box sx={{ overflow: 'visible', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                  {renderTaskCategory(task, false)}
                </Box>

                {/* 오늘시간 - 돋보이게 (다크모드: 흰색, 라이트모드: 검정) */}
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                  {formatDuration(task.today_duration)}
                </Typography>

                {/* 총시간 - 옅은 색 (다크모드: 옅은 회색, 라이트모드: 짙은 회색) */}
                <Typography variant="body2" sx={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {formatDuration(task.total_duration)}
                </Typography>

                {/* 시작-종료 */}
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  {formatTimeWithDate(is_active_task && activeTimer ? activeTimer.startTime : task.first_start, date_range)} ~ {task.last_end ? formatTime(task.last_end) : (is_active_task ? '진행 중' : '일시정지')}
                </Typography>

                {/* 세션 수 */}
                <Typography variant="body2" color="text.secondary">
                  {task.sessions.length}회
                </Typography>

                {/* 복사/수정/삭제 버튼 */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25 }}>
                  <Tooltip title="카테고리 변경 복사">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCopyDialog(task);
                      }}
                      sx={{
                        p: 0.25,
                        color: 'text.secondary',
                        '&:hover': { color: 'info.main' }
                      }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="상세 수정">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTask(task, is_active_task);
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
                        handleDeleteTask(task, is_active_task);
                      }}
                      disabled={is_active_task}
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
                          <TableCell sx={{ width: 40, py: 0.5, cursor: 'pointer', userSelect: 'none' }} onClick={toggleSessionSortOrder}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption">#</Typography>
                              {session_sort_order === 'asc' ? (
                                <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              ) : (
                                <ExpandLessIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ width: 100, py: 0.5 }}>날짜</TableCell>
                          <TableCell sx={{ width: 120, py: 0.5 }}>시작 시간</TableCell>
                          <TableCell sx={{ width: 120, py: 0.5 }}>종료 시간</TableCell>
                          <TableCell sx={{ width: 80, py: 0.5 }}>소요 시간</TableCell>
                          <TableCell sx={{ width: 180, py: 0.5 }}>비고</TableCell>
                          <TableCell sx={{ width: 80, py: 0.5 }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getSortedSessions(task).map((session, idx) => {
                            const display_index = session_sort_order === 'desc'
                              ? task.sessions.length - idx
                              : idx + 1;

                            return (
                          <TableRow key={session.id} hover>
                            <TableCell sx={{ py: 0.5 }}>{display_index}</TableCell>
                            <TableCell sx={{ py: 0.5 }}>{formatDate(session.startTime)}</TableCell>
                            <TableCell
                              sx={{ py: 0.5, cursor: 'pointer' }}
                              onClick={() => startInlineTimeEdit(session, 'start')}
                            >
                              {renderSessionStart(session, false)}
                            </TableCell>
                            <TableCell
                              sx={{ py: 0.5, cursor: session.endTime ? 'pointer' : 'default' }}
                              onClick={() => session.endTime && startInlineTimeEdit(session, 'end')}
                            >
                              {renderSessionEnd(session, false)}
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              {Math.floor(getDuration(session) / 60)}분
                            </TableCell>
                            <TableCell
                              sx={{ py: 0.5, cursor: 'pointer' }}
                              onClick={() => startInlineNoteEdit(session)}
                            >
                              {renderSessionNote(session, false)}
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {/* 완료된 세션에만 재진행 버튼 표시 */}
                                {session.status === 'COMPLETED' && (
                                  <Tooltip title="새 세션으로 다시 시작 (현재 시간 기준)">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRestartSession(session)}
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
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    첫 시작: {formatTimeWithDate(task.first_start, date_range)} | 마지막 종료: {task.last_end ? formatTime(task.last_end) : (is_active_task ? '진행 중' : '일시정지')} | 총 {formatDuration(task.total_duration)}
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

      {/* 목록에 없는 코드를 인라인으로 넣었을 때 이름 받기 */}
      <NewProjectDialog code={new_project_code} onClose={() => setNewProjectCode('')} />

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
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Autocomplete
                freeSolo
                options={projectCodeOptions}
                value={null}
                inputValue={editProjectCode}
                onInputChange={(_e, newValue) => handleProjectCodeChange(newValue)}
                renderOption={(props, option) =>
                  renderProjectOption(props, option, projects.find((p) => p.code === option)?.name, () => deleteProject(option))
                }
                renderInput={(params) => <TextField {...params} label="프로젝트 코드" />}
                sx={{ flex: 1, minWidth: 180 }}
              />
              {/* 코드 + 이름을 모두 넣고 저장하면 새 프로젝트로 등록된다 */}
              <Autocomplete
                freeSolo
                options={projectNameOptions}
                value={null}
                inputValue={editProjectName}
                onInputChange={(_e, newValue) => handleProjectNameChange(newValue || '')}
                renderOption={(props, option) =>
                  renderProjectOption(props, option, projects.find((p) => p.name === option)?.code, () => {
                    const target = projects.find((p) => p.name === option);
                    if (target) deleteProject(target.code);
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label="프로젝트 명" placeholder="새 프로젝트면 이름 입력" />
                )}
                sx={{ flex: 1, minWidth: 180 }}
              />
            </Box>
            <CategoryAutocomplete
              value={editCategory}
              onChange={(newValue) => setEditCategory(newValue)}
              label="카테고리"
              variant="outlined"
            />
            <TextField
              label="비고"
              placeholder="추가 메모"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
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

      {/* 카테고리 변경 복사 다이얼로그 */}
      <Dialog
        open={!!copyingTask}
        onClose={() => { setCopyingTask(null); setCopyCategory(null); setCopyNote(''); }}
        maxWidth="xs"
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCopyWithCategory();
          }
        }}
      >
        <DialogTitle>카테고리 변경 복사</DialogTitle>
        <DialogContent>
          {copyingTask && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="기록명"
                value={copyingTask.title}
                size="small"
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <TextField
                label="프로젝트"
                value={copyingTask.projectCode ? `[${copyingTask.projectCode}] ${getProjectName(copyingTask.projectCode)}` : '-'}
                size="small"
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <CategoryAutocomplete
                value={copyCategory}
                onChange={(newValue) => setCopyCategory(newValue)}
                label="카테고리 (변경)"
                variant="outlined"
                autoFocus
                sx={{ width: '100%' }}
              />
              <TextField
                label="비고 (변경)"
                value={copyNote}
                onChange={(e) => setCopyNote(e.target.value)}
                size="small"
                fullWidth
                multiline
                rows={2}
                placeholder="비고를 입력하세요 (미입력 시 비워둠)"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCopyingTask(null); setCopyCategory(null); setCopyNote(''); }}>취소</Button>
          <Button onClick={handleCopyWithCategory} variant="contained" color="primary">복사 생성(Enter)</Button>
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

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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
  Autocomplete,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  Slide,
} from '@mui/material';
import type { SlideProps } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTimerStore, TimerLog } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import { formatTimeRange, formatDuration } from '../../utils/timeUtils';
import CategoryAutocomplete from '../common/CategoryAutocomplete';
import { getPalette, getAdjustedPalette, getColorByIndex, loadPaletteSettings } from '../../utils/colorPalette';

// Snackbar 슬라이드 트랜지션 (위에서 아래로 나타남, 위로 사라짐)
const SlideTransition = (props: SlideProps) => {
  return <Slide {...props} direction="down" />;
};

interface GanttChartProps {
  selectedDate: Date;
}

// 리사이즈 핸들 너비
const RESIZE_HANDLE_WIDTH = 8;

// 기본 시간 범위 설정
const DEFAULT_START_HOUR = 8;  // 기본 시작: 08:00
const DEFAULT_END_HOUR = 19;   // 기본 종료: 19:00
const DAY_START_HOUR = 0;      // 하루 시작 기준 (00:00)

// 설정 저장 키
const SETTINGS_STORAGE_KEY = 'timekeeper-settings';

// 행 높이
const ROW_HEIGHT = 32;
// 행 간격
const ROW_GAP = 4;
// 헤더 높이 (시간축 라벨)
const HEADER_HEIGHT = 24;
// 왼쪽 라벨 너비 기본값
const DEFAULT_LABEL_WIDTH = 180;
const MIN_LABEL_WIDTH = 100;
const MAX_LABEL_WIDTH = 400;
// 라벨 너비 저장 키
const LABEL_WIDTH_STORAGE_KEY = 'timekeeper-gantt-label-width';

const GanttChart: React.FC<GanttChartProps> = ({ selectedDate }) => {
  const { logs, activeTimer, addLog, updateLog, deleteLog, stopTimer, themeConfig, getOrAssignColorIndex } = useTimerStore();
  const { getProjectName, projects } = useProjectStore();
  
  // 프로젝트 옵션 (코드 + 이름 형태로 표시)
  const projectOptions = useMemo(() => {
    return projects.map(p => `[${p.code}] ${p.name}`);
  }, [projects]);

  // 컬러 팔레트 설정 로드 (다크모드일 때 색상 보정 적용)
  const [paletteSettings, setPaletteSettings] = useState(() => loadPaletteSettings());
  const colorPalette = useMemo(
    () => getAdjustedPalette(paletteSettings, themeConfig.isDark, 45), 
    [paletteSettings, themeConfig.isDark]
  );

  // 점심시간 설정 로드
  const [lunchConfig, setLunchConfig] = useState<{start: string, end: string, enabled: boolean}>({
    start: '12:00',
    end: '13:00',
    enabled: true
  });

  // 설정 로드 함수
  const loadSettings = useCallback(() => {
    // 팔레트 설정 로드
    setPaletteSettings(loadPaletteSettings());

    // 점심시간 설정 로드
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setLunchConfig({
          start: parsed.lunchStart || '12:00',
          end: parsed.lunchEnd || '13:00',
          enabled: parsed.lunchExcludeEnabled ?? true
        });
      }
    } catch {
      // 무시
    }
  }, []);

  // 초기 로드 및 이벤트 리스너 등록
  useEffect(() => {
    loadSettings(); // 초기 로드

    const handleStorageChange = () => {
      loadSettings();
    };
    window.addEventListener('storage', handleStorageChange);
    
    // 같은 탭 내 팔레트 변경 감지
    const handlePaletteChange = () => {
      loadSettings();
    };
    window.addEventListener('palette-changed', handlePaletteChange);
    
    // 포커스 시에도 체크
    const handleFocus = () => {
      loadSettings();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('palette-changed', handlePaletteChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadSettings]);

  // 실시간 업데이트를 위한 현재 시간 상태 (1초마다 갱신)
  const [currentTime, setCurrentTime] = useState(Date.now());
  const currentTimeRef = useRef(Date.now());

  useEffect(() => {
    // 탭이 활성화 상태일 때만 interval 실행
    let interval: number | null = null;
    
    const startInterval = () => {
      if (interval) clearInterval(interval);
      interval = window.setInterval(() => {
        if (!document.hidden) {
          const now = Date.now();
          setCurrentTime(now);
          currentTimeRef.current = now;
        }
      }, 1000);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 탭이 다시 활성화되면 즉시 시간 갱신
        const now = Date.now();
        setCurrentTime(now);
        currentTimeRef.current = now;
        // interval 재시작
        startInterval();
      }
    };

    // 초기 interval 시작
    startInterval();
    
    // visibilitychange 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 오늘 날짜인지 확인
  const isToday = useMemo(() => {
    const now = new Date();
    let today = new Date(now);
    if (now.getHours() < DAY_START_HOUR) {
      today.setDate(today.getDate() - 1);
    }
    return (
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate()
    );
  }, [selectedDate]);

  // 드래그 상태 관리 (새 작업 생성용)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPercent, setDragStartPercent] = useState<number | null>(null);
  const [dragCurrentPercent, setDragCurrentPercent] = useState<number | null>(null);
  const [dragRowIndex, setDragRowIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 리사이즈 상태 관리
  const [isResizing, setIsResizing] = useState(false);
  const [resizeLogId, setResizeLogId] = useState<string | null>(null);
  const [resizeType, setResizeType] = useState<'start' | 'end' | 'smart' | null>(null);
  const [resizeStartPercent, setResizeStartPercent] = useState<number | null>(null);
  const [resizeCurrentPercent, setResizeCurrentPercent] = useState<number | null>(null);
  const [resizeOriginalStart, setResizeOriginalStart] = useState<number>(0);
  const [resizeOriginalEnd, setResizeOriginalEnd] = useState<number>(0);

  // 드래그 생성 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLogStart, setNewLogStart] = useState<number>(0);
  const [newLogEnd, setNewLogEnd] = useState<number>(0);
  const [newTitle, setNewTitle] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [isAddingSession, setIsAddingSession] = useState(false); // 기존 작업에 세션 추가 여부
  const [isHoveringBar, setIsHoveringBar] = useState(false); // 작업 막대 hover 상태
  
  // 컨텍스트 메뉴 및 수정 모달 상태
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    log: TimerLog | null;
  } | null>(null);

  const [editingLog, setEditingLog] = useState<TimerLog | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editProjectCode, setEditProjectCode] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);
  
  // 충돌 알림 상태
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'info' | 'warning' | 'success';
  }>({ open: false, message: '', severity: 'info' });
  
  // 라벨 너비 상태 (localStorage에서 로드)
  const [labelWidth, setLabelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LABEL_WIDTH_STORAGE_KEY);
      if (saved) {
        const value = parseInt(saved, 10);
        if (!isNaN(value) && value >= MIN_LABEL_WIDTH && value <= MAX_LABEL_WIDTH) {
          return value;
        }
      }
    } catch {
      // 무시
    }
    return DEFAULT_LABEL_WIDTH;
  });
  
  // 라벨 리사이저 드래그 상태
  const [isResizingLabel, setIsResizingLabel] = useState(false);
  const labelResizeStartX = useRef<number>(0);
  const labelResizeStartWidth = useRef<number>(DEFAULT_LABEL_WIDTH);
  
  // 라벨 너비 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem(LABEL_WIDTH_STORAGE_KEY, String(labelWidth));
  }, [labelWidth]);
  
  // 라벨 리사이저 드래그 핸들러
  const handleLabelResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingLabel(true);
    labelResizeStartX.current = e.clientX;
    labelResizeStartWidth.current = labelWidth;
  }, [labelWidth]);
  
  // 라벨 리사이저 마우스 이동/해제 핸들러
  useEffect(() => {
    if (!isResizingLabel) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - labelResizeStartX.current;
      const newWidth = Math.min(MAX_LABEL_WIDTH, Math.max(MIN_LABEL_WIDTH, labelResizeStartWidth.current + delta));
      setLabelWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizingLabel(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLabel]);
  
  // 프로젝트 코드 입력 처리 함수
  const handleProjectCodeChange = (value: string, setter: (value: string) => void) => {
    const match = value.match(/^\[([^\]]+)\]/);
    if (match) {
      setter(match[1]);
    } else {
      setter(value);
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

  // 선택된 날짜의 06:00 기준 시작 시간
  const getBaseTime = useCallback((date?: Date) => {
    const target_date = date || selectedDate;
    const base = new Date(target_date);
    base.setHours(DAY_START_HOUR, 0, 0, 0);
    return base.getTime();
  }, [selectedDate]);

  // 선택된 날짜의 로그만 필터링 (06:00 ~ 익일 06:00)
  // GanttChart는 해당 날짜의 시간대에 실제로 진행된 세션만 표시
  const todayLogs = useMemo(() => {
    const base_time = getBaseTime();
    const end_time = base_time + 24 * 60 * 60 * 1000; // 24시간

    let filtered_logs = logs.filter(log => {
      // 삭제된 로그는 제외
      if ('deletedAt' in log && (log as any).deletedAt) return false;

      // 해당 날짜 시간대에 세션이 있는지 확인
      const logEnd = log.endTime || currentTimeRef.current;
      const startsInRange = log.startTime >= base_time && log.startTime < end_time;
      const endsInRange = logEnd >= base_time && logEnd < end_time;
      const spansRange = log.startTime < base_time && logEnd >= base_time; // 이전 날 시작해서 오늘까지 이어짐

      return startsInRange || endsInRange || spansRange;
    });

    // 오늘인 경우에만 activeTimer 포함
    if (isToday && activeTimer) {
      filtered_logs = [...filtered_logs, activeTimer];
    }

    // 시작 시간순 정렬
    return filtered_logs.sort((a, b) => a.startTime - b.startTime);
  }, [logs, activeTimer, getBaseTime, isToday]);

  // --- 스냅 및 중복 검사 로직 ---
  const SNAP_THRESHOLD_MS = 15 * 60 * 1000; // 15분 (기존 로그 스냅용)
  const KEY_SNAP_THRESHOLD_MS = 5 * 60 * 1000; // 5분 (주요 스냅 포인트용: 09:00, 점심, 18:00)
  const MIN_SESSION_MS = 5 * 60 * 1000; // 최소 세션 길이 5분

  // 시간 문자열(HH:mm)을 해당 날짜의 타임스탬프로 변환
  const timeStringToTimestamp = useCallback((timeStr: string, baseDate?: Date) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(baseDate || selectedDate);
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  }, [selectedDate]);

  // 주요 스냅 포인트들 (업무 시작/종료, 점심시간)
  const getKeySnapPoints = useCallback(() => {
    const snapPoints: number[] = [];
    
    // 업무 시작 시간 (09:00)
    snapPoints.push(timeStringToTimestamp('09:00'));
    
    // 업무 종료 시간 (18:00)
    snapPoints.push(timeStringToTimestamp('18:00'));
    
    // 점심시간 시작/종료
    if (lunchConfig.enabled) {
      snapPoints.push(timeStringToTimestamp(lunchConfig.start));
      snapPoints.push(timeStringToTimestamp(lunchConfig.end));
    }
    
    return snapPoints;
  }, [timeStringToTimestamp, lunchConfig]);

  const getSnappedTime = useCallback((targetTime: number, excludeId?: string | null) => {
    let closestTime = targetTime;
    let minDiff = SNAP_THRESHOLD_MS;

    // 기존 로그들의 시작/종료 시간에 스냅 (15분 이내)
    todayLogs.forEach(log => {
      if (log.id === excludeId) return;
      
      // 시작 시간과 비교
      const startDiff = Math.abs(log.startTime - targetTime);
      if (startDiff < minDiff) {
        minDiff = startDiff;
        closestTime = log.startTime;
      }
      
      // 종료 시간과 비교
      if (log.endTime) {
        const endDiff = Math.abs(log.endTime - targetTime);
        if (endDiff < minDiff) {
          minDiff = endDiff;
          closestTime = log.endTime;
        }
      }
    });

    // 주요 스냅 포인트에도 스냅 (업무 시작/종료, 점심시간) - 5분 이내만 적용
    const keySnapPoints = getKeySnapPoints();
    keySnapPoints.forEach(snapPoint => {
      const diff = Math.abs(snapPoint - targetTime);
      // 주요 스냅 포인트는 5분 이내일 때만 스냅 (더 엄격한 조건)
      if (diff <= KEY_SNAP_THRESHOLD_MS && diff < minDiff) {
        minDiff = diff;
        closestTime = snapPoint;
      }
    });

    return closestTime;
  }, [todayLogs, getKeySnapPoints]);

  // 특정 행(작업명)의 세션 경계에 스냅하는 함수
  const getSnappedTimeForRow = useCallback((targetTime: number, rowTitle: string) => {
    let closestTime = targetTime;
    let minDiff = SNAP_THRESHOLD_MS;

    // 해당 행의 세션들만 필터링 (15분 이내)
    const rowSessions = todayLogs.filter(log => log.title === rowTitle);

    rowSessions.forEach(log => {
      // 시작 시간과 비교
      const startDiff = Math.abs(log.startTime - targetTime);
      if (startDiff < minDiff) {
        minDiff = startDiff;
        closestTime = log.startTime;
      }
      
      // 종료 시간과 비교
      if (log.endTime) {
        const endDiff = Math.abs(log.endTime - targetTime);
        if (endDiff < minDiff) {
          minDiff = endDiff;
          closestTime = log.endTime;
        }
      }
    });

    // 주요 스냅 포인트에도 스냅 (업무 시작/종료, 점심시간) - 5분 이내만 적용
    const keySnapPoints = getKeySnapPoints();
    keySnapPoints.forEach(snapPoint => {
      const diff = Math.abs(snapPoint - targetTime);
      // 주요 스냅 포인트는 5분 이내일 때만 스냅 (더 엄격한 조건)
      if (diff <= KEY_SNAP_THRESHOLD_MS && diff < minDiff) {
        minDiff = diff;
        closestTime = snapPoint;
      }
    });

    return closestTime;
  }, [todayLogs, getKeySnapPoints]);

  // 충돌 시 자동 조정 함수 (동시에 여러 작업 세션 불가 전제 + 점심시간 피하기)
  const adjustForOverlap = useCallback((start: number, end: number, excludeId?: string | null): { adjustedStart: number; adjustedEnd: number; wasAdjusted: boolean } => {
    let adjustedStart = start;
    let adjustedEnd = end;
    let wasAdjusted = false;

    // 점심시간 충돌 체크 및 조정
    if (lunchConfig.enabled) {
      const lunchStart = timeStringToTimestamp(lunchConfig.start);
      const lunchEnd = timeStringToTimestamp(lunchConfig.end);
      
      // 점심시간과 겹치는지 확인
      if (adjustedStart < lunchEnd && adjustedEnd > lunchStart) {
        // Case 1: 세션이 점심시간 내부에서 시작 → 점심 종료 후로 밀기
        if (adjustedStart >= lunchStart && adjustedStart < lunchEnd) {
          adjustedStart = lunchEnd;
          wasAdjusted = true;
        }
        // Case 2: 세션이 점심시간 내부에서 종료 → 점심 시작 전으로 당기기
        else if (adjustedEnd > lunchStart && adjustedEnd <= lunchEnd) {
          adjustedEnd = lunchStart;
          wasAdjusted = true;
        }
        // Case 3: 세션이 점심시간을 완전히 포함 → 점심 시작 전으로 축소
        else if (adjustedStart < lunchStart && adjustedEnd > lunchEnd) {
          adjustedEnd = lunchStart;
          wasAdjusted = true;
        }
      }
    }

    // 시간순으로 정렬된 로그들
    const sortedLogs = [...todayLogs]
      .filter(log => log.id !== excludeId)
      .sort((a, b) => a.startTime - b.startTime);

    // 충돌하는 세션들 찾기
    sortedLogs.forEach(log => {
      const logEnd = log.endTime || currentTimeRef.current;
      
      // 교차 검사 (맞닿음은 겹침 아님)
      if (adjustedStart < logEnd && adjustedEnd > log.startTime) {
        // 충돌 발생!
        
        // Case 1: 새 세션의 시작이 기존 세션 내부에 있음 → 시작을 기존 종료로 밀기
        if (adjustedStart >= log.startTime && adjustedStart < logEnd) {
          adjustedStart = logEnd;
          wasAdjusted = true;
        }
        // Case 2: 새 세션의 종료가 기존 세션 내부에 있음 → 종료를 기존 시작으로 당기기
        else if (adjustedEnd > log.startTime && adjustedEnd <= logEnd) {
          adjustedEnd = log.startTime;
          wasAdjusted = true;
        }
        // Case 3: 새 세션이 기존 세션을 완전히 포함 → 새 세션을 기존 세션 앞으로 축소
        else if (adjustedStart < log.startTime && adjustedEnd > logEnd) {
          adjustedEnd = log.startTime;
          wasAdjusted = true;
        }
      }
    });

    return { adjustedStart, adjustedEnd, wasAdjusted };
  }, [todayLogs, lunchConfig, timeStringToTimestamp]);

  const checkOverlap = useCallback((start: number, end: number, excludeId?: string | null) => {
    return todayLogs.some(log => {
      if (log.id === excludeId) return false;
      const logEnd = log.endTime || currentTimeRef.current;
      // 교차 검사 (맞닿음 허용)
      return start < logEnd && end > log.startTime;
    });
  }, [todayLogs]);
  // ---------------------------

  // 동적 타임라인 범위 계산 (기본 08:00~19:00, 작업에 따라 확장)
  const { timelineStartHour, timelineEndHour, totalMinutes } = useMemo(() => {
    let min_hour = DEFAULT_START_HOUR;
    let max_hour = DEFAULT_END_HOUR;

    if (todayLogs.length > 0) {
      todayLogs.forEach(log => {
        const start_date = new Date(log.startTime);
        let start_hour = start_date.getHours();
        // 06:00 이전은 익일로 처리
        if (start_hour < DAY_START_HOUR) start_hour += 24;
        
        const end_date = new Date(log.endTime || currentTime);
        let end_hour = end_date.getHours();
        if (end_hour < DAY_START_HOUR) end_hour += 24;
        // 분이 있으면 다음 시간으로 올림
        if (end_date.getMinutes() > 0) end_hour += 1;

        // -1시간, +1시간 여유
        min_hour = Math.min(min_hour, start_hour - 1);
        max_hour = Math.max(max_hour, end_hour + 1);
      });
    }

    // 오늘인 경우 현재 시간도 고려
    if (isToday) {
      const now = new Date();
      let now_hour = now.getHours();
      if (now_hour < DAY_START_HOUR) now_hour += 24;
      if (now.getMinutes() > 0) now_hour += 1;
      max_hour = Math.max(max_hour, now_hour + 1);
    }

    // 최소 범위: 00:00 ~ 24:00
    min_hour = Math.max(DAY_START_HOUR, min_hour);
    max_hour = Math.min(24, max_hour);

    return {
      timelineStartHour: min_hour,
      timelineEndHour: max_hour,
      totalMinutes: (max_hour - min_hour) * 60
    };
  }, [todayLogs, currentTime, isToday]);

  // 타임라인 기준 오프셋 계산 (분 단위)
  const getOffsetMinutes = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes();

    // 06:00 이전이면(예: 01:00) 24시간을 더해서 계산 (익일 새벽)
    if (hours < DAY_START_HOUR) {
      hours += 24;
    }

    return (hours - timelineStartHour) * 60 + minutes;
  }, [timelineStartHour]);

  // 제목별로 그룹화하여 같은 제목은 같은 행에 표시
  const { chartItems, uniqueRows } = useMemo(() => {
    // 현재 시간 캡처 (클로저 문제 방지)
    const now = currentTime;
    
    // 너비 계산 (분 단위) - inline 정의
    // status가 RUNNING인 경우 endTime을 무시하고 현재 시간 사용
    const calcWidthMinutes = (start: number, end: number | undefined, status?: string) => {
      // RUNNING 상태면 endTime을 무시하고 현재 시간 사용
      const effective_end = (status === 'RUNNING') ? now : (end || now);
      return (effective_end - start) / 1000 / 60; // 분
    };
    
    // 1. 제목별로 그룹화하고 row_index 할당
    const title_to_row_index = new Map<string, number>();
    const rows: { title: string; projectCode?: string; category?: string; color: string }[] = [];

    todayLogs.forEach(log => {
      if (!title_to_row_index.has(log.title)) {
        const row_index = rows.length;
        title_to_row_index.set(log.title, row_index);
        // 글로벌 색상 인덱스 기반 색상 할당 (색상 충돌 방지)
        const colorIndex = getOrAssignColorIndex(log.title);
        const color = getColorByIndex(colorIndex, colorPalette);
        rows.push({
          title: log.title,
          projectCode: log.projectCode,
          category: log.category,
          color
        });
      }
    });

    // 2. 각 로그에 row_index와 위치 정보 추가
    const items = todayLogs.map(log => {
      const start_offset = getOffsetMinutes(log.startTime);
      let width = calcWidthMinutes(log.startTime, log.endTime, log.status);

      // 최소 너비 (5분)
      if (width < 5) width = 5;

      // 동적 타임라인 범위에 따른 비율 (%)
      const left_percent = Math.max(0, (start_offset / totalMinutes) * 100);
      const width_percent = Math.min((width / totalMinutes) * 100, 100 - left_percent);

      // 글로벌 색상 인덱스 기반 색상 할당
      const colorIndex = getOrAssignColorIndex(log.title);
      const color = getColorByIndex(colorIndex, colorPalette);

      const row_index = title_to_row_index.get(log.title) ?? 0;

      return {
        ...log,
        row_index,
        left_percent,
        width_percent,
        color
      };
    });

    return { chartItems: items, uniqueRows: rows };
  }, [todayLogs, currentTime, colorPalette, getOffsetMinutes, totalMinutes, getOrAssignColorIndex]);

  // 시간축 라벨 생성 (동적 범위에 맞게)
  const timeLabels = useMemo(() => {
    const labels = [];
    // 시작 시간 (정시 기준)
    const start = timelineStartHour;
    
    for (let hour = start; hour <= timelineEndHour; hour += 1) {
      if (hour < timelineStartHour) continue;
      const display_hour = hour >= 24 ? hour - 24 : hour;
      const offset_minutes = (hour - timelineStartHour) * 60;
      labels.push({
        label: `${display_hour.toString().padStart(2, '0')}:00`,
        left_percent: (offset_minutes / totalMinutes) * 100
      });
    }
    return labels;
  }, [timelineStartHour, timelineEndHour, totalMinutes]);

  // 기록이 있을 때만 좌측 라벨 영역 표시
  const LABEL_WIDTH = uniqueRows.length > 0 ? labelWidth : 0;

  // 전체 차트 높이 계산 (고유 행 수 기준 + 드래그 여유 공간)
  const chart_height = Math.max(
    uniqueRows.length * (ROW_HEIGHT + ROW_GAP) + HEADER_HEIGHT + ROW_HEIGHT,
    80 // 기록이 없을 때 최소 높이
  );

  // 점심시간 렌더링 정보 계산
  const lunchTimeStyle = useMemo(() => {
    // 사용자가 점심시간 제외 옵션을 껐더라도 차트에 표시는 해주는 것이 좋음 (또는 제외 옵션에 따라 표시 여부 결정)
    // 여기서는 enabled 여부와 상관없이 설정된 시간이 있으면 표시하되, enabled가 꺼져있으면 투명도를 조절하거나 스타일을 다르게 할 수 있음.
    // 하지만 요구사항은 "점심시간을 간트차트 내에 표시"이므로 enabled가 true일 때만 표시하거나, 항상 표시.
    // 보통 설정에서 "점심시간 소요 시간에서 제외"가 켜져 있으면 "업무 불가 시간"으로 인지되므로 이때 표시하는 것이 적절함.
    if (!lunchConfig.enabled) return null;

    const parseTimeMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const startMinutes = parseTimeMinutes(lunchConfig.start);
    const endMinutes = parseTimeMinutes(lunchConfig.end);
    
    // 유효성 검사
    if (startMinutes >= endMinutes) return null;

    const chartStartMinutes = timelineStartHour * 60;
    const chartEndMinutes = timelineEndHour * 60;

    // 겹치지 않으면 표시 안 함
    if (endMinutes <= chartStartMinutes || startMinutes >= chartEndMinutes) return null;

    const visibleStart = Math.max(startMinutes, chartStartMinutes);
    const visibleEnd = Math.min(endMinutes, chartEndMinutes);

    const leftPercent = ((visibleStart - chartStartMinutes) / totalMinutes) * 100;
    const widthPercent = ((visibleEnd - visibleStart) / totalMinutes) * 100;

    return { leftPercent, widthPercent };
  }, [lunchConfig, timelineStartHour, timelineEndHour, totalMinutes]);

  // --- 드래그 핸들러 ---

  const getPercentFromEvent = (e: React.MouseEvent) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - LABEL_WIDTH - 16; // 패딩 16px 고려
    const width = rect.width - LABEL_WIDTH - 32; // 양쪽 패딩 32px 고려
    return Math.min(Math.max((x / width) * 100, 0), 100);
  };

  const getRowFromEvent = (e: React.MouseEvent) => {
    if (!containerRef.current) return uniqueRows.length;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top - HEADER_HEIGHT;
    const row = Math.floor(y / (ROW_HEIGHT + ROW_GAP));
    // 음수(헤더 영역) 또는 기존 작업 행 범위 밖이면 새 작업 생성으로 처리
    if (row < 0 || row >= uniqueRows.length) {
      return uniqueRows.length; // uniqueRows.length는 새 작업 생성을 의미
    }
    return row;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 우클릭(button === 2)은 드래그 시작하지 않음 (컨텍스트 메뉴용)
    if (e.button === 2) return;
    
    // 컨텍스트 메뉴가 열려있으면 닫기
    if (contextMenu) {
      setContextMenu(null);
      return;
    }

    const percent = getPercentFromEvent(e);
    const row = getRowFromEvent(e);

    // 왼쪽 라벨 영역 또는 시간축 헤더 영역이면 무시
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // 왼쪽 라벨 영역 (x < LABEL_WIDTH + 16) 또는 시간축 헤더 영역 (y < HEADER_HEIGHT) 무시
    if (x < LABEL_WIDTH + 16 || y < HEADER_HEIGHT) return;

    setIsDragging(true);
    setDragStartPercent(percent);
    setDragCurrentPercent(percent);
    setDragRowIndex(row);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 드래그 중일 때
    if (isDragging) {
      setDragCurrentPercent(getPercentFromEvent(e));
      return;
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || dragStartPercent === null || dragCurrentPercent === null) return;

    setIsDragging(false);

    // 5분을 퍼센트로 환산
    const fiveMinutesPercent = (5 / totalMinutes) * 100;

    // 드래그 거리가 5분 미만이면 아무 작업도 하지 않음 (모달 띄우지 않음)
    if (Math.abs(dragCurrentPercent - dragStartPercent) < fiveMinutesPercent) {
      setDragStartPercent(null);
      setDragCurrentPercent(null);
      setDragRowIndex(null);
      return;
    }

    // 드래그 범위 계산
    let start_p = Math.min(dragStartPercent, dragCurrentPercent);
    let end_p = Math.max(dragStartPercent, dragCurrentPercent);

    // 시간 변환 로직

    // 퍼센트 -> 분 (동적 범위 기준)
    const start_minutes = (start_p / 100) * totalMinutes;
    const end_minutes = (end_p / 100) * totalMinutes;

    // 분 -> 실제 타임스탬프 (선택된 날짜 기준, 타임라인 시작 시간부터)
    const base = new Date(selectedDate);
    base.setHours(timelineStartHour, 0, 0, 0);
    const base_time = base.getTime();

    let start_time = base_time + start_minutes * 60 * 1000;
    let end_time = base_time + end_minutes * 60 * 1000;

    // 하루 범위 제한 (06:00 ~ 익일 06:00)
    const dayStart = getBaseTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    // 범위 내로 클램핑 (최소 06:00, 최대 익일 06:00)
    let clamped_start = Math.max(dayStart, Math.min(dayEnd, start_time));
    let clamped_end = Math.max(dayStart, Math.min(dayEnd, end_time));

    // 기존 작업 행에서 드래그한 경우: 해당 행의 세션 경계에 스냅 적용
    if (dragRowIndex !== null && dragRowIndex < uniqueRows.length) {
      const rowTitle = uniqueRows[dragRowIndex].title;
      clamped_start = getSnappedTimeForRow(clamped_start, rowTitle);
      clamped_end = getSnappedTimeForRow(clamped_end, rowTitle);
    } else {
      // 새 작업 생성: 전체 세션 경계에 스냅 적용
      clamped_start = getSnappedTime(clamped_start, null);
      clamped_end = getSnappedTime(clamped_end, null);
    }

    // --- 충돌 자동 조정 로직 (동시에 여러 작업 세션 불가) ---
    const { adjustedStart, adjustedEnd, wasAdjusted } = adjustForOverlap(clamped_start, clamped_end, null);
    clamped_start = adjustedStart;
    clamped_end = adjustedEnd;

    // 조정 후 유효한 시간 범위 확인 (최소 5분)
    if (clamped_end - clamped_start < MIN_SESSION_MS) {
      setSnackbar({
        open: true,
        message: '유효한 시간 범위가 없습니다. 다른 시간대를 선택해주세요.',
        severity: 'warning'
      });
      setDragStartPercent(null);
      setDragCurrentPercent(null);
      setDragRowIndex(null);
      return;
    }

    if (wasAdjusted) {
      setSnackbar({
        open: true,
        message: '시간 충돌로 인해 자동 조정되었습니다.',
        severity: 'info'
      });
    }
    // ---------------------------

    setNewLogStart(clamped_start);
    setNewLogEnd(clamped_end);

    // 기존 작업 행에 드래그한 경우: 해당 작업의 정보를 자동으로 채움
    if (dragRowIndex !== null && dragRowIndex < uniqueRows.length) {
      const existing_row = uniqueRows[dragRowIndex];
      setNewTitle(existing_row.title);
      setNewProjectCode(existing_row.projectCode || '');
      setNewCategory(existing_row.category || null);
      setIsAddingSession(true);
    } else {
      // 새 작업 생성
      setNewTitle('');
      setNewProjectCode('');
      setNewCategory(null);
      setIsAddingSession(false);
    }

    setShowCreateModal(true);

    // 상태 초기화는 모달 닫을 때
    setDragStartPercent(null);
    setDragCurrentPercent(null);
    setDragRowIndex(null);
  };

  const handleCreateSave = () => {
    if (!newTitle.trim()) return;

    const new_log: TimerLog = {
      id: crypto.randomUUID(),
      title: newTitle,
      projectCode: newProjectCode || undefined,
      category: newCategory || undefined,
      startTime: newLogStart,
      endTime: newLogEnd,
      status: 'COMPLETED',
      pausedDuration: 0
    };

    addLog(new_log);
    handleCreateClose();
  };

  const handleCreateClose = () => {
    setShowCreateModal(false);
    setNewTitle('');
    setNewProjectCode('');
    setNewCategory(null);
    setIsAddingSession(false);
  };

  // 현재 시간 위치 계산 (실시간 업데이트)
  const current_time_percent = (getOffsetMinutes(currentTime) / totalMinutes) * 100;

  // --- 리사이즈 핸들러 ---
  
  // 퍼센트를 타임스탬프로 변환
  const percentToTimestamp = useCallback((percent: number) => {
    const base = new Date(selectedDate);
    base.setHours(timelineStartHour, 0, 0, 0);
    const minutes = (percent / 100) * totalMinutes;
    return base.getTime() + minutes * 60 * 1000;
  }, [selectedDate, timelineStartHour, totalMinutes]);

  // 스마트 리사이즈 시작 핸들러 (작은 작업용)
  const handleSmartResizeStart = useCallback((e: React.MouseEvent, item: TimerLog) => {
    e.stopPropagation();
    // 우클릭 등은 무시
    if (e.button !== 0) return;

    // 작업의 시각적 너비 확인
    const rect = e.currentTarget.getBoundingClientRect();
    const width_px = rect.width;
    
    // 24px 미만(약 3% 너비)일 때만 스마트 리사이즈 활성화
    // 또는 duration이 매우 짧은 경우 (예: 15분 미만)
    const duration_minutes = (item.endTime ? item.endTime - item.startTime : currentTime - item.startTime) / 1000 / 60;
    const is_visually_small = width_px < 24;
    const is_short_duration = duration_minutes < 15;

    if (is_visually_small || is_short_duration) {
      const percent = getPercentFromEvent(e);
      
      setIsResizing(true);
      setResizeLogId(item.id);
      setResizeType('smart'); // 방향 미정 상태
      setResizeStartPercent(percent);
      setResizeCurrentPercent(percent);
      setResizeOriginalStart(item.startTime);
      setResizeOriginalEnd(item.endTime || currentTime);
    }
  }, [currentTime]);

  // 리사이즈 시작
  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    log_id: string,
    type: 'start' | 'end',
    original_start: number,
    original_end: number | undefined
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    const percent = getPercentFromEvent(e);
    
    setIsResizing(true);
    setResizeLogId(log_id);
    setResizeType(type);
    setResizeStartPercent(percent);
    setResizeCurrentPercent(percent);
    setResizeOriginalStart(original_start);
    setResizeOriginalEnd(original_end || currentTime);
  }, [currentTime]);

  // 리사이즈 중 마우스 이동 (document 레벨)
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - LABEL_WIDTH - 16; // 패딩 16px 고려
      const width = rect.width - LABEL_WIDTH - 32; // 양쪽 패딩 32px 고려
      const percent = Math.min(Math.max((x / width) * 100, 0), 100);
      setResizeCurrentPercent(percent);

      // 스마트 리사이즈 방향 결정
      if (resizeType === 'smart' && resizeStartPercent !== null) {
        const delta = percent - resizeStartPercent;
        // 일정 거리 이상 움직였을 때 방향 결정 (약 0.5%)
        if (Math.abs(delta) > 0.5) {
          // 현재 리사이즈 중인 작업이 진행 중인지 확인
          const resizingLog = todayLogs.find(log => log.id === resizeLogId);
          const isRunningOrPaused = resizingLog && (resizingLog.status === 'RUNNING' || resizingLog.status === 'PAUSED');
          
          if (delta < 0) {
            setResizeType('start'); // 왼쪽으로 움직이면 시작 시간 조정
          } else {
            // 진행 중인 작업은 종료 시간 조정 불가 → 시작 시간 조정으로 대체
            setResizeType(isRunningOrPaused ? 'start' : 'end');
          }
        }
      }
      
      // 오른쪽 핸들('end')에서 시작했지만 왼쪽으로 드래그하면 시작시간 조정으로 전환
      // (20분 이내의 짧은 작업에서 핸들이 겹쳐있을 때를 위한 처리)
      if (resizeType === 'end' && resizeStartPercent !== null) {
        const duration = resizeOriginalEnd - resizeOriginalStart;
        const isShortTask = duration <= 20 * 60 * 1000; // 20분 이내
        
        if (isShortTask) {
          const delta = percent - resizeStartPercent;
          // 왼쪽으로 0.5% 이상 움직이면 시작 시간 조정으로 전환
          if (delta < -0.5) {
            setResizeType('start');
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (resizeLogId && resizeType && resizeStartPercent !== null && resizeCurrentPercent !== null) {
        const delta_percent = resizeCurrentPercent - resizeStartPercent;
        const delta_ms = (delta_percent / 100) * totalMinutes * 60 * 1000;

        let new_start = resizeOriginalStart;
        let new_end = resizeOriginalEnd;
        
        // smart 상태에서 mouseup된 경우, 최종 delta 방향으로 결정
        let effectiveResizeType = resizeType;
        if (resizeType === 'smart') {
          const resizingLog = todayLogs.find(log => log.id === resizeLogId);
          const isRunningOrPaused = resizingLog && (resizingLog.status === 'RUNNING' || resizingLog.status === 'PAUSED');
          
          if (delta_percent < 0) {
            effectiveResizeType = 'start';
          } else if (delta_percent > 0) {
            effectiveResizeType = isRunningOrPaused ? 'start' : 'end';
          } else {
            // 움직임이 없으면 리사이즈 취소
            setIsResizing(false);
            setResizeLogId(null);
            setResizeType(null);
            setResizeStartPercent(null);
            setResizeCurrentPercent(null);
            return;
          }
        }

        // 하루 범위 계산 (06:00 ~ 익일 06:00)
        // 주의: useEffect 내부이므로 getBaseTime을 직접 호출하기보다 selectedDate 의존성을 활용
        // 여기서는 클로저 내의 getBaseTime을 사용 (의존성 배열에 추가 필요)
        const dayStart = getBaseTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;

        if (effectiveResizeType === 'start') {
          new_start = resizeOriginalStart + delta_ms;
          
          // 1. 하루 범위 벗어나지 않도록 제한
          new_start = Math.max(dayStart, new_start);
          
          // 스냅 적용
          new_start = getSnappedTime(new_start, resizeLogId);

          // 2. 시작 시간이 종료 시간보다 늦어지지 않도록 (최소 5분 간격)
          if (new_start >= new_end - 5 * 60 * 1000) {
            new_start = new_end - 5 * 60 * 1000;
          }
        } else {
          new_end = resizeOriginalEnd + delta_ms;
          
          // 1. 하루 범위 벗어나지 않도록 제한
          new_end = Math.min(dayEnd, new_end);

          // 스냅 적용
          new_end = getSnappedTime(new_end, resizeLogId);

          // 2. 종료 시간이 시작 시간보다 빨라지지 않도록 (최소 5분 간격)
          if (new_end <= new_start + 5 * 60 * 1000) {
            new_end = new_start + 5 * 60 * 1000;
          }
        }

        // 시간이 변경되었을 때만 업데이트
        if (new_start !== resizeOriginalStart || new_end !== resizeOriginalEnd) {
          // --- 충돌 자동 조정 로직 (동시에 여러 작업 세션 불가) ---
          const { adjustedStart, adjustedEnd, wasAdjusted } = adjustForOverlap(new_start, new_end, resizeLogId);
          new_start = adjustedStart;
          new_end = adjustedEnd;

          // 조정 후 유효한 시간 범위 확인 (최소 5분)
          if (new_end - new_start < MIN_SESSION_MS) {
            setSnackbar({
              open: true,
              message: '유효한 시간 범위가 없습니다. 리사이즈가 취소되었습니다.',
              severity: 'warning'
            });
            // 리사이즈 취소 - 상태 초기화만 하고 업데이트하지 않음
            setIsResizing(false);
            setResizeLogId(null);
            setResizeType(null);
            setResizeStartPercent(null);
            setResizeCurrentPercent(null);
            return;
          }

          if (wasAdjusted) {
            setSnackbar({
              open: true,
              message: '시간 충돌로 인해 자동 조정되었습니다.',
              severity: 'info'
            });
          }
          // ---------------------------

          updateLog(resizeLogId, {
            startTime: new_start,
            endTime: new_end
          });
        }
      }

      // 상태 초기화
      setIsResizing(false);
      setResizeLogId(null);
      setResizeType(null);
      setResizeStartPercent(null);
      setResizeCurrentPercent(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeLogId, resizeType, resizeStartPercent, resizeCurrentPercent, resizeOriginalStart, resizeOriginalEnd, updateLog, totalMinutes, getBaseTime, getSnappedTime, checkOverlap]);

  // 리사이즈 중인 아이템의 미리보기 계산
  const getResizePreview = useCallback((item: typeof chartItems[0]) => {
    if (!isResizing || resizeLogId !== item.id || resizeStartPercent === null || resizeCurrentPercent === null) {
      return { left_percent: item.left_percent, width_percent: item.width_percent };
    }

    const delta_percent = resizeCurrentPercent - resizeStartPercent;

    if (resizeType === 'start') {
      let new_left = item.left_percent + delta_percent;
      let new_width = item.width_percent - delta_percent;
      
      // 최소 너비 유지
      if (new_width < 0.35) { // 약 5분
        new_width = 0.35;
        new_left = item.left_percent + item.width_percent - new_width;
      }
      if (new_left < 0) {
        new_width = new_width + new_left;
        new_left = 0;
      }
      
      return { left_percent: new_left, width_percent: new_width };
    } else if (resizeType === 'end') {
      let new_width = item.width_percent + delta_percent;
      
      // 최소 너비 유지
      if (new_width < 0.35) {
        new_width = 0.35;
      }
      // 최대 범위 제한
      if (item.left_percent + new_width > 100) {
        new_width = 100 - item.left_percent;
      }
      
      return { left_percent: item.left_percent, width_percent: new_width };
    }
    
    // smart 상태이거나 기타 상태일 때는 변경 없음
    return { left_percent: item.left_percent, width_percent: item.width_percent };
  }, [isResizing, resizeLogId, resizeStartPercent, resizeCurrentPercent, resizeType, chartItems]);

  // 컨텍스트 메뉴 핸들러
  const handleContextMenu = (event: React.MouseEvent, log: TimerLog) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
            log: log,
          }
        : null,
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // 작업 수정/삭제 핸들러
  const handleEditTask = () => {
    if (contextMenu?.log) {
      openEditModal(contextMenu.log);
    }
    handleCloseContextMenu();
  };

  const handleDeleteTask = () => {
    if (contextMenu?.log) {
      // 진행중인 작업인 경우 먼저 타이머 중지
      if (activeTimer && activeTimer.id === contextMenu.log.id) {
        stopTimer();
      }
      deleteLog(contextMenu.log.id);
      
      // 토스트 알림 표시
      setSnackbar({
        open: true,
        message: '작업이 휴지통으로 이동되었습니다.',
        severity: 'success'
      });
    }
    handleCloseContextMenu();
  };

  const openEditModal = (log: TimerLog) => {
    setEditingLog(log);
    setEditTitle(log.title);
    setEditProjectCode(log.projectCode || '');
    setEditCategory(log.category || null);
  };

  const handleEditSave = () => {
    if (editingLog && editTitle.trim()) {
      updateLog(editingLog.id, {
        title: editTitle,
        projectCode: editProjectCode || undefined,
        category: editCategory || undefined
      });
      handleEditClose();
    }
  };

  const handleEditClose = () => {
    setEditingLog(null);
    setEditTitle('');
    setEditProjectCode('');
    setEditCategory(null);
  };

  return (
    <>
    <Paper variant="outlined" sx={{ p: 2, overflowX: 'auto', userSelect: 'none', bgcolor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      {/* 툴팁 제거: Box로 대체 */}
      <Box
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setIsHoveringBar(false);
        }}
        sx={{
          position: 'relative',
          height: chart_height,
          minWidth: 800,
          cursor: 'crosshair',
          bgcolor: 'var(--bg-secondary)', // 드래그 영역 배경
          px: 2 // 좌우 패딩 추가 (라벨 잘림 방지)
        }}
      >
        {/* 라벨 영역 리사이저 핸들 */}
        {uniqueRows.length > 0 && (
          <Box
            onMouseDown={handleLabelResizeStart}
            sx={{
              position: 'absolute',
              left: LABEL_WIDTH + 16 - 4, // 라벨 영역 오른쪽 경계
              top: 0,
              bottom: 0,
              width: 8,
              cursor: 'col-resize',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                bgcolor: 'rgba(var(--primary-rgb), 0.1)',
              },
              '&:hover::after': {
                opacity: 1,
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                width: 2,
                top: 0,
                bottom: 0,
                bgcolor: isResizingLabel ? 'var(--primary-color)' : 'var(--border-color)',
                opacity: isResizingLabel ? 1 : 0,
                transition: 'opacity 0.15s',
              }
            }}
          />
        )}

        {/* 시간축 헤더 */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: LABEL_WIDTH + 16, // 패딩(16px) 고려
          right: 16, // 패딩(16px) 고려
          height: HEADER_HEIGHT,
          borderBottom: '1px solid var(--border-color)',
          overflow: 'hidden', // 라벨 영역 침범 방지
          pointerEvents: 'none', // 드래그앤드롭 방지
        }}>
          {timeLabels.map((item, index) => {
            // 라벨 위치에 따라 정렬 조정 (양끝 잘림 방지)
            let transform = 'translateX(-50%)';
            if (item.left_percent < 5) transform = 'translateX(0)'; // 왼쪽 끝 (임계값 증가)
            else if (item.left_percent > 95) transform = 'translateX(-100%)'; // 오른쪽 끝

            return (
              <Typography
                key={index}
                variant="caption"
                sx={{
                  position: 'absolute',
                  left: `${item.left_percent}%`,
                  top: 4,
                  transform: transform,
                  color: 'var(--text-secondary)',
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.label}
              </Typography>
            );
          })}
        </Box>

        {/* 타임라인 영역 (그리드, 점심시간, 드래그 영역, 현재 시간 라인 공통 컨테이너) */}
        <Box sx={{
          position: 'absolute',
          top: HEADER_HEIGHT,
          left: LABEL_WIDTH + 16,
          right: 16,
          bottom: 0,
          pointerEvents: 'none',
        }}>
          {/* 세로 그리드 라인 */}
          {timeLabels.map((item, index) => (
            <Box
              key={index}
              sx={{
                position: 'absolute',
                left: `${item.left_percent}%`,
                top: 0,
                bottom: 0,
                borderLeft: '1px dashed var(--border-color)',
                zIndex: 0,
              }}
            />
          ))}

          {/* 점심시간 표시 영역 */}
          {lunchTimeStyle && (
            <Box
              sx={{
                position: 'absolute',
                left: `${lunchTimeStyle.leftPercent}%`,
                width: `${lunchTimeStyle.widthPercent}%`,
                top: 0,
                bottom: 0,
                backgroundImage: 'repeating-linear-gradient(45deg, var(--bg-tertiary), var(--bg-tertiary) 10px, var(--bg-secondary) 10px, var(--bg-secondary) 20px)',
                borderLeft: '1px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                zIndex: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.7
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'var(--text-secondary)', 
                  fontWeight: 600,
                  bgcolor: 'var(--bg-secondary)',
                  px: 0.5,
                  borderRadius: 0.5,
                  fontSize: '0.7rem',
                  opacity: 0.8
                }}
              >
                점심시간
              </Typography>
            </Box>
          )}

          {/* 드래그 중인 영역 표시 */}
          {isDragging && dragStartPercent !== null && dragCurrentPercent !== null && dragRowIndex !== null && (
            <Box
              sx={{
                position: 'absolute',
                left: `${Math.min(dragStartPercent, dragCurrentPercent)}%`,
                width: `${Math.abs(dragCurrentPercent - dragStartPercent)}%`,
                top: Math.min(dragRowIndex, uniqueRows.length) * (ROW_HEIGHT + ROW_GAP) + 4,
                height: ROW_HEIGHT - 8,
                bgcolor: 'var(--highlight-light)',
                border: '2px dashed var(--text-primary)',
                borderRadius: 0.5,
                zIndex: 10,
              }}
            />
          )}

          {/* 현재 시간 표시 라인 (오늘만 표시) */}
          {isToday && (
            <Box
              sx={{
                position: 'absolute',
                left: `${current_time_percent}%`,
                top: -HEADER_HEIGHT,
                bottom: 0,
                borderLeft: '2px solid var(--error-color)',
                zIndex: 5,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: HEADER_HEIGHT - 6,
                  left: -5,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: 'var(--error-color)'
                }}
              />
            </Box>
          )}
        </Box>

        {/* 작업 행들 - 제목별로 그룹화 */}
        {uniqueRows.map((row, row_index) => {
          // 해당 행에 속하는 모든 막대들
          const row_items = chartItems.filter(item => item.row_index === row_index);
          const has_running = row_items.some(item => item.status === 'RUNNING');

          return (
            <Box
              key={row.title}
              sx={{
                position: 'absolute',
                top: HEADER_HEIGHT + row_index * (ROW_HEIGHT + ROW_GAP),
                left: 16, // 패딩
                right: 16, // 패딩
                height: ROW_HEIGHT,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {/* 왼쪽 작업명 라벨 */}
              <Box sx={{
                width: LABEL_WIDTH,
                px: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                overflow: 'hidden',
                pointerEvents: 'none', // 드래그앤드롭 방지
              }}>
                {row.projectCode && (
                  <Chip
                    label={getProjectName(row.projectCode)}
                    size="small"
                    title={`[${row.projectCode}] ${getProjectName(row.projectCode)}`}
                    sx={{
                      flexShrink: 0,
                      height: 18,
                      maxWidth: 80,
                      fontSize: '0.6rem',
                      bgcolor: row.color,
                      color: '#fff', // 칩 텍스트는 항상 흰색 유지 (배경색이 진한 편이므로)
                      '& .MuiChip-label': { 
                        px: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }
                    }}
                  />
                )}
                <Typography
                  variant="caption"
                  component="span"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: has_running ? 600 : 400,
                    color: has_running ? 'var(--primary-color)' : 'var(--text-primary) !important'
                  }}
                  title={row.title}
                >
                  {row.title}
                </Typography>
              </Box>

              {/* 오른쪽 타임라인 영역 */}
              <Box sx={{
                flex: 1,
                position: 'relative',
                height: '100%'
              }}>
                {/* 해당 행의 모든 작업 막대들 */}
                {row_items.map((item) => {
                  const preview = getResizePreview(item);
                  const is_resizing_this = isResizing && resizeLogId === item.id;
                  const is_completed = item.status === 'COMPLETED';
                  
                  const is_context_menu_open = contextMenu !== null;
                  
                  // 드래그/리사이즈/컨텍스트 메뉴 중에는 툴팁 비활성화
                  const should_disable_tooltip = is_context_menu_open || is_resizing_this || isDragging || isResizing;
                  
                  return (
                    <Tooltip
                      key={item.id}
                      title={
                        should_disable_tooltip ? "" : (
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="subtitle2" sx={{ color: '#fff' }}>{item.title}</Typography>
                          {item.category && (
                            <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              {item.category}
                            </Typography>
                          )}
                          <Typography variant="caption" display="block" sx={{ color: '#fff' }}>
                            {formatTimeRange(item.startTime, item.endTime)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#fff' }}>
                            {formatDuration((item.endTime ? item.endTime - item.startTime : currentTime - item.startTime) / 1000)}
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'rgba(255,255,255,0.6)' }}>
                            우클릭: 메뉴 / 더블클릭: 수정 / 양끝: 크기 조절
                          </Typography>
                        </Box>
                        )
                      }
                      arrow
                      enterDelay={300}
                      enterNextDelay={300}
                      // 드래그/리사이즈 중이거나 컨텍스트 메뉴가 열려있으면 강제로 닫음
                      open={should_disable_tooltip ? false : undefined}
                      disableHoverListener={should_disable_tooltip}
                      PopperProps={{
                        sx: { pointerEvents: 'none' }
                      }}
                    >
                      <Box
                        onMouseDown={(e) => {
                          // 모든 작업에 대해 스마트 리사이즈 시도
                          handleSmartResizeStart(e, item);
                        }}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          openEditModal(item);
                        }}
                        onMouseEnter={() => setIsHoveringBar(true)}
                        onMouseLeave={() => !isResizing && setIsHoveringBar(false)}
                        sx={{
                          position: 'absolute',
                          left: `${preview.left_percent}%`,
                          width: `${preview.width_percent}%`,
                          top: 4,
                          bottom: 4,
                          bgcolor: item.color,
                          opacity: item.status === 'RUNNING' ? 1 : (is_resizing_this ? 0.9 : 0.85),
                          borderRadius: 0.5,
                          cursor: 'pointer',
                          zIndex: is_resizing_this ? 10 : 1,
                          boxShadow: item.status === 'RUNNING' ? '0 0 8px rgba(0,0,0,0.3)' : (is_resizing_this ? '0 0 12px rgba(0,0,0,0.4)' : 'none'),
                          transition: is_resizing_this ? 'none' : 'all 0.15s',
                          '&:hover': {
                            opacity: 1,
                            transform: is_resizing_this ? 'none' : 'scaleY(1.15)',
                            zIndex: 2,
                          }
                        }}
                      >
                        {/* 리사이즈 핸들 표시 */}
                        <>
                          {/* 왼쪽 리사이즈 핸들 (시작 시간) - 모든 작업에 표시 */}
                          <Box
                            onMouseDown={(e) => handleResizeStart(e, item.id, 'start', item.startTime, item.endTime)}
                            sx={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: RESIZE_HANDLE_WIDTH,
                              cursor: 'ew-resize',
                              borderRadius: '4px 0 0 4px',
                              bgcolor: 'transparent',
                              transition: 'background-color 0.15s',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.3)',
                              },
                              '&::after': {
                                content: '""',
                                position: 'absolute',
                                left: 2,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 2,
                                height: 12,
                                bgcolor: 'rgba(255,255,255,0.5)',
                                borderRadius: 1,
                              }
                            }}
                          />
                          {/* 오른쪽 리사이즈 핸들 (종료 시간) - 완료 또는 일시정지된 작업(endTime 있음)에 표시 */}
                          {(is_completed || (item.status === 'PAUSED' && item.endTime)) && (
                            <Box
                              onMouseDown={(e) => handleResizeStart(e, item.id, 'end', item.startTime, item.endTime)}
                              sx={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: RESIZE_HANDLE_WIDTH,
                                cursor: 'ew-resize',
                                borderRadius: '0 4px 4px 0',
                                bgcolor: 'transparent',
                                transition: 'background-color 0.15s',
                                '&:hover': {
                                  bgcolor: 'rgba(255,255,255,0.3)',
                                },
                                '&::after': {
                                  content: '""',
                                  position: 'absolute',
                                  right: 2,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: 2,
                                  height: 12,
                                  bgcolor: 'rgba(255,255,255,0.5)',
                                  borderRadius: 1,
                                }
                              }}
                            />
                          )}
                        </>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          );
        })}


      </Box>

      {/* 우클릭 메뉴 */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleEditTask}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>수정</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteTask}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>삭제</ListItemText>
        </MenuItem>
      </Menu>

      {/* 수동 입력 모달 */}
      <Dialog 
        open={showCreateModal} 
        onClose={handleCreateClose} 
        maxWidth="sm" 
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && (isAddingSession || newTitle.trim())) {
            e.preventDefault();
            handleCreateSave();
          }
        }}
      >
        <DialogTitle>
          {isAddingSession ? `"${newTitle}" 세션 추가` : '새 업무 기록 (수동)'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              시간: {formatTimeRange(newLogStart, newLogEnd)}
            </Typography>
            {isAddingSession ? (
              // 기존 작업에 세션 추가: 제목 표시 + 다른 작업으로 변경 옵션
              <Box sx={{ p: 2, bgcolor: 'var(--bg-hover)', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      작업
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {newTitle}
                    </Typography>
                  </Box>
                  <Button 
                    size="small" 
                    onClick={() => {
                      setIsAddingSession(false);
                      setNewTitle('');
                      setNewProjectCode('');
                      setNewCategory(null);
                    }}
                    sx={{ fontSize: '0.75rem', minWidth: 'auto' }}
                  >
                    다른 작업으로 변경
                  </Button>
                </Box>
                {(newProjectCode || newCategory) && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {newProjectCode && (
                      <Chip label={getProjectName(newProjectCode)} size="small" variant="outlined" title={`[${newProjectCode}]`} />
                    )}
                    {newCategory && (
                      <Chip label={newCategory} size="small" sx={{ bgcolor: 'var(--bg-secondary)' }} />
                    )}
                  </Box>
                )}
              </Box>
            ) : (
              // 새 작업 생성: 제목 입력 가능
              <>
                <TextField
                  label="업무 제목"
                  fullWidth
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Autocomplete
                    freeSolo
                    options={projectOptions}
                    value={getProjectDisplayValue(newProjectCode)}
                    onInputChange={(_e, newValue) => handleProjectCodeChange(newValue, setNewProjectCode)}
                    renderInput={(params) => <TextField {...params} label="프로젝트 코드" />}
                    sx={{ flex: 1 }}
                  />
                  <CategoryAutocomplete
                    value={newCategory}
                    onChange={(newValue) => setNewCategory(newValue)}
                    label="카테고리"
                    variant="outlined"
                    sx={{ flex: 1 }}
                  />
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose}>취소</Button>
          <Button onClick={handleCreateSave} variant="contained" color="primary">
            {isAddingSession ? '세션 추가(Enter)' : '저장(Enter)'}
          </Button>
        </DialogActions>
      </Dialog>

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
                onInputChange={(_e, newValue) => handleProjectCodeChange(newValue, setEditProjectCode)}
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>취소</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">저장(Enter)</Button>
        </DialogActions>
      </Dialog>
      
    </Paper>
    
    {/* 충돌 알림 - Portal로 body에 렌더링 */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      TransitionComponent={SlideTransition}
      sx={{ position: 'fixed', top: '24px !important' }}
    >
      <Box
        sx={{ 
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          backgroundColor: snackbar.severity === 'warning' 
            ? 'rgba(255, 152, 0, 0.25)' 
            : snackbar.severity === 'success'
              ? 'rgba(76, 175, 80, 0.25)'
              : 'rgba(33, 150, 243, 0.25)',
          border: snackbar.severity === 'warning'
            ? '1px solid rgba(255, 152, 0, 0.6)'
            : snackbar.severity === 'success'
              ? '1px solid rgba(76, 175, 80, 0.6)'
              : '1px solid rgba(33, 150, 243, 0.6)',
          borderRadius: '8px',
          padding: '8px 16px',
          color: snackbar.severity === 'warning' 
            ? (themeConfig.isDark ? '#ffb74d' : '#e65100')
            : snackbar.severity === 'success'
              ? (themeConfig.isDark ? '#81c784' : '#2e7d32')
              : (themeConfig.isDark ? '#64b5f6' : '#1565c0'),
          fontWeight: 500,
          fontSize: '0.875rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {snackbar.message}
      </Box>
    </Snackbar>
    </>
  );
};

export default GanttChart;
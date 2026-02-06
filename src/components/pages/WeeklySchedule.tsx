import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Snackbar,
  Alert,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PaletteIcon from '@mui/icons-material/Palette';
import { useTimerStore, TimerLog } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useStatusStore } from '../../store/useStatusStore';
import { useDeployCalendarStore } from '../../store/useDeployCalendarStore';
import StatusSelect from '../common/StatusSelect';
import JobColorManager from '../calendar/JobColorManager';
import { formatDuration } from '../../utils/timeUtils';

const DEFAULT_JOB_COLOR = '#e5e7eb';

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

// 요일 한글 표시
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 프로젝트별 그룹 타입
interface ProjectGroup {
  projectCode: string;
  projectName: string;
  status: 'completed' | 'in_progress';
  startDate: string;
  totalSeconds: number;           // 해당 날짜의 소요 시간
  cumulativeSeconds: number;      // 시작일부터 해당 날짜까지의 누적 시간
  tasks: {
    title: string;
    seconds: number;              // 해당 날짜의 소요 시간
    cumulativeSeconds: number;    // 시작일부터 해당 날짜까지의 누적 시간
    logs: TimerLog[];
  }[];
}

// 날짜별 데이터 타입
interface DayData {
  date: Date;
  dateKey: string;
  dayLabel: string;
  projects: ProjectGroup[];
  totalSeconds: number;
}

const WeeklySchedule: React.FC = () => {
  const { logs } = useTimerStore();
  const { getProjectName, projects: projectList } = useProjectStore();
  const { getStatusLabel } = useStatusStore();
  const getJobColor = useDeployCalendarStore((s) => s.getJobColor);

  // 선택된 주 (월요일 날짜)
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // 필터 상태 (all: 전체, exclude:특정프로젝트 제외)
  const [filterMode, setFilterMode] = useState<'all' | 'exclude'>(() => {
    const saved = localStorage.getItem('weeklyScheduleFilterMode');
    return saved === 'exclude' ? 'exclude' : 'all';
  });
  const [excludedProject, setExcludedProject] = useState<string>(() => {
    return localStorage.getItem('weeklyScheduleExcludedProject') || '';
  });

  // 복사 미리보기 탭 (1: 간단형, 2: 상세형, 3: 라벨형)
  const [copyFormat, setCopyFormat] = useState<'1' | '2' | '3'>(() => {
    const saved = localStorage.getItem('weeklyScheduleCopyFormat');
    return saved === '2' || saved === '3' ? saved : '1';
  });

  // 확장된 프로젝트 상태
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // 프로젝트별 진행상태 오버라이드 (key: dateKey-projectCode, value: status)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, 'completed' | 'in_progress'>>({});

  // 스낵바 상태
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  // 잡 색상 설정 모달
  const [colorManagerOpen, setColorManagerOpen] = useState(false);

  // 이번 주인지 확인
  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + diff);
    thisMonday.setHours(0, 0, 0, 0);
    return selectedWeekStart.getTime() === thisMonday.getTime();
  }, [selectedWeekStart]);

  // 주간 날짜 배열 (월~일)
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(selectedWeekStart);
      date.setDate(selectedWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selectedWeekStart]);

  // 필터링에 사용 가능한 프로젝트 목록
  const availableProjects = useMemo(() => {
    const projectCodes = new Set<string>();
    logs.forEach(log => {
      if (log.projectCode) {
        projectCodes.add(log.projectCode);
      }
    });
    return Array.from(projectCodes).map(code => ({
      code,
      name: getProjectName(code)
    }));
  }, [logs, getProjectName]);

  // 로그 소요 시간 계산 헬퍼 함수
  const calcLogDuration = (log: TimerLog) => {
    const rawDurationSec = log.endTime 
      ? (log.endTime - log.startTime) / 1000
      : (Date.now() - log.startTime) / 1000;
    const safePausedDuration = log.pausedDuration > rawDurationSec ? 0 : log.pausedDuration;
    return Math.max(0, rawDurationSec - safePausedDuration);
  };

  // 프로젝트별/업무별 누적시간 계산 (시작일부터 특정 날짜까지)
  const calcCumulativeSeconds = useMemo(() => {
    // 프로젝트별 시작일 및 모든 로그 캐시
    const projectFirstStart = new Map<string, number>();
    const taskFirstStart = new Map<string, number>(); // key: projectCode-title
    
    logs.forEach(log => {
      const projectCode = log.projectCode || '미지정';
      const taskKey = `${projectCode}:::${log.title}`;
      
      // 프로젝트 시작일
      if (!projectFirstStart.has(projectCode) || log.startTime < projectFirstStart.get(projectCode)!) {
        projectFirstStart.set(projectCode, log.startTime);
      }
      
      // 업무 시작일
      if (!taskFirstStart.has(taskKey) || log.startTime < taskFirstStart.get(taskKey)!) {
        taskFirstStart.set(taskKey, log.startTime);
      }
    });

    return {
      // 특정 날짜까지의 프로젝트 누적시간
      getProjectCumulative: (projectCode: string, untilDate: Date) => {
        const dayEnd = new Date(untilDate);
        dayEnd.setDate(dayEnd.getDate() + 1);
        dayEnd.setHours(0, 0, 0, 0);
        
        return logs
          .filter(log => (log.projectCode || '미지정') === projectCode && log.startTime < dayEnd.getTime())
          .reduce((sum, log) => sum + calcLogDuration(log), 0);
      },
      
      // 특정 날짜까지의 업무 누적시간
      getTaskCumulative: (projectCode: string, title: string, untilDate: Date) => {
        const dayEnd = new Date(untilDate);
        dayEnd.setDate(dayEnd.getDate() + 1);
        dayEnd.setHours(0, 0, 0, 0);
        
        return logs
          .filter(log => (log.projectCode || '미지정') === projectCode && log.title === title && log.startTime < dayEnd.getTime())
          .reduce((sum, log) => sum + calcLogDuration(log), 0);
      },
      
      // 프로젝트 시작일
      getProjectStartDate: (projectCode: string) => {
        const startTime = projectFirstStart.get(projectCode);
        if (startTime) {
          const date = new Date(startTime);
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
          return `${month}/${day}(${weekday})`;
        }
        return '';
      }
    };
  }, [logs]);

  // 주간 데이터 집계 (날짜별 → 프로젝트별 → 업무별)
  const weeklyData = useMemo(() => {
    const startTime = selectedWeekStart.getTime();
    const endTime = startTime + 7 * 24 * 60 * 60 * 1000;

    // 기간 내 로그 필터링
    let filtered = logs.filter(
      (log) =>
        log.startTime >= startTime &&
        log.startTime < endTime
    );

    // 필터 적용
    if (filterMode === 'exclude' && excludedProject) {
      filtered = filtered.filter(log => log.projectCode !== excludedProject);
    }

    // 날짜별로 데이터 구성
    const dayDataList: DayData[] = weekDates.map(date => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      dayEnd.setHours(0, 0, 0, 0);

      const dayLogs = filtered.filter(
        log => log.startTime >= dayStart.getTime() && log.startTime < dayEnd.getTime()
      );

      // 프로젝트별 그룹화
      const projectMap = new Map<string, ProjectGroup>();

      dayLogs.forEach(log => {
        const projectCode = log.projectCode || '미지정';
        const projectName = projectCode === '미지정' ? '기타' : getProjectName(projectCode);

        if (!projectMap.has(projectCode)) {
          projectMap.set(projectCode, {
            projectCode,
            projectName,
            status: 'completed',
            startDate: calcCumulativeSeconds.getProjectStartDate(projectCode),
            totalSeconds: 0,
            cumulativeSeconds: 0,
            tasks: []
          });
        }

        const group = projectMap.get(projectCode)!;

        // 진행 상태 업데이트
        if (log.status !== 'COMPLETED') {
          group.status = 'in_progress';
        }

        // 해당 날짜의 소요 시간
        const duration = calcLogDuration(log);
        group.totalSeconds += duration;

        // 업무별 그룹화
        const existingTask = group.tasks.find(t => t.title === log.title);
        if (existingTask) {
          existingTask.seconds += duration;
          existingTask.logs.push(log);
        } else {
          group.tasks.push({
            title: log.title,
            seconds: duration,
            cumulativeSeconds: 0, // 나중에 계산
            logs: [log]
          });
        }
      });

      // 누적시간 계산 (해당 날짜까지의 전체 누적)
      projectMap.forEach((group) => {
        group.cumulativeSeconds = calcCumulativeSeconds.getProjectCumulative(group.projectCode, date);
        group.tasks.forEach(task => {
          task.cumulativeSeconds = calcCumulativeSeconds.getTaskCumulative(group.projectCode, task.title, date);
        });
      });

      const projects = Array.from(projectMap.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);

      return {
        date,
        dateKey: date.toISOString().split('T')[0],
        dayLabel: `${date.getMonth() + 1}/${date.getDate()} (${DAY_NAMES[date.getDay()]})`,
        projects,
        totalSeconds: projects.reduce((sum, p) => sum + p.totalSeconds, 0)
      };
    });

    // 업무가 있는 날짜만 필터 (또는 전체 표시)
    const filteredDayData = dayDataList.filter(d => d.projects.length > 0);

    // 전체 통계
    const totalSeconds = filteredDayData.reduce((sum, d) => sum + d.totalSeconds, 0);

    return {
      days: filteredDayData,
      totalSeconds,
      allLogs: filtered
    };
  }, [logs, selectedWeekStart, weekDates, filterMode, excludedProject, getProjectName, calcCumulativeSeconds]);

  // 잡 색상 설정에 노출할 잡 코드: localStorage 프로젝트 + 이번 주 로그에 등장한 잡 (배포 캘린더에 없는 잡도 설정 가능)
  const job_codes_for_color_manager = useMemo(() => {
    const set = new Set(projectList.map((p) => p.code));
    weeklyData.allLogs.forEach((log) => {
      if (log.projectCode) set.add(log.projectCode);
    });
    return Array.from(set);
  }, [projectList, weeklyData.allLogs]);

  // 주 이동 핸들러
  const handlePrevWeek = () => {
    const prev = new Date(selectedWeekStart);
    prev.setDate(prev.getDate() - 7);
    setSelectedWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selectedWeekStart);
    next.setDate(next.getDate() + 7);
    setSelectedWeekStart(next);
  };

  const handleThisWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    setSelectedWeekStart(monday);
  };

  // 주 표시 포맷 (n월 n주차)
  const formatWeekLabel = () => {
    const weekOfMonth = Math.ceil(selectedWeekStart.getDate() / 7);
    return `${selectedWeekStart.getFullYear()}년 ${selectedWeekStart.getMonth() + 1}월 ${weekOfMonth}주차`;
  };

  // 주간 범위 포맷
  const formatWeekRange = () => {
    const end = new Date(selectedWeekStart);
    end.setDate(end.getDate() + 6);
    return `${selectedWeekStart.getFullYear()}년 ${selectedWeekStart.getMonth() + 1}/${selectedWeekStart.getDate()}일 ~ ${end.getMonth() + 1}/${end.getDate()}일`;
  };

  // 시간 포맷 (HH:MM)
  const formatTimeHHMM = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // 프로젝트 토글
  const toggleProject = (key: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 프로젝트 표시명 생성 (이름이 없으면 빈 문자열)
  const getDisplayProjectName = (project: ProjectGroup) => {
    return project.projectName !== project.projectCode ? project.projectName : '';
  };

  // 복사 템플릿 생성 (형식 1: 간단형 - 구분선 없음, 프로젝트/날짜 구간에 줄바꿈)
  const generateFormat1 = () => {
    let text = '';

    weeklyData.days.forEach(day => {
      text += `${day.dayLabel}\n`;

      day.projects.forEach(project => {
        const projectKey = `${day.dateKey}-${project.projectCode}`;
        const status = statusOverrides[projectKey] || project.status;
        const statusText = getStatusLabel(status);
        const displayName = getDisplayProjectName(project);
        const nameSection = displayName ? `${displayName} ` : '';
        text += `[${project.projectCode}] ${nameSection} (진행상태: ${statusText}, 시작일자: ${project.startDate}, 누적시간: ${formatTimeHHMM(project.cumulativeSeconds)})\n`;

        project.tasks.forEach(task => {
          text += `  > ${task.title} (누적시간: ${formatTimeHHMM(task.cumulativeSeconds)})\n`;
        });
        text += '\n';
      });
      text += '\n';
    });

    return text;
  };

  // 복사 템플릿 생성 (형식 2: 상세형 - 구분선 포함)
  const generateFormat2 = () => {
    let text = '';

    weeklyData.days.forEach(day => {
      text += `${'─'.repeat(40)}\n`;
      text += `■ ${day.dayLabel}\n`;
      text += `${'─'.repeat(40)}\n`;

      day.projects.forEach(project => {
        const projectKey = `${day.dateKey}-${project.projectCode}`;
        const status = statusOverrides[projectKey] || project.status;
        const statusText = getStatusLabel(status);
        const displayName = getDisplayProjectName(project);
        const nameSection = displayName ? `${displayName} ` : '';
        text += `[${project.projectCode}] ${nameSection} (진행상태: ${statusText}, 시작일자: ${project.startDate}, 누적시간: ${formatTimeHHMM(project.cumulativeSeconds)})\n`;

        project.tasks.forEach(task => {
          text += `  · ${task.title} (누적시간: ${formatTimeHHMM(task.cumulativeSeconds)})\n`;
        });
        text += '\n';
      });
    });

    return text;
  };

  // HTML 복사 템플릿 (상세형: span·br 기반, 잡 라벨에는 색상 미적용)
  const generateFormatHtml = () => {
    const parts: string[] = [];
    const line40 = '─'.repeat(40);
    weeklyData.days.forEach((day) => {
      parts.push(`${escapeHtml(line40)}<br>`);
      parts.push(`■ ${escapeHtml(day.dayLabel)}<br>`);
      parts.push(`${escapeHtml(line40)}<br>`);

      day.projects.forEach((project) => {
        const projectKey = `${day.dateKey}-${project.projectCode}`;
        const status = statusOverrides[projectKey] || project.status;
        const statusText = getStatusLabel(status);
        const displayName = getDisplayProjectName(project);
        const nameSection = displayName ? ` ${escapeHtml(displayName)}` : '';
        const labelHtml =
          `<span style="font-weight: bold; font-size: 13px;">[${escapeHtml(project.projectCode)}]${nameSection}</span>`;
        const metaHtml =
          `<span style="font-size: 13px;">(진행상태: ${escapeHtml(statusText)}, 시작일자: ${escapeHtml(project.startDate)}, 누적시간: ${formatTimeHHMM(project.cumulativeSeconds)})</span>`;
        parts.push(labelHtml + '&nbsp;' + metaHtml + '<br>');
        project.tasks.forEach((task) => {
          parts.push(
            `&nbsp;&nbsp;· ${escapeHtml(task.title)} (누적시간: ${formatTimeHHMM(task.cumulativeSeconds)})<br>`
          );
        });
        parts.push('<br>');
      });
    });
    return parts.join('');
  };

  // HTML 복사 템플릿 (라벨형: 잡 라벨만 inline table td+bgcolor, 진행상태·작업은 span+br로 상세형과 동일한 줄맵)
  const generateFormatHtmlTable = () => {
    const parts: string[] = [];
    const line40 = '─'.repeat(40);
    const labelTableStyle = 'display: inline-table; border: 0; border-collapse: collapse;';

    weeklyData.days.forEach((day) => {
      parts.push(`${escapeHtml(line40)}<br>`);
      parts.push(`■ ${escapeHtml(day.dayLabel)}<br>`);
      parts.push(`${escapeHtml(line40)}<br>`);

      day.projects.forEach((project) => {
        const projectKey = `${day.dateKey}-${project.projectCode}`;
        const status = statusOverrides[projectKey] || project.status;
        const statusText = getStatusLabel(status);
        const displayName = getDisplayProjectName(project);
        const nameSection = displayName ? ` ${escapeHtml(displayName)}` : '';
        const bgHex = getJobColor(project.projectCode) || DEFAULT_JOB_COLOR;

        parts.push(
          `<table cellspacing="0" cellpadding="0" border="0" style="${labelTableStyle}"><tbody><tr><td bgcolor="${escapeHtml(bgHex)}" style="background-color: ${bgHex}; font-weight: bold; font-size: 13px; color: #000000; border: 0;">[${escapeHtml(project.projectCode)}]${nameSection}</td></tr></tbody></table>`
        );
        parts.push(
          `&nbsp;<span style="font-size: 13px;">(진행상태: ${escapeHtml(statusText)}, 시작일자: ${escapeHtml(project.startDate)}, 누적시간: ${formatTimeHHMM(project.cumulativeSeconds)})</span><br>`
        );
        project.tasks.forEach((task) => {
          parts.push(
            `&nbsp;&nbsp;· ${escapeHtml(task.title)} (누적시간: ${formatTimeHHMM(task.cumulativeSeconds)})<br>`
          );
        });
        parts.push('<br>');
      });
    });
    return parts.join('');
  };

  // 클립보드 복사 (선택한 형식: 간단형 텍스트, 상세형/라벨형 HTML+평문)
  const handleCopy = async () => {
    try {
      if (copyFormat === '1') {
        await navigator.clipboard.writeText(generateFormat1());
      } else {
        const html = copyFormat === '3' ? generateFormatHtmlTable() : generateFormatHtml();
        const plain = generateFormat2();
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobPlain = new Blob([plain], { type: 'text/plain' });
        const item = new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain });
        await navigator.clipboard.write([item]);
      }
      setSnackbarMessage('클립보드에 복사되었습니다.');
      setSnackbarOpen(true);
    } catch {
      setSnackbarMessage('복사에 실패했습니다.');
      setSnackbarOpen(true);
    }
  };

  // 필터 변경 핸들러
  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    if (value === 'all') {
      setFilterMode('all');
      setExcludedProject('');
      localStorage.setItem('weeklyScheduleFilterMode', 'all');
      localStorage.setItem('weeklyScheduleExcludedProject', '');
    } else {
      setFilterMode('exclude');
      setExcludedProject(value);
      localStorage.setItem('weeklyScheduleFilterMode', 'exclude');
      localStorage.setItem('weeklyScheduleExcludedProject', value);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 4 }}>
      {/* 헤더 */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          bgcolor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          {/* 주간 일정 타이틀 + 주차 선택 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CalendarMonthIcon sx={{ color: 'var(--text-secondary)' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              주간 일정
            </Typography>

            {/* 주 선택 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
              <Tooltip title="이전 주">
                <IconButton size="small" onClick={handlePrevWeek}>
                  <ChevronLeftIcon />
                </IconButton>
              </Tooltip>

              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  minWidth: 150,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatWeekLabel()}
                </Typography>
              </Box>

              <Tooltip title="다음 주">
                <IconButton size="small" onClick={handleNextWeek}>
                  <ChevronRightIcon />
                </IconButton>
              </Tooltip>

              {!isCurrentWeek && (
                <Tooltip title="이번 주">
                  <Button size="small" onClick={handleThisWeek} sx={{ ml: 1 }}>
                    이번 주
                  </Button>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* 필터 + 복사 버튼 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              value={filterMode === 'all' ? 'all' : 'exclude'}
              exclusive
              size="small"
            >
              <ToggleButton 
                value="all" 
                onClick={() => { 
                  setFilterMode('all'); 
                  setExcludedProject('');
                  localStorage.setItem('weeklyScheduleFilterMode', 'all');
                  localStorage.setItem('weeklyScheduleExcludedProject', '');
                }}
                sx={{ px: 2 }}
              >
                전체 보기
              </ToggleButton>
            </ToggleButtonGroup>

            {availableProjects.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={filterMode === 'exclude' ? excludedProject : 'all'}
                  onChange={handleFilterChange}
                  displayEmpty
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="all">전체 보기</MenuItem>
                  <Divider />
                  {availableProjects.map(p => (
                    <MenuItem key={p.code} value={p.code}>
                      [{p.code}] {p.name} 제외
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopy}
              disabled={weeklyData.allLogs.length === 0}
              data-testid="copy-header"
            >
              복사
            </Button>
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {formatWeekRange()}
        </Typography>
      </Paper>

      {/* 날짜별 업무 목록 */}
      {weeklyData.days.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 6, textAlign: 'center', bgcolor: 'var(--bg-secondary)' }}
        >
          <Typography color="text.secondary">
            이 주에 기록된 업무가 없습니다.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {weeklyData.days.map(day => (
            <Box key={day.dateKey}>
              {/* 날짜 헤더 */}
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  mb: 1.5,
                  color: 'var(--text-primary)',
                  borderBottom: '2px solid var(--border-color)',
                  pb: 0.5
                }}
              >
                {day.dayLabel}
              </Typography>

              {/* 프로젝트별 목록 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {day.projects.map((project, idx) => {
                  const projectKey = `${day.dateKey}-${project.projectCode}`;
                  const isExpanded = expandedProjects.has(projectKey);

                  return (
                    <Paper
                      key={projectKey}
                      variant="outlined"
                      sx={{
                        overflow: 'hidden',
                        bgcolor: 'var(--card-bg)',
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      {/* 프로젝트 헤더 */}
                      <Box
                        onClick={() => toggleProject(projectKey)}
                        sx={{
                          p: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'var(--bg-hover)',
                          }
                        }}
                      >
                        <IconButton size="small" sx={{ p: 0.25 }}>
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>

                        {/* 프로젝트 코드 + 이름 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: 'var(--primary-color)' }}
                          >
                            [{project.projectCode}]
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {project.projectName !== project.projectCode ? project.projectName : ''}
                          </Typography>
                        </Box>

                        {/* 진행상태 */}
                        <Box 
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Typography variant="caption" color="text.secondary">
                            진행상태:
                          </Typography>
                          <StatusSelect
                            value={statusOverrides[projectKey] || project.status}
                            onChange={(newValue) => {
                              setStatusOverrides(prev => ({
                                ...prev,
                                [projectKey]: newValue
                              }));
                            }}
                            size="small"
                            sx={{ 
                              height: 22, 
                              fontSize: '0.7rem',
                              minWidth: 120,
                            }}
                          />
                        </Box>

                        {/* 시작일자 */}
                        <Typography variant="caption" color="text.secondary">
                          시작일자: {project.startDate}
                        </Typography>

                        {/* 누적시간 */}
                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100, textAlign: 'right' }}>
                          누적시간: {formatTimeHHMM(project.cumulativeSeconds)}
                        </Typography>
                      </Box>

                      {/* 하위 업무 목록 */}
                      <Collapse in={isExpanded}>
                        <Box sx={{ px: 2, pb: 1.5, pl: 5 }}>
                          {project.tasks.map((task, taskIdx) => (
                            <Box
                              key={taskIdx}
                              sx={{
                                py: 0.75,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                borderTop: taskIdx === 0 ? '1px solid var(--border-color)' : 'none',
                                pt: taskIdx === 0 ? 1.5 : 0.75,
                              }}
                            >
                              <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                                &gt;
                              </Typography>
                              <Typography variant="body2" sx={{ flex: 1 }}>
                                {task.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                (누적시간: {formatTimeHHMM(task.cumulativeSeconds)})
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* 복사 미리보기 */}
      {weeklyData.allLogs.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            mt: 4,
            p: 2,
            bgcolor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              복사 미리보기
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ToggleButtonGroup
                value={copyFormat}
                exclusive
                onChange={(_, value: '1' | '2' | '3' | null) => {
                  if (value) {
                    setCopyFormat(value);
                    localStorage.setItem('weeklyScheduleCopyFormat', value);
                  }
                }}
                size="small"
              >
                <ToggleButton value="1" sx={{ px: 2 }}>
                  간단형
                </ToggleButton>
                <ToggleButton value="2" sx={{ px: 2 }}>
                  상세형
                </ToggleButton>
                <ToggleButton value="3" sx={{ px: 2 }}>
                  라벨형
                </ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCopy}
                disabled={weeklyData.allLogs.length === 0}
                sx={{ ml: 1 }}
                data-testid="copy-preview"
              >
                복사
              </Button>
            </Box>
          </Box>

          <Paper
            variant="outlined"
            data-testid="copy-preview-content"
            sx={{
              p: 2,
              bgcolor: 'var(--bg-primary)',
              maxHeight: 300,
              overflow: 'auto',
              fontFamily: copyFormat === '1' ? 'monospace' : 'inherit',
              fontSize: '0.8rem',
              whiteSpace: copyFormat === '1' ? 'pre-wrap' : 'normal',
              lineHeight: 1.6,
            }}
          >
            {copyFormat === '1' ? (
              generateFormat1()
            ) : copyFormat === '3' ? (
              <div dangerouslySetInnerHTML={{ __html: generateFormatHtmlTable() }} />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: generateFormatHtml() }} />
            )}
          </Paper>

          {copyFormat === '3' && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PaletteIcon />}
                onClick={() => setColorManagerOpen(true)}
              >
                잡 색상 설정
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* 잡 색상 설정 모달 (배포 캘린더와 동일 스토어로 동기화, localStorage+주간 잡 포함) */}
      <JobColorManager
        open={colorManagerOpen}
        onClose={() => setColorManagerOpen(false)}
        jobCodesOverride={job_codes_for_color_manager}
      />

      {/* 스낵바 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WeeklySchedule;

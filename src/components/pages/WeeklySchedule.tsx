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
import { useTimerStore, TimerLog } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useStatusStore } from '../../store/useStatusStore';
import StatusSelect from '../common/StatusSelect';
import { formatDuration } from '../../utils/timeUtils';

// 요일 한글 표시
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 프로젝트별 그룹 타입
interface ProjectGroup {
  projectCode: string;
  projectName: string;
  status: 'completed' | 'in_progress';
  startDate: string;
  totalSeconds: number;
  tasks: {
    title: string;
    seconds: number;
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
  const [filterMode, setFilterMode] = useState<'all' | 'exclude'>('all');
  const [excludedProject, setExcludedProject] = useState<string>('');

  // 복사 미리보기 탭
  const [copyFormat, setCopyFormat] = useState<'1' | '2'>('1');

  // 확장된 프로젝트 상태
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // 프로젝트별 진행상태 오버라이드 (key: dateKey-projectCode, value: status)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, 'completed' | 'in_progress'>>({});

  // 스낵바 상태
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

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
            startDate: new Date(log.startTime).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' }),
            totalSeconds: 0,
            tasks: []
          });
        }

        const group = projectMap.get(projectCode)!;

        // 진행 상태 업데이트
        if (log.status !== 'COMPLETED') {
          group.status = 'in_progress';
        }

        // 소요 시간 계산
        const duration = log.endTime 
          ? (log.endTime - log.startTime) / 1000 - log.pausedDuration
          : (Date.now() - log.startTime) / 1000 - log.pausedDuration;

        group.totalSeconds += Math.max(0, duration);

        // 업무별 그룹화
        const existingTask = group.tasks.find(t => t.title === log.title);
        if (existingTask) {
          existingTask.seconds += Math.max(0, duration);
          existingTask.logs.push(log);
        } else {
          group.tasks.push({
            title: log.title,
            seconds: Math.max(0, duration),
            logs: [log]
          });
        }
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
  }, [logs, selectedWeekStart, weekDates, filterMode, excludedProject, getProjectName]);

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

  // 프로젝트 표시명 생성 (코드와 이름이 같으면 미등록 표시)
  const getDisplayProjectName = (project: ProjectGroup) => {
    return project.projectName !== project.projectCode ? project.projectName : '(미등록)';
  };

  // 복사 템플릿 생성 (형식 1: 간단형 - 구분선 없음)
  const generateFormat1 = () => {
    let text = '';

    weeklyData.days.forEach(day => {
      text += `${day.dayLabel}\n`;

      day.projects.forEach(project => {
        const projectKey = `${day.dateKey}-${project.projectCode}`;
        const status = statusOverrides[projectKey] || project.status;
        const statusText = getStatusLabel(status);
        const displayName = getDisplayProjectName(project);
        text += `[${project.projectCode}] ${displayName} (진행상태: ${statusText}, 시작일자: ${project.startDate}, 누적시간: ${formatTimeHHMM(project.totalSeconds)})\n`;

        project.tasks.forEach(task => {
          text += `> ${task.title} (누적시간: ${formatTimeHHMM(task.seconds)})\n`;
        });
      });
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
        text += `[${project.projectCode}] ${displayName} (진행상태: ${statusText}, 시작일자: ${project.startDate}, 누적시간: ${formatTimeHHMM(project.totalSeconds)})\n`;

        project.tasks.forEach(task => {
          text += `  · ${task.title} (누적시간: ${formatTimeHHMM(task.seconds)})\n`;
        });
        text += '\n';
      });
    });

    return text;
  };

  // 클립보드 복사
  const handleCopy = async () => {
    const text = copyFormat === '1' ? generateFormat1() : generateFormat2();
    try {
      await navigator.clipboard.writeText(text);
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
    } else {
      setFilterMode('exclude');
      setExcludedProject(value);
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
                onClick={() => { setFilterMode('all'); setExcludedProject(''); }}
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
                            {project.projectName !== project.projectCode ? project.projectName : '(미등록)'}
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
                            }}
                          />
                        </Box>

                        {/* 시작일자 */}
                        <Typography variant="caption" color="text.secondary">
                          시작일자: {project.startDate}
                        </Typography>

                        {/* 누적시간 */}
                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100, textAlign: 'right' }}>
                          누적시간: {formatTimeHHMM(project.totalSeconds)}
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
                                (누적시간: {formatTimeHHMM(task.seconds)})
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

            <ToggleButtonGroup
              value={copyFormat}
              exclusive
              onChange={(_, value) => value && setCopyFormat(value)}
              size="small"
            >
              <ToggleButton value="1" sx={{ px: 2 }}>
                간단형
              </ToggleButton>
              <ToggleButton value="2" sx={{ px: 2 }}>
                상세형
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: 'var(--bg-primary)',
              maxHeight: 300,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}
          >
            {copyFormat === '1' ? generateFormat1() : generateFormat2()}
          </Paper>
        </Paper>
      )}

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

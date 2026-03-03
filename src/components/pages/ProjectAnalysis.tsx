import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Autocomplete,
  Collapse,
  Snackbar,
  Alert,
  Button,
  ClickAwayListener,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useTimerStore, TimerLog } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { getDurationSecondsExcludingLunch, formatTimeDisplay } from '../../utils/timeUtils';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type PeriodType = 'month' | 'quarter' | 'custom';

interface TaskDetail {
  title: string;
  total_seconds: number;
  percentage: number;
  session_count: number;
  logs: TimerLog[];
}

interface CategoryGroup {
  category: string;
  total_seconds: number;
  percentage: number;
  session_count: number;
  tasks: TaskDetail[];
}

interface ProjectSummary {
  project_code: string;
  project_name: string;
  total_seconds: number;
  category_groups: CategoryGroup[];
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const getMonthRange = (year: number, month: number) => {
  const start = new Date(year, month, 1, 6, 0, 0, 0);
  const end = new Date(year, month + 1, 1, 6, 0, 0, 0);
  return { start, end };
};

const getQuarterRange = (year: number, quarter: number) => {
  const start_month = (quarter - 1) * 3;
  const start = new Date(year, start_month, 1, 6, 0, 0, 0);
  const end = new Date(year, start_month + 3, 1, 6, 0, 0, 0);
  return { start, end };
};

const getQuarterFromMonth = (month: number) => Math.floor(month / 3) + 1;

const formatSeconds = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${mins}분`;
  return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
};

const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
};

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

const ProjectAnalysis: React.FC = () => {
  const { logs, updateLog } = useTimerStore();
  const { projects, getProjectName } = useProjectStore();

  // Period state
  const [period_type, setPeriodType] = useState<PeriodType>('month');
  const now = new Date();
  const [selected_year, setSelectedYear] = useState(now.getFullYear());
  const [selected_month, setSelectedMonth] = useState(now.getMonth());
  const [selected_quarter, setSelectedQuarter] = useState(getQuarterFromMonth(now.getMonth()));
  const [custom_start, setCustomStart] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [custom_end, setCustomEnd] = useState(now.toISOString().split('T')[0]);

  // Project filter
  const [selected_project, setSelectedProject] = useState<string | null>(null);

  // Drilldown state (2단계: 카테고리 펼침 → 작업 세션 펼침)
  const [expanded_category, setExpandedCategory] = useState<string | null>(null);
  const [expanded_task, setExpandedTask] = useState<string | null>(null);

  // Interrupt analysis
  const { categories } = useCategoryStore();
  const [interrupt_keywords, setInterruptKeywords] = useState<string[]>([]);
  const [interrupt_input, setInterruptInput] = useState('');

  // Note inline edit
  const [editing_note_id, setEditingNoteId] = useState<string | null>(null);
  const [editing_note_value, setEditingNoteValue] = useState('');

  // Snackbar
  const [snackbar_open, setSnackbarOpen] = useState(false);
  const [snackbar_message, setSnackbarMessage] = useState('');

  // ── Period calculation ──
  const date_range = useMemo(() => {
    if (period_type === 'month') {
      return getMonthRange(selected_year, selected_month);
    } else if (period_type === 'quarter') {
      return getQuarterRange(selected_year, selected_quarter);
    } else {
      const start = new Date(custom_start);
      start.setHours(6, 0, 0, 0);
      const end = new Date(custom_end);
      end.setDate(end.getDate() + 1);
      end.setHours(6, 0, 0, 0);
      return { start, end };
    }
  }, [period_type, selected_year, selected_month, selected_quarter, custom_start, custom_end]);

  // ── Period label ──
  const period_label = useMemo(() => {
    if (period_type === 'month') {
      return `${selected_year}년 ${selected_month + 1}월`;
    } else if (period_type === 'quarter') {
      return `${selected_year}년 ${selected_quarter}분기`;
    }
    return `${custom_start} ~ ${custom_end}`;
  }, [period_type, selected_year, selected_month, selected_quarter, custom_start, custom_end]);

  const is_current_period = useMemo(() => {
    if (period_type === 'month') {
      return selected_year === now.getFullYear() && selected_month === now.getMonth();
    } else if (period_type === 'quarter') {
      return selected_year === now.getFullYear() && selected_quarter === getQuarterFromMonth(now.getMonth());
    }
    return false;
  }, [period_type, selected_year, selected_month, selected_quarter, now]);

  // ── Navigation ──
  const handlePrev = useCallback(() => {
    if (period_type === 'month') {
      if (selected_month === 0) {
        setSelectedYear(y => y - 1);
        setSelectedMonth(11);
      } else {
        setSelectedMonth(m => m - 1);
      }
    } else if (period_type === 'quarter') {
      if (selected_quarter === 1) {
        setSelectedYear(y => y - 1);
        setSelectedQuarter(4);
      } else {
        setSelectedQuarter(q => q - 1);
      }
    }
  }, [period_type, selected_month, selected_quarter]);

  const handleNext = useCallback(() => {
    if (period_type === 'month') {
      if (selected_month === 11) {
        setSelectedYear(y => y + 1);
        setSelectedMonth(0);
      } else {
        setSelectedMonth(m => m + 1);
      }
    } else if (period_type === 'quarter') {
      if (selected_quarter === 4) {
        setSelectedYear(y => y + 1);
        setSelectedQuarter(1);
      } else {
        setSelectedQuarter(q => q + 1);
      }
    }
  }, [period_type, selected_month, selected_quarter]);

  const handleCurrent = useCallback(() => {
    const n = new Date();
    setSelectedYear(n.getFullYear());
    if (period_type === 'month') {
      setSelectedMonth(n.getMonth());
    } else if (period_type === 'quarter') {
      setSelectedQuarter(getQuarterFromMonth(n.getMonth()));
    }
  }, [period_type]);

  // ── Data aggregation ──
  const { project_summaries, all_projects_in_range } = useMemo(() => {
    const start_ts = date_range.start.getTime();
    const end_ts = date_range.end.getTime();

    const filtered = logs.filter(
      (log) => log.startTime >= start_ts && log.startTime < end_ts && !log.deletedAt
    );

    const project_map = new Map<string, TimerLog[]>();
    const all_codes = new Set<string>();

    for (const log of filtered) {
      const code = log.projectCode || '미지정';
      all_codes.add(code);
      if (!project_map.has(code)) project_map.set(code, []);
      project_map.get(code)!.push(log);
    }

    const summaries: ProjectSummary[] = [];

    for (const [code, project_logs] of project_map) {
      // 카테고리 > 작업명 2단계 그룹화
      const cat_map = new Map<string, Map<string, TimerLog[]>>();

      for (const log of project_logs) {
        const cat = log.category || '미지정';
        if (!cat_map.has(cat)) cat_map.set(cat, new Map());
        const title_map = cat_map.get(cat)!;
        if (!title_map.has(log.title)) title_map.set(log.title, []);
        title_map.get(log.title)!.push(log);
      }

      let project_total = 0;
      const raw_cat_groups: { category: string; total_seconds: number; session_count: number; tasks: { title: string; total_seconds: number; session_count: number; logs: TimerLog[] }[] }[] = [];

      for (const [cat, title_map] of cat_map) {
        let cat_total = 0;
        let cat_sessions = 0;
        const raw_tasks: { title: string; total_seconds: number; session_count: number; logs: TimerLog[] }[] = [];

        for (const [title, task_logs] of title_map) {
          let task_total = 0;
          for (const log of task_logs) {
            task_total += getDurationSecondsExcludingLunch(log.startTime, log.endTime, log.pausedDuration);
          }
          cat_total += task_total;
          cat_sessions += task_logs.length;
          raw_tasks.push({
            title,
            total_seconds: task_total,
            session_count: task_logs.length,
            logs: task_logs.sort((a, b) => a.startTime - b.startTime),
          });
        }

        project_total += cat_total;
        raw_cat_groups.push({
          category: cat,
          total_seconds: cat_total,
          session_count: cat_sessions,
          tasks: raw_tasks.sort((a, b) => b.total_seconds - a.total_seconds),
        });
      }

      const category_groups: CategoryGroup[] = raw_cat_groups
        .sort((a, b) => b.total_seconds - a.total_seconds)
        .map((cg) => ({
          ...cg,
          percentage: project_total > 0 ? (cg.total_seconds / project_total) * 100 : 0,
          tasks: cg.tasks.map((t) => ({
            ...t,
            percentage: cg.total_seconds > 0 ? (t.total_seconds / cg.total_seconds) * 100 : 0,
          })),
        }));

      summaries.push({
        project_code: code,
        project_name: code === '미지정' ? '미지정' : getProjectName(code),
        total_seconds: project_total,
        category_groups,
      });
    }

    summaries.sort((a, b) => b.total_seconds - a.total_seconds);

    return {
      project_summaries: summaries,
      all_projects_in_range: Array.from(all_codes).filter(c => c !== '미지정'),
    };
  }, [logs, date_range, getProjectName]);

  // ── Filtered view ──
  const display_data = useMemo(() => {
    if (!selected_project) return project_summaries;
    return project_summaries.filter((s) => s.project_code === selected_project);
  }, [project_summaries, selected_project]);

  const total_seconds = useMemo(
    () => display_data.reduce((sum, s) => sum + s.total_seconds, 0),
    [display_data]
  );

  // ── Project breakdown (전체 모드에서만 의미) ──
  const project_breakdown = useMemo(() => {
    if (selected_project) return [];
    return display_data
      .map((s) => ({
        name: s.project_name,
        code: s.project_code,
        seconds: s.total_seconds,
        percentage: total_seconds > 0 ? (s.total_seconds / total_seconds) * 100 : 0,
      }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [display_data, total_seconds, selected_project]);

  // ── Category breakdown across selected scope ──
  const category_breakdown = useMemo(() => {
    const cat_map = new Map<string, number>();
    for (const summary of display_data) {
      for (const cg of summary.category_groups) {
        cat_map.set(cg.category, (cat_map.get(cg.category) || 0) + cg.total_seconds);
      }
    }
    return Array.from(cat_map.entries())
      .map(([name, seconds]) => ({ name, seconds, percentage: total_seconds > 0 ? (seconds / total_seconds) * 100 : 0 }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [display_data, total_seconds]);

  // ── Interrupt analysis ──
  const interrupt_data = useMemo(() => {
    if (interrupt_keywords.length === 0) return null;

    const start_ts = date_range.start.getTime();
    const end_ts = date_range.end.getTime();

    const all_filtered = logs.filter(
      (log) => log.startTime >= start_ts && log.startTime < end_ts && !log.deletedAt
    );

    const matched = all_filtered.filter((log) =>
      interrupt_keywords.some(
        (kw) =>
          log.title.toLowerCase().includes(kw.toLowerCase()) ||
          (log.category || '').toLowerCase().includes(kw.toLowerCase()) ||
          (log.projectCode || '').toLowerCase().includes(kw.toLowerCase())
      )
    );

    const day_names = ['월', '화', '수', '목', '금'];

    if (matched.length === 0) return { matched, total_seconds: 0, weekly_heatmap: [], hourly_dist: [], peak_week: '', peak_hour_range: '', heatmap_max: 0, day_names, total_sessions: 0 };

    let total_interrupt_seconds = 0;
    for (const log of matched) {
      total_interrupt_seconds += getDurationSecondsExcludingLunch(log.startTime, log.endTime, log.pausedDuration);
    }

    // Weekly heatmap: 주차 × 요일 (월~금)
    const week_map = new Map<string, { week_label: string; days: number[]; total: number }>();

    for (const log of matched) {
      const d = new Date(log.startTime);
      const day_of_week = d.getDay();
      const col = day_of_week === 0 ? 6 : day_of_week - 1; // 0=월 ~ 6=일
      if (col > 4) continue; // 토/일 제외

      const week_start = new Date(d);
      week_start.setDate(d.getDate() - col);
      const week_key = `${week_start.getFullYear()}-${String(week_start.getMonth() + 1).padStart(2, '0')}-${String(week_start.getDate()).padStart(2, '0')}`;
      const week_label = `${week_start.getMonth() + 1}/${week_start.getDate()}주`;

      if (!week_map.has(week_key)) {
        week_map.set(week_key, { week_label, days: [0, 0, 0, 0, 0], total: 0 });
      }

      const dur = getDurationSecondsExcludingLunch(log.startTime, log.endTime, log.pausedDuration);
      const entry = week_map.get(week_key)!;
      entry.days[col] += dur;
      entry.total += dur;
    }

    const weekly_heatmap = Array.from(week_map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    // Peak week
    const peak_week_entry = weekly_heatmap.reduce((best, w) => (w.total > best.total ? w : best), { week_label: '-', total: 0, days: [] as number[] });

    // Hourly distribution (06~24시)
    const hourly_buckets = new Array(18).fill(0); // index 0 = 06시, index 17 = 23시
    for (const log of matched) {
      const start_hour = new Date(log.startTime).getHours();
      const end_hour = log.endTime ? new Date(log.endTime).getHours() : new Date().getHours();
      const dur = getDurationSecondsExcludingLunch(log.startTime, log.endTime, log.pausedDuration);

      const span = Math.max(1, end_hour - start_hour);
      const per_hour = dur / span;

      for (let h = start_hour; h < (log.endTime ? end_hour : end_hour + 1); h++) {
        const idx = h - 6;
        if (idx >= 0 && idx < 18) {
          hourly_buckets[idx] += per_hour;
        }
      }
    }

    const max_hourly = Math.max(...hourly_buckets);
    const hourly_dist = hourly_buckets.map((seconds, idx) => ({
      hour: idx + 6,
      label: `${String(idx + 6).padStart(2, '0')}:00`,
      seconds,
      percentage: max_hourly > 0 ? (seconds / max_hourly) * 100 : 0,
    }));

    // Peak hour range
    let peak_start_idx = 0;
    let peak_end_idx = 0;
    let best_window_sum = 0;
    for (let i = 0; i <= hourly_buckets.length - 2; i++) {
      const window_sum = hourly_buckets[i] + hourly_buckets[i + 1];
      if (window_sum > best_window_sum) {
        best_window_sum = window_sum;
        peak_start_idx = i;
        peak_end_idx = i + 2;
      }
    }
    const peak_hour_range = `${String(peak_start_idx + 6).padStart(2, '0')}:00~${String(peak_end_idx + 6).padStart(2, '0')}:00`;

    // Heatmap max for color intensity
    const all_day_values = weekly_heatmap.flatMap((w) => w.days);
    const heatmap_max = Math.max(...all_day_values, 1);

    return {
      matched,
      total_seconds: total_interrupt_seconds,
      weekly_heatmap,
      hourly_dist,
      peak_week: peak_week_entry.week_label,
      peak_hour_range,
      heatmap_max,
      day_names,
      total_sessions: matched.length,
    };
  }, [logs, date_range, interrupt_keywords]);

  // ── Interrupt keyword suggestions ──
  const interrupt_suggestions = useMemo(() => {
    const start_ts = date_range.start.getTime();
    const end_ts = date_range.end.getTime();
    const titles = new Set<string>();
    for (const log of logs) {
      if (log.startTime >= start_ts && log.startTime < end_ts && !log.deletedAt) {
        titles.add(log.title);
      }
    }
    const combined = [...categories, ...Array.from(titles)];
    return Array.from(new Set(combined));
  }, [logs, date_range, categories]);

  const handleAddInterruptKeyword = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setInterruptKeywords((prev) => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
    setInterruptInput('');
  };

  const handleRemoveInterruptKeyword = (keyword: string) => {
    setInterruptKeywords((prev) => prev.filter((k) => k !== keyword));
  };

  // ── Project options for autocomplete ──
  const project_options = useMemo(() => {
    const codes = new Set<string>([...all_projects_in_range]);
    for (const p of projects) codes.add(p.code);
    return Array.from(codes).map((code) => ({
      code,
      label: `${getProjectName(code)} (${code})`,
    }));
  }, [all_projects_in_range, projects, getProjectName]);

  // ── Note inline edit handlers ──
  const handleStartEditNote = (log_id: string, current_note: string) => {
    setEditingNoteId(log_id);
    setEditingNoteValue(current_note);
  };

  const handleSaveNote = () => {
    if (editing_note_id) {
      updateLog(editing_note_id, { note: editing_note_value.trim() || undefined });
      setEditingNoteId(null);
      setEditingNoteValue('');
    }
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteValue('');
  };

  // ── Toggle drilldown ──
  const handleToggleCategory = (project_code: string, category: string) => {
    const key = `${project_code}::${category}`;
    setExpandedCategory((prev) => {
      if (prev === key) return null;
      setExpandedTask(null);
      return key;
    });
  };

  const handleToggleTask = (project_code: string, category: string, title: string) => {
    const key = `${project_code}::${category}::${title}`;
    setExpandedTask((prev) => (prev === key ? null : key));
  };

  // ── Copy ──
  const handleCopy = useCallback(async () => {
    const lines: string[] = [`[${period_label}] 프로젝트 분석`, ''];

    for (const summary of display_data) {
      lines.push(`■ ${summary.project_name} — 총 ${formatSeconds(summary.total_seconds)}`);
      for (const cg of summary.category_groups) {
        const cat_pct = cg.percentage.toFixed(1);
        lines.push(`  ├ [${cg.category}] — ${formatSeconds(cg.total_seconds)} (${cat_pct}%)`);
        for (const task of cg.tasks) {
          lines.push(`  │   └ ${task.title} — ${formatSeconds(task.total_seconds)} (${task.session_count}건)`);
        }
      }
      lines.push('');
    }

    lines.push(`총 업무시간: ${formatSeconds(total_seconds)}`);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setSnackbarMessage('분석 결과가 클립보드에 복사되었습니다.');
      setSnackbarOpen(true);
    } catch {
      setSnackbarMessage('복사에 실패했습니다.');
      setSnackbarOpen(true);
    }
  }, [display_data, total_seconds, period_label]);

  // ── CSV download ──
  const handleDownloadCSV = useCallback(() => {
    const BOM = '\uFEFF';
    const headers = ['프로젝트코드', '프로젝트명', '카테고리', '작업명', '세션수', '소요시간(분)', '카테고리비율(%)', '작업비율(%)'];
    const rows: string[][] = [];

    for (const summary of display_data) {
      for (const cg of summary.category_groups) {
        for (const task of cg.tasks) {
          rows.push([
            summary.project_code,
            summary.project_name,
            cg.category,
            task.title,
            String(task.session_count),
            String(Math.floor(task.total_seconds / 60)),
            cg.percentage.toFixed(1),
            task.percentage.toFixed(1),
          ]);
        }
      }
    }

    const csv = BOM + [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project_analysis_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [display_data]);

  // ── Bar colors ──
  const bar_colors = [
    'var(--primary-color, #1976d2)',
    '#26a69a',
    '#ef5350',
    '#ab47bc',
    '#ff7043',
    '#66bb6a',
    '#42a5f5',
    '#ffa726',
    '#8d6e63',
    '#78909c',
  ];

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{ p: 2, mb: 3, bgcolor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            프로젝트 분석
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={handleCopy} disabled={display_data.length === 0}>
              복사
            </Button>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleDownloadCSV} disabled={display_data.length === 0}>
              CSV
            </Button>
          </Box>
        </Box>

        {/* Period selector */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { sm: 'center' } }}>
          <ToggleButtonGroup
            value={period_type}
            exclusive
            onChange={(_, val) => val && setPeriodType(val)}
            size="small"
          >
            <ToggleButton value="month">월간</ToggleButton>
            <ToggleButton value="quarter">분기</ToggleButton>
            <ToggleButton value="custom">직접 지정</ToggleButton>
          </ToggleButtonGroup>

          {/* Navigation (month/quarter) */}
          {period_type !== 'custom' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title={period_type === 'month' ? '이전 달' : '이전 분기'}>
                <IconButton size="small" onClick={handlePrev}>
                  <ChevronLeftIcon />
                </IconButton>
              </Tooltip>
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: is_current_period ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                  color: is_current_period ? 'var(--text-inverse)' : 'text.primary',
                  minWidth: 140,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'inherit' }}>{period_label}</Typography>
              </Box>
              <Tooltip title={period_type === 'month' ? '다음 달' : '다음 분기'}>
                <IconButton size="small" onClick={handleNext}>
                  <ChevronRightIcon />
                </IconButton>
              </Tooltip>
              {!is_current_period && (
                <Tooltip title="현재로 이동">
                  <IconButton size="small" onClick={handleCurrent}>
                    <TodayIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}

          {/* Custom date range */}
          {period_type === 'custom' && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField type="date" size="small" value={custom_start} onChange={(e) => setCustomStart(e.target.value)} sx={{ width: 160 }} />
              <Typography variant="body2">~</Typography>
              <TextField type="date" size="small" value={custom_end} onChange={(e) => setCustomEnd(e.target.value)} sx={{ width: 160 }} />
            </Box>
          )}

          {/* Project filter */}
          <Autocomplete
            size="small"
            options={project_options}
            getOptionLabel={(opt) => opt.label}
            value={project_options.find((o) => o.code === selected_project) || null}
            onChange={(_, val) => {
              setSelectedProject(val?.code || null);
              setExpandedCategory(null);
              setExpandedTask(null);
            }}
            renderInput={(params) => <TextField {...params} placeholder="프로젝트 선택 (전체)" />}
            sx={{ minWidth: 260 }}
            isOptionEqualToValue={(opt, val) => opt.code === val.code}
          />
        </Box>
      </Paper>

      {/* ── Summary card ── */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {selected_project ? getProjectName(selected_project) : '전체'} — 총 업무 시간
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          {formatTimeDisplay(total_seconds)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {formatSeconds(total_seconds)}
        </Typography>
      </Paper>

      {/* ── Project breakdown bar (전체 모드) ── */}
      {project_breakdown.length > 1 && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>프로젝트별 비율</Typography>
          <Box sx={{ display: 'flex', borderRadius: 1, overflow: 'hidden', height: 28 }}>
            {project_breakdown.map((proj, idx) => (
              <Tooltip key={proj.code} title={`${proj.name}: ${formatSeconds(proj.seconds)} (${proj.percentage.toFixed(1)}%)`}>
                <Box
                  sx={{
                    width: `${proj.percentage}%`,
                    bgcolor: bar_colors[idx % bar_colors.length],
                    minWidth: proj.percentage > 2 ? undefined : 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                    '&:hover': { opacity: 0.8 },
                  }}
                  onClick={() => { setSelectedProject(proj.code); setExpandedCategory(null); setExpandedTask(null); }}
                >
                  {proj.percentage > 8 && (
                    <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', px: 0.5 }}>
                      {proj.name}
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            ))}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
            {project_breakdown.map((proj, idx) => (
              <Box
                key={proj.code}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                onClick={() => { setSelectedProject(proj.code); setExpandedCategory(null); setExpandedTask(null); }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: bar_colors[idx % bar_colors.length] }} />
                <Typography variant="caption" color="text.secondary">
                  {proj.name} {formatSeconds(proj.seconds)} ({proj.percentage.toFixed(1)}%)
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* ── Category breakdown bar ── */}
      {category_breakdown.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>카테고리별 비율</Typography>
          <Box sx={{ display: 'flex', borderRadius: 1, overflow: 'hidden', height: 28 }}>
            {category_breakdown.map((cat, idx) => (
              <Tooltip key={cat.name} title={`${cat.name}: ${formatSeconds(cat.seconds)} (${cat.percentage.toFixed(1)}%)`}>
                <Box
                  sx={{
                    width: `${cat.percentage}%`,
                    bgcolor: bar_colors[idx % bar_colors.length],
                    minWidth: cat.percentage > 2 ? undefined : 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'opacity 0.2s',
                    '&:hover': { opacity: 0.8 },
                  }}
                >
                  {cat.percentage > 8 && (
                    <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {cat.name}
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            ))}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
            {category_breakdown.map((cat, idx) => (
              <Box key={cat.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: bar_colors[idx % bar_colors.length] }} />
                <Typography variant="caption" color="text.secondary">
                  {cat.name} {formatSeconds(cat.seconds)} ({cat.percentage.toFixed(1)}%)
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* ── Project breakdown tables ── */}
      {display_data.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <Typography color="text.secondary">해당 기간에 기록된 업무가 없습니다.</Typography>
        </Paper>
      ) : (
        display_data.map((summary) => {
          const total_cat_count = summary.category_groups.length;
          const total_task_count = summary.category_groups.reduce((s, cg) => s + cg.tasks.length, 0);

          return (
            <Paper
              key={summary.project_code}
              elevation={0}
              sx={{ mb: 3, bgcolor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', overflow: 'hidden' }}
            >
              {/* Project header */}
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip label={summary.project_name} size="small" variant="outlined" title={summary.project_code} />
                  <Typography variant="body2" color="text.secondary">
                    {total_cat_count}개 카테고리 · {total_task_count}개 작업
                  </Typography>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {formatSeconds(summary.total_seconds)}
                </Typography>
              </Box>

              {/* Level 1: Category breakdown */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 40 }} />
                      <TableCell sx={{ fontWeight: 600 }}>카테고리</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">세션</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 120 }} align="right">소요 시간</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '30%' }}>비율</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary.category_groups.map((cg, cat_idx) => {
                      const cat_key = `${summary.project_code}::${cg.category}`;
                      const is_cat_expanded = expanded_category === cat_key;

                      return (
                        <React.Fragment key={cg.category}>
                          {/* Category row */}
                          <TableRow
                            hover
                            sx={{ cursor: 'pointer', '& > td': { borderBottom: is_cat_expanded ? 'none' : undefined } }}
                            onClick={() => handleToggleCategory(summary.project_code, cg.category)}
                          >
                            <TableCell sx={{ pr: 0 }}>
                              {is_cat_expanded ? <ExpandLessIcon fontSize="small" color="action" /> : <ExpandMoreIcon fontSize="small" color="action" />}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip label={cg.category} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                                <Typography variant="caption" color="text.secondary">{cg.tasks.length}개 작업</Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" color="text.secondary">{cg.session_count}건</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatSeconds(cg.total_seconds)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ flex: 1, bgcolor: 'var(--bg-primary)', borderRadius: 0.5, height: 16, overflow: 'hidden' }}>
                                  <Box sx={{ width: `${cg.percentage}%`, height: '100%', bgcolor: bar_colors[cat_idx % bar_colors.length], borderRadius: 0.5, transition: 'width 0.3s ease' }} />
                                </Box>
                                <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'right', fontWeight: 500 }}>
                                  {cg.percentage.toFixed(1)}%
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>

                          {/* Level 2: Task list within category */}
                          <TableRow>
                            <TableCell colSpan={5} sx={{ p: 0, border: 'none' }}>
                              <Collapse in={is_cat_expanded} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 4, pr: 2, py: 1 }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 600, width: 32, fontSize: '0.7rem', py: 0.5 }} />
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', py: 0.5 }}>작업명</TableCell>
                                        <TableCell sx={{ fontWeight: 600, width: 60, fontSize: '0.7rem', py: 0.5 }} align="center">세션</TableCell>
                                        <TableCell sx={{ fontWeight: 600, width: 100, fontSize: '0.7rem', py: 0.5 }} align="right">소요 시간</TableCell>
                                        <TableCell sx={{ fontWeight: 600, width: '28%', fontSize: '0.7rem', py: 0.5 }}>카테고리 내 비율</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {cg.tasks.map((task) => {
                                        const task_key = `${summary.project_code}::${cg.category}::${task.title}`;
                                        const is_task_expanded = expanded_task === task_key;

                                        return (
                                          <React.Fragment key={task.title}>
                                            <TableRow
                                              hover
                                              sx={{ cursor: 'pointer', '& > td': { borderBottom: is_task_expanded ? 'none' : undefined } }}
                                              onClick={() => handleToggleTask(summary.project_code, cg.category, task.title)}
                                            >
                                              <TableCell sx={{ pr: 0, py: 0.5 }}>
                                                {is_task_expanded ? <ExpandLessIcon sx={{ fontSize: 16 }} color="action" /> : <ExpandMoreIcon sx={{ fontSize: 16 }} color="action" />}
                                              </TableCell>
                                              <TableCell sx={{ py: 0.5 }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{task.title}</Typography>
                                              </TableCell>
                                              <TableCell align="center" sx={{ py: 0.5 }}>
                                                <Typography variant="caption" color="text.secondary">{task.session_count}건</Typography>
                                              </TableCell>
                                              <TableCell align="right" sx={{ py: 0.5 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>{formatSeconds(task.total_seconds)}</Typography>
                                              </TableCell>
                                              <TableCell sx={{ py: 0.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                  <Box sx={{ flex: 1, bgcolor: 'var(--bg-primary)', borderRadius: 0.5, height: 12, overflow: 'hidden' }}>
                                                    <Box sx={{ width: `${task.percentage}%`, height: '100%', bgcolor: bar_colors[cat_idx % bar_colors.length], opacity: 0.6, borderRadius: 0.5, transition: 'width 0.3s ease' }} />
                                                  </Box>
                                                  <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'right', fontSize: '0.65rem' }}>
                                                    {task.percentage.toFixed(1)}%
                                                  </Typography>
                                                </Box>
                                              </TableCell>
                                            </TableRow>

                                            {/* Level 3: Session detail */}
                                            <TableRow>
                                              <TableCell colSpan={5} sx={{ p: 0, border: 'none' }}>
                                                <Collapse in={is_task_expanded} timeout="auto" unmountOnExit>
                                                  <Box sx={{ pl: 4, pr: 1, py: 1, bgcolor: 'var(--bg-primary)', borderRadius: 1, mx: 1, mb: 1 }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', fontSize: '0.65rem' }}>
                                                      세션 상세 ({task.session_count}건)
                                                    </Typography>
                                                    <Table size="small">
                                                      <TableHead>
                                                        <TableRow>
                                                          <TableCell sx={{ fontSize: '0.65rem', fontWeight: 600, py: 0.25 }}>날짜</TableCell>
                                                          <TableCell sx={{ fontSize: '0.65rem', fontWeight: 600, py: 0.25 }}>시간</TableCell>
                                                          <TableCell sx={{ fontSize: '0.65rem', fontWeight: 600, py: 0.25 }} align="right">소요</TableCell>
                                                          <TableCell sx={{ fontSize: '0.65rem', fontWeight: 600, py: 0.25 }}>비고</TableCell>
                                                        </TableRow>
                                                      </TableHead>
                                                      <TableBody>
                                                        {task.logs.map((log) => {
                                                          const dur = getDurationSecondsExcludingLunch(log.startTime, log.endTime, log.pausedDuration);
                                                          return (
                                                            <TableRow key={log.id}>
                                                              <TableCell sx={{ fontSize: '0.7rem', py: 0.25 }}>{formatDate(log.startTime)}</TableCell>
                                                              <TableCell sx={{ fontSize: '0.7rem', py: 0.25 }}>
                                                                {formatTime(log.startTime)} ~ {log.endTime ? formatTime(log.endTime) : '진행중'}
                                                              </TableCell>
                                                              <TableCell sx={{ fontSize: '0.7rem', py: 0.25, fontWeight: 500 }} align="right">
                                                                {formatSeconds(dur)}
                                                              </TableCell>
                                                              <TableCell sx={{ py: 0.25, minWidth: 160 }}>
                                                                {editing_note_id === log.id ? (
                                                                  <ClickAwayListener onClickAway={handleSaveNote}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                      <TextField
                                                                        size="small"
                                                                        value={editing_note_value}
                                                                        onChange={(e) => setEditingNoteValue(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                          if (e.key === 'Enter') handleSaveNote();
                                                                          if (e.key === 'Escape') handleCancelEditNote();
                                                                        }}
                                                                        autoFocus
                                                                        fullWidth
                                                                        placeholder="메모 입력..."
                                                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.7rem', py: 0.25 } }}
                                                                      />
                                                                      <IconButton size="small" onClick={handleSaveNote} sx={{ p: 0.25 }}>
                                                                        <CheckIcon sx={{ fontSize: 14 }} color="success" />
                                                                      </IconButton>
                                                                      <IconButton size="small" onClick={handleCancelEditNote} sx={{ p: 0.25 }}>
                                                                        <CloseIcon sx={{ fontSize: 14 }} color="error" />
                                                                      </IconButton>
                                                                    </Box>
                                                                  </ClickAwayListener>
                                                                ) : (
                                                                  <Box
                                                                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', '&:hover .edit-icon': { opacity: 1 } }}
                                                                    onClick={(e) => { e.stopPropagation(); handleStartEditNote(log.id, log.note || ''); }}
                                                                  >
                                                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: log.note ? 'text.primary' : 'text.disabled', fontStyle: log.note ? 'normal' : 'italic' }}>
                                                                      {log.note || '메모 추가...'}
                                                                    </Typography>
                                                                    <EditNoteIcon className="edit-icon" sx={{ fontSize: 12, opacity: 0, transition: 'opacity 0.2s', color: 'text.secondary' }} />
                                                                  </Box>
                                                                )}
                                                              </TableCell>
                                                            </TableRow>
                                                          );
                                                        })}
                                                      </TableBody>
                                                    </Table>
                                                  </Box>
                                                </Collapse>
                                              </TableCell>
                                            </TableRow>
                                          </React.Fragment>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          );
        })
      )}

      {/* ── Interrupt Analysis Section ── */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, mt: 4, bgcolor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>인터럽트 분석</Typography>
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'var(--bg-primary)', borderRadius: 1, border: '1px solid var(--border-color)' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.7 }}>
            계획에 없던 돌발 작업(TP 대응, 긴급 요청 등)이 <b>언제, 얼마나 자주, 얼마나 오래</b> 발생했는지 파악합니다.
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.8 }}>
            <b>사용 방법</b> — 아래 입력란에 추적할 키워드를 입력하세요. 작업명·카테고리·프로젝트 코드 중 키워드가 포함된 모든 세션이 필터링됩니다.
            <br />
            <b>분석 결과</b> — 총 발생 건수·소요시간, 주차별 히트맵(어느 주에 집중되었는가), 시간대 분포(몇 시에 자주 발생하는가), 개별 이력을 제공합니다.
          </Typography>
        </Box>

        {/* Keyword input */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Autocomplete
            size="small"
            freeSolo
            options={interrupt_suggestions.filter((s) => !interrupt_keywords.includes(s))}
            filterOptions={(options, params) => {
              const input_val = params.inputValue.toLowerCase();
              return options.filter((opt) => opt.toLowerCase().includes(input_val));
            }}
            inputValue={interrupt_input}
            onInputChange={(_, val) => setInterruptInput(val)}
            onChange={(_, val) => { if (val) handleAddInterruptKeyword(typeof val === 'string' ? val : val); }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="키워드 입력 (예: TP 대응)"
              />
            )}
            sx={{ minWidth: 260, flex: 1 }}
          />
          {interrupt_keywords.map((kw) => (
            <Chip key={kw} label={kw} onDelete={() => handleRemoveInterruptKeyword(kw)} size="small" color="warning" variant="outlined" />
          ))}
        </Box>

        {/* Results */}
        {interrupt_data && interrupt_keywords.length > 0 && (
          <>
            {interrupt_data.matched.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                해당 키워드와 일치하는 작업이 없습니다.
              </Typography>
            ) : (
              <>
                {/* Summary stats */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  {[
                    { label: '총 인터럽트', value: `${interrupt_data.total_sessions}건` },
                    { label: '총 소요시간', value: formatSeconds(interrupt_data.total_seconds) },
                    { label: '최다 발생 주', value: interrupt_data.peak_week },
                    { label: '피크 시간대', value: interrupt_data.peak_hour_range },
                  ].map((stat) => (
                    <Paper key={stat.label} variant="outlined" sx={{ px: 2, py: 1.5, flex: '1 1 140px', textAlign: 'center', bgcolor: 'var(--bg-primary)' }}>
                      <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{stat.value}</Typography>
                    </Paper>
                  ))}
                </Box>

                {/* Weekly heatmap */}
                {interrupt_data.weekly_heatmap.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>주차별 히트맵 (월~금)</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      색이 진할수록 해당 요일에 인터럽트 소요시간이 많았음을 의미합니다.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {/* Header */}
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Box sx={{ width: 70 }} />
                        {interrupt_data.day_names.map((d) => (
                          <Box key={d} sx={{ width: 48, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{d}</Typography>
                          </Box>
                        ))}
                        <Box sx={{ flex: 1, ml: 1, textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>합계</Typography>
                        </Box>
                      </Box>
                      {/* Rows */}
                      {interrupt_data.weekly_heatmap.map((week, wi) => (
                        <Box key={wi} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ width: 70, textAlign: 'right', pr: 1, fontWeight: 500 }}>
                            {week.week_label}
                          </Typography>
                          {week.days.map((val, di) => {
                            const intensity = interrupt_data.heatmap_max! > 0 ? val / interrupt_data.heatmap_max! : 0;
                            return (
                              <Tooltip key={di} title={val > 0 ? `${interrupt_data.day_names[di]}: ${formatSeconds(val)}` : ''}>
                                <Box
                                  sx={{
                                    width: 48,
                                    height: 32,
                                    borderRadius: 0.5,
                                    bgcolor: val > 0
                                      ? `rgba(239, 83, 80, ${0.15 + intensity * 0.75})`
                                      : 'var(--bg-primary)',
                                    border: '1px solid',
                                    borderColor: val > 0 ? `rgba(239, 83, 80, ${0.3 + intensity * 0.5})` : 'var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  {val > 0 && (
                                    <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, color: intensity > 0.5 ? '#fff' : 'text.primary' }}>
                                      {Math.round(val / 60)}m
                                    </Typography>
                                  )}
                                </Box>
                              </Tooltip>
                            );
                          })}
                          <Typography variant="caption" sx={{ flex: 1, ml: 1, textAlign: 'right', fontWeight: 500 }}>
                            {formatSeconds(week.total)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Hourly distribution bar chart */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>시간대별 분포 (06~24시)</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    하루 중 인터럽트가 집중되는 시간대를 보여줍니다. 막대가 높을수록 해당 시간에 많은 시간이 소요되었습니다.
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 100 }}>
                    {interrupt_data.hourly_dist.map((h) => (
                      <Tooltip key={h.hour} title={`${h.label}: ${formatSeconds(h.seconds)}`}>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                          <Box
                            sx={{
                              width: '100%',
                              height: `${Math.max(h.percentage, h.seconds > 0 ? 4 : 0)}%`,
                              bgcolor: h.percentage > 70 ? 'error.main' : h.percentage > 40 ? 'warning.main' : 'var(--primary-color)',
                              borderRadius: '2px 2px 0 0',
                              transition: 'height 0.3s',
                              minHeight: h.seconds > 0 ? 3 : 0,
                            }}
                          />
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', gap: '2px' }}>
                    {interrupt_data.hourly_dist.map((h) => (
                      <Box key={h.hour} sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>
                          {h.hour % 2 === 0 ? h.hour : ''}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Interrupt session list */}
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>발생 이력 ({interrupt_data.total_sessions}건)</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, py: 0.5 }}>날짜</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, py: 0.5 }}>시간</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, py: 0.5 }}>작업명</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, py: 0.5 }}>카테고리</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, py: 0.5 }} align="right">소요</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, py: 0.5 }}>비고</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {interrupt_data.matched
                        .sort((a, b) => a.startTime - b.startTime)
                        .map((log) => {
                          const dur = getDurationSecondsExcludingLunch(log.startTime, log.endTime, log.pausedDuration);
                          return (
                            <TableRow key={log.id}>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{formatDate(log.startTime)}</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>
                                {formatTime(log.startTime)} ~ {log.endTime ? formatTime(log.endTime) : '진행중'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{log.title}</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>
                                <Chip label={log.category || '-'} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5, fontWeight: 500 }} align="right">{formatSeconds(dur)}</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5, color: log.note ? 'text.primary' : 'text.disabled', fontStyle: log.note ? 'normal' : 'italic' }}>
                                {log.note || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        )}
      </Paper>

      {/* ── Snackbar ── */}
      <Snackbar open={snackbar_open} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>{snackbar_message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectAnalysis;

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { useTimerStore } from '../../store/useTimerStore';
import { formatDuration } from '../../utils/timeUtils';

// 카테고리별 색상
const CATEGORY_COLORS: Record<string, string> = {
  '분석': '#3b82f6',
  '개발': '#10b981',
  '개발자테스트': '#8b5cf6',
  '테스트오류수정': '#ef4444',
  '센터오류수정': '#f97316',
  '환경세팅': '#06b6d4',
  '회의': '#eab308',
  '기타': '#6b7280',
};

const WeeklySchedule: React.FC = () => {
  const { logs } = useTimerStore();

  // 선택된 주 (월요일 날짜)
  const [selected_week_start, setSelectedWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 월요일로 이동
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // 복사 메뉴 상태
  const [copy_menu_anchor, setCopyMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbar_open, setSnackbarOpen] = useState(false);
  const [snackbar_message, setSnackbarMessage] = useState('');

  // 이번 주인지 확인
  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const this_monday = new Date(today);
    this_monday.setDate(today.getDate() + diff);
    this_monday.setHours(0, 0, 0, 0);
    return selected_week_start.getTime() === this_monday.getTime();
  }, [selected_week_start]);

  // 주간 날짜 배열 (월~일)
  const week_dates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(selected_week_start);
      date.setDate(selected_week_start.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selected_week_start]);

  // 주간 데이터 집계
  const weekly_data = useMemo(() => {
    const start_time = selected_week_start.getTime();
    const end_time = start_time + 7 * 24 * 60 * 60 * 1000;

    // 기간 내 로그 필터링 (완료된 것만)
    const filtered = logs.filter(
      (log) =>
        log.status === 'COMPLETED' &&
        log.startTime >= start_time &&
        log.startTime < end_time
    );

    // 날짜별 그룹화
    const by_date: Record<string, typeof filtered> = {};
    week_dates.forEach((date) => {
      const key = date.toISOString().split('T')[0];
      by_date[key] = [];
    });

    filtered.forEach((log) => {
      const date = new Date(log.startTime);
      const key = date.toISOString().split('T')[0];
      if (by_date[key]) {
        by_date[key].push(log);
      }
    });

    // 카테고리별 총 시간
    const by_category: Record<string, number> = {};
    filtered.forEach((log) => {
      const category = log.category || '기타';
      const duration = (log.endTime! - log.startTime) / 1000 - log.pausedDuration;
      by_category[category] = (by_category[category] || 0) + duration;
    });

    // 게시판별 집계
    const by_board: Record<
      string,
      { boardNo: string; totalSeconds: number; count: number; titles: Set<string> }
    > = {};
    filtered.forEach((log) => {
      const board_key = log.boardNo || '미지정';
      if (!by_board[board_key]) {
        by_board[board_key] = { boardNo: board_key, totalSeconds: 0, count: 0, titles: new Set() };
      }
      const duration = (log.endTime! - log.startTime) / 1000 - log.pausedDuration;
      by_board[board_key].totalSeconds += duration;
      by_board[board_key].count += 1;
      by_board[board_key].titles.add(log.title);
    });

    const total_seconds = filtered.reduce((sum, log) => {
      return sum + (log.endTime! - log.startTime) / 1000 - log.pausedDuration;
    }, 0);

    return {
      by_date,
      by_category,
      by_board: Object.values(by_board).sort((a, b) => b.totalSeconds - a.totalSeconds),
      total_seconds,
      logs: filtered,
    };
  }, [logs, selected_week_start, week_dates]);

  // 주 이동 핸들러
  const handlePrevWeek = () => {
    const prev = new Date(selected_week_start);
    prev.setDate(prev.getDate() - 7);
    setSelectedWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selected_week_start);
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

  // 주 표시 포맷
  const formatWeekRange = () => {
    const end = new Date(selected_week_start);
    end.setDate(end.getDate() + 6);
    const format = (d: Date) =>
      `${d.getMonth() + 1}/${d.getDate()}`;
    return `${selected_week_start.getFullYear()}년 ${format(selected_week_start)} ~ ${format(end)}`;
  };

  // 복사 템플릿 생성
  const generateDetailedTemplate = () => {
    let text = `📊 주간 업무 보고서 (${formatWeekRange()})\n\n`;
    text += `⏱️ 총 업무 시간: ${formatDuration(weekly_data.total_seconds)}\n\n`;

    text += `📋 게시판별 상세 내역\n`;
    text += `${'─'.repeat(40)}\n`;

    weekly_data.by_board.forEach((item) => {
      text += `\n[${item.boardNo === '미지정' ? '기타' : `#${item.boardNo}`}] ${formatDuration(item.totalSeconds)} (${item.count}건)\n`;
      Array.from(item.titles).forEach((title) => {
        text += `  • ${title}\n`;
      });
    });

    return text;
  };

  const generateSummaryTemplate = () => {
    let text = `주간 업무 요약 (${formatWeekRange()})\n\n`;
    text += `총 시간: ${formatDuration(weekly_data.total_seconds)}\n\n`;

    weekly_data.by_board.forEach((item) => {
      text += `• ${item.boardNo === '미지정' ? '기타' : `#${item.boardNo}`}: ${formatDuration(item.totalSeconds)} (${item.count}건)\n`;
    });

    return text;
  };

  // 클립보드 복사
  const handleCopyTemplate = async (type: 'detailed' | 'summary') => {
    const text = type === 'detailed' ? generateDetailedTemplate() : generateSummaryTemplate();
    try {
      await navigator.clipboard.writeText(text);
      setSnackbarMessage(type === 'detailed' ? '상세형 템플릿이 복사되었습니다.' : '요약형 템플릿이 복사되었습니다.');
      setSnackbarOpen(true);
    } catch {
      setSnackbarMessage('복사에 실패했습니다.');
      setSnackbarOpen(true);
    }
    setCopyMenuAnchor(null);
  };

  // CSV 다운로드
  const downloadCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['게시판 번호', '업무 개수', '총 소요 시간(분)', '상세 업무'];

    const rows = weekly_data.by_board.map((item) => [
      item.boardNo,
      item.count,
      Math.floor(item.totalSeconds / 60),
      Array.from(item.titles).join(', '),
    ]);

    const csv_content =
      BOM +
      [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csv_content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `weekly_report_${selected_week_start.toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 막대 차트용 최대값
  const max_category_seconds = Math.max(...Object.values(weekly_data.by_category), 1);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* 헤더 */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          bgcolor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              주간 일정
            </Typography>
            <Typography variant="body2" color="text.secondary">
              주간 업무 현황을 확인하고 보고서를 작성하세요.
            </Typography>
          </Box>

          {/* 주 선택 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                bgcolor: isCurrentWeek ? 'var(--primary-color)' : 'var(--bg-primary)',
                color: isCurrentWeek ? 'var(--bg-primary)' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                minWidth: 180,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {formatWeekRange()}
              </Typography>
            </Box>

            <Tooltip title="다음 주">
              <IconButton size="small" onClick={handleNextWeek}>
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>

            {!isCurrentWeek && (
              <Tooltip title="이번 주">
                <IconButton size="small" onClick={handleThisWeek}>
                  <TodayIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Paper>

      {/* 총 시간 요약 */}
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, bgcolor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', textAlign: 'center' }}
      >
        <Typography variant="body2" color="text.secondary" gutterBottom>
          주간 총 업무 시간
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          {formatDuration(weekly_data.total_seconds).split('/')[1]?.replace('시간', '').trim() || '0'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {formatDuration(weekly_data.total_seconds).split('/')[0]}
        </Typography>
      </Paper>

      {/* 카테고리별 시각화 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          카테고리별 업무 시간
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {Object.entries(weekly_data.by_category)
            .sort(([, a], [, b]) => b - a)
            .map(([category, seconds]) => (
              <Box key={category} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ width: 100, flexShrink: 0, fontWeight: 500 }}
                >
                  {category}
                </Typography>
                <Box sx={{ flex: 1, position: 'relative', height: 24, bgcolor: 'var(--bg-hover)', borderRadius: 1 }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${(seconds / max_category_seconds) * 100}%`,
                      bgcolor: CATEGORY_COLORS[category] || '#6b7280',
                      borderRadius: 1,
                      transition: 'width 0.3s',
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ width: 80, textAlign: 'right', color: 'text.secondary' }}>
                  {formatDuration(seconds)}
                </Typography>
              </Box>
            ))}
          {Object.keys(weekly_data.by_category).length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              이 주에 기록된 업무가 없습니다.
            </Typography>
          )}
        </Box>
      </Paper>

      {/* 액션 버튼 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={(e) => setCopyMenuAnchor(e.currentTarget)}
          disabled={weekly_data.logs.length === 0}
        >
          템플릿 복사
        </Button>
        <Menu
          anchorEl={copy_menu_anchor}
          open={Boolean(copy_menu_anchor)}
          onClose={() => setCopyMenuAnchor(null)}
        >
          <MenuItem onClick={() => handleCopyTemplate('detailed')}>
            <ListItemIcon>
              <DescriptionIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>상세형 템플릿</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleCopyTemplate('summary')}>
            <ListItemIcon>
              <SummarizeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>요약형 템플릿</ListItemText>
          </MenuItem>
        </Menu>

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={downloadCSV}
          disabled={weekly_data.logs.length === 0}
        >
          CSV 다운로드
        </Button>
      </Box>

      {/* 게시판별 테이블 */}
      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'var(--bg-tertiary)' }}>
              <TableCell sx={{ fontWeight: 600 }}>게시판 번호</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>업무 개수</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>총 소요 시간</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>포함된 업무</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weekly_data.by_board.map((row) => (
              <TableRow key={row.boardNo} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell>
                  {row.boardNo === '미지정' ? (
                    <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic' }}>
                      미지정
                    </Typography>
                  ) : (
                    <Chip label={`#${row.boardNo}`} size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="center">{row.count}건</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatDuration(row.totalSeconds)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      overflow: 'hidden',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 1,
                    }}
                  >
                    {Array.from(row.titles).join(', ')}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {weekly_data.by_board.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  이 주에 기록된 업무가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar_open}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          {snackbar_message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WeeklySchedule;

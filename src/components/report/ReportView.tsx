import React, { useState, useMemo } from 'react';
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
  Button,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import ArticleIcon from '@mui/icons-material/Article';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { useTimerStore, TimerLog } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import { getDateRange } from '../../utils/dateUtils';
import { formatDuration, getDurationSecondsExcludingLunch } from '../../utils/timeUtils';

type DateFilterType = 'today' | 'week' | 'month' | 'custom';

const ReportView: React.FC = () => {
  const { logs } = useTimerStore();
  const { getProjectName } = useProjectStore();
  const [filterType, setFilterType] = useState<DateFilterType>('week');
  
  // Custom Date Range
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // 주간 오프셋 (0 = 이번 주, -1 = 지난 주, 1 = 다음 주)
  const [week_offset, setWeekOffset] = useState(0);

  // 복사 메뉴 상태
  const [copy_menu_anchor, setCopyMenuAnchor] = useState<null | HTMLElement>(null);

  // 스낵바 상태
  const [snackbar_open, setSnackbarOpen] = useState(false);
  const [snackbar_message, setSnackbarMessage] = useState('');

  // 주간 날짜 범위 계산
  const getWeekRange = (offset: number) => {
    const now = new Date();
    const day_of_week = now.getDay();
    const diff_to_monday = day_of_week === 0 ? -6 : 1 - day_of_week;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff_to_monday + (offset * 7));
    monday.setHours(6, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);
    sunday.setHours(6, 0, 0, 0);
    
    return { start: monday, end: sunday };
  };

  // 현재 주간 표시 텍스트
  const getWeekLabel = () => {
    if (filterType !== 'week') return '';
    
    const { start, end } = getWeekRange(week_offset);
    const format = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    const end_display = new Date(end);
    end_display.setDate(end_display.getDate() - 1);
    
    if (week_offset === 0) return `이번 주 (${format(start)} ~ ${format(end_display)})`;
    if (week_offset === -1) return `지난 주 (${format(start)} ~ ${format(end_display)})`;
    if (week_offset === 1) return `다음 주 (${format(start)} ~ ${format(end_display)})`;
    return `${format(start)} ~ ${format(end_display)}`;
  };

  // 필터링된 로그 및 집계
  const { aggregatedData, filteredLogs, dateRange } = useMemo(() => {
    let start: Date, end: Date;

    if (filterType === 'custom') {
      start = new Date(startDate);
      start.setHours(6, 0, 0, 0);
      
      end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      end.setHours(6, 0, 0, 0);
    } else if (filterType === 'week') {
      const range = getWeekRange(week_offset);
      start = range.start;
      end = range.end;
    } else {
      const range = getDateRange(filterType);
      start = range.start;
      end = range.end;
    }

    // 1. 기간 필터링
    const filtered = logs.filter(log => {
      // 시작 시간 기준? 종료 시간 기준? 보통 시작 시간 기준
      return log.startTime >= start.getTime() && log.startTime < end.getTime();
    });

    // 2. 그룹화 (프로젝트 코드별)
    const grouped = filtered.reduce((acc, log) => {
      const projectKey = log.projectCode || '미지정';
      
      if (!acc[projectKey]) {
        acc[projectKey] = {
          projectCode: projectKey,
          totalSeconds: 0,
          count: 0,
          titles: new Set<string>() // 어떤 업무들을 했는지 모아서 보여주기 위함
        };
      }

      // 실제 소요 시간 계산 (점심시간 제외 적용)
      // 진행중인 것도 현재시간 기준으로 계산
      const duration = getDurationSecondsExcludingLunch(log.startTime, log.endTime, log.pausedDuration);

      acc[projectKey].totalSeconds += duration;
      acc[projectKey].count += 1;
      acc[projectKey].titles.add(log.title);

      return acc;
    }, {} as Record<string, { projectCode: string, totalSeconds: number, count: number, titles: Set<string> }>);

    return {
      aggregatedData: Object.values(grouped).sort((a, b) => b.totalSeconds - a.totalSeconds),
      filteredLogs: filtered,
      dateRange: { start, end },
    };
  }, [logs, filterType, startDate, endDate, week_offset]);

  const totalTime = aggregatedData.reduce((sum, item) => sum + item.totalSeconds, 0);

  const handleFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newFilter: DateFilterType | null,
  ) => {
    if (newFilter !== null) {
      setFilterType(newFilter);
      if (newFilter === 'week') {
        setWeekOffset(0); // 주간 선택 시 이번 주로 리셋
      }
    }
  };

  // 주간 이동
  const handlePrevWeek = () => setWeekOffset(prev => prev - 1);
  const handleNextWeek = () => setWeekOffset(prev => prev + 1);
  const handleThisWeek = () => setWeekOffset(0);

  // 복사 메뉴 열기/닫기
  const handleOpenCopyMenu = (event: React.MouseEvent<HTMLElement>) => {
    setCopyMenuAnchor(event.currentTarget);
  };
  const handleCloseCopyMenu = () => setCopyMenuAnchor(null);

  // 시간 포맷 (HH:mm)
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // 날짜 포맷 (YYYY-MM-DD)
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toISOString().split('T')[0];
  };

  // 상세형 복사 템플릿 생성
  const generateDetailedTemplate = () => {
    if (filteredLogs.length === 0) return '기록된 작업이 없습니다.';

    const sorted_logs = [...filteredLogs].sort((a, b) => a.startTime - b.startTime);
    
    const lines = sorted_logs.map(log => {
      const date_str = formatDate(log.startTime);
      const start_str = formatTime(log.startTime);
      const end_str = log.endTime ? formatTime(log.endTime) : '진행중';
      const duration = getDurationSecondsExcludingLunch(log.startTime, log.endTime, log.pausedDuration);
      const duration_min = Math.floor(duration / 60);
      
      return `${date_str} | ${log.title} | ${start_str}~${end_str} | ${duration_min}분 | ${log.category || '-'}`;
    });

    const header = '날짜 | 작업명 | 시간 | 소요시간 | 카테고리';
    const separator = '-'.repeat(60);
    
    return [header, separator, ...lines].join('\n');
  };

  // 요약형 복사 템플릿 생성
  const generateSummaryTemplate = () => {
    if (aggregatedData.length === 0) return '기록된 작업이 없습니다.';

    const lines = aggregatedData.map(group => {
      const duration_min = Math.floor(group.totalSeconds / 60);
      const hours = Math.floor(duration_min / 60);
      const mins = duration_min % 60;
      const time_str = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
      
      const project_str = group.projectCode !== '미지정' ? `[${getProjectName(group.projectCode)}] ` : '';
      const titles_arr = Array.from(group.titles);
      const titles_str = titles_arr.length > 3 
        ? `${titles_arr.slice(0, 3).join(', ')} 외 ${titles_arr.length - 3}건`
        : titles_arr.join(', ');
      
      return `${project_str}${titles_str} - ${time_str} (${group.count}건)`;
    });

    const total_min = Math.floor(totalTime / 60);
    const total_hours = Math.floor(total_min / 60);
    const total_mins = total_min % 60;
    const total_str = total_hours > 0 ? `${total_hours}시간 ${total_mins}분` : `${total_mins}분`;

    return [...lines, '', `총 업무시간: ${total_str}`].join('\n');
  };

  // 클립보드에 복사
  const copyToClipboard = async (type: 'detailed' | 'summary') => {
    const text = type === 'detailed' ? generateDetailedTemplate() : generateSummaryTemplate();
    
    try {
      await navigator.clipboard.writeText(text);
      setSnackbarMessage(type === 'detailed' ? '상세형 보고서가 복사되었습니다.' : '요약형 보고서가 복사되었습니다.');
      setSnackbarOpen(true);
    } catch {
      setSnackbarMessage('복사에 실패했습니다.');
      setSnackbarOpen(true);
    }
    
    handleCloseCopyMenu();
  };

  const downloadCSV = () => {
    // BOM for Excel Korean support
    const BOM = '\uFEFF';
    const headers = ['프로젝트 코드', '프로젝트명', '업무 개수', '총 소요 시간(분)', '상세 업무'];
    
    const rows = aggregatedData.map(item => [
      item.projectCode,
      item.projectCode === '미지정' ? '기타' : getProjectName(item.projectCode),
      item.count,
      Math.floor(item.totalSeconds / 60), // 분 단위
      Array.from(item.titles).join(', ')
    ]);

    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `time_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      {/* 필터 컨트롤 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={filterType}
            exclusive
            onChange={handleFilterChange}
            aria-label="date filter"
            size="small"
          >
            <ToggleButton value="today">오늘</ToggleButton>
            <ToggleButton value="week">주간</ToggleButton>
            <ToggleButton value="month">이번 달</ToggleButton>
            <ToggleButton value="custom">직접 지정</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* 복사 버튼 */}
            <Button 
              variant="outlined" 
              startIcon={<ContentCopyIcon />} 
              onClick={handleOpenCopyMenu}
              disabled={aggregatedData.length === 0}
            >
              복사
            </Button>
            
            {/* CSV 다운로드 */}
            <Button 
              variant="outlined" 
              startIcon={<DownloadIcon />} 
              onClick={downloadCSV}
              disabled={aggregatedData.length === 0}
            >
              CSV
            </Button>
          </Box>
        </Box>

        {/* 주간 이동 컨트롤 */}
        {filterType === 'week' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
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
                bgcolor: week_offset === 0 ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                color: week_offset === 0 ? 'var(--bg-primary)' : 'text.primary',
                minWidth: 200,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {getWeekLabel()}
              </Typography>
            </Box>
            
            <Tooltip title="다음 주">
              <IconButton size="small" onClick={handleNextWeek}>
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
            
            {week_offset !== 0 && (
              <Tooltip title="이번 주로 이동">
                <IconButton size="small" onClick={handleThisWeek}>
                  <TodayIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {/* 직접 지정 날짜 선택 */}
        {filterType === 'custom' && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
            <TextField
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Typography>~</Typography>
            <TextField
              type="date"
              size="small"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Box>
        )}
      </Box>

      {/* 복사 메뉴 */}
      <Menu
        anchorEl={copy_menu_anchor}
        open={Boolean(copy_menu_anchor)}
        onClose={handleCloseCopyMenu}
      >
        <MenuItem onClick={() => copyToClipboard('detailed')}>
          <ListItemIcon>
            <ArticleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="상세형" 
            secondary="날짜, 작업명, 시간, 카테고리" 
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
        <MenuItem onClick={() => copyToClipboard('summary')}>
          <ListItemIcon>
            <SummarizeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="요약형" 
            secondary="작업명, 총 시간" 
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
      </Menu>

      {/* 요약 카드 */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          총 업무 시간
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
            {formatDuration(totalTime).split('/')[1].replace('시간', '').trim()} 
            {/* "01:20" 형태만 추출하거나 formatDuration 그대로 쓰거나 */}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {formatDuration(totalTime).split('/')[0]} {/* "80분" */}
        </Typography>
      </Paper>

      {/* 데이터 테이블 */}
      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'var(--bg-tertiary)' }}>
              <TableCell sx={{ fontWeight: 600 }}>프로젝트명</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>업무 개수</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>총 소요 시간</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>포함된 업무 (요약)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {aggregatedData.map((row) => (
              <TableRow
                key={row.projectCode}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {row.projectCode === '미지정' ? (
                    <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic' }}>미지정</Typography>
                  ) : (
                    <Chip label={getProjectName(row.projectCode)} size="small" variant="outlined" title={`[${row.projectCode}]`} />
                  )}
                </TableCell>
                <TableCell align="center">{row.count}건</TableCell>
                <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatDuration(row.totalSeconds)}
                    </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 1 }}>
                    {Array.from(row.titles).join(', ')}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {aggregatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  해당 기간에 기록된 업무가 없습니다.
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

export default ReportView;

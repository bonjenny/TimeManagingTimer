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
  Chip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useTimerStore } from '../../store/useTimerStore';
import { getDateRange } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/timeUtils';

type DateFilterType = 'today' | 'week' | 'month' | 'custom';

const ReportView: React.FC = () => {
  const { logs } = useTimerStore();
  const [filterType, setFilterType] = useState<DateFilterType>('today');
  
  // Custom Date Range
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // 필터링된 로그 및 집계
  const aggregatedData = useMemo(() => {
    let start: Date, end: Date;

    if (filterType === 'custom') {
      start = new Date(startDate);
      start.setHours(6, 0, 0, 0); // 시작일 06:00
      
      end = new Date(endDate);
      end.setDate(end.getDate() + 1); // 종료일 다음날
      end.setHours(6, 0, 0, 0); // 06:00 까지
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

    // 2. 그룹화 (게시판 번호별)
    const grouped = filtered.reduce((acc, log) => {
      const boardKey = log.boardNo || '미지정';
      
      if (!acc[boardKey]) {
        acc[boardKey] = {
          boardNo: boardKey,
          totalSeconds: 0,
          count: 0,
          titles: new Set<string>() // 어떤 업무들을 했는지 모아서 보여주기 위함
        };
      }

      // 실제 소요 시간 계산
      const endTime = log.endTime || Date.now(); // 진행중인건 현재시간까지? 리포트에는 완료된 것만?
      // 리포트에는 보통 완료된 것(status === COMPLETED)만 넣거나, 
      // 진행중인 것도 포함하려면 현재시간 기준으로 계산.
      // 여기서는 정확성을 위해 COMPLETED 된 것만 우선 집계하거나, 
      // 진행중인 것도 '예상 시간'으로 포함할 수 있음. 
      // PRD에 명시 없으나, "소요 시간" 추적이므로 일단 다 포함하되 진행중인건 현재까지로 계산.
      
      let duration = (endTime - log.startTime) / 1000 - log.pausedDuration;
      duration = Math.max(0, duration);

      acc[boardKey].totalSeconds += duration;
      acc[boardKey].count += 1;
      acc[boardKey].titles.add(log.title);

      return acc;
    }, {} as Record<string, { boardNo: string, totalSeconds: number, count: number, titles: Set<string> }>);

    return Object.values(grouped).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [logs, filterType, startDate, endDate]);

  const totalTime = aggregatedData.reduce((sum, item) => sum + item.totalSeconds, 0);

  const handleFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newFilter: DateFilterType | null,
  ) => {
    if (newFilter !== null) {
      setFilterType(newFilter);
    }
  };

  const downloadCSV = () => {
    // BOM for Excel Korean support
    const BOM = '\uFEFF';
    const headers = ['게시판 번호', '업무 개수', '총 소요 시간(분)', '상세 업무'];
    
    const rows = aggregatedData.map(item => [
      item.boardNo,
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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 4, gap: 2 }}>
        <ToggleButtonGroup
          value={filterType}
          exclusive
          onChange={handleFilterChange}
          aria-label="date filter"
          size="small"
        >
          <ToggleButton value="today">오늘</ToggleButton>
          <ToggleButton value="week">이번 주</ToggleButton>
          <ToggleButton value="month">이번 달</ToggleButton>
          <ToggleButton value="custom">직접 지정</ToggleButton>
        </ToggleButtonGroup>

        {filterType === 'custom' && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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

        <Button 
          variant="outlined" 
          startIcon={<DownloadIcon />} 
          onClick={downloadCSV}
          disabled={aggregatedData.length === 0}
        >
          CSV 다운로드
        </Button>
      </Box>

      {/* 요약 카드 */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: '#f8f9fa', border: '1px solid #eaeaea', textAlign: 'center' }}>
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
            <TableRow sx={{ bgcolor: '#fafafa' }}>
              <TableCell sx={{ fontWeight: 600 }}>게시판 번호</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>업무 개수</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>총 소요 시간</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>포함된 업무 (요약)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {aggregatedData.map((row) => (
              <TableRow
                key={row.boardNo}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {row.boardNo === '미지정' ? (
                    <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic' }}>미지정</Typography>
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
    </Box>
  );
};

export default ReportView;

import { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import Layout, { PageType } from './components/Layout';
import ActiveTimer from './components/timer/ActiveTimer';
import TimerInput from './components/timer/TimerInput';
import TimerList from './components/timer/TimerList';
import GanttChart from './components/gantt/GanttChart';
import PresetPanel from './components/preset/PresetPanel';
import ReportView from './components/report/ReportView';
import WeeklySchedule from './components/pages/WeeklySchedule';
import FeedbackBoard from './components/pages/FeedbackBoard';
import SettingsPage from './components/pages/SettingsPage';
import { Box, Paper, Typography, useMediaQuery } from '@mui/material';

function App() {
  const [current_page, setCurrentPage] = useState<PageType>('daily');
  const is_mobile = useMediaQuery('(max-width:900px)');

  // F8 단축키로 새 작업 추가 팝업 (Step 2에서 구현 예정)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        // TODO: 새 작업 추가 팝업 열기
        console.log('F8 pressed - Open new task popup');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
  };

  // 일간 타이머 페이지 - 3단 구성 레이아웃
  const renderDailyPage = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: is_mobile ? '1fr' : '280px 1fr',
        gridTemplateRows: 'auto 1fr auto',
        gap: 3,
        minHeight: 'calc(100vh - 180px)',
      }}
    >
      {/* 왼쪽: 작업 프리셋 패널 */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '1',
          gridRow: is_mobile ? '1' : '1 / 4',
          order: is_mobile ? 2 : 0,
        }}
      >
        <PresetPanel />
      </Box>

      {/* 중앙 상단: 활성 타이머 + 타이머 입력 */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '2',
          gridRow: is_mobile ? '1' : '1',
          order: is_mobile ? 0 : 0,
        }}
      >
        <ActiveTimer />
        <TimerInput />
      </Box>

      {/* 중앙: 간트 차트 (타임라인) */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '2',
          gridRow: is_mobile ? '3' : '2',
          order: is_mobile ? 3 : 0,
        }}
      >
        <GanttChart />
      </Box>

      {/* 하단: 작업 기록 리스트 */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '2',
          gridRow: is_mobile ? '4' : '3',
          order: is_mobile ? 4 : 0,
        }}
      >
        <TimerList />
      </Box>
    </Box>
  );

  // 페이지별 렌더링
  const renderPage = () => {
    switch (current_page) {
      case 'daily':
        return renderDailyPage();
      case 'weekly':
        return <WeeklySchedule />;
      case 'feedback':
        return <FeedbackBoard />;
      case 'settings':
        return <SettingsPage />;
      default:
        return renderDailyPage();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Layout currentPage={current_page} onPageChange={handlePageChange}>
        {renderPage()}
      </Layout>
    </ThemeProvider>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import Layout, { PageType } from './components/Layout';
import ActiveTimer from './components/timer/ActiveTimer';
import TimerInput from './components/timer/TimerInput';
import TimerList from './components/timer/TimerList';
import GanttChart from './components/gantt/GanttChart';
import PresetPanel from './components/preset/PresetPanel';
import WeeklySchedule from './components/pages/WeeklySchedule';
import FeedbackBoard from './components/pages/FeedbackBoard';
import SettingsPage from './components/pages/SettingsPage';
import NewTaskModal from './components/modal/NewTaskModal';
import { Box, useMediaQuery } from '@mui/material';
import { useTimerStore } from './store/useTimerStore';

function App() {
  const [current_page, setCurrentPage] = useState<PageType>('daily');
  const [is_new_task_modal_open, setIsNewTaskModalOpen] = useState(false);
  const is_mobile = useMediaQuery('(max-width:900px)');
  const activeTimer = useTimerStore((state) => state.activeTimer);

  // F8 단축키로 새 작업 추가 팝업
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        setIsNewTaskModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
  };

  // 일간 타이머 페이지 - 3단 구성 레이아웃
  // 순서: 타임라인 → 현재 진행중인 작업(ActiveTimer + TimerInput) → 최근 업무 목록
  const renderDailyPage = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: is_mobile ? '1fr' : '280px 1fr',
        gridTemplateRows: 'auto auto auto',
        gap: 2,
        minHeight: 'calc(100vh - 180px)',
      }}
    >
      {/* 왼쪽: 작업 프리셋 패널 */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '1',
          gridRow: is_mobile ? '1' : '1 / 4',
          order: is_mobile ? 3 : 0,
        }}
      >
        <PresetPanel />
      </Box>

      {/* 1. 간트 차트 (타임라인) */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '2',
          gridRow: is_mobile ? '1' : '1',
          order: is_mobile ? 0 : 0,
        }}
      >
        <GanttChart />
      </Box>

      {/* 2. 입력창 + 현재 진행중인 작업 */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '2',
          gridRow: is_mobile ? '2' : '2',
          order: is_mobile ? 1 : 0,
          display: 'flex',
          flexDirection: 'column',
          gap: activeTimer ? 2 : 0, // 활성 타이머가 없으면 gap 제거
        }}
      >
        <TimerInput />
        {activeTimer && <ActiveTimer />}
      </Box>

      {/* 3. 하단: 최근 업무 기록 리스트 */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '2',
          gridRow: is_mobile ? '3' : '3',
          order: is_mobile ? 2 : 0,
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
      
      {/* F8 새 작업 추가 모달 */}
      <NewTaskModal
        open={is_new_task_modal_open}
        onClose={() => setIsNewTaskModalOpen(false)}
      />
    </ThemeProvider>
  );
}

export default App;

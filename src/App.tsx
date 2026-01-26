import { useState, useEffect, useRef, useCallback } from 'react';
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

// 설정 저장 키
const SETTINGS_STORAGE_KEY = 'timekeeper-settings';

// 테마 적용 함수
const applyTheme = (primary_color: string, accent_color: string) => {
  document.documentElement.style.setProperty('--primary-color', primary_color);
  document.documentElement.style.setProperty('--accent-color', accent_color);
};

function App() {
  const [current_page, setCurrentPage] = useState<PageType>('daily');
  const [is_new_task_modal_open, setIsNewTaskModalOpen] = useState(false);
  const is_mobile = useMediaQuery('(max-width:900px)');
  const activeTimer = useTimerStore((state) => state.activeTimer);
  const pauseTimer = useTimerStore((state) => state.pauseTimer);
  const resumeTimer = useTimerStore((state) => state.resumeTimer);
  const timer_input_ref = useRef<HTMLInputElement>(null);

  // 저장된 테마 적용 (초기 로드)
  useEffect(() => {
    try {
      const saved_settings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved_settings) {
        const settings = JSON.parse(saved_settings);
        if (settings.primaryColor && settings.accentColor) {
          applyTheme(settings.primaryColor, settings.accentColor);
        }
      }
    } catch {
      // 무시
    }
  }, []);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((page: PageType) => {
    setCurrentPage(page);
  }, []);

  // 단축키 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F8: 새 작업 추가 팝업
      if (e.key === 'F8') {
        e.preventDefault();
        setIsNewTaskModalOpen(true);
        return;
      }

      // Alt 키 조합
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          // Alt + N: 입력창 포커스
          case 'n':
            e.preventDefault();
            if (current_page === 'daily') {
              timer_input_ref.current?.focus();
            } else {
              handlePageChange('daily');
              setTimeout(() => timer_input_ref.current?.focus(), 100);
            }
            break;

          // Alt + S: 타이머 일시정지/재개
          case 's':
            e.preventDefault();
            if (activeTimer) {
              if (activeTimer.status === 'RUNNING') {
                pauseTimer();
              } else if (activeTimer.status === 'PAUSED') {
                resumeTimer();
              }
            }
            break;

          // Alt + 1: 일간 타이머 페이지
          case '1':
            e.preventDefault();
            handlePageChange('daily');
            break;

          // Alt + 2: 주간 일정 페이지
          case '2':
            e.preventDefault();
            handlePageChange('weekly');
            break;

          // Alt + T: 오늘로 이동 (일간 페이지에서)
          case 't':
            e.preventDefault();
            if (current_page !== 'daily') {
              handlePageChange('daily');
            }
            // GanttChart의 오늘 이동은 컴포넌트 내부에서 처리됨
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTimer, pauseTimer, resumeTimer, current_page, handlePageChange]);

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

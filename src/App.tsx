import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from './theme';
import Layout, { PageType } from './components/Layout';
import ActiveTimer from './components/timer/ActiveTimer';
import TimerInput from './components/timer/TimerInput';
import TimerList from './components/timer/TimerList';
import GanttChart from './components/gantt/GanttChart';
import PresetPanel from './components/preset/PresetPanel';
import WeeklySchedule from './components/pages/WeeklySchedule';
import SettingsPage from './components/pages/SettingsPage';
import NewTaskModal from './components/modal/NewTaskModal';
import { Box, Typography, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useTimerStore } from './store/useTimerStore';
import { applyThemeColors, applyPaletteHighlight } from './styles/tokens';
import { loadPaletteSettings, getPalette } from './utils/colorPalette';

// 설정 저장 키
const SETTINGS_STORAGE_KEY = 'timekeeper-settings';

// 하루 시작 기준 (00:00)
const DAY_START_HOUR = 0;

// 테마 적용 함수 (tokens.ts의 applyThemeColors 래퍼)
const applyTheme = (primary_color: string, accent_color: string, is_dark?: boolean) => {
  applyThemeColors({ primary: primary_color, accent: accent_color, isDark: is_dark });
};

function App() {
  const [current_page, setCurrentPage] = useState<PageType>('daily');
  const [is_new_task_modal_open, setIsNewTaskModalOpen] = useState(false);
  const is_mobile = useMediaQuery('(max-width:900px)');
  const activeTimer = useTimerStore((state) => state.activeTimer);
  const pauseTimer = useTimerStore((state) => state.pauseTimer);
  const resumeTimer = useTimerStore((state) => state.resumeTimer);
  const { themeConfig, setThemeConfig } = useTimerStore();
  const timer_input_ref = useRef<HTMLInputElement>(null);
  const date_input_ref = useRef<HTMLInputElement>(null);

  // 선택된 날짜 상태 (기본값: 오늘)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    if (now.getHours() < DAY_START_HOUR) {
      now.setDate(now.getDate() - 1);
    }
    return now;
  });

  // 오늘 날짜인지 확인
  const isToday = (() => {
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
  })();

  // 날짜 이동 핸들러
  const handlePrevDay = () => {
    setSelectedDate(prev => {
      const new_date = new Date(prev);
      new_date.setDate(new_date.getDate() - 1);
      return new_date;
    });
  };

  const handleNextDay = () => {
    setSelectedDate(prev => {
      const new_date = new Date(prev);
      new_date.setDate(new_date.getDate() + 1);
      return new_date;
    });
  };

  const handleToday = () => {
    const now = new Date();
    if (now.getHours() < DAY_START_HOUR) {
      now.setDate(now.getDate() - 1);
    }
    setSelectedDate(now);
  };

  // 날짜 포맷
  const formatSelectedDate = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const day_of_week = ['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()];
    return `${year}. ${month}. ${day}. (${day_of_week})`;
  };

  // 날짜 선택 핸들러 (input type="date" 변경 시)
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [y, m, d] = e.target.value.split('-').map(Number);
      const new_date = new Date();
      new_date.setFullYear(y, m - 1, d);
      setSelectedDate(new_date);
    }
  };

  // input value용 날짜 포맷 (YYYY-MM-DD)
  const getFormattedDateValue = () => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 저장된 테마 및 팔레트 적용 (초기 로드)
  useEffect(() => {
    try {
      // 테마 설정 적용 (구 버전 호환성)
      const saved_settings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved_settings) {
        const settings = JSON.parse(saved_settings);
        if (settings.primaryColor && settings.accentColor) {
          setThemeConfig({
            primaryColor: settings.primaryColor,
            accentColor: settings.accentColor,
            isDark: settings.isDark || false,
          });
        }
      }
      
      // 컬러 팔레트 적용
      const palette_settings = loadPaletteSettings();
      const palette = getPalette(palette_settings);
      applyPaletteHighlight(palette);
    } catch {
      // 무시
    }
  }, [setThemeConfig]);

  // 동적 테마 생성
  const currentTheme = useMemo(() => {
    return createAppTheme(themeConfig.primaryColor, themeConfig.accentColor, themeConfig.isDark);
  }, [themeConfig.primaryColor, themeConfig.accentColor, themeConfig.isDark]);

  // CSS 변수 업데이트
  useEffect(() => {
    applyThemeColors({ 
      primary: themeConfig.primaryColor, 
      accent: themeConfig.accentColor, 
      isDark: themeConfig.isDark 
    });
  }, [themeConfig.primaryColor, themeConfig.accentColor, themeConfig.isDark]);

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
            handleToday();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTimer, pauseTimer, resumeTimer, current_page, handlePageChange]);

  // 일간 타이머 페이지 - 3단 구성 레이아웃
  const renderDailyPage = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: is_mobile ? '1fr' : '280px 1fr',
        gridTemplateRows: is_mobile ? 'auto auto auto auto auto' : 'auto auto auto auto',
        gap: 2,
        minHeight: 'calc(100vh - 180px)',
      }}
    >
      {/* 왼쪽: 작업 프리셋 패널 */}
      <Box
        sx={{
          gridColumn: '1',
          gridRow: is_mobile ? '5' : '1 / 5',
        }}
      >
        <PresetPanel />
      </Box>

      {/* 0. 날짜 선택기 (상단) */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '2',
          gridRow: is_mobile ? '1' : '1',
          order: is_mobile ? 0 : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          py: 1,
        }}
      >
        <Tooltip title="이전 날짜">
          <IconButton size="small" onClick={handlePrevDay}>
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
        
        <Box
          sx={{
            position: 'relative', // input 배치를 위해 relative 설정
            px: 3,
            py: 0.75,
            borderRadius: 2,
            bgcolor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            minWidth: 180,
            textAlign: 'center',
            cursor: 'pointer', // 클릭 가능함을 표시
            '&:hover': {
              bgcolor: 'var(--bg-hover)', // 호버 효과
            }
          }}
        >
          {/* 숨겨진 날짜 선택 input */}
          <input
            ref={date_input_ref}
            type="date"
            value={getFormattedDateValue()}
            onChange={handleDateChange}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              zIndex: 1,
              cursor: 'pointer',
            }}
          />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {formatSelectedDate()}
          </Typography>
        </Box>
        
        <Tooltip title="다음 날짜">
          <IconButton size="small" onClick={handleNextDay}>
            <ChevronRightIcon />
          </IconButton>
        </Tooltip>
        
        {/* 캘린더 아이콘 - 날짜 선택기 열기 */}
        <Tooltip title="날짜 선택">
          <IconButton 
            size="small" 
            onClick={() => date_input_ref.current?.showPicker?.()}
            sx={{ ml: 0.5 }}
          >
            <CalendarMonthIcon />
          </IconButton>
        </Tooltip>
        
        {!isToday && (
          <Tooltip title="오늘로 이동">
            <IconButton size="small" onClick={handleToday}>
              <TodayIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* 1. 간트 차트 (타임라인) */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '2',
          gridRow: is_mobile ? '2' : '2',
          order: is_mobile ? 1 : 0,
        }}
      >
        <GanttChart selectedDate={selectedDate} />
      </Box>

      {/* 2. 입력창 + 현재 진행중인 작업 */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '2',
          gridRow: is_mobile ? '3' : '3',
          order: is_mobile ? 2 : 0,
          display: 'flex',
          flexDirection: 'column',
          gap: activeTimer ? 2 : 0,
        }}
      >
        <TimerInput />
        {activeTimer && <ActiveTimer />}
      </Box>

      {/* 3. 하단: 최근 업무 기록 리스트 */}
      <Box
        sx={{
          gridColumn: is_mobile ? '1' : '2',
          gridRow: is_mobile ? '4' : '4',
          order: is_mobile ? 3 : 0,
        }}
      >
        <TimerList selectedDate={selectedDate} />
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
      case 'settings':
        return <SettingsPage />;
      default:
        return renderDailyPage();
    }
  };

  return (
    <ThemeProvider theme={currentTheme}>
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

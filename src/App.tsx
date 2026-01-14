import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import Layout from './components/Layout';
import ActiveTimer from './components/timer/ActiveTimer';
import TimerInput from './components/timer/TimerInput';
import TimerList from './components/timer/TimerList';
import { Box, Typography, Divider } from '@mui/material';

function App() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <Layout currentTab={currentTab} onTabChange={handleTabChange}>
        {currentTab === 0 && (
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <ActiveTimer />
            
            <Box sx={{ mb: 4 }}>
              <TimerInput />
            </Box>

            <Divider sx={{ my: 4 }} />
            
            <Box>
                {/* 간트 차트 자리 (Phase 4 예정) */}
                <Typography variant="h6" sx={{ mb: 2 }}>타임라인 (Gantt Chart)</Typography>
                <Box sx={{ p: 4, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center', color: 'text.secondary', mb: 6 }}>
                    간트 차트가 여기에 표시됩니다.
                </Box>
            </Box>

            <TimerList />
          </Box>
        )}
        {currentTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5">리포트 뷰</Typography>
            <Typography variant="body1">이곳에 통계 리포트가 표시됩니다.</Typography>
          </Box>
        )}
      </Layout>
    </ThemeProvider>
  );
}

export default App;

import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import Layout from './components/Layout';
import ActiveTimer from './components/timer/ActiveTimer';
import TimerInput from './components/timer/TimerInput';
import TimerList from './components/timer/TimerList';
import GanttChart from './components/gantt/GanttChart';
import ReportView from './components/report/ReportView';
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
                <GanttChart />
            </Box>

            <TimerList />
          </Box>
        )}
        {currentTab === 1 && (
          <Box sx={{ p: 0 }}>
            <ReportView />
          </Box>
        )}
      </Layout>
    </ThemeProvider>
  );
}

export default App;

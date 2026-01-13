import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import Layout from './components/Layout';
import { Box, Typography } from '@mui/material';

function App() {
  // 탭 상태 관리: 0 = 타이머+간트, 1 = 리포트
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <Layout currentTab={currentTab} onTabChange={handleTabChange}>
        {currentTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5">타이머 & 간트 차트 뷰</Typography>
            <Typography variant="body1">이곳에 타이머 목록과 간트 차트가 표시됩니다.</Typography>
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

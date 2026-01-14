import React from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Container } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssessmentIcon from '@mui/icons-material/Assessment';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: number;
  onTabChange: (newValue: number) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentTab, onTabChange }) => {
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    onTabChange(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" color="default" elevation={0}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: 64 }}>
            {/* 로고 영역 */}
            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 0,
                mr: 4,
                fontWeight: 700,
                letterSpacing: '-0.5px',
                cursor: 'pointer',
              }}
            >
              TimeKeeper
            </Typography>

            {/* 네비게이션 탭 영역 */}
            <Tabs
              value={currentTab}
              onChange={handleChange}
              textColor="primary"
              indicatorColor="primary"
              sx={{
                minHeight: 64,
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '0.95rem',
                  fontWeight: 500,
                },
              }}
            >
              <Tab 
                icon={<AccessTimeIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} />} 
                iconPosition="start" 
                label="타이머" 
              />
              <Tab 
                icon={<AssessmentIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} />} 
                iconPosition="start" 
                label="리포트" 
              />
            </Tabs>
          </Toolbar>
        </Container>
      </AppBar>

      {/* 메인 컨텐츠 영역 */}
      <Container maxWidth="lg" component="main" sx={{ flexGrow: 1, py: 4 }}>
        {children}
      </Container>
      
      {/* 심플한 푸터 (옵션) */}
      <Box component="footer" sx={{ py: 3, textAlign: 'center', color: 'text.secondary', borderTop: '1px solid #eaeaea' }}>
        <Typography variant="caption">
          © {new Date().getFullYear()} TimeKeeper. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout;

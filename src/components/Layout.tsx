import React from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Container } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ForumIcon from '@mui/icons-material/Forum';
import SettingsIcon from '@mui/icons-material/Settings';

export type PageType = 'daily' | 'weekly' | 'feedback' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const PAGE_MAP: { page: PageType; label: string; icon: React.ReactNode }[] = [
  { page: 'daily', label: '일간 타이머', icon: <AccessTimeIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
  { page: 'weekly', label: '주간 일정', icon: <CalendarMonthIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
  { page: 'feedback', label: '건의사항', icon: <ForumIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
  { page: 'settings', label: '설정', icon: <SettingsIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
];

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const current_tab_index = PAGE_MAP.findIndex(p => p.page === currentPage);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    onPageChange(PAGE_MAP[newValue].page);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        bgcolor: 'var(--bg-primary, #fafafa)'
      }}
    >
      <AppBar 
        position="sticky" 
        color="default" 
        elevation={0}
        sx={{
          bgcolor: 'var(--header-bg, #ffffff)',
          borderBottom: '1px solid var(--border-color, #eaeaea)'
        }}
      >
        <Container maxWidth="xl">
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
                color: 'var(--text-primary, #000000)',
              }}
              onClick={() => onPageChange('daily')}
            >
              TimeKeeper
            </Typography>

            {/* 네비게이션 탭 영역 */}
            <Tabs
              value={current_tab_index}
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
                '& .MuiTabs-indicator': {
                  bgcolor: 'var(--accent-color, #000000)',
                }
              }}
            >
              {PAGE_MAP.map((item) => (
                <Tab
                  key={item.page}
                  icon={item.icon}
                  iconPosition="start"
                  label={item.label}
                />
              ))}
            </Tabs>
          </Toolbar>
        </Container>
      </AppBar>

      {/* 메인 컨텐츠 영역 */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          py: 3,
          px: { xs: 2, md: 3 }
        }}
      >
        <Container maxWidth="xl" disableGutters>
          {children}
        </Container>
      </Box>
      
      {/* 심플한 푸터 */}
      <Box 
        component="footer" 
        sx={{ 
          py: 3, 
          textAlign: 'center', 
          color: 'text.secondary', 
          borderTop: '1px solid var(--border-color, #eaeaea)',
          bgcolor: 'var(--header-bg, #ffffff)'
        }}
      >
        <Typography variant="caption">
          © {new Date().getFullYear()} TimeKeeper. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout;

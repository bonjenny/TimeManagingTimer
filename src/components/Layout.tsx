import React from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Container, IconButton, Tooltip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ForumIcon from '@mui/icons-material/Forum';
import SettingsIcon from '@mui/icons-material/Settings';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useTimerStore } from '../store/useTimerStore';

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
  const { themeConfig, toggleDarkMode } = useTimerStore();
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
        bgcolor: 'background.default',
        color: 'text.primary',
        transition: 'background-color 0.3s, color 0.3s'
      }}
    >
      <AppBar 
        position="sticky" 
        color="default" 
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
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
                color: 'text.primary',
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
                flexGrow: 1,
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '0.95rem',
                  fontWeight: 500,
                },
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

            {/* 다크모드 토글 버튼 */}
            <Tooltip title={themeConfig.isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}>
              <IconButton onClick={toggleDarkMode} color="inherit">
                {themeConfig.isDark ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
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
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
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

import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Container, IconButton, Tooltip, Dialog, DialogContent, Button } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SettingsIcon from '@mui/icons-material/Settings';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import CloseIcon from '@mui/icons-material/Close';
import { useTimerStore } from '../store/useTimerStore';
import FeedbackBoard from './pages/FeedbackBoard';

export type PageType = 'daily' | 'weekly' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const PAGE_MAP: { page: PageType; label: string; icon: React.ReactNode }[] = [
  { page: 'daily', label: '일간 타이머', icon: <AccessTimeIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
  { page: 'weekly', label: '주간 일정', icon: <CalendarMonthIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
  { page: 'settings', label: '설정', icon: <SettingsIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
];

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const { themeConfig, toggleDarkMode } = useTimerStore();
  const current_tab_index = PAGE_MAP.findIndex(p => p.page === currentPage);
  const [openQnA, setOpenQnA] = useState(false);

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
          py: 1.5, 
          textAlign: 'center', 
          color: 'text.secondary', 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 0.5,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 80,
            height: '1px',
            backgroundColor: 'var(--border-color, rgba(128,128,128,0.3))'
          }
        }}
      >
        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', maxWidth: 800, px: 2 }}>
          모든 기록은 내 컴퓨터(브라우저)에 저장되며, 서버로 전송되지 않습니다. 저장 공간이 부족할 경우 오래된 데이터부터 자동 삭제될 수 있습니다.
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
          © {new Date().getFullYear()} TimeKeeper. Jihee Eom All rights reserved.
        </Typography>

        <Button
          onClick={() => setOpenQnA(true)}
          sx={{
            position: 'absolute',
            right: 16,
            color: 'text.secondary',
            fontSize: '0.75rem',
            minWidth: 'auto',
            p: 0.5,
            '&:hover': {
              bgcolor: 'transparent',
              textDecoration: 'underline'
            }
          }}
        >
          Q&A
        </Button>
      </Box>

      {/* Q&A 팝업 */}
      <Dialog
        open={openQnA}
        onClose={() => setOpenQnA(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            bgcolor: 'background.default'
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={() => setOpenQnA(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 0, '& .MuiContainer-root': { px: 2 } }}>
          <FeedbackBoard />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Layout;

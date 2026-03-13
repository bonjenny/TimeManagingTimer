import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Container, IconButton, Tooltip, Dialog, DialogContent, DialogTitle, Button, TextField, Table, TableHead, TableBody, TableRow, TableCell, CircularProgress } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TableChartIcon from '@mui/icons-material/TableChart';
import SettingsIcon from '@mui/icons-material/Settings';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import { useTimerStore } from '../store/useTimerStore';
import FeedbackBoard from './pages/FeedbackBoard';
import { getItem, getStorageUsage } from '../utils/storage';
import { recordVisit, getTodayVisitors, VisitorRecord } from '../services/visitorService';
import { getAdminPassword } from '../utils/env';
import { simpleHash } from '../services/feedbackService';

const SETTINGS_STORAGE_KEY = 'timekeeper-settings';

const loadAndApplyScreenScale = () => {
  try {
    const saved = getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const settings = JSON.parse(saved);
      const scale = settings.screenScale ?? 1.0;
      document.documentElement.style.zoom = String(scale);
    }
  } catch {
    // 무시
  }
};

export type PageType = 'daily' | 'weekly' | 'monthly' | 'analysis' | 'timeManagement' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const PAGE_MAP: { page: PageType; label: string; icon: React.ReactNode }[] = [
  { page: 'daily', label: '일간 타이머', icon: <AccessTimeIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
  { page: 'weekly', label: '주간 일정', icon: <CalendarMonthIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
  { page: 'monthly', label: '배포 캘린더', icon: <EventNoteIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
  { page: 'analysis', label: '프로젝트 분석', icon: <AssessmentIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
  { page: 'timeManagement', label: '시간관리', icon: <TableChartIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
  { page: 'settings', label: '설정', icon: <SettingsIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
];

const ADMIN_PASSWORD_HASH = simpleHash(getAdminPassword());

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const { themeConfig, toggleDarkMode, logs, deleted_logs } = useTimerStore();
  const current_tab_index = PAGE_MAP.findIndex(p => p.page === currentPage);
  const [openQnA, setOpenQnA] = useState(false);

  // 방문자 통계 관련 상태
  const [admin_pw_open, setAdminPwOpen] = useState(false);
  const [admin_pw_input, setAdminPwInput] = useState('');
  const [admin_pw_error, setAdminPwError] = useState(false);
  const [visitor_open, setVisitorOpen] = useState(false);
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [visitor_loading, setVisitorLoading] = useState(false);

  const storageUsage = useMemo(() => getStorageUsage(), [logs.length, deleted_logs.length]);

  // 페이지 로드 시 저장된 화면 크기 설정 적용 + 방문 기록
  useEffect(() => {
    loadAndApplyScreenScale();
    recordVisit();
  }, []);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    onPageChange(PAGE_MAP[newValue].page);
  };

  const handleLogoDoubleClick = useCallback(() => {
    setAdminPwInput('');
    setAdminPwError(false);
    setAdminPwOpen(true);
  }, []);

  const handleAdminPwConfirm = useCallback(async () => {
    if (simpleHash(admin_pw_input) !== ADMIN_PASSWORD_HASH) {
      setAdminPwError(true);
      return;
    }
    setAdminPwOpen(false);
    setAdminPwInput('');
    setAdminPwError(false);
    setVisitorLoading(true);
    setVisitorOpen(true);
    try {
      const data = await getTodayVisitors();
      setVisitors(data);
    } catch {
      setVisitors([]);
    } finally {
      setVisitorLoading(false);
    }
  }, [admin_pw_input]);

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        color: 'text.primary',
        transition: 'color 0.3s'
      }}
    >
      <AppBar 
        position="sticky" 
        color="default" 
        elevation={0}
        sx={{
          bgcolor: 'transparent',
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
                userSelect: 'none',
              }}
              onClick={() => onPageChange('daily')}
              onDoubleClick={handleLogoDoubleClick}
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
        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', maxWidth: 900, px: 2, textAlign: 'center' }}>
          모든 기록은 내 컴퓨터(브라우저 IndexedDB)에 저장되며, 서버로 전송되지 않습니다. 
          현재 저장 용량: <strong>{storageUsage.usageKB} KB</strong> ({storageUsage.usageMB} MB)
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
        <DialogContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <FeedbackBoard />
        </DialogContent>
      </Dialog>

      {/* 관리자 비밀번호 확인 Dialog */}
      <Dialog open={admin_pw_open} onClose={() => setAdminPwOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon fontSize="small" />
          관리자 로그인
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            관리자 비밀번호를 입력하세요.
          </Typography>
          <TextField
            label="관리자 비밀번호"
            type="password"
            size="small"
            fullWidth
            value={admin_pw_input}
            onChange={(e) => { setAdminPwInput(e.target.value); setAdminPwError(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdminPwConfirm(); }}
            error={admin_pw_error}
            helperText={admin_pw_error ? '비밀번호가 올바르지 않습니다.' : ''}
            autoFocus
          />
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 3, pb: 2 }}>
          <Button onClick={() => setAdminPwOpen(false)}>취소</Button>
          <Button variant="contained" onClick={handleAdminPwConfirm}
            sx={{ bgcolor: 'var(--primary-color)', '&:hover': { bgcolor: 'var(--accent-color)' } }}>
            확인
          </Button>
        </Box>
      </Dialog>

      {/* 방문자 통계 Dialog */}
      <Dialog open={visitor_open} onClose={() => setVisitorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon fontSize="small" />
            오늘 방문자 통계
            {!visitor_loading && (
              <Typography variant="caption" color="text.secondary">
                ({visitors.length}명)
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={() => setVisitorOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 2, pb: 2 }}>
          {visitor_loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : visitors.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              오늘 방문 기록이 없습니다.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>브라우저 ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>최초 접속</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visitors.map((v, idx) => (
                  <TableRow key={v.browser_id}>
                    <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{idx + 1}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>{v.browser_id.slice(0, 8)}…</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      {new Date(v.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Layout;

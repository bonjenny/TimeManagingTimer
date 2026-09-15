import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Container, IconButton, Tooltip, Dialog, DialogContent, DialogTitle, Button, TextField, Table, TableHead, TableBody, TableRow, TableCell, CircularProgress, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Divider, useMediaQuery, useTheme, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ForumIcon from '@mui/icons-material/Forum';
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
import MenuBookIcon from '@mui/icons-material/MenuBook';
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

export type PageType = 'daily' | 'weekly' | 'monthly' | 'analysis' | 'timeManagement' | 'settings' | 'guide';

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
  { page: 'guide', label: '가이드', icon: <MenuBookIcon sx={{ fontSize: 20, mr: 1, mb: '0px !important' }} /> },
];

// 모바일 하단 탭: 엄지로 자주 누르는 화면만. 나머지는 「더보기」 시트로.
const BOTTOM_NAV_PAGES: PageType[] = ['daily', 'weekly', 'timeManagement', 'monthly'];
const BOTTOM_NAV_LABEL: Partial<Record<PageType, string>> = { daily: '타이머', weekly: '주간', timeManagement: '시간관리', monthly: '캘린더' };
const MOBILE_BAR_HEIGHT = 56;

const ADMIN_PASSWORD_HASH = simpleHash(getAdminPassword());

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const { themeConfig, toggleDarkMode, logs, deleted_logs } = useTimerStore();
  const current_tab_index = PAGE_MAP.findIndex(p => p.page === currentPage);
  const [openQnA, setOpenQnA] = useState(false);
  // 태블릿·모바일(900px 미만): 상단 탭 대신 하단 탭 바(자주 쓰는 4개 + 더보기)
  const theme = useTheme();
  const is_compact = useMediaQuery(theme.breakpoints.down('md'));
  const is_phone = useMediaQuery(theme.breakpoints.down('sm'));
  const [nav_open, setNavOpen] = useState(false);
  const bottom_value = BOTTOM_NAV_PAGES.includes(currentPage) ? currentPage : 'more';

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
        <Container maxWidth="xl" sx={is_compact ? { maxWidth: '752px !important' } : undefined}>
          <Toolbar disableGutters sx={{ minHeight: { xs: MOBILE_BAR_HEIGHT, md: 64 } }}>
            {/* 로고 영역 (모바일에서는 현재 화면 제목이 그 자리를 쓴다) */}
            {!is_compact && (
            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 0,
                mr: { xs: 1.5, md: 4 },
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
            )}

            {/* 네비게이션: 모바일은 화면 제목, 데스크톱은 탭 */}
            {is_compact ? (
              <Typography
                component="h1"
                noWrap
                onDoubleClick={handleLogoDoubleClick}
                sx={{ flexGrow: 1, minWidth: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', userSelect: 'none' }}
              >
                {PAGE_MAP[current_tab_index]?.label}
              </Typography>
            ) : (
            <Tabs
              value={current_tab_index}
              onChange={handleChange}
              textColor="primary"
              indicatorColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 64,
                flexGrow: 1,
                minWidth: 0, // 좁은 화면에서 탭이 다크모드 버튼을 덮지 않고 가로 스크롤되게
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
            )}

            {/* 다크모드 토글 버튼 */}
            <Tooltip title={themeConfig.isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}>
              <IconButton onClick={toggleDarkMode} color="inherit">
                {themeConfig.isDark ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </Container>
      </AppBar>

      {/* 모바일 「더보기」 시트: 하단 탭에 없는 화면 + Q&A */}
      <Drawer
        anchor="bottom"
        open={nav_open}
        onClose={() => setNavOpen(false)}
        PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, pb: 'env(safe-area-inset-bottom)' } }}
      >
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mt: 1, mb: 0.5 }} />
        <List sx={{ py: 1 }}>
          {PAGE_MAP.filter((item) => !BOTTOM_NAV_PAGES.includes(item.page)).map((item) => (
            <ListItemButton
              key={item.page}
              selected={item.page === currentPage}
              onClick={() => {
                onPageChange(item.page);
                setNavOpen(false);
              }}
              sx={{ minHeight: 52, px: 3 }}
            >
              <ListItemIcon sx={{ minWidth: 40, '& svg': { mr: 0 } }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 16, fontWeight: 500 }} />
            </ListItemButton>
          ))}
          <ListItemButton
            onClick={() => {
              setNavOpen(false);
              setOpenQnA(true);
            }}
            sx={{ minHeight: 52, px: 3 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <ForumIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText primary="Q&A 게시판" primaryTypographyProps={{ fontSize: 16, fontWeight: 500 }} />
          </ListItemButton>
        </List>
        <Divider />
        <Typography variant="caption" sx={{ display: 'block', px: 3, py: 1.5, color: 'text.disabled', fontSize: 11 }}>
          모든 기록은 이 브라우저에만 저장됩니다 · 저장 용량 {storageUsage.usageKB} KB
        </Typography>
      </Drawer>

      {/* 모바일 하단 탭 바 */}
      {is_compact && (
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: (t) => t.zIndex.appBar,
            borderTop: '1px solid',
            borderColor: 'divider',
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation
            showLabels
            value={bottom_value}
            onChange={(_e, value: PageType | 'more') => {
              if (value === 'more') setNavOpen(true);
              else onPageChange(value);
            }}
            sx={{
              height: MOBILE_BAR_HEIGHT,
              bgcolor: 'transparent',
              '& .MuiBottomNavigationAction-root': { minWidth: 0, px: 0.5 },
              '& .MuiBottomNavigationAction-label': { fontSize: 11, mt: 0.25, '&.Mui-selected': { fontSize: 11, fontWeight: 700 } },
            }}
          >
            {BOTTOM_NAV_PAGES.map((page) => {
              const item = PAGE_MAP.find((p) => p.page === page)!;
              return (
                <BottomNavigationAction
                  key={page}
                  value={page}
                  label={BOTTOM_NAV_LABEL[page]}
                  icon={item.icon}
                  sx={{ '& svg': { mr: '0 !important', fontSize: 22 } }}
                />
              );
            })}
            <BottomNavigationAction value="more" label="더보기" icon={<MoreHorizIcon sx={{ fontSize: 22 }} />} />
          </BottomNavigation>
        </Paper>
      )}

      {/* 메인 컨텐츠 영역 */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          pt: { xs: 2, md: 3 },
          // 모바일: 하단 탭 바에 가리지 않게
          pb: is_compact ? 'calc(80px + env(safe-area-inset-bottom))' : 3,
          px: { xs: 2, md: 3 },
          minWidth: 0,
        }}
      >
        {/* 모바일·태블릿: 한 손으로 읽기 좋은 폭(720px)으로 가운데 정렬 */}
        <Container maxWidth="xl" disableGutters sx={is_compact ? { maxWidth: '720px !important' } : undefined}>
          {children}
        </Container>
      </Box>
      
      {/* 심플한 푸터 (모바일은 「더보기」 시트에 저장 안내가 있으므로 숨김) */}
      <Box 
        component="footer" 
        sx={{
          py: 1.5,
          textAlign: 'center',
          color: 'text.secondary',
          position: 'relative',
          display: is_compact ? 'none' : 'flex',
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
        fullScreen={is_phone}
        PaperProps={{
          sx: {
            height: is_phone ? '100%' : '80vh',
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

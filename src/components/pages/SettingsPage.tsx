import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningIcon from '@mui/icons-material/Warning';
import PaletteIcon from '@mui/icons-material/Palette';
import {
  PaletteType,
  PaletteSettings,
  loadPaletteSettings,
  savePaletteSettings,
  PALETTE_STORAGE_KEY,
  getPaletteList,
  getPalette,
} from '../../utils/colorPalette';

// 설정 저장 키
const SETTINGS_STORAGE_KEY = 'timekeeper-settings';

// 프리셋 테마 색상
const THEME_PRESETS = [
  { name: '기본 (검정)', primary: '#000000', accent: '#000000' },
  { name: '초록', primary: '#10b981', accent: '#059669' },
  { name: '보라', primary: '#8b5cf6', accent: '#7c3aed' },
  { name: '빨강', primary: '#ef4444', accent: '#dc2626' },
  { name: '주황', primary: '#f97316', accent: '#ea580c' },
  { name: '청록', primary: '#06b6d4', accent: '#0891b2' },
  { name: '파랑', primary: '#3b82f6', accent: '#2563eb' },
];

// 기본 설정값
const DEFAULT_SETTINGS = {
  themePreset: '기본 (검정)',
  primaryColor: '#000000',
  accentColor: '#000000',
  customColor: '#000000',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  lunchExcludeEnabled: true,
  autoCompleteEnabled: true,
};

// 테마 적용 함수
const applyTheme = (primary_color: string, accent_color: string) => {
  document.documentElement.style.setProperty('--primary-color', primary_color);
  document.documentElement.style.setProperty('--accent-color', accent_color);
};

/**
 * 설정 페이지
 * - 테마 커스터마이징 (RGB 값 직접 입력)
 * - 점심시간 설정
 * - 단축키 설정
 * - 데이터 관리 (내보내기/가져오기)
 * - 초기화 기능
 */
const SettingsPage: React.FC = () => {
  // 설정 상태 (LocalStorage에서 로드)
  const [selected_preset, setSelectedPreset] = useState(DEFAULT_SETTINGS.themePreset);
  const [custom_color, setCustomColor] = useState(DEFAULT_SETTINGS.customColor);
  const [lunch_start, setLunchStart] = useState(DEFAULT_SETTINGS.lunchStart);
  const [lunch_end, setLunchEnd] = useState(DEFAULT_SETTINGS.lunchEnd);
  const [lunch_exclude_enabled, setLunchExcludeEnabled] = useState(DEFAULT_SETTINGS.lunchExcludeEnabled);
  const [auto_complete_enabled, setAutoCompleteEnabled] = useState(DEFAULT_SETTINGS.autoCompleteEnabled);

  // 컬러 팔레트 설정
  const [palette_type, setPaletteType] = useState<PaletteType>('navy-orange');

  // 초기화 확인 모달
  const [reset_dialog_open, setResetDialogOpen] = useState(false);
  const [reset_confirm_text, setResetConfirmText] = useState('');

  // 스낵바
  const [snackbar_open, setSnackbarOpen] = useState(false);
  const [snackbar_message, setSnackbarMessage] = useState('');
  const [snackbar_severity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // 저장된 설정 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        setSelectedPreset(settings.themePreset || DEFAULT_SETTINGS.themePreset);
        setCustomColor(settings.customColor || DEFAULT_SETTINGS.customColor);
        setLunchStart(settings.lunchStart || DEFAULT_SETTINGS.lunchStart);
        setLunchEnd(settings.lunchEnd || DEFAULT_SETTINGS.lunchEnd);
        setLunchExcludeEnabled(settings.lunchExcludeEnabled ?? DEFAULT_SETTINGS.lunchExcludeEnabled);
        setAutoCompleteEnabled(settings.autoCompleteEnabled ?? DEFAULT_SETTINGS.autoCompleteEnabled);
      }
      
      // 컬러 팔레트 설정 로드
      const palette_settings = loadPaletteSettings();
      setPaletteType(palette_settings.type);
    } catch {
      // 무시
    }
  }, []);

  // 팔레트 목록
  const palette_list = getPaletteList();

  // 컬러 팔레트 미리보기 가져오기
  const getCurrentPalettePreview = () => {
    const palette = getPalette({ type: palette_type });
    return palette.slice(0, 8);
  };

  // 컬러 팔레트 변경 핸들러
  const handlePaletteTypeChange = (new_type: PaletteType) => {
    setPaletteType(new_type);
  };

  // 프리셋 변경 시 테마 미리보기
  const handlePresetChange = (preset_name: string) => {
    setSelectedPreset(preset_name);
    const preset = THEME_PRESETS.find(p => p.name === preset_name);
    if (preset) {
      applyTheme(preset.primary, preset.accent);
    }
  };

  // 커스텀 색상 변경 시 테마 미리보기
  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      setSelectedPreset('커스텀');
      applyTheme(color, color);
    }
  };

  // 설정 저장
  const handleSaveSettings = () => {
    const preset = THEME_PRESETS.find(p => p.name === selected_preset);
    const primary_color = preset ? preset.primary : custom_color;
    const accent_color = preset ? preset.accent : custom_color;

    const settings = {
      themePreset: selected_preset,
      primaryColor: primary_color,
      accentColor: accent_color,
      customColor: custom_color,
      lunchStart: lunch_start,
      lunchEnd: lunch_end,
      lunchExcludeEnabled: lunch_exclude_enabled,
      autoCompleteEnabled: auto_complete_enabled,
    };

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    applyTheme(primary_color, accent_color);

    // 컬러 팔레트 설정 저장
    const palette_settings: PaletteSettings = {
      type: palette_type,
    };
    savePaletteSettings(palette_settings);

    setSnackbarMessage('설정이 저장되었습니다.');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  // 기본값 복원
  const handleResetSettings = () => {
    setSelectedPreset(DEFAULT_SETTINGS.themePreset);
    setCustomColor(DEFAULT_SETTINGS.customColor);
    setLunchStart(DEFAULT_SETTINGS.lunchStart);
    setLunchEnd(DEFAULT_SETTINGS.lunchEnd);
    setLunchExcludeEnabled(DEFAULT_SETTINGS.lunchExcludeEnabled);
    setAutoCompleteEnabled(DEFAULT_SETTINGS.autoCompleteEnabled);
    applyTheme(DEFAULT_SETTINGS.primaryColor, DEFAULT_SETTINGS.accentColor);

    // 컬러 팔레트 기본값 복원
    setPaletteType('navy-orange');

    setSnackbarMessage('기본값으로 복원되었습니다.');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  // 모든 데이터 초기화
  const handleResetAllData = () => {
    if (reset_confirm_text !== '초기화') return;

    // 모든 LocalStorage 데이터 삭제
    const keys_to_remove = [
      'timekeeper-storage',
      SETTINGS_STORAGE_KEY,
      'timekeeper-preset-favorites',
      'timekeeper-manual-presets',
      'timekeeper-feedback-posts',
      PALETTE_STORAGE_KEY,
    ];

    keys_to_remove.forEach(key => localStorage.removeItem(key));

    setResetDialogOpen(false);
    setResetConfirmText('');

    // 페이지 새로고침
    window.location.reload();
  };

  // 데이터 내보내기
  const handleExportData = () => {
    // 모든 관련 데이터 수집
    const export_data: Record<string, unknown> = {};

    const keys_to_export = [
      'timekeeper-storage',
      SETTINGS_STORAGE_KEY,
      'timekeeper-preset-favorites',
      'timekeeper-manual-presets',
      'timekeeper-feedback-posts',
      PALETTE_STORAGE_KEY,
    ];

    keys_to_export.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          export_data[key] = JSON.parse(data);
        } catch {
          export_data[key] = data;
        }
      }
    });

    const blob = new Blob([JSON.stringify(export_data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timekeeper-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSnackbarMessage('데이터가 내보내기되었습니다.');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  // 데이터 가져오기
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          // 각 키별로 데이터 복원
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          });

          setSnackbarMessage('데이터를 가져왔습니다. 새로고침합니다.');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);

          setTimeout(() => window.location.reload(), 1500);
        } catch {
          setSnackbarMessage('유효하지 않은 파일입니다.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      };
      reader.readAsText(file);
    }
    // 파일 입력 초기화
    event.target.value = '';
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          bgcolor: '#f8f9fa',
          borderColor: 'var(--border-color, #eaeaea)',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          설정
        </Typography>
        <Typography variant="body2" color="text.secondary">
          앱의 테마, 업무 환경, 데이터를 관리하세요.
        </Typography>
      </Paper>

      {/* 테마 설정 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          테마 커스터마이징
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>테마 프리셋</InputLabel>
              <Select
                value={selected_preset}
                label="테마 프리셋"
                onChange={(e) => setSelectedPreset(e.target.value)}
              >
                {THEME_PRESETS.map((preset) => (
                  <MenuItem key={preset.name} value={preset.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: preset.primary,
                        }}
                      />
                      {preset.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="커스텀 색상 (HEX)"
              value={custom_color}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#000000"
              InputProps={{
                startAdornment: (
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      bgcolor: custom_color,
                      mr: 1,
                      border: '1px solid #eaeaea',
                    }}
                  />
                ),
              }}
            />
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          💡 커스텀 색상은 상단 바 및 주요 버튼에 적용됩니다.
        </Typography>
      </Paper>

      {/* 작업 컬러 팔레트 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PaletteIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            작업 컬러 팔레트
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          타임라인에서 작업별로 표시되는 색상 스타일을 선택하세요.
        </Typography>

        {/* 팔레트 선택 그리드 */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
          gap: 2,
          mb: 3 
        }}>
          {palette_list.map((palette) => (
            <Box
              key={palette.type}
              onClick={() => handlePaletteTypeChange(palette.type)}
              sx={{
                p: 2,
                borderRadius: 2,
                border: palette_type === palette.type ? '2px solid #000' : '1px solid #eaeaea',
                cursor: 'pointer',
                transition: 'all 0.2s',
                bgcolor: palette_type === palette.type ? '#f5f5f5' : 'transparent',
                '&:hover': {
                  borderColor: '#999',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {/* 팔레트 이름 */}
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                {palette.name}
              </Typography>
              
              {/* 색상 미리보기 */}
              <Box sx={{ display: 'flex', gap: 0.25 }}>
                {palette.colors.slice(0, 5).map((color, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      height: 24,
                      bgcolor: color,
                      borderRadius: idx === 0 ? '4px 0 0 4px' : idx === 4 ? '0 4px 4px 0' : 0,
                    }}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        {/* 선택된 팔레트 미리보기 */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            선택된 팔레트 미리보기
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {getCurrentPalettePreview().map((color, index) => (
              <Box
                key={index}
                sx={{
                  width: 36,
                  height: 24,
                  borderRadius: 0.5,
                  bgcolor: color,
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              />
            ))}
            <Chip label="..." size="small" sx={{ height: 24 }} />
          </Box>
        </Box>
      </Paper>

      {/* 업무 환경 설정 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          업무 환경
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="점심시간 시작"
              type="time"
              value={lunch_start}
              onChange={(e) => setLunchStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="점심시간 종료"
              type="time"
              value={lunch_end}
              onChange={(e) => setLunchEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={lunch_exclude_enabled}
                  onChange={(e) => setLunchExcludeEnabled(e.target.checked)}
                />
              }
              label="점심시간 소요 시간에서 제외"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
              활성화 시 작업 소요 시간 계산에서 점심시간이 자동으로 제외됩니다.
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={auto_complete_enabled}
                  onChange={(e) => setAutoCompleteEnabled(e.target.checked)}
                />
              }
              label="작업명 자동 완성 활성화"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          ⌨️ 단축키
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
          {[
            { key: 'F8', desc: '새 작업 추가 팝업', category: '작업' },
            { key: 'Enter', desc: '타이머 시작 (입력창 포커스 시)', category: '작업' },
            { key: 'Alt + N', desc: '입력창 포커스', category: '네비게이션' },
            { key: 'Alt + S', desc: '타이머 일시정지/재개', category: '작업' },
            { key: 'Alt + 1', desc: '일간 타이머 페이지', category: '네비게이션' },
            { key: 'Alt + 2', desc: '주간 일정 페이지', category: '네비게이션' },
            { key: 'Alt + T', desc: '오늘로 이동', category: '네비게이션' },
          ].map((shortcut) => (
            <Box
              key={shortcut.key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1,
                borderRadius: 1,
                bgcolor: '#f5f5f5',
                '&:hover': { bgcolor: '#efefef' },
              }}
            >
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  bgcolor: '#e0e0e0',
                  borderRadius: 0.5,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  minWidth: 70,
                  textAlign: 'center',
                }}
              >
                {shortcut.key}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {shortcut.desc}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          💡 커스텀 단축키 설정 기능은 향후 업데이트에서 제공될 예정입니다.
        </Typography>
      </Paper>

      {/* 데이터 관리 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          데이터 관리
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <Button variant="outlined" onClick={handleExportData}>
            데이터 내보내기 (JSON)
          </Button>
          <Button variant="outlined" component="label">
            데이터 가져오기
            <input type="file" accept=".json" hidden onChange={handleImportData} />
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
          ⚠️ 데이터 가져오기 시 기존 데이터가 덮어씌워집니다.
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* 초기화 */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'error.main' }}>
            위험 영역
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => setResetDialogOpen(true)}
          >
            모든 데이터 초기화
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            모든 작업 기록, 설정, 프리셋, 게시글이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </Typography>
        </Box>
      </Paper>

      {/* 저장 버튼 */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<RestoreIcon />}
          onClick={handleResetSettings}
        >
          기본값 복원
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
          sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
        >
          설정 저장
        </Button>
      </Box>

      {/* 초기화 확인 모달 */}
      <Dialog open={reset_dialog_open} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningIcon />
          모든 데이터 초기화
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            이 작업은 되돌릴 수 없습니다!
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            다음 데이터가 모두 삭제됩니다:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>모든 작업 기록 (타이머 로그)</li>
            <li>설정 (테마, 점심시간 등)</li>
            <li>프리셋 (즐겨찾기, 수동 프리셋)</li>
            <li>건의사항 게시글</li>
          </Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            계속하려면 <strong>"초기화"</strong>를 입력하세요:
          </Typography>
          <TextField
            fullWidth
            value={reset_confirm_text}
            onChange={(e) => setResetConfirmText(e.target.value)}
            placeholder="초기화"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setResetDialogOpen(false);
            setResetConfirmText('');
          }}>
            취소
          </Button>
          <Button
            onClick={handleResetAllData}
            color="error"
            variant="contained"
            disabled={reset_confirm_text !== '초기화'}
          >
            초기화 실행
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar_open}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar_severity} onClose={() => setSnackbarOpen(false)}>
          {snackbar_message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage;

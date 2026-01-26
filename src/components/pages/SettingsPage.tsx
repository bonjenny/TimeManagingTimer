import React, { useState } from 'react';
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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';

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

/**
 * 설정 페이지
 * - 테마 커스터마이징 (RGB 값 직접 입력)
 * - 점심시간 설정
 * - 단축키 설정
 * - 데이터 관리 (내보내기/가져오기)
 */
const SettingsPage: React.FC = () => {
  const [selected_preset, setSelectedPreset] = useState('기본 (검정)');
  const [custom_color, setCustomColor] = useState('#000000');
  const [lunch_start, setLunchStart] = useState('12:00');
  const [lunch_end, setLunchEnd] = useState('13:00');
  const [auto_complete_enabled, setAutoCompleteEnabled] = useState(true);

  const handleSaveSettings = () => {
    // TODO: 설정 저장 로직 (localStorage 또는 Zustand store)
    console.log('Settings saved:', {
      theme: selected_preset,
      customColor: custom_color,
      lunchTime: { start: lunch_start, end: lunch_end },
      autoComplete: auto_complete_enabled,
    });
  };

  const handleResetSettings = () => {
    setSelectedPreset('기본 (검정)');
    setCustomColor('#000000');
    setLunchStart('12:00');
    setLunchEnd('13:00');
    setAutoCompleteEnabled(true);
  };

  const handleExportData = () => {
    // localStorage에서 데이터 가져오기
    const data = localStorage.getItem('timekeeper-storage');
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timekeeper-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          JSON.parse(content); // 유효성 검사
          localStorage.setItem('timekeeper-storage', content);
          window.location.reload(); // 새로고침하여 데이터 반영
        } catch {
          alert('유효하지 않은 파일입니다.');
        }
      };
      reader.readAsText(file);
    }
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
                  checked={auto_complete_enabled}
                  onChange={(e) => setAutoCompleteEnabled(e.target.checked)}
                />
              }
              label="작업명 자동 완성 활성화"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          단축키
        </Typography>
        <Box sx={{ color: 'text.secondary' }}>
          <Typography variant="body2">• F8: 새 작업 추가</Typography>
          <Typography variant="body2">• Enter: 타이머 시작 (입력창 포커스 시)</Typography>
        </Box>
      </Paper>

      {/* 데이터 관리 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          데이터 관리
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={handleExportData}>
            데이터 내보내기 (JSON)
          </Button>
          <Button variant="outlined" component="label">
            데이터 가져오기
            <input type="file" accept=".json" hidden onChange={handleImportData} />
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          ⚠️ 데이터 가져오기 시 기존 데이터가 덮어씌워집니다.
        </Typography>
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
    </Box>
  );
};

export default SettingsPage;

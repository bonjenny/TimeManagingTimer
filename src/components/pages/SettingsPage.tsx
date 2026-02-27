import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Grid,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningIcon from '@mui/icons-material/Warning';
import PaletteIcon from '@mui/icons-material/Palette';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import RestoreIcon from '@mui/icons-material/Restore';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTimerStore } from '../../store/useTimerStore';
import { useCategoryStore, DEFAULT_CATEGORIES } from '../../store/useCategoryStore';
import { useStatusStore, DEFAULT_STATUSES, Status } from '../../store/useStatusStore';
import {
  PaletteType,
  PaletteSettings,
  loadPaletteSettings,
  savePaletteSettings,
  PALETTE_STORAGE_KEY,
  getPaletteList,
  getPalette,
  getAdjustedPalette,
  getAdjustedColor,
  generateToneOnTonePalette,
  getPaletteThemeColors,
} from '../../utils/colorPalette';
import { applyPaletteHighlight } from '../../styles/tokens';
import {
  useDeployCalendarStore,
  DEPLOY_CALENDAR_WEEKS_MIN,
  DEPLOY_CALENDAR_WEEKS_MAX,
} from '../../store/useDeployCalendarStore';
import {
  getItem,
  setItem as setStorageItem,
  getAllItems,
  batchSetItems,
  clearAll,
} from '../../utils/storage';

// 설정 저장 키
const SETTINGS_STORAGE_KEY = 'timekeeper-settings';

// Sortable Chip 컴포넌트 (카테고리용)
interface SortableCategoryChipProps {
  id: string;
  onDelete: () => void;
}

const SortableCategoryChip: React.FC<SortableCategoryChipProps> = ({ id, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Chip
      ref={setNodeRef}
      style={style}
      icon={<DragIndicatorIcon sx={{ fontSize: '1rem !important', color: 'text.secondary', cursor: 'grab' }} {...listeners} {...attributes} />}
      label={id}
      onDelete={onDelete}
      variant="outlined"
      sx={{ 
        fontSize: '0.85rem',
        bgcolor: isDragging ? 'action.selected' : 'transparent',
        boxShadow: isDragging ? 2 : 0,
      }}
    />
  );
};

// Sortable Chip 컴포넌트 (진행상태용)
interface SortableStatusChipProps {
  id: string;
  label: string;
  onDelete?: () => void;
}

const SortableStatusChip: React.FC<SortableStatusChipProps> = ({ id, label, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Chip
      ref={setNodeRef}
      style={style}
      icon={<DragIndicatorIcon sx={{ fontSize: '1rem !important', color: 'text.secondary', cursor: 'grab' }} {...listeners} {...attributes} />}
      label={label}
      onDelete={onDelete}
      variant="outlined"
      sx={{ 
        fontSize: '0.85rem',
        bgcolor: isDragging ? 'action.selected' : 'transparent',
        boxShadow: isDragging ? 2 : 0,
      }}
    />
  );
};

// 화면 크기 옵션
export const SCREEN_SCALE_OPTIONS = [
  { value: 0.5, label: '아주 작게 (50%)' },
  { value: 0.8, label: '작게 (80%)' },
  { value: 0.9, label: '약간 작게 (90%)' },
  { value: 1.0, label: '보통 (100%)' },
  { value: 1.1, label: '약간 크게 (110%)' },
  { value: 1.2, label: '크게 (120%)' },
];

// 슬라이더 마크 (퍼센트 표시)
const SCREEN_SCALE_MARKS = SCREEN_SCALE_OPTIONS.map((opt) => ({
  value: opt.value * 100,
  label: `${Math.round(opt.value * 100)}%`,
}));

// 기본 설정값
const DEFAULT_SETTINGS = {
  lunchStart: '12:00',
  lunchEnd: '13:00',
  lunchExcludeEnabled: true,
  autoCompleteEnabled: true,
  presetDailyGroup: false,
  screenScale: 1.0,
};

const SettingsPage: React.FC = () => {
  const { setThemeConfig, themeConfig } = useTimerStore();
  const { categories, addCategory, removeCategory, reorderCategories, resetToDefault: resetCategories } = useCategoryStore();
  const { statuses, addStatus, removeStatus, reorderStatuses, resetToDefault: resetStatuses } = useStatusStore();
  const { weeks_to_show, setWeeksToShow } = useDeployCalendarStore();
  
  // 카테고리 관리 상태
  const [newCategory, setNewCategory] = useState('');
  
  // 진행상태 관리 상태
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusValue, setNewStatusValue] = useState('');
  
  // 설정 상태
  const [lunch_start, setLunchStart] = useState(DEFAULT_SETTINGS.lunchStart);
  const [lunch_end, setLunchEnd] = useState(DEFAULT_SETTINGS.lunchEnd);
  const [lunch_exclude_enabled, setLunchExcludeEnabled] = useState(DEFAULT_SETTINGS.lunchExcludeEnabled);
  const [auto_complete_enabled, setAutoCompleteEnabled] = useState(DEFAULT_SETTINGS.autoCompleteEnabled);
  const [preset_daily_group, setPresetDailyGroup] = useState(DEFAULT_SETTINGS.presetDailyGroup);
  const [screen_scale, setScreenScale] = useState(DEFAULT_SETTINGS.screenScale);

  // 컬러 팔레트 설정
  const [palette_type, setPaletteType] = useState<PaletteType>('navy-orange');
  
  // 커스텀 팔레트 상태
  const [custom_colors, setCustomColors] = useState<string[]>([]);
  const [custom_base_color, setCustomBaseColor] = useState('#3b82f6');
  const [editing_color_index, setEditingColorIndex] = useState<number | null>(null);
  const [temp_color, setTempColor] = useState('');

  // 초기화 확인 모달
  const [reset_dialog_open, setResetDialogOpen] = useState(false);
  const [reset_confirm_text, setResetConfirmText] = useState('');

  // 스낵바
  const [snackbar_open, setSnackbarOpen] = useState(false);
  const [snackbar_message, setSnackbarMessage] = useState('');
  const [snackbar_severity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // 초기 로드 여부 감지
  const isInitialMount = React.useRef(true);

  // 저장된 설정 로드
  useEffect(() => {
    try {
      const saved = getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        setLunchStart(settings.lunchStart || DEFAULT_SETTINGS.lunchStart);
        setLunchEnd(settings.lunchEnd || DEFAULT_SETTINGS.lunchEnd);
        setLunchExcludeEnabled(settings.lunchExcludeEnabled ?? DEFAULT_SETTINGS.lunchExcludeEnabled);
        setAutoCompleteEnabled(settings.autoCompleteEnabled ?? DEFAULT_SETTINGS.autoCompleteEnabled);
        setPresetDailyGroup(settings.presetDailyGroup ?? DEFAULT_SETTINGS.presetDailyGroup);
        setScreenScale(settings.screenScale ?? DEFAULT_SETTINGS.screenScale);
      }
      
      // 컬러 팔레트 설정 로드
      const palette_settings = loadPaletteSettings();
      setPaletteType(palette_settings.type);
      
      if (palette_settings.custom_colors && palette_settings.custom_colors.length > 0) {
        setCustomColors(palette_settings.custom_colors);
      }
      if (palette_settings.custom_base_color) {
        setCustomBaseColor(palette_settings.custom_base_color);
      }
    } catch {
      // 무시
    }
  }, []);

  // 설정 자동 저장 및 적용
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // 일반 설정 저장
    const settings = {
      lunchStart: lunch_start,
      lunchEnd: lunch_end,
      lunchExcludeEnabled: lunch_exclude_enabled,
      autoCompleteEnabled: auto_complete_enabled,
      presetDailyGroup: preset_daily_group,
      screenScale: screen_scale,
    };
    setStorageItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    
    // 화면 크기 즉시 적용
    document.documentElement.style.zoom = String(screen_scale);
    
    // 컬러 팔레트 설정 저장
    const palette_settings: PaletteSettings = {
      type: palette_type,
      ...(palette_type === 'custom' && {
        custom_colors: custom_colors,
        custom_base_color: custom_base_color,
      }),
    };
    savePaletteSettings(palette_settings);
    
    // 앱 테마 색상 적용 (Primary, Accent)
    const { primary, accent } = getPaletteThemeColors(palette_settings);
    setThemeConfig({
      primaryColor: primary,
      accentColor: accent,
    });

    // CSS 변수에 팔레트 색상 적용 (간트 차트용)
    const palette = getPalette(palette_settings);
    applyPaletteHighlight(palette);

  }, [
    lunch_start, 
    lunch_end, 
    lunch_exclude_enabled, 
    auto_complete_enabled, 
    preset_daily_group,
    screen_scale,
    palette_type, 
    custom_colors, 
    custom_base_color,
    setThemeConfig
  ]);

  // 팔레트 목록
  const palette_list = getPaletteList();

  // 다크모드 여부
  const isDark = themeConfig.isDark;

  // 컬러 팔레트 미리보기 가져오기 (다크모드 보정 적용)
  const getCurrentPalettePreview = () => {
    if (palette_type === 'custom' && custom_colors.length > 0) {
      const colors = custom_colors.slice(0, 8);
      return isDark ? colors.map(c => getAdjustedColor(c, true, 45)) : colors;
    }
    const palette = getAdjustedPalette({ type: palette_type }, isDark, 45);
    return palette.slice(0, 8);
  };
  
  // 커스텀 팔레트 생성 (톤온톤 기반)
  const handleGenerateCustomPalette = () => {
    const generated = generateToneOnTonePalette(custom_base_color);
    setCustomColors(generated.slice(0, 10)); // 10개 색상만 사용
    setPaletteType('custom');
  };
  
  // 커스텀 색상 수정
  const handleEditColor = (index: number) => {
    setEditingColorIndex(index);
    setTempColor(custom_colors[index]);
  };
  
  // 커스텀 색상 저장
  const handleSaveColor = () => {
    if (editing_color_index !== null && temp_color) {
      const new_colors = [...custom_colors];
      new_colors[editing_color_index] = temp_color;
      setCustomColors(new_colors);
      setEditingColorIndex(null);
      setTempColor('');
    }
  };
  
  // 커스텀 색상 추가
  const handleAddCustomColor = () => {
    if (custom_colors.length < 15) {
      setCustomColors([...custom_colors, '#888888']);
    }
  };
  
  // 커스텀 색상 삭제
  const handleRemoveCustomColor = (index: number) => {
    const new_colors = custom_colors.filter((_, i) => i !== index);
    setCustomColors(new_colors);
  };

  // 컬러 팔레트 변경 핸들러
  const handlePaletteTypeChange = (new_type: PaletteType) => {
    setPaletteType(new_type);
  };

  // dnd-kit 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 카테고리 드래그앤드롭 핸들러
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = categories.indexOf(active.id as string);
      const newIndex = categories.indexOf(over.id as string);
      reorderCategories(arrayMove(categories, oldIndex, newIndex));
    }
  };

  // 진행상태 드래그앤드롭 핸들러
  const handleStatusDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = statuses.findIndex(s => s.value === active.id);
      const newIndex = statuses.findIndex(s => s.value === over.id);
      reorderStatuses(arrayMove(statuses, oldIndex, newIndex));
    }
  };

  // 기본값 복원
  const handleResetSettings = () => {
    setLunchStart(DEFAULT_SETTINGS.lunchStart);
    setLunchEnd(DEFAULT_SETTINGS.lunchEnd);
    setLunchExcludeEnabled(DEFAULT_SETTINGS.lunchExcludeEnabled);
    setAutoCompleteEnabled(DEFAULT_SETTINGS.autoCompleteEnabled);
    setPresetDailyGroup(DEFAULT_SETTINGS.presetDailyGroup);
    setScreenScale(DEFAULT_SETTINGS.screenScale);
    
    // 컬러 팔레트 기본값 복원
    setPaletteType('navy-orange');
    setCustomColors([]);
    setCustomBaseColor('#3b82f6');

    setSnackbarMessage('기본값으로 복원되었습니다.');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleResetAllData = async () => {
    if (reset_confirm_text !== '초기화') return;

    await clearAll();

    setResetDialogOpen(false);
    setResetConfirmText('');

    window.location.reload();
  };

  const handleExportData = () => {
    const all_items = getAllItems();
    const export_data: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(all_items)) {
      try {
        export_data[key] = JSON.parse(value);
      } catch {
        export_data[key] = value;
      }
    }

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

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          const items: Record<string, string> = {};
          Object.entries(data).forEach(([key, value]) => {
            items[key] = typeof value === 'string' ? value : JSON.stringify(value);
          });
          await batchSetItems(items);

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
    event.target.value = '';
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          bgcolor: 'var(--card-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          설정
        </Typography>
        <Typography variant="body2" color="text.secondary">
          앱의 테마, 업무 환경, 데이터를 관리하세요.
        </Typography>
      </Paper>

      {/* 화면 크기 설정 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ZoomInIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            화면 크기
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          화면의 전체적인 크기를 조절합니다. 설정은 자동으로 저장됩니다.
        </Typography>

        {/* 프리셋 버튼 */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {SCREEN_SCALE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={screen_scale === opt.value ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setScreenScale(opt.value)}
              sx={{ minWidth: 80, fontSize: '0.8rem' }}
            >
              {opt.label}
            </Button>
          ))}
        </Box>

        {/* 화면 크기 슬라이더 */}
        <Box sx={{ px: 2 }}>
          <Slider
            value={screen_scale * 100}
            onChange={(_, new_value) => {
              if (typeof new_value === 'number') {
                setScreenScale(new_value / 100);
              }
            }}
            min={70}
            max={150}
            step={5}
            marks={SCREEN_SCALE_MARKS}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}%`}
            aria-label="화면 크기"
            sx={{
              '& .MuiSlider-markLabel': {
                fontSize: '0.75rem',
                color: 'text.secondary',
              },
              '& .MuiSlider-valueLabel': {
                fontSize: '0.8rem',
              },
            }}
          />
        </Box>

        {/* 현재 설정 표시 */}
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              현재 화면 크기:
            </Typography>
            <Chip 
              label={`${Math.round(screen_scale * 100)}%`} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </Box>
          {screen_scale !== 1.0 && (
            <Button
              size="small"
              startIcon={<RestoreIcon />}
              onClick={() => setScreenScale(1.0)}
              sx={{ fontSize: '0.75rem' }}
            >
              100%로 되돌리기
            </Button>
          )}
        </Box>
      </Paper>

      {/* 배포 캘린더 표시 주 수 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CalendarMonthIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            배포 캘린더
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          배포 캘린더에서 한 번에 표시할 주 수를 선택합니다. 설정은 자동으로 저장됩니다.
        </Typography>

        <ToggleButtonGroup
          value={weeks_to_show}
          exclusive
          onChange={(_, new_value: number | null) => {
            if (new_value !== null && new_value >= DEPLOY_CALENDAR_WEEKS_MIN && new_value <= DEPLOY_CALENDAR_WEEKS_MAX) {
              setWeeksToShow(new_value);
            }
          }}
          aria-label="배포 캘린더 표시 주 수"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            '& .MuiToggleButton-root': {
              minWidth: 64,
              py: 1.5,
              borderRadius: '8px !important',
              border: '1px solid',
              borderColor: 'divider',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderColor: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              },
            },
          }}
        >
          {Array.from(
            { length: DEPLOY_CALENDAR_WEEKS_MAX - DEPLOY_CALENDAR_WEEKS_MIN + 1 },
            (_, i) => DEPLOY_CALENDAR_WEEKS_MIN + i
          ).map((n) => (
            <ToggleButton key={n} value={n}>
              {n}주
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            현재 표시:
          </Typography>
          <Chip
            label={`${weeks_to_show}주`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* 작업 컬러 팔레트 & 테마 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PaletteIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            테마 및 컬러 팔레트
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          작업 컬러 팔레트를 선택하면 앱의 주요 테마 색상(버튼, 상단 바 등)도 함께 변경됩니다.
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
                border: palette_type === palette.type ? '2px solid' : '1px solid',
                borderColor: palette_type === palette.type ? 'primary.main' : 'divider',
                cursor: 'pointer',
                transition: 'all 0.2s',
                bgcolor: palette_type === palette.type ? 'action.selected' : 'transparent',
                '&:hover': {
                  borderColor: 'text.secondary',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {/* 팔레트 이름 */}
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'var(--text-primary)' }}>
                {palette.name}
              </Typography>
              
              {/* 색상 미리보기 (다크모드 보정 적용) */}
              <Box sx={{ display: 'flex', gap: 0.25, mb: 1 }}>
                {palette.colors.slice(0, 5).map((color, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      height: 24,
                      bgcolor: getAdjustedColor(color, isDark, 45),
                      borderRadius: idx === 0 ? '4px 0 0 4px' : idx === 4 ? '0 4px 4px 0' : 0,
                    }}
                  />
                ))}
              </Box>

              {/* 대표 색상 표시 (다크모드 보정 적용) */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: getAdjustedColor(palette.primary, isDark, 45) }} />
                <Typography variant="caption" color="text.secondary">Primary</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* 사용자 커스텀 팔레트 */}
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon fontSize="small" />
            사용자 커스텀 팔레트
          </Typography>
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            기본 색상을 선택하면 톤온톤 팔레트가 자동 생성됩니다. 생성된 각 색상을 클릭하여 수정할 수 있습니다.
          </Typography>
          
          {/* 기본 색상 선택 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              size="small"
              label="기본 색상"
              type="color"
              value={custom_base_color}
              onChange={(e) => setCustomBaseColor(e.target.value)}
              sx={{ width: 100 }}
              InputProps={{
                sx: { height: 40 },
              }}
            />
            <TextField
              size="small"
              value={custom_base_color}
              onChange={(e) => setCustomBaseColor(e.target.value)}
              placeholder="#3b82f6"
              sx={{ width: 120 }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleGenerateCustomPalette}
              sx={{ whiteSpace: 'nowrap' }}
            >
              팔레트 생성
            </Button>
          </Box>
          
          {/* 커스텀 색상 편집 */}
          {custom_colors.length > 0 && (
            <Box
              onClick={() => setPaletteType('custom')}
              sx={{
                p: 2,
                borderRadius: 2,
                border: palette_type === 'custom' ? '2px solid' : '1px solid',
                borderColor: palette_type === 'custom' ? 'primary.main' : 'var(--border-color)',
                bgcolor: palette_type === 'custom' ? 'var(--bg-selected)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                내 커스텀 팔레트
                {palette_type === 'custom' && (
                  <Chip label="선택됨" size="small" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />
                )}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                {custom_colors.map((color, index) => (
                  <Box
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditColor(index);
                    }}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      bgcolor: getAdjustedColor(color, isDark, 45),
                      border: editing_color_index === index ? '2px solid' : '1px solid',
                      borderColor: editing_color_index === index ? 'text.primary' : 'divider',
                      cursor: 'pointer',
                      position: 'relative',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        zIndex: 1,
                      },
                      '&:hover::after': {
                        content: '"✎"',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '12px',
                        color: '#fff',
                        textShadow: '0 0 2px #000',
                      },
                    }}
                  />
                ))}
                
                {/* 색상 추가 버튼 */}
                {custom_colors.length < 15 && (
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddCustomColor();
                    }}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      border: '1px dashed',
                      borderColor: 'text.secondary',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'var(--bg-hover)',
                      },
                    }}
                  >
                    <AddIcon fontSize="small" sx={{ color: 'var(--text-secondary)' }} />
                  </Box>
                )}
              </Box>
              
              {/* 색상 편집 입력 */}
              {editing_color_index !== null && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    size="small"
                    type="color"
                    value={temp_color}
                    onChange={(e) => setTempColor(e.target.value)}
                    sx={{ width: 60 }}
                    InputProps={{ sx: { height: 32 } }}
                  />
                  <TextField
                    size="small"
                    value={temp_color}
                    onChange={(e) => setTempColor(e.target.value)}
                    placeholder="#000000"
                    sx={{ width: 100 }}
                    InputProps={{ sx: { height: 32 } }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveColor}
                    sx={{ minWidth: 48, height: 32 }}
                  >
                    확인
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleRemoveCustomColor(editing_color_index)}
                    color="error"
                    sx={{ minWidth: 48, height: 32 }}
                  >
                    삭제
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditingColorIndex(null);
                      setTempColor('');
                    }}
                    sx={{ minWidth: 48, height: 32 }}
                  >
                    취소
                  </Button>
                </Box>
              )}
            </Box>
          )}
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
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            ))}
            <Chip label="..." size="small" sx={{ height: 24 }} />
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Button
          variant="text"
          size="small"
          startIcon={<RestoreIcon />}
          onClick={() => {
            setPaletteType('navy-orange');
            setCustomColors([]);
            setCustomBaseColor('#3b82f6');
            setSnackbarMessage('컬러 팔레트가 기본값(네이비 & 오렌지)으로 초기화되었습니다.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
          }}
          color="warning"
        >
          기본값으로 초기화
        </Button>
      </Paper>

      {/* 업무 환경 설정 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          업무 환경
        </Typography>

        <Grid container spacing={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="점심시간 시작"
                value={(() => {
                  const [h, m] = lunch_start.split(':').map(Number);
                  const d = new Date();
                  d.setHours(h, m, 0, 0);
                  return d;
                })()}
                onChange={(newValue) => {
                  if (newValue) {
                    const h = String(newValue.getHours()).padStart(2, '0');
                    const m = String(newValue.getMinutes()).padStart(2, '0');
                    setLunchStart(`${h}:${m}`);
                  }
                }}
                slotProps={{
                  textField: { size: 'small', fullWidth: true }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="점심시간 종료"
                value={(() => {
                  const [h, m] = lunch_end.split(':').map(Number);
                  const d = new Date();
                  d.setHours(h, m, 0, 0);
                  return d;
                })()}
                onChange={(newValue) => {
                  if (newValue) {
                    const h = String(newValue.getHours()).padStart(2, '0');
                    const m = String(newValue.getMinutes()).padStart(2, '0');
                    setLunchEnd(`${h}:${m}`);
                  }
                }}
                slotProps={{
                  textField: { size: 'small', fullWidth: true }
                }}
              />
            </Grid>
          </LocalizationProvider>
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
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={preset_daily_group}
                  onChange={(e) => setPresetDailyGroup(e.target.checked)}
                />
              }
              label="프리셋 작업 일별 고유 관리"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
              활성화 시 프리셋으로 시작한 작업의 누적시간이 날짜별로 분리됩니다. 제목은 변경되지 않습니다.
            </Typography>
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
                bgcolor: 'var(--bg-hover)',
                '&:hover': { bgcolor: 'var(--bg-selected)' },
              }}
            >
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  bgcolor: 'action.disabledBackground',
                  borderRadius: 0.5,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                fontWeight: 600,
                minWidth: 70,
                textAlign: 'center',
                color: 'var(--text-primary)'
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

      {/* 카테고리 관리 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          카테고리 관리
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          업무 기록에 사용할 카테고리를 관리합니다. 드래그하여 순서를 변경할 수 있습니다.
        </Typography>
        
        {/* 카테고리 목록 (드래그앤드롭) */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCategoryDragEnd}
        >
          <SortableContext items={categories} strategy={rectSortingStrategy}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3, minHeight: 40 }}>
              {categories.map((category) => (
                <SortableCategoryChip
                  key={category}
                  id={category}
                  onDelete={() => removeCategory(category)}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
        
        {/* 새 카테고리 추가 */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
          <TextField
            size="small"
            placeholder="새 카테고리"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCategory.trim()) {
                addCategory(newCategory.trim());
                setNewCategory('');
              }
            }}
            sx={{ width: 200 }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              if (newCategory.trim()) {
                addCategory(newCategory.trim());
                setNewCategory('');
              }
            }}
            disabled={!newCategory.trim()}
          >
            추가
          </Button>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Button
          variant="text"
          size="small"
          startIcon={<RestoreIcon />}
          onClick={resetCategories}
          color="warning"
        >
          기본값으로 초기화
        </Button>
      </Paper>

      {/* 진행상태 관리 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          진행상태 관리
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          주간일정에서 사용할 진행상태를 관리합니다. 드래그하여 순서를 변경할 수 있습니다.
        </Typography>
        
        {/* 진행상태 목록 (드래그앤드롭) */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleStatusDragEnd}
        >
          <SortableContext items={statuses.map(s => s.value)} strategy={rectSortingStrategy}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3, minHeight: 40 }}>
              {statuses.map((status) => (
                <SortableStatusChip
                  key={status.value}
                  id={status.value}
                  label={status.label}
                  onDelete={statuses.length > 1 ? () => removeStatus(status.value) : undefined}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
        
        {/* 새 진행상태 추가 */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
          <TextField
            size="small"
            placeholder="표시명 (예: 검토중)"
            value={newStatusLabel}
            onChange={(e) => setNewStatusLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newStatusLabel.trim()) {
                const statusValue = newStatusValue.trim() || newStatusLabel.trim().toLowerCase().replace(/\s+/g, '_');
                addStatus({ value: statusValue, label: newStatusLabel.trim() });
                setNewStatusLabel('');
                setNewStatusValue('');
              }
            }}
            sx={{ width: 150 }}
          />
          <TextField
            size="small"
            placeholder="값 (자동생성)"
            value={newStatusValue}
            onChange={(e) => setNewStatusValue(e.target.value)}
            sx={{ width: 150 }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              if (newStatusLabel.trim()) {
                const statusValue = newStatusValue.trim() || newStatusLabel.trim().toLowerCase().replace(/\s+/g, '_');
                addStatus({ value: statusValue, label: newStatusLabel.trim() });
                setNewStatusLabel('');
                setNewStatusValue('');
              }
            }}
            disabled={!newStatusLabel.trim()}
          >
            추가
          </Button>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Button
          variant="text"
          size="small"
          startIcon={<RestoreIcon />}
          onClick={resetStatuses}
          color="warning"
        >
          기본값으로 초기화
        </Button>
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

      {/* 저장 버튼 (삭제됨 - 자동 저장) */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<RestoreIcon />}
          onClick={handleResetSettings}
        >
          기본값 복원
        </Button>
      </Box>

      {/* 초기화 확인 모달 */}
      <Dialog 
        open={reset_dialog_open} 
        onClose={() => setResetDialogOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && reset_confirm_text === '초기화') {
            e.preventDefault();
            handleResetAllData();
          }
        }}
      >
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
            초기화(Enter)
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
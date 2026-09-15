import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDeployCalendarStore } from '../../store/useDeployCalendarStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTimerStore } from '../../store/useTimerStore';
import { loadPaletteSettings, getAdjustedPalette } from '../../utils/colorPalette';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

interface JobColorManagerProps {
  open: boolean;
  onClose: () => void;
  /** 주간일정 등에서 사용 시, 표시할 잡 코드 목록(미제공 시 배포 캘린더 이벤트 기준) */
  jobCodesOverride?: string[];
}

// 테마에 없는 경우 사용할 폴백 팔레트
const FALLBACK_PALETTE = [
  '#b3e5fc', '#c8e6c9', '#fff9c4', '#f8bbd9', '#d1c4e9', '#ffccbc',
  '#b2dfdb', '#dcedc8', '#f5f5f5', '#ffe0b2', '#e1bee7', '#bbdefb',
];

/** 잡 색상 설정 팔레트에 노출할 기본 색상 (파스텔 톤) */
const DEFAULT_JOB_COLORS = [
  '#f8bbd9', // 연한 핑크
  '#fff9c4', // 연한 노랑
  '#c8e6c9', // 민트 그린
  '#b2dfdb', // 시안/청록
  '#b3e5fc', // 스카이 블루
  '#d1c4e9', // 연한 보라
  '#ffccbc', // 연한 오렌지
  '#d7ccc8', // 더스티 로즈/그레이
];

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

const JobColorManager: React.FC<JobColorManagerProps> = ({ open, onClose, jobCodesOverride }) => {
  const { job_colors, setJobColor, getUniqueJobCodes } = useDeployCalendarStore();
  const { getProjectName } = useProjectStore();
  const { themeConfig } = useTimerStore();
  const theme = useTheme();
  const is_phone = useMediaQuery(theme.breakpoints.down('sm'));
  
  // 테마 팔레트에서 색상 목록 (다크모드 보정 적용)
  const color_palette = useMemo(() => {
    const settings = loadPaletteSettings();
    const palette = getAdjustedPalette(settings, themeConfig.isDark, 45);
    return palette.length > 0 ? palette : FALLBACK_PALETTE;
  }, [themeConfig.isDark]);
  
  // 표시할 잡 코드 목록 (override 있으면 사용, 없으면 배포 캘린더 이벤트 기준)
  const job_codes = jobCodesOverride !== undefined ? jobCodesOverride : getUniqueJobCodes();
  
  // 잡 코드의 현재 색상 조회
  const getColor = (job_code: string): string => {
    const found = job_colors.find(jc => jc.job_code === job_code);
    return found?.color || '#e0e0e0';
  };
  
  // 색상 변경 핸들러
  const handleColorChange = (job_code: string, color: string) => {
    setJobColor(job_code, color);
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={is_phone}>
      <DialogTitle
        sx={
          is_phone
            ? { display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, fontSize: 17, borderBottom: '1px solid', borderColor: 'divider' }
            : undefined
        }
      >
        {is_phone && (
          <IconButton aria-label="닫기" onClick={onClose} sx={{ width: 44, height: 44 }}>
            <CloseIcon />
          </IconButton>
        )}
        잡 색상 설정
      </DialogTitle>
      
      <DialogContent sx={is_phone ? { px: 2 } : undefined}>
        {job_codes.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            {jobCodesOverride !== undefined
              ? '등록된 프로젝트가 없습니다. 프로젝트를 추가한 뒤 다시 시도해주세요.'
              : '등록된 이벤트가 없습니다. 먼저 캘린더에 이벤트를 추가해주세요.'}
          </Typography>
        ) : (
          <List sx={{ py: 0 }}>
            {job_codes.map((job_code) => {
              const current_color = getColor(job_code);
              const project_name = getProjectName(job_code);
              
              return (
                <ListItem
                  key={job_code}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1.5,
                    // 폰: 1줄 = 잡 코드/이름 + 직접 입력, 2줄 = 팔레트 전체 폭
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    px: { xs: 0, sm: 2 },
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={job_code}
                    secondary={project_name !== job_code ? project_name : undefined}
                    sx={{ flex: 1, minWidth: 0 }}
                  />

                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      maxWidth: { xs: 'none', sm: 280 },
                      order: { xs: 2, sm: 0 },
                      flexBasis: { xs: '100%', sm: 'auto' },
                    }}
                  >
                    {/* 기본 색상 */}
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        기본 색상
                      </Typography>
                      <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 0.5 }, flexWrap: 'wrap' }}>
                        {DEFAULT_JOB_COLORS.map((color) => (
                          <Box
                            key={color}
                            onClick={() => handleColorChange(job_code, color)}
                            sx={{
                              width: { xs: 30, sm: 24 },
                              height: { xs: 30, sm: 24 },
                              bgcolor: color,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              border: current_color === color ? '2px solid' : '1px solid',
                              borderColor: current_color === color ? 'primary.main' : 'divider',
                              '&:hover': { transform: 'scale(1.1)' },
                              transition: 'transform 0.1s',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                    {/* 테마 색상 */}
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        테마 색상
                      </Typography>
                      <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 0.5 }, flexWrap: 'wrap' }}>
                        {color_palette.map((color) => (
                          <Box
                            key={color}
                            onClick={() => handleColorChange(job_code, color)}
                            sx={{
                              width: { xs: 30, sm: 24 },
                              height: { xs: 30, sm: 24 },
                              bgcolor: color,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              border: current_color === color ? '2px solid' : '1px solid',
                              borderColor: current_color === color ? 'primary.main' : 'divider',
                              '&:hover': { transform: 'scale(1.1)' },
                              transition: 'transform 0.1s',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* 직접 입력 */}
                  <TextField
                    type="color"
                    value={current_color}
                    onChange={(e) => handleColorChange(job_code, e.target.value)}
                    size="small"
                    sx={{
                      width: { xs: 56, sm: 50 },
                      order: { xs: 1, sm: 0 },
                      flexShrink: { xs: 0, sm: 1 },
                      '& input': {
                        padding: '4px',
                        cursor: 'pointer',
                        ...(is_phone && { height: 34 }),
                      },
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      
      <DialogActions
        sx={
          is_phone
            ? { px: 2, pt: 1.5, pb: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid', borderColor: 'divider' }
            : undefined
        }
      >
        <Button onClick={onClose} variant="contained" fullWidth={is_phone} sx={is_phone ? { minHeight: 44 } : undefined}>
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobColorManager;

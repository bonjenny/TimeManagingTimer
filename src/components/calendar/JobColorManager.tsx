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
} from '@mui/material';
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
}

// 테마에 없는 경우 사용할 폴백 팔레트
const FALLBACK_PALETTE = [
  '#b3e5fc', '#c8e6c9', '#fff9c4', '#f8bbd9', '#d1c4e9', '#ffccbc',
  '#b2dfdb', '#dcedc8', '#f5f5f5', '#ffe0b2', '#e1bee7', '#bbdefb',
];

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

const JobColorManager: React.FC<JobColorManagerProps> = ({ open, onClose }) => {
  const { job_colors, setJobColor, getUniqueJobCodes } = useDeployCalendarStore();
  const { getProjectName } = useProjectStore();
  const { themeConfig } = useTimerStore();
  
  // 테마 팔레트에서 색상 목록 (다크모드 보정 적용)
  const color_palette = useMemo(() => {
    const settings = loadPaletteSettings();
    const palette = getAdjustedPalette(settings, themeConfig.isDark, 45);
    return palette.length > 0 ? palette : FALLBACK_PALETTE;
  }, [themeConfig.isDark]);
  
  // 등록된 잡 코드 목록
  const job_codes = getUniqueJobCodes();
  
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>잡 색상 설정</DialogTitle>
      
      <DialogContent>
        {job_codes.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            등록된 이벤트가 없습니다.
            <br />
            먼저 캘린더에 이벤트를 추가해주세요.
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
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={job_code}
                    secondary={project_name !== job_code ? project_name : undefined}
                    sx={{ flex: 1 }}
                  />
                  
                  {/* 색상 선택 팔레트 */}
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 200 }}>
                    {color_palette.map((color) => (
                      <Box
                        key={color}
                        onClick={() => handleColorChange(job_code, color)}
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: color,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          border: current_color === color ? '2px solid #333' : '1px solid #ccc',
                          '&:hover': {
                            transform: 'scale(1.1)',
                          },
                          transition: 'transform 0.1s',
                        }}
                      />
                    ))}
                  </Box>
                  
                  {/* 직접 입력 */}
                  <TextField
                    type="color"
                    value={current_color}
                    onChange={(e) => handleColorChange(job_code, e.target.value)}
                    size="small"
                    sx={{
                      width: 50,
                      '& input': {
                        padding: '4px',
                        cursor: 'pointer',
                      },
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobColorManager;

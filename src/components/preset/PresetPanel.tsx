import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  Tooltip,
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import AddIcon from '@mui/icons-material/Add';
import { useTimerStore } from '../../store/useTimerStore';

// 프리셋 데이터 타입
interface PresetItem {
  id: string;
  title: string;
  boardNo?: string;
  category?: string;
  is_favorite: boolean;
}

const PresetPanel: React.FC = () => {
  const { startTimer, getRecentTitles, logs } = useTimerStore();

  // 최근 사용한 작업들에서 프리셋 생성 (최근 30일, 고유 제목)
  const recent_titles = getRecentTitles();

  // 로그에서 프리셋 데이터 추출 (제목 기준 그룹화)
  const generatePresets = (): PresetItem[] => {
    const preset_map = new Map<string, PresetItem>();

    // 최근 로그에서 고유 작업 추출
    logs.forEach((log) => {
      if (!preset_map.has(log.title)) {
        preset_map.set(log.title, {
          id: log.id,
          title: log.title,
          boardNo: log.boardNo,
          category: log.category,
          is_favorite: false, // TODO: localStorage에서 즐겨찾기 상태 로드
        });
      }
    });

    // 최신순 정렬 (recent_titles 순서 유지)
    const sorted_presets: PresetItem[] = [];
    recent_titles.forEach((title) => {
      const preset = preset_map.get(title);
      if (preset) {
        sorted_presets.push(preset);
      }
    });

    return sorted_presets.slice(0, 10); // 최대 10개
  };

  const presets = generatePresets();

  const handleStartPreset = (preset: PresetItem) => {
    startTimer(preset.title, preset.boardNo, preset.category);
  };

  const handleToggleFavorite = (preset_id: string) => {
    // TODO: 즐겨찾기 토글 구현 (localStorage 저장)
    console.log('Toggle favorite:', preset_id);
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'var(--card-bg, #ffffff)',
        borderColor: 'var(--border-color, #eaeaea)',
      }}
    >
      {/* 헤더 */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid var(--border-color, #eaeaea)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          작업 프리셋
        </Typography>
        <Tooltip title="새 프리셋 추가">
          <IconButton size="small">
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 프리셋 목록 */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {presets.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              아직 프리셋이 없습니다.
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              작업을 기록하면 자동으로 프리셋에 추가됩니다.
            </Typography>
          </Box>
        ) : (
          <List disablePadding dense>
            {presets.map((preset, index) => (
              <React.Fragment key={preset.id}>
                {index > 0 && <Divider />}
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleToggleFavorite(preset.id)}
                      >
                        {preset.is_favorite ? (
                          <StarIcon fontSize="small" sx={{ color: '#ffc107' }} />
                        ) : (
                          <StarBorderIcon fontSize="small" />
                        )}
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        color="primary"
                        onClick={() => handleStartPreset(preset)}
                      >
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemButton
                    onClick={() => handleStartPreset(preset)}
                    sx={{ py: 1.5, pr: 10 }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {preset.title}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                          {preset.boardNo && (
                            <Chip
                              label={`#${preset.boardNo}`}
                              size="small"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          )}
                          {preset.category && (
                            <Chip
                              label={preset.category}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                bgcolor: '#f5f5f5',
                              }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* 푸터 - 빠른 액션 */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid var(--border-color, #eaeaea)',
          bgcolor: '#fafafa',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          💡 프리셋을 클릭하면 바로 타이머가 시작됩니다.
        </Typography>
      </Box>
    </Paper>
  );
};

export default PresetPanel;

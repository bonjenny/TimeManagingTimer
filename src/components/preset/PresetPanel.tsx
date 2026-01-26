import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Chip,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTimerStore } from '../../store/useTimerStore';

// 프리셋 데이터 타입
interface PresetItem {
  id: string;
  title: string;
  boardNo?: string;
  category?: string;
  color?: string;
  is_favorite: boolean;
  is_manual: boolean; // 수동 추가 여부
}

// 카테고리 목록
const CATEGORIES = ['분석', '개발', '개발자테스트', '테스트오류수정', '센터오류수정', '환경세팅', '회의', '기타'];

// 프리셋 색상 옵션
const PRESET_COLORS = [
  { name: '기본', value: undefined },
  { name: '파랑', value: '#3b82f6' },
  { name: '초록', value: '#10b981' },
  { name: '보라', value: '#8b5cf6' },
  { name: '빨강', value: '#ef4444' },
  { name: '주황', value: '#f97316' },
  { name: '청록', value: '#06b6d4' },
  { name: '노랑', value: '#eab308' },
];

// LocalStorage 키
const FAVORITES_STORAGE_KEY = 'timekeeper-preset-favorites';
const MANUAL_PRESETS_STORAGE_KEY = 'timekeeper-manual-presets';

const PresetPanel: React.FC = () => {
  const { startTimer, getRecentTitles, logs } = useTimerStore();

  // 즐겨찾기 목록 (LocalStorage에서 로드)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // 수동 프리셋 목록 (LocalStorage에서 로드)
  const [manual_presets, setManualPresets] = useState<PresetItem[]>(() => {
    try {
      const saved = localStorage.getItem(MANUAL_PRESETS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 프리셋 추가/수정 모달 상태
  const [is_modal_open, setIsModalOpen] = useState(false);
  const [edit_preset, setEditPreset] = useState<PresetItem | null>(null);
  const [modal_title, setModalTitle] = useState('');
  const [modal_board_no, setModalBoardNo] = useState('');
  const [modal_category, setModalCategory] = useState<string | null>(null);
  const [modal_color, setModalColor] = useState<string | undefined>(undefined);

  // 즐겨찾기 변경 시 LocalStorage 저장
  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  // 수동 프리셋 변경 시 LocalStorage 저장
  useEffect(() => {
    localStorage.setItem(MANUAL_PRESETS_STORAGE_KEY, JSON.stringify(manual_presets));
  }, [manual_presets]);

  // 최근 사용한 작업들에서 프리셋 생성 (최근 30일, 고유 제목)
  const recent_titles = getRecentTitles();

  // 로그에서 프리셋 데이터 추출 + 수동 프리셋 + 즐겨찾기 정렬
  const presets = useMemo((): PresetItem[] => {
    const preset_map = new Map<string, PresetItem>();

    // 1. 수동 프리셋 먼저 추가
    manual_presets.forEach((preset) => {
      preset_map.set(preset.title, {
        ...preset,
        is_favorite: favorites.has(preset.title),
      });
    });

    // 2. 최근 로그에서 고유 작업 추출 (수동 프리셋과 중복 제외)
    logs.forEach((log) => {
      if (!preset_map.has(log.title)) {
        preset_map.set(log.title, {
          id: log.id,
          title: log.title,
          boardNo: log.boardNo,
          category: log.category,
          is_favorite: favorites.has(log.title),
          is_manual: false,
        });
      }
    });

    // 3. 정렬: 즐겨찾기 먼저, 그 다음 최신순
    const all_presets = Array.from(preset_map.values());
    
    // 즐겨찾기 프리셋
    const favorite_presets = all_presets.filter(p => p.is_favorite);
    
    // 비즐겨찾기 프리셋 (최신순)
    const non_favorite_presets: PresetItem[] = [];
    recent_titles.forEach((title) => {
      const preset = preset_map.get(title);
      if (preset && !preset.is_favorite) {
        non_favorite_presets.push(preset);
      }
    });

    // 수동 프리셋 중 최근 사용하지 않은 것들도 포함
    manual_presets.forEach((preset) => {
      if (!favorites.has(preset.title) && !non_favorite_presets.find(p => p.title === preset.title)) {
        non_favorite_presets.push({
          ...preset,
          is_favorite: false,
        });
      }
    });

    return [...favorite_presets, ...non_favorite_presets].slice(0, 15); // 최대 15개
  }, [logs, recent_titles, favorites, manual_presets]);

  const handleStartPreset = (preset: PresetItem) => {
    startTimer(preset.title, preset.boardNo, preset.category);
  };

  const handleToggleFavorite = (preset_title: string) => {
    setFavorites(prev => {
      const new_favorites = new Set(prev);
      if (new_favorites.has(preset_title)) {
        new_favorites.delete(preset_title);
      } else {
        new_favorites.add(preset_title);
      }
      return new_favorites;
    });
  };

  // 프리셋 추가 모달 열기
  const handleOpenAddModal = () => {
    setEditPreset(null);
    setModalTitle('');
    setModalBoardNo('');
    setModalCategory(null);
    setModalColor(undefined);
    setIsModalOpen(true);
  };

  // 프리셋 수정 모달 열기
  const handleOpenEditModal = (preset: PresetItem) => {
    setEditPreset(preset);
    setModalTitle(preset.title);
    setModalBoardNo(preset.boardNo || '');
    setModalCategory(preset.category || null);
    setModalColor(preset.color);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditPreset(null);
  };

  // 프리셋 저장
  const handleSavePreset = () => {
    if (!modal_title.trim()) return;

    const new_preset: PresetItem = {
      id: edit_preset?.id || crypto.randomUUID(),
      title: modal_title.trim(),
      boardNo: modal_board_no || undefined,
      category: modal_category || undefined,
      color: modal_color,
      is_favorite: edit_preset?.is_favorite || false,
      is_manual: true,
    };

    if (edit_preset) {
      // 수정
      setManualPresets(prev => 
        prev.map(p => p.id === edit_preset.id ? new_preset : p)
      );
    } else {
      // 추가
      setManualPresets(prev => [new_preset, ...prev]);
    }

    handleCloseModal();
  };

  // 수동 프리셋 삭제
  const handleDeletePreset = (preset_id: string) => {
    setManualPresets(prev => prev.filter(p => p.id !== preset_id));
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
          <IconButton size="small" onClick={handleOpenAddModal}>
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
              작업을 기록하거나 + 버튼으로 추가하세요.
            </Typography>
          </Box>
        ) : (
          <List disablePadding dense>
            {presets.map((preset, index) => (
              <React.Fragment key={`${preset.title}-${index}`}>
                {index > 0 && <Divider />}
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(preset.title);
                        }}
                      >
                        {preset.is_favorite ? (
                          <StarIcon fontSize="small" sx={{ color: '#ffc107' }} />
                        ) : (
                          <StarBorderIcon fontSize="small" />
                        )}
                      </IconButton>
                      {preset.is_manual && (
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(preset);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        edge="end"
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartPreset(preset);
                        }}
                      >
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemButton
                    onClick={() => handleStartPreset(preset)}
                    sx={{ py: 1.5, pr: 12 }}
                  >
                    {/* 색상 인디케이터 */}
                    {preset.color && (
                      <Box
                        sx={{
                          width: 4,
                          height: 32,
                          bgcolor: preset.color,
                          borderRadius: 1,
                          mr: 1.5,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: preset.is_favorite ? 600 : 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {preset.title}
                          </Typography>
                          {preset.is_manual && (
                            <Chip
                              label="수동"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                bgcolor: '#e3f2fd',
                                color: '#1976d2',
                              }}
                            />
                          )}
                        </Box>
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
          ⭐ 즐겨찾기는 상단에 고정됩니다.
        </Typography>
      </Box>

      {/* 프리셋 추가/수정 모달 */}
      <Dialog open={is_modal_open} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          {edit_preset ? '프리셋 수정' : '새 프리셋 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            {/* 작업 제목 */}
            <TextField
              label="작업 제목"
              placeholder="예: 주간 회의"
              value={modal_title}
              onChange={(e) => setModalTitle(e.target.value)}
              fullWidth
              autoFocus
            />

            {/* 게시판 번호 & 카테고리 */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="게시판 번호"
                placeholder="예: 12345"
                value={modal_board_no}
                onChange={(e) => setModalBoardNo(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Autocomplete
                options={CATEGORIES}
                value={modal_category}
                onChange={(_e, newValue) => setModalCategory(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="카테고리" placeholder="선택" />
                )}
                sx={{ flex: 1 }}
              />
            </Box>

            {/* 색상 선택 */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                프리셋 색상
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((color) => (
                  <Tooltip key={color.name} title={color.name}>
                    <Box
                      onClick={() => setModalColor(color.value)}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        bgcolor: color.value || '#f5f5f5',
                        border: modal_color === color.value ? '2px solid #000' : '1px solid #ddd',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': { transform: 'scale(1.1)' },
                        transition: 'transform 0.15s',
                      }}
                    >
                      {!color.value && (
                        <Typography variant="caption" sx={{ color: '#999' }}>
                          X
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {edit_preset && (
            <Button
              color="error"
              onClick={() => {
                handleDeletePreset(edit_preset.id);
                handleCloseModal();
              }}
              sx={{ mr: 'auto' }}
            >
              삭제
            </Button>
          )}
          <Button onClick={handleCloseModal} color="inherit">
            취소
          </Button>
          <Button
            onClick={handleSavePreset}
            variant="contained"
            disabled={!modal_title.trim()}
            sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
          >
            {edit_preset ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PresetPanel;

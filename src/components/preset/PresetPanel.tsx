import React, { useState, useEffect } from 'react';
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
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import { useTimerStore } from '../../store/useTimerStore';

// 프리셋 데이터 타입
interface PresetItem {
  id: string;
  title: string;
  boardNo?: string;
  category?: string;
  color?: string;
  is_favorite: boolean;
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
const PRESETS_STORAGE_KEY = 'timekeeper-manual-presets';

const PresetPanel: React.FC = () => {
  const { startTimer, logs } = useTimerStore();

  // 프리셋 목록 (LocalStorage에서 로드)
  const [presets, setPresets] = useState<PresetItem[]>(() => {
    try {
      const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
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

  // 추가 메뉴 상태 (최근 작업 선택)
  const [add_menu_anchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);

  // 프리셋 변경 시 LocalStorage 저장
  useEffect(() => {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  // 최근 5개 작업 추출 (중복 제목 제거, 프리셋에 없는 것만)
  const getRecentTasks = () => {
    const seen_titles = new Set<string>();
    const preset_titles = new Set(presets.map(p => p.title));
    const recent: { title: string; boardNo?: string; category?: string }[] = [];

    // 최신 로그부터 순회
    const sorted_logs = [...logs].sort((a, b) => b.startTime - a.startTime);
    
    for (const log of sorted_logs) {
      if (!seen_titles.has(log.title) && !preset_titles.has(log.title)) {
        seen_titles.add(log.title);
        recent.push({
          title: log.title,
          boardNo: log.boardNo,
          category: log.category,
        });
        if (recent.length >= 5) break;
      }
    }

    return recent;
  };

  // 정렬된 프리셋 (즐겨찾기 먼저)
  const sorted_presets = [...presets].sort((a, b) => {
    if (a.is_favorite && !b.is_favorite) return -1;
    if (!a.is_favorite && b.is_favorite) return 1;
    return 0;
  });

  const handleStartPreset = (preset: PresetItem, e: React.MouseEvent) => {
    e.stopPropagation();
    startTimer(preset.title, preset.boardNo, preset.category);
  };

  const handleToggleFavorite = (preset_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresets(prev =>
      prev.map(p =>
        p.id === preset_id ? { ...p, is_favorite: !p.is_favorite } : p
      )
    );
  };

  // 프리셋 추가 메뉴 열기
  const handleOpenAddMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAddMenuAnchor(event.currentTarget);
  };

  const handleCloseAddMenu = () => {
    setAddMenuAnchor(null);
  };

  // 새 프리셋 추가 모달 열기
  const handleOpenAddModal = () => {
    handleCloseAddMenu();
    setEditPreset(null);
    setModalTitle('');
    setModalBoardNo('');
    setModalCategory(null);
    setModalColor(undefined);
    setIsModalOpen(true);
  };

  // 최근 작업에서 프리셋 추가
  const handleAddFromRecent = (task: { title: string; boardNo?: string; category?: string }) => {
    handleCloseAddMenu();
    setEditPreset(null);
    setModalTitle(task.title);
    setModalBoardNo(task.boardNo || '');
    setModalCategory(task.category || null);
    setModalColor(undefined);
    setIsModalOpen(true);
  };

  // 프리셋 클릭 시 수정 모달 열기
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
    };

    if (edit_preset) {
      // 수정
      setPresets(prev =>
        prev.map(p => (p.id === edit_preset.id ? new_preset : p))
      );
    } else {
      // 추가
      setPresets(prev => [new_preset, ...prev]);
    }

    handleCloseModal();
  };

  // 프리셋 삭제
  const handleDeletePreset = (preset_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 프리셋을 삭제하시겠습니까?')) {
      setPresets(prev => prev.filter(p => p.id !== preset_id));
    }
  };

  const recent_tasks = getRecentTasks();

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
        <Tooltip title="프리셋 추가">
          <IconButton size="small" onClick={handleOpenAddMenu}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 추가 메뉴 */}
      <Menu
        anchorEl={add_menu_anchor}
        open={Boolean(add_menu_anchor)}
        onClose={handleCloseAddMenu}
      >
        <MenuItem onClick={handleOpenAddModal}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="새 프리셋 추가" />
        </MenuItem>
        {recent_tasks.length > 0 && <Divider sx={{ my: 1 }} />}
        {recent_tasks.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block' }}>
            최근 작업에서 추가
          </Typography>
        )}
        {recent_tasks.map((task, index) => (
          <MenuItem key={index} onClick={() => handleAddFromRecent(task)}>
            <ListItemIcon>
              <HistoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={task.title}
              secondary={task.boardNo ? `#${task.boardNo}` : undefined}
              primaryTypographyProps={{ variant: 'body2', noWrap: true, sx: { maxWidth: 180 } }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* 프리셋 목록 */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {sorted_presets.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">프리셋이 없습니다.</Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              + 버튼을 눌러 프리셋을 추가하세요.
            </Typography>
          </Box>
        ) : (
          <List disablePadding dense>
            {sorted_presets.map((preset, index) => (
              <React.Fragment key={preset.id}>
                {index > 0 && <Divider />}
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title={preset.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => handleToggleFavorite(preset.id, e)}
                        >
                          {preset.is_favorite ? (
                            <StarIcon fontSize="small" sx={{ color: '#ffc107' }} />
                          ) : (
                            <StarBorderIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => handleDeletePreset(preset.id, e)}
                          sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="타이머 시작">
                        <IconButton
                          edge="end"
                          size="small"
                          color="primary"
                          onClick={(e) => handleStartPreset(preset, e)}
                        >
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton
                    onClick={() => handleOpenEditModal(preset)}
                    sx={{ py: 1.5, pr: 14 }}
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

      {/* 푸터 */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid var(--border-color, #eaeaea)',
          bgcolor: '#fafafa',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          클릭하여 수정 • ⭐ 즐겨찾기는 상단 고정
        </Typography>
      </Box>

      {/* 프리셋 추가/수정 모달 */}
      <Dialog open={is_modal_open} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>{edit_preset ? '프리셋 수정' : '새 프리셋 추가'}</DialogTitle>
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
                        border:
                          modal_color === color.value
                            ? '2px solid #000'
                            : '1px solid #ddd',
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
                setPresets((prev) => prev.filter((p) => p.id !== edit_preset.id));
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

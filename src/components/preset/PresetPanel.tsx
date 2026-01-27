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
import { useProjectStore } from '../../store/useProjectStore';
import { getPalette, loadPaletteSettings } from '../../utils/colorPalette';
import CategoryAutocomplete from '../common/CategoryAutocomplete';

// 프리셋 데이터 타입
interface PresetItem {
  id: string;
  title: string;
  projectCode?: string;  // boardNo에서 변경
  category?: string;
  color?: string;
  is_favorite: boolean;
}

// LocalStorage 키
const PRESETS_STORAGE_KEY = 'timekeeper-manual-presets';

const PresetPanel: React.FC = () => {
  const { startTimer, logs } = useTimerStore();
  const { projects, addProject, getProjectName } = useProjectStore();

  // 컬러 팔레트 로드
  const [colorPalette, setColorPalette] = useState<string[]>(() => {
    const settings = loadPaletteSettings();
    return getPalette(settings);
  });

  // 팔레트 설정 변경 감지
  useEffect(() => {
    const handlePaletteUpdate = () => {
      const settings = loadPaletteSettings();
      setColorPalette(getPalette(settings));
    };
    
    window.addEventListener('storage', handlePaletteUpdate);
    window.addEventListener('focus', handlePaletteUpdate);
    // 같은 탭 내 팔레트 변경 감지
    window.addEventListener('palette-changed', handlePaletteUpdate);
    
    return () => {
      window.removeEventListener('storage', handlePaletteUpdate);
      window.removeEventListener('focus', handlePaletteUpdate);
      window.removeEventListener('palette-changed', handlePaletteUpdate);
    };
  }, []);

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
  const [modal_project_code, setModalProjectCode] = useState('');
  const [modal_project_name, setModalProjectName] = useState('');  // 새 프로젝트명 입력용
  const [modal_category, setModalCategory] = useState<string | null>(null);
  const [modal_color, setModalColor] = useState<string | undefined>(undefined);
  
  // 프로젝트 옵션 (코드 + 이름 형태로 표시)
  const projectOptions = projects.map(p => `[${p.code}] ${p.name}`);

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
    const recent: { title: string; projectCode?: string; category?: string }[] = [];

    // 최신 로그부터 순회
    const sorted_logs = [...logs].sort((a, b) => b.startTime - a.startTime);
    
    for (const log of sorted_logs) {
      if (!seen_titles.has(log.title) && !preset_titles.has(log.title)) {
        seen_titles.add(log.title);
        recent.push({
          title: log.title,
          projectCode: log.projectCode,
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
    startTimer(preset.title, preset.projectCode, preset.category);
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
    setModalProjectCode('');
    setModalProjectName('');
    setModalCategory(null);
    setModalColor(undefined);
    setIsModalOpen(true);
  };

  // 최근 작업에서 프리셋 추가
  const handleAddFromRecent = (task: { title: string; projectCode?: string; category?: string }) => {
    handleCloseAddMenu();
    setEditPreset(null);
    setModalTitle(task.title);
    setModalProjectCode(task.projectCode || '');
    setModalProjectName(task.projectCode ? getProjectName(task.projectCode) : '');
    setModalCategory(task.category || null);
    setModalColor(undefined);
    setIsModalOpen(true);
  };

  // 프리셋 클릭 시 수정 모달 열기
  const handleOpenEditModal = (preset: PresetItem) => {
    setEditPreset(preset);
    setModalTitle(preset.title);
    setModalProjectCode(preset.projectCode || '');
    setModalProjectName(preset.projectCode ? getProjectName(preset.projectCode) : '');
    setModalCategory(preset.category || null);
    setModalColor(preset.color);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditPreset(null);
  };
  
  // 프로젝트 코드 입력 처리 (자동완성 선택 또는 직접 입력)
  const handleProjectCodeChange = (value: string) => {
    // [코드] 이름 형태에서 코드와 이름 추출
    const match = value.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (match) {
      setModalProjectCode(match[1]);
      setModalProjectName(match[2] || getProjectName(match[1]));
    } else {
      setModalProjectCode(value);
      // 기존 프로젝트에서 이름 찾기
      const existingProject = projects.find(p => p.code === value);
      if (existingProject) {
        setModalProjectName(existingProject.name);
      }
    }
  };
  
  // 프로젝트 코드에서 표시용 문자열 생성
  const getProjectDisplayValue = () => {
    if (!modal_project_code) return '';
    if (modal_project_name && modal_project_name !== modal_project_code) {
      return `[${modal_project_code}] ${modal_project_name}`;
    }
    return modal_project_code;
  };

  // 프리셋 저장
  const handleSavePreset = () => {
    if (!modal_title.trim()) return;
    
    // 새 프로젝트 코드-명 매핑 저장
    if (modal_project_code && modal_project_name) {
      addProject({ code: modal_project_code, name: modal_project_name });
    }

    const new_preset: PresetItem = {
      id: edit_preset?.id || crypto.randomUUID(),
      title: modal_title.trim(),
      projectCode: modal_project_code || undefined,
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
        bgcolor: 'transparent', // 배경색 제거 (투명)
        borderColor: 'var(--border-color)',
      }}
    >
      {/* 헤더 */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'var(--bg-tertiary)', // 헤더 배경색 추가
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          작업 프리셋
        </Typography>
        <Tooltip title="프리셋 추가">
          <IconButton size="small" onClick={handleOpenAddMenu}>
            <AddIcon fontSize="small" sx={{ color: 'var(--text-secondary)' }} />
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
              secondary={task.projectCode ? getProjectName(task.projectCode) : undefined}
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
                            color: 'var(--text-primary)',
                          }}
                        >
                          {preset.title}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                          {preset.projectCode && (
                            <Chip
                              label={getProjectName(preset.projectCode)}
                              size="small"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                              title={`[${preset.projectCode}]`}
                            />
                          )}
                          {preset.category && (
                            <Chip
                              label={preset.category}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                bgcolor: 'var(--bg-hover)',
                                color: 'var(--text-secondary)',
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
          borderTop: '1px solid var(--border-color)',
          bgcolor: 'var(--bg-secondary)',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          클릭하여 수정 • ⭐ 즐겨찾기는 상단 고정
        </Typography>
      </Box>

      {/* 프리셋 추가/수정 모달 */}
      <Dialog 
        open={is_modal_open} 
        onClose={handleCloseModal} 
        maxWidth="sm" 
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && modal_title.trim()) {
            e.preventDefault();
            handleSavePreset();
          }
        }}
      >
        <DialogTitle>{edit_preset ? '프리셋 수정' : '새 프리셋 추가'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            {/* 프로젝트 코드 (자동완성 + 직접입력) */}
            <Autocomplete
              freeSolo
              options={projectOptions}
              value={getProjectDisplayValue()}
              onInputChange={(_e, newValue) => handleProjectCodeChange(newValue)}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="프로젝트 코드" 
                  placeholder="예: A25_01846 (미입력 시 A00_00000)"
                  helperText="기존 프로젝트를 선택하거나 새 코드를 입력하세요"
                />
              )}
              fullWidth
              autoFocus
            />
            
            {/* 프로젝트명 (새 코드 입력 시 or 기존 코드명 수정) */}
            {modal_project_code && (
              <TextField
                label="프로젝트명"
                placeholder="예: 5.6 프레임워크 FE"
                value={modal_project_name}
                onChange={(e) => setModalProjectName(e.target.value)}
                fullWidth
                helperText="프로젝트 코드와 매핑되는 이름입니다"
              />
            )}

            {/* 업무명 & 카테고리명 */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="업무명"
                placeholder="예: 5.6 테스트 케이스 확인 및 이슈 처리"
                value={modal_title}
                onChange={(e) => setModalTitle(e.target.value)}
                sx={{ flex: 2 }}
              />
              <CategoryAutocomplete
                value={modal_category}
                onChange={(newValue) => setModalCategory(newValue)}
                label="카테고리명"
                placeholder="카테고리 선택"
                variant="outlined"
                sx={{ flex: 1 }}
              />
            </Box>
            
            {/* 비고 */}
            <TextField
              label="비고"
              placeholder="추가 메모"
              multiline
              rows={2}
            />

            {/* 색상 선택 */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                프리셋 색상 (설정의 컬러 팔레트)
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {/* 기본(색상 없음) 옵션 */}
                <Tooltip title="기본 (자동)">
                  <Box
                    onClick={() => setModalColor(undefined)}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      bgcolor: 'var(--bg-hover)',
                      border: modal_color === undefined ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': { transform: 'scale(1.1)' },
                      transition: 'transform 0.15s',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                      자동
                    </Typography>
                  </Box>
                </Tooltip>
                
                {/* 팔레트 색상들 */}
                {colorPalette.slice(0, 10).map((color, index) => (
                  <Tooltip key={index} title={`색상 ${index + 1}`}>
                    <Box
                      onClick={() => setModalColor(color)}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        bgcolor: color,
                        border: modal_color === color ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        '&:hover': { transform: 'scale(1.1)' },
                        transition: 'transform 0.15s',
                      }}
                    />
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
            sx={{ bgcolor: 'var(--highlight-color)', '&:hover': { bgcolor: 'var(--highlight-hover)' } }}
          >
            {edit_preset ? '수정(Enter)' : '추가(Enter)'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PresetPanel;

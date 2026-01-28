import React, { useState, useEffect, useCallback } from 'react';
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTimerStore } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import { getAdjustedPalette, loadPaletteSettings } from '../../utils/colorPalette';
import CategoryAutocomplete from '../common/CategoryAutocomplete';

// 프리셋 데이터 타입
interface PresetItem {
  id: string;
  title: string;
  projectCode?: string;  // boardNo에서 변경
  category?: string;
  note?: string;         // 비고
  color?: string;
}

// LocalStorage 키
const PRESETS_STORAGE_KEY = 'timekeeper-manual-presets';

// Sortable 프리셋 아이템 컴포넌트
interface SortablePresetItemProps {
  preset: PresetItem;
  onEdit: (preset: PresetItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onStart: (preset: PresetItem, e: React.MouseEvent) => void;
  onProjectEdit: (preset: PresetItem, e: React.MouseEvent) => void;
  editingProject: string | null;
  inlineProjectCode: string;
  setInlineProjectCode: (code: string) => void;
  projectOptions: string[];
  getProjectName: (code: string) => string;
  getInlineProjectDisplayValue: (code: string) => string;
  saveInlineProject: (preset: PresetItem, code: string) => void;
  cancelInlineEdit: () => void;
}

const SortablePresetItem: React.FC<SortablePresetItemProps> = ({
  preset,
  onEdit,
  onDelete,
  onStart,
  onProjectEdit,
  editingProject,
  inlineProjectCode,
  setInlineProjectCode,
  projectOptions,
  getProjectName,
  getInlineProjectDisplayValue,
  saveInlineProject,
  cancelInlineEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: preset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      disablePadding
      sx={{
        bgcolor: isDragging ? 'action.selected' : 'transparent',
      }}
      secondaryAction={
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="삭제">
            <IconButton
              edge="end"
              size="small"
              onClick={(e) => onDelete(preset.id, e)}
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
              onClick={(e) => onStart(preset, e)}
            >
              <PlayArrowIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <ListItemButton
        onClick={() => onEdit(preset)}
        sx={{ py: 1.5, pr: '100px' }}
      >
        {/* 드래그 핸들 */}
        <IconButton
          size="small"
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          sx={{ 
            p: 0.25,
            mr: 0.5,
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicatorIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        </IconButton>
        
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
          sx={{ 
            overflow: 'hidden',
            minWidth: 0,
            maxWidth: 'calc(100% - 75px)',
            '& .MuiListItemText-primary': { 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }
          }}
          secondaryTypographyProps={{ component: 'div' }}
          primary={
            <Typography
              variant="body2"
              component="span"
              sx={{
                fontWeight: 500,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--text-primary)',
              }}
              title={preset.title}
            >
              {preset.title}
            </Typography>
          }
          secondary={
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, overflow: 'hidden', flexWrap: 'nowrap' }}>
              {editingProject === preset.id ? (
                <Autocomplete
                  freeSolo
                  size="small"
                  options={projectOptions}
                  value={getInlineProjectDisplayValue(inlineProjectCode)}
                  onInputChange={(_e, newValue) => setInlineProjectCode(newValue)}
                  onChange={(_e, newValue) => {
                    saveInlineProject(preset, newValue || '');
                  }}
                  onBlur={() => saveInlineProject(preset, inlineProjectCode)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      variant="standard"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveInlineProject(preset, inlineProjectCode);
                        } else if (e.key === 'Escape') {
                          cancelInlineEdit();
                        }
                      }}
                      InputProps={{ ...params.InputProps, disableUnderline: true }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.65rem', p: 0 } }}
                    />
                  )}
                  sx={{ width: 120 }}
                />
              ) : (
                <Chip
                  label={preset.projectCode ? getProjectName(preset.projectCode) : '-'}
                  size="small"
                  variant="outlined"
                  onClick={(e) => onProjectEdit(preset, e)}
                  sx={{ 
                    height: 18, 
                    fontSize: '0.65rem',
                    maxWidth: 120,
                    cursor: 'pointer',
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }
                  }}
                  title={preset.projectCode ? `[${preset.projectCode}] ${getProjectName(preset.projectCode)} - 클릭하여 변경` : '클릭하여 프로젝트 설정'}
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
                    maxWidth: 80,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }
                  }}
                  title={preset.category}
                />
              )}
            </Box>
          }
        />
      </ListItemButton>
    </ListItem>
  );
};

const PresetPanel: React.FC = () => {
  const { startTimer, logs, themeConfig } = useTimerStore();
  const { projects, addProject, getProjectName } = useProjectStore();

  // 컬러 팔레트 로드 (다크모드일 때 색상 보정 적용)
  const [colorPalette, setColorPalette] = useState<string[]>(() => {
    const settings = loadPaletteSettings();
    return getAdjustedPalette(settings, themeConfig.isDark, 45);
  });

  // 팔레트 설정 변경 감지 및 다크모드 변경 감지
  useEffect(() => {
    const handlePaletteUpdate = () => {
      const settings = loadPaletteSettings();
      setColorPalette(getAdjustedPalette(settings, themeConfig.isDark, 45));
    };
    
    handlePaletteUpdate();
    
    window.addEventListener('storage', handlePaletteUpdate);
    window.addEventListener('focus', handlePaletteUpdate);
    window.addEventListener('palette-changed', handlePaletteUpdate);
    
    return () => {
      window.removeEventListener('storage', handlePaletteUpdate);
      window.removeEventListener('focus', handlePaletteUpdate);
      window.removeEventListener('palette-changed', handlePaletteUpdate);
    };
  }, [themeConfig.isDark]);

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
  const [modal_project_name, setModalProjectName] = useState('');
  const [modal_category, setModalCategory] = useState<string | null>(null);
  const [modal_note, setModalNote] = useState('');
  const [modal_color, setModalColor] = useState<string | undefined>(undefined);
  
  const projectOptions = projects.map(p => `[${p.code}] ${p.name}`);

  const [add_menu_anchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);

  const [editingPresetProject, setEditingPresetProject] = useState<string | null>(null);
  const [inlinePresetProjectCode, setInlinePresetProjectCode] = useState('');

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

  // 프리셋 변경 시 LocalStorage 저장
  useEffect(() => {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  // 드래그 종료 핸들러
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setPresets((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // 최근 5개 작업 추출
  const getRecentTasks = () => {
    const seen_titles = new Set<string>();
    const preset_titles = new Set(presets.map(p => p.title));
    const recent: { title: string; projectCode?: string; category?: string; note?: string }[] = [];

    const sorted_logs = [...logs].sort((a, b) => b.startTime - a.startTime);
    
    for (const log of sorted_logs) {
      if (!seen_titles.has(log.title) && !preset_titles.has(log.title)) {
        seen_titles.add(log.title);
        recent.push({
          title: log.title,
          projectCode: log.projectCode,
          category: log.category,
          note: log.note,
        });
        if (recent.length >= 5) break;
      }
    }

    return recent;
  };

  const handleStartPreset = useCallback((preset: PresetItem, e: React.MouseEvent) => {
    e.stopPropagation();
    startTimer(preset.title, preset.projectCode, preset.category, preset.note);
  }, [startTimer]);

  const handleOpenAddMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAddMenuAnchor(event.currentTarget);
  };

  const handleCloseAddMenu = () => {
    setAddMenuAnchor(null);
  };

  const handleOpenAddModal = () => {
    handleCloseAddMenu();
    setEditPreset(null);
    setModalTitle('');
    setModalProjectCode('');
    setModalProjectName('');
    setModalCategory(null);
    setModalNote('');
    setModalColor(undefined);
    setIsModalOpen(true);
  };

  const handleAddFromRecent = (task: { title: string; projectCode?: string; category?: string; note?: string }) => {
    handleCloseAddMenu();
    setEditPreset(null);
    setModalTitle(task.title);
    setModalProjectCode(task.projectCode || '');
    setModalProjectName(task.projectCode ? getProjectName(task.projectCode) : '');
    setModalCategory(task.category || null);
    setModalNote(task.note || '');
    setModalColor(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = useCallback((preset: PresetItem) => {
    setEditPreset(preset);
    setModalTitle(preset.title);
    setModalProjectCode(preset.projectCode || '');
    setModalProjectName(preset.projectCode ? getProjectName(preset.projectCode) : '');
    setModalCategory(preset.category || null);
    setModalNote(preset.note || '');
    setModalColor(preset.color);
    setIsModalOpen(true);
  }, [getProjectName]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditPreset(null);
  };
  
  const handleProjectCodeChange = (value: string) => {
    const match = value.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (match) {
      setModalProjectCode(match[1]);
      setModalProjectName(match[2] || getProjectName(match[1]));
    } else {
      setModalProjectCode(value);
      const existingProject = projects.find(p => p.code === value);
      if (existingProject) {
        setModalProjectName(existingProject.name);
      }
    }
  };
  
  const getProjectDisplayValue = () => {
    if (!modal_project_code) return '';
    if (modal_project_name && modal_project_name !== modal_project_code) {
      return `[${modal_project_code}] ${modal_project_name}`;
    }
    return modal_project_code;
  };

  const handleSavePreset = () => {
    if (!modal_title.trim()) return;
    
    if (modal_project_code && modal_project_name) {
      addProject({ code: modal_project_code, name: modal_project_name });
    }

    const new_preset: PresetItem = {
      id: edit_preset?.id || crypto.randomUUID(),
      title: modal_title.trim(),
      projectCode: modal_project_code || undefined,
      category: modal_category || undefined,
      note: modal_note.trim() || undefined,
      color: modal_color,
    };

    if (edit_preset) {
      setPresets(prev =>
        prev.map(p => (p.id === edit_preset.id ? new_preset : p))
      );
    } else {
      setPresets(prev => [new_preset, ...prev]);
    }

    handleCloseModal();
  };

  const handleDeletePreset = useCallback((preset_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 프리셋을 삭제하시겠습니까?')) {
      setPresets(prev => prev.filter(p => p.id !== preset_id));
    }
  }, []);

  const startInlinePresetProjectEdit = useCallback((preset: PresetItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPresetProject(preset.id);
    setInlinePresetProjectCode(preset.projectCode || '');
  }, []);

  const saveInlinePresetProject = useCallback((preset: PresetItem, newCode: string) => {
    const match = newCode.match(/^\[([^\]]+)\]/);
    const code = match ? match[1] : newCode;
    
    if (code !== preset.projectCode) {
      setPresets(prev =>
        prev.map(p => (p.id === preset.id ? { ...p, projectCode: code || undefined } : p))
      );
    }
    setEditingPresetProject(null);
    setInlinePresetProjectCode('');
  }, []);

  const cancelInlinePresetProjectEdit = useCallback(() => {
    setEditingPresetProject(null);
    setInlinePresetProjectCode('');
  }, []);

  const getInlineProjectDisplayValue = useCallback((code: string) => {
    if (!code) return '';
    const name = getProjectName(code);
    if (name && name !== code) {
      return `[${code}] ${name}`;
    }
    return code;
  }, [getProjectName]);

  const recent_tasks = getRecentTasks();

  return (
    <Paper
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'transparent',
        borderColor: 'var(--border-color)',
        resize: 'horizontal',
        overflow: 'auto',
        minWidth: 200,
        maxWidth: 450,
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
          bgcolor: 'var(--bg-tertiary)',
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
        {presets.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">프리셋이 없습니다.</Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              + 버튼을 눌러 프리셋을 추가하세요.
            </Typography>
          </Box>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={presets.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <List disablePadding dense>
                {presets.map((preset, index) => (
                  <React.Fragment key={preset.id}>
                    {index > 0 && <Divider />}
                    <SortablePresetItem
                      preset={preset}
                      onEdit={handleOpenEditModal}
                      onDelete={handleDeletePreset}
                      onStart={handleStartPreset}
                      onProjectEdit={startInlinePresetProjectEdit}
                      editingProject={editingPresetProject}
                      inlineProjectCode={inlinePresetProjectCode}
                      setInlineProjectCode={setInlinePresetProjectCode}
                      projectOptions={projectOptions}
                      getProjectName={getProjectName}
                      getInlineProjectDisplayValue={getInlineProjectDisplayValue}
                      saveInlineProject={saveInlinePresetProject}
                      cancelInlineEdit={cancelInlinePresetProjectEdit}
                    />
                  </React.Fragment>
                ))}
              </List>
            </SortableContext>
          </DndContext>
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
          드래그하여 순서 변경 • 클릭하여 수정 • ▶ 타이머 시작
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
            
            <TextField
              label="비고"
              placeholder="추가 메모"
              value={modal_note}
              onChange={(e) => setModalNote(e.target.value)}
              multiline
              rows={2}
            />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                프리셋 색상 (설정의 컬러 팔레트)
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
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

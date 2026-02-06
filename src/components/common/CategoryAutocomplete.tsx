import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  IconButton,
  Paper,
  Divider,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
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
import { useCategoryStore } from '../../store/useCategoryStore';

interface CategoryAutocompleteProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  disableUnderline?: boolean;
  label?: string;
  sx?: object;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
  onBlur?: () => void;
}

// Sortable 옵션 아이템 컴포넌트
interface SortableOptionProps {
  id: string;
  onSelect: (value: string) => void;
  onRemove: (e: React.MouseEvent, value: string) => void;
}

const SortableOption: React.FC<SortableOptionProps> = ({ id, onSelect, onRemove }) => {
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
    zIndex: isDragging ? 1000 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      component="li"
      onClick={() => onSelect(id)}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 0.5,
        px: 1,
        cursor: 'pointer',
        bgcolor: isDragging ? 'action.selected' : 'transparent',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
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
        <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
      </IconButton>
      <Typography variant="body2" sx={{ flex: 1 }}>
        {id}
      </Typography>
      <IconButton
        size="small"
        onClick={(e) => onRemove(e, id)}
        onMouseDown={(e) => e.preventDefault()}
        sx={{ 
          p: 0.25,
          opacity: 0.5,
          '&:hover': { opacity: 1, color: 'error.main' }
        }}
      >
        <CloseIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
};

// 커스텀 Paper 컴포넌트 (드롭다운 하단에 추가 UI 포함)
const CustomPaper = React.memo<{
  children?: React.ReactNode;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onAddCategory: () => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
}>(({ children, inputRef, onAddCategory, onInputFocus, onInputBlur }) => {
  const [addButtonDisabled, setAddButtonDisabled] = useState(true);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAddButtonDisabled(!e.target.value.trim());
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const input = e.target as HTMLInputElement;
      if (input.value.trim()) {
        e.preventDefault();
        onAddCategory();
      }
    }
  }, [onAddCategory]);

  return (
    <Paper elevation={8} sx={{ overflow: 'hidden', minWidth: 200 }}>
      {children}
      <Divider />
      <Box 
        sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onInputFocus();
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <TextField
          size="small"
          placeholder="새 카테고리"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => {
            e.stopPropagation();
            onInputFocus();
          }}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          inputRef={inputRef}
          sx={{ 
            flex: 1,
            '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 }
          }}
        />
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAddCategory();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onInputFocus();
          }}
          disabled={addButtonDisabled}
          sx={{ p: 0.5 }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ ml: 0.5 }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onInputFocus();
          }}
        >
          추가
        </Typography>
      </Box>
    </Paper>
  );
});

CustomPaper.displayName = 'CustomPaper';

const CategoryAutocomplete: React.FC<CategoryAutocompleteProps> = ({
  value,
  onChange,
  placeholder = '카테고리',
  variant = 'standard',
  size = 'medium',
  fullWidth = false,
  disableUnderline = false,
  label,
  sx = {},
  onKeyDown,
  autoFocus = false,
  onBlur,
}) => {
  const { categories, addCategory, removeCategory, reorderCategories } = useCategoryStore();
  const [open, setOpen] = useState(false);
  const isAddInputFocused = useRef(false);
  const isDragging = useRef(false);
  const addInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleAddCategory = useCallback(() => {
    const inputValue = addInputRef.current?.value?.trim();
    if (inputValue) {
      addCategory(inputValue);
      if (addInputRef.current) {
        addInputRef.current.value = '';
        addInputRef.current.focus();
      }
    }
  }, [addCategory]);

  const handleRemoveCategory = useCallback((e: React.MouseEvent, categoryToRemove: string) => {
    e.stopPropagation();
    e.preventDefault();
    removeCategory(categoryToRemove);
    if (value === categoryToRemove) {
      onChange(null);
    }
  }, [removeCategory, value, onChange]);

  const handleSelectCategory = useCallback((category: string) => {
    if (!isDragging.current) {
      onChange(category);
      setOpen(false);
    }
  }, [onChange]);

  const handleInputFocus = useCallback(() => {
    isAddInputFocused.current = true;
  }, []);

  const handleInputBlur = useCallback(() => {
    isAddInputFocused.current = false;
    
    setTimeout(() => {
      if (!isAddInputFocused.current && !isDragging.current) {
        setOpen(false);
      }
    }, 150);
  }, []);

  const handleClose = useCallback((_event: React.SyntheticEvent, reason: string) => {
    if (isAddInputFocused.current || isDragging.current) {
      return;
    }
    if (reason === 'blur' && (isAddInputFocused.current || isDragging.current)) {
      return;
    }
    setOpen(false);
  }, []);

  // 드래그 시작
  const handleDragStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  // 드래그 종료 및 순서 변경
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    isDragging.current = false;
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = categories.indexOf(active.id as string);
      const newIndex = categories.indexOf(over.id as string);
      reorderCategories(arrayMove(categories, oldIndex, newIndex));
    }
  }, [categories, reorderCategories]);

  // PaperComponent를 useMemo로 메모이제이션하여 불필요한 리마운트 방지
  const paperComponent = useMemo(() => {
    return (paperProps: React.HTMLAttributes<HTMLDivElement>) => (
      <CustomPaper
        {...paperProps}
        inputRef={addInputRef}
        onAddCategory={handleAddCategory}
        onInputFocus={handleInputFocus}
        onInputBlur={handleInputBlur}
      />
    );
  }, [handleAddCategory, handleInputFocus, handleInputBlur]);

  // 커스텀 Listbox 컴포넌트
  const ListboxComponent = useMemo(() => {
    return React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
      function ListboxComponent(props, ref) {
        const { children, ...other } = props;
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={categories} strategy={verticalListSortingStrategy}>
              <ul ref={ref} {...other} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {categories.map((category) => (
                  <SortableOption
                    key={category}
                    id={category}
                    onSelect={handleSelectCategory}
                    onRemove={handleRemoveCategory}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        );
      }
    );
  }, [sensors, handleDragStart, handleDragEnd, categories, handleSelectCategory, handleRemoveCategory]);

  return (
    <Autocomplete
      options={categories}
      value={value}
      onChange={(_e, newValue) => {
        if (!isDragging.current) {
          onChange(newValue);
          if (!isAddInputFocused.current) {
            setOpen(false);
          }
        }
      }}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={handleClose}
      fullWidth={fullWidth}
      size={size}
      disablePortal
      slotProps={{
        popper: {
          modifiers: [
            {
              name: 'flip',
              enabled: true,
            },
            {
              name: 'preventOverflow',
              enabled: true,
              options: {
                altAxis: true,
                tether: false,
                padding: 8,
              },
            },
          ],
        },
      }}
      PaperComponent={paperComponent}
      ListboxComponent={ListboxComponent}
      renderOption={() => null} // ListboxComponent에서 직접 렌더링하므로 null 반환
      filterOptions={(options) => options} // 필터링 비활성화 (드래그 순서 유지)
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          variant={variant}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          onBlur={() => {
            // 추가 입력란에 포커스가 있으면 외부 onBlur를 호출하지 않음
            if (isAddInputFocused.current || isDragging.current) {
              return;
            }
            // 지연 후 확인 (포커스가 드롭다운 내부로 이동했는지)
            setTimeout(() => {
              if (!isAddInputFocused.current && !isDragging.current) {
                onBlur?.();
              }
            }, 150);
          }}
          InputProps={{
            ...params.InputProps,
            ...(disableUnderline && variant === 'standard' ? { disableUnderline: true } : {}),
          }}
        />
      )}
      sx={sx}
    />
  );
};

export default CategoryAutocomplete;

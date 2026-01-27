import React, { useState, useRef, useCallback } from 'react';
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
}

// 커스텀 Paper 컴포넌트 (드롭다운 하단에 추가 UI 포함)
const CustomPaper: React.FC<{
  children?: React.ReactNode;
  newCategory: string;
  setNewCategory: (value: string) => void;
  onAddCategory: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputFocus: () => void;
  onInputBlur: () => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
}> = ({ children, newCategory, setNewCategory, onAddCategory, inputRef, onInputFocus, onInputBlur, onCompositionStart, onCompositionEnd }) => {
  return (
    <Paper elevation={8} sx={{ overflow: 'hidden', minWidth: 200 }}>
      {children}
      <Divider />
      <Box 
        sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
        onMouseDown={(e) => {
          // Autocomplete가 이 영역 클릭을 옵션 선택으로 처리하지 않도록 방지
          e.stopPropagation();
          e.preventDefault();
          // onClose보다 먼저 실행되므로 여기서 플래그 설정
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
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && newCategory.trim()) {
              e.preventDefault();
              onAddCategory();
            }
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            // onClose보다 먼저 실행되므로 여기서 플래그 설정
            onInputFocus();
          }}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
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
            // onClose보다 먼저 실행되므로 여기서 플래그 설정
            onInputFocus();
          }}
          disabled={!newCategory.trim()}
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
            // onClose보다 먼저 실행되므로 여기서 플래그 설정
            onInputFocus();
          }}
        >
          추가
        </Typography>
      </Box>
    </Paper>
  );
};

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
}) => {
  const { categories, addCategory, removeCategory } = useCategoryStore();
  const [newCategory, setNewCategory] = useState('');
  const [open, setOpen] = useState(false);
  const isAddInputFocused = useRef(false);
  const addInputRef = useRef<HTMLInputElement | null>(null);
  const isComposing = useRef(false); // IME composition 상태 추적

  const handleAddCategory = useCallback(() => {
    if (newCategory.trim()) {
      addCategory(newCategory.trim());
      setNewCategory('');
      // 추가 후에도 드롭다운 유지
      addInputRef.current?.focus();
    }
  }, [newCategory, addCategory]);

  const handleRemoveCategory = (e: React.MouseEvent, categoryToRemove: string) => {
    e.stopPropagation();
    e.preventDefault();
    removeCategory(categoryToRemove);
    // 현재 선택된 카테고리가 삭제되면 초기화
    if (value === categoryToRemove) {
      onChange(null);
    }
  };

  const handleInputFocus = useCallback(() => {
    isAddInputFocused.current = true;
  }, []);

  const handleInputBlur = useCallback(() => {
    // blur 시 플래그를 false로 리셋
    isAddInputFocused.current = false;
    
    // 약간의 지연 후 닫기 (다른 요소로 포커스 이동 확인)
    setTimeout(() => {
      // 다시 포커스가 들어왔는지 확인 (다른 내부 요소로 이동한 경우)
      if (!isAddInputFocused.current) {
        setOpen(false);
      }
    }, 150);
  }, []);

  // newCategory 상태 변경으로 리렌더링 후에도 포커스 유지
  // 단, IME composition 중에는 포커스를 다시 설정하지 않음 (한글 입력 깨짐 방지)
  React.useEffect(() => {
    if (isAddInputFocused.current && addInputRef.current && !isComposing.current) {
      addInputRef.current.focus();
    }
  }, [newCategory]);

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposing.current = false;
  }, []);

  const handleClose = useCallback((_event: React.SyntheticEvent, reason: string) => {
    // 새 카테고리 입력 필드에 포커스가 있으면 닫지 않음
    if (isAddInputFocused.current) {
      return;
    }
    // blur로 닫히려 할 때도 새 카테고리 입력 필드 확인
    if (reason === 'blur' && isAddInputFocused.current) {
      return;
    }
    setOpen(false);
  }, []);

  return (
    <Autocomplete
      options={categories}
      value={value}
      onChange={(_e, newValue) => {
        onChange(newValue);
        if (!isAddInputFocused.current) {
          setOpen(false);
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
      PaperComponent={(paperProps) => (
        <CustomPaper
          {...paperProps}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          onAddCategory={handleAddCategory}
          inputRef={addInputRef}
          onInputFocus={handleInputFocus}
          onInputBlur={handleInputBlur}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props;
        return (
          <Box
            key={key}
            component="li"
            {...otherProps}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              '&.MuiAutocomplete-option': {
                py: 0.5,
                px: 1,
              }
            }}
          >
            <Typography variant="body2" sx={{ flex: 1 }}>
              {option}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => handleRemoveCategory(e, option)}
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
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          variant={variant}
          onKeyDown={onKeyDown}
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

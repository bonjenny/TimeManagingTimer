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

// 커스텀 Paper 컴포넌트 (드롭다운 하단에 추가 UI 포함)
// React.memo로 불필요한 리렌더링 방지
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
  const { categories, addCategory, removeCategory } = useCategoryStore();
  const [open, setOpen] = useState(false);
  const isAddInputFocused = useRef(false);
  const addInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleRemoveCategory = (e: React.MouseEvent, categoryToRemove: string) => {
    e.stopPropagation();
    e.preventDefault();
    removeCategory(categoryToRemove);
    if (value === categoryToRemove) {
      onChange(null);
    }
  };

  const handleInputFocus = useCallback(() => {
    isAddInputFocused.current = true;
  }, []);

  const handleInputBlur = useCallback(() => {
    isAddInputFocused.current = false;
    
    setTimeout(() => {
      if (!isAddInputFocused.current) {
        setOpen(false);
      }
    }, 150);
  }, []);

  const handleClose = useCallback((_event: React.SyntheticEvent, reason: string) => {
    if (isAddInputFocused.current) {
      return;
    }
    if (reason === 'blur' && isAddInputFocused.current) {
      return;
    }
    setOpen(false);
  }, []);

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
      PaperComponent={paperComponent}
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
          autoFocus={autoFocus}
          onBlur={onBlur}
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

import React, { useState } from 'react';
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
}> = ({ children, newCategory, setNewCategory, onAddCategory }) => {
  return (
    <Paper elevation={8} sx={{ overflow: 'hidden' }}>
      {children}
      <Divider />
      <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
          onClick={(e) => e.stopPropagation()}
          sx={{ 
            flex: 1,
            '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 }
          }}
        />
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            onAddCategory();
          }}
          disabled={!newCategory.trim()}
          sx={{ p: 0.5 }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
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

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addCategory(newCategory.trim());
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (e: React.MouseEvent, categoryToRemove: string) => {
    e.stopPropagation();
    e.preventDefault();
    removeCategory(categoryToRemove);
    // 현재 선택된 카테고리가 삭제되면 초기화
    if (value === categoryToRemove) {
      onChange(null);
    }
  };

  return (
    <Autocomplete
      options={categories}
      value={value}
      onChange={(_e, newValue) => onChange(newValue)}
      fullWidth={fullWidth}
      size={size}
      PaperComponent={(paperProps) => (
        <CustomPaper
          {...paperProps}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          onAddCategory={handleAddCategory}
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

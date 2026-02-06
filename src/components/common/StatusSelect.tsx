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
import { useStatusStore, Status } from '../../store/useStatusStore';

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  size?: 'small' | 'medium';
  variant?: 'standard' | 'outlined' | 'filled';
  sx?: object;
}

// 커스텀 Paper 컴포넌트 (드롭다운 하단에 추가 UI 포함)
const CustomPaper: React.FC<{
  children?: React.ReactNode;
  newLabel: string;
  setNewLabel: (value: string) => void;
  onAddStatus: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputFocus: () => void;
  onInputBlur: () => void;
}> = ({ children, newLabel, setNewLabel, onAddStatus, inputRef, onInputFocus, onInputBlur }) => {
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
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <TextField
          size="small"
          placeholder="새 상태"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && newLabel.trim()) {
              e.preventDefault();
              onAddStatus();
            }
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          inputRef={inputRef}
          sx={{ 
            flex: 1,
            '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5 }
          }}
        />
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAddStatus();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          disabled={!newLabel.trim()}
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
          }}
        >
          추가
        </Typography>
      </Box>
    </Paper>
  );
};

const StatusSelect: React.FC<StatusSelectProps> = ({
  value,
  onChange,
  size = 'small',
  variant = 'outlined',
  sx = {},
}) => {
  const { statuses, addStatus, removeStatus, getStatusLabel } = useStatusStore();
  const [newLabel, setNewLabel] = useState('');
  const [open, setOpen] = useState(false);
  const isAddInputFocused = useRef(false);
  const addInputRef = useRef<HTMLInputElement | null>(null);

  // Status 객체를 옵션으로 사용
  const selectedStatus = statuses.find(s => s.value === value) || null;

  const handleAddStatus = useCallback(() => {
    if (newLabel.trim()) {
      const statusValue = newLabel.trim().toLowerCase().replace(/\s+/g, '_');
      addStatus({ value: statusValue, label: newLabel.trim() });
      setNewLabel('');
      // 추가 후에도 드롭다운 유지
      addInputRef.current?.focus();
    }
  }, [newLabel, addStatus]);

  const handleRemoveStatus = (e: React.MouseEvent, statusValue: string) => {
    e.stopPropagation();
    e.preventDefault();
    removeStatus(statusValue);
    // 현재 선택된 상태가 삭제되면 첫 번째 상태로 변경
    if (value === statusValue && statuses.length > 1) {
      const remaining = statuses.filter(s => s.value !== statusValue);
      if (remaining.length > 0) {
        onChange(remaining[0].value);
      }
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

  // newLabel 상태 변경으로 리렌더링 후에도 포커스 유지
  React.useEffect(() => {
    if (isAddInputFocused.current && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [newLabel]);

  const handleClose = useCallback((_event: React.SyntheticEvent, reason: string) => {
    // 새 상태 입력 필드에 포커스가 있으면 닫지 않음
    if (isAddInputFocused.current) {
      return;
    }
    // blur로 닫히려 할 때도 입력 필드 확인
    if (reason === 'blur' && isAddInputFocused.current) {
      return;
    }
    setOpen(false);
  }, []);

  return (
    <Autocomplete
      options={statuses}
      value={selectedStatus}
      onChange={(_e, newValue) => {
        if (newValue) {
          onChange(newValue.value);
        }
        if (!isAddInputFocused.current) {
          setOpen(false);
        }
      }}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, val) => option.value === val.value}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={handleClose}
      size={size}
      disableClearable
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
          newLabel={newLabel}
          setNewLabel={setNewLabel}
          onAddStatus={handleAddStatus}
          inputRef={addInputRef}
          onInputFocus={handleInputFocus}
          onInputBlur={handleInputBlur}
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
            <Typography variant="body2" sx={{ flex: 1, fontSize: '0.75rem' }}>
              {option.label}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => handleRemoveStatus(e, option.value)}
              onMouseDown={(e) => e.preventDefault()}
              sx={{ 
                p: 0.25,
                opacity: 0.5,
                '&:hover': { opacity: 1, color: 'error.main' }
              }}
            >
              <CloseIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          variant={variant}
          InputProps={{
            ...params.InputProps,
            sx: {
              '& .MuiInputBase-input': { 
                py: 0, 
                px: 1, 
                fontSize: '0.75rem',
              },
            },
          }}
        />
      )}
      sx={{
        '& .MuiAutocomplete-inputRoot': {
          py: 0,
          px: 0,
        },
        ...sx
      }}
    />
  );
};

export default StatusSelect;

import React, { useState, useRef, useCallback } from 'react';
import {
  Select,
  MenuItem,
  Box,
  IconButton,
  TextField,
  Divider,
  Typography,
  ListSubheader,
  SelectChangeEvent,
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

const StatusSelect: React.FC<StatusSelectProps> = ({
  value,
  onChange,
  size = 'small',
  variant = 'outlined',
  sx = {},
}) => {
  const { statuses, addStatus, removeStatus, getStatusLabel } = useStatusStore();
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [open, setOpen] = useState(false);
  const isAddInputFocused = useRef(false);
  const addInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (event: SelectChangeEvent<string>) => {
    const selectedValue = event.target.value;
    // 특수 값이 아닌 경우에만 onChange 호출
    if (selectedValue !== '__add__') {
      onChange(selectedValue);
    }
  };

  const handleAddStatus = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (newLabel.trim()) {
      // value가 비어있으면 label을 snake_case로 변환
      const statusValue = newValue.trim() || newLabel.trim().toLowerCase().replace(/\s+/g, '_');
      addStatus({ value: statusValue, label: newLabel.trim() });
      setNewLabel('');
      setNewValue('');
      // 추가 후에도 드롭다운 유지
      addInputRef.current?.focus();
    }
  }, [newLabel, newValue, addStatus]);

  const handleInputFocus = useCallback(() => {
    isAddInputFocused.current = true;
  }, []);

  const handleInputBlur = useCallback(() => {
    isAddInputFocused.current = false;
    // 약간의 지연 후 닫기 (다른 요소로 포커스 이동 확인)
    setTimeout(() => {
      if (!isAddInputFocused.current) {
        setOpen(false);
      }
    }, 150);
  }, []);

  const handleClose = useCallback(() => {
    // 새 상태 입력 필드에 포커스가 있으면 닫지 않음
    if (isAddInputFocused.current) {
      return;
    }
    setOpen(false);
  }, []);

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

  return (
    <Select
      value={value}
      onChange={handleChange}
      size={size}
      variant={variant}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={handleClose}
      sx={{
        '& .MuiSelect-select': { py: 0, px: 1, fontSize: '0.75rem' },
        ...sx
      }}
      MenuProps={{
        autoFocus: false,
        disableAutoFocus: true,
        disableEnforceFocus: true,
        disableRestoreFocus: true,
        PaperProps: {
          sx: { maxHeight: 300 },
          onMouseDown: (e: React.MouseEvent) => {
            // Paper 영역 클릭 시 Select blur 방지
            e.preventDefault();
          }
        },
        MenuListProps: {
          autoFocus: false,
          autoFocusItem: false,
        }
      }}
      renderValue={(val) => getStatusLabel(val)}
    >
      {statuses.map((status) => (
        <MenuItem 
          key={status.value} 
          value={status.value}
          sx={{ 
            fontSize: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 0.5,
            px: 1,
          }}
        >
          <span>{status.label}</span>
          <IconButton
            size="small"
            onClick={(e) => handleRemoveStatus(e, status.value)}
            sx={{ 
              p: 0.25,
              ml: 1,
              opacity: 0.5,
              '&:hover': { opacity: 1, color: 'error.main' }
            }}
          >
            <CloseIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </MenuItem>
      ))}
      
      <Divider />
      
      <ListSubheader 
        sx={{ lineHeight: 'normal', py: 1 }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TextField
            size="small"
            placeholder="새 상태"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              e.stopPropagation();
              // onClose보다 먼저 실행되므로 여기서 플래그 설정
              isAddInputFocused.current = true;
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            inputRef={addInputRef}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && newLabel.trim()) {
                e.preventDefault();
                handleAddStatus(e);
              }
            }}
            sx={{ 
              flex: 1,
              '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5 }
            }}
          />
          <IconButton 
            size="small" 
            onClick={handleAddStatus}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              // onClose보다 먼저 실행되므로 여기서 플래그 설정
              isAddInputFocused.current = true;
            }}
            disabled={!newLabel.trim()}
            sx={{ p: 0.5 }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <Typography 
            variant="caption" 
            color="text.secondary"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            추가
          </Typography>
        </Box>
      </ListSubheader>
    </Select>
  );
};

export default StatusSelect;

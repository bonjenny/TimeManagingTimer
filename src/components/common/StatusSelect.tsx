import React, { useState } from 'react';
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

  const handleChange = (event: SelectChangeEvent<string>) => {
    const selectedValue = event.target.value;
    // 특수 값이 아닌 경우에만 onChange 호출
    if (selectedValue !== '__add__') {
      onChange(selectedValue);
    }
  };

  const handleAddStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (newLabel.trim()) {
      // value가 비어있으면 label을 snake_case로 변환
      const statusValue = newValue.trim() || newLabel.trim().toLowerCase().replace(/\s+/g, '_');
      addStatus({ value: statusValue, label: newLabel.trim() });
      setNewLabel('');
      setNewValue('');
    }
  };

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
      sx={{
        '& .MuiSelect-select': { py: 0, px: 1, fontSize: '0.75rem' },
        ...sx
      }}
      MenuProps={{
        PaperProps: {
          sx: { maxHeight: 300 }
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
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && newLabel.trim()) {
                e.preventDefault();
                handleAddStatus(e as unknown as React.MouseEvent);
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

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Box,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DeployEvent, useDeployCalendarStore } from '../../store/useDeployCalendarStore';
import { useProjectStore } from '../../store/useProjectStore';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

interface DeployEventModalProps {
  open: boolean;
  onClose: () => void;
  date: string; // "YYYY-MM-DD"
  event?: DeployEvent | null; // 수정 시 전달
}

// 진행상태 옵션
const STATUS_OPTIONS = [
  '스테이지',
  '수시',
  '테스트',
  '배포완료',
  '개발중',
  '코드리뷰',
  'hold',
];

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

const DeployEventModal: React.FC<DeployEventModalProps> = ({
  open,
  onClose,
  date,
  event,
}) => {
  const { addEvent, updateEvent, deleteEvent } = useDeployCalendarStore();
  const { projects } = useProjectStore();
  
  // 폼 상태
  const [job_code, setJobCode] = useState('');
  const [job_name, setJobName] = useState('');
  const [status, setStatus] = useState('');
  const [is_holiday, setIsHoliday] = useState(false);
  
  // 수정 모드 시 기존 데이터 로드
  useEffect(() => {
    if (event) {
      setJobCode(event.job_code || '');
      setJobName(event.job_name || '');
      setStatus(event.status || '');
      setIsHoliday(event.is_holiday || false);
    } else {
      // 초기화
      setJobCode('');
      setJobName('');
      setStatus('');
      setIsHoliday(false);
    }
  }, [event, open]);
  
  // 프로젝트 코드 선택 시 이름 자동 채우기
  const handleProjectSelect = (_: unknown, value: string | null) => {
    if (value) {
      setJobCode(value);
      // 프로젝트 이름 자동 채우기
      const project = projects.find(p => p.code === value);
      if (project && !job_name) {
        setJobName(project.name);
      }
    } else {
      setJobCode('');
    }
  };
  
  // 저장
  const handleSave = () => {
    if (!job_name.trim() && !is_holiday) {
      return; // 최소한 이름이나 휴일 체크 필요
    }
    
    const event_data = {
      date,
      job_code: job_code.trim(),
      job_name: job_name.trim(),
      status: is_holiday ? '' : status.trim(),
      is_holiday,
    };
    
    if (event) {
      updateEvent(event.id, event_data);
    } else {
      addEvent(event_data);
    }
    
    onClose();
  };
  
  // 삭제
  const handleDelete = () => {
    if (event) {
      deleteEvent(event.id);
      onClose();
    }
  };
  
  // 날짜 표시 포맷
  const formatDateDisplay = (date_str: string) => {
    const [year, month, day] = date_str.split('-');
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    const day_names = ['일', '월', '화', '수', '목', '금', '토'];
    return `${Number(month)}/${Number(day)}(${day_names[d.getDay()]})`;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    if (target.closest('[role="listbox"]')) return;
    e.preventDefault();
    e.stopPropagation();
    handleSave();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth onKeyDown={handleKeyDown}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{event ? '이벤트 수정' : '이벤트 추가'} - {formatDateDisplay(date)}</span>
          {event && (
            <IconButton type="button" onClick={handleDelete} color="error" size="small">
              <DeleteIcon />
            </IconButton>
          )}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* 휴일 체크박스 */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={is_holiday}
                  onChange={(e) => setIsHoliday(e.target.checked)}
                />
              }
              label="휴일 (빨간색으로 표시)"
            />
            
            {!is_holiday && (
              <>
                {/* 프로젝트 코드 자동완성 */}
                <Autocomplete
                  freeSolo
                  options={projects.map(p => p.code)}
                  value={job_code}
                  onChange={handleProjectSelect}
                  onInputChange={(_, value) => setJobCode(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="프로젝트 코드"
                      placeholder="A25_07788"
                      size="small"
                    />
                  )}
                  renderOption={(props, option) => {
                    const project = projects.find(p => p.code === option);
                    return (
                      <li {...props} key={option}>
                        <Box>
                          <strong>{option}</strong>
                          {project && (
                            <span style={{ marginLeft: 8, color: '#666' }}>
                              {project.name}
                            </span>
                          )}
                        </Box>
                      </li>
                    );
                  }}
                />
                
                {/* 진행상태 */}
                <Autocomplete
                  freeSolo
                  options={STATUS_OPTIONS}
                  value={status}
                  onChange={(_, value) => setStatus(value || '')}
                  onInputChange={(_, value) => setStatus(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="진행상태"
                      placeholder="스테이지, 수시 등"
                      size="small"
                    />
                  )}
                />
              </>
            )}
            
            {/* 표시명 */}
            <TextField
              label={is_holiday ? "휴일명" : "표시명"}
              value={job_name}
              onChange={(e) => setJobName(e.target.value)}
              placeholder={is_holiday ? "신정, 연차 등" : "HTML 다크모드"}
              size="small"
              fullWidth
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button type="button" onClick={onClose}>취소</Button>
          <Button type="submit" variant="contained" disabled={!job_name.trim()}>
            {event ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default DeployEventModal;

import React, { useState } from 'react';
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
  
  // 폼 상태. 부모가 열 때마다 key 를 바꿔 새로 마운트하므로 여기서 한 번만 초기화한다.
  // (useEffect 로 리셋하면 freeSolo Autocomplete 의 내부 입력값이 이전 값으로 남는다)
  const [job_code, setJobCode] = useState(event?.job_code || '');
  const [job_name, setJobName] = useState(event?.job_name || '');
  const [status, setStatus] = useState(event?.status || '');
  const [is_holiday, setIsHoliday] = useState(event?.is_holiday || false);
  
  // 프로젝트 코드가 바뀌면 표시명도 따라간다.
  // 단, 사용자가 표시명을 직접 고쳐 쓴 경우(비어있지도 않고 이전 프로젝트 이름과도 다름)는 유지.
  const handleJobCodeChange = (value: string) => {
    const code = value.trim();
    const prev_project = projects.find(p => p.code === job_code.trim());
    const next_project = projects.find(p => p.code === code);
    setJobCode(value);
    const name_is_auto = !job_name.trim() || (prev_project && job_name === prev_project.name);
    if (name_is_auto) {
      setJobName(next_project ? next_project.name : '');
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
                  onChange={(_, value) => handleJobCodeChange(value || '')}
                  onInputChange={(_, value, reason) => {
                    if (reason !== 'reset') handleJobCodeChange(value);
                  }}
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

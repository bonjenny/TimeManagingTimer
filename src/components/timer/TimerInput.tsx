import React, { useState, useMemo, useCallback } from 'react';
import { Paper, IconButton, Box, Autocomplete, TextField, Tooltip, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CloseIcon from '@mui/icons-material/Close';
import { useTimerStore, TimerLog } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import CategoryAutocomplete from '../common/CategoryAutocomplete';

const getNextHour = (): string => {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const getNextHourPlusOne = (): string => {
  const now = new Date();
  now.setHours(now.getHours() + 2, 0, 0, 0);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const TimerInput: React.FC = () => {
  const { startTimer, addLog, getRecentTitles, removeRecentTitle } = useTimerStore();
  const { projects, addProject, getProjectByCode, deleteProject } = useProjectStore();
  
  const [title, setTitle] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const [is_scheduling, setIsScheduling] = useState(false);
  const [schedule_start, setScheduleStart] = useState('');
  const [schedule_end, setScheduleEnd] = useState('');

  const recentTitles = getRecentTitles();
  
  const projectCodeOptions = useMemo(() => {
    return projects.map(p => p.code);
  }, [projects]);
  
  const projectNameOptions = useMemo(() => {
    return projects.map(p => p.name);
  }, [projects]);

  const timeToTimestamp = (time_str: string): number => {
    const [hours, minutes] = time_str.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    if (date.getTime() < Date.now()) {
      date.setDate(date.getDate() + 1);
    }
    return date.getTime();
  };

  const resetForm = () => {
    setTitle('');
    setProjectCode('');
    setProjectName('');
    setCategory(null);
    setNote('');
    setIsScheduling(false);
    setScheduleStart('');
    setScheduleEnd('');
  };

  const handleStart = () => {
    if (!title.trim()) return;
    
    if (projectCode.trim() && projectName.trim()) {
      addProject({ code: projectCode.trim(), name: projectName.trim() });
    }

    if (is_scheduling && schedule_start && schedule_end) {
      const start_ts = timeToTimestamp(schedule_start);
      const end_ts = timeToTimestamp(schedule_end);

      const scheduled_log: TimerLog = {
        id: crypto.randomUUID(),
        title: title.trim(),
        projectCode: projectCode || undefined,
        category: category || undefined,
        note: note.trim() || undefined,
        startTime: start_ts,
        endTime: end_ts > start_ts ? end_ts : start_ts + 60 * 60 * 1000,
        status: 'SCHEDULED',
        pausedDuration: 0,
      };
      addLog(scheduled_log);
    } else {
      startTimer(title, projectCode || undefined, category || undefined, note.trim() || undefined);
    }
    
    resetForm();
  };
  
  const handleProjectCodeChange = useCallback((value: string) => {
    setProjectCode(value);
    
    if (!value) {
      setProjectName('');
      return;
    }
    
    const matchedProject = getProjectByCode(value);
    if (matchedProject) {
      setProjectName(matchedProject.name);
    } else {
      const exactMatch = projects.find(p => p.code === value);
      if (exactMatch) {
        setProjectName(exactMatch.name);
      }
    }
  }, [projects, getProjectByCode]);
  
  const handleProjectNameChange = useCallback((value: string) => {
    setProjectName(value);
    
    if (!value) {
      setProjectCode('');
      return;
    }
    
    const matchedProject = projects.find(p => p.name === value);
    if (matchedProject) {
      setProjectCode(matchedProject.code);
    }
  }, [projects]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
  };

  const handleToggleScheduling = () => {
    if (!is_scheduling) {
      setScheduleStart(getNextHour());
      setScheduleEnd(getNextHourPlusOne());
    }
    setIsScheduling(!is_scheduling);
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: '2px 4px', 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%', 
        border: '1px solid',
        borderColor: is_scheduling ? 'var(--primary-color)' : 'var(--border-color)',
        bgcolor: 'var(--card-bg)',
        transition: 'all 0.2s',
        '&:focus-within': {
          borderColor: 'var(--border-focus)',
          boxShadow: '0 0 0 1px var(--border-focus)'
        }
      }}
    >
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', width: '100%', p: 1, gap: 1.5 }}>
        {/* 제목 입력 (가장 크게) */}
        <Autocomplete
          freeSolo
          options={recentTitles}
          value={title}
          onInputChange={(_e, newValue) => setTitle(newValue)}
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
                  '&.MuiAutocomplete-option': { py: 0.5, px: 1 }
                }}
              >
                <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {option}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    removeRecentTitle(option);
                  }}
                  sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField 
              {...params} 
              placeholder={is_scheduling ? "예약할 작업명을 입력하세요" : "무엇을 하고 계신가요? (Enter로 바로 시작)"} 
              variant="standard"
              InputProps={{ ...params.InputProps, disableUnderline: true }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          )}
          sx={{ flexGrow: 2, minWidth: 180 }}
        />

        {/* 프로젝트 코드 */}
        <Autocomplete
          freeSolo
          options={projectCodeOptions}
          value={projectCode}
          onInputChange={(_e, newValue) => handleProjectCodeChange(newValue || '')}
          onChange={(_e, newValue) => {
            if (newValue) {
              handleProjectCodeChange(newValue);
            }
          }}
          renderOption={(props, option) => {
            const { key, ...otherProps } = props;
            const project = projects.find(p => p.code === option);
            return (
              <Box
                key={key}
                component="li"
                {...otherProps}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  '&.MuiAutocomplete-option': { py: 0.5, px: 1 }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                    {option}
                  </Typography>
                  {project && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {project.name}
                    </Typography>
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    deleteProject(option);
                  }}
                  sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField 
              {...params} 
              placeholder="프로젝트 코드" 
              variant="standard"
              InputProps={{ ...params.InputProps, disableUnderline: true }}
              size="small"
            />
          )}
          sx={{ 
            width: 120,
            '& .MuiAutocomplete-input': { fontSize: '0.8rem', p: '0 !important' }
          }}
        />

        {/* 프로젝트 명 */}
        <Autocomplete
          freeSolo
          options={projectNameOptions}
          value={projectName}
          onInputChange={(_e, newValue) => handleProjectNameChange(newValue || '')}
          onChange={(_e, newValue) => {
            if (newValue) {
              handleProjectNameChange(newValue);
            }
          }}
          renderOption={(props, option) => {
            const { key, ...otherProps } = props;
            const project = projects.find(p => p.name === option);
            return (
              <Box
                key={key}
                component="li"
                {...otherProps}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  '&.MuiAutocomplete-option': { py: 0.5, px: 1 }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                    {option}
                  </Typography>
                  {project && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {project.code}
                    </Typography>
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (project) {
                      deleteProject(project.code);
                    }
                  }}
                  sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField 
              {...params} 
              placeholder="프로젝트 명" 
              variant="standard"
              InputProps={{ ...params.InputProps, disableUnderline: true }}
              size="small"
            />
          )}
          sx={{ 
            width: 140,
            '& .MuiAutocomplete-input': { fontSize: '0.8rem', p: '0 !important' }
          }}
        />

        {/* 카테고리 */}
        <CategoryAutocomplete
          value={category}
          onChange={(newValue) => setCategory(newValue)}
          placeholder="카테고리"
          variant="standard"
          disableUnderline
          sx={{ 
            width: 120,
            '& .MuiAutocomplete-input': { fontSize: '0.8rem', p: '0 !important' }
          }}
        />

        {/* 비고 */}
        <TextField
          placeholder="비고"
          variant="standard"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{ disableUnderline: true }}
          size="small"
          sx={{
            width: 120,
            '& .MuiInputBase-input': { fontSize: '0.8rem', p: '0 !important' }
          }}
        />

        {/* 예약 모드 토글 */}
        <Tooltip title={is_scheduling ? '예약 모드 해제' : '예약 모드'}>
          <IconButton
            size="small"
            onClick={handleToggleScheduling}
            color={is_scheduling ? 'warning' : 'default'}
            sx={{ p: '6px' }}
          >
            <ScheduleIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        {/* 시작/예약 버튼 */}
        <Tooltip title={is_scheduling ? '예약 등록' : '타이머 시작'}>
            <span>
                <IconButton 
                    color={is_scheduling ? 'warning' : 'primary'}
                    sx={{ p: '10px' }} 
                    onClick={handleStart}
                    disabled={!title.trim() || (is_scheduling && (!schedule_start || !schedule_end))}
                >
                    {is_scheduling ? <EventNoteIcon /> : <PlayArrowIcon />}
                </IconButton>
            </span>
        </Tooltip>
      </Box>

      {/* 예약 시간 설정 영역 */}
      {is_scheduling && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, pb: 1, pt: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
            예약 시간:
          </Typography>
          <TextField
            type="time"
            value={schedule_start}
            onChange={(e) => setScheduleStart(e.target.value)}
            size="small"
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={{ width: 90, '& .MuiInputBase-input': { fontSize: '0.85rem', p: '2px 0' } }}
          />
          <Typography variant="caption" color="text.secondary">~</Typography>
          <TextField
            type="time"
            value={schedule_end}
            onChange={(e) => setScheduleEnd(e.target.value)}
            size="small"
            variant="standard"
            InputProps={{ disableUnderline: true }}
            onKeyDown={handleKeyDown}
            sx={{ width: 90, '& .MuiInputBase-input': { fontSize: '0.85rem', p: '2px 0' } }}
          />
        </Box>
      )}
    </Paper>
  );
};

export default TimerInput;

import React, { useState, useMemo, useCallback } from 'react';
import { Paper, IconButton, Box, Autocomplete, TextField, Tooltip, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';
import { useTimerStore } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import CategoryAutocomplete from '../common/CategoryAutocomplete';

const TimerInput: React.FC = () => {
  const { startTimer, getRecentTitles, removeRecentTitle } = useTimerStore();
  const { projects, addProject, getProjectByCode, deleteProject } = useProjectStore();
  
  const [title, setTitle] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const recentTitles = getRecentTitles();
  
  // 프로젝트 코드 옵션
  const projectCodeOptions = useMemo(() => {
    return projects.map(p => p.code);
  }, [projects]);
  
  // 프로젝트 명 옵션
  const projectNameOptions = useMemo(() => {
    return projects.map(p => p.name);
  }, [projects]);

  const handleStart = () => {
    if (!title.trim()) return;
    
    // 프로젝트 코드와 이름이 있으면 저장
    if (projectCode.trim() && projectName.trim()) {
      addProject({ code: projectCode.trim(), name: projectName.trim() });
    }
    
    startTimer(title, projectCode || undefined, category || undefined);
    
    // 초기화
    setTitle('');
    setProjectCode('');
    setProjectName('');
    setCategory(null);
  };
  
  // 프로젝트 코드 입력 처리 - 일치하는 프로젝트 명 자동완성
  const handleProjectCodeChange = useCallback((value: string) => {
    setProjectCode(value);
    
    // 빈 값이면 프로젝트 명도 제거
    if (!value) {
      setProjectName('');
      return;
    }
    
    // localStorage에서 일치하는 프로젝트 찾기
    const matchedProject = getProjectByCode(value);
    if (matchedProject) {
      setProjectName(matchedProject.name);
    } else {
      // 부분 일치도 확인 (코드가 정확히 일치하는 경우만)
      const exactMatch = projects.find(p => p.code === value);
      if (exactMatch) {
        setProjectName(exactMatch.name);
      }
    }
  }, [projects, getProjectByCode]);
  
  // 프로젝트 명 입력 처리 - 일치하는 프로젝트 코드 자동완성
  const handleProjectNameChange = useCallback((value: string) => {
    setProjectName(value);
    
    // 빈 값이면 프로젝트 코드도 제거
    if (!value) {
      setProjectCode('');
      return;
    }
    
    // localStorage에서 일치하는 프로젝트 찾기 (이름으로)
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

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: '2px 4px', 
        display: 'flex', 
        alignItems: 'center', 
        width: '100%', 
        border: '1px solid',
        borderColor: 'var(--border-color)',
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
              placeholder="무엇을 하고 계신가요? (Enter로 바로 시작)" 
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
            // 키보드로 옵션 선택 시에도 프로젝트명 연동
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
            // 키보드로 옵션 선택 시에도 프로젝트 코드 연동
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

        {/* 시작 버튼 */}
        <Tooltip title="타이머 시작">
            <span>
                <IconButton 
                    color="primary" 
                    sx={{ p: '10px' }} 
                    onClick={handleStart}
                    disabled={!title.trim()}
                >
                    <PlayArrowIcon />
                </IconButton>
            </span>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default TimerInput;

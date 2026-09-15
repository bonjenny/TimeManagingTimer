import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Paper, IconButton, Box, Autocomplete, TextField, Tooltip, Typography, Button, Collapse, FormControlLabel, Switch, useMediaQuery, useTheme } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CloseIcon from '@mui/icons-material/Close';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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

// 모바일(md 미만) 입력칸: 전체 너비 + 16px 글자 (iOS 자동 확대 방지)
const COMPACT_FIELD_SX = { width: '100%', '& .MuiInputBase-input': { fontSize: 16 } };

const TimerInput: React.FC = () => {
  const { startTimer, addLog, getRecentTitles, removeRecentTitle } = useTimerStore();
  const { projects, addProject, getProjectByCode, deleteProject } = useProjectStore();
  const theme = useTheme();
  const is_compact = useMediaQuery(theme.breakpoints.down('md'));

  const [title, setTitle] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const [is_scheduling, setIsScheduling] = useState(false);
  const [schedule_start, setScheduleStart] = useState('');
  const [schedule_end, setScheduleEnd] = useState('');

  // 모바일 전용: 상세 입력 패널 펼침 상태 (예약 모드이거나 보조 칸에 값이 있으면 자동으로 펼친다)
  const [is_detail_open, setIsDetailOpen] = useState(false);
  const has_detail_value = !!(projectCode || projectName || category || note);
  useEffect(() => {
    if (is_scheduling || has_detail_value) setIsDetailOpen(true);
  }, [is_scheduling, has_detail_value]);

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
    setIsDetailOpen(false);
  };

  const handleAddTodo = () => {
    if (!title.trim()) return;
    if (projectCode.trim() && projectName.trim()) {
      addProject({ code: projectCode.trim(), name: projectName.trim() });
    }
    // 업무 기록에 "미완료(일시정지) 0분" 세션으로 넣는다. ▶ 로 시작하면 같은 업무의 새 세션이 이어진다.
    const now = Date.now();
    addLog({
      id: crypto.randomUUID(),
      title: title.trim(),
      projectCode: projectCode.trim() || undefined,
      category: category || undefined,
      note: note.trim() || undefined,
      startTime: now,
      endTime: now,
      lastPausedAt: now,
      status: 'PAUSED',
      pausedDuration: 0,
      isTodo: true,
    });
    resetForm();
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

    // 이름을 지워도 코드는 유지한다 (코드만 넣고 이름을 다시 쓰는 흐름). 코드 지우기는 코드 칸에서.
    if (!value) return;

    const matchedProject = projects.find(p => p.name === value);
    if (matchedProject) {
      setProjectCode(matchedProject.code);
    }
  }, [projects]);

  // Enter: 시작(예약 모드면 예약 등록) / Ctrl+Enter: 할 일로 추가 / Alt+Enter: 예약 모드 켜기(켜져 있으면 예약 등록)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      handleAddTodo();
    } else if (e.altKey && !is_scheduling) {
      handleToggleScheduling();
    } else {
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

  const is_start_disabled = !title.trim() || (is_scheduling && (!schedule_start || !schedule_end));

  // 모바일은 outlined 입력칸, 데스크톱은 밑줄 없는 standard 입력칸
  const field_variant = is_compact ? 'outlined' : 'standard';
  const withUnderlineOff = <T extends object>(input_props?: T) =>
    is_compact ? input_props : { ...input_props, disableUnderline: true };

  // ---- 입력칸 (데스크톱/모바일 공용) ----
  const title_field = (
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
          autoFocus={!is_compact} // 모바일은 진입 시 키보드가 튀어나오지 않게
        />
      )}
      sx={is_compact
        ? { flex: 1, minWidth: 0, '& .MuiInputBase-input': { fontSize: 16 } }
        : { flexGrow: 2, minWidth: 180 }}
    />
  );

  const project_code_field = (
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
          variant={field_variant}
          InputProps={withUnderlineOff(params.InputProps)}
          size="small"
        />
      )}
      sx={is_compact ? COMPACT_FIELD_SX : {
        width: 120,
        '& .MuiAutocomplete-input': { fontSize: '0.8rem', p: '0 !important' }
      }}
    />
  );

  const project_name_field = (
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
          variant={field_variant}
          InputProps={withUnderlineOff(params.InputProps)}
          size="small"
        />
      )}
      sx={is_compact ? COMPACT_FIELD_SX : {
        width: 140,
        '& .MuiAutocomplete-input': { fontSize: '0.8rem', p: '0 !important' }
      }}
    />
  );

  const category_field = (
    <CategoryAutocomplete
      value={category}
      onChange={(newValue) => setCategory(newValue)}
      placeholder="카테고리"
      variant={field_variant}
      size={is_compact ? 'small' : undefined}
      disableUnderline={!is_compact}
      sx={is_compact ? COMPACT_FIELD_SX : {
        width: 120,
        '& .MuiAutocomplete-input': { fontSize: '0.8rem', p: '0 !important' }
      }}
    />
  );

  const note_field = (
    <TextField
      placeholder="비고"
      variant={field_variant}
      value={note}
      onChange={(e) => setNote(e.target.value)}
      onKeyDown={handleKeyDown}
      InputProps={withUnderlineOff({})}
      size="small"
      sx={is_compact ? COMPACT_FIELD_SX : {
        width: 120,
        '& .MuiInputBase-input': { fontSize: '0.8rem', p: '0 !important' }
      }}
    />
  );

  const renderTimeField = (value: string, onChange: (v: string) => void, with_key_down: boolean) => (
    <TextField
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      variant="standard"
      InputProps={{ disableUnderline: true }}
      onKeyDown={with_key_down ? handleKeyDown : undefined}
      sx={is_compact
        ? { flex: 1, minWidth: 0, '& .MuiInputBase-input': { fontSize: 16, p: '4px 0' } }
        : { width: 130, '& .MuiInputBase-input': { fontSize: '0.85rem', p: '2px 0' } }}
    />
  );

  const schedule_start_field = renderTimeField(schedule_start, setScheduleStart, false);
  const schedule_end_field = renderTimeField(schedule_end, setScheduleEnd, true);

  // ---- 모바일 (md 미만) ----
  if (is_compact) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          border: '1px solid',
          borderColor: is_scheduling ? 'var(--primary-color)' : 'var(--border-color)',
          borderRadius: 2,
          bgcolor: 'var(--card-bg)',
          transition: 'all 0.2s',
        }}
      >
        {/* 1줄: 제목 + 시작(예약 등록) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
          {title_field}
          <IconButton
            onClick={handleStart}
            disabled={is_start_disabled}
            aria-label={is_scheduling ? '예약 등록' : '타이머 시작'}
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              color: '#fff',
              bgcolor: is_scheduling ? 'warning.main' : 'primary.main',
              '&:hover': { bgcolor: is_scheduling ? 'warning.dark' : 'primary.dark' },
              '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
            }}
          >
            {is_scheduling ? <EventNoteIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Box>

        <Button
          size="small"
          onClick={() => setIsDetailOpen(!is_detail_open)}
          endIcon={is_detail_open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ alignSelf: 'flex-start', color: 'text.secondary', whiteSpace: 'nowrap', minHeight: 36, ml: 0.5 }}
        >
          {is_detail_open ? '접기' : '상세 입력'}
        </Button>

        <Collapse in={is_detail_open}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 0.5, pb: 0.5 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
              {project_code_field}
              {project_name_field}
            </Box>
            {category_field}
            {note_field}

            {is_scheduling && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.5,
                  border: '1px solid',
                  borderColor: 'warning.main',
                  borderRadius: 1,
                  bgcolor: 'rgba(237, 108, 2, 0.06)',
                }}
              >
                <ScheduleIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                {schedule_start_field}
                <Typography variant="body2" color="text.secondary">~</Typography>
                {schedule_end_field}
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <FormControlLabel
                control={<Switch checked={is_scheduling} onChange={handleToggleScheduling} color="warning" />}
                label="예약"
                sx={{ ml: 0, minHeight: 44 }}
              />
              {!is_scheduling && (
                <Button
                  variant="outlined"
                  startIcon={<PlaylistAddIcon />}
                  onClick={handleAddTodo}
                  disabled={!title.trim()}
                  sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
                >
                  할 일로 추가
                </Button>
              )}
            </Box>
          </Box>
        </Collapse>
      </Paper>
    );
  }

  // ---- 데스크톱 ----
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
        {title_field}

        {/* 프로젝트 코드 */}
        {project_code_field}

        {/* 프로젝트 명 */}
        {project_name_field}

        {/* 카테고리 */}
        {category_field}

        {/* 비고 */}
        {note_field}

        {/* 예약 모드 토글 */}
        <Tooltip title={is_scheduling ? '예약 모드 해제' : '예약 모드 (Alt+Enter)'}>
          <IconButton
            size="small"
            onClick={handleToggleScheduling}
            color={is_scheduling ? 'warning' : 'default'}
            sx={{ p: '6px' }}
          >
            <ScheduleIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        {/* 할 일로 추가 (시작하지 않고 목록에만 저장) */}
        {!is_scheduling && (
          <Tooltip title="할 일로 추가 - 업무 기록에 미완료로 등록 (Ctrl+Enter)">
            <span>
              <IconButton size="small" onClick={handleAddTodo} disabled={!title.trim()} sx={{ p: '6px' }}>
                <PlaylistAddIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {/* 시작/예약 버튼 */}
        <Tooltip title={is_scheduling ? '예약 등록 (Enter)' : '타이머 시작 (Enter)'}>
            <span>
                <IconButton
                    color={is_scheduling ? 'warning' : 'primary'}
                    sx={{ p: '10px' }}
                    onClick={handleStart}
                    disabled={is_start_disabled}
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
          {schedule_start_field}
          <Typography variant="caption" color="text.secondary">~</Typography>
          {schedule_end_field}
        </Box>
      )}
    </Paper>
  );
};

export default TimerInput;

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Box, Typography, Button, Paper, Chip, IconButton, TextField, Autocomplete, ClickAwayListener, useMediaQuery, useTheme } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CheckIcon from '@mui/icons-material/Check';
import { useTimerStore } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTimerLogic } from '../../hooks/useTimerLogic';
import { formatTimeDisplay, formatDuration, formatDurationShort } from '../../utils/timeUtils';
import CategoryAutocomplete from '../common/CategoryAutocomplete';

const ActiveTimer: React.FC = () => {
  const { activeTimer, elapsedSeconds, showSeconds } = useTimerLogic();
  const { logs, resumeTimer, completeTimer, updateActiveTimer, pauseAndMoveToLogs } = useTimerStore();
  const { projects, getProjectName, addProject } = useProjectStore();
  const theme = useTheme();
  const is_compact = useMediaQuery(theme.breakpoints.down('md'));

  // 제목 편집 상태
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // 카테고리 편집 상태
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  // 프로젝트 편집 상태
  const [isEditingProject, setIsEditingProject] = useState(false);

  // 비고 편집 상태
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNote, setEditNote] = useState('');
  const noteInputRef = useRef<HTMLInputElement>(null);

  // 프로젝트 옵션 (코드 + 이름 형태로 표시)
  const projectOptions = projects.map(p => ({ code: p.code, label: `[${p.code}] ${p.name}` }));

  // 같은 제목의 모든 로그 누적 시간 계산 (현재 세션 포함)
  const totalAccumulatedSeconds = useMemo(() => {
    if (!activeTimer) return 0;

    // 같은 제목의 로그들의 시간 합산
    const completed_duration = logs
      .filter(log => log.title === activeTimer.title)
      .reduce((sum, log) => {
        // PAUSED 상태는 endTime 또는 lastPausedAt을 종료 시간으로 사용
        // COMPLETED 상태는 endTime을 사용
        // endTime도 lastPausedAt도 없으면 startTime을 사용 (0초)
        const end = log.endTime || log.lastPausedAt || log.startTime;
        const rawDurationSec = (end - log.startTime) / 1000;
        // pausedDuration이 전체 duration보다 크면 비정상 데이터로 무시
        const safePaused = log.pausedDuration > rawDurationSec ? 0 : log.pausedDuration;
        const duration = Math.floor(rawDurationSec - safePaused);
        return sum + Math.max(0, duration);
      }, 0);

    // 현재 진행 중인 세션 시간 추가
    return completed_duration + elapsedSeconds;
  }, [activeTimer, logs, elapsedSeconds]);

  // 제목 편집 시작
  const handleTitleClick = () => {
    if (activeTimer) {
      setEditTitle(activeTimer.title);
      setIsEditingTitle(true);
    }
  };

  // 제목 저장
  const handleTitleSave = () => {
    if (activeTimer && editTitle.trim() && editTitle.trim() !== activeTimer.title) {
      updateActiveTimer({ title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  // 제목 편집 취소
  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setEditTitle('');
  };

  // 편집 모드 진입 시 input에 포커스
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // 비고 편집 시작
  const handleNoteClick = () => {
    if (activeTimer) {
      setEditNote(activeTimer.note || '');
      setIsEditingNote(true);
    }
  };

  // 비고 저장
  const handleNoteSave = () => {
    if (activeTimer && editNote.trim() !== (activeTimer.note || '')) {
      updateActiveTimer({ note: editNote.trim() || undefined });
    }
    setIsEditingNote(false);
  };

  // 비고 편집 취소
  const handleNoteCancel = () => {
    setIsEditingNote(false);
    setEditNote('');
  };

  useEffect(() => {
    if (isEditingNote && noteInputRef.current) {
      noteInputRef.current.focus();
      noteInputRef.current.select();
    }
  }, [isEditingNote]);

  if (!activeTimer) {
    return null;
  }

  const isRunning = activeTimer.status === 'RUNNING';

  // ---- 표시 조각 (데스크톱/모바일 공용) ----
  const status_chip = (
    <Chip
      label={isRunning ? "진행 중" : "일시정지"}
      color={isRunning ? "primary" : "default"}
      size="small"
      variant="outlined"
    />
  );

  const category_chip = isEditingCategory ? (
    <ClickAwayListener onClickAway={() => setIsEditingCategory(false)}>
      <Box sx={{ minWidth: 120 }}>
        <CategoryAutocomplete
          value={activeTimer.category || null}
          onChange={(newValue) => {
            updateActiveTimer({ category: newValue || undefined });
            setIsEditingCategory(false);
          }}
          size="small"
          variant="standard"
          placeholder="카테고리"
          autoFocus
        />
      </Box>
    </ClickAwayListener>
  ) : (
    <Chip
      label={activeTimer.category || '카테고리 추가'}
      size="small"
      onClick={() => setIsEditingCategory(true)}
      sx={{
        bgcolor: activeTimer.category ? 'var(--bg-hover)' : 'transparent',
        color: activeTimer.category ? 'var(--text-secondary)' : 'var(--text-disabled)',
        cursor: 'pointer',
        border: activeTimer.category ? 'none' : '1px dashed var(--border-color)',
        '&:hover': { bgcolor: 'var(--bg-hover)' }
      }}
    />
  );

  const project_chip = isEditingProject ? (
    <ClickAwayListener onClickAway={() => setIsEditingProject(false)}>
      <Box sx={{ minWidth: 150 }}>
        <Autocomplete
          size="small"
          options={projectOptions}
          getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
          value={projectOptions.find(p => p.code === activeTimer.projectCode) || null}
          onChange={(_e, newValue) => {
            if (newValue && typeof newValue !== 'string') {
              updateActiveTimer({ projectCode: newValue.code });
            } else if (typeof newValue === 'string' && newValue.trim()) {
              // 직접 타이핑: "[코드] 이름" / 코드 / 이름 → 기존 프로젝트, 없으면 코드로 새 프로젝트 등록
              const text = newValue.trim();
              const code = text.match(/^\[([^\]]+)\]/)?.[1] || text;
              const found = projects.find(
                (p) => p.code.toLowerCase() === code.toLowerCase() || p.name === text
              );
              if (!found) addProject({ code, name: code });
              updateActiveTimer({ projectCode: found ? found.code : code });
            } else {
              updateActiveTimer({ projectCode: undefined });
            }
            setIsEditingProject(false);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              placeholder="프로젝트"
              autoFocus
              onFocus={(e) => e.target.select()} // 칩 클릭으로 열리면 selectOnFocus 가 안 먹어 직접 전체 선택
              sx={{ '& .MuiInput-root': { fontSize: is_compact ? 16 : '0.75rem' } }}
            />
          )}
          freeSolo
          autoHighlight
          autoSelect
          selectOnFocus
          openOnFocus
        />
      </Box>
    </ClickAwayListener>
  ) : (
    <Chip
      label={activeTimer.projectCode ? getProjectName(activeTimer.projectCode) : '프로젝트 추가'}
      size="small"
      variant="outlined"
      onClick={() => setIsEditingProject(true)}
      sx={{
        height: 20,
        fontSize: '0.65rem',
        cursor: 'pointer',
        borderStyle: activeTimer.projectCode ? 'solid' : 'dashed',
        color: activeTimer.projectCode ? 'inherit' : 'var(--text-disabled)',
        '&:hover': { bgcolor: 'var(--bg-hover)' },
        ...(is_compact && { maxWidth: '100%' }),
      }}
      title={activeTimer.projectCode ? `[${activeTimer.projectCode}]` : '클릭하여 프로젝트 추가'}
    />
  );

  const title_node = isEditingTitle ? (
    <TextField
      inputRef={titleInputRef}
      value={editTitle}
      onChange={(e) => setEditTitle(e.target.value)}
      onBlur={handleTitleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleTitleSave();
        }
        if (e.key === 'Escape') {
          handleTitleCancel();
        }
      }}
      variant="standard"
      fullWidth
      InputProps={{
        disableUnderline: true,
        sx: {
          fontSize: is_compact ? 18 : '1.5rem',
          fontWeight: 700,
          lineHeight: 1.334,
          py: 0,
        }
      }}
      sx={{ mb: 0.5 }}
    />
  ) : (
    <Typography
      variant="h5"
      sx={{
        fontWeight: 700,
        mb: 0.5,
        cursor: 'pointer',
        borderRadius: 1,
        px: 0.5,
        mx: -0.5,
        '&:hover': {
          bgcolor: 'action.hover',
        },
        ...(is_compact && { fontSize: 18, lineHeight: 1.35, overflowWrap: 'anywhere' }),
      }}
      onClick={handleTitleClick}
      title="클릭하여 제목 수정"
    >
      {activeTimer.title}
    </Typography>
  );

  const note_chip = isEditingNote ? (
    <ClickAwayListener onClickAway={handleNoteCancel}>
      <TextField
        inputRef={noteInputRef}
        value={editNote}
        onChange={(e) => setEditNote(e.target.value)}
        onBlur={handleNoteSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleNoteSave();
          }
          if (e.key === 'Escape') {
            handleNoteCancel();
          }
        }}
        variant="standard"
        placeholder="비고"
        size="small"
        InputProps={{
          disableUnderline: true,
          sx: { fontSize: is_compact ? 16 : '0.8rem' }
        }}
        sx={{ minWidth: 150 }}
      />
    </ClickAwayListener>
  ) : (
    <Chip
      label={activeTimer.note || '비고 추가'}
      size="small"
      onClick={handleNoteClick}
      sx={{
        height: 20,
        fontSize: '0.7rem',
        cursor: 'pointer',
        borderStyle: activeTimer.note ? 'solid' : 'dashed',
        borderWidth: 1,
        borderColor: activeTimer.note ? 'transparent' : 'var(--border-color)',
        bgcolor: activeTimer.note ? 'var(--bg-secondary)' : 'transparent',
        color: activeTimer.note ? 'text.secondary' : 'text.disabled',
        '&:hover': { bgcolor: 'var(--bg-hover)' },
        ...(is_compact && { maxWidth: '100%' }),
      }}
      title={activeTimer.note ? activeTimer.note : '클릭하여 비고 추가'}
    />
  );

  const time_font_sx = is_compact ? { fontSize: 40 } : {};
  const elapsed_node = (
    // 00:00:00 형태로 표시, 5초 이후 초 부분 fade out
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: is_compact ? 'center' : { xs: 'flex-start', md: 'flex-end' }
      }}
    >
      <Typography
        variant="h3"
        sx={{
          fontWeight: 300,
          fontFamily: 'monospace',
          letterSpacing: '-2px',
          lineHeight: 1,
          ...time_font_sx,
        }}
      >
        {formatTimeDisplay(elapsedSeconds)}
      </Typography>
      {/* 초 부분: 시작/재개 후 5초 동안 표시 */}
      <Typography
        variant="h3"
        sx={{
          fontWeight: 300,
          fontFamily: 'monospace',
          letterSpacing: '-2px',
          lineHeight: 1,
          opacity: showSeconds ? 1 : 0,
          maxWidth: showSeconds ? '100px' : 0,
          overflow: 'hidden',
          transition: 'opacity 0.5s ease-out, max-width 0.3s ease-out',
          whiteSpace: 'nowrap',
          color: 'text.secondary',
          ...time_font_sx,
        }}
      >
        :{String(elapsedSeconds % 60).padStart(2, '0')}
      </Typography>
    </Box>
  );

  const accumulated_node = (
    <Typography
      variant="body2"
      sx={{
        mt: 0.5,
        color: 'text.primary',
        fontWeight: 500
      }}
    >
      {formatDuration(totalAccumulatedSeconds)}
    </Typography>
  );

  const status_bar = (
    // 상태 표시줄 (좌측 라인)
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderRadius: '4px 0 0 4px',
        bgcolor: isRunning ? 'primary.main' : 'text.disabled'
      }}
    />
  );

  const paper_sx = {
    border: '1px solid',
    borderColor: isRunning ? 'primary.main' : 'var(--border-color)',
    bgcolor: 'var(--card-bg)',
    position: 'relative',
    // overflow hidden 금지: 카테고리 드롭다운(disablePortal)이 카드 밖으로 못 나가 잘린다
    transition: 'background-color 0.3s ease, border-color 0.3s ease'
  } as const;

  // ---- 모바일 (md 미만): 히어로 카드 ----
  if (is_compact) {
    const start_label = new Date(activeTimer.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    return (
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          p: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: isRunning ? 'color-mix(in srgb, var(--primary-color) 35%, transparent)' : 'var(--border-color)',
          // 진행 중이면 옅은 브랜드색 바탕, 일시정지면 기본 카드
          background: isRunning
            ? 'linear-gradient(180deg, color-mix(in srgb, var(--primary-color) 9%, var(--card-bg)) 0%, var(--card-bg) 100%) !important'
            : undefined,
        }}
      >
        {/* 상태 + 분류 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25, flexWrap: 'wrap', minWidth: 0 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1,
              height: 24,
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              color: isRunning ? 'var(--primary-color)' : 'text.secondary',
              bgcolor: isRunning ? 'color-mix(in srgb, var(--primary-color) 14%, transparent)' : 'var(--bg-hover)',
            }}
          >
            <Box
              component="span"
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: 'currentColor',
                animation: isRunning ? 'tk-pulse 1.6s ease-in-out infinite' : 'none',
                '@keyframes tk-pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.25 } },
              }}
            />
            {isRunning ? '진행 중' : '일시정지'}
          </Box>
          {category_chip}
          <Box sx={{ minWidth: 0, maxWidth: '60%', display: 'flex' }}>{project_chip}</Box>
        </Box>

        {title_node}

        {/* 비고: 칩이 아니라 제목 아래 한 줄로 */}
        {isEditingNote ? (
          note_chip
        ) : (
          <Typography
            onClick={handleNoteClick}
            sx={{
              fontSize: 13,
              lineHeight: 1.5,
              color: activeTimer.note ? 'text.secondary' : 'text.disabled',
              cursor: 'pointer',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              overflowWrap: 'anywhere',
            }}
          >
            {activeTimer.note || '+ 비고 추가'}
          </Typography>
        )}

        {/* 경과 시간 */}
        <Box sx={{ textAlign: 'center', mt: 2.5, mb: 2.5 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'baseline', fontVariantNumeric: 'tabular-nums' }}>
            <Typography sx={{ fontSize: 52, fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1, color: 'text.primary' }}>
              {formatTimeDisplay(elapsedSeconds)}
            </Typography>
            <Typography
              sx={{
                fontSize: 28,
                fontWeight: 600,
                lineHeight: 1,
                color: 'text.secondary',
                opacity: showSeconds ? 1 : 0,
                maxWidth: showSeconds ? 60 : 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.5s ease-out, max-width 0.3s ease-out',
              }}
            >
              :{String(elapsedSeconds % 60).padStart(2, '0')}
            </Typography>
          </Box>
          <Typography sx={{ mt: 0.75, fontSize: 13, color: 'text.secondary' }}>
            누적 <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{formatDurationShort(totalAccumulatedSeconds)}</Box>
            {' · '}{start_label} 시작
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={isRunning ? <PauseIcon /> : <PlayArrowIcon />}
            onClick={isRunning ? pauseAndMoveToLogs : resumeTimer}
            sx={{ flex: 1, height: 48, borderRadius: 3, whiteSpace: 'nowrap', fontWeight: 600, bgcolor: 'var(--card-bg)' }}
          >
            {isRunning ? '세션 종료' : '재개'}
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckIcon />}
            onClick={completeTimer}
            sx={{
              flex: 1,
              height: 48,
              borderRadius: 3,
              whiteSpace: 'nowrap',
              fontWeight: 700,
              bgcolor: 'var(--primary-color)',
              color: 'white',
              '&:hover': { bgcolor: 'var(--accent-color)' },
            }}
          >
            완료
          </Button>
        </Box>
      </Paper>
    );
  }

  // ---- 데스크톱 ----
  return (
    <Paper
      elevation={0}
      sx={{ p: 3, ...paper_sx }}
    >
      {status_bar}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, gap: 2 }}>
        {/* 타이머 정보 */}
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            {status_chip}
            {/* 카테고리 편집 */}
            {category_chip}
            {/* 프로젝트 편집 */}
            {project_chip}
          </Box>
          {title_node}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              시작: {new Date(activeTimer.startTime).toLocaleTimeString()}
            </Typography>

            {/* 비고 편집 */}
            {note_chip}
          </Box>
        </Box>

        {/* 시간 표시 */}
        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
          {elapsed_node}
          {accumulated_node}
        </Box>

        {/* 컨트롤 버튼 */}
        <Box sx={{ display: 'flex', gap: 1, mt: { xs: 2, md: 0 }, alignItems: 'center' }}>
          <IconButton
            onClick={isRunning ? pauseAndMoveToLogs : resumeTimer}
            color="primary"
            sx={{
              width: 40,
              height: 40,
              border: '1px solid',
              borderColor: isRunning ? 'primary.main' : 'divider',
              bgcolor: isRunning ? 'var(--bg-hover)' : 'transparent'
            }}
          >
            {isRunning ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          <Button
            variant="contained"
            startIcon={<CheckIcon />}
            onClick={completeTimer}
            sx={{
                bgcolor: 'var(--primary-color)',
                color: 'white',
                '&:hover': { bgcolor: 'var(--accent-color)' }
            }}
          >
            완료
          </Button>
        </Box>
      </Box>

    </Paper>
  );
};

export default ActiveTimer;

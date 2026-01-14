import React, { useState } from 'react';
import { Paper, IconButton, Box, Autocomplete, TextField, Tooltip, InputBase } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTimerStore } from '../../store/useTimerStore';

const CATEGORIES = ['분석', '개발', '개발자테스트', '테스트오류수정', '센터오류수정', '환경세팅', '회의', '기타'];

const TimerInput: React.FC = () => {
  const { startTimer, getRecentTitles } = useTimerStore();
  const [title, setTitle] = useState('');
  const [boardNo, setBoardNo] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const recentTitles = getRecentTitles(); // 매 렌더링마다 계산? 성능 이슈? -> 일단 컴포넌트 내부 호출. 필요시 useMemo

  const handleStart = () => {
    if (!title.trim()) return;
    
    startTimer(title, boardNo, category || undefined);
    
    // 초기화
    setTitle('');
    setBoardNo('');
    setCategory(null);
  };

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
        border: '1px solid #eaeaea',
        mb: 3,
        transition: 'all 0.2s',
        '&:focus-within': {
          borderColor: '#000',
          boxShadow: '0 0 0 1px #000'
        }
      }}
    >
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', width: '100%', p: 1, gap: 2 }}>
        {/* 제목 입력 (가장 크게) */}
        <Autocomplete
          freeSolo
          options={recentTitles}
          value={title}
          onInputChange={(_e, newValue) => setTitle(newValue)}
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
          sx={{ flexGrow: 2, minWidth: 200 }}
        />
        

        {/* 게시판 번호 */}
        <InputBase
          placeholder="게시판 번호"
          value={boardNo}
          onChange={(e) => setBoardNo(e.target.value)}
          sx={{ 
            width: 100,
            fontSize: '0.875rem'
          }}
        />

        {/* 카테고리 */}
        <Autocomplete
          options={CATEGORIES}
          value={category}
          onChange={(_e, newValue) => setCategory(newValue)}
          renderInput={(params) => (
            <TextField 
              {...params} 
              placeholder="카테고리" 
              variant="standard" 
              InputProps={{ ...params.InputProps, disableUnderline: true }} 
            />
          )}
          sx={{ 
            width: 150,
            '& .MuiAutocomplete-input': { fontSize: '0.875rem', p: '0 !important' }
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

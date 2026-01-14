import React, { useState } from 'react';
import { Paper, InputBase, IconButton, Box, Autocomplete, TextField, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import { useTimerStore } from '../../store/useTimerStore';

const CATEGORIES = ['분석', '개발', '개발자테스트', '테스트오류수정', '센터오류수정', '환경세팅', '회의', '기타'];

const TimerInput: React.FC = () => {
  const { startTimer, recentTitles, activeTimer } = useTimerStore();
  const [title, setTitle] = useState('');
  const [boardNo, setBoardNo] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // 진행 중인 타이머가 있으면 입력을 비활성화할지, 아니면 입력하면 바로 교체할지 결정
  // PRD 82: "새 타이머 시작 시 기존 ... 자동 일시정지" -> 즉, 언제든 입력 가능
  
  const handleStart = () => {
    if (!title.trim()) return;
    
    startTimer(title, boardNo, category || undefined);
    
    // 초기화
    setTitle('');
    setBoardNo('');
    setCategory(null);
    setShowDetails(false); // 입력 후 상세 닫기? 선택사항
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
        flexWrap: 'wrap',
        transition: 'all 0.2s',
        '&:focus-within': {
          borderColor: '#000',
          boxShadow: '0 0 0 1px #000'
        }
      }}
    >
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', width: '100%', p: 1 }}>
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
              sx={{ flexGrow: 1 }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          )}
          sx={{ flexGrow: 1, mr: 2 }}
        />
        
        <Tooltip title={showDetails ? "상세 입력 닫기" : "상세 정보 입력 (게시판번호, 카테고리)"}>
          <IconButton sx={{ p: '10px' }} onClick={() => setShowDetails(!showDetails)}>
            <AddIcon color={showDetails ? 'primary' : 'inherit'} />
          </IconButton>
        </Tooltip>

        <Box sx={{ width: 1, height: 28, mx: 1, bgcolor: 'divider' }} />

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
      
      {/* 상세 입력 필드 (토글됨) */}
      {showDetails && (
        <Box sx={{ width: '100%', px: 2, pb: 2, display: 'flex', gap: 2, alignItems: 'center', borderTop: '1px solid #eaeaea', pt: 2 }}>
            <InputBase
                placeholder="게시판 번호 (선택)"
                value={boardNo}
                onChange={(e) => setBoardNo(e.target.value)}
                sx={{ 
                    border: '1px solid #eaeaea', 
                    borderRadius: 1, 
                    px: 1, 
                    py: 0.5,
                    fontSize: '0.875rem'
                }}
            />
            
            <Autocomplete
                options={CATEGORIES}
                value={category}
                onChange={(_e, newValue) => setCategory(newValue)}
                renderInput={(params) => (
                    <TextField 
                        {...params} 
                        placeholder="카테고리 (선택)" 
                        variant="standard" 
                        InputProps={{ ...params.InputProps, disableUnderline: true }} 
                    />
                )}
                sx={{ 
                    width: 200,
                    border: '1px solid #eaeaea', 
                    borderRadius: 1, 
                    px: 1, 
                    py: 0.5,
                    '& .MuiAutocomplete-input': { fontSize: '0.875rem', p: '0 !important' }
                }}
            />
        </Box>
      )}
    </Paper>
  );
};

export default TimerInput;

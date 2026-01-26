import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  Typography,
  InputAdornment,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { useTimerStore } from '../../store/useTimerStore';

const CATEGORIES = ['분석', '개발', '개발자테스트', '테스트오류수정', '센터오류수정', '환경세팅', '회의', '기타'];

interface NewTaskModalProps {
  open: boolean;
  onClose: () => void;
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({ open, onClose }) => {
  const { startTimer, getRecentTitles } = useTimerStore();
  const [title, setTitle] = useState('');
  const [board_no, setBoardNo] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const title_input_ref = useRef<HTMLInputElement>(null);

  const recent_titles = getRecentTitles();

  // 모달이 열릴 때 제목 입력창에 포커스
  useEffect(() => {
    if (open) {
      // 약간의 딜레이 후 포커스 (Dialog 애니메이션 완료 후)
      const timeout = setTimeout(() => {
        title_input_ref.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setTitle('');
      setBoardNo('');
      setCategory(null);
    }
  }, [open]);

  const handleStart = () => {
    if (!title.trim()) return;

    startTimer(title.trim(), board_no || undefined, category || undefined);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyboardIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="h6" component="span">
            새 작업 시작
          </Typography>
          <Typography
            variant="caption"
            sx={{
              ml: 'auto',
              px: 1,
              py: 0.5,
              bgcolor: '#f5f5f5',
              borderRadius: 1,
              color: 'text.secondary',
            }}
          >
            F8
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {/* 작업 제목 */}
          <Autocomplete
            freeSolo
            options={recent_titles}
            value={title}
            onInputChange={(_e, newValue) => setTitle(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={title_input_ref}
                label="작업 제목"
                placeholder="무엇을 하고 계신가요?"
                variant="outlined"
                fullWidth
                onKeyDown={handleKeyDown}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <PlayArrowIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          {/* 게시판 번호 & 카테고리 */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="게시판 번호"
              placeholder="예: 12345"
              value={board_no}
              onChange={(e) => setBoardNo(e.target.value)}
              onKeyDown={handleKeyDown}
              sx={{ flex: 1 }}
            />
            <Autocomplete
              options={CATEGORIES}
              value={category}
              onChange={(_e, newValue) => setCategory(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="카테고리"
                  placeholder="선택"
                  onKeyDown={handleKeyDown}
                />
              )}
              sx={{ flex: 1 }}
            />
          </Box>

          {/* 안내 메시지 */}
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            Enter 키를 누르면 바로 타이머가 시작됩니다.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          취소
        </Button>
        <Button
          onClick={handleStart}
          variant="contained"
          disabled={!title.trim()}
          startIcon={<PlayArrowIcon />}
          sx={{
            bgcolor: 'var(--highlight-color)',
            '&:hover': { bgcolor: 'var(--highlight-hover)' },
            '&.Mui-disabled': { bgcolor: 'var(--bg-tertiary)' },
          }}
        >
          시작(Enter)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewTaskModal;

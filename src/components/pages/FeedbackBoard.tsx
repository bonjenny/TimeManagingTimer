import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

/**
 * 건의사항 게시판 페이지
 * Step 5에서 구현 예정
 * - 익명 게시판
 * - 닉네임, 제목, 내용 입력
 * - 비밀번호를 통한 수정/삭제
 * - 댓글 기능
 */
const FeedbackBoard: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          bgcolor: '#f8f9fa',
          borderColor: 'var(--border-color, #eaeaea)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              건의사항
            </Typography>
            <Typography variant="body2" color="text.secondary">
              앱 개선 아이디어나 버그 리포트를 남겨주세요.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled
            sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
          >
            글쓰기
          </Button>
        </Box>
      </Paper>

      {/* 게시판 목록 영역 - Step 5에서 구현 */}
      <Paper
        variant="outlined"
        sx={{
          p: 6,
          textAlign: 'center',
          color: 'text.secondary',
          borderColor: 'var(--border-color, #eaeaea)',
        }}
      >
        <Typography variant="h6" sx={{ mb: 1 }}>
          🚧 준비 중
        </Typography>
        <Typography variant="body2">
          건의사항 게시판은 Step 5에서 구현될 예정입니다.
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 2 }}>
          예정 기능: 익명 글쓰기, 댓글, 비밀번호 기반 수정/삭제
        </Typography>
      </Paper>
    </Box>
  );
};

export default FeedbackBoard;

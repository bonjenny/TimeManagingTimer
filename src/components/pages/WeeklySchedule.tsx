import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import ReportView from '../report/ReportView';

/**
 * 주간 일정 페이지
 * 기존 ReportView를 기반으로 하되, 주간 스프린트 뷰와 복사 템플릿 기능 추가 예정
 */
const WeeklySchedule: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          bgcolor: '#f8f9fa',
          borderColor: 'var(--border-color, #eaeaea)',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          주간 일정
        </Typography>
        <Typography variant="body2" color="text.secondary">
          주간 업무 현황을 확인하고 보고서를 작성하세요.
        </Typography>
      </Paper>

      {/* 기존 리포트 뷰 재사용 */}
      <ReportView />

      {/* TODO: Step 4에서 추가 기능 구현 예정 */}
      {/* - 주간 스프린트 시각화 */}
      {/* - 복사 템플릿 (형식 1: 상세형, 형식 2: 요약형) */}
      {/* - 프리셋 작업의 해당 날짜 누적 시간 별도 계산 */}
    </Box>
  );
};

export default WeeklySchedule;

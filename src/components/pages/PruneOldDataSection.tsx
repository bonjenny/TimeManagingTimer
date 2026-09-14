import React, { useMemo, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useTimerStore } from '../../store/useTimerStore';
import { useTimeManagementStore } from '../../store/useTimeManagementStore';

interface Props {
  onBackup: () => void;
}

/** 기준일 이전의 타이머 기록·휴지통·시간관리 행을 지워 저장 용량(백업 JSON)을 줄인다. */
const PruneOldDataSection: React.FC<Props> = ({ onBackup }) => {
  const { logs, deleted_logs, activeTimer } = useTimerStore();
  const { rows } = useTimeManagementStore();
  const [cutoff, setCutoff] = useState('');

  const counts = useMemo(() => {
    if (!cutoff) return null;
    const cutoff_ts = new Date(`${cutoff}T00:00:00`).getTime();
    const old = (l: { id: string; startTime: number }) => l.startTime < cutoff_ts && l.id !== activeTimer?.id;
    return {
      cutoff_ts,
      logs: logs.filter(old).length,
      trash: deleted_logs.filter(old).length,
      rows: rows.filter((r) => r.date < cutoff).length,
    };
  }, [cutoff, logs, deleted_logs, rows, activeTimer]);

  const total = counts ? counts.logs + counts.trash + counts.rows : 0;

  const handlePrune = () => {
    if (!counts || total === 0) return;
    const ok = window.confirm(
      `${cutoff} 이전 데이터를 삭제합니다.\n\n` +
        `- 타이머 기록 ${counts.logs}건\n- 휴지통 ${counts.trash}건\n- 시간관리 행 ${counts.rows}건\n\n` +
        '되돌릴 수 없습니다. 먼저 "데이터 수동 내보내기"로 백업했는지 확인하세요. 계속할까요?'
    );
    if (!ok) return;
    const keep = (l: { id: string; startTime: number }) => l.startTime >= counts.cutoff_ts || l.id === activeTimer?.id;
    useTimerStore.setState((s) => ({ logs: s.logs.filter(keep), deleted_logs: s.deleted_logs.filter(keep) }));
    useTimeManagementStore.setState((s) => ({ rows: s.rows.filter((r) => r.date >= cutoff) }));
    setCutoff('');
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        오래된 기록 정리
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          type="date"
          size="small"
          label="이 날짜 이전 기록 삭제"
          value={cutoff}
          onChange={(e) => setCutoff(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="outlined" size="small" onClick={onBackup}>
          먼저 백업
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteSweepIcon />}
          disabled={total === 0}
          onClick={handlePrune}
        >
          삭제
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {counts
          ? `삭제 대상: 타이머 기록 ${counts.logs}건 · 휴지통 ${counts.trash}건 · 시간관리 행 ${counts.rows}건 (선택한 날짜 당일 기록은 남습니다)`
          : '백업 파일이 너무 커지면 지난 기록을 지워 용량을 줄일 수 있습니다. 프리셋·설정·배포 캘린더는 그대로 남습니다.'}
      </Typography>
    </Box>
  );
};

export default PruneOldDataSection;

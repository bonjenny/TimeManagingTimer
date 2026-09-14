import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { TimeManagementRow, useTimeManagementStore } from '../../store/useTimeManagementStore';
import {
  buildErpPayload,
  buildErpConsoleScript,
  ErpMapping,
  ERP_TIMELOG_URL,
} from '../../utils/erpTimelog';

interface Props {
  open: boolean;
  onClose: () => void;
  rows: TimeManagementRow[];
  date: string; // YYYY-MM-DD
}

const ErpRegisterDialog: React.FC<Props> = ({ open, onClose, rows, date }) => {
  const { erp_mapping, erp_user, setErpMapping, setErpUser } = useTimeManagementStore();
  const [mapping_open, setMappingOpen] = useState(false);
  const [mapping_text, setMappingText] = useState('');
  const [mapping_error, setMappingError] = useState('');
  const [copied, setCopied] = useState(false);
  const [script_fallback, setScriptFallback] = useState(''); // 클립보드 거부 시 수동 복사용

  const result = useMemo(
    () => buildErpPayload(rows, date, erp_mapping, erp_user),
    [rows, date, erp_mapping, erp_user]
  );
  const can_submit = rows.length > 0 && result.errors.length === 0;

  const handleCopyAndOpen = async () => {
    const script = buildErpConsoleScript(result.payload, date, result.resolved.length, result.total);
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setScriptFallback('');
    } catch {
      setCopied(false);
      setScriptFallback(script);
    }
    window.open(ERP_TIMELOG_URL, '_blank');
  };

  const openMappingEditor = () => {
    setMappingText(JSON.stringify(erp_mapping, null, 2));
    setMappingError('');
    setMappingOpen((v) => !v);
  };

  const saveMapping = () => {
    try {
      const parsed = JSON.parse(mapping_text) as ErpMapping;
      setErpMapping(parsed);
      setMappingError('');
      setMappingOpen(false);
    } catch (e) {
      setMappingError(`JSON 오류: ${(e as Error).message}`);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        ERP 시간관리 등록 — {date}
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {result.errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {result.errors.join('\n')}
            {'\n'}아래 "게시글 매핑 편집"에서 프로젝트 → 작업/개발 게시글(sid)을 추가하세요.
          </Alert>
        )}
        {copied && (
          <Alert severity="success" sx={{ mb: 2 }}>
            스크립트를 복사했습니다. 열린 ERP 탭에서 로그인 확인 후 F12 → Console에 붙여넣고 Enter.
            확인창에서 승인하면 저장됩니다. (콘솔이 붙여넣기를 막으면 <code>allow pasting</code> 입력 후 재시도)
          </Alert>
        )}
        {script_fallback && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            클립보드 접근이 거부되어 아래 스크립트를 직접 복사하세요. ERP 탭 F12 → Console에 붙여넣고 Enter.
            <TextField
              multiline
              fullWidth
              minRows={3}
              maxRows={6}
              value={script_fallback}
              onFocus={(e) => e.target.select()}
              inputProps={{ readOnly: true, style: { fontFamily: 'monospace', fontSize: 11 } }}
              sx={{ mt: 1 }}
            />
          </Alert>
        )}

        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>작업</TableCell>
              <TableCell>업무</TableCell>
              <TableCell>거래</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell align="right">시간(분)</TableCell>
              <TableCell>비고</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.resolved.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.work.title}</TableCell>
                <TableCell>{r.bizz_nm}</TableCell>
                <TableCell>{r.trx.title}</TableCell>
                <TableCell>{r.category_code} {r.category_name}</TableCell>
                <TableCell align="right">{r.minutes}</TableCell>
                <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{r.note}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={4} align="right" sx={{ fontWeight: 600 }}>합계</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>{result.total}</TableCell>
              <TableCell>{result.resolved.length}건 · 담당 {erp_user.dept} {erp_user.name}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField size="small" label="담당자 sid" value={erp_user.pic_sid} sx={{ width: 120 }}
            onChange={(e) => setErpUser({ ...erp_user, pic_sid: e.target.value })} />
          <TextField size="small" label="담당자명" value={erp_user.name} sx={{ width: 120 }}
            onChange={(e) => setErpUser({ ...erp_user, name: e.target.value })} />
          <TextField size="small" label="부서" value={erp_user.dept} sx={{ width: 120 }}
            onChange={(e) => setErpUser({ ...erp_user, dept: e.target.value })} />
          <Button size="small" onClick={openMappingEditor}>
            게시글 매핑 편집 {mapping_open ? '▲' : '▼'}
          </Button>
        </Box>

        <Collapse in={mapping_open}>
          <Typography variant="caption" color="text.secondary">
            프로젝트 코드 → {'{ work: {no, sid, title}, dev?: {...} }'} 또는 {'{ alias }'} / 관리업무는 by_category·by_note.
            sid는 eccp post 결과의 data_sid.
          </Typography>
          <TextField
            multiline
            fullWidth
            minRows={10}
            maxRows={24}
            value={mapping_text}
            onChange={(e) => setMappingText(e.target.value)}
            error={!!mapping_error}
            helperText={mapping_error}
            sx={{ fontFamily: 'monospace', mt: 1 }}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
          />
          <Button size="small" variant="contained" onClick={saveMapping} sx={{ mt: 1 }}>
            매핑 저장
          </Button>
        </Collapse>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button
          variant="contained"
          startIcon={<ContentCopyIcon />}
          disabled={!can_submit}
          onClick={handleCopyAndOpen}
        >
          스크립트 복사 후 ERP 열기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErpRegisterDialog;

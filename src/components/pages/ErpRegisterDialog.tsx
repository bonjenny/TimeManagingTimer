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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { TimeManagementRow, useTimeManagementStore } from '../../store/useTimeManagementStore';
import {
  buildErpPayload,
  buildErpConsoleScript,
  ErpMapping,
  ERP_TIMELOG_URL,
  parseErpSession,
  postErpTimelog,
  ErpPostResult,
} from '../../utils/erpTimelog';

// ponytail: 세션키는 IndexedDB(백업 파일에 통째로 들어감)에 두지 않고 탭 단위 sessionStorage 에만 보관
const SESSION_KEY = 'erp-session-input';

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
  const [session_input, setSessionInput] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [posting, setPosting] = useState(false);
  const [post_result, setPostResult] = useState<ErpPostResult | null>(null);
  const session = parseErpSession(session_input);

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

  const handleSessionChange = (value: string) => {
    setSessionInput(value);
    sessionStorage.setItem(SESSION_KEY, value);
  };

  const handlePost = async () => {
    if (!session) return;
    if (!window.confirm(`${date} 시간 로그 ${result.resolved.length}행 ${result.total}분을 ERP에 저장할까요?`)) return;
    setPosting(true);
    setPostResult(null);
    const res = await postErpTimelog(result.payload, session.sid, session.origin);
    setPostResult(res);
    setPosting(false);
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
        {post_result && (
          <Alert severity={post_result.ok ? 'success' : 'error'} sx={{ mb: 2, wordBreak: 'break-all' }}>
            {post_result.message}
            {post_result.status === 0 && ' — 아래 "콘솔 스크립트 복사"로 ERP 탭에서 직접 실행할 수 있습니다.'}
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

        <TextField
          size="small"
          fullWidth
          label="ERP 세션 (로그인된 ERP 주소창 URL 전체 또는 ec_req_sid)"
          placeholder="https://logine.ecount.com/ec56/view/erp?w_flag=1&ec_req_sid=E-..."
          value={session_input}
          onChange={(e) => handleSessionChange(e.target.value)}
          error={!!session_input && !session}
          helperText={
            session_input && !session
              ? 'ec_req_sid 를 찾지 못했습니다.'
              : session
                ? `세션 ${session.sid.slice(0, 4)}… · ${session.origin}`
                : 'ERP에 로그인한 탭의 주소를 복사해 붙여넣으세요. 이 탭을 닫으면 지워집니다.'
          }
          sx={{ mb: 2 }}
        />

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
        <Button startIcon={<ContentCopyIcon />} disabled={!can_submit} onClick={handleCopyAndOpen}>
          콘솔 스크립트 복사
        </Button>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          disabled={!can_submit || !session || posting || !!post_result?.ok}
          onClick={handlePost}
        >
          {posting ? '저장 중…' : 'ERP에 저장'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErpRegisterDialog;

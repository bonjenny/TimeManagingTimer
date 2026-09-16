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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { TimeManagementRow, useTimeManagementStore } from '../../store/useTimeManagementStore';
import { useProjectStore } from '../../store/useProjectStore';
import ErpMappingFinder from './ErpMappingFinder';
import {
  buildErpPayload,
  buildErpConsoleScript,
  ErpMapping,
  ERP_TIMELOG_URL,
  parseErpSession,
  postErpTimelog,
  ErpPostResult,
  ErpProjectMapping,
  resolveErpRow,
} from '../../utils/erpTimelog';

// ponytail: 세션키는 IndexedDB(백업 파일에 통째로 들어감)에 두지 않고 탭 단위 sessionStorage 에만 보관
const SESSION_KEY = 'erp-session-input';

const clamp_sx = (lines: number) => ({ display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' });
const formatShortDate = (ymd: string) => {
  const [, m, d] = ymd.split('-');
  return m && d ? `${Number(m)}/${Number(d)}` : ymd;
};

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
  const { getProjectName } = useProjectStore();
  const theme = useTheme();
  const is_mobile = useMediaQuery(theme.breakpoints.down('md'));
  const is_phone = useMediaQuery(theme.breakpoints.down('sm'));

  // 매핑이 없어 변환에 실패한 프로젝트 → 개발 게시글 필요 여부 (프로젝트 없는 행은 자동 매핑 대상 아님)
  const missing = useMemo(() => {
    const map = new Map<string, boolean>();
    rows.forEach((row) => {
      if (!row.project_name) return;
      try {
        resolveErpRow(row, erp_mapping);
      } catch (e) {
        if ((e as { kind?: string }).kind === 'category') return; // 카테고리 문제는 게시글 매핑으로 못 고친다
        map.set(row.project_name, !!map.get(row.project_name) || row.work_type.trim() === '개발');
      }
    });
    return [...map.entries()];
  }, [rows, erp_mapping]);

  const handleAddMapping = (project: string, mapping: ErpProjectMapping) => {
    setErpMapping({ ...erp_mapping, [project]: mapping });
  };

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
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={is_phone}>
      {is_mobile ? (
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 1 }}>
          <IconButton aria-label="닫기" onClick={onClose} sx={{ width: 44, height: 44 }}>
            <CloseIcon />
          </IconButton>
          <Typography component="span" sx={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ERP 시간관리 등록 — {date}
          </Typography>
        </DialogTitle>
      ) : (
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          ERP 시간관리 등록 — {date}
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
      )}
      <DialogContent
        dividers={is_mobile}
        sx={is_mobile ? { px: { xs: 2, sm: 3 }, '& .MuiInputBase-input': { fontSize: is_phone ? 16 : undefined } } : undefined}
      >
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
                ? `세션 ${session.sid} · ${session.origin}`
                : 'ERP에 로그인한 탭의 주소를 복사해 붙여넣으세요. 이 탭을 닫으면 지워집니다.'
          }
          sx={{ mb: 2, mt: 1 }}
        />
        {result.errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {result.errors.join('\n')}
          </Alert>
        )}
        {missing.length > 0 && (
          <Box sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'error.light', borderRadius: 1 }}>
            <Typography variant="subtitle2">게시글 매핑 찾기</Typography>
            <Typography variant="caption" color="text.secondary">
              프로젝트 코드 또는 작업 게시글 번호로 찾으면 연결된 개발 게시글까지 채웁니다.
            </Typography>
            {missing.map(([project, need_dev]) => (
              <ErpMappingFinder
                key={project}
                project={project}
                project_name={getProjectName(project)}
                need_dev={need_dev}
                session={session}
                onAdd={handleAddMapping}
              />
            ))}
          </Box>
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

        {is_mobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            {result.resolved.map((r, i) => (
              <Box key={i} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography sx={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word', ...clamp_sx(2) }}>
                  {r.work.title}
                </Typography>
                {r.trx.sid !== r.work.sid && (
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25, wordBreak: 'break-word', ...clamp_sx(2) }}>
                    {r.trx.title}
                  </Typography>
                )}
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                  {r.bizz_nm} · {r.category_code} {r.category_name} ·{' '}
                  <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{r.minutes}분</Box>
                  {' '}· 종료 {formatShortDate(r.end_date)}
                </Typography>
                {r.note && (
                  <Typography sx={{ fontSize: 13, mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...clamp_sx(2) }}>
                    {r.note}
                  </Typography>
                )}
              </Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, px: 1.5, py: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', minWidth: 0 }}>
                합계 · {result.resolved.length}건 · 담당 {erp_user.dept} {erp_user.name}
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                {result.total}분
              </Typography>
            </Box>
          </Box>
        ) : (
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>작업</TableCell>
                <TableCell>업무</TableCell>
                <TableCell>거래</TableCell>
                <TableCell>카테고리</TableCell>
                <TableCell align="right">시간(분)</TableCell>
                <TableCell>종료예정일</TableCell>
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
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.end_date}</TableCell>
                  <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{r.note}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} align="right" sx={{ fontWeight: 600 }}>합계</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{result.total}</TableCell>
                <TableCell />
                <TableCell>{result.resolved.length}건 · 담당 {erp_user.dept} {erp_user.name}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}


        <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: is_mobile ? 'stretch' : 'center', flexWrap: 'wrap', flexDirection: is_mobile ? 'column' : 'row' }}>
          <TextField size="small" label="담당자 sid" value={erp_user.pic_sid} sx={{ width: is_mobile ? '100%' : 120 }}
            onChange={(e) => setErpUser({ ...erp_user, pic_sid: e.target.value })} />
          <TextField size="small" label="담당자명" value={erp_user.name} sx={{ width: is_mobile ? '100%' : 120 }}
            onChange={(e) => setErpUser({ ...erp_user, name: e.target.value })} />
          <TextField size="small" label="부서" value={erp_user.dept} sx={{ width: is_mobile ? '100%' : 120 }}
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
            inputProps={{ style: { fontFamily: 'monospace', fontSize: is_phone ? 16 : 12 } }}
          />
          <Button size="small" variant="contained" onClick={saveMapping} sx={{ mt: 1 }}>
            매핑 저장
          </Button>
        </Collapse>
      </DialogContent>
      {is_mobile ? (
        <DialogActions
          disableSpacing
          sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, px: { xs: 2, sm: 3 }, pt: 1.5, pb: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          <Button variant="outlined" startIcon={<ContentCopyIcon />} disabled={!can_submit} onClick={handleCopyAndOpen} sx={{ minHeight: 44, whiteSpace: 'nowrap' }}>
            콘솔 스크립트 복사
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            disabled={!can_submit || !session || posting || !!post_result?.ok}
            onClick={handlePost}
            sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
          >
            {posting ? '저장 중…' : 'ERP에 저장'}
          </Button>
        </DialogActions>
      ) : (
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
      )}
    </Dialog>
  );
};

export default ErpRegisterDialog;

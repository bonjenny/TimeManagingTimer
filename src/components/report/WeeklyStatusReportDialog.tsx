import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Checkbox,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestoreIcon from '@mui/icons-material/Restore';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { Alert, CircularProgress } from '@mui/material';
import {
  ErpPostSummary,
  fetchErpPostSummary,
  fetchErpTimeByWork,
  fetchErpWorkSummary,
  findMappedPosts,
  parseErpSession,
  searchErpEmployees,
} from '../../utils/erpTimelog';
import { useTimerStore } from '../../store/useTimerStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useDeployCalendarStore } from '../../store/useDeployCalendarStore';
import { useTimeManagementStore } from '../../store/useTimeManagementStore';
import { useWeeklyReportStore } from '../../store/useWeeklyReportStore';
import {
  REPORT_STATUSES,
  ReportRow,
  ErpReportWork,
  buildErpWeeklyReport,
  buildWeeklyReport,
  earliestStart,
  erpPeriodKey,
  generateReportHtml,
  parsePic,
  generateReportTsv,
  weekKey,
} from '../../utils/weeklyStatusReport';
import { addDays, formatDateToString } from '../../utils/calendar_export';

const to8 = (d: string) => d.replace(/-/g, '');

interface Props {
  open: boolean;
  onClose: () => void;
  week_start: Date;
  /** 주간 일정 화면 필터에서 뺀 프로젝트 (관리업무 등) */
  excluded_codes: string[];
}

const HEAD_BG = '#a9d08e';

/** ERP 오류 응답에서 읽을 만한 부분만 ("[Sql-PG-T/O]" → DB 시간 초과) */
const shortError = (message: string) =>
  /Sql-PG-T\/O/.test(message) ? 'ERP DB 시간 초과. 잠시 뒤 다시 가져오세요' : message.slice(0, 80);
// ERP 시간관리 등록 창과 같은 세션 저장 칸을 쓴다 (탭을 닫으면 지워짐)
const SESSION_KEY = 'erp-session-input';

// 표 안에서 바로 고치는 칸. 바뀐 값은 칸에서 나갈 때 저장한다.
const EditCell: React.FC<{ value: string; onCommit: (v: string) => void; placeholder?: string; align?: 'left' | 'right'; width?: number }> = ({
  value,
  onCommit,
  placeholder,
  align = 'left',
  width,
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <InputBase
      value={draft ?? value}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== value) onCommit(draft);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(null);
      }}
      sx={{
        width: width ?? '100%',
        fontSize: 13,
        '& input': { textAlign: align, py: 0.5, px: 0.5, borderRadius: 0.5 },
        '& input:hover': { bgcolor: 'var(--bg-hover)' },
        '& input:focus': { bgcolor: 'var(--bg-hover)', outline: '1px solid var(--primary-color)' },
      }}
    />
  );
};

async function copyTable(html: string, text: string): Promise<boolean> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) }),
    ]);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}

const WeeklyStatusReportDialog: React.FC<Props> = ({ open, onClose, week_start, excluded_codes }) => {
  const theme = useTheme();
  const is_phone = useMediaQuery(theme.breakpoints.down('sm'));
  const logs = useTimerStore((s) => s.logs);
  const projects = useProjectStore((s) => s.projects);
  const events = useDeployCalendarStore((s) => s.events);
  const { rows: tm_rows, erp_user, erp_mapping } = useTimeManagementStore();
  const report = useWeeklyReportStore();
  const [toast, setToast] = useState('');
  const [session_input, setSessionInput] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [fetching, setFetching] = useState(false);
  const [fetch_errors, setFetchErrors] = useState<string[]>([]);
  const session = parseErpSession(session_input);

  // ERP 기준: 일간 기록 없이 담당자·기간만으로 (시간 로그 게시판 + 테스트/배포 게시글)
  const er = report.erp_report;
  const is_erp = er.mode === 'erp';
  const default_to = [formatDateToString(addDays(week_start, 4)), formatDateToString(new Date())].sort()[0];
  const pic_sid = er.pic_sid || erp_user?.pic_sid || '';
  const pic_name = er.pic_name || erp_user?.name || '';
  // 고를 수 있는 담당자: 전에 찾은 사람 + 시간관리 등록 창의 담당자
  const people = [...(er.people || []), ...(erp_user?.pic_sid ? [{ sid: erp_user.pic_sid, name: erp_user.name }] : [])].filter(
    (p, i, all) => all.findIndex((x) => x.sid === p.sid) === i
  );
  const [pic_input, setPicInput] = useState<string | null>(null); // 치는 중인 글자 (null 이면 고른 담당자 표시)
  const pic_label = pic_sid ? `${pic_name} (${pic_sid})` : '';
  const [pic_searching, setPicSearching] = useState(false);
  const [pic_error, setPicError] = useState('');
  const [pic_choices, setPicChoices] = useState<{ sid: string; name: string }[] | null>(null); // 동명이인 고르기
  const choosePic = (pic: { sid: string; name: string }) => {
    report.setErpReport({ pic_sid: pic.sid, pic_name: pic.name });
    setPicInput(null);
    setPicError('');
    setPicChoices(null);
  };
  // 전에 쓴 사람·「사번 이름」이면 바로, 아니면 ERP 사원 검색 (이름이나 사번). 여러 명이면 골라 달라고 묻는다
  const commitPic = async (text: string) => {
    const q = text.trim();
    if (!q) return setPicInput(null);
    const pic = parsePic(q, people);
    if (pic) return choosePic(pic);
    if (!session) return setPicError('이름만으로 찾으려면 위에 ERP 세션을 넣어 주세요 (또는 「2023-026 엄지희」처럼 둘 다)');
    setPicSearching(true);
    setPicError('');
    try {
      const found = await searchErpEmployees(session, q);
      if (found.length === 1) choosePic(found[0]);
      else if (found.length > 1) setPicChoices(found);
      else setPicError(`ERP에 「${q}」 사원이 없어요`);
    } catch (e) {
      setPicError(`사원 검색 실패 - ${shortError((e as Error).message)}`);
    }
    setPicSearching(false);
  };
  // 열 때마다 그 주 월요일 ~ 금요일(아직 안 왔으면 오늘)로 되돌린다. 연 뒤에 고친 기간은 닫을 때까지 유지
  useEffect(() => {
    if (open) report.setErpReport({ from: formatDateToString(week_start), to: default_to });
  }, [open, week_start.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const from = er.from || formatDateToString(week_start);
  const to = er.to || default_to;
  const [include_admin, setIncludeAdmin] = useState(false);

  const week = is_erp ? erpPeriodKey(from, to) : weekKey(week_start);
  const local_rows = useMemo(
    () =>
      buildWeeklyReport({
        week_start,
        logs,
        projects,
        events,
        tm_rows,
        excluded_codes,
        project_overrides: report.project_overrides,
        week_overrides: report.week_overrides,
        extras: report.extras,
        erp_info: report.erp_info,
      }),
    [week_start, logs, projects, events, tm_rows, excluded_codes, report.project_overrides, report.week_overrides, report.extras, report.erp_info]
  );
  const erp_rows = useMemo(
    () =>
      buildErpWeeklyReport({
        from_str: from,
        to_str: to,
        works: er.works,
        events,
        project_overrides: report.project_overrides,
        week_overrides: report.week_overrides,
        extras: report.extras,
      }),
    [from, to, er.works, events, report.project_overrides, report.week_overrides, report.extras]
  );
  const rows = is_erp ? erp_rows : local_rows;

  // ERP 기준 현황표 만들기
  // 1) 시간 로그 「작업별」 집계(기간) → 그 기간에 시간을 쓴 작업 = 표의 줄
  // 2) 작업마다 작업·개발·테스트/배포 게시글 → 진행상태·날짜·비고
  // 3) 시간 로그 집계를 다시, 시작은 작업들의 시작일(개발 게시글 첫 날짜·작성일) 중 가장 이른 날 → 누적시간
  const handleBuildErp = async () => {
    if (!session || !pic_sid || !pic_name || !from || !to) return;
    sessionStorage.setItem(SESSION_KEY, session_input);
    setFetching(true);
    setFetchErrors([]);
    const pic = { sid: pic_sid, name: pic_name };
    const errors: string[] = [];
    try {
      // 기간 안에 실제로 쓴 시간이 있는 작업만 (0분 줄만 있는 작업은 빼기)
      const period_works = (await fetchErpTimeByWork(session, pic, to8(from), to8(to))).filter(
        (w) => w.minutes > 0 && (include_admin || w.work_status !== '관리업무')
      );
      const works: ErpReportWork[] = [];
      for (const w of period_works) {
        const key = `작업.${w.work.no}`;
        let summary: ErpPostSummary | undefined;
        try {
          summary = (await fetchErpWorkSummary(session, w.work)) ?? undefined;
          if (!summary) errors.push(`${key}: 작업 게시글을 찾지 못함`);
          else if (summary.dev_error) errors.push(`${key}: 연결된 개발 게시글 조회 실패 - ${shortError(summary.dev_error)}`);
        } catch (e) {
          errors.push(`${key}: 게시글 조회 실패 - ${shortError((e as Error).message)}`);
        }
        works.push({ key, title: w.work.title, total_minutes: w.minutes, created: w.created, work_status: w.work_status, summary });
      }
      // 누적시간: 시작일을 포함하는 기간으로 한 번 더 (한 번에 집계해서 작업마다 나눈다)
      if (works.length) {
        const cum_from = earliestStart(works, from);
        if (cum_from < from) {
          try {
            const cum = new Map((await fetchErpTimeByWork(session, pic, to8(cum_from), to8(to))).map((x) => [`작업.${x.work.no}`, x.minutes]));
            works.forEach((w) => (w.total_minutes = Math.max(w.total_minutes, cum.get(w.key) ?? 0)));
          } catch (e) {
            errors.push(`누적시간 조회 실패 (${cum_from} ~ ${to}) - 기간 안에 쓴 시간만 씀: ${shortError((e as Error).message)}`);
          }
        }
      }
      const recent = [pic, ...(er.people || []).filter((p) => p.sid !== pic.sid)].slice(0, 20);
      report.setErpReport({ works, from, to, pic_sid, pic_name, fetched_at: Date.now(), people: recent });
      setToast(works.length ? `작업 ${works.length}건으로 현황표를 만들었습니다` : '그 기간에 시간 로그가 있는 작업이 없습니다');
    } catch (e) {
      errors.push(`시간 로그 조회 실패 - ${shortError((e as Error).message)}`);
    }
    setFetching(false);
    setFetchErrors(errors);
  };

  // 매핑된 작업 게시글(없으면 개발 게시글)의 진행상태·날짜를 가져온다
  const handleFetchErp = async () => {
    if (!session) return;
    sessionStorage.setItem(SESSION_KEY, session_input);
    setFetching(true);
    setFetchErrors([]);
    const targets = rows.filter((r) => !r.manual).map((r) => ({ key: r.key, ...findMappedPosts(erp_mapping, r.key) }));
    const info: Record<string, ErpPostSummary> = {};
    const errors: string[] = [];
    // 한 번에 몰아 보내면 ERP DB 시간 초과가 나서 한 줄씩 차례로 조회한다
    for (const t of targets) {
      await (async () => {
        // 작업 게시글이 있으면 작업 기준(진행상태 + 연결된 개발 글 전체 날짜), 없으면 매핑된 개발 글
        const post = t.work ? { board: 'work' as const, no: t.work.no } : t.dev ? { board: 'dev' as const, no: t.dev.no } : null;
        if (!post) return errors.push(`${t.key}: 게시글 매핑 없음`);
        const label = `${post.board === 'dev' ? '개발' : '작업'} 게시글 ${post.no}`;
        try {
          const summary = t.work ? await fetchErpWorkSummary(session, t.work) : await fetchErpPostSummary(session, 'dev', post.no);
          if (!summary) return errors.push(`${t.key}: ${label} 없음`);
          info[t.key] = summary;
          if (summary.dev_error) errors.push(`${t.key}: 연결된 개발 게시글 조회 실패 (작업 게시글 상태만 씀) - ${shortError(summary.dev_error)}`);
        } catch (e) {
          errors.push(`${t.key}: ${label} 조회 실패 - ${shortError((e as Error).message)}`);
        }
      })();
    }
    report.setErpInfo(info);
    setFetching(false);
    setFetchErrors(errors);
    const count = Object.keys(info).length;
    setToast(count ? `ERP 게시글 ${count}건을 가져왔습니다` : 'ERP 게시글을 가져오지 못했습니다. 아래 안내를 확인하세요');
  };
  const hidden_count = Object.values(report.project_overrides).filter((o) => o.hidden).length;
  const owner = is_erp ? pic_name : erp_user?.name || '';

  // 주차 번호는 화면마다 세는 법이 달라 날짜만 쓴다
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const title = is_erp
    ? `${from.replace(/-/g, '/')} ~ ${to.replace(/-/g, '/')} (ERP 기준)`
    : `${week_start.getFullYear()}년 ${fmt(week_start)} ~ ${fmt(addDays(week_start, 4))}`;

  // 칸 저장: 직접 추가한 행은 그 행에, 자동 행은 주 단위(상태·비고) / 프로젝트 단위(나머지)
  const commit = (row: ReportRow, field: 'status' | 'task' | 'start_date' | 'end_date' | 'note', value: string) => {
    if (row.manual) return report.updateExtra(row.key, { [field]: value });
    if (field === 'status' || field === 'note') return report.setWeekField(week, row.key, field, value);
    report.setProjectField(row.key, field, value);
  };

  const handleCopy = async () => {
    const ok = await copyTable(generateReportHtml(rows, owner), generateReportTsv(rows, owner));
    setToast(ok ? '진행 현황표를 복사했습니다. 엑셀이나 웹에디터에 붙여넣으세요.' : '복사하지 못했습니다');
  };

  const head_sx = { bgcolor: HEAD_BG, color: '#000', fontWeight: 700, fontSize: 13, textAlign: 'center', border: '1px solid #000', py: 0.5, px: 1, whiteSpace: 'nowrap' } as const;
  const cell_sx = { border: '1px solid var(--border-color)', py: 0, px: 0.5, fontSize: 13, whiteSpace: 'nowrap' } as const;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth fullScreen={is_phone}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        주간 진행 현황표
        <Typography component="span" sx={{ color: 'text.secondary', fontSize: 15 }}>
          {title}
        </Typography>
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={er.mode}
          onChange={(_, mode) => mode && report.setErpReport({ mode })}
          sx={{ mb: 1.5 }}
        >
          <ToggleButton value="local" sx={{ px: 2 }}>내 기록 기준</ToggleButton>
          <ToggleButton value="erp" sx={{ px: 2 }}>ERP 기준 (담당자·기간)</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {is_erp
            ? '일간 기록이 없어도 됩니다. 담당자가 그 기간에 ERP 시간 로그에 시간을 쓴 작업마다 한 줄이 생기고, 진행상태·날짜·비고는 작업·개발·테스트/배포 게시글에서, 누적시간은 작업 시작일부터 기간 끝까지의 시간 로그 합계로 채웁니다.'
            : '이번 주 기록으로 채우고, ERP에서 가져온 게시글이 있으면 진행상태·날짜·비고는 그 값을 씁니다(없으면 배포 캘린더). 칸을 눌러 고치면 기억합니다. 진행상태·비고는 이 주에만, 작업·날짜는 다음 주에도 그대로 씁니다.'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="ERP 세션 (로그인된 ERP 주소창 URL 또는 ec_req_sid)"
            value={session_input}
            onChange={(e) => setSessionInput(e.target.value)}
            error={!!session_input && !session}
            helperText={
              report.erp_fetched_at
                ? `마지막으로 가져온 때: ${new Date(report.erp_fetched_at).toLocaleString('ko-KR')}`
                : '시간관리 등록 창에 넣은 세션을 그대로 씁니다'
            }
            sx={{ flex: '1 1 420px', minWidth: 0 }}
          />
          {!is_erp && (
            <Button
              variant="outlined"
              startIcon={fetching ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
              disabled={!session || fetching || rows.every((r) => r.manual)}
              onClick={handleFetchErp}
              sx={{ height: 40, whiteSpace: 'nowrap' }}
            >
              ERP에서 가져오기
            </Button>
          )}
        </Box>
        {is_erp && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
            {/* 이름이나 사번 아무거나. 처음 찾는 사람은 「2023-026 엄지희」처럼 둘 다 */}
            <Autocomplete
              freeSolo
              size="small"
              options={people}
              getOptionLabel={(p) => (typeof p === 'string' ? p : `${p.name} (${p.sid})`)}
              filterOptions={(opts, { inputValue }) => {
                const q = inputValue.trim();
                return q && q !== pic_label ? opts.filter((p) => p.name.includes(q) || p.sid.includes(q)) : opts;
              }}
              value={null}
              inputValue={pic_input ?? pic_label}
              onInputChange={(_, v, reason) => {
                if (reason !== 'input') return;
                setPicInput(v);
                setPicError('');
              }}
              // 목록에서 고른 경우만. 직접 친 글자는 Enter 를 뗄 때(onKeyUp) 확정한다
              onChange={(_, v) => v && typeof v !== 'string' && choosePic(v)}
              onBlur={() => pic_input !== null && !pic_choices && commitPic(pic_input)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  // 한글은 첫 Enter 가 글자 조합 끝내기로 쓰여 keydown 이 묻힌다 → keyup 에서 한 번에 찾기
                  onKeyUp={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && pic_input !== null && !pic_choices && commitPic(pic_input)}
                  label="담당자 (이름 또는 사번)"
                  error={!!pic_error}
                  helperText={pic_searching ? 'ERP에서 찾는 중…' : pic_error || undefined}
                  InputProps={{ ...params.InputProps, endAdornment: pic_searching ? <CircularProgress size={14} /> : params.InputProps.endAdornment }}
                />
              )}
              sx={{ width: 240 }}
            />
            <TextField size="small" type="date" label="기간 시작" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => report.setErpReport({ from: e.target.value })} sx={{ width: 160 }} />
            <TextField size="small" type="date" label="기간 끝 (기준일)" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => report.setErpReport({ to: e.target.value })} sx={{ width: 160 }} />
            <FormControlLabel control={<Checkbox size="small" checked={include_admin} onChange={(e) => setIncludeAdmin(e.target.checked)} />} label="관리업무 포함" />
            <Button
              variant="contained"
              startIcon={fetching ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />}
              disabled={!session || fetching || !pic_sid || !pic_name || !from || !to || from > to}
              onClick={handleBuildErp}
              sx={{ height: 40, whiteSpace: 'nowrap' }}
            >
              ERP로 현황표 만들기
            </Button>
            {er.fetched_at && (
              <Typography variant="caption" color="text.secondary">
                마지막으로 만든 때: {new Date(er.fetched_at).toLocaleString('ko-KR')}
              </Typography>
            )}
          </Box>
        )}
        {fetch_errors.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1.5, whiteSpace: 'pre-wrap' }} onClose={() => setFetchErrors([])}>
            {`${is_erp ? '조회하지 못한 것' : '못 가져온 줄 (배포 캘린더 값으로 채움)'}\n${fetch_errors.join('\n')}`}
          </Alert>
        )}
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ borderCollapse: 'collapse', minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                {['담당자', '진행상태', '작업', '시작일자', '종료예정일', '누적시간', '비고', ''].map((h, i) => (
                  <TableCell key={i} sx={i === 7 ? { ...cell_sx, border: 'none', width: 64 } : head_sx}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ ...cell_sx, py: 3, textAlign: 'center', color: 'text.secondary' }}>
                    {is_erp
                      ? '담당자·기간을 넣고 「ERP로 현황표 만들기」를 누르세요.'
                      : '이 주에 기록된 프로젝트가 없습니다. 「행 추가」로 직접 넣을 수 있습니다.'}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row, i) => (
                <TableRow key={row.key} hover>
                  <TableCell sx={{ ...cell_sx, px: 1, width: 70 }}>{i === 0 ? owner : ''}</TableCell>
                  <TableCell sx={{ ...cell_sx, width: 110 }}>
                    <Autocomplete
                      freeSolo
                      disableClearable
                      size="small"
                      options={[...REPORT_STATUSES]}
                      value={row.status}
                      onChange={(_, v) => v && commit(row, 'status', v)}
                      onBlur={(e) => {
                        const v = (e.target as HTMLInputElement).value;
                        if (v && v !== row.status) commit(row, 'status', v);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true, sx: { fontSize: 13 } }} />
                      )}
                    />
                  </TableCell>
                  <TableCell sx={{ ...cell_sx, minWidth: 360 }}>
                    <EditCell value={row.task} placeholder="작업명" onCommit={(v) => commit(row, 'task', v)} />
                  </TableCell>
                  <TableCell sx={{ ...cell_sx, width: 110 }}>
                    <EditCell value={row.start_date} placeholder="YYYY-MM-DD" align="right" onCommit={(v) => commit(row, 'start_date', v)} />
                  </TableCell>
                  <TableCell sx={{ ...cell_sx, width: 110 }}>
                    <EditCell value={row.end_date} placeholder="YYYY-MM-DD" align="right" onCommit={(v) => commit(row, 'end_date', v)} />
                  </TableCell>
                  <TableCell sx={{ ...cell_sx, px: 1, width: 80, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.total}</TableCell>
                  <TableCell sx={{ ...cell_sx, minWidth: 260 }}>
                    <EditCell value={row.note} placeholder="비고" onCommit={(v) => commit(row, 'note', v)} />
                  </TableCell>
                  <TableCell sx={{ ...cell_sx, border: 'none', whiteSpace: 'nowrap' }}>
                    {row.edited && (
                      <Tooltip title="고친 값 지우고 자동값으로">
                        <IconButton size="small" aria-label="자동값으로" onClick={() => report.resetRow(week, row.key)}>
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title={row.manual ? '행 삭제' : '이 프로젝트 숨기기 (다음 주에도 숨김)'}>
                      <IconButton
                        size="small"
                        aria-label={row.manual ? '행 삭제' : '숨기기'}
                        onClick={() => (row.manual ? report.removeExtra(row.key) : report.hideProject(row.key))}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button size="small" startIcon={<AddIcon />} onClick={report.addExtra}>
            행 추가
          </Button>
          {hidden_count > 0 && (
            <Button size="small" color="inherit" onClick={report.showAllHidden}>
              숨긴 프로젝트 {hidden_count}개 다시 보기
            </Button>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {is_erp
              ? '진행상태: 테스트/배포 게시글 이력 → 작업·개발 게시글 · 날짜: 개발 게시글 · 누적시간: 작업 시작일 ~ 기간 끝 시간 로그(10분 단위 반올림)'
              : '자동값 순서: ERP 게시글 → 배포 캘린더 · 종료예정일: 개발 게시글 → 시간관리 표 · 누적시간: 그 주까지 전체 기록(10분 단위 반올림)'}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={handleCopy} disabled={rows.length === 0}>
          표 복사
        </Button>
      </DialogActions>
      {/* 동명이인: 누구인지 고른다 */}
      <Dialog open={!!pic_choices} onClose={() => setPicChoices(null)} maxWidth="xs" fullWidth>
        <DialogTitle>같은 이름이 {pic_choices?.length}명 있어요</DialogTitle>
        <DialogContent sx={{ px: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, mb: 1 }}>
            찾는 사람의 사번을 골라 주세요.
          </Typography>
          <List dense>
            {pic_choices?.map((p) => (
              <ListItemButton key={p.sid} onClick={() => choosePic(p)}>
                <ListItemText primary={p.name} secondary={`사번 ${p.sid}`} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPicChoices(null)}>취소</Button>
        </DialogActions>
      </Dialog>
      {/* 다크모드·테마와 상관없이 읽히게 (배포 캘린더 토스트와 같은 색) */}
      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast('')}
        message={toast}
        ContentProps={{ sx: { color: 'var(--text-primary)', bgcolor: 'var(--card-bg)', border: '1px solid var(--border-color)' } }}
      />
    </Dialog>
  );
};

export default WeeklyStatusReportDialog;

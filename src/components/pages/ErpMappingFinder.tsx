import React, { useState } from 'react';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ErpPost, ErpProjectMapping, ErpSession, findErpDevPosts, findErpWorkPosts } from '../../utils/erpTimelog';

interface Props {
  project: string;
  project_name: string;
  need_dev: boolean;
  session: ErpSession | null;
  onAdd: (project: string, mapping: ErpProjectMapping) => void;
}

const label = (p: ErpPost) => `${p.no} · ${p.title}`;

/** 매핑 없는 프로젝트 한 줄: 코드/번호로 작업·개발 게시글을 찾아 매핑 추가. */
const ErpMappingFinder: React.FC<Props> = ({ project, project_name, need_dev, session, onAdd }) => {
  const [query, setQuery] = useState(/^[A-Z]\d{2}_\d+$/.test(project) ? project : '');
  const [dev_no, setDevNo] = useState('');
  const [works, setWorks] = useState<ErpPost[]>([]);
  const [work_sid, setWorkSid] = useState('');
  const [devs, setDevs] = useState<ErpPost[]>([]);
  const [dev_sid, setDevSid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const applyDevs = (work: ErpPost, found: ErpPost[]) => {
    setDevs(found);
    setDevSid(found.length === 1 ? found[0].sid : '');
    if (dev_no && found.length === 0) {
      throw new Error(`개발 ${dev_no}번이 없거나 작업 ${work.no}번에 연결되어 있지 않습니다.`);
    }
  };

  const handleFind = () =>
    run(async () => {
      if (!session) return;
      setDevs([]);
      setDevSid('');
      const found = await findErpWorkPosts(session, query);
      setWorks(found);
      if (found.length === 0) throw new Error('작업 게시글을 찾지 못했습니다.');
      if (found.length > 1) {
        setWorkSid('');
        return;
      }
      setWorkSid(found[0].sid);
      applyDevs(found[0], await findErpDevPosts(session, found[0], dev_no));
    });

  const handleSelectWork = (sid: string) => {
    setWorkSid(sid);
    const w = works.find((x) => x.sid === sid);
    if (w && session) run(async () => applyDevs(w, await findErpDevPosts(session, w, dev_no)));
  };

  const work = works.find((w) => w.sid === work_sid);
  const dev = devs.find((d) => d.sid === dev_sid);
  const can_add = !!work && (!need_dev || !!dev);

  let hint = '';
  if (error) hint = error;
  else if (!session) hint = '위 "ERP 세션" 칸을 먼저 채워주세요.';
  else if (work) {
    hint = `작업 ${label(work)}`;
    if (dev) hint += ` / 개발 ${label(dev)}`;
    else if (devs.length === 0) hint += ' / 연결된 개발 게시글 없음 (개발 제목이 다르면 개발 번호를 넣고 다시 찾기)';
  }

  return (
    <Box sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        {project_name && project_name !== project ? `${project_name} (${project})` : project}
        {need_dev && (
          <Typography component="span" variant="caption" color="error">
            {' '}· 개발 게시글 필요
          </Typography>
        )}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          label="프로젝트 코드 또는 작업 번호"
          value={query}
          sx={{ width: { xs: '100%', md: 210 } }}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) handleFind();
          }}
        />
        <TextField
          size="small"
          label="개발 번호 (선택)"
          value={dev_no}
          sx={{ width: { xs: '100%', md: 130 } }}
          onChange={(e) => setDevNo(e.target.value.replace(/\D/g, ''))}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<SearchIcon />}
          disabled={!session || !query.trim() || loading}
          sx={{ width: { xs: '100%', md: 'auto' }, minHeight: { xs: 44, md: 'auto' }, whiteSpace: 'nowrap' }}
          onClick={handleFind}
        >
          {loading ? '찾는 중…' : '찾기'}
        </Button>
        {works.length > 1 && (
          <TextField
            select
            size="small"
            label="작업 게시글"
            value={work_sid}
            sx={{ minWidth: { xs: 0, md: 260 }, width: { xs: '100%', md: 'auto' } }}
            onChange={(e) => handleSelectWork(e.target.value)}
          >
            {works.map((w) => (
              <MenuItem key={w.sid} value={w.sid}>
                {label(w)}
              </MenuItem>
            ))}
          </TextField>
        )}
        {work && devs.length > 1 && (
          <TextField
            select
            size="small"
            label="개발 게시글"
            value={dev_sid}
            sx={{ minWidth: { xs: 0, md: 260 }, width: { xs: '100%', md: 'auto' } }}
            onChange={(e) => setDevSid(e.target.value)}
          >
            <MenuItem value="">없음</MenuItem>
            {devs.map((d) => (
              <MenuItem key={d.sid} value={d.sid}>
                {label(d)}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Button
          size="small"
          variant="contained"
          disabled={!can_add}
          sx={{ width: { xs: '100%', md: 'auto' }, minHeight: { xs: 44, md: 'auto' }, whiteSpace: 'nowrap' }}
          onClick={() => work && onAdd(project, dev ? { work, dev } : { work })}
        >
          매핑 추가
        </Button>
      </Box>
      {hint && (
        <Typography
          variant="caption"
          color={error ? 'error' : 'text.secondary'}
          sx={{ display: 'block', mt: 0.5 }}
        >
          {hint}
        </Typography>
      )}
    </Box>
  );
};

export default ErpMappingFinder;

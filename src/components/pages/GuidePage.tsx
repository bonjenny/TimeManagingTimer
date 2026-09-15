import React, { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { GUIDE_DEMOS, GuideDemoId } from '../guide/GuideDemos';
import { GUIDE_SECTIONS } from '../../constants/guideContent';

const GuidePage: React.FC = () => {
  const [active_id, setActiveId] = useState(GUIDE_SECTIONS[0].id);
  const section = GUIDE_SECTIONS.find((s) => s.id === active_id) ?? GUIDE_SECTIONS[0];

  return (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexDirection: { xs: 'column', md: 'row' } }}>
      {/* 목차 */}
      <Paper
        variant="outlined"
        sx={{ width: { xs: '100%', md: 220 }, flexShrink: 0, position: { md: 'sticky' }, top: { md: 88 } }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 1, color: 'text.secondary' }}>
          기능 가이드
        </Typography>
        <List dense sx={{ pt: 0 }}>
          {GUIDE_SECTIONS.map((s) => (
            <ListItemButton key={s.id} selected={s.id === section.id} onClick={() => setActiveId(s.id)}>
              <ListItemText primary={s.title} />
            </ListItemButton>
          ))}
        </List>
      </Paper>

      {/* 본문 */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            {section.title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {section.summary}
          </Typography>
        </Box>

        {section.demos.map((d) => {
          const Demo = GUIDE_DEMOS[d.id as GuideDemoId];
          return Demo ? (
            <Paper key={d.id} variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {d.title}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  예시 화면 · 마우스를 올리면 멈춥니다
                </Typography>
              </Box>
              <Demo />
            </Paper>
          ) : null;
        })}

        {section.features.length > 0 && (
          <Paper variant="outlined">
            <Typography variant="subtitle1" sx={{ fontWeight: 600, p: 2, pb: 1 }}>
              주요 기능
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 180 }}>기능</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>사용 방법</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 90 }} align="center">
                      도입
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {section.features.map((f) => (
                    <TableRow key={f.name}>
                      <TableCell sx={{ fontWeight: 600, verticalAlign: 'top' }}>{f.name}</TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>{f.desc}</TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                        {f.since && <Chip label={f.since} size="small" variant="outlined" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {section.table && (
          <Paper variant="outlined">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {section.table.headers.map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {section.table.rows.map((row) => (
                    <TableRow key={row[0]}>
                      {row.map((cell, i) => (
                        <TableCell key={i} sx={i === 0 ? { fontFamily: 'monospace', whiteSpace: 'nowrap' } : undefined}>
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {section.tips.length > 0 && (
          <Alert severity="info" icon={false}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              알아두세요
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {section.tips.map((t) => (
                <li key={t}>
                  <Typography variant="body2">{t}</Typography>
                </li>
              ))}
            </Box>
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default GuidePage;

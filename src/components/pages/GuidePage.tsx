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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { GUIDE_DEMOS, GuideDemoId } from '../guide/GuideDemos';
import { GUIDE_SECTIONS } from '../../constants/guideContent';

// 모바일(< md) 카드 공통 스타일
const MOBILE_CARD_SX = { p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' };

const GuidePage: React.FC = () => {
  const theme = useTheme();
  const is_compact = useMediaQuery(theme.breakpoints.down('md'));
  const [active_id, setActiveId] = useState(GUIDE_SECTIONS[0].id);
  const section = GUIDE_SECTIONS.find((s) => s.id === active_id) ?? GUIDE_SECTIONS[0];

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 2, md: 3 },
        alignItems: { xs: 'stretch', md: 'flex-start' },
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      {/* 목차: 모바일은 상단 고정 가로 스크롤 칩 */}
      {is_compact ? (
        <Box
          role="tablist"
          aria-label="기능 가이드"
          sx={{
            position: 'sticky',
            top: 56,
            zIndex: 2,
            bgcolor: 'background.default',
            // Layout 좌우 여백(16px)만큼 끝까지 붙여 스크롤
            mx: -2,
            px: 2,
            py: 1,
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            scrollSnapType: 'x proximity',
            scrollPaddingInline: '16px',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {GUIDE_SECTIONS.map((s) => {
            const selected = s.id === section.id;
            return (
              <Chip
                key={s.id}
                role="tab"
                aria-selected={selected}
                label={s.title}
                clickable
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={(e) => {
                  setActiveId(s.id);
                  e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
                }}
                sx={{ flexShrink: 0, height: 36, fontSize: 14, scrollSnapAlign: 'start' }}
              />
            );
          })}
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ width: 220, flexShrink: 0, position: 'sticky', top: 88 }}>
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
      )}

      {/* 본문 */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: 20, md: '1.5rem' } }}>
            {section.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: 15, md: '1rem' } }}>
            {section.summary}
          </Typography>
        </Box>

        {section.demos.map((d) => {
          const Demo = GUIDE_DEMOS[d.id as GuideDemoId];
          return Demo ? (
            <Paper key={d.id} variant="outlined" sx={{ p: 2, borderRadius: { xs: 2, md: 1 } }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5, columnGap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {d.title}
                </Typography>
                {/* 터치 기기에는 hover가 없으므로 모바일에서 숨김 */}
                <Typography variant="caption" color="text.disabled" sx={{ display: { xs: 'none', md: 'block' } }}>
                  예시 화면 · 마우스를 올리면 멈춥니다
                </Typography>
              </Box>
              <Demo />
            </Paper>
          ) : null;
        })}

        {section.features.length > 0 &&
          (is_compact ? (
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 700, mb: 1 }}>주요 기능</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {section.features.map((f) => (
                  <Box key={f.name} sx={MOBILE_CARD_SX}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 600, minWidth: 0 }}>{f.name}</Typography>
                      {f.since && <Chip label={f.since} size="small" variant="outlined" sx={{ flexShrink: 0 }} />}
                    </Box>
                    <Typography sx={{ fontSize: 14, color: 'text.secondary', overflowWrap: 'anywhere' }}>{f.desc}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
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
          ))}

        {section.table &&
          (is_compact ? (
            // 모바일: 키캡 + 설명 행 (첫 열 = 키, 둘째 열 = 동작, 나머지는 보조 정보)
            <Box sx={{ borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper', overflow: 'hidden' }}>
              {section.table.rows.map((row) => (
                <Box
                  key={row[0]}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 1.5,
                    py: 1.25,
                    '&:not(:last-child)': { borderBottom: 1, borderColor: 'divider' },
                  }}
                >
                  <Box
                    component="kbd"
                    sx={{
                      flexShrink: 0,
                      minWidth: 88,
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      fontSize: 13,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      border: 1,
                      borderBottomWidth: 2,
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                    }}
                  >
                    {row[0]}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14 }}>{row[1]}</Typography>
                    {row
                      .slice(2)
                      .filter((cell) => cell && cell !== '—')
                      .map((cell) => (
                        <Typography key={cell} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {cell}
                        </Typography>
                      ))}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
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
          ))}

        {section.tips.length > 0 && (
          <Alert severity="info" icon={false} sx={{ borderRadius: { xs: 2, md: 1 } }}>
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

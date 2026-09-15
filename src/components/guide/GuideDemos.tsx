import React from 'react';
import { Box } from '@mui/material';
import {
  anim,
  At,
  ClickRing,
  Cursor,
  DemoFrame,
  KeyCap,
  MockButton,
  MockField,
  showBetween,
  timeline,
  Toast,
  typeReveal,
} from './demoKit';

// 가이드 예시 화면들. 실제 앱 화면을 단순화한 모형이며, 숫자·이름은 예시다.

const Bar: React.FC<{ color?: string; children?: React.ReactNode; sx?: object }> = ({ color = 'primary.main', children, sx }) => (
  <Box
    sx={{
      height: '100%',
      borderRadius: 1,
      bgcolor: color,
      color: 'primary.contrastText',
      fontSize: 10,
      px: 0.8,
      display: 'flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      ...sx,
    }}
  >
    {children}
  </Box>
);

const Chip: React.FC<{ children: React.ReactNode; sx?: object }> = ({ children, sx }) => (
  <Box component="span" sx={{ display: 'inline-block', px: 0.8, py: 0.1, borderRadius: 5, border: '1px solid', borderColor: 'divider', fontSize: 10, bgcolor: 'background.paper', ...sx }}>
    {children}
  </Box>
);

// 간트 공통 격자: 09~15시 6칸, 왼쪽 라벨 22%
const GANTT_LEFT = 22;
const hourX = (h: number) => GANTT_LEFT + ((h - 9) / 6) * (98 - GANTT_LEFT);

const GanttGrid: React.FC<{ rows: string[] }> = ({ rows }) => (
  <>
    {[9, 10, 11, 12, 13, 14, 15].map((h) => (
      <React.Fragment key={h}>
        <At x={hourX(h)} y={6} sx={{ transform: 'translateX(-50%)', fontSize: 10, color: 'text.secondary' }}>
          {String(h).padStart(2, '0')}:00
        </At>
        <At x={hourX(h)} y={14} h={80} sx={{ borderLeft: '1px dashed', borderColor: 'divider' }} />
      </React.Fragment>
    ))}
    {rows.map((r, i) => (
      <At key={i} x={2} y={22 + i * 22} w={GANTT_LEFT - 3} sx={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {r}
      </At>
    ))}
  </>
);

// ---------------------------------------------------------------------------
// 일간 타이머
// ---------------------------------------------------------------------------

/** 입력줄에 작업명 입력 → Enter → 진행 중 카드 */
export const TimerStartDemo: React.FC = () => {
  const D = 8;
  return (
    <DemoFrame still={6} height={220}>
      <At x={4} y={10} w={92}>
        <MockField sx={{ height: 36, fontSize: 13 }}>
          <Box sx={{ position: 'relative', flex: 1 }}>
            <Box component="span" sx={{ color: 'text.disabled', animation: anim(timeline([[0, 'opacity:1'], [14, 'opacity:1'], [15, 'opacity:0'], [97, 'opacity:0'], [100, 'opacity:1']]), D) }}>
              무엇을 하고 계신가요? (Enter로 바로 시작)
            </Box>
            <Box component="span" sx={{ position: 'absolute', left: 0, fontWeight: 600, animation: anim(typeReveal(15, 38), D) }}>
              코드리뷰 반영
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, color: 'text.disabled', fontSize: 11, mr: 1 }}>
            <span>프로젝트 코드</span>
            <span>카테고리</span>
          </Box>
          <Box sx={{ animation: anim(timeline([[0, 'opacity:0'], [40, 'opacity:0'], [41, 'opacity:1'], [48, 'opacity:1'], [49, 'opacity:0'], [100, 'opacity:0']]), D) }}>
            <KeyCap at={[45]} dur={D}>Enter</KeyCap>
          </Box>
        </MockField>
      </At>

      <At
        x={4}
        y={40}
        w={92}
        h={50}
        sx={{
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          animation: anim(timeline([[0, 'opacity:0; transform:translateY(12px)'], [47, 'opacity:0; transform:translateY(12px)'], [52, 'opacity:1; transform:translateY(0)'], [96, 'opacity:1; transform:translateY(0)'], [100, 'opacity:0; transform:translateY(0)']]), D),
          '&::before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: 'primary.main', borderRadius: '6px 0 0 6px' },
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
            <Chip sx={{ borderColor: 'primary.main', color: 'primary.main' }}>진행 중</Chip>
            <Chip sx={{ borderStyle: 'dashed', color: 'text.disabled' }}>카테고리 추가</Chip>
            <Chip sx={{ borderStyle: 'dashed', color: 'text.disabled' }}>프로젝트 추가</Chip>
          </Box>
          <Box sx={{ fontSize: 16, fontWeight: 700 }}>코드리뷰 반영</Box>
        </Box>
        <Box sx={{ position: 'relative', fontFamily: 'monospace', fontSize: 30, fontWeight: 300, width: 96, height: 36, mr: 1.5 }}>
          <Box sx={{ position: 'absolute', animation: anim(timeline([[0, 'opacity:1'], [74, 'opacity:1'], [75, 'opacity:0'], [100, 'opacity:0']]), D) }}>00:00</Box>
          <Box sx={{ position: 'absolute', animation: anim(timeline([[0, 'opacity:0'], [74, 'opacity:0'], [75, 'opacity:1'], [100, 'opacity:1']]), D) }}>00:01</Box>
        </Box>
        <MockButton primary>✓ 완료</MockButton>
      </At>
    </DemoFrame>
  );
};

/** 간트 빈칸 드래그 → 새 업무 기록 창 → 저장 → 막대 생성 */
export const GanttDragDemo: React.FC = () => {
  const D = 9;
  const x1 = hourX(11);
  const x2 = hourX(12.5);
  return (
    <DemoFrame still={7.5}>
      <GanttGrid rows={['ES2022 브랜치 최신화', '']} />
      <At x={hourX(9.5)} y={21} w={hourX(10.5) - hourX(9.5)} h={14}>
        <Bar>ES2022 브랜치 최신화</Bar>
      </At>

      {/* 드래그 선택 영역 */}
      <At
        x={x1}
        y={43}
        h={14}
        sx={{
          border: '2px dashed',
          borderColor: 'primary.main',
          bgcolor: 'action.selected',
          borderRadius: 1,
          animation: anim(timeline([[0, `width:0; opacity:0`], [12, `width:0; opacity:1`], [38, `width:${x2 - x1}%; opacity:1`], [70, `width:${x2 - x1}%; opacity:1`], [71, `width:${x2 - x1}%; opacity:0`], [100, 'width:0; opacity:0']]), D),
        }}
      />
      <At x={x2} y={36} sx={{ transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, color: 'primary.main', animation: anim(showBetween(20, 40), D) }}>
        11:00 ~ 12:30
      </At>

      {/* 저장 후 생긴 막대 */}
      <At x={x1} y={43} w={x2 - x1} h={14} sx={{ animation: anim(showBetween(72, 96), D) }}>
        <Bar color="secondary.main">회의록 정리</Bar>
      </At>
      <At x={2} y={44} sx={{ fontSize: 11, fontWeight: 600, animation: anim(showBetween(72, 96), D) }}>
        회의록 정리
      </At>

      {/* 새 업무 기록 창 */}
      <At
        x="50%"
        y={30}
        w={58}
        sx={{
          transform: 'translateX(-50%)',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          boxShadow: 6,
          p: 1.5,
          zIndex: 10,
          animation: anim(showBetween(42, 70), D),
        }}
      >
        <Box sx={{ fontWeight: 700, fontSize: 13, mb: 1.2 }}>새 업무 기록 (수동)</Box>
        <MockField label="업무 제목" sx={{ mb: 1 }}>
          <Box component="span" sx={{ animation: anim(typeReveal(46, 60), D) }}>회의록 정리</Box>
        </MockField>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <MockField label="시작" sx={{ flex: 1 }}>11:00</MockField>
          <MockField label="종료" sx={{ flex: 1 }}>12:30</MockField>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <MockButton primary>저장(Enter)</MockButton>
        </Box>
      </At>

      <Cursor
        dur={D}
        path={[
          [0, 55, 90],
          [10, x1, 50],
          [12, x1, 50],
          [38, x2, 50],
          [42, x2, 50],
          [62, 72, 80],
          [66, 72, 83],
          [72, 72, 83],
          [90, 55, 90],
          [100, 55, 90],
        ]}
      />
      <ClickRing x={x1} y={50} at={[11]} dur={D} />
      <ClickRing x={72.5} y={84} at={[67]} dur={D} />
    </DemoFrame>
  );
};

/** 막대 오른쪽 끝 드래그로 종료 시각 늘리기 + 스냅 */
export const GanttResizeDemo: React.FC = () => {
  const D = 7;
  const s = hourX(10);
  const e1 = hourX(11);
  const e2 = hourX(12);
  return (
    <DemoFrame still={4.5} height={200}>
      <GanttGrid rows={['PageSetup 분석', '회의']} />
      <At
        x={s}
        y={27}
        h={18}
        sx={{ animation: anim(timeline([[0, `width:${e1 - s}%`], [18, `width:${e1 - s}%`], [55, `width:${e2 - s}%`], [92, `width:${e2 - s}%`], [100, `width:${e1 - s}%`]]), D, 'ease-in-out') }}
      >
        <Bar sx={{ position: 'relative' }}>
          PageSetup 분석
          <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, bgcolor: 'rgba(255,255,255,.55)', borderRadius: '0 4px 4px 0' }} />
        </Bar>
      </At>
      <At x={e2} y={56} w={hourX(13) - e2} h={18}>
        <Bar color="secondary.main">회의</Bar>
      </At>
      {/* 스냅 기준선 */}
      <At x={e2} y={16} h={66} sx={{ borderLeft: '2px solid', borderColor: 'warning.main', animation: anim(showBetween(48, 62), D) }} />
      <At x={e2} y={84} sx={{ transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, color: 'warning.main', animation: anim(showBetween(48, 62), D) }}>
        자동 맞춤
      </At>
      {/* 시간 툴팁 */}
      <At
        y={8}
        sx={{
          transform: 'translateX(-50%)',
          px: 1,
          py: 0.3,
          borderRadius: 1,
          bgcolor: 'grey.900',
          color: 'common.white',
          fontSize: 10,
          whiteSpace: 'nowrap',
          zIndex: 5,
          animation: `${anim(timeline([[0, `left:${e1}%`], [18, `left:${e1}%`], [55, `left:${e2}%`], [100, `left:${e2}%`]]), D, 'ease-in-out')}, ${anim(showBetween(18, 70), D)}`,
        }}
      >
        <Box sx={{ position: 'relative', width: 112, height: 14 }}>
          <Box component="span" sx={{ position: 'absolute', left: 0, animation: anim(timeline([[0, 'opacity:1'], [40, 'opacity:1'], [41, 'opacity:0'], [100, 'opacity:0']]), D) }}>10:00 ~ 11:00 (60분)</Box>
          <Box component="span" sx={{ position: 'absolute', left: 0, animation: anim(timeline([[0, 'opacity:0'], [40, 'opacity:0'], [41, 'opacity:1'], [100, 'opacity:1']]), D) }}>10:00 ~ 12:00 (120분)</Box>
        </Box>
      </At>
      <Cursor dur={D} path={[[0, 70, 90], [15, e1 - 0.5, 32], [18, e1 - 0.5, 32], [55, e2 - 0.5, 32], [70, e2 - 0.5, 32], [90, 70, 90], [100, 70, 90]]} />
      <ClickRing x={e1} y={35} at={[17]} dur={D} />
    </DemoFrame>
  );
};

// ---------------------------------------------------------------------------
// 주간 일정
// ---------------------------------------------------------------------------

export const WeeklyCopyDemo: React.FC = () => {
  const D = 8;
  return (
    <DemoFrame still={5}>
      <At x={4} y={7} sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: 'background.paper' }}>
        {['간단형', '상세형', '라벨형'].map((t, i) => (
          <Box key={t} sx={{ px: 1.5, py: 0.5, fontSize: 11, fontWeight: 600, borderLeft: i ? '1px solid' : 'none', borderColor: 'divider', position: 'relative', zIndex: 1 }}>
            {t}
          </Box>
        ))}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '33.3%',
            bgcolor: 'action.selected',
            animation: anim(timeline([[0, 'left:0%'], [28, 'left:0%'], [32, 'left:66.6%'], [96, 'left:66.6%'], [100, 'left:0%']]), D, 'ease-in-out'),
          }}
        />
      </At>
      <At x={80} y={7}>
        <MockButton primary>복사</MockButton>
      </At>

      <At x={4} y={22} w={92} h={62} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', p: 1.2, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.7 }}>
        <Box sx={{ animation: anim(showBetween(1, 30), D) }}>
          <div>9/15(월)</div>
          <div>[A26_04719] ES2022 미지원 브라우저 알럿 · 진행중 · 3시간</div>
          <div>&nbsp;&nbsp;&gt; 구형 기기 테스트 (1.5시간)</div>
          <div>&nbsp;&nbsp;&gt; 브랜치 최신화 (0.5시간)</div>
          <div>[A25_05591] 관리업무 · 완료 · 1시간</div>
        </Box>
        <Box sx={{ position: 'absolute', inset: 10, fontFamily: 'inherit', animation: anim(showBetween(33, 96), D) }}>
          <div>9/15(월)</div>
          {[
            ['A26_04719', '#FFE08A', 'ES2022 미지원 브라우저 알럿', '진행중'],
            ['A25_05591', '#B9E3C6', '관리업무', '완료'],
          ].map(([code, color, name, st]) => (
            <Box key={code} sx={{ display: 'flex', gap: 1, alignItems: 'center', my: 0.5 }}>
              <Box component="span" sx={{ bgcolor: color, color: '#333', px: 0.8, borderRadius: 0.5, fontWeight: 700 }}>{code}</Box>
              <span>{name}</span>
              <Chip>{st}</Chip>
            </Box>
          ))}
          <div>&nbsp;&nbsp;&gt; 구형 기기 테스트 (1.5시간)</div>
        </Box>
      </At>

      <Cursor dur={D} path={[[0, 50, 95], [24, 23, 11], [30, 23, 11], [58, 83, 11], [66, 83, 11], [90, 50, 95], [100, 50, 95]]} />
      <ClickRing x={23.5} y={12} at={[29]} dur={D} />
      <ClickRing x={83.5} y={12} at={[64]} dur={D} />
      <Toast from={67} to={92} dur={D}>클립보드에 복사되었습니다.</Toast>
    </DemoFrame>
  );
};

// ---------------------------------------------------------------------------
// 배포 캘린더
// ---------------------------------------------------------------------------

export const DeployDragDemo: React.FC = () => {
  const D = 7;
  const days = ['9/15(월)', '9/16(화)', '9/17(수)', '9/18(목)', '9/19(금)'];
  const colX = (i: number) => 3 + i * 19;
  return (
    <DemoFrame still={4.5} height={200}>
      {days.map((d, i) => (
        <React.Fragment key={d}>
          <At x={colX(i)} y={8} w={18.5} sx={{ textAlign: 'center', fontWeight: 700, fontSize: 11, py: 0.5, bgcolor: 'action.hover', borderRadius: '4px 4px 0 0' }}>
            {d}
          </At>
          <At x={colX(i)} y={21} w={18.5} h={60} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', borderRadius: '0 0 4px 4px' }} />
        </React.Fragment>
      ))}
      <At x={colX(0) + 0.8} y={26} w={17}>
        <Box sx={{ bgcolor: '#F4B6C2', color: '#333', borderRadius: 0.5, px: 0.8, py: 0.4, fontSize: 10, fontWeight: 600 }}>브라우저 PDF 수시</Box>
      </At>
      <At
        y={26}
        w={17}
        sx={{ zIndex: 5, animation: anim(timeline([[0, `left:${colX(1) + 0.8}%; transform:scale(1)`], [18, `left:${colX(1) + 0.8}%; transform:scale(1.05)`], [50, `left:${colX(3) + 0.8}%; transform:scale(1.05)`], [55, `left:${colX(3) + 0.8}%; transform:scale(1)`], [94, `left:${colX(3) + 0.8}%; transform:scale(1)`], [100, `left:${colX(1) + 0.8}%; transform:scale(1)`]]), D, 'ease-in-out') }}
      >
        <Box sx={{ bgcolor: '#FFE08A', color: '#333', borderRadius: 0.5, px: 0.8, py: 0.4, fontSize: 10, fontWeight: 600, boxShadow: 3 }}>ES2022 알럿 스테이지</Box>
      </At>
      <Cursor dur={D} path={[[0, 60, 95], [15, colX(1) + 9, 30], [18, colX(1) + 9, 30], [50, colX(3) + 9, 30], [60, colX(3) + 9, 30], [85, 60, 95], [100, 60, 95]]} />
      <Toast from={56} to={88} dur={D}>9/18로 이동했습니다</Toast>
    </DemoFrame>
  );
};

// ---------------------------------------------------------------------------
// 프로젝트 분석
// ---------------------------------------------------------------------------

export const AnalysisDemo: React.FC = () => {
  const D = 8;
  const cats: [string, number, string][] = [
    ['개발', 48, 'primary.main'],
    ['분석', 22, 'secondary.main'],
    ['질의응답', 18, 'warning.main'],
    ['회의', 12, 'success.main'],
  ];
  let acc = 0;
  return (
    <DemoFrame still={6}>
      <At x={4} y={6} sx={{ fontWeight: 700, fontSize: 12 }}>카테고리별 비율</At>
      <At x={4} y={15} w={92} h={8} sx={{ display: 'flex', borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
        {cats.map(([name, pct, color]) => {
          const from = acc;
          acc += pct;
          return (
            <Box
              key={name}
              sx={{ height: '100%', bgcolor: color, color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap', animation: anim(timeline([[0, 'width:0%'], [2 + from / 5, 'width:0%'], [8 + acc / 5, `width:${pct}%`], [96, `width:${pct}%`], [100, 'width:0%']]), D, 'ease-out') }}
            >
              {name} {pct}%
            </Box>
          );
        })}
      </At>

      <At x={4} y={30} w={92} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' }}>
        {[
          ['▸ 개발', '6회', '480분', '48%'],
          ['▸ 분석', '3회', '220분', '22%'],
        ].map((r, i) => (
          <React.Fragment key={r[0]}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', px: 1.2, py: 0.7, fontWeight: 600, borderTop: i ? '1px solid' : 'none', borderColor: 'divider', animation: i === 0 ? anim(timeline([[0, 'background-color: transparent'], [38, 'background-color: transparent'], [39, 'background-color: rgba(127,127,127,.15)'], [96, 'background-color: rgba(127,127,127,.15)'], [100, 'background-color: transparent']]), D) : undefined }}>
              {r.map((c) => <span key={c}>{c}</span>)}
            </Box>
            {i === 0 && (
              <Box sx={{ overflow: 'hidden', animation: anim(timeline([[0, 'max-height:0'], [40, 'max-height:0'], [50, 'max-height:80px'], [96, 'max-height:80px'], [100, 'max-height:0']]), D, 'ease-out') }}>
                {[
                  ['ES2022 미지원 브라우저 알럿', '4회', '300분', '63%'],
                  ['PageSetup v2 함수 개발', '2회', '180분', '37%'],
                ].map((sub) => (
                  <Box key={sub[0]} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', px: 1.2, pl: 3, py: 0.6, color: 'text.secondary', borderTop: '1px dashed', borderColor: 'divider' }}>
                    {sub.map((c) => <span key={c}>{c}</span>)}
                  </Box>
                ))}
              </Box>
            )}
          </React.Fragment>
        ))}
      </At>
      <Cursor dur={D} path={[[0, 60, 95], [30, 10, 36], [40, 10, 36], [70, 60, 95], [100, 60, 95]]} />
      <ClickRing x={10.5} y={37} at={[38]} dur={D} />
    </DemoFrame>
  );
};

// ---------------------------------------------------------------------------
// 시간관리
// ---------------------------------------------------------------------------

/** 작업 → 시간(분) 순서로 눌러 다중 정렬 */
export const MultiSortDemo: React.FC = () => {
  const D = 9;
  const ROW = 13; // 행 높이(%)
  const TOP = 24;
  // [작업, 시간, 처음 위치, 작업 정렬 후, 시간까지 정렬 후]
  const rows: [string, string, number, number, number][] = [
    ['ES2022 알럿', '30', 0, 0, 1],
    ['관리업무', '10', 1, 2, 2],
    ['ES2022 알럿', '20', 2, 1, 0],
    ['관리업무', '50', 3, 3, 3],
  ];
  const badge = (from: number) =>
    timeline([[0, 'opacity:0; transform:scale(.4)'], [from, 'opacity:0; transform:scale(.4)'], [from + 3, 'opacity:1; transform:scale(1)'], [95, 'opacity:1; transform:scale(1)'], [100, 'opacity:0; transform:scale(.4)']]);
  return (
    <DemoFrame still={7}>
      <At x={4} y={10} w={92} h={13} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', alignItems: 'center', px: 1.2, fontWeight: 700, bgcolor: 'action.hover', borderRadius: '4px 4px 0 0' }}>
        <span>
          작업 ▴
          <Box component="sup" sx={{ ml: 0.3, color: 'primary.main', display: 'inline-block', animation: anim(badge(20), D) }}>1</Box>
        </span>
        <span>업무형</span>
        <span>
          시간(분) ▴
          <Box component="sup" sx={{ ml: 0.3, color: 'primary.main', display: 'inline-block', animation: anim(badge(55), D) }}>2</Box>
        </span>
      </At>
      {rows.map(([name, min, p0, p1, p2], i) => (
        <At
          key={i}
          x={4}
          w={92}
          h={ROW}
          sx={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            alignItems: 'center',
            px: 1.2,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            animation: anim(timeline([[0, `top:${TOP + p0 * ROW}%`], [20, `top:${TOP + p0 * ROW}%`], [30, `top:${TOP + p1 * ROW}%`], [55, `top:${TOP + p1 * ROW}%`], [65, `top:${TOP + p2 * ROW}%`], [95, `top:${TOP + p2 * ROW}%`], [100, `top:${TOP + p0 * ROW}%`]]), D, 'ease-in-out'),
          }}
        >
          <span>{name}</span>
          <span>작업</span>
          <span>{min}</span>
        </At>
      ))}
      <Cursor dur={D} path={[[0, 50, 95], [14, 10, 16], [20, 10, 16], [48, 71, 16], [55, 71, 16], [80, 50, 95], [100, 50, 95]]} />
      <ClickRing x={10.5} y={17} at={[19]} dur={D} />
      <ClickRing x={71.5} y={17} at={[54]} dur={D} />
      <At x={4} y={80} sx={{ fontSize: 11, color: 'text.secondary', animation: anim(showBetween(66, 95), D) }}>
        작업별로 묶인 채, 같은 작업 안에서 시간순으로 정렬됩니다.
      </At>
    </DemoFrame>
  );
};

// ---------------------------------------------------------------------------
// ERP 시간관리 등록
// ---------------------------------------------------------------------------

export const ErpRegisterDemo: React.FC = () => {
  const D = 11;
  return (
    <DemoFrame still={9.5} height={300}>
      <At x={4} y={5} sx={{ fontWeight: 700, fontSize: 13 }}>ERP 시간관리 등록 — 2026-09-15</At>
      <At x={4} y={14} w={92}>
        <MockField label="ERP 세션 (로그인된 ERP 주소창 URL 전체 또는 ec_req_sid)">
          <Box component="span" sx={{ animation: anim(typeReveal(3, 15), D) }}>https://logine.ecount.com/ec56/view/erp?w_flag=1&amp;ec_req_sid=E-ET…</Box>
        </MockField>
        <Box sx={{ fontSize: 10, color: 'text.secondary', mt: 0.3, animation: anim(showBetween(16, 97), D) }}>세션 E-ET… · https://logine.ecount.com</Box>
      </At>

      {/* 매핑 찾기 영역 */}
      <At x={4} y={30} w={92} sx={{ border: '1px solid', borderColor: 'error.light', borderRadius: 1, p: 1, bgcolor: 'background.paper', animation: anim(showBetween(1, 50), D) }}>
        <Box sx={{ color: 'error.main', fontSize: 11, mb: 0.8 }}>⚠ 1행 (PageSetup v2 회의): 매핑 없음: A26_04864</Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <MockField label="프로젝트 코드 또는 작업 번호" sx={{ width: '34%' }}>A26_04864</MockField>
          <MockButton>🔍 찾기</MockButton>
          <MockButton primary>매핑 추가</MockButton>
          <Box sx={{ fontSize: 10, color: 'text.secondary', animation: anim(showBetween(32, 50), D) }}>작업 12221 · PageSetup v2 / 개발 22247</Box>
        </Box>
      </At>

      {/* 미리보기 표 */}
      <At x={4} y={30} w={92} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', animation: anim(showBetween(51, 97), D) }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr .7fr 1fr .7fr 2fr', px: 1, py: 0.6, fontWeight: 700, bgcolor: 'action.hover' }}>
          <span>작업</span><span>업무</span><span>카테고리</span><span>시간(분)</span><span>비고</span>
        </Box>
        {[
          ['PageSetup v2 함수 개발', '개발', '05 회의', '35', 'PageSetup v2 회의'],
          ['시간관리 보고서 작성', '작업', '11 문서작업', '42', '시간관리 입력'],
        ].map((r) => (
          <Box key={r[0]} sx={{ display: 'grid', gridTemplateColumns: '2fr .7fr 1fr .7fr 2fr', px: 1, py: 0.5, borderTop: '1px solid', borderColor: 'divider', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {r.map((c) => <span key={c}>{c}</span>)}
          </Box>
        ))}
      </At>

      <At x="auto" y="auto" sx={{ right: '4%', bottom: 14, display: 'flex', gap: 1 }}>
        <MockButton>콘솔 스크립트 복사</MockButton>
        <MockButton primary>ERP에 저장</MockButton>
      </At>

      {/* 확인창 */}
      <At x="50%" y={35} sx={{ transform: 'translateX(-50%)', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: 8, borderRadius: 1.5, p: 1.5, zIndex: 12, animation: anim(showBetween(66, 76), D) }}>
        <Box sx={{ mb: 1, fontSize: 12 }}>2026-09-15 시간 로그 8행 480분을 ERP에 저장할까요?</Box>
        <Box sx={{ textAlign: 'right' }}><MockButton primary>확인</MockButton></Box>
      </At>
      <At x={4} y={66} w={92} sx={{ bgcolor: 'success.main', color: 'success.contrastText', borderRadius: 1, px: 1.2, py: 0.6, fontWeight: 600, animation: anim(showBetween(78, 97), D) }}>
        저장 완료: 시간 로그 91304번
      </At>

      <Cursor
        dur={D}
        path={[
          [0, 50, 97],
          [2, 20, 19],
          [16, 20, 19],
          [26, 45, 44],
          [30, 45, 44],
          [42, 58, 44],
          [48, 58, 44],
          [60, 90, 91],
          [65, 90, 91],
          [70, 60, 49],
          [74, 60, 49],
          [90, 50, 97],
          [100, 50, 97],
        ]}
      />
      <ClickRing x={45.5} y={45} at={[29]} dur={D} />
      <ClickRing x={58.5} y={45} at={[46]} dur={D} />
      <ClickRing x={90.5} y={92} at={[64]} dur={D} />
      <ClickRing x={60.5} y={50} at={[74]} dur={D} />
    </DemoFrame>
  );
};

// ---------------------------------------------------------------------------
// 설정
// ---------------------------------------------------------------------------

export const PruneDemo: React.FC = () => {
  const D = 9;
  return (
    <DemoFrame still={5.5} height={230}>
      <At x={4} y={7} sx={{ fontWeight: 700, fontSize: 13 }}>오래된 기록 정리</At>
      <At x={4} y={20} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <MockField label="이 날짜 이전 기록 삭제" sx={{ width: 150 }}>
          <Box component="span" sx={{ color: 'text.disabled', animation: anim(timeline([[0, 'opacity:1'], [14, 'opacity:1'], [15, 'opacity:0'], [97, 'opacity:0'], [100, 'opacity:1']]), D) }}>연도. 월. 일.</Box>
          <Box component="span" sx={{ position: 'absolute', left: 8, animation: anim(showBetween(15, 72), D) }}>2026. 09. 01.</Box>
        </MockField>
        <MockButton>먼저 백업</MockButton>
        <MockButton sx={{ color: 'error.main', borderColor: 'error.main' }}>🗑 삭제</MockButton>
      </At>
      <At x={4} y={40} w={92} sx={{ fontSize: 11, color: 'text.secondary' }}>
        <Box sx={{ position: 'absolute', animation: anim(timeline([[0, 'opacity:1'], [15, 'opacity:1'], [16, 'opacity:0'], [73, 'opacity:0'], [74, 'opacity:1'], [100, 'opacity:1']]), D) }}>
          백업 파일이 너무 커지면 지난 기록을 지워 용량을 줄일 수 있습니다.
        </Box>
        <Box sx={{ position: 'absolute', color: 'text.primary', fontWeight: 600, animation: anim(showBetween(16, 72), D) }}>
          삭제 대상: 타이머 기록 1,204건 · 휴지통 27건 · 시간관리 행 612건
        </Box>
      </At>
      <At x="50%" y={40} sx={{ transform: 'translateX(-50%)', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: 8, borderRadius: 1.5, p: 1.5, zIndex: 12, width: '62%', animation: anim(showBetween(58, 70), D) }}>
        <Box sx={{ mb: 1 }}>2026-09-01 이전 데이터를 삭제합니다. 되돌릴 수 없습니다. 계속할까요?</Box>
        <Box sx={{ textAlign: 'right' }}><MockButton primary>확인</MockButton></Box>
      </At>
      <At x={4} y={84} w={92} sx={{ fontSize: 10, color: 'text.secondary', textAlign: 'center' }}>
        현재 저장 용량:{' '}
        <Box component="span" sx={{ position: 'relative', display: 'inline-block', width: 60, height: 14, verticalAlign: 'bottom' }}>
          <Box component="span" sx={{ position: 'absolute', left: 0, fontWeight: 700, animation: anim(timeline([[0, 'opacity:1'], [71, 'opacity:1'], [72, 'opacity:0'], [97, 'opacity:0'], [100, 'opacity:1']]), D) }}>1,784 KB</Box>
          <Box component="span" sx={{ position: 'absolute', left: 0, fontWeight: 700, color: 'success.main', animation: anim(showBetween(72, 97), D) }}>612 KB</Box>
        </Box>
      </At>
      <Toast from={36} to={52} dur={D}>timekeeper-backup-2026-09-15.json 다운로드</Toast>
      <Cursor dur={D} path={[[0, 50, 97], [10, 15, 26], [14, 15, 26], [28, 34, 26], [34, 34, 26], [46, 45, 26], [54, 45, 26], [64, 70, 58], [69, 70, 58], [85, 50, 97], [100, 50, 97]]} />
      <ClickRing x={15.5} y={27} at={[13]} dur={D} />
      <ClickRing x={34.5} y={27} at={[33]} dur={D} />
      <ClickRing x={45.5} y={27} at={[53]} dur={D} />
      <ClickRing x={70.5} y={59} at={[68]} dur={D} />
    </DemoFrame>
  );
};

// ---------------------------------------------------------------------------
// 시작하기 · 단축키 · Q&A
// ---------------------------------------------------------------------------

/** 하루 흐름: 단계 카드가 차례로 켜진다 */
export const DayFlowDemo: React.FC = () => {
  const D = 8;
  const steps = ['① 일간 타이머\n업무 시작·기록', '② 최근 업무 기록\n시간·비고 다듬기', '③ 시간관리\nERP 형식 표', '④ ERP에 저장\n시간 로그 등록'];
  return (
    <DemoFrame still={7} height={170}>
      {steps.map((s, i) => {
        const on = 5 + i * 20;
        return (
          <React.Fragment key={s}>
            <At
              x={3 + i * 24.5}
              y={22}
              w={20}
              h={48}
              sx={{
                border: '2px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                whiteSpace: 'pre-line',
                fontWeight: 600,
                animation: anim(timeline([[0, 'transform:scale(1); box-shadow:none; opacity:.45'], [on, 'transform:scale(1); opacity:.45'], [on + 4, 'transform:scale(1.06); opacity:1'], [on + 10, 'transform:scale(1); opacity:1'], [95, 'transform:scale(1); opacity:1'], [100, 'transform:scale(1); opacity:.45']]), D),
              }}
            >
              {s}
            </At>
            {i < steps.length - 1 && (
              <At x={23.3 + i * 24.5} y={40} sx={{ fontSize: 18, color: 'primary.main', animation: anim(showBetween(on + 8, 96), D) }}>
                →
              </At>
            )}
          </React.Fragment>
        );
      })}
      <At x={3} y={80} w={94} sx={{ textAlign: 'center', fontSize: 11, color: 'text.secondary' }}>
        주간 일정·프로젝트 분석은 ② 기록을 그대로 읽어 보여줍니다.
      </At>
    </DemoFrame>
  );
};

/** Alt+1~5 로 탭 이동 */
export const ShortcutDemo: React.FC = () => {
  const D = 7;
  const tabs = ['일간 타이머', '주간 일정', '배포 캘린더', '프로젝트 분석', '시간관리'];
  const at = (i: number) => 8 + i * 18;
  const W = 94 / 5; // 탭 한 칸 폭(%)
  return (
    <DemoFrame still={3} height={170}>
      <At x={3} y={12} w={94} h={26} sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
        {tabs.map((t) => (
          <Box key={t} sx={{ width: `${100 / tabs.length}%`, textAlign: 'center', alignSelf: 'center', fontWeight: 600 }}>{t}</Box>
        ))}
      </At>
      <At
        y={37}
        w={W}
        h={2}
        sx={{ bgcolor: 'primary.main', animation: anim(timeline(([[0, 'left:3%']] as [number, string][]).concat(tabs.flatMap((_, i) => [[at(i), `left:${3 + i * W}%`], [at(i) + 14, `left:${3 + i * W}%`]] as [number, string][]), [[100, 'left:3%']])), D, 'ease-in-out') }}
      />
      <At x="50%" y={55} sx={{ transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }}>
        <KeyCap at={tabs.map((_, i) => at(i))} dur={D}>Alt</KeyCap>
        <Box sx={{ mx: 0.5 }}>+</Box>
        <Box sx={{ position: 'relative', width: 34, height: 26 }}>
          {tabs.map((_, i) => (
            <Box key={i} sx={{ position: 'absolute', inset: 0, animation: anim(showBetween(at(i) - 2, at(i) + 15), D) }}>
              <KeyCap at={[at(i)]} dur={D}>{i + 1}</KeyCap>
            </Box>
          ))}
        </Box>
      </At>
    </DemoFrame>
  );
};

/** Q&A 글쓰기 */
export const QnaDemo: React.FC = () => {
  const D = 9;
  return (
    <DemoFrame still={8} height={230}>
      <At x={4} y={6} sx={{ fontWeight: 700, fontSize: 13 }}>건의사항</At>
      <At x={82} y={5}><MockButton primary>✎ 글쓰기</MockButton></At>
      <At x={4} y={20} w={92} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box sx={{ overflow: 'hidden', animation: anim(timeline([[0, 'max-height:0'], [74, 'max-height:0'], [80, 'max-height:40px'], [97, 'max-height:40px'], [100, 'max-height:0']]), D) }}>
          <Box sx={{ px: 1.2, py: 0.8, display: 'flex', gap: 1, alignItems: 'center', bgcolor: 'action.selected' }}>
            <Chip>아이디어</Chip>
            <b>주간 일정에 월간 보기 추가 요청</b>
            <Box component="span" sx={{ ml: 'auto', color: 'text.secondary', fontSize: 10 }}>익명 · 방금</Box>
          </Box>
        </Box>
        {['[릴리즈 노트] v.1.0.1 자동 백업 폴더 지정', '[버그] 예약 모드 시간 잘림'].map((t) => (
          <Box key={t} sx={{ px: 1.2, py: 0.8, borderTop: '1px solid', borderColor: 'divider' }}>{t}</Box>
        ))}
      </At>
      <At x="50%" y={16} w={60} sx={{ transform: 'translateX(-50%)', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: 8, borderRadius: 1.5, p: 1.5, zIndex: 12, animation: anim(showBetween(12, 72), D) }}>
        <Box sx={{ fontWeight: 700, mb: 1 }}>새 게시글 작성</Box>
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
          <Chip sx={{ borderColor: 'primary.main', color: 'primary.main' }}>아이디어</Chip><Chip>버그</Chip><Chip>기타</Chip>
        </Box>
        <MockField label="제목" sx={{ mb: 1 }}><Box component="span" sx={{ animation: anim(typeReveal(18, 38), D) }}>주간 일정에 월간 보기 추가 요청</Box></MockField>
        <MockField label="비밀번호" sx={{ mb: 1 }}><Box component="span" sx={{ animation: anim(typeReveal(42, 50), D) }}>••••</Box></MockField>
        <Box sx={{ textAlign: 'right' }}><MockButton primary>등록하기</MockButton></Box>
      </At>
      <Cursor dur={D} path={[[0, 50, 97], [8, 86, 10], [12, 86, 10], [56, 74, 82], [66, 74, 82], [85, 50, 97], [100, 50, 97]]} />
      <ClickRing x={86.5} y={11} at={[11]} dur={D} />
      <ClickRing x={74.5} y={83} at={[64]} dur={D} />
    </DemoFrame>
  );
};

export const GUIDE_DEMOS = {
  dayFlow: DayFlowDemo,
  timerStart: TimerStartDemo,
  ganttDrag: GanttDragDemo,
  ganttResize: GanttResizeDemo,
  weeklyCopy: WeeklyCopyDemo,
  deployDrag: DeployDragDemo,
  analysis: AnalysisDemo,
  multiSort: MultiSortDemo,
  erpRegister: ErpRegisterDemo,
  prune: PruneDemo,
  shortcut: ShortcutDemo,
  qna: QnaDemo,
} as const;

export type GuideDemoId = keyof typeof GUIDE_DEMOS;

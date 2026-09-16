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

/** 예약 모드 켜기 → 작업명·시간 입력 → 예약 등록 → 시각이 되면 자동 시작 */
export const ScheduleDemo: React.FC = () => {
  const D = 11;
  const hx = (h: number) => 22 + ((h - 12) / 4) * 74; // 12~16시
  const ON = 8; // 예약 모드 켜지는 시점(%)
  const REG = 40; // 예약 등록 시점(%)
  const START = 74; // 예약 시각 도달 시점(%)
  const iconColor = (on: number, off: number) =>
    timeline([[0, 'color: rgba(127,127,127,.8)'], [on - 0.1, 'color: rgba(127,127,127,.8)'], [on, 'color: #ed6c02'], [off, 'color: #ed6c02'], [off + 0.1, 'color: rgba(127,127,127,.8)'], [100, 'color: rgba(127,127,127,.8)']]);
  return (
    <DemoFrame still={9} height={300}>
      {/* 타이머 입력줄 */}
      <At
        x={3}
        y={4}
        w={94}
        sx={{
          border: '1px solid',
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          px: 1.2,
          animation: anim(timeline([[0, 'border-color: rgba(127,127,127,.3)'], [ON - 0.1, 'border-color: rgba(127,127,127,.3)'], [ON, 'border-color: #ed6c02'], [REG + 2, 'border-color: #ed6c02'], [REG + 2.1, 'border-color: rgba(127,127,127,.3)'], [100, 'border-color: rgba(127,127,127,.3)']]), D),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', height: 36, gap: 1 }}>
          <Box sx={{ position: 'relative', flex: 1, fontSize: 13, whiteSpace: 'nowrap' }}>
            <Box component="span" sx={{ color: 'text.disabled', animation: anim(timeline([[0, 'opacity:1'], [ON - 0.1, 'opacity:1'], [ON, 'opacity:0'], [REG + 2, 'opacity:0'], [REG + 2.1, 'opacity:1'], [100, 'opacity:1']]), D) }}>
              무엇을 하고 계신가요? (Enter로 바로 시작)
            </Box>
            <Box component="span" sx={{ position: 'absolute', left: 0, color: 'text.disabled', animation: anim(timeline([[0, 'opacity:0'], [ON - 0.1, 'opacity:0'], [ON, 'opacity:1'], [11.9, 'opacity:1'], [12, 'opacity:0'], [100, 'opacity:0']]), D) }}>
              예약할 작업명을 입력하세요
            </Box>
            <Box component="span" sx={{ position: 'absolute', left: 0, fontWeight: 600, animation: `${anim(typeReveal(12, 28), D)}, ${anim(showBetween(12, REG + 1), D)}` }}>
              배포 점검 회의
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, color: 'text.disabled', fontSize: 11 }}>
            <span>프로젝트 코드</span>
            <span>카테고리</span>
          </Box>
          {/* 예약 모드 토글(시계) */}
          <Box sx={{ display: 'flex', animation: anim(iconColor(ON, REG + 2), D) }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
          </Box>
          {/* 시작 ▶ / 예약 등록(달력) */}
          <Box sx={{ position: 'relative', width: 24, height: 24 }}>
            <Box sx={{ position: 'absolute', inset: 0, color: 'primary.main', animation: anim(timeline([[0, 'opacity:1'], [ON - 0.1, 'opacity:1'], [ON, 'opacity:0'], [REG + 2, 'opacity:0'], [REG + 2.1, 'opacity:1'], [100, 'opacity:1']]), D) }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </Box>
            <Box sx={{ position: 'absolute', inset: 0, color: '#ed6c02', animation: anim(showBetween(ON, REG + 2), D) }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10H7v2h10v-2zm2-7h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zm-5-5H7v2h7v-2z" />
              </svg>
            </Box>
          </Box>
        </Box>
        {/* 예약 시간 줄 */}
        <Box sx={{ overflow: 'hidden', animation: anim(timeline([[0, 'max-height:0'], [ON, 'max-height:0'], [ON + 3, 'max-height:34px'], [REG + 1, 'max-height:34px'], [REG + 4, 'max-height:0'], [100, 'max-height:0']]), D, 'ease-out') }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, fontSize: 12 }}>
            <Box component="span" sx={{ color: 'text.secondary', fontSize: 11 }}>예약 시간:</Box>
            <span>오후 01:00 🕒</span>
            <Box component="span" sx={{ color: 'text.secondary' }}>~</Box>
            <span>오후 02:00 🕒</span>
            <Box component="span" sx={{ ml: 1, fontSize: 10, color: 'text.disabled' }}>다음 정시로 자동 입력</Box>
          </Box>
        </Box>
      </At>

      {/* 타임라인 */}
      {[12, 13, 14, 15, 16].map((h) => (
        <React.Fragment key={h}>
          <At x={hx(h)} y={36} sx={{ transform: 'translateX(-50%)', fontSize: 10, color: 'text.secondary' }}>
            {String(h).padStart(2, '0')}:00
          </At>
          <At x={hx(h)} y={43} h={36} sx={{ borderLeft: '1px dashed', borderColor: 'divider' }} />
        </React.Fragment>
      ))}
      <At x={2} y={49} w={19} sx={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', animation: anim(showBetween(REG + 1, 97), D) }}>
        배포 점검 회의
      </At>
      {/* 예약 막대: 점선 + 사선 무늬 */}
      <At
        x={hx(13)}
        y={47}
        w={hx(14) - hx(13)}
        h={11}
        sx={{
          border: '2px dashed #ed6c02',
          borderRadius: 1,
          color: '#ed6c02',
          fontSize: 10,
          fontWeight: 700,
          px: 0.8,
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          background: 'repeating-linear-gradient(45deg, rgba(237,108,2,.14) 0 6px, transparent 6px 12px)',
          animation: anim(showBetween(REG + 1, START), D),
        }}
      >
        [예약] 배포 점검 회의
      </At>
      {/* 시각 도달 후 진행 중 막대 */}
      <At x={hx(13)} y={47} h={11} sx={{ animation: `${anim(showBetween(START + 0.5, 97), D)}, ${anim(timeline([[0, 'width:0.5%'], [START, 'width:0.5%'], [97, `width:${(hx(13.4) - hx(13)).toFixed(2)}%`], [100, 'width:0.5%']]), D)}` }}>
        <Bar>진행 중</Bar>
      </At>
      {/* 현재 시각 선 */}
      <At
        y={41}
        h={40}
        sx={{
          borderLeft: '2px solid',
          borderColor: 'error.main',
          zIndex: 4,
          animation: anim(timeline([[0, `left:${hx(12.5)}%`], [REG + 2, `left:${hx(12.5)}%`], [START, `left:${hx(13)}%`], [97, `left:${hx(13.4)}%`], [100, `left:${hx(12.5)}%`]]), D, 'linear'),
          '&::before': { content: '""', position: 'absolute', top: -3, left: -5, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' },
        }}
      />
      <At x={hx(12.5)} y={82} sx={{ transform: 'translateX(-50%)', fontSize: 10, color: 'error.main', fontWeight: 700, animation: anim(showBetween(REG + 3, START - 2), D) }}>
        시작 시각까지 대기 중
      </At>

      {/* 자동 시작된 진행 중 카드 */}
      <At
        x={3}
        y={84}
        w={94}
        h={13}
        sx={{
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          px: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          animation: anim(timeline([[0, 'opacity:0; transform:translateY(10px)'], [START, 'opacity:0; transform:translateY(10px)'], [START + 4, 'opacity:1; transform:translateY(0)'], [96, 'opacity:1; transform:translateY(0)'], [100, 'opacity:0; transform:translateY(0)']]), D),
        }}
      >
        <Chip sx={{ borderColor: 'primary.main', color: 'primary.main' }}>진행 중</Chip>
        <Box sx={{ fontWeight: 700 }}>배포 점검 회의</Box>
        <Box sx={{ ml: 'auto', fontSize: 10, color: 'text.secondary' }}>예약 시각 13:00에 자동 시작 · 14:00에 자동 완료</Box>
      </At>

      <Cursor
        dur={D}
        path={[
          [0, 50, 97],
          [5, 88.5, 8],
          [ON + 1, 88.5, 8],
          [30, 94, 8],
          [REG - 1, 94, 8],
          [REG + 8, 60, 97],
          [100, 60, 97],
        ]}
      />
      <ClickRing x={89} y={9.5} at={[ON - 1]} dur={D} />
      <ClickRing x={94.5} y={9.5} at={[REG - 1]} dur={D} />
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
        <Box sx={{ fontWeight: 700, fontSize: 13, mb: 0.6 }}>새 업무 기록 (수동)</Box>
        <Box sx={{ fontSize: 11, color: 'text.secondary', mb: 1.2 }}>시간: 11:00 ~ 12:30</Box>
        <MockField label="업무 제목" sx={{ mb: 1 }}>
          <Box component="span" sx={{ animation: anim(typeReveal(46, 60), D) }}>회의록 정리</Box>
        </MockField>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <MockField label="프로젝트 코드" sx={{ flex: 1 }} />
          <MockField label="카테고리" sx={{ flex: 1 }} />
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <MockButton primary>저장(Enter)</MockButton>
        </Box>
      </At>

      <Cursor
        dur={D}
        path={[
          [0, 55, 95],
          [10, x1, 50],
          [12, x1, 50],
          [38, x2, 50],
          [42, x2, 50],
          [62, 72, 86],
          [66, 72, 89],
          [72, 72, 89],
          [90, 55, 95],
          [100, 55, 95],
        ]}
      />
      <ClickRing x={x1} y={50} at={[11]} dur={D} />
      <ClickRing x={72.5} y={90} at={[67]} dur={D} />
    </DemoFrame>
  );
};

const ORANGE = '#ed6c02';
const HATCH = 'repeating-linear-gradient(45deg, rgba(237,108,2,.14) 0 6px, transparent 6px 12px)';

/** 마우스 오른쪽 버튼 표시 (커서 옆 배지) */
const RightButtonBadge: React.FC<{ path: [number, number, number][]; from: number; to: number; dur: number }> = ({ path, from, to, dur }) => (
  <Box
    sx={{
      position: 'absolute',
      zIndex: 21,
      ml: '14px',
      mt: '16px',
      px: 0.6,
      borderRadius: 0.5,
      bgcolor: 'grey.900',
      color: 'common.white',
      fontSize: 9,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      animation: `${anim(timeline(path.map(([p, x, y]) => [p, `left:${x}%; top:${y}%;`])), dur, 'ease-in-out')}, ${anim(showBetween(from, to), dur)}`,
    }}
  >
    🖱 우클릭
  </Box>
);

/** 우클릭 메뉴 모양 */
const ContextMenu: React.FC<{ x: number; y: number; from: number; to: number; dur: number; hover: 'edit' | 'delete'; hoverAt: number; scheduled?: boolean }> = ({ x, y, from, to, dur, hover, hoverAt, scheduled }) => {
  const item = (key: 'start' | 'edit' | 'delete', icon: string, label: string) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.2,
        py: 0.5,
        fontSize: 12,
        animation: key === hover ? anim(timeline([[0, 'background-color: transparent'], [hoverAt - 0.1, 'background-color: transparent'], [hoverAt, 'background-color: rgba(127,127,127,.18)'], [to, 'background-color: rgba(127,127,127,.18)'], [to + 0.1, 'background-color: transparent'], [100, 'background-color: transparent']]), dur) : undefined,
      }}
    >
      <Box component="span" sx={{ width: 14, textAlign: 'center' }}>{icon}</Box>
      {label}
    </Box>
  );
  return (
    <At x={x} y={y} sx={{ zIndex: 12, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, boxShadow: 6, py: 0.5, minWidth: 96, animation: anim(showBetween(from, to), dur) }}>
      {scheduled && item('start', '▶', '지금 시작')}
      {item('edit', '✎', '수정')}
      {item('delete', '🗑', '삭제')}
    </At>
  );
};

/** 간트 빈칸을 우클릭 드래그 → 예약 일정 등록 → 예약 막대 */
export const GanttRightDragDemo: React.FC = () => {
  const D = 9;
  const x1 = hourX(13);
  const x2 = hourX(14.5);
  const cursorPath: [number, number, number][] = [
    [0, 55, 95],
    [9, x1, 50],
    [12, x1, 50],
    [38, x2, 50],
    [42, x2, 50],
    [62, 72, 78],
    [66, 72, 81],
    [72, 72, 81],
    [90, 55, 95],
    [100, 55, 95],
  ];
  return (
    <DemoFrame still={7.5}>
      <GanttGrid rows={['PageSetup 분석', '']} />
      <At x={hourX(9.5)} y={21} w={hourX(11) - hourX(9.5)} h={14}>
        <Bar>PageSetup 분석</Bar>
      </At>
      {/* 현재 시각 */}
      <At x={hourX(11.5)} y={13} h={78} sx={{ borderLeft: '2px solid', borderColor: 'error.main', zIndex: 3 }} />
      <At x={hourX(11.5)} y={92} sx={{ transform: 'translateX(-50%)', fontSize: 9, color: 'error.main', fontWeight: 700 }}>지금</At>

      {/* 우클릭 드래그 영역: 주황 점선 */}
      <At
        x={x1}
        y={43}
        h={14}
        sx={{
          border: `2px dashed ${ORANGE}`,
          background: HATCH,
          borderRadius: 1,
          animation: anim(timeline([[0, 'width:0; opacity:0'], [12, 'width:0; opacity:1'], [38, `width:${x2 - x1}%; opacity:1`], [70, `width:${x2 - x1}%; opacity:1`], [71, `width:${x2 - x1}%; opacity:0`], [100, 'width:0; opacity:0']]), D),
        }}
      />
      <At x={x2} y={36} sx={{ transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, color: ORANGE, animation: anim(showBetween(20, 40), D) }}>
        13:00 ~ 14:30
      </At>

      {/* 저장 후 예약 막대 */}
      <At
        x={x1}
        y={43}
        w={x2 - x1}
        h={14}
        sx={{ border: `2px dashed ${ORANGE}`, background: HATCH, borderRadius: 1, color: ORANGE, fontSize: 10, fontWeight: 700, px: 0.8, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', animation: anim(showBetween(72, 96), D) }}
      >
        [예약] 배포 점검 회의
      </At>
      <At x={2} y={44} sx={{ fontSize: 11, fontWeight: 600, animation: anim(showBetween(72, 96), D) }}>배포 점검 회의</At>

      {/* 예약 일정 등록 창 */}
      <At x="50%" y={24} w={58} sx={{ transform: 'translateX(-50%)', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, boxShadow: 6, p: 1.5, zIndex: 10, animation: anim(showBetween(42, 70), D) }}>
        <Box sx={{ fontWeight: 700, fontSize: 13, mb: 0.6 }}>예약 일정 등록</Box>
        <Box sx={{ fontSize: 11, color: 'text.secondary', mb: 1.2 }}>시간: 13:00 ~ 14:30</Box>
        <MockField label="업무 제목" sx={{ mb: 1 }}>
          <Box component="span" sx={{ animation: anim(typeReveal(46, 60), D) }}>배포 점검 회의</Box>
        </MockField>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <MockField label="프로젝트 코드" sx={{ flex: 1 }} />
          <MockField label="카테고리" sx={{ flex: 1 }} />
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <MockButton primary>저장(Enter)</MockButton>
        </Box>
      </At>

      <Cursor dur={D} path={cursorPath} />
      <RightButtonBadge path={cursorPath} from={8} to={40} dur={D} />
      <ClickRing x={72.5} y={81.5} at={[67]} dur={D} />
      <At x={2} y={92} sx={{ fontSize: 10, color: 'text.secondary', animation: anim(showBetween(72, 96), D) }}>
        우클릭 드래그는 시간과 상관없이 항상 예약으로 등록됩니다.
      </At>
    </DemoFrame>
  );
};

/** 막대 우클릭 → 수정 / 삭제 */
export const GanttContextMenuDemo: React.FC = () => {
  const D = 12;
  const aX = hourX(9.5);
  const aW = hourX(11) - hourX(9.5);
  const bX = hourX(12.5);
  const bW = hourX(13.5) - hourX(12.5);
  const aClick: [number, number] = [aX + aW / 2, 29];
  const bClick: [number, number] = [bX + bW / 2, 51];
  const cursorPath: [number, number, number][] = [
    [0, 55, 95],
    [7, ...aClick],
    [10, ...aClick],
    [16, aClick[0] + 4, aClick[1] + 11],
    [21, aClick[0] + 4, aClick[1] + 11],
    [28, 55, 95],
    [44, 72, 78],
    [52, 72, 78],
    [60, ...bClick],
    [64, ...bClick],
    [70, bClick[0] + 4, bClick[1] + 20],
    [76, bClick[0] + 4, bClick[1] + 20],
    [90, 55, 95],
    [100, 55, 95],
  ];
  return (
    <DemoFrame still={6} height={270}>
      <GanttGrid rows={[]} />
      {/* 행 라벨 2: 삭제되면 사라짐 */}
      <At x={2} y={44} sx={{ fontSize: 11, fontWeight: 600, animation: anim(timeline([[0, 'opacity:1'], [76, 'opacity:1'], [80, 'opacity:0'], [97, 'opacity:0'], [100, 'opacity:1']]), D) }}>ES2022 브랜치 최신화</At>
      {/* 행 라벨 1: 수정 전/후 */}
      <At x={2} y={22} sx={{ fontSize: 11, fontWeight: 600, animation: anim(timeline([[0, 'opacity:1'], [53.9, 'opacity:1'], [54, 'opacity:0'], [97, 'opacity:0'], [100, 'opacity:1']]), D) }}>회의록 정리</At>
      <At x={2} y={22} sx={{ fontSize: 11, fontWeight: 600, animation: anim(showBetween(54, 97), D) }}>주간 회의록 정리</At>

      {/* 막대 A: 수정 대상 */}
      <At x={aX} y={21} w={aW} h={14}>
        <Bar sx={{ position: 'relative' }}>
          <Box component="span" sx={{ animation: anim(timeline([[0, 'opacity:1'], [53.9, 'opacity:1'], [54, 'opacity:0'], [97, 'opacity:0'], [100, 'opacity:1']]), D) }}>회의록 정리</Box>
          <Box component="span" sx={{ position: 'absolute', left: 6, animation: anim(showBetween(54, 97), D) }}>주간 회의록 정리</Box>
        </Bar>
      </At>
      {/* 막대 B: 삭제 대상 */}
      <At x={bX} y={43} w={bW} h={14} sx={{ animation: anim(timeline([[0, 'opacity:1; transform:scale(1)'], [76, 'opacity:1; transform:scale(1)'], [80, 'opacity:0; transform:scale(.6)'], [97, 'opacity:0; transform:scale(.6)'], [100, 'opacity:1; transform:scale(1)']]), D) }}>
        <Bar color="secondary.main">ES2022 브랜치 최신화</Bar>
      </At>

      <ContextMenu x={aClick[0] + 1} y={aClick[1] + 3} from={10} to={21} dur={D} hover="edit" hoverAt={16} />
      <ContextMenu x={bClick[0] + 1} y={bClick[1] + 3} from={64} to={76} dur={D} hover="delete" hoverAt={70} />

      {/* 업무 기록 수정 창 */}
      <At x="50%" y={18} w={60} sx={{ transform: 'translateX(-50%)', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, boxShadow: 6, p: 1.5, zIndex: 10, animation: anim(showBetween(22, 53), D) }}>
        <Box sx={{ fontWeight: 700, fontSize: 13, mb: 1.2 }}>업무 기록 수정</Box>
        <MockField label="업무 제목" sx={{ mb: 1, position: 'relative' }}>
          <Box component="span" sx={{ animation: anim(timeline([[0, 'opacity:1'], [31.9, 'opacity:1'], [32, 'opacity:0'], [100, 'opacity:0']]), D) }}>회의록 정리</Box>
          <Box component="span" sx={{ position: 'absolute', left: 8, animation: anim(typeReveal(32, 42), D) }}>주간 회의록 정리</Box>
        </MockField>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <MockField label="프로젝트 코드" sx={{ flex: 1 }}>[A25_05591] 관리업무</MockField>
          <MockField label="카테고리" sx={{ flex: 1 }}>문서작업</MockField>
        </Box>
        <MockField label="비고" sx={{ mb: 1, color: 'text.disabled' }}>추가 메모</MockField>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <MockButton sx={{ border: 'none', color: 'primary.main', bgcolor: 'transparent' }}>취소</MockButton>
          <MockButton primary>저장(Enter)</MockButton>
        </Box>
      </At>

      <Cursor dur={D} path={cursorPath} />
      <RightButtonBadge path={cursorPath} from={6} to={11} dur={D} />
      <RightButtonBadge path={cursorPath} from={59} to={65} dur={D} />
      <ClickRing x={aClick[0] + 4.5} y={aClick[1] + 12} at={[20]} dur={D} />
      <ClickRing x={72.5} y={79} at={[50]} dur={D} />
      <ClickRing x={bClick[0] + 4.5} y={bClick[1] + 21} at={[75]} dur={D} />
      <Toast from={78} to={95} dur={D}>작업이 휴지통으로 이동되었습니다.</Toast>
      <At x={2} y={93} sx={{ fontSize: 10, color: 'text.secondary', animation: anim(showBetween(1, 76), D) }}>
        막대를 더블클릭해도 수정 창이 열립니다.
      </At>
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

/** 인터럽트 분석: 키워드 추가 → 요약·히트맵·시간대 분포·이력이 채워지고, 키워드를 더하면 갱신 */
export const InterruptDemo: React.FC = () => {
  const D = 12;
  const P1 = 18; // 첫 키워드 반영 시점(%)
  const P2 = 38; // 두 번째 키워드 반영 시점(%)
  const END = 96;
  /** 값 두 단계(P1, P2) 전환용 keyframes */
  const step = (prop: string, before: string, v1: string, v2: string) =>
    timeline([[0, `${prop}:${before}`], [P1 - 0.1, `${prop}:${before}`], [P1 + 3, `${prop}:${v1}`], [P2 - 0.1, `${prop}:${v1}`], [P2 + 3, `${prop}:${v2}`], [END, `${prop}:${v2}`], [100, `${prop}:${before}`]]);
  /** P1~P2 에만 보이는 글자 / P2 이후에만 보이는 글자를 같은 자리에 겹쳐 둔다 */
  const Swap: React.FC<{ a: React.ReactNode; b: React.ReactNode; sx?: object }> = ({ a, b, sx }) => (
    <Box component="span" sx={{ position: 'relative', display: 'inline-block', ...sx }}>
      <Box component="span" sx={{ visibility: 'hidden' }}>{b}</Box>
      <Box component="span" sx={{ position: 'absolute', left: 0, right: 0, animation: anim(showBetween(P1, P2), D) }}>{a}</Box>
      <Box component="span" sx={{ position: 'absolute', left: 0, right: 0, animation: anim(showBetween(P2 + 0.5, END), D) }}>{b}</Box>
    </Box>
  );

  // 분 단위 예시 데이터: [9/1주, 9/8주, 9/15주] × [월~금]
  const heat1 = [[0, 20, 0, 35, 0], [30, 0, 45, 0, 25], [0, 15, 0, 0, 20]];
  const heat2 = [[0, 20, 15, 35, 0], [30, 25, 45, 0, 25], [10, 15, 0, 0, 20]];
  const weeks = ['9/1주', '9/8주', '9/15주'];
  const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`);
  const heatBg = (m: number, max: number) => (m > 0 ? `rgba(239,83,80,${(0.15 + (m / max) * 0.75).toFixed(2)})` : 'rgba(127,127,127,.06)');
  const max1 = 45;
  const max2 = 45;
  // 06~23시 분포 (분)
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);
  const dist1: Record<number, number> = { 9: 20, 10: 45, 11: 40, 13: 15, 14: 30, 15: 25, 16: 15 };
  const dist2: Record<number, number> = { 9: 20, 10: 45, 11: 40, 13: 20, 14: 55, 15: 45, 16: 15 };
  const barColor = (pct: number) => (pct > 70 ? '#d32f2f' : pct > 40 ? '#ed6c02' : 'var(--primary-color, #1976d2)');

  const colX = (i: number) => 13 + i * 7.2;

  return (
    <DemoFrame still={10} height={380}>
      <At x={4} y={3} sx={{ fontWeight: 700, fontSize: 13 }}>인터럽트 분석</At>

      {/* 키워드 입력 + 태그 */}
      <At x={4} y={10} w={92} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MockField sx={{ width: '34%', position: 'relative' }}>
          <Box component="span" sx={{ color: 'text.disabled', animation: anim(timeline([[0, 'opacity:1'], [3.9, 'opacity:1'], [4, 'opacity:0'], [P1 - 1, 'opacity:0'], [P1 - 0.9, 'opacity:1'], [22.9, 'opacity:1'], [23, 'opacity:0'], [P2 - 1, 'opacity:0'], [P2 - 0.9, 'opacity:1'], [100, 'opacity:1']]), D) }}>
            키워드 입력 (예: TP 대응)
          </Box>
          <Box component="span" sx={{ position: 'absolute', left: 8, fontWeight: 600, animation: `${anim(typeReveal(4, 12), D)}, ${anim(showBetween(4, P1 - 1.5), D)}` }}>TP 대응</Box>
          <Box component="span" sx={{ position: 'absolute', left: 8, fontWeight: 600, animation: `${anim(typeReveal(23, 32), D)}, ${anim(showBetween(23, P2 - 1.5), D)}` }}>센터오류</Box>
        </MockField>
        <Box sx={{ position: 'relative', width: 44, height: 26 }}>
          <Box sx={{ position: 'absolute', inset: 0, animation: anim(showBetween(13, P1), D) }}><KeyCap at={[P1 - 2]} dur={D}>Enter</KeyCap></Box>
          <Box sx={{ position: 'absolute', inset: 0, animation: anim(showBetween(33, P2), D) }}><KeyCap at={[P2 - 2]} dur={D}>Enter</KeyCap></Box>
        </Box>
        <Chip sx={{ borderColor: 'warning.main', color: 'warning.main', animation: anim(showBetween(P1, END), D) }}>TP 대응 ✕</Chip>
        <Chip sx={{ borderColor: 'warning.main', color: 'warning.main', animation: anim(showBetween(P2, END), D) }}>센터오류 ✕</Chip>
      </At>

      {/* 요약 4칸 */}
      <At x={4} y={21} w={92} sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, animation: anim(showBetween(P1, END), D) }}>
        {[
          ['총 인터럽트', <Swap key="a" a="6건" b="9건" />],
          ['총 소요시간', <Swap key="b" a="3시간 10분" b="4시간" />],
          ['최다 발생 주', '9/8주'],
          ['피크 시간대', <Swap key="d" a="10:00~12:00" b="14:00~16:00" />],
        ].map(([label, value]) => (
          <Box key={label as string} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', textAlign: 'center', py: 0.6 }}>
            <Box sx={{ fontSize: 10, color: 'text.secondary' }}>{label}</Box>
            <Box sx={{ fontSize: 14, fontWeight: 700 }}>{value}</Box>
          </Box>
        ))}
      </At>

      {/* 주차별 히트맵 */}
      <At x={4} y={38} sx={{ fontWeight: 600, fontSize: 11, animation: anim(showBetween(P1, END), D) }}>주차별 히트맵 (월~금)</At>
      <Box sx={{ animation: anim(showBetween(P1, END), D) }}>
        {['월', '화', '수', '목', '금'].map((d, i) => (
          <At key={d} x={colX(i)} y={45} w={6.6} sx={{ textAlign: 'center', fontSize: 10, color: 'text.secondary', fontWeight: 600 }}>{d}</At>
        ))}
        <At x={49} y={45} w={8} sx={{ textAlign: 'right', fontSize: 10, color: 'text.secondary', fontWeight: 600 }}>합계</At>
        {weeks.map((w, wi) => (
          <React.Fragment key={w}>
            <At x={4} y={51 + wi * 9} w={8.5} h={7.5} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 0.5, fontSize: 10 }}>{w}</At>
            {heat1[wi].map((m1, di) => {
              const m2 = heat2[wi][di];
              return (
                <At
                  key={di}
                  x={colX(di)}
                  y={51 + wi * 9}
                  w={6.6}
                  h={7.5}
                  sx={{ borderRadius: 0.5, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, animation: anim(step('background-color', 'transparent', heatBg(m1, max1), heatBg(m2, max2)), D) }}
                >
                  {(m1 > 0 || m2 > 0) && <Swap a={m1 ? `${m1}m` : ''} b={`${m2}m`} />}
                </At>
              );
            })}
            <At x={49} y={51 + wi * 9} w={8} h={7.5} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 10 }}>
              <Swap a={fmt(heat1[wi].reduce((s, v) => s + v, 0))} b={fmt(heat2[wi].reduce((s, v) => s + v, 0))} sx={{ textAlign: 'right' }} />
            </At>
          </React.Fragment>
        ))}
        {/* 최다 발생 주 강조 */}
        <At x={3.5} y={50} w={54} h={9.5} sx={{ border: '2px solid', borderColor: 'error.main', borderRadius: 1, animation: anim(timeline([[0, 'opacity:0'], [55, 'opacity:0'], [58, 'opacity:1'], [64, 'opacity:.3'], [70, 'opacity:1'], [END, 'opacity:1'], [100, 'opacity:0']]), D) }} />
      </Box>

      {/* 시간대별 분포 */}
      <At x={61} y={38} sx={{ fontWeight: 600, fontSize: 11, animation: anim(showBetween(P1, END), D) }}>시간대별 분포 (06~24시)</At>
      <At x={61} y={46} w={35} h={28} sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', animation: anim(showBetween(P1, END), D) }}>
        {hours.map((h) => {
          const p1 = ((dist1[h] ?? 0) / 45) * 100;
          const p2 = ((dist2[h] ?? 0) / 55) * 100;
          return (
            <Box
              key={h}
              sx={{ flex: 1, borderRadius: '2px 2px 0 0', animation: `${anim(step('height', '0%', `${p1.toFixed(0)}%`, `${p2.toFixed(0)}%`), D, 'ease-out')}, ${anim(step('background-color', barColor(p1), barColor(p1), barColor(p2)), D)}` }}
            />
          );
        })}
      </At>
      <At x={61} y={75} w={35} sx={{ display: 'flex', gap: '2px', fontSize: 8, color: 'text.secondary', animation: anim(showBetween(P1, END), D) }}>
        {hours.map((h) => (
          <Box key={h} sx={{ flex: 1, textAlign: 'center' }}>{h % 2 === 0 ? h : ''}</Box>
        ))}
      </At>
      {/* 피크 시간대 강조 */}
      <At x={61 + (8 / 18) * 35 - 0.3} y={44} w={(2 / 18) * 35 + 0.6} h={31} sx={{ border: '2px solid', borderColor: 'error.main', borderRadius: 1, animation: anim(timeline([[0, 'opacity:0'], [55, 'opacity:0'], [58, 'opacity:1'], [64, 'opacity:.3'], [70, 'opacity:1'], [END, 'opacity:1'], [100, 'opacity:0']]), D) }} />

      {/* 발생 이력 */}
      <At x={4} y={81} w={92} sx={{ fontSize: 10, animation: anim(showBetween(P1, END), D) }}>
        <Box sx={{ fontWeight: 600, fontSize: 11, mb: 0.3 }}>
          발생 이력 (<Swap a="6건" b="9건" />)
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '.9fr 1.3fr 2.4fr 1fr .6fr', color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider', pb: 0.2 }}>
          <span>날짜</span><span>시간</span><span>작업명</span><span>카테고리</span><span style={{ textAlign: 'right' }}>소요</span>
        </Box>
        <Box sx={{ overflow: 'hidden', animation: anim(step('max-height', '0px', '0px', '18px'), D), bgcolor: 'rgba(237,108,2,.12)' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '.9fr 1.3fr 2.4fr 1fr .6fr', py: 0.2 }}>
            <span>9/15 (월)</span><span>09:10 ~ 09:20</span><span>센터오류 확인 요청</span><span>센터오류지원</span><span style={{ textAlign: 'right' }}>10분</span>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '.9fr 1.3fr 2.4fr 1fr .6fr', py: 0.2 }}>
          <span>9/9 (화)</span><span>14:05 ~ 14:50</span><span>TP 대응 - 리소스 배포 확인</span><span>테스트오류수정</span><span style={{ textAlign: 'right' }}>45분</span>
        </Box>
      </At>

      <Cursor dur={D} path={[[0, 50, 97], [3, 16, 13], [P2 + 4, 16, 13], [60, 48, 97], [100, 48, 97]]} />
      <ClickRing x={16.5} y={14} at={[3.5, 22.5]} dur={D} />
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

/** 브라우저 재시작 후 풀린 백업 폴더 권한을 「방문할 때마다 허용」으로 계속 유지 */
export const BackupPermissionDemo: React.FC = () => {
  const D = 10;
  const CLICK1 = 14; // 「권한 다시 허용」 클릭
  const CLICK2 = 50; // 「방문할 때마다 허용」 클릭
  const hideAfter = (p: number) => timeline([[0, 'opacity:1'], [p - 0.1, 'opacity:1'], [p, 'opacity:0'], [97, 'opacity:0'], [100, 'opacity:1']]);
  const pill = (text: string, hoverAt?: number) => (
    <Box
      sx={{
        height: 30,
        borderRadius: 15,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 600,
        color: '#d3e3fd',
        bgcolor: '#0b4a73',
        animation: hoverAt
          ? anim(timeline([[0, 'background-color:#0b4a73'], [hoverAt - 0.1, 'background-color:#0b4a73'], [hoverAt, 'background-color:#1766a0'], [CLICK2 + 1, 'background-color:#1766a0'], [CLICK2 + 1.1, 'background-color:#0b4a73'], [100, 'background-color:#0b4a73']]), D)
          : undefined,
      }}
    >
      {text}
    </Box>
  );
  return (
    <DemoFrame still={4} height={380}>
      <At x={4} y={6} sx={{ fontWeight: 700, fontSize: 13 }}>데이터 관리</At>
      <At x={4} y={15} sx={{ fontSize: 11, color: 'text.secondary' }}>브라우저를 다시 켠 다음 날, 설정 화면</At>

      {/* 자동 백업 저장 폴더 줄 */}
      <At x={4} y={26} w={92} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12 }}>
        <span>자동 백업 저장 폴더:</span>
        <b>📁 time-managing_auto-backup</b>
        <MockButton>🗀 폴더 변경</MockButton>
        {/* 권한이 생기면 버튼 자리까지 접힌다 */}
        <Box sx={{ overflow: 'hidden', animation: anim(timeline([[0, 'max-width:140px; opacity:1'], [CLICK2 + 1.9, 'max-width:140px; opacity:1'], [CLICK2 + 4, 'max-width:0; opacity:0'], [97, 'max-width:0; opacity:0'], [100, 'max-width:140px; opacity:1']]), D) }}>
          <MockButton primary>권한 다시 허용</MockButton>
        </Box>
        <MockButton sx={{ border: 'none', color: 'primary.main', bgcolor: 'transparent' }}>기본값으로</MockButton>
      </At>
      <At x={4} y={37} w={92} sx={{ fontSize: 11 }}>
        <Box sx={{ color: 'warning.main', animation: anim(hideAfter(CLICK2 + 2), D) }}>
          브라우저를 다시 켜서 폴더 쓰기 권한이 꺼졌습니다. [권한 다시 허용]을 누르고 &quot;방문할 때마다 허용&quot;을 고르면 계속 유지됩니다.
        </Box>
        <Box sx={{ position: 'absolute', top: 0, color: 'text.secondary', animation: anim(showBetween(CLICK2 + 2, 97), D) }}>
          폴더를 고르면 자동 백업 파일이 그 폴더에 바로 저장됩니다. 권한이 없을 때는 다운로드 폴더로 저장됩니다.
        </Box>
      </At>

      {/* 브라우저 권한 요청 창 (크롬) */}
      <At
        x="50%"
        y={10}
        w="300px"
        sx={{
          transform: 'translateX(-50%)',
          bgcolor: '#202124',
          color: '#e8eaed',
          borderRadius: 3,
          boxShadow: 10,
          p: 1.8,
          zIndex: 12,
          animation: anim(showBetween(CLICK1 + 2, CLICK2 + 1), D),
        }}
      >
        <Box sx={{ position: 'absolute', right: 12, top: 10, fontSize: 14, color: '#bdc1c6' }}>✕</Box>
        <Box sx={{ fontSize: 13, fontWeight: 600, pr: 3, lineHeight: 1.35 }}>developer.ecount.com에서 다음 권한을 요청합니다.</Box>
        <Box sx={{ fontSize: 10, color: '#bdc1c6', mt: 0.5, mb: 1.2 }}>이 사이트를 마지막으로 방문했을 때의 파일을 보고 수정합니다.</Box>
        <Box sx={{ bgcolor: '#2d2e31', borderRadius: 2, px: 1.2, py: 1, fontSize: 11, mb: 1.2 }}>🗀 time-managing_auto-backup</Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          {pill('이번에만 허용')}
          {pill('방문할 때마다 허용', 38)}
          {pill('허용 안함')}
        </Box>
      </At>

      {/* 결과 설명 */}
      <At x={4} y={62} w={92} sx={{ border: '1px solid', borderColor: 'success.main', borderRadius: 1.5, bgcolor: 'background.paper', p: 1.2, animation: anim(showBetween(CLICK2 + 6, 97), D) }}>
        <Box sx={{ fontWeight: 700, color: 'success.main', mb: 0.4 }}>✓ 권한이 계속 유지됩니다</Box>
        <Box sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.6 }}>
          다음부터는 브라우저를 다시 켜도 묻지 않고 📁 time-managing_auto-backup 폴더에 자동 백업됩니다.
          <br />
          「이번에만 허용」을 고르면 브라우저를 닫을 때 다시 풀립니다.
        </Box>
      </At>

      <Cursor dur={D} path={[[0, 60, 97], [10, 57, 29], [CLICK1 + 2, 57, 29], [34, 50, 59], [CLICK2 - 1, 50, 59], [70, 60, 97], [100, 60, 97]]} />
      <ClickRing x={57.5} y={30} at={[CLICK1]} dur={D} />
      <ClickRing x={50.5} y={60} at={[CLICK2 - 1]} dur={D} />
    </DemoFrame>
  );
};

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
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.6 }}>
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

// ---------------------------------------------------------------------------
// 비고가 없으면 작업명으로 채우기 (설정 > 업무 환경)
// ---------------------------------------------------------------------------

export const NoteTitleOptionDemo: React.FC = () => {
  const D = 11;
  const SWITCH = 18; // 스위치 켜는 시점
  const RELOAD = 48; // 「다시 불러오기」 누르는 시점
  const rows: [string, string][] = [
    ['리소스 배포 확인', '태원책임님 회신'],
    ['ES2022 알럿 코드리뷰', ''],
  ];
  return (
    <DemoFrame still={8} height={300}>
      {/* 설정 > 업무 환경 */}
      <At x={4} y={5} sx={{ fontWeight: 700, fontSize: 13 }}>설정 › 업무 환경</At>
      <At x={4} y={15} w={92} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box
          sx={{
            width: 34,
            height: 18,
            borderRadius: 9,
            p: '2px',
            flexShrink: 0,
            animation: anim(timeline([[0, 'background-color:#9e9e9e'], [SWITCH - 0.1, 'background-color:#9e9e9e'], [SWITCH, 'background-color:#1976d2'], [97, 'background-color:#1976d2'], [100, 'background-color:#9e9e9e']]), D),
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: '#fff',
              animation: anim(timeline([[0, 'transform:translateX(0)'], [SWITCH - 0.1, 'transform:translateX(0)'], [SWITCH, 'transform:translateX(16px)'], [97, 'transform:translateX(16px)'], [100, 'transform:translateX(0)']]), D),
            }}
          />
        </Box>
        <span>비고가 없으면 작업명으로 채우기</span>
      </At>

      {/* 시간관리 화면 */}
      <At x={4} y={38} sx={{ fontWeight: 700, fontSize: 13 }}>시간관리</At>
      <At x={4} y={46} w={92} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <MockButton>⭳ 일간 타이머에서 다시 불러오기</MockButton>
      </At>
      <At x={4} y={60} w={92} h={11} sx={{ display: 'grid', gridTemplateColumns: '1.3fr 1.7fr', alignItems: 'center', px: 1.2, fontWeight: 700, bgcolor: 'action.hover', borderRadius: '4px 4px 0 0' }}>
        <span>거래형(일정명)</span>
        <span>비고</span>
      </At>
      {rows.map(([title, note], i) => (
        <At
          key={title}
          x={4}
          y={71 + i * 11}
          w={92}
          h={11}
          sx={{ display: 'grid', gridTemplateColumns: '1.3fr 1.7fr', alignItems: 'center', px: 1.2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <span>{title}</span>
          <Box sx={{ position: 'relative' }}>
            {/* 비고를 적은 업무는 그대로, 비고가 없는 업무만 작업명으로 채워진다 */}
            <Box component="span" sx={note ? undefined : { color: 'text.disabled', animation: anim(showBetween(0, RELOAD + 2), D) }}>
              {note || '(빈칸)'}
            </Box>
            {!note && (
              <Box component="span" sx={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', animation: anim(showBetween(RELOAD + 3, 97), D) }}>
                <b>{title}</b>
              </Box>
            )}
          </Box>
        </At>
      ))}

      <Cursor dur={D} path={[[0, 50, 95], [12, 7, 19], [SWITCH + 2, 7, 19], [44, 88, 48], [RELOAD + 2, 88, 48], [80, 50, 95], [100, 50, 95]]} />
      <ClickRing x={7} y={19} at={[SWITCH]} dur={D} />
      <ClickRing x={88} y={48} at={[RELOAD]} dur={D} />
      <At x={4} y={94} sx={{ fontSize: 11, color: 'text.secondary', animation: anim(showBetween(RELOAD + 4, 97), D) }}>
        비고를 적은 업무는 그대로, 비고가 없던 업무만 작업명으로 채워집니다.
      </At>
    </DemoFrame>
  );
};

export const GUIDE_DEMOS = {
  dayFlow: DayFlowDemo,
  timerStart: TimerStartDemo,
  schedule: ScheduleDemo,
  ganttDrag: GanttDragDemo,
  ganttResize: GanttResizeDemo,
  ganttRightDrag: GanttRightDragDemo,
  ganttContextMenu: GanttContextMenuDemo,
  weeklyCopy: WeeklyCopyDemo,
  deployDrag: DeployDragDemo,
  analysis: AnalysisDemo,
  interrupt: InterruptDemo,
  multiSort: MultiSortDemo,
  noteTitleOption: NoteTitleOptionDemo,
  erpRegister: ErpRegisterDemo,
  prune: PruneDemo,
  backupPermission: BackupPermissionDemo,
  shortcut: ShortcutDemo,
  qna: QnaDemo,
} as const;

export type GuideDemoId = keyof typeof GUIDE_DEMOS;

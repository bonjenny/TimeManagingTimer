import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { keyframes } from '@mui/system';

// 가이드 예시 화면용 작은 애니메이션 도구. 모든 데모는 하나의 반복 주기(dur 초) 위에서
// 퍼센트 시점으로 동작을 맞춘다. 예: 클릭은 40%, 창 등장은 45%~70%.

/** a%~b% 동안만 보이게 (앞뒤 1% 페이드) */
export const showBetween = (a: number, b: number) => keyframes`
  0%, ${Math.max(a - 1, 0)}% { opacity: 0; visibility: hidden; }
  ${a}%, ${Math.min(b, 99.9)}% { opacity: 1; visibility: visible; }
  ${Math.min(b + 1, 100)}%, 100% { opacity: 0; visibility: hidden; }
`;

/** 여러 시점의 CSS 값을 이어 붙인 keyframes. stops: [퍼센트, css 문자열] */
export const timeline = (stops: [number, string][]) =>
  keyframes`${stops.map(([p, css]) => `${p}% { ${css} }`).join('\n')}`;

/** 글자가 왼쪽부터 한 글자씩 드러나는 효과 (a%~b%) */
export const typeReveal = (a: number, b: number) => keyframes`
  0%, ${a}% { clip-path: inset(0 100% 0 0); }
  ${b}%, 97% { clip-path: inset(0 0 0 0); }
  100% { clip-path: inset(0 100% 0 0); }
`;

export const anim = (kf: ReturnType<typeof keyframes>, dur: number, timing = 'linear') =>
  `${kf} ${dur}s ${timing} infinite`;

// ---------------------------------------------------------------------------

interface FrameProps {
  children: React.ReactNode;
  height?: number;
  /** 움직임 줄이기 설정 사용자에게 멈춰서 보여줄 시점(초) */
  still: number;
}

const DESIGN_WIDTH = 760;

/**
 * 예시 화면 틀. 마우스를 올리면 멈추고, 움직임 줄이기 설정이면 핵심 장면에서 멈춘다.
 * 760px 기준으로 그린 뒤, 그보다 좁은 화면(모바일)에서는 통째로 축소해 글자·버튼 배치가 깨지지 않게 한다.
 */
export const DemoFrame: React.FC<FrameProps> = ({ children, height = 260, still }) => {
  const outer_ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const el = outer_ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / DESIGN_WIDTH)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <Box ref={outer_ref} sx={{ width: '100%', maxWidth: DESIGN_WIDTH, mx: 'auto', height: height * scale, overflow: 'hidden' }}>
      <DemoFrameInner height={height} still={still} scale={scale}>
        {children}
      </DemoFrameInner>
    </Box>
  );
};

const DemoFrameInner: React.FC<FrameProps & { scale: number }> = ({ children, height = 260, still, scale }) => (
  <Box
    sx={{
      position: 'relative',
      height,
      width: DESIGN_WIDTH,
      transform: scale < 1 ? `scale(${scale})` : undefined,
      transformOrigin: 'top left',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      bgcolor: 'background.default',
      overflow: 'hidden',
      fontSize: 12,
      color: 'text.primary',
      userSelect: 'none',
      '& *': { boxSizing: 'border-box' },
      '&:hover *': { animationPlayState: 'paused !important' },
      '@media (prefers-reduced-motion: reduce)': {
        '& *': { animationPlayState: 'paused !important', animationDelay: `-${still}s !important` },
      },
    }}
  >
    {children}
  </Box>
);

/** 절대 위치 상자 (퍼센트 좌표) */
// x·y 를 비우면 애니메이션(keyframes)이 left·top 을 정한다
const pct = (v?: number | string) => (typeof v === 'number' ? `${v}%` : v);
export const At: React.FC<BoxProps & { x?: number | string; y?: number | string; w?: number | string; h?: number | string }> = ({
  x,
  y,
  w,
  h,
  sx,
  ...rest
}) => (
  <Box
    {...rest}
    sx={{ position: 'absolute', left: pct(x), top: pct(y), width: pct(w), height: pct(h), ...sx }}
  />
);

/** 마우스 커서. path: [퍼센트, x%, y%] 시점 목록 */
export const Cursor: React.FC<{ path: [number, number, number][]; dur: number }> = ({ path, dur }) => {
  const kf = timeline(path.map(([p, x, y]) => [p, `left: ${x}%; top: ${y}%;`]));
  return (
    <Box sx={{ position: 'absolute', zIndex: 20, width: 18, height: 18, pointerEvents: 'none', animation: anim(kf, dur, 'ease-in-out') }}>
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.5 L12 13.5 L19 13.5 Z" fill="#fff" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </Box>
  );
};

/** 클릭 순간 퍼지는 원. at: 클릭 시점 퍼센트 목록 (같은 좌표에서 여러 번) */
export const ClickRing: React.FC<{ x: number; y: number; at: number[]; dur: number }> = ({ x, y, at, dur }) => {
  const stops: [number, string][] = [[0, 'opacity:0; transform:scale(.2);']];
  at.forEach((p) => {
    stops.push([Math.max(p - 0.1, 0), 'opacity:0; transform:scale(.2);']);
    stops.push([p, 'opacity:.7; transform:scale(.2);']);
    stops.push([Math.min(p + 5, 99.9), 'opacity:0; transform:scale(1.4);']);
  });
  stops.push([100, 'opacity:0; transform:scale(.2);']);
  return (
    <Box
      sx={{
        position: 'absolute',
        left: `calc(${x}% - 12px)`,
        top: `calc(${y}% - 12px)`,
        width: 24,
        height: 24,
        borderRadius: '50%',
        border: '2px solid',
        borderColor: 'primary.main',
        zIndex: 19,
        pointerEvents: 'none',
        animation: anim(timeline(stops), dur),
      }}
    />
  );
};

/** 버튼 모양 */
export const MockButton: React.FC<{ children: React.ReactNode; primary?: boolean; sx?: BoxProps['sx'] }> = ({ children, primary, sx }) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      px: 1.2,
      height: 24,
      borderRadius: 1,
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      border: '1px solid',
      borderColor: primary ? 'primary.main' : 'divider',
      bgcolor: primary ? 'primary.main' : 'background.paper',
      color: primary ? 'primary.contrastText' : 'text.primary',
      ...sx,
    }}
  >
    {children}
  </Box>
);

/** 입력칸 모양 (라벨 + 값) */
export const MockField: React.FC<{ label?: string; children?: React.ReactNode; sx?: BoxProps['sx'] }> = ({ label, children, sx }) => (
  <Box
    sx={{
      position: 'relative',
      height: 28,
      px: 1,
      display: 'flex',
      alignItems: 'center',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1,
      bgcolor: 'background.paper',
      whiteSpace: 'nowrap',
      ...sx,
    }}
  >
    {/* 라벨은 테두리 위로 걸쳐 있어야 하므로 바깥 상자는 자르지 않고, 값 영역만 자른다 */}
    {label && (
      <Box component="span" sx={{ position: 'absolute', top: -6, left: 6, px: 0.5, fontSize: 9, color: 'text.secondary', bgcolor: 'background.paper', lineHeight: 1, zIndex: 1 }}>
        {label}
      </Box>
    )}
    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>{children}</Box>
  </Box>
);

/** 화면 아래 알림 토스트 */
export const Toast: React.FC<{ children: React.ReactNode; from: number; to: number; dur: number }> = ({ children, from, to, dur }) => (
  <At
    x="50%"
    y="auto"
    sx={{
      bottom: 12,
      transform: 'translateX(-50%)',
      px: 1.5,
      py: 0.6,
      borderRadius: 1,
      bgcolor: 'success.main',
      color: 'success.contrastText',
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      zIndex: 15,
      animation: anim(showBetween(from, to), dur),
    }}
  >
    {children}
  </At>
);

/** 키보드 키 모양. at 시점에 눌림 */
export const KeyCap: React.FC<{ children: React.ReactNode; at: number[]; dur: number }> = ({ children, at, dur }) => {
  const stops: [number, string][] = [[0, 'transform:translateY(0); box-shadow:0 2px 0 rgba(0,0,0,.35);']];
  at.forEach((p) => {
    stops.push([Math.max(p - 0.1, 0), 'transform:translateY(0); box-shadow:0 2px 0 rgba(0,0,0,.35);']);
    stops.push([p, 'transform:translateY(2px); box-shadow:0 0 0 rgba(0,0,0,.35);']);
    stops.push([Math.min(p + 3, 99.9), 'transform:translateY(0); box-shadow:0 2px 0 rgba(0,0,0,.35);']);
  });
  stops.push([100, 'transform:translateY(0); box-shadow:0 2px 0 rgba(0,0,0,.35);']);
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 28,
        height: 26,
        px: 0.8,
        mx: 0.3,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 700,
        animation: anim(timeline(stops), dur),
      }}
    >
      {children}
    </Box>
  );
};

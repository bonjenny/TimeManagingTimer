import React from 'react';
import { Box, GlobalStyles } from '@mui/material';

// 할로윈 팔레트의 배경: 밤하늘 · 달 · 언덕 위 성 · 마른 나무 · 묘비 · 불 켜진 호박.
// 화면 맨 뒤(z-index -1)에 깔리고 클릭은 통과한다. 카드는 제 배경색이 있어 글자는 그대로 읽힌다.
// 다크모드: 보랏빛 밤 · 마른 나무 / 라이트모드: 황금빛 가을 저녁 · 단풍 나무 · 가로등 · 호박 밭 (글자가 어두우니 하늘을 밝게)

const Bat: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 0 q6 -7 12 0 q3 -5 6 0 q2 -3 3 -1 q1 -2 3 1 q3 -5 6 0 q6 -7 12 0 q-9 1 -13 9 q-3 -5 -6 -5 q-3 0 -6 5 q-4 -8 -13 -9z"
  />
);

const Pumpkin: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <g transform={`translate(${x} ${y})`} filter="url(#hw-glow)">
    <rect x={-r * 0.1} y={-r * 1.15} width={r * 0.2} height={r * 0.35} rx={r * 0.05} fill="#3d5a1e" />
    <ellipse cx={-r * 0.45} cy={0} rx={r * 0.6} ry={r * 0.82} fill="#d9590b" />
    <ellipse cx={r * 0.45} cy={0} rx={r * 0.6} ry={r * 0.82} fill="#d9590b" />
    <ellipse cx={0} cy={0} rx={r * 0.62} ry={r * 0.86} fill="#f07a12" />
    {/* 파낸 얼굴: 안에서 촛불이 비치는 노란빛 */}
    <path
      fill="#ffd166"
      d={`M${-r * 0.5} ${-r * 0.18} l${r * 0.2} ${-r * 0.3} l${r * 0.2} ${r * 0.3}z M${r * 0.1} ${-r * 0.18} l${r * 0.2} ${-r * 0.3} l${r * 0.2} ${r * 0.3}z M${-r * 0.55} ${r * 0.18} q${r * 0.55} ${r * 0.5} ${r * 1.1} 0 l${-r * 0.18} ${r * 0.08} l${-r * 0.12} ${-r * 0.1} l${-r * 0.2} ${r * 0.14} l${-r * 0.2} ${-r * 0.14} l${-r * 0.12} ${r * 0.1}z`}
    />
  </g>
);

const HalloweenScene: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const sil = isDark ? '#08040f' : '#4a2410'; // 실루엣: 밤엔 거의 검정, 저녁엔 짙은 갈색
  return (
    <>
      <GlobalStyles
        styles={{
          // 테마가 #root 에 인라인으로 넣는 배경색 변수보다 우선해야 해서 !important
          ':root': isDark
            ? {
                '--bg-primary': '#120a1c !important',
                '--bg-secondary': '#1c1229 !important',
                '--bg-tertiary': '#261a37 !important',
                '--bg-hover': '#2e2042 !important',
                '--card-bg': 'rgba(28, 18, 41, 0.94) !important',
                '--header-bg': 'rgba(18, 10, 28, 0.9) !important',
                '--border-color': '#3a2952 !important',
              }
            : {
                // 흰 카드가 노을 배경과 따로 놀지 않게: 크림색 반투명 + 뒤를 흐리게(유리 느낌)
                '--bg-primary': '#fff4e6 !important',
                '--bg-secondary': 'rgba(255, 251, 244, 0.7) !important',
                '--bg-tertiary': 'rgba(255, 238, 214, 0.6) !important',
                '--bg-hover': 'rgba(255, 226, 190, 0.55) !important',
                '--card-bg': 'rgba(255, 248, 238, 0.66) !important',
                '--header-bg': 'rgba(255, 246, 232, 0.72) !important',
                '--border-color': 'rgba(214, 160, 100, 0.35) !important',
              },
          ...(!isDark && {
            ':root:root .MuiPaper-root, :root:root header': { backdropFilter: 'blur(8px)' },
            // 대화상자·메뉴는 글을 읽고 고르는 곳이라 불투명하게
            ':root:root .MuiDialog-paper, :root:root .MuiPopover-paper, :root:root .MuiMenu-paper, :root:root .MuiAutocomplete-paper': {
              backgroundColor: '#fffaf2 !important',
            },
          }),
          // 라이트모드: 아래쪽 어두운 땅 위에 놓이는 바닥글은 밝게
          ...(!isDark && { 'footer, footer *': { color: '#fff6e5 !important', textShadow: '0 1px 3px rgba(60, 25, 5, 0.9)' } }),
          // 기존 테마 CSS 가 [data-theme] body · body::before · #root 를 단색(!important)으로 칠해 풍경을 가린다 → 더 센 선택자로 비운다.
          // 하늘은 html 에 칠한다 (body 에 칠하면 z-index -1 풍경 위를 덮는다)
          ':root:root body, :root:root body::before, :root:root #root': { background: 'transparent !important' },
          ':root:root': {
            background: isDark
              ? 'linear-gradient(180deg, #0b0614 0%, #170c2b 40%, #2c1340 72%, #4a1d3f 100%) fixed !important'
              : 'linear-gradient(180deg, #fff9ee 0%, #ffecc8 40%, #ffd08a 72%, #f6a24e 100%) fixed !important',
          },
        }}
      />
      <Box aria-hidden data-no-glitch data-no-haunt sx={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* 달 (라이트모드에선 저무는 해처럼 주황빛) */}
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 70, md: 96 },
            right: '7vw',
            width: { xs: 70, md: 120 },
            height: { xs: 70, md: 120 },
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle at 38% 36%, #fffaf0 0%, #f7e2a8 55%, #dcb56a 100%)'
              : 'radial-gradient(circle at 40% 40%, #fff1c9 0%, #ffc067 60%, #ff9a3c 100%)',
            boxShadow: isDark ? '0 0 60px 24px rgba(255, 221, 150, 0.28)' : '0 0 70px 30px rgba(255, 170, 70, 0.35)',
            opacity: isDark ? 0.95 : 0.85,
          }}
        />
        {/* 별 (밤에만) */}
        {isDark && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: [
                'radial-gradient(1.5px 1.5px at 12% 18%, #fff 50%, transparent 51%)',
                'radial-gradient(1px 1px at 28% 9%, #fff 50%, transparent 51%)',
                'radial-gradient(1.5px 1.5px at 47% 22%, #ffe9b0 50%, transparent 51%)',
                'radial-gradient(1px 1px at 63% 12%, #fff 50%, transparent 51%)',
                'radial-gradient(1px 1px at 78% 30%, #fff 50%, transparent 51%)',
                'radial-gradient(1.5px 1.5px at 88% 8%, #fff 50%, transparent 51%)',
                'radial-gradient(1px 1px at 6% 40%, #fff 50%, transparent 51%)',
                'radial-gradient(1px 1px at 36% 35%, #fff 50%, transparent 51%)',
                'radial-gradient(1px 1px at 55% 45%, #ffe9b0 50%, transparent 51%)',
                'radial-gradient(1px 1px at 94% 42%, #fff 50%, transparent 51%)',
              ].join(', '),
              opacity: 0.7,
            }}
          />
        )}
        {/* 아래쪽 풍경 */}
        <Box
          component="svg"
          viewBox="0 0 1600 400"
          preserveAspectRatio="xMidYMax slice"
          sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: { xs: '30vh', md: '40vh' }, opacity: isDark ? 0.95 : 1 }}
        >
          <defs>
            <filter id="hw-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="hw-fog" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={isDark ? '#b9a3d6' : '#ffe2a8'} stopOpacity="0" />
              <stop offset="1" stopColor={isDark ? '#b9a3d6' : '#ffe2a8'} stopOpacity={isDark ? 0.18 : 0.3} />
            </linearGradient>
            <radialGradient id="hw-lamp">
              <stop offset="0" stopColor="#fff7d1" stopOpacity="0.95" />
              <stop offset="0.35" stopColor="#ffd77a" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 먼 언덕 */}
          <path d="M0 318 Q200 270 420 305 T820 300 T1220 280 T1600 305 V400 H0Z" fill={isDark ? sil : '#c9732f'} opacity={isDark ? 0.55 : 0.6} />

          {/* 성: 넓은 화면의 오른쪽 여백에 보이게 오른쪽 끝에 작게 */}
          <g transform="translate(614 97.5) scale(0.75)" opacity={isDark ? 1 : 0.8}>
          <g fill={isDark ? sil : '#7a3a16'}>
            <rect x="1130" y="170" width="120" height="140" />
            {Array.from({ length: 6 }, (_, i) => (
              <rect key={i} x={1130 + i * 22} y="156" width="13" height="16" />
            ))}
            <rect x="1080" y="118" width="46" height="192" />
            <polygon points="1072,120 1103,52 1134,120" />
            <rect x="1256" y="140" width="40" height="170" />
            <polygon points="1249,142 1276,80 1303,142" />
            <rect x="1172" y="118" width="36" height="56" />
            <polygon points="1165,120 1190,64 1215,120" />
            <path d="M1103 52 V34 l16 6 l-16 6" />
          </g>
          <g fill="#ffb347" filter="url(#hw-glow)">
            <rect x="1098" y="160" width="9" height="15" rx="4" />
            <rect x="1098" y="205" width="9" height="15" rx="4" />
            <rect x="1186" y="138" width="8" height="13" rx="4" />
            <rect x="1150" y="210" width="11" height="17" rx="5" />
            <rect x="1219" y="210" width="11" height="17" rx="5" />
            <rect x="1271" y="178" width="8" height="13" rx="4" />
            <path d="M1176 310 V272 a14 14 0 0 1 28 0 V310Z" opacity="0.85" />
          </g>
          </g>

          {/* 박쥐 */}
          <g fill={sil}>
            <Bat x={1370} y={120} s={1.1} />
            <Bat x={1555} y={60} s={0.8} />
            <Bat x={1430} y={45} s={0.6} />
          </g>

          {/* 앞 언덕 */}
          <path d="M0 360 Q300 330 620 355 T1240 348 T1600 345 V400 H0Z" fill={sil} />

          {/* 나무 · 묘비: 왼쪽 여백. 밤엔 마른 나무, 저녁엔 황금빛 단풍 나무 */}
          {isDark ? (
            <g stroke={sil} fill="none" strokeLinecap="round" transform="translate(-60 0)">
              <path d="M170 362 C174 310 160 270 176 228 C186 196 168 176 152 150" strokeWidth="13" />
              <path d="M176 230 C198 208 220 200 242 172 M168 258 C146 246 126 230 108 206 M178 196 C182 174 194 162 206 140 M242 172 C252 160 262 158 274 150 M108 206 C100 196 94 192 82 190" strokeWidth="5" />
            </g>
          ) : (
            <g>
              <g stroke={sil} fill="none" strokeLinecap="round">
                <path d="M88 362 C90 320 82 282 94 240" strokeWidth="12" />
                <path d="M94 250 C76 236 62 226 48 212 M92 262 C110 246 124 236 140 222" strokeWidth="5" />
              </g>
              {[
                [56, 186, 36, '#e8742a'],
                [102, 158, 44, '#f7c23c'],
                [138, 192, 32, '#ef8f2c'],
                [80, 210, 34, '#f2b02f'],
                [28, 214, 26, '#d9622a'],
                [124, 222, 28, '#f7c23c'],
                [70, 150, 28, '#f4a62a'],
              ].map(([cx, cy, r, c], i) => (
                <circle key={i} cx={cx} cy={cy} r={r} fill={c as string} opacity="0.92" />
              ))}
            </g>
          )}

          <g fill={sil} transform="translate(-250 0)">
            <path d="M318 362 V334 a15 15 0 0 1 30 0 V362Z" />
            <path d="M372 366 V344 a11 11 0 0 1 22 0 V366Z" />
            <rect x="428" y="322" width="7" height="42" />
            <rect x="417" y="333" width="29" height="7" />
          </g>

          {/* 가로등 */}
          <g>
            <circle cx="152" cy="198" r="52" fill="url(#hw-lamp)" />
            <rect x="149" y="206" width="6" height="158" fill={sil} />
            <path d="M140 206 h24 l-4 -16 h-16z" fill={sil} />
            <circle cx="152" cy="200" r="5" fill="#fff3c4" />
          </g>

          {/* 호박 밭 */}
          <Pumpkin x={60} y={372} r={16} />
          <Pumpkin x={232} y={370} r={18} />
          <Pumpkin x={560} y={364} r={22} />
          <Pumpkin x={606} y={372} r={13} />
          <Pumpkin x={700} y={374} r={14} />
          <Pumpkin x={905} y={370} r={15} />
          <Pumpkin x={1000} y={368} r={20} />
          <Pumpkin x={1180} y={372} r={13} />
          <Pumpkin x={1300} y={366} r={18} />
          <Pumpkin x={1470} y={360} r={24} />
          <Pumpkin x={1515} y={372} r={12} />
          <Pumpkin x={1572} y={374} r={14} />

          {/* 바닥 안개 */}
          <rect x="0" y="300" width="1600" height="100" fill="url(#hw-fog)" />
        </Box>
      </Box>
    </>
  );
};

export default HalloweenScene;

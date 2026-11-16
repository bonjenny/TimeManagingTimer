// 배경 풍경이 있는 테마(할로윈 · 바다)가 같이 쓰는 전역 스타일.
// 풍경은 화면 맨 뒤(z-index -1)에 깔리고, 카드는 반투명(유리)으로 풍경과 어울리게 한다.

type SceneStyleOptions = {
  /** 앱 배경·카드 색 변수 (--bg-primary 등) */
  vars: Record<string, string>;
  /** html 에 칠할 하늘(배경) */
  sky: string;
  /** 카드를 유리처럼(뒤가 흐리게 비침). 대화상자·메뉴는 글을 읽고 고르는 곳이라 dialog_bg 로 불투명하게.
   *  tone: 어두운 유리(다크모드)인지. refract: 유리 너머가 살짝 일렁여 보이게 (SVG 필터 #tk-glass-refract 가 화면에 있어야 함) */
  glass?: { dialog_bg: string; tone: 'light' | 'dark'; refract?: boolean };
  /** 그 밖에 테마마다 덧붙일 규칙 */
  extra?: Record<string, unknown>;
};

export const sceneGlobalStyles = ({ vars, sky, glass, extra }: SceneStyleOptions) => ({
  // 테마가 #root 에 인라인으로 넣는 배경색 변수보다 우선해야 해서 !important
  ':root': Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, `${v} !important`])),
  ...(glass && glassStyles(glass)),
  // 기존 테마 CSS 가 [data-theme] body · body::before · #root 를 단색(!important)으로 칠해 풍경을 가린다 → 더 센 선택자로 비운다.
  // 하늘은 html 에 칠한다 (body 에 칠하면 z-index -1 풍경 위를 덮는다)
  ':root:root body, :root:root body::before, :root:root #root': { background: 'transparent !important' },
  ':root:root': { background: `${sky} fixed !important` },
  ...extra,
});

// 유리 카드가 될 곳: 일반 카드 · 머리줄. 대화상자 · 메뉴 · 드롭다운 목록은 불투명하게 둔다
// (드롭다운이 제 Paper 를 따로 쓰면 MuiAutocomplete-paper 가 안 붙으므로 Popper 안의 Paper 는 모두 드롭다운으로 본다:
//  카테고리 고르기 등. 반투명이면 뒤 글자와 겹쳐 안 읽힌다)
const OPAQUE = '.MuiDialog-paper, .MuiPopover-paper, .MuiMenu-paper, .MuiAutocomplete-paper, .MuiPopper-root .MuiPaper-root';
const SURFACE = `:root:root .MuiPaper-root:not(:is(${OPAQUE})), :root:root header`;

// 리퀴드 글래스: 진한 흐림 + 채도를 올려 뒤 색이 맑게 비치고, 위 가장자리에 빛 반사(하이라이트),
// 비스듬한 광택, 얇은 빛 테두리, 아래로 깔리는 옅은 그림자. 테두리는 box-shadow 로 그려 크기가 안 바뀐다
const glassStyles = ({ dialog_bg, tone, refract }: NonNullable<SceneStyleOptions['glass']>) => {
  const light = tone === 'light';
  return {
    [SURFACE]: {
      backdropFilter: `${refract ? 'url(#tk-glass-refract) ' : ''}blur(18px) saturate(${light ? 175 : 150}%)`,
      backgroundImage: light
        ? 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.16) 100%)'
        : 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0) 60%, rgba(160,215,255,0.06) 100%)',
      boxShadow: light
        ? 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.45), 0 10px 30px -12px rgba(0, 60, 80, 0.28)'
        : 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(160,215,255,0.16), 0 12px 32px -12px rgba(0, 0, 0, 0.6)',
      borderColor: light ? 'rgba(255,255,255,0.5) !important' : 'rgba(160,215,255,0.18) !important',
    },
    // 카드 안에 또 카드가 있으면 안쪽은 흐림 · 그림자를 빼서 탁해지지 않게
    [`:root:root .MuiPaper-root:not(:is(${OPAQUE})) .MuiPaper-root:not(:is(${OPAQUE}))`]: { backdropFilter: 'none', boxShadow: 'none' },
    // backdrop-filter 가 걸린 상자는 안쪽 position:fixed 드롭다운(disablePortal Popper: 카테고리·진행상태)의 기준이 되어
    // 드롭다운이 화면 밖으로 밀려 고를 수가 없다. 카드는 드롭다운이 열린 동안만 흐림을 끈다
    // (!important: 위 유리 카드 선택자가 더 구체적이라 그냥 두면 진다)
    ':root:root .MuiPaper-root:has(.MuiPopper-root)': { backdropFilter: 'none !important' },
    [`:root:root :is(${OPAQUE})`]: { backdropFilter: 'none', backgroundColor: `${dialog_bg} !important` },
  };
};

/** 풍경 상자: inset:0 이면 메뉴·창이 열릴 때(스크롤 잠금으로 스크롤바가 사라질 때) 폭이 늘어 풍경이 움찔한다.
 *  100vw·100vh 는 스크롤바와 상관없이 같은 크기라 안 움직인다 (스크롤바 밑은 가려질 뿐) */
export const SCENE_BOX_SX = {
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none', overflow: 'hidden',
} as const;

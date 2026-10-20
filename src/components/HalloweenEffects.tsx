import React, { useEffect, useRef, useState } from 'react';
import { Box, GlobalStyles } from '@mui/material';
import { keyframes } from '@emotion/react';
import { loadPaletteSettings } from '../utils/colorPalette';

// 할로윈 팔레트를 고르면 켜지는 장식과 이스터에그.
// 1) 유령·박쥐가 화면을 천천히 가로지른다 (클릭은 통과, 움직임 줄이기 설정이면 안 뜸)
// 2) 버튼이 아닌 빈 곳을 빠르게 5번 누르면 화면 글자가 잠깐 깨졌다가 돌아온다
// 3) 유령에 마우스를 대면 유령이 마우스를 낚아채 끌고 다닌다. 마우스를 좌우로 마구 흔들면 풀린다
//    (진짜 커서는 못 옮기니 커서를 숨기고 유령이 가짜 커서를 들고 다닌다. Esc · 12초가 지나도 풀린다)

const drift = keyframes`
  0%   { transform: translate(-15vw, 0) rotate(-4deg); opacity: 0; }
  10%  { opacity: 0.85; }
  25%  { transform: translate(20vw, -3vh) rotate(4deg); }
  50%  { transform: translate(50vw, 2vh) rotate(-4deg); }
  75%  { transform: translate(80vw, -2vh) rotate(4deg); }
  90%  { opacity: 0.85; }
  100% { transform: translate(115vw, 0) rotate(-4deg); opacity: 0; }
`;
const bob = keyframes`
  0%, 100% { margin-top: 0; }
  50% { margin-top: 18px; }
`;

const FLYERS = [
  { emoji: '👻', top: '18%', size: 34, duration: 26, delay: 0 },
  { emoji: '👻', top: '62%', size: 26, duration: 34, delay: 9 },
  { emoji: '🦇', top: '35%', size: 22, duration: 18, delay: 4 },
  { emoji: '👻', top: '82%', size: 20, duration: 40, delay: 18 },
];

const GLITCH_CHARS = '░▒▓█▚▞※†‡¿¡Ɐɐǝɹʇʎ∀ᗡ꒰꒱ʘ⸮';
const CLICKS_TO_GLITCH = 5;
const CLICK_WINDOW_MS = 1500;

/** 화면의 글자를 잠깐 깨뜨렸다가 원래대로. 그 사이 React 가 바꾼 글자(타이머 등)는 건드리지 않는다 */
export function glitchText(root: HTMLElement, duration_ms = 1100) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.nodeValue && n.nodeValue.trim() && !n.parentElement?.closest('script,style,textarea,[data-no-glitch]')
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  const nodes: { node: Text; original: string; last: string }[] = [];
  for (let n = walker.nextNode(); n && nodes.length < 1500; n = walker.nextNode()) {
    nodes.push({ node: n as Text, original: n.nodeValue!, last: n.nodeValue! });
  }
  const frames = 8;
  let frame = 0;
  document.body.classList.add('tk-glitch');
  const timer = window.setInterval(() => {
    frame += 1;
    // 처음엔 많이 깨지고 갈수록 원래 글자로 돌아온다
    const broken = Math.max(0, 0.6 - frame / frames);
    nodes.forEach((item) => {
      if (item.node.nodeValue !== item.last) return; // 그 사이 화면이 바뀐 글자
      const next = frame >= frames
        ? item.original
        : [...item.original].map((ch) => (ch.trim() && Math.random() < broken ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : ch)).join('');
      item.node.nodeValue = next;
      item.last = next;
    });
    if (frame >= frames) {
      window.clearInterval(timer);
      document.body.classList.remove('tk-glitch');
    }
  }, duration_ms / frames);
}

const isHalloween = () => loadPaletteSettings().type === 'halloween';

const GRAB_RADIUS = 30; // 유령 중심에서 이 거리 안에 마우스가 오면 잡힌다
const SHAKE_REVERSALS = 6; // 좌우 방향을 이만큼 바꾸면 탈출
const SHAKE_WINDOW_MS = 900;
const SHAKE_MIN_SPEED = 12; // 이보다 작은 움직임은 흔들기로 안 센다
const GRAB_MAX_MS = 12000;
const GRAB_COOLDOWN_MS = 8000; // 풀려난 뒤 바로 다시 잡히지 않게

/** 좌우로 빠르게 방향을 바꾼 횟수로 흔들기를 판단한다 */
export function createShakeDetector(now: () => number = Date.now) {
  let last_dir = 0;
  let reversals: number[] = [];
  return (movement_x: number): boolean => {
    if (Math.abs(movement_x) < SHAKE_MIN_SPEED) return false;
    const dir = Math.sign(movement_x);
    const t = now();
    if (last_dir && dir !== last_dir) reversals = [...reversals.filter((r) => t - r < SHAKE_WINDOW_MS), t];
    last_dir = dir;
    if (reversals.length >= SHAKE_REVERSALS) {
      reversals = [];
      return true;
    }
    return false;
  };
}

/** 마우스 커서 모양 (유령이 들고 다니는 가짜 커서) */
const FakeCursor: React.FC = () => (
  <svg width="20" height="28" viewBox="0 0 20 28" style={{ display: 'block' }}>
    <path d="M1 1 L1 22 L6.5 17 L10.5 26 L14 24.5 L10 15.8 L17 15.8 Z" fill="#fff" stroke="#000" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

const HalloweenEffects: React.FC = () => {
  const [on, setOn] = useState(isHalloween);
  const ghost_refs = useRef<(HTMLDivElement | null)[]>([]);
  const cursor_ref = useRef<HTMLDivElement | null>(null);
  const [grabbed_by, setGrabbedBy] = useState<number | null>(null);
  const [escaped, setEscaped] = useState(false);

  useEffect(() => {
    const sync = () => setOn(isHalloween());
    window.addEventListener('palette-changed', sync);
    return () => window.removeEventListener('palette-changed', sync);
  }, []);

  useEffect(() => {
    if (!on) return;
    let clicks: number[] = [];
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // 버튼·입력칸·링크 같은 곳은 세지 않는다 ("이상한 데" = 빈 곳)
      if (!target || target.closest('button,a,input,textarea,select,[role="button"],[role="tab"],[role="option"],[role="menuitem"],label')) return;
      const now = Date.now();
      clicks = [...clicks.filter((t) => now - t < CLICK_WINDOW_MS), now];
      if (clicks.length >= CLICKS_TO_GLITCH) {
        clicks = [];
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) glitchText(document.getElementById('root') || document.body);
      }
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [on]);

  // 유령이 마우스를 낚아채기
  useEffect(() => {
    if (!on || grabbed_by !== null) return;
    if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cooldown_until = Number(sessionStorage.getItem('tk-ghost-cooldown') || 0);
    const onMove = (e: MouseEvent) => {
      if (Date.now() < cooldown_until) return;
      const hit = ghost_refs.current.findIndex((el) => {
        if (!el || Number(getComputedStyle(el).opacity) < 0.3) return false;
        const r = el.getBoundingClientRect();
        return Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < GRAB_RADIUS;
      });
      if (hit >= 0) {
        cooldown_until = Infinity;
        setEscaped(false);
        setGrabbedBy(hit);
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [on, grabbed_by]);

  // 잡혀 있는 동안: 가짜 커서를 유령 손에 붙이고, 흔들기·Esc·시간 초과로 풀린다
  useEffect(() => {
    if (grabbed_by === null) return;
    const release = () => {
      sessionStorage.setItem('tk-ghost-cooldown', String(Date.now() + GRAB_COOLDOWN_MS));
      setEscaped(true);
      setGrabbedBy(null);
    };
    const is_shaking = createShakeDetector();
    const onMove = (e: MouseEvent) => {
      if (is_shaking(e.movementX)) release();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') release();
    };
    let frame = 0;
    const follow = () => {
      const ghost = ghost_refs.current[grabbed_by];
      const cursor = cursor_ref.current;
      if (ghost && cursor) {
        const r = ghost.getBoundingClientRect();
        cursor.style.transform = `translate(${r.left + r.width * 0.55}px, ${r.top + r.height * 0.7}px)`;
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    const give_up = window.setTimeout(release, GRAB_MAX_MS);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(give_up);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onKey);
    };
  }, [grabbed_by]);

  // 탈출 메시지는 잠깐만
  useEffect(() => {
    if (!escaped) return;
    const t = window.setTimeout(() => setEscaped(false), 1600);
    return () => window.clearTimeout(t);
  }, [escaped]);

  if (!on) return null;

  return (
    <>
      <GlobalStyles
        styles={{
          'body.tk-glitch #root': {
            animation: 'tk-shake 0.12s steps(2) infinite',
            textShadow: '2px 0 rgba(255,0,80,0.6), -2px 0 rgba(0,220,255,0.6)',
          },
          '@keyframes tk-shake': {
            '0%': { transform: 'translate(0, 0) skewX(0deg)' },
            '50%': { transform: 'translate(-2px, 1px) skewX(-2deg)' },
            '100%': { transform: 'translate(2px, -1px) skewX(2deg)' },
          },
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 1200,
          '@media (prefers-reduced-motion: reduce)': { display: 'none' },
        }}
      >
        {FLYERS.map((f, i) => (
          <Box
            key={i}
            ref={(el: HTMLDivElement | null) => {
              ghost_refs.current[i] = el;
            }}
            sx={{
              position: 'absolute',
              left: 0,
              top: f.top,
              fontSize: f.size,
              lineHeight: 1,
              userSelect: 'none',
              animation: `${drift} ${f.duration}s linear ${f.delay}s infinite`,
              opacity: 0,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
            }}
          >
            <Box component="span" sx={{ display: 'inline-block', animation: `${bob} ${2.4 + i * 0.4}s ease-in-out infinite` }}>
              {f.emoji}
            </Box>
            {grabbed_by === i && (
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  left: '100%',
                  top: -18,
                  ml: 1,
                  px: 1,
                  py: 0.25,
                  borderRadius: 2,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  color: '#fff',
                  bgcolor: 'rgba(40, 10, 60, 0.85)',
                }}
              >
                히히 따라와~ (마우스를 마구 흔들면 탈출)
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* 잡힌 동안: 진짜 커서를 숨기고 클릭도 막는다. 유령이 가짜 커서를 들고 다닌다 */}
      {grabbed_by !== null && (
        <>
          <Box aria-hidden sx={{ position: 'fixed', inset: 0, zIndex: 1300, cursor: 'none' }} />
          <Box ref={cursor_ref} aria-hidden sx={{ position: 'fixed', left: 0, top: 0, zIndex: 1301, pointerEvents: 'none' }}>
            <FakeCursor />
          </Box>
        </>
      )}
      {escaped && (
        <Box
          role="status"
          sx={{
            position: 'fixed',
            left: '50%',
            top: 80,
            transform: 'translateX(-50%)',
            zIndex: 1301,
            px: 2,
            py: 0.75,
            borderRadius: 2,
            fontSize: 14,
            color: '#fff',
            bgcolor: 'rgba(40, 10, 60, 0.9)',
            pointerEvents: 'none',
          }}
        >
          👻 탈출 성공!
        </Box>
      )}
    </>
  );
};

export default HalloweenEffects;

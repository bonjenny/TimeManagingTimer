import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, GlobalStyles, Paper, Typography } from '@mui/material';
import { loadPaletteSettings } from '../utils/colorPalette';
import { useTimerStore } from '../store/useTimerStore';

// 할로윈 팔레트의 이스터에그 2탄. HalloweenEffects 가 할로윈일 때만 띄운다.
// 화면 효과만 낸다 — 기록 데이터는 절대 건드리지 않는다.
//  1) 정전: 다크모드 버튼을 빠르게 4번 → 깜빡이다 꺼지고 손전등 모드 5초
//  2) 무덤 휴지통: 지운 업무를 유령이 들고 날아간다 (휴지통 아이콘·문구는 TimerList)
//  3) 야근 유령: 18시 넘어 타이머가 돌면 속삭임, 21시부터 화면이 조금씩 어두워진다 (22시에 35%)
//  4) 지켜보는 눈: 1분 동안 가만히 있으면 눈이 떠서 커서를 본다
//  5) 코나미 코드(↑↑↓↓←→←→BA): 호박 비 + 화면 한 바퀴
//  6) 10/31 당일(주말이면 앞 금요일) 첫 접속: Trick or Treat?
//  7) 불길한 숫자: 경과 시간 4초 · 4:44 · 13:13 · 4:44:44 에 숫자가 피처럼 번진다. 입력칸에 4 를 치면 그 4 도 잠깐 피로 물든다
//  8) 귀신 붙은 업무: 업무명에 귀신·유령·호박·ghost 가 있으면 유령이 붙는다
//  9) 점심시간 박쥐: 간트차트 점심시간 칸 (LunchBat, GanttChart 가 그린다)
// 10) 메뉴 이름: 주간 일정 → 죽어 일정, 프로젝트 분석 → 프로젝트 부검 (Layout). 가끔 화면 글리치는 HalloweenEffects
// 11) 퇴근 유령: 업무를 완료하면 유령이 손 흔들며 퇴근

export const isHalloweenPalette = () => loadPaletteSettings().type === 'halloween';

/** 할로윈 팔레트인지 (설정에서 바꾸면 바로 반영) */
export const useIsHalloween = () => {
  const [on, setOn] = useState(isHalloweenPalette);
  useEffect(() => {
    const sync = () => setOn(isHalloweenPalette());
    window.addEventListener('palette-changed', sync);
    return () => window.removeEventListener('palette-changed', sync);
  }, []);
  return on;
};

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

/** 키를 하나씩 넣어 코나미 코드가 완성되면 true */
export function createKonamiDetector() {
  let i = 0;
  return (key: string): boolean => {
    const k = key.toLowerCase();
    // 틀려도 ↑ 이면 다시 시작한 것으로 친다 (↑↑↑↓↓… 처럼 ↑ 을 더 눌러도 이어지게)
    i = k === KONAMI[i] ? i + 1 : k === 'arrowup' ? (i >= 2 ? 2 : 1) : 0;
    if (i === KONAMI.length) {
      i = 0;
      return true;
    }
    return false;
  };
}

/** 한글 입력 상태면 B·A 가 ㅠ·ㅁ 로 들어오고 code 도 비어 있을 때가 있어(두벌식) 자판 글자로 되돌린다 */
export const konamiKey = (e: { key: string; code?: string }) =>
  e.code === 'KeyB' || e.key === 'ㅠ' ? 'b' : e.code === 'KeyA' || e.key === 'ㅁ' ? 'a' : e.key;

const DIM_START_MIN = 21 * 60; // 21:00 부터 어두워지기 시작
const DIM_RAMP_MIN = 60; // 22:00 에 가장 어둡다

/** 밤 어둡기(0~0.35): 21:00 부터 1시간에 걸쳐 35% 까지, 그 뒤 새벽 6시까지 35% */
export const nightDimAt = (d: Date) => {
  const min = d.getHours() * 60 + d.getMinutes();
  const since = min >= DIM_START_MIN ? min - DIM_START_MIN : min < 6 * 60 ? min + 24 * 60 - DIM_START_MIN : -1;
  return since < 0 ? 0 : Math.min(0.35, (since / DIM_RAMP_MIN) * 0.35);
};

const LIGHTS_KEY = 'tk-night-lights-until';

/** 다음 새벽 6시 (지금이 6시 전이면 오늘 6시) */
export const nextSixAm = (d: Date) => {
  const t = new Date(d);
  if (t.getHours() >= 6) t.setDate(t.getDate() + 1);
  t.setHours(6, 0, 0, 0);
  return t.getTime();
};

/** 경과 시간 글자("00:13:13")가 불길한 숫자인지 */
export const isOminousElapsed = (text: string) => ['00:00:04', '00:04:44', '00:13:13', '04:44:44'].includes(text.replace(/\s/g, ''));

/** 할로윈(10/31)이거나, 10/31 이 주말이면 그 앞 금요일 (2026년은 10/30 금). 한 해 한 번만 뜨는 건 호출하는 쪽에서 */
export const isHalloweenDay = (d: Date) => {
  if (d.getMonth() !== 9) return false;
  const dow = new Date(d.getFullYear(), 9, 31).getDay(); // 0 일 ~ 6 토
  const workday = dow === 6 ? 30 : dow === 0 ? 29 : 31;
  return d.getDate() === 31 || d.getDate() === workday;
};

export const HAUNTED_RE = /귀신|유령|호박|할로윈|ghost|pumpkin|halloween/i;

/** 할로윈 팔레트일 때 메뉴 이름 (Layout 이 쓴다) */
export const HALLOWEEN_MENU_LABELS: Record<string, string> = {
  '주간 일정': '죽어 일정',
  '주간': '죽어', // 모바일 하단 탭
  '프로젝트 분석': '프로젝트 부검',
};

type Sprite = { id: number; kind: 'carry' | 'byebye' | 'pumpkin' | 'candy' | 'four'; x: number; y: number; font?: string; height?: number; text?: string; delay?: number; dx?: number };

let sprite_seq = 0;

const HalloweenEggs: React.FC = () => {
  const [sprites, setSprites] = useState<Sprite[]>([]);
  const last_pointer = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const last_action = useRef(0); // 마지막 클릭·키 입력 (사람이 한 일인지 가르는 데 쓴다)
  const mounted_at = useRef(Date.now());

  const spawn = (list: Omit<Sprite, 'id'>[], life_ms: number) => {
    const made = list.map((s) => ({ ...s, id: ++sprite_seq }));
    setSprites((prev) => [...prev, ...made]);
    window.setTimeout(() => setSprites((prev) => prev.filter((s) => !made.includes(s))), life_ms);
  };

  // 공통: 마지막 포인터 위치·사람 입력 시각
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      last_pointer.current = { x: e.clientX, y: e.clientY };
      last_action.current = Date.now();
    };
    const onKey = () => (last_action.current = Date.now());
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);

  // 2) 지운 업무를 유령이 들고 날아감 · 11) 완료하면 퇴근 유령
  useEffect(
    () =>
      useTimerStore.subscribe((state, prev) => {
        // 앱을 막 열어 저장소를 불러올 때나, 사람이 손대지 않은 변화(자동 처리)는 무시
        if (Date.now() - mounted_at.current < 3000 || Date.now() - last_action.current > 3000) return;
        const { x, y } = last_pointer.current;
        const prev_deleted = new Set(prev.deleted_logs.map((l) => l.id));
        const gone = state.deleted_logs.filter((l) => !prev_deleted.has(l.id));
        if (gone.length) {
          const title = gone[0].title.length > 14 ? `${gone[0].title.slice(0, 14)}…` : gone[0].title;
          spawn([{ kind: 'carry', x, y, text: gone.length > 1 ? `${title} 외 ${gone.length - 1}개` : title }], 2600);
          return;
        }
        const prev_status = new Map(prev.logs.map((l) => [l.id, l.status]));
        const finished = state.logs.some((l) => l.status === 'COMPLETED' && prev_status.has(l.id) && prev_status.get(l.id) !== 'COMPLETED');
        if (finished) spawn([{ kind: 'byebye', x, y }], 2600);
      }),
    []
  );

  // 1) 정전
  const [blackout, setBlackout] = useState<'off' | 'black' | 'flashlight' | 'fading'>('off');
  const [power_back, setPowerBack] = useState(false);
  const flashlight_ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let clicks: number[] = [];
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest('button');
      if (!btn || !/모드로 전환/.test(btn.getAttribute('aria-label') || '')) return;
      const now = Date.now();
      clicks = [...clicks.filter((t) => now - t < 2000), now];
      if (clicks.length < 4) return;
      clicks = [];
      // 깜빡임은 초당 3번 미만으로 (광과민 안전), 움직임 줄이기면 깜빡임 없이 바로 어둡게
      const steps: ['off' | 'black' | 'flashlight' | 'fading', number][] = reducedMotion()
        ? [['black', 0], ['flashlight', 600]]
        : [['black', 0], ['off', 350], ['black', 700], ['off', 1000], ['black', 1400], ['flashlight', 2000]];
      steps.forEach(([s, at]) => window.setTimeout(() => setBlackout(s), at));
      const end = steps[steps.length - 1][1] + 5000;
      window.setTimeout(() => setBlackout('fading'), end);
      window.setTimeout(() => {
        setBlackout('off');
        setPowerBack(true);
      }, end + 700);
      window.setTimeout(() => setPowerBack(false), end + 2600);
    };
    // capture 단계에서 본다: 테마가 바뀌면 React 가 버튼 안 아이콘(🌙↔☀)을 갈아 끼워서,
    // 버블 단계에선 눌린 아이콘이 이미 화면에서 빠져 closest('button') 이 안 잡힌다
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, []);
  useEffect(() => {
    if (blackout !== 'flashlight') return;
    const paint = (x: number, y: number) => {
      if (flashlight_ref.current) {
        flashlight_ref.current.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(0,0,0,0) 0, rgba(0,0,0,0) 90px, rgba(0,0,0,0.95) 170px)`;
      }
    };
    paint(last_pointer.current.x, last_pointer.current.y);
    const onMove = (e: MouseEvent) => paint(e.clientX, e.clientY);
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [blackout]);

  // 3) 야근 유령 + 21시부터 어둡게
  const working = useTimerStore((s) => !!s.activeTimer && s.activeTimer.status === 'RUNNING');
  const [night_whisper, setNightWhisper] = useState(false);
  const [night_dim, setNightDim] = useState(0);
  // 불 켜기: 그날 밤(다음 새벽 6시)까지 어둡게 하지 않는다. 다시 누르면 끈다
  const [lights_on_until, setLightsOnUntil] = useState(() => {
    try {
      return Number(localStorage.getItem(LIGHTS_KEY) || 0);
    } catch {
      return 0;
    }
  });
  const lights_on = Date.now() < lights_on_until;
  // 어두운 동안: 마우스 주변만 랜턴처럼 밝고, 불 켜는 스위치는 어딘가 숨어 있다가 마우스가 다가가야 보인다
  const night_ref = useRef<HTMLDivElement>(null);
  const switch_ref = useRef<HTMLButtonElement>(null);
  const [switch_pos, setSwitchPos] = useState<{ left: number; top: number } | null>(null);
  const [switch_near, setSwitchNear] = useState(false);
  const dark = night_dim > 0 && !lights_on;
  useEffect(() => {
    if (night_dim <= 0) return;
    // 밤마다(화면 열 때마다) 다른 곳에 숨긴다
    setSwitchPos((cur) => cur ?? { left: 40 + Math.random() * (window.innerWidth - 200), top: 120 + Math.random() * (window.innerHeight - 220) });
  }, [night_dim > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dark) {
      setSwitchNear(false);
      return;
    }
    const paint = (x: number, y: number) => {
      const el = night_ref.current;
      if (el) {
        const lit = (night_dim * 0.2).toFixed(3);
        el.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(0,0,0,${lit}) 0, rgba(0,0,0,${lit}) 70px, rgba(0,0,0,${night_dim}) 220px)`;
      }
      const r = switch_ref.current?.getBoundingClientRect();
      if (r) setSwitchNear(Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < 160);
    };
    paint(last_pointer.current.x, last_pointer.current.y);
    const onMove = (e: MouseEvent) => paint(e.clientX, e.clientY);
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [dark, night_dim, switch_pos]);
  const toggleLights = () => {
    const until = lights_on ? 0 : nextSixAm(new Date());
    setLightsOnUntil(until);
    try {
      localStorage.setItem(LIGHTS_KEY, String(until));
    } catch {
      // 저장 못 해도 이번 화면에선 켜진다
    }
  };
  useEffect(() => {
    if (!working) {
      setNightWhisper(false);
      setNightDim(0);
      return;
    }
    let last_whisper = 0;
    let hide = 0;
    const check = () => {
      const now = new Date();
      const h = now.getHours();
      const late = h >= 18 || h < 6; // 퇴근 시간(18시)부터 야근
      setNightDim(nightDimAt(now));
      if (late && Date.now() - last_whisper > 15 * 60 * 1000) {
        last_whisper = Date.now();
        setNightWhisper(true);
        window.clearTimeout(hide);
        hide = window.setTimeout(() => setNightWhisper(false), 10000);
      }
    };
    check();
    const t = window.setInterval(check, 30000);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(hide);
    };
  }, [working]);

  // 4) 지켜보는 눈
  const [eyes, setEyes] = useState<{ x: number; y: number; leaving: boolean } | null>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  // 떠 있는지는 state 로만 판단한다 (effect 안 지역 변수면 코드가 다시 불릴 때 어긋나 눈이 안 사라졌다)
  const eyes_ref = useRef(eyes);
  eyes_ref.current = eyes;
  useEffect(() => {
    // 떠난 뒤 사라지기 / 아무도 안 움직여도 20초 뒤엔 사라지기
    if (!eyes) return;
    const t = eyes.leaving ? window.setTimeout(() => setEyes(null), 900) : window.setTimeout(() => setEyes((cur) => cur && { ...cur, leaving: true }), 20000);
    return () => window.clearTimeout(t);
  }, [eyes]);
  useEffect(() => {
    let last = Date.now();
    const onActivity = (e: Event) => {
      last = Date.now();
      const cur = eyes_ref.current;
      if (!cur || cur.leaving) return;
      if (e instanceof MouseEvent) setGaze({ x: e.clientX, y: e.clientY }); // 사라지기 전에 한 번 쳐다본다
      setEyes({ ...cur, leaving: true });
    };
    const t = window.setInterval(() => {
      if (eyes_ref.current || Date.now() - last < 60000 || document.hidden) return;
      setGaze({ ...last_pointer.current });
      setEyes({ x: window.innerWidth * (0.15 + Math.random() * 0.7), y: window.innerHeight * (0.2 + Math.random() * 0.6), leaving: false });
    }, 5000);
    const move = (e: MouseEvent) => {
      last_pointer.current = { x: e.clientX, y: e.clientY };
      onActivity(e);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('wheel', onActivity);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('wheel', onActivity);
    };
  }, []);

  // 5) 코나미 코드
  useEffect(() => {
    const detect = createKonamiDetector();
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest('input,textarea,[contenteditable="true"]')) return;
      if (!detect(konamiKey(e))) return;
      const n = reducedMotion() ? 10 : 28;
      spawn(
        Array.from({ length: n }, () => ({ kind: 'pumpkin' as const, x: Math.random() * window.innerWidth, y: -40, delay: Math.random() * 1.5 })),
        5000
      );
      if (!reducedMotion()) {
        document.body.classList.add('tk-spin');
        window.setTimeout(() => document.body.classList.remove('tk-spin'), 1300);
      }
    };
    // capture: 다른 컴포넌트가 방향키를 먼저 가로채도(stopPropagation) 놓치지 않게
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // 7-2) 입력칸에 4 를 치면 그 자리의 4 가 빨갛게 흘러내렸다가 돌아온다.
  // 입력칸 글자 하나만 색을 바꿀 수 없으니, 같은 글꼴의 빨간 4 를 그 자리에 겹쳐 띄운다
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const onInput = (e: Event) => {
      const el = e.target;
      if (!(e instanceof InputEvent) || e.data !== '4') return;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      const cs = getComputedStyle(el);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.font = cs.font;
      const caret = el.selectionStart ?? el.value.length; // number 입력칸은 null → 끝
      const before = el.value.slice(0, Math.max(0, caret - 1)).split('\n').pop() ?? '';
      const r = el.getBoundingClientRect();
      const font_size = parseFloat(cs.fontSize) || 16;
      const line_height = parseFloat(cs.lineHeight) || font_size * 1.2;
      const x = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft) + ctx.measureText(before).width - el.scrollLeft;
      const y = el instanceof HTMLTextAreaElement
        ? r.top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop) - el.scrollTop
        : r.top + (r.height - line_height) / 2;
      spawn([{ kind: 'four', x, y, font: cs.font, height: line_height }], 1900);
    };
    window.addEventListener('input', onInput, true);
    return () => window.removeEventListener('input', onInput, true);
  }, []);

  // 6) 10/31 당일 첫 접속
  const [trick_or_treat, setTrickOrTreat] = useState(false);
  useEffect(() => {
    const now = new Date();
    if (!isHalloweenDay(now)) return;
    const key = `tk-trick-or-treat-${now.getFullYear()}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      return;
    }
    setTrickOrTreat(true);
  }, []);
  const treat = () => {
    setTrickOrTreat(false);
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    spawn(Array.from({ length: 24 }, () => ({ kind: 'candy' as const, x: cx, y: cy, dx: (Math.random() - 0.5) * 600, delay: Math.random() * 0.2 })), 2800);
  };
  const trick = () => {
    setTrickOrTreat(false);
    document.body.classList.add('tk-upside');
    window.setTimeout(() => document.body.classList.remove('tk-upside'), 3000);
  };

  // 7) 불길한 숫자 (경과 시간 칸은 ActiveTimer 의 data-tk-elapsed)
  useEffect(() => {
    let bleeding: Element | null = null;
    const t = window.setInterval(() => {
      document.querySelectorAll('[data-tk-elapsed]').forEach((el) => {
        const ominous = isOminousElapsed(el.textContent || '');
        if (ominous && !el.classList.contains('tk-bleed') && bleeding !== el) {
          bleeding = el;
          el.classList.add('tk-bleed');
          window.setTimeout(() => el.classList.remove('tk-bleed'), 4500);
        } else if (!ominous && bleeding === el) {
          bleeding = null;
        }
      });
    }, 500);
    return () => window.clearInterval(t);
  }, []);

  // 8) 귀신 붙은 업무
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    // ponytail: 3초마다 글자 전체를 훑는다. 화면이 수천 줄로 커지면 MutationObserver 로
    const scan = () => {
      const keep = new Set<Element>();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || !HAUNTED_RE.test(n.nodeValue || '') || el.closest('input,textarea,[data-no-haunt],[role="dialog"]')) continue;
        el.classList.add('tk-haunted');
        keep.add(el);
      }
      root.querySelectorAll('.tk-haunted').forEach((el) => !keep.has(el) && el.classList.remove('tk-haunted'));
    };
    scan();
    const t = window.setInterval(scan, 3000);
    return () => {
      window.clearInterval(t);
      root.querySelectorAll('.tk-haunted').forEach((el) => el.classList.remove('tk-haunted'));
    };
  }, []);

  const eye_offset = (cx: number, cy: number) => {
    const dx = gaze.x - cx;
    const dy = gaze.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return `translate(${(dx / len) * 5}px, ${(dy / len) * 5}px)`;
  };

  return (
    <Box data-no-haunt data-no-glitch>
      <GlobalStyles
        styles={{
          '.tk-haunted::after': {
            content: '"👻"',
            display: 'inline-block',
            marginLeft: '3px',
            fontSize: '0.85em',
            animation: 'tk-float 2.2s ease-in-out infinite',
          },
          '@keyframes tk-float': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-3px)' } },
          // 불길한 숫자: 글자가 빨갛게 변하며 아래로 번지고(text-shadow 를 아래로 겹겹이), 길이가 다른 핏줄기가 흘러내린다
          '.tk-bleed': { color: '#c1121f !important', position: 'relative', animation: 'tk-bleed 4.5s ease-in forwards' },
          '.tk-bleed *': { color: 'inherit !important', textShadow: 'inherit !important', opacity: '1 !important', maxWidth: '100px !important' },
          '.tk-bleed::after': {
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            top: '90%',
            pointerEvents: 'none',
            background: [
              'linear-gradient(#8b0000, #a4161a) 10% 0 / 5px 70% no-repeat',
              'linear-gradient(#a4161a, #c1121f) 27% 0 / 4px 40% no-repeat',
              'linear-gradient(#8b0000, #a4161a) 46% 0 / 6px 100% no-repeat',
              'linear-gradient(#a4161a, #c1121f) 66% 0 / 4px 55% no-repeat',
              'linear-gradient(#8b0000, #a4161a) 85% 0 / 5px 30% no-repeat',
            ].join(', '),
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
            animation: 'tk-drip 4.5s ease-in forwards',
          },
          '@keyframes tk-bleed': {
            '0%': { textShadow: '0 0 0 rgba(139,0,0,0)' },
            '25%': { textShadow: '0 1px 0 #a4161a, 0 3px 0 #a4161a, 0 5px 1px rgba(139,0,0,0.8)' },
            '65%': { textShadow: '0 2px 0 #a4161a, 0 5px 0 #8b0000, 0 9px 1px rgba(139,0,0,0.85), 0 15px 2px rgba(139,0,0,0.6), 0 23px 4px rgba(139,0,0,0.35)' },
            '100%': { textShadow: '0 3px 0 rgba(164,22,26,0), 0 7px 0 rgba(139,0,0,0), 0 12px 1px rgba(139,0,0,0), 0 20px 2px rgba(139,0,0,0), 0 30px 4px rgba(139,0,0,0)' },
          },
          '@keyframes tk-four-out': { '0%, 70%': { opacity: 1 }, '100%': { opacity: 0 } },
          '@keyframes tk-four-drip': { '0%': { height: 0 }, '20%': { height: 0 }, '100%': { height: 22 } },
          '@keyframes tk-drip': { '0%': { height: 0, opacity: 1 }, '15%': { height: 0, opacity: 1 }, '80%': { height: 52, opacity: 1 }, '100%': { height: 60, opacity: 0 } },
          'body.tk-spin #root': { animation: 'tk-spin 1.2s ease-in-out' },
          '@keyframes tk-spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
          '#root': { transition: 'transform 0.6s ease' },
          'body.tk-upside #root': { transform: 'rotate(180deg)' },
          '@media (prefers-reduced-motion: reduce)': { '#root': { transition: 'none' } },
          '@keyframes tk-carry': {
            '0%': { transform: 'translate(-50%, 0) rotate(-6deg)', opacity: 0 },
            '15%': { opacity: 1 },
            '100%': { transform: 'translate(-50%, -260px) rotate(8deg)', opacity: 0 },
          },
          '@keyframes tk-byebye': {
            '0%': { transform: 'translate(-50%, 0)', opacity: 0 },
            '15%': { opacity: 1 },
            '100%': { transform: 'translate(120px, -160px)', opacity: 0 },
          },
          '@keyframes tk-wave': { '0%, 100%': { transform: 'rotate(-12deg)' }, '50%': { transform: 'rotate(18deg)' } },
          '@keyframes tk-fall': { from: { transform: 'translateY(0) rotate(0deg)' }, to: { transform: 'translateY(110vh) rotate(540deg)' } },
          '@keyframes tk-candy': {
            '0%': { transform: 'translate(0, 0)', opacity: 1 },
            '40%': { transform: 'translate(calc(var(--dx) * 0.6), -220px)', opacity: 1 },
            '100%': { transform: 'translate(var(--dx), 380px)', opacity: 0 },
          },
          '@keyframes tk-blink': { '0%, 92%, 100%': { transform: 'scaleY(1)' }, '96%': { transform: 'scaleY(0.1)' } },
          '@keyframes tk-pop': { from: { opacity: 0, transform: 'scale(0.6)' }, to: { opacity: 1, transform: 'scale(1)' } },
        }}
      />

      {/* 날아다니는 것들: 지운 업무 들고 가는 유령 · 퇴근 유령 · 호박 비 · 사탕 */}
      <Box aria-hidden sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1400, overflow: 'hidden' }}>
        {sprites.map((s) => {
          if (s.kind === 'carry')
            return (
              <Box key={s.id} sx={{ position: 'absolute', left: s.x, top: s.y - 30, textAlign: 'center', animation: 'tk-carry 2.5s ease-in forwards' }}>
                <Box sx={{ fontSize: 34, lineHeight: 1 }}>👻</Box>
                <Box sx={{ mt: -0.5, px: 1, py: 0.25, fontSize: 12, borderRadius: 1, bgcolor: 'rgba(40,10,60,0.85)', color: '#fff', whiteSpace: 'nowrap' }}>
                  {s.text}
                </Box>
              </Box>
            );
          if (s.kind === 'byebye')
            return (
              <Box key={s.id} sx={{ position: 'absolute', left: s.x, top: s.y - 40, display: 'flex', alignItems: 'center', gap: 0.5, animation: 'tk-byebye 2.5s ease-in forwards' }}>
                <Box sx={{ fontSize: 30, lineHeight: 1 }}>👻</Box>
                <Box component="span" sx={{ display: 'inline-block', fontSize: 20, animation: 'tk-wave 0.4s ease-in-out infinite' }}>👋</Box>
                <Box sx={{ px: 1, py: 0.25, fontSize: 12, borderRadius: 1, bgcolor: 'rgba(40,10,60,0.85)', color: '#fff', whiteSpace: 'nowrap' }}>수고했어~ 퇴근!</Box>
              </Box>
            );
          if (s.kind === 'four')
            return (
              <Box
                key={s.id}
                style={{ font: s.font, lineHeight: `${s.height}px` }}
                sx={{
                  position: 'absolute',
                  left: s.x,
                  top: s.y,
                  color: '#c1121f',
                  animation: 'tk-bleed 1.8s ease-in forwards, tk-four-out 1.8s ease-in forwards',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: '45%',
                    top: '85%',
                    width: 3,
                    borderRadius: '0 0 2px 2px',
                    background: 'linear-gradient(#8b0000, #c1121f)',
                    animation: 'tk-four-drip 1.8s ease-in forwards',
                  },
                }}
              >
                4
              </Box>
            );
          if (s.kind === 'pumpkin')
            return <Box key={s.id} sx={{ position: 'absolute', left: s.x, top: s.y, fontSize: 28, animation: `tk-fall ${reducedMotion() ? 4 : 2.6}s linear ${s.delay}s forwards` }}>🎃</Box>;
          return (
            <Box
              key={s.id}
              style={{ ['--dx' as string]: `${s.dx}px` }}
              sx={{ position: 'absolute', left: s.x, top: s.y, fontSize: 24, animation: `tk-candy 2.4s ease-out ${s.delay}s forwards` }}
            >
              {['🍬', '🍭', '🍫'][s.id % 3]}
            </Box>
          );
        })}
      </Box>

      {/* 1) 정전 */}
      {blackout !== 'off' && (
        <Box
          ref={flashlight_ref}
          aria-hidden
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1450,
            pointerEvents: 'none',
            bgcolor: blackout === 'black' ? 'rgba(0,0,0,0.97)' : undefined,
            opacity: blackout === 'fading' ? 0 : 1,
            transition: 'opacity 0.6s',
          }}
        />
      )}
      {power_back && <Toast>💡 전기 들어왔다!</Toast>}

      {/* 3) 야근 유령 · 새벽 어둠 */}
      {dark && <Box ref={night_ref} aria-hidden sx={{ position: 'fixed', inset: 0, zIndex: 1190, pointerEvents: 'none', bgcolor: `rgba(0,0,0,${night_dim})` }} />}
      {night_dim > 0 && switch_pos && (
        <Box
          component="button"
          type="button"
          ref={switch_ref}
          onClick={toggleLights}
          aria-label={lights_on ? '다시 어둡게' : '불 켜기'}
          title={lights_on ? '다시 어둡게' : '불 켜기 (오늘 밤 동안)'}
          sx={{
            position: 'fixed',
            // 어두울 땐 숨은 자리, 불을 켠 뒤엔 왼쪽 아래 (다시 어둡게)
            ...(lights_on ? { left: 20, bottom: 20 } : { left: switch_pos.left, top: switch_pos.top }),
            zIndex: 1300,
            opacity: lights_on || switch_near ? 1 : 0,
            transition: 'opacity 0.4s',
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.75,
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'inherit',
            color: '#fff',
            bgcolor: lights_on ? 'rgba(40,10,60,0.75)' : 'rgba(255,170,40,0.9)',
            boxShadow: lights_on ? 'none' : '0 0 14px rgba(255,170,40,0.6)',
            '&:hover': { filter: 'brightness(1.1)' },
          }}
        >
          <span style={{ fontSize: 16 }}>{lights_on ? '🌙' : '💡'}</span>
          {lights_on ? '다시 어둡게' : '불 켜기'}
        </Box>
      )}
      {night_whisper && (
        <Box
          role="status"
          onClick={() => setNightWhisper(false)}
          sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1300, display: 'flex', alignItems: 'flex-end', gap: 1, cursor: 'pointer', animation: 'tk-pop 0.4s ease-out' }}
        >
          <Box sx={{ px: 1.5, py: 0.75, borderRadius: 2, fontSize: 13, color: '#fff', bgcolor: 'rgba(40,10,60,0.9)', mb: 3 }}>아직도 일해…? 집에 가…</Box>
          <Box sx={{ fontSize: 40, lineHeight: 1, animation: 'tk-float 2.2s ease-in-out infinite' }}>👻</Box>
        </Box>
      )}

      {/* 4) 지켜보는 눈 */}
      {eyes && (
        <Box
          aria-hidden
          sx={{
            position: 'fixed',
            left: eyes.x,
            top: eyes.y,
            zIndex: 1300,
            pointerEvents: 'none',
            display: 'flex',
            gap: '10px',
            opacity: eyes.leaving ? 0 : 1,
            transition: 'opacity 0.8s',
            animation: 'tk-pop 0.6s ease-out',
          }}
        >
          {[0, 30].map((ox) => (
            <Box
              key={ox}
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: '#fff8e0',
                boxShadow: '0 0 10px rgba(255,117,24,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: reducedMotion() ? undefined : 'tk-blink 4s infinite',
              }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#111', transform: eye_offset(eyes.x + ox + 10, eyes.y + 10), transition: 'transform 0.15s' }} />
            </Box>
          ))}
        </Box>
      )}

      {/* 6) Trick or Treat */}
      {trick_or_treat && (
        <Paper
          elevation={8}
          role="dialog"
          aria-label="Trick or Treat"
          sx={{ position: 'fixed', left: '50%', top: '30%', transform: 'translateX(-50%)', zIndex: 1500, p: 3, textAlign: 'center', borderRadius: 3, animation: 'tk-pop 0.4s ease-out' }}
        >
          <Typography sx={{ fontSize: 40, lineHeight: 1.2 }}>🎃</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Trick or Treat?
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={trick}>
              Trick 😈
            </Button>
            <Button variant="contained" onClick={treat}>
              Treat 🍬
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

const Toast: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    role="status"
    sx={{ position: 'fixed', left: '50%', top: 80, transform: 'translateX(-50%)', zIndex: 1460, px: 2, py: 0.75, borderRadius: 2, fontSize: 14, color: '#fff', bgcolor: 'rgba(40,10,60,0.9)', pointerEvents: 'none' }}
  >
    {children}
  </Box>
);

/** 9) 간트차트 점심시간 칸에 거꾸로 매달린 박쥐. 마우스를 대면 날아갔다가 잠시 뒤 돌아온다 */
export const LunchBat: React.FC = () => {
  const [flown, setFlown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (flown) {
      const t = window.setTimeout(() => setFlown(false), 8000);
      return () => window.clearTimeout(t);
    }
    // 간트차트의 다른 층(행·드래그 영역)이 위를 덮고 있어 마우스 이벤트가 박쥐까지 안 온다 → 위치로 판단
    const onMove = (e: MouseEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (r && Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < 24) setFlown(true);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [flown]);
  return (
    <Box
      ref={ref}
      aria-hidden
      sx={{
        position: 'absolute',
        top: 2,
        left: '50%',
        fontSize: 18,
        lineHeight: 1,
        zIndex: 1,
        cursor: 'default',
        transform: flown ? 'translate(120px, -80px) rotate(0deg)' : 'translateX(-50%) rotate(180deg)',
        opacity: flown ? 0 : 1,
        transition: flown ? 'transform 0.9s ease-in, opacity 0.9s ease-in' : 'opacity 0.6s ease-out',
      }}
    >
      🦇
    </Box>
  );
};

export default HalloweenEggs;

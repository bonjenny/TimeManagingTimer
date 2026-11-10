import React, { useEffect, useRef, useState } from 'react';
import { Box, GlobalStyles } from '@mui/material';
import { loadPaletteSettings } from '../utils/colorPalette';
import { useTimerStore } from '../store/useTimerStore';
import { sceneGlobalStyles, SCENE_BOX_SX } from './sceneStyles';

// 바다 팔레트의 배경. 화면 맨 뒤(z-index -1)에 깔리고 클릭은 통과한다.
// WebGL 셰이더 한 장으로 그린다 (이미지 없음):
// - 라이트모드: 위에서 내려다본 얕은 청록 물. 바닥에 비친 물빛 무늬(커스틱)가 천천히 일렁인다
// - 다크모드: 깊은 바닷속. 수면 쪽 물빛 · 비스듬히 내려오는 빛줄기 · 천천히 가라앉는 부유물
// 집중에 방해되지 않게 아주 느리게 움직인다. 화면 절반 해상도 · 초당 30장으로 그리고, 탭이 안 보이면 멈춘다.
// 움직임 줄이기 설정이면 한 장만 그린다. WebGL 이 없으면 아래 CSS 그라데이션만 보인다

export const isOceanPalette = () => loadPaletteSettings().type === 'ocean';

/** 바다 팔레트인지 (설정에서 바꾸면 바로 반영) */
export const useIsOcean = () => {
  const [on, setOn] = useState(isOceanPalette);
  useEffect(() => {
    const sync = () => setOn(isOceanPalette());
    window.addEventListener('palette-changed', sync);
    return () => window.removeEventListener('palette-changed', sync);
  }, []);
  return on;
};

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_dark;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

// 움직이는 세포(보로노이) 경계까지의 거리. 경계가 물빛 무늬의 밝은 선이 된다
float cellEdge(vec2 p, float t) {
  vec2 g = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = hash2(g + o);
      vec2 r = o + 0.5 + 0.42 * sin(t + 6.2831 * h) - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  return sqrt(d2) - sqrt(d1);
}

// 물빛 무늬: 크기가 다른 두 겹을 살짝 비틀어 겹친다. 두 겹이 만나는 곳이 더 밝고,
// 넓게 보면 밝은 데와 옅은 데가 섞여 있다 (고르면 금 간 유리처럼 보인다)
float caustic(vec2 uv, float t) {
  vec2 w = uv + 0.08 * vec2(sin(uv.y * 3.1 + t * 0.7), sin(uv.x * 2.7 - t * 0.6));
  float a = exp(-cellEdge(w * 4.4, t * 0.8) * 16.0);
  float b = exp(-cellEdge(w * 6.8 + 3.7, -t * 0.6 + 1.3) * 20.0);
  float patch = 0.45 + 0.55 * (0.5 + 0.5 * sin(uv.x * 1.7 + t * 0.11) * sin(uv.y * 1.3 - t * 0.09 + 1.0));
  return (a * 0.5 + b * 0.3 + a * b * 0.9) * patch;
}

// 천천히 가라앉는 작은 부유물 (칸마다 하나, 일부만 보인다)
float snow(vec2 uv, float scale, float t, float speed) {
  vec2 q = uv * scale + vec2(0.0, -t * speed);
  vec2 g = floor(q);
  vec2 f = fract(q);
  vec2 h = hash2(g);
  vec2 pos = 0.5 + 0.32 * vec2(sin(t * 0.3 + h.x * 6.28), cos(t * 0.25 + h.y * 6.28));
  float d = length(f - pos);
  return smoothstep(0.07, 0.0, d) * step(0.78, h.x);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y); // 위가 0
  vec2 uv = frag / u_res.y;
  float y = frag.y / u_res.y;
  float t = u_time;
  vec3 col;

  if (u_dark < 0.5) {
    // 얕은 물: 위쪽은 조금 깊은 청록, 아래로 갈수록 모래가 비치는 연한 물빛. 넓게 천천히 일렁이는 얼룩을 더한다
    float swell = 0.5 + 0.5 * sin(uv.x * 1.1 + sin(uv.y * 1.6 + t * 0.07) * 1.4);
    vec3 deep = vec3(0.07, 0.56, 0.68);
    vec3 shallow = vec3(0.50, 0.86, 0.83);
    col = mix(deep, shallow, smoothstep(0.0, 1.0, y * 0.75 + swell * 0.25));
    float c = caustic(uv * 1.15, t);
    col += vec3(0.80, 0.98, 1.0) * c * 0.34;
    // 오른쪽 위 햇빛이 물에 번진 자리
    vec2 sun = vec2(u_res.x / u_res.y * 0.82, 0.05);
    col += vec3(1.0, 0.98, 0.9) * 0.16 * exp(-length(uv - sun) * 2.2);
  } else {
    // 깊은 바다: 위는 수면빛이 도는 남청, 아래로 갈수록 거의 검은 남색
    vec3 top = vec3(0.05, 0.28, 0.42);
    vec3 bottom = vec3(0.006, 0.025, 0.07);
    col = mix(top, bottom, smoothstep(0.0, 1.0, pow(y, 0.8)));
    // 빛줄기: 왼쪽 위 수면에서 비스듬히 퍼진다. 깊어질수록 옅어진다
    vec2 src = vec2(u_res.x / u_res.y * 0.28, -0.35);
    vec2 d = uv - src;
    float a = atan(d.x, d.y);
    float rays = pow(0.5 + 0.5 * sin(a * 17.0 + 0.6 * sin(a * 7.0 - t * 0.10) + t * 0.04), 3.0) * 0.6
               + pow(0.5 + 0.5 * sin(a * 29.0 - t * 0.07), 4.0) * 0.4;
    // 빛은 오른쪽 아래로 퍼지는 부채꼴 안에만 (사방으로 퍼지면 그냥 얼룩처럼 보인다)
    float cone = smoothstep(0.75, 0.0, abs(a - 0.35));
    col += vec3(0.32, 0.66, 0.82) * rays * cone * 0.42 * pow(1.0 - y, 1.8);
    // 수면 바로 아래 물빛
    col += vec3(0.35, 0.72, 0.85) * caustic(uv * 0.9, t) * 0.24 * pow(1.0 - y, 3.5);
    // 부유물: 큰 것과 작은 것 두 겹 (가까운 게 조금 빠르다)
    col += vec3(0.55, 0.75, 0.85) * (snow(uv, 9.0, t, 0.05) * 0.22 + snow(uv, 16.0, t, 0.03) * 0.12) * (0.4 + 0.6 * (1.0 - y));
  }
  // 가장자리를 살짝 어둡게
  vec2 v = frag / u_res - 0.5;
  col *= 1.0 - dot(v, v) * (u_dark > 0.5 ? 0.5 : 0.18);
  gl_FragColor = vec4(col, 1.0);
}
`;

const RENDER_SCALE = 0.5; // 화면 절반 해상도로 그려 늘린다 (무늬가 부드러워지고 GPU 도 덜 쓴다)
const FRAME_MS = 1000 / 30;
const SPEED = 0.33; // 무늬 하나가 한 번 일렁이는 데 20초 남짓

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('ocean shader', gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

const OceanCanvas: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const canvas_ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvas_ref.current;
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!canvas || !gl) return; // WebGL 이 없으면 CSS 그라데이션만
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const a_pos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(a_pos);
    gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);
    const u_res = gl.getUniformLocation(program, 'u_res');
    const u_time = gl.getUniformLocation(program, 'u_time');
    gl.uniform1f(gl.getUniformLocation(program, 'u_dark'), isDark ? 1 : 0);

    const resize = () => {
      canvas.width = Math.max(1, Math.round(window.innerWidth * RENDER_SCALE));
      canvas.height = Math.max(1, Math.round(window.innerHeight * RENDER_SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u_res, canvas.width, canvas.height);
    };
    // 매번 같은 곳에서 시작하지 않게 (켤 때마다 다른 무늬)
    const offset = Math.random() * 100;
    const draw = (now: number) => {
      gl.uniform1f(u_time, offset + (now / 1000) * SPEED);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      draw(now);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (still) draw(0);
      else if (!document.hidden) raf = requestAnimationFrame(loop);
    };
    const onResize = () => {
      resize();
      draw(performance.now());
    };
    resize();
    start();
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', start);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', start);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [isDark]);

  return <canvas ref={canvas_ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
};

const OceanScene: React.FC = () => {
  const is_ocean = useIsOcean();
  const is_dark = useTimerStore((s) => s.themeConfig.isDark);
  if (!is_ocean) return null;
  return (
    <>
      <GlobalStyles
        styles={sceneGlobalStyles({
          vars: is_dark
            ? {
                '--bg-primary': '#03152a',
                '--bg-secondary': '#072340',
                '--bg-tertiary': '#0b2c4e',
                '--bg-hover': '#11385f',
                '--card-bg': 'rgba(6, 30, 56, 0.5)',
                '--header-bg': 'rgba(3, 21, 42, 0.45)',
                '--border-color': 'rgba(90, 160, 210, 0.22)',
              }
            : {
                // 흰 카드가 물빛과 따로 놀지 않게: 물빛 도는 반투명 흰색 + 뒤를 흐리게(유리 느낌)
                '--bg-primary': '#effbfc',
                '--bg-secondary': 'rgba(250, 254, 255, 0.74)',
                '--bg-tertiary': 'rgba(222, 246, 248, 0.64)',
                '--bg-hover': 'rgba(196, 238, 242, 0.58)',
                '--card-bg': 'rgba(250, 254, 255, 0.6)',
                '--header-bg': 'rgba(246, 253, 254, 0.55)',
                '--border-color': 'rgba(40, 150, 170, 0.25)',
              },
          glass: is_dark ? { dialog_bg: '#072340', tone: 'dark', refract: true } : { dialog_bg: '#f6fdfd', tone: 'light', refract: true },
          // 캔버스가 뜨기 전 · WebGL 이 없을 때 보이는 같은 색 그라데이션
          sky: is_dark
            ? 'linear-gradient(180deg, #0d4769 0%, #062a48 30%, #031530 65%, #01060f 100%)'
            : 'linear-gradient(180deg, #128fad 0%, #3ab6c4 45%, #7fd7d0 100%)',
          // 바닥글은 물 위에 놓이므로 읽히게
          extra: is_dark ? undefined : { 'footer, footer *': { color: 'rgba(5, 60, 72, 0.85) !important' } },
        })}
      />
      <Box aria-hidden data-ocean-scene sx={SCENE_BOX_SX}>
        <OceanCanvas isDark={is_dark} />
        {/* 유리 카드 너머가 물속처럼 살짝 일렁여 보이게 (sceneStyles 의 backdrop-filter 가 쓴다. 크롬·엣지만 됨, 다른 데선 흐림만) */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <filter id="tk-glass-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves={2} seed={7} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={22} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      </Box>
    </>
  );
};

export default OceanScene;

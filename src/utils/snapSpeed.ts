// 간트차트 끌기 속도에 따라 스냅 강도를 정한다.
// 천천히 섬세하게 맞추면 거의 안 붙고(미세 조정), 휙 대충 놓으면 근처 세션 경계에 크게 붙는다.
//
// 사람은 빠르게 끌어도 놓기 직전엔 거의 멈춘다. 그래서 '놓는 순간 속도'가 아니라
// '놓기 전 0.5초 안의 최고 속도'로 판단한다. 0.5초 넘게 천천히 맞추다 놓으면 미세 조정.

export type PointerSample = { t: number; x: number };

const PEAK_WINDOW_MS = 500; // 놓기 전 이 시간 안의 최고 속도를 본다
const SEGMENT_MS = 50; // 속도는 이 간격 이상 떨어진 두 점으로 잰다 (손떨림·이벤트 몰림 무시)
const SLOW_PX_PER_MS = 0.15; // 이하: 미세 조정 (150px/s)
const FAST_PX_PER_MS = 0.5; // 이상: 최대 스냅 (500px/s)
const MIN_SNAP_MS = 2 * 60 * 1000;
const MAX_SNAP_MS = 15 * 60 * 1000;

/** 샘플을 쌓고 오래된 건 버린다 */
export function recordPointer(samples: PointerSample[], x: number, t: number = performance.now()): void {
  samples.push({ t, x });
  while (samples.length > 2 && t - samples[0].t > PEAK_WINDOW_MS * 2) samples.shift();
}

/** 놓기 전 PEAK_WINDOW_MS 안의 최고 속도 (px/ms). 그동안 멈춰 있었으면 0 */
export function pointerSpeed(samples: PointerSample[], now: number = performance.now()): number {
  let peak = 0;
  for (let i = samples.length - 1; i > 0; i--) {
    if (now - samples[i].t > PEAK_WINDOW_MS) break;
    // i 에서 SEGMENT_MS 이상 앞선 점을 찾아 그 사이 평균 속도
    let k = i - 1;
    while (k > 0 && samples[i].t - samples[k].t < SEGMENT_MS) k--;
    const dt = Math.max(16, samples[i].t - samples[k].t);
    peak = Math.max(peak, Math.abs(samples[i].x - samples[k].x) / dt);
  }
  return peak;
}

/** 속도 → 세션 경계 스냅 거리(ms). 느리면 2분, 빠르면 15분, 사이는 선형 */
export function snapThresholdForSpeed(px_per_ms: number): number {
  const f = Math.min(1, Math.max(0, (px_per_ms - SLOW_PX_PER_MS) / (FAST_PX_PER_MS - SLOW_PX_PER_MS)));
  return MIN_SNAP_MS + f * (MAX_SNAP_MS - MIN_SNAP_MS);
}

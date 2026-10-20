import { PointerSample, pointerSpeed, recordPointer, snapThresholdForSpeed } from '../../utils/snapSpeed';

const MIN = 60 * 1000;

// 16ms(60Hz) 마다 이벤트가 오는 것처럼 x(t) 를 기록
const track = (xAt: (t: number) => number, until: number) => {
  const s: PointerSample[] = [];
  for (let t = 0; t <= until; t += 16) recordPointer(s, xAt(t), t);
  return s;
};

describe('snapSpeed', () => {
  it('천천히 움직이면 2분, 빠르면 15분, 사이는 선형', () => {
    expect(snapThresholdForSpeed(0)).toBe(2 * MIN);
    expect(snapThresholdForSpeed(0.15)).toBe(2 * MIN);
    expect(snapThresholdForSpeed(5)).toBe(15 * MIN);
    const mid = snapThresholdForSpeed(0.3);
    expect(mid).toBeGreaterThan(2 * MIN);
    expect(mid).toBeLessThan(15 * MIN);
  });

  it('빠르게 끌다가 놓기 직전 감속해도 빠른 것으로 본다', () => {
    // 300ms 동안 1px/ms 로 끌고, 200ms 동안 서서히 멈춘 뒤 놓음
    const s = track((t) => (t <= 300 ? t : 300 + 100 * Math.sin(((t - 300) / 200) * (Math.PI / 2))), 496);
    expect(snapThresholdForSpeed(pointerSpeed(s, 500))).toBe(15 * MIN);
  });

  it('짧게 휙 끌어도 빠른 것으로 본다', () => {
    const s = track((t) => t, 64); // 64ms 동안 64px
    expect(pointerSpeed(s, 64)).toBeGreaterThan(0.5);
  });

  it('천천히 섬세하게 맞추면 미세 조정', () => {
    const s = track((t) => t * 0.05, 2000); // 50px/s
    expect(snapThresholdForSpeed(pointerSpeed(s, 2000))).toBe(2 * MIN);
  });

  it('빠르게 끌고 0.5초 넘게 멈췄다 놓으면 미세 조정', () => {
    const s = track((t) => Math.min(t, 200) * 3, 200);
    expect(pointerSpeed(s, 800)).toBe(0);
  });
});

import { createDwellDetector, glitchText, makeWave } from '../../components/HalloweenEffects';

describe('할로윈 이스터에그: 글자 깨짐', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('잠깐 깨졌다가 원래 글자로 돌아온다', () => {
    document.body.innerHTML = '<div id="root"><h6>최근 업무 기록</h6><p>오늘 3시간 51분</p></div>';
    const root = document.getElementById('root')!;
    jest.spyOn(Math, 'random').mockReturnValue(0); // 첫 프레임은 거의 다 깨짐
    glitchText(root, 800);
    jest.advanceTimersByTime(100);
    expect(root.textContent).not.toContain('최근 업무 기록');
    expect(document.body.classList.contains('tk-glitch')).toBe(true);
    jest.advanceTimersByTime(800);
    expect(root.querySelector('h6')!.textContent).toBe('최근 업무 기록');
    expect(root.querySelector('p')!.textContent).toBe('오늘 3시간 51분');
    expect(document.body.classList.contains('tk-glitch')).toBe(false);
  });

  it('깨진 사이 화면이 바꾼 글자(타이머 등)는 되돌리지 않는다', () => {
    document.body.innerHTML = '<div id="root"><span>00:01</span></div>';
    const root = document.getElementById('root')!;
    jest.spyOn(Math, 'random').mockReturnValue(0);
    glitchText(root, 800);
    jest.advanceTimersByTime(100);
    root.querySelector('span')!.firstChild!.nodeValue = '00:02'; // React 가 갱신
    jest.advanceTimersByTime(800);
    expect(root.textContent).toBe('00:02');
  });
});

describe('유령에게 잡혔을 때 흔들어서 탈출', () => {
  it('좌우로 빠르게 6번 방향을 바꾸면 탈출, 느린 움직임은 안 센다', () => {
    const { createShakeDetector } = jest.requireActual('../../components/HalloweenEffects');
    let t = 0;
    const shaking = createShakeDetector(() => t);
    expect([3, -3, 3, -3, 3, -3, 3, -3].some((x) => shaking(x))).toBe(false); // 느림
    const fast = [20, -20, 20, -20, 20, -20, 20];
    const results = fast.map((x) => {
      t += 60;
      return shaking(x);
    });
    expect(results.indexOf(true)).toBe(6); // 여섯 번째 방향 전환에서 풀림
  });

  it('너무 띄엄띄엄 흔들면 안 풀린다', () => {
    const { createShakeDetector } = jest.requireActual('../../components/HalloweenEffects');
    let t = 0;
    const shaking = createShakeDetector(() => t);
    const results = [20, -20, 20, -20, 20, -20, 20].map((x) => {
      t += 400;
      return shaking(x);
    });
    expect(results.some(Boolean)).toBe(false);
  });
});

describe('유령 잡기: 스치면 안 잡히고 머물러야 잡힌다', () => {
  it('0.8초 동안 같은 유령 위에 있어야 true', () => {
    let t = 0;
    const dwelled = createDwellDetector(800, () => t);
    expect(dwelled(0)).toBe(false); // 막 닿음
    t = 500;
    expect(dwelled(0)).toBe(false);
    t = 800;
    expect(dwelled(0)).toBe(true);
  });

  it('잠깐 벗어나거나 다른 유령으로 옮기면 처음부터', () => {
    let t = 0;
    const dwelled = createDwellDetector(800, () => t);
    dwelled(0);
    t = 600;
    expect(dwelled(-1)).toBe(false); // 스치고 지나감
    t = 700;
    dwelled(0);
    t = 1200;
    expect(dwelled(0)).toBe(false); // 다시 닿은 지 0.5초
    expect(dwelled(1)).toBe(false); // 다른 유령
    t = 2000;
    expect(dwelled(1)).toBe(true);
  });
});

describe('유령 무리', () => {
  it('2~3마리, 높이·출발·속도가 범위 안에서 제각각', () => {
    for (let n = 0; n < 50; n++) {
      const wave = makeWave();
      expect(wave.length).toBeGreaterThanOrEqual(2);
      expect(wave.length).toBeLessThanOrEqual(3);
      wave.forEach((f) => {
        expect(f.top).toBeGreaterThanOrEqual(8);
        expect(f.top).toBeLessThanOrEqual(78);
        expect(f.delay).toBeGreaterThanOrEqual(0);
        expect(f.delay).toBeLessThanOrEqual(8);
        expect(f.duration).toBeGreaterThanOrEqual(28);
        expect(f.duration).toBeLessThanOrEqual(46);
      });
    }
    const ids = [...makeWave(), ...makeWave()].map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('저절로 생기는 글리치 (subtle)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('흔들림 없이 글자만 바뀌었다가 1초 뒤 그대로', () => {
    document.body.innerHTML = '<div id="root"><p>최근 업무 기록</p></div>';
    const root = document.getElementById('root')!;
    jest.spyOn(Math, 'random').mockReturnValue(0);
    glitchText(root, 1000, true);
    expect(root.textContent).not.toBe('최근 업무 기록');
    expect(document.body.classList.contains('tk-glitch')).toBe(false);
    jest.advanceTimersByTime(1000);
    expect(root.textContent).toBe('최근 업무 기록');
  });
});

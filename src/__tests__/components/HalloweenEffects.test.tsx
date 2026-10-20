import { glitchText } from '../../components/HalloweenEffects';

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

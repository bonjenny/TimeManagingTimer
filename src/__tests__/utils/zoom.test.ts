import { cssZoom, unzoom, zoomModifier } from '../../utils/zoom';

describe('화면 확대(CSS zoom) 보정', () => {
  const setZoom = (el: Element, z: number | undefined) => Object.defineProperty(el, 'currentCSSZoom', { value: z, configurable: true });
  afterEach(() => setZoom(document.body, undefined));

  it('currentCSSZoom 이 없는 브라우저는 1 (그대로)', () => {
    expect(cssZoom()).toBe(1);
    expect(unzoom(500)).toBe(500);
  });

  it('80% 화면에서 마우스 x=640 → 메뉴 left 800 (그려질 때 ×0.8 = 640)', () => {
    setZoom(document.body, 0.8);
    expect(unzoom(640)).toBeCloseTo(800);
  });

  it('dnd-kit: 끄는 항목 이동량을 그 요소의 zoom 으로 나눈다', () => {
    const item = document.createElement('li');
    setZoom(item, 0.5);
    const transform = { x: 100, y: 40, scaleX: 1, scaleY: 1 };
    const out = zoomModifier({ transform, activatorEvent: { target: item } as unknown as Event } as never);
    expect(out).toEqual({ x: 200, y: 80, scaleX: 1, scaleY: 1 });
  });
});

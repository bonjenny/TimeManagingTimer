import type { Modifier } from '@dnd-kit/core';

// 화면 크기 설정(html zoom)과 Ctrl+휠(앱 상자 zoom)은 CSS zoom 이다.
// 크롬(128~)에선 마우스 좌표(clientX)·getBoundingClientRect 는 확대된 화면 기준인데, 확대된 요소 안에 그 값을 그대로
// left/top·translate 로 넣으면 한 번 더 확대되어 (값 × zoom) 자리에 그려진다 → 오른쪽으로 갈수록 마우스보다 왼쪽에 뜬다.
// 그래서 그 요소의 zoom 으로 나눠서 넣는다. currentCSSZoom 이 없는 브라우저는 1 (예전 방식)

/** 요소에 실제로 걸린 zoom (조상 것까지 곱한 값). 기본은 body = 포털(메뉴·팝오버)이 붙는 곳 */
export function cssZoom(el: Element | null = document.body): number {
  const z = (el as (Element & { currentCSSZoom?: number }) | null)?.currentCSSZoom;
  return z && Number.isFinite(z) ? z : 1;
}

/** 화면 좌표(마우스·getBoundingClientRect) → el 안에서 left/top 로 쓸 값 */
export const unzoom = (value: number, el?: Element | null) => value / cssZoom(el ?? document.body);

/** dnd-kit: 끌고 있는 항목이 마우스를 따라오게 (확대된 화면에서 덜 움직이던 것 보정) */
export const zoomModifier: Modifier = ({ transform, activatorEvent }) => {
  const target = activatorEvent?.target instanceof Element ? activatorEvent.target : null;
  const z = cssZoom(target);
  return z === 1 ? transform : { ...transform, x: transform.x / z, y: transform.y / z };
};

/** DndContext 의 modifiers 에 그대로 넘긴다 (매번 새 배열을 만들지 않게) */
export const ZOOM_MODIFIERS = [zoomModifier];

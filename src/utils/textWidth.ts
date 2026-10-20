/**
 * 입력칸 글자 폭 어림 (0.8rem 기준: 한글 13px, 그 밖 7.5px) + 여백 16px.
 * ponytail: 글꼴 측정 없이 글자 수로 어림. 칸이 글자보다 살짝 넓거나 좁을 수 있다
 */
export const estimateTextWidth = (text: string): number =>
  Math.round([...text].reduce((sum, ch) => sum + (/[ㄱ-ㅣ가-힣]/.test(ch) ? 13 : 7.5), 16));

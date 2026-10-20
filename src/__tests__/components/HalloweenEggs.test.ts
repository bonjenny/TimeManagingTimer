import { createKonamiDetector, konamiKey, nextSixAm, nightDimAt, HAUNTED_RE, isHalloweenDay, isOminousElapsed, KONAMI, HALLOWEEN_MENU_LABELS } from '../../components/HalloweenEggs';

describe('HalloweenEggs', () => {
  it('코나미 코드를 끝까지 치면 한 번 true', () => {
    const detect = createKonamiDetector();
    const results = KONAMI.map((k) => detect(k.length === 1 ? k.toUpperCase() : k));
    expect(results.slice(0, -1).every((r) => !r)).toBe(true);
    expect(results[results.length - 1]).toBe(true);
  });

  it('중간에 틀리면 처음부터, ↑ 로 틀리면 ↑ 하나는 친 것으로', () => {
    const detect = createKonamiDetector();
    ['ArrowUp', 'ArrowUp', 'ArrowUp'].forEach(detect); // ↑↑↑ 뒤에도 ↑↑↓↓… 로 이어진다
    const rest = ['ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b'].map(detect);
    expect(rest.some(Boolean)).toBe(false);
    expect(detect('a')).toBe(true);
    expect(detect('x')).toBe(false);
  });

  it('한글 입력 상태의 ㅠ·ㅁ 도 B·A 로 친다 (code 가 비어 와도)', () => {
    const detect = createKonamiDetector();
    const keys = [...KONAMI.slice(0, 8).map((k) => ({ key: k, code: k })), { key: 'ㅠ', code: '' }, { key: 'ㅁ', code: '' }];
    expect(keys.map((k) => detect(konamiKey(k))).pop()).toBe(true);
  });

  it('밤 어둡기: 21시부터 1시간에 걸쳐 22시에 35%, 새벽 6시에 끝', () => {
    const at = (h: number, m: number) => nightDimAt(new Date(2026, 9, 20, h, m));
    expect(at(20, 59)).toBe(0);
    expect(at(21, 0)).toBe(0);
    expect(at(21, 30)).toBeCloseTo(0.175);
    expect(at(22, 0)).toBeCloseTo(0.35);
    expect(at(3, 0)).toBeCloseTo(0.35);
    expect(at(6, 0)).toBe(0);
    expect(at(18, 0)).toBe(0);
  });

  it('불 켜기는 다음 새벽 6시까지', () => {
    expect(nextSixAm(new Date(2026, 9, 20, 22, 0))).toBe(new Date(2026, 9, 21, 6, 0).getTime());
    expect(nextSixAm(new Date(2026, 9, 21, 1, 30))).toBe(new Date(2026, 9, 21, 6, 0).getTime());
  });

  it('불길한 경과 시간', () => {
    expect(isOminousElapsed('00:04:44')).toBe(true);
    expect(isOminousElapsed('00:13:13')).toBe(true);
    expect(isOminousElapsed('04:44:44')).toBe(true);
    expect(isOminousElapsed('00:13:14')).toBe(false);
    expect(isOminousElapsed('00:00:04')).toBe(true); // 시작 4초
    expect(isOminousElapsed('00:00:05')).toBe(false);
  });

  it('10월 31일, 주말이면 앞 금요일도 할로윈', () => {
    // 2026-10-31 은 토요일 → 10/30(금)
    expect(isHalloweenDay(new Date(2026, 9, 30))).toBe(true);
    expect(isHalloweenDay(new Date(2026, 9, 31))).toBe(true);
    expect(isHalloweenDay(new Date(2026, 9, 29))).toBe(false);
    // 2027-10-31 은 일요일 → 10/29(금)
    expect(isHalloweenDay(new Date(2027, 9, 29))).toBe(true);
    expect(isHalloweenDay(new Date(2027, 9, 30))).toBe(false);
    // 2028-10-31 은 화요일 → 그날만
    expect(isHalloweenDay(new Date(2028, 9, 30))).toBe(false);
    expect(isHalloweenDay(new Date(2028, 9, 31))).toBe(true);
  });

  it('귀신 붙는 업무명 · 메뉴 말장난', () => {
    expect(HAUNTED_RE.test('유령 세션 정리')).toBe(true);
    expect(HAUNTED_RE.test('Ghost job')).toBe(true);
    expect(HAUNTED_RE.test('판매조회 개선')).toBe(false);
    expect(HALLOWEEN_MENU_LABELS['주간 일정']).toBe('죽어 일정');
    expect(HALLOWEEN_MENU_LABELS['프로젝트 분석']).toBe('프로젝트 부검');
  });
});

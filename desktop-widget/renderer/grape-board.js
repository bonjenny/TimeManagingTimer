// 야근 포도알판 계산 (순수 함수). 창(main)과 화면(renderer)이 같이 쓴다: Node 에선 require, 화면에선 window.GrapeBoard
// - 한 달이 한 판. 그달 근무일(주말 · 공휴일 뺀 날)마다 알 자리가 하나씩 있다 (2026년 11월 = 21알)
// - 자리는 날짜순으로 왼쪽 위부터. 야근한 날 그 자리에 스티커를 붙인다 (누르면 붙고 다시 누르면 떼진다)
// - 붙인 날짜는 dates(YYYY-MM-DD 배열) 하나로만 들고 있다
(function (root) {
  const END_OF_DAY = 18 * 60; // 야근 시간은 18:00 이후부터 센다
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthOf = (date) => date.slice(0, 7);

  /** month(YYYY-MM)의 근무일: 주말과 공휴일(holidays 의 키)을 뺀 날짜들 */
  function workdays(month, holidays = {}) {
    const [y, m] = month.split('-').map(Number);
    const days = [];
    for (let d = new Date(y, m - 1, 1); d.getMonth() === m - 1; d.setDate(d.getDate() + 1)) {
      const date = ymd(d);
      if (d.getDay() !== 0 && d.getDay() !== 6 && !holidays[date]) days.push(date);
    }
    return days;
  }

  /** 붙어 있으면 떼고, 없으면 붙인다 */
  function toggle(dates, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return dates;
    return dates.includes(date) ? dates.filter((d) => d !== date) : [...dates, date].sort();
  }

  /** 알 n개를 송이 모양 줄로 나눈다: 윗줄이 가장 넓고 한 알씩 줄어드는 역삼각형 (21 → 6·5·4·3·2·1). 남는 알은 맨 아래 한 줄 */
  function bunchRows(n) {
    let w = 1;
    while ((w * (w + 1)) / 2 < n) w++;
    const rows = [];
    let left = n;
    for (let size = w; left > 0; size--) {
      const take = left >= size ? size : left;
      rows.push(take);
      left -= take;
    }
    return rows;
  }

  const toMin = (hhmm) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };

  /** 기념 카드 숫자: 붙인 날짜별 출퇴근 · 야근 분, 총 야근, 가장 늦은 퇴근. 출퇴근 기록이 없는 날은 빈칸 */
  function stats(dates, clock = []) {
    const by_date = new Map(clock.map((c) => [c.date, c]));
    const rows = dates.map((date) => {
      const c = by_date.get(date) || {};
      const start = toMin(c.in);
      let end = toMin(c.out);
      if (end != null && start != null && end < start) end += 24 * 60; // 자정 넘어 퇴근
      return { date, in: c.in || '', out: c.out || '', end, over: end != null ? Math.max(0, end - END_OF_DAY) : null };
    });
    const known = rows.filter((r) => r.end != null);
    const latest = known.reduce((a, r) => (!a || r.end > a.end ? r : a), null);
    return {
      rows,
      total_over: known.reduce((sum, r) => sum + r.over, 0),
      latest: latest && { date: latest.date, out: latest.out },
      missing: rows.length - known.length,
    };
  }

  const api = { ymd, monthOf, workdays, toggle, bunchRows, stats };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GrapeBoard = api;

  // node renderer/grape-board.js 로 돌리는 확인
  if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    const assert = require('assert');
    const nov = workdays('2026-11');
    assert.strictEqual(nov.length, 21, '2026년 11월 근무일은 21일');
    assert.strictEqual(nov[0], '2026-11-02');
    assert.strictEqual(workdays('2026-12', { '2026-12-25': '성탄절' }).includes('2026-12-25'), false, '공휴일은 뺀다');
    assert.deepStrictEqual(toggle(['2026-11-03'], '2026-11-02'), ['2026-11-02', '2026-11-03']);
    assert.deepStrictEqual(toggle(['2026-11-02', '2026-11-03'], '2026-11-02'), ['2026-11-03']);
    assert.deepStrictEqual(bunchRows(21), [6, 5, 4, 3, 2, 1]);
    assert.deepStrictEqual(bunchRows(20), [6, 5, 4, 3, 2]);
    assert.deepStrictEqual(bunchRows(23), [7, 6, 5, 4, 1]);
    assert.strictEqual(bunchRows(18).reduce((a, b) => a + b, 0), 18);
    const st = stats(['2026-11-02', '2026-11-03', '2026-11-04'], [
      { date: '2026-11-02', in: '08:58', out: '22:22' },
      { date: '2026-11-03', in: '09:00', out: '01:10' },
    ]);
    assert.strictEqual(st.total_over, 22 * 60 + 22 - 1080 + (25 * 60 + 10 - 1080));
    assert.deepStrictEqual(st.latest, { date: '2026-11-03', out: '01:10' });
    assert.strictEqual(st.missing, 1);
    console.log('grape-board ok');
  }
})(typeof window !== 'undefined' ? window : globalThis);

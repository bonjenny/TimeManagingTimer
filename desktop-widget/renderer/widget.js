// 위젯 화면: 앱이 쓴 캘린더 스냅숏(timekeeper-calendar-widget.json)을 달력으로 그린다.
// Electron 밖(브라우저)에서 열면 window.tkDesktop 이 없어 예시 데이터로 그린다 (화면 확인용)
(() => {
  const bridge = window.tkDesktop;
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  let snapshot = null;
  let anchor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function render() {
    $('title').textContent = `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`;
    $('weekdays').innerHTML = DAYS.map((d, i) => `<div class="${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${d}</div>`).join('');
    const grid = $('grid');
    if (!snapshot) {
      grid.innerHTML = `<div class="empty">아직 캘린더 데이터가 없습니다.<br>
        TimeKeeper 설정 › 데이터 관리에서 「자동 백업 폴더」를 고른 뒤 앱을 한 번 열면 여기에 나타납니다.<br>
        위젯 ⋯ 메뉴에서 같은 폴더를 골라 주세요.</div>`;
      $('foot').textContent = '';
      return;
    }
    const by_date = new Map();
    const add = (date, item) => by_date.set(date, [...(by_date.get(date) || []), item]);
    snapshot.events.forEach((e) => add(e.date, e.holiday ? { kind: 'holiday-ev', text: e.text } : { kind: 'event', text: e.text, color: e.color }));
    (snapshot.attendance || []).forEach((a) => add(a.date, { kind: 'att', text: a.text }));

    const first = new Date(anchor);
    first.setDate(1 - first.getDay()); // 그 달 1일이 든 주의 일요일
    const weeks = Math.ceil((anchor.getDay() + new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()) / 7);
    grid.style.gridTemplateRows = `repeat(${weeks}, minmax(0, 1fr))`;
    const today = ymd(new Date());
    const cells = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      const key = ymd(d);
      const holiday = snapshot.holidays?.[key];
      const items = by_date.get(key) || [];
      const cls = ['cell', d.getDay() === 0 ? 'sun' : '', d.getDay() === 6 ? 'sat' : '', holiday ? 'holiday' : '',
        d.getMonth() !== anchor.getMonth() ? 'other' : '', snapshot.show_today && key === today ? 'today' : ''].filter(Boolean).join(' ');
      cells.push({ cls, d, holiday, items });
    }
    grid.innerHTML = cells
      .map(({ cls, d, holiday, items }) => {
        const chips = items
          .map((it) => `<span class="chip ${it.kind}"${it.kind === 'event' ? ` style="background:${esc(it.color || '#e0e0e0')}"` : ''} title="${esc(it.text)}">${esc(it.text)}</span>`)
          .join('');
        return `<div class="${cls}"><div class="day"><span class="num">${d.getDate()}</span>${holiday ? `<span class="hname">${esc(holiday)}</span>` : ''}</div>${chips}</div>`;
      })
      .join('');
    // 칸에 다 안 들어가는 칩은 「+N」 으로 줄인다
    grid.querySelectorAll('.cell').forEach((cell) => {
      const chips = [...cell.querySelectorAll('.chip')];
      let hidden = 0;
      while (chips.length && cell.scrollHeight > cell.clientHeight + 1) {
        chips.pop().remove();
        hidden++;
      }
      if (hidden) {
        const last = cell.querySelector('.chip:last-of-type');
        if (last && cell.scrollHeight + 14 > cell.clientHeight) { last.remove(); hidden++; }
        cell.insertAdjacentHTML('beforeend', `<div class="more">+${hidden}</div>`);
      }
    });
    const t = new Date(snapshot.updated_at);
    const src = snapshot.from_backup ? '자동 백업 기준 · ' : '';
    $('foot').innerHTML = `<span>TimeKeeper 캘린더</span><span>${src}갱신 ${t.getMonth() + 1}/${t.getDate()} ${pad(t.getHours())}:${pad(t.getMinutes())}</span>`;
  }

  function setTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('theme').textContent = dark ? '☀' : '🌙'; // 누르면 바뀔 쪽
  }

  function setOpacity(v) {
    document.documentElement.style.setProperty('--bg-alpha', String(v));
    $('opacity').value = String(Math.round(v * 100));
  }

  $('prev').onclick = () => { anchor = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1); render(); };
  $('next').onclick = () => { anchor = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1); render(); };
  $('today').onclick = () => { anchor = new Date(new Date().getFullYear(), new Date().getMonth(), 1); render(); };
  $('opacity').oninput = (e) => {
    const v = Number(e.target.value) / 100;
    setOpacity(v);
    bridge?.setOpacity(v);
  };
  $('menu').onclick = () => $('menuBox').classList.toggle('hidden');
  $('pickFolder').onclick = () => { $('menuBox').classList.add('hidden'); bridge?.pickFolder(); };
  $('openApp').onclick = () => { $('menuBox').classList.add('hidden'); bridge?.openApp(); };
  $('hide').onclick = () => bridge?.hide();
  // 브라우저(예시 화면)에서는 화면 안에서만 바꾼다
  $('theme').onclick = () => (bridge ? bridge.toggleTheme() : setTheme(document.documentElement.dataset.theme !== 'dark'));
  window.addEventListener('resize', () => render());
  // 자정이 지나면 오늘 칸을 옮긴다
  setInterval(render, 10 * 60 * 1000);

  if (bridge) {
    bridge.onState(({ snapshot: snap, settings }) => {
      snapshot = snap;
      setOpacity(settings.opacity);
      setTheme(settings.dark);
      render();
    });
  } else {
    // 브라우저에서 열었을 때 화면 확인용 예시
    const t = new Date();
    const d = (n) => ymd(new Date(t.getFullYear(), t.getMonth(), n));
    snapshot = {
      version: 1, updated_at: Date.now(), show_today: true,
      events: [
        { date: d(3), text: '브라우저 PDF 스테이지', color: '#f8bbd0' },
        { date: d(4), text: '브라우저 PDF 수시', color: '#f8bbd0' },
        { date: d(4), text: '5.6 로그인 Flexion 수시', color: '#b2dfdb' },
        { date: d(10), text: 'ES2022 미지원 알럿 수시', color: '#fff59d' },
        { date: d(12), text: 'global_error_sync 스테이지', color: '#ffccbc' },
        { date: d(12), text: '[5.6] 모델없는 DMC 카나리', color: '#b2ebf2' },
        { date: d(12), text: 'deploy flag 테스트요청', color: '#fff59d' },
        { date: d(12), text: 'ECFetch 로그 안남게 수시', color: '#d1c4e9' },
      ],
      attendance: [{ date: d(6), text: '이용희 오후반차' }, { date: d(18), text: '엄지희 연차' }],
      holidays: {},
    };
    setOpacity(0.55);
    setTheme(!window.matchMedia('(prefers-color-scheme: light)').matches);
    render();
  }
})();

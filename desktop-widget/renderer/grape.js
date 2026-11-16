// 야근 포도알판 화면. 한 달이 한 송이: 그달 근무일마다 알 자리가 있고, 자리를 누르면 스티커가 붙거나 떼진다.
// 붙인 날짜는 main(grape-main.js)이 저장하고, 근무일 · 송이 모양 · 숫자 계산은 grape-board.js 를 쓴다.
// Electron 밖(브라우저)에서 열면 window.tkDesktop 이 없어 화면 안에서만 붙였다 뗀다 (화면 확인용. ?card 를 붙이면 기념 카드)
(() => {
  const $ = (id) => document.getElementById(id);
  const G = window.GrapeBoard;
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const md = (date) => {
    const d = new Date(`${date}T00:00:00`);
    return `${d.getMonth() + 1}/${d.getDate()} (${DAYS[d.getDay()]})`;
  };
  const dur = (min) => (min >= 60 ? `${Math.floor(min / 60)}시간 ${min % 60 ? `${min % 60}분` : ''}`.trim() : `${min}분`);
  const today = () => G.ymd(new Date());
  const shiftMonth = (month, by) => {
    const [y, m] = month.split('-').map(Number);
    return G.ymd(new Date(y, m - 1 + by, 1)).slice(0, 7);
  };

  let board = null; // { dates, holidays, pinned, mode }
  let clock = new Map(); // 날짜 → { in, out } (캘린더 스냅숏)
  let view = G.monthOf(today()); // 보고 있는 달 (YYYY-MM)
  let just_stuck = ''; // 방금 붙인 날짜 (붙는 애니메이션을 한 번만)

  // 레트로 · 심플: 크림 종이에 남색 · 빨강, 포도알만 보랏빛 테. 그러데이션 · 그늘 없이 납작한 도형만 쓴다
  const INK = '#1d3461';
  const PAPER = '#f0e5c9';
  const RED = '#d8432e';
  const RIM = '#9a6bb1'; // 포도알 테 (보랏빛)

  // 포도잎 (꼭지가 0,0, 오른쪽으로 뻗는다): 남색 톱니 잎 + 크림색으로 파낸 잎맥
  const LEAF =
    'M0 0 L6 -14 L2 -26 L14 -24 L16 -38 L28 -34 L34 -50 L44 -40 L54 -46 L58 -34 L72 -38 L74 -24 L90 -22 L84 -10 L100 -2 L86 6 L92 18 L76 18 L76 32 L62 26 L56 42 L46 30 L34 38 L32 24 L18 30 L18 16 L4 18 L8 6Z';
  const VEINS =
    'M5 0 L92 -2 M14 -3 L33 -42 M16 3 L52 34 M44 -3 L82 -20 M48 1 L84 14 M22 -18 L12 -22 M27 -27 L40 -30 M62 -11 L64 -28 M70 -14 L80 -12 M28 13 L22 22 M38 22 L50 20 M64 7 L70 18 M72 10 L82 8';
  const leaf = (transform) => `<g transform="${transform}"><path d="${LEAF}" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${VEINS}" stroke="${PAPER}" stroke-width="1.7" stroke-linecap="round" fill="none"/></g>`;
  const LEAVES = leaf('translate(141 84) scale(-1.05 1.05) rotate(-12)') + leaf('translate(159 84) scale(1.05) rotate(-12)');

  const starPath = (x, y, r) =>
    'M' +
    Array.from({ length: 10 }, (_, k) => {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.45 : r;
      return `${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`;
    }).join(' L') +
    'Z';
  const polar = (x, y, r, deg) => `${(x + Math.cos((deg * Math.PI) / 180) * r).toFixed(1)} ${(y + Math.sin((deg * Math.PI) / 180) * r).toFixed(1)}`;

  /**
   * 한 달 송이. days: 근무일 날짜들 (왼쪽 위부터 날짜순), stuck: 스티커 붙은 날짜 Set.
   * card 면 기념 카드용 (날짜 숫자 없이 햇살 · 별), 아니면 판 (자리마다 흐린 날짜 숫자, 오늘은 빨간 테, 아직 안 온 날은 더 흐리게)
   */
  function bunchSvg(days, stuck, { card = false } = {}) {
    const rows = G.bunchRows(days.length);
    const gap = Math.min(40, 262 / rows[0]); // 알 사이 간격 (윗줄이 넓으면 알을 줄인다)
    const R = gap * 0.475;
    const step = gap * 0.86;
    const now = today();
    let i = 0;
    const slots = rows.flatMap((n, row) => Array.from({ length: n }, (_, k) => ({ date: days[i++], x: 150 - ((n - 1) * gap) / 2 + k * gap, y: 106 + row * step })));
    const bottom = 106 + (rows.length - 1) * step + R;
    const mid = (106 - R + bottom) / 2;
    const grapes = slots.map((s, idx) => {
      const day = Number(s.date.slice(8));
      const is_today = s.date === now;
      const future = s.date > now;
      const c = clock.get(s.date);
      const tip = `${md(s.date)}${c?.in || c?.out ? ` · 출근 ${c.in || '–'} · 퇴근 ${c.out || '–'}` : ''}`;
      const ring = card
        ? `<circle cx="${s.x}" cy="${s.y}" r="${R - 1}" fill="${PAPER}" stroke="${INK}" stroke-width="1.3" stroke-opacity=".28"/>`
        : `<circle class="empty" cx="${s.x}" cy="${s.y}" r="${is_today ? R - 1.5 : R - 1}" fill="${PAPER}" stroke="${is_today ? RED : INK}"
            stroke-width="${is_today ? 3 : 1.4}" stroke-opacity="${is_today ? 1 : future ? 0.14 : 0.3}"/>
          <text x="${s.x}" y="${s.y + R * 0.24}" text-anchor="middle" font-size="${(R * 0.72).toFixed(1)}" font-weight="700"
            fill="${is_today ? RED : INK}" fill-opacity="${is_today ? 0.85 : future ? 0.16 : 0.34}">${day}</text>`;
      const anim = card ? ` style="animation-delay:${idx * 50}ms"` : '';
      const sticker = stuck.has(s.date)
        ? `<g class="fill${s.date === just_stuck ? ' stick' : ''}"${anim}>
            <circle cx="${s.x}" cy="${s.y}" r="${R}" fill="${RIM}"/>
            <circle cx="${s.x - 0.8}" cy="${s.y - 0.8}" r="${(R * 0.81).toFixed(1)}" fill="${INK}"/>
            <ellipse cx="${s.x - R * 0.32}" cy="${s.y - R * 0.37}" rx="${(R * 0.19).toFixed(1)}" ry="${(R * 0.12).toFixed(1)}"
              transform="rotate(-35 ${s.x - R * 0.32} ${s.y - R * 0.37})" fill="${PAPER}"/>
            <path class="curl" d="M${polar(s.x, s.y, R, 185)} A${R} ${R} 0 0 1 ${polar(s.x, s.y, R, 265)}Z" fill="#fbf5e6"/></g>`
        : '';
      return `<g class="slot${future ? ' future' : ''}" data-date="${s.date}"><title>${tip}</title>${ring}${sticker}</g>`;
    });
    // 기념 카드: 송이 둘레로 빨간 햇살 + 별
    const rays = card
      ? Array.from({ length: 20 }, (_, k) => {
          const a = (k / 20) * Math.PI * 2 + 0.16;
          const [r1, r2] = k % 2 ? [128, 138] : [124, 146];
          return `<line x1="${(150 + Math.cos(a) * r1).toFixed(1)}" y1="${(mid + Math.sin(a) * r1 * 0.9).toFixed(1)}" x2="${(150 + Math.cos(a) * r2).toFixed(1)}" y2="${(mid + Math.sin(a) * r2 * 0.9).toFixed(1)}" stroke="${RED}" stroke-width="${k % 2 ? 2 : 3}" stroke-linecap="round"/>`;
        }).join('') + [[20, mid - 60, 7], [280, mid - 68, 6], [28, mid + 66, 6], [274, mid + 62, 7]].map(([x, y, r]) => `<path d="${starPath(x, y, r)}" fill="${RED}"/>`).join('')
      : '';
    return `<svg viewBox="0 0 300 ${Math.max(300, Math.ceil(bottom + 14))}" xmlns="http://www.w3.org/2000/svg" font-family="Malgun Gothic, sans-serif">
      ${rays}
      ${LEAVES}
      <path d="M150 96 C149 76 147 58 152 38" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M152 42 C160 20 186 16 191 32 C195 45 180 52 174 42 C170 35 176 28 183 31" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      ${grapes.join('')}</svg>`;
  }

  // 종이결: 아주 고운 알갱이 + 가장자리만 살짝 바램. 한 번 그리는 정적 그림이라 성능 부담 없음
  const paperSvg = (id) => `<svg class="paper" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <filter id="${id}grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="3"/>
      <feColorMatrix type="matrix" values="0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .15  .8 0 0 0 -.34"/></filter>
    <radialGradient id="${id}fade" cx="50%" cy="50%" r="75%"><stop offset=".7" stop-color="#8a6a3a" stop-opacity="0"/><stop offset="1" stop-color="#8a6a3a" stop-opacity=".16"/></radialGradient>
    <rect width="100%" height="100%" filter="url(#${id}grain)" opacity=".4"/>
    <rect width="100%" height="100%" fill="url(#${id}fade)"/></svg>`;
  $('board').insertAdjacentHTML('beforeend', paperSvg('pb'));

  // 보고 있는 달의 근무일 · 붙은 날
  const monthData = (month) => {
    const days = G.workdays(month, board?.holidays || {});
    const stuck = new Set((board?.dates || []).filter((d) => G.monthOf(d) === month));
    return { days, stuck };
  };
  const isFull = (month) => {
    const { days, stuck } = monthData(month);
    return days.length > 0 && stuck.size === days.length;
  };
  const monthLabel = (month) => {
    const [y, m] = month.split('-').map(Number);
    return y === new Date().getFullYear() ? `${m}월` : `${y}년 ${m}월`;
  };

  function renderBoard() {
    if (!board) return;
    const { days, stuck } = monthData(view);
    const now = today();
    const this_month = G.monthOf(now);
    $('monthTitle').textContent = `${monthLabel(view)} 포도알판`;
    $('nextMonth').disabled = view >= this_month;
    $('bunch').innerHTML = bunchSvg(days, stuck);
    just_stuck = '';
    $('num').textContent = String(stuck.size);
    $('goal').textContent = `/ ${days.length}알`;
    $('bar').style.width = `${days.length ? (stuck.size / days.length) * 100 : 0}%`;
    $('left').textContent = '';
    const cur = monthData(this_month);
    $('miniCount').textContent = `${cur.stuck.size} / ${cur.days.length}`;
    const btn = $('today');
    btn.disabled = false;
    if (view !== this_month) btn.textContent = '이번 달로';
    else if (!days.includes(now)) {
      btn.textContent = '오늘은 쉬는 날';
      btn.disabled = true;
    } else btn.textContent = stuck.has(now) ? '오늘 포도알 떼기' : '+ 오늘 포도알 붙이기';
    showInfo();
    $('pin').classList.toggle('off', !board.pinned);
    $('board').classList.toggle('hidden', board.mode !== 'board');
    $('mini').classList.toggle('hidden', board.mode !== 'collapsed');
    $('cardView').classList.toggle('hidden', board.mode !== 'card');
  }

  const flash = (text) => {
    $('left').textContent = text;
    setTimeout(() => ($('left').textContent = ''), 2000);
  };

  // 출퇴근 한 줄: 알에 마우스를 올리면 그날, 아니면 오늘. 출퇴근은 TimeKeeper 가 ERP 세션을 쓸 때 받아 스냅숏에 넣어 준다
  function showInfo(date) {
    const now = today();
    const d = date || now;
    const c = clock.get(d);
    const label = d === now ? '오늘' : md(d);
    let html;
    if (c?.in || c?.out) html = `${label} 출근 <b>${c.in || '–'}</b>${c.out ? ` · 퇴근 <b>${c.out}</b>` : d === now ? ' · 아직 근무 중' : ''}`;
    else if (!clock.size) html = '출퇴근 기록은 TimeKeeper 에서 ERP 세션을 쓰면 채워져요';
    else html = d > now ? '' : `${label} 출퇴근 기록 없음`;
    $('info').innerHTML = html;
  }
  $('bunch').addEventListener('mouseover', (e) => {
    const slot = e.target.closest('.slot');
    if (slot) showInfo(slot.dataset.date);
  });
  $('bunch').addEventListener('mouseleave', () => showInfo());

  // 붙이기: 바로 저장하고 다시 그릴 때 그 알만 꾹 눌러 붙는다. 떼기: 모서리부터 들려 떼어진 다음 저장
  function toggleDate(date) {
    if (!board) return;
    if (date > today()) return flash('아직 오지 않은 날이에요');
    const sticker = $('bunch').querySelector(`.slot[data-date="${date}"] .fill`);
    if (sticker) {
      if (sticker.classList.contains('peel')) return; // 떼는 중
      sticker.classList.add('peel');
      setTimeout(() => api.toggle(date), 300);
    } else {
      just_stuck = date;
      api.toggle(date);
    }
  }
  $('bunch').addEventListener('click', (e) => {
    const slot = e.target.closest('.slot');
    if (slot) toggleDate(slot.dataset.date);
  });
  $('today').onclick = () => {
    const this_month = G.monthOf(today());
    if (view !== this_month) {
      view = this_month;
      renderBoard();
    } else toggleDate(today());
  };
  $('prevMonth').onclick = () => {
    view = shiftMonth(view, -1);
    renderBoard();
  };
  $('nextMonth').onclick = () => {
    view = shiftMonth(view, 1);
    renderBoard();
  };
  $('pin').onclick = () => api.pin();
  $('fold').onclick = () => api.mode('collapsed');
  $('unfold').onclick = () => api.mode('board');
  $('close').onclick = () => api.hide();
  $('trophy').onclick = () => api.mode('card');

  // ── 기념 카드: 보고 있는 달의 결과 ──
  const BADGE = `<div class="badge"><svg viewBox="0 0 30 30"><path d="${starPath(15, 16, 12)}" fill="${PAPER}"/></svg></div>`;
  function renderCard() {
    const { days, stuck } = monthData(view);
    const n = stuck.size;
    const full = n > 0 && n === days.length;
    const st = G.stats([...stuck].sort(), [...clock.values()]);
    const [y, m] = view.split('-').map(Number);
    const big = full ? '한 송이 완성!' : n === 0 ? '한 알도 없어요!' : `${n}알 모았어요!`;
    const [head, sub] = full
      ? ['수고 많았어요!', '회사에서 포도 한 송이를 다 채웠어요']
      : n === 0
        ? ['야근 없는 한 달!', '이게 진짜 완성이에요']
        : n * 2 >= days.length
          ? ['고생 많았어요!', '절반 넘게 채웠어요. 다음 달은 가볍게']
          : ['잘 버텼어요!', '다음 달도 포도알은 조금만'];
    const known = st.rows.length - st.missing;
    const sum = [`근무일 ${days.length}일 중 야근 <b>${n}번</b>`, known ? `18시 이후 <b>${dur(st.total_over)}</b>` : '', st.latest ? `가장 늦은 퇴근 <b>${st.latest.out}</b>` : '']
      .filter(Boolean)
      .join(' · ');
    const rows = st.rows
      .map((r) => `<div class="day"><span>${md(r.date)}</span><span>${r.in || r.out ? `${r.in || '–'} ~ ${r.out || '–'}` : '기록 없음'}</span></div>`)
      .join('');
    $('card').className = 'card fresh';
    $('card').innerHTML = `${paperSvg('pc')}<div class="frame">
      <div class="top">${BADGE}<div class="ttl"><small>${y}년 ${m}월 야근 포도알</small><b>${big}</b></div>${BADGE}</div>
      <div class="art">${bunchSvg(days, stuck, { card: true })}</div>
      <div class="msg"><b>${head}</b><span>${sub}</span></div>
      <hr>
      <div class="sum">${sum}</div>
      ${rows ? `<div class="days">${rows}</div>` : ''}
      <div class="foot"><span>TimeKeeper</span><span>${today().replace(/-/g, '. ')}.</span></div>
    </div>`;
  }
  const toast = (text) => {
    $('toast').textContent = text;
    $('toast').classList.remove('hidden');
    setTimeout(() => $('toast').classList.add('hidden'), 1800);
  };
  const capture = async (action) => {
    const r = $('card').getBoundingClientRect();
    try {
      const ok = await api.capture({ x: r.x, y: r.y, width: r.width, height: r.height }, action, `야근포도알-${view}`);
      if (ok && action !== 'copy') toast('저장했어요'); // 복사는 조용히 (실패할 때만 알린다)
    } catch {
      toast(action === 'copy' ? '복사하지 못했어요. PNG 저장을 써 주세요' : '저장하지 못했어요');
    }
  };
  $('savePng').onclick = () => capture('save');
  $('copyPng').onclick = () => capture('copy');
  $('cardClose').onclick = () => api.mode('board');

  // 판이 바뀌면 다시 그린다. 카드를 막 열었으면 카드를 그리고, 그달 근무일을 방금 다 채웠으면 기념 카드를 띄운다
  function onBoard(b) {
    const was_full = board && isFull(view);
    const was_card = board?.mode === 'card';
    const stuck_now = just_stuck;
    board = b;
    renderBoard();
    if (b.mode === 'card' && !was_card) renderCard();
    if (stuck_now && !was_full && isFull(view) && b.mode === 'board') setTimeout(() => api.mode('card'), 700);
  }

  // Electron 밖(브라우저)에서는 화면 안에서만 붙였다 뗀다
  const real = window.tkDesktop?.grape;
  const fake = {
    toggle: (date) => onBoard({ ...board, dates: G.toggle(board.dates, date) }),
    mode: (mode) => onBoard({ ...board, mode }),
    pin: () => onBoard({ ...board, pinned: !board.pinned }),
    hide: () => {},
    capture: async () => false,
  };
  const api = real || fake;

  if (real) {
    real.onBoard(onBoard);
    // 출퇴근이 바뀌었을 때만 다시 그린다 (판을 누를 때마다 같이 오는 알림에 다시 그리면 붙는 애니메이션이 끊긴다)
    let clock_key = '';
    window.tkDesktop.onState(({ snapshot }) => {
      const key = JSON.stringify(snapshot?.clock || []);
      if (key === clock_key) return;
      clock_key = key;
      clock = new Map((snapshot?.clock || []).map((c) => [c.date, c]));
      if (board) renderBoard();
    });
  } else {
    const month = G.monthOf(today());
    const past = G.workdays(month).filter((d) => d < today());
    const dates = past.filter((_, i) => i % 3 !== 1);
    clock = new Map(dates.map((d, i) => [d, { date: d, in: '08:5' + (i % 10), out: `${19 + (i % 5)}:${String((i * 7) % 60).padStart(2, '0')}` }]));
    onBoard({ dates, holidays: {}, pinned: true, mode: location.search.includes('card') ? 'card' : 'board' });
  }
})();

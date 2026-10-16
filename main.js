/* INSCIENCE — головна: спрайт іконок, скрол-сцени, фільтр, копіювання, фігури у футері */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const range = (p, a, b) => clamp((p - a) / (b - a));   // відрізок [a, b] прогресу → 0…1
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Спрайт іконок брендбуку ---------- */
  const ICONS = ['eye', 'flower', 'arrows', 'heart', 'star', 'clover', 'hash', 'drop',
    'circle', 'ring', 'burst', 'infinity', 'planet', 'molecule'];
  const NS = 'http://www.w3.org/2000/svg';
  const sprite = document.createElementNS(NS, 'svg');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  document.body.prepend(sprite);

  const spriteReady = Promise.all(ICONS.map(name => fetch(`assets/icons/${name}.svg`).then(r => r.text()).then(txt => {
    const doc = new DOMParser().parseFromString(txt, 'image/svg+xml').documentElement;
    const sym = document.createElementNS(NS, 'symbol');
    sym.id = `i-${name}`;
    sym.setAttribute('viewBox', doc.getAttribute('viewBox'));
    sym.innerHTML = doc.innerHTML
      .replace(/fill="black"/g, 'fill="currentColor"')
      .replace(/fill="white"/g, 'style="fill:var(--hole,#fff)"')
      .replace(/id="([^"]+)"/g, `id="${name}-$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${name}-$1)`);
    sprite.appendChild(sym);
  }))).catch(err => console.warn('icons', err));

  // Силует кожної форми для фізики (футер, «Про нас»): точки контуру → опукла оболонка (в одиницях viewBox).
  // Рахуємо один раз, коли спрайт готовий
  let outlinesMemo = null;
  const getOutlines = () => {
    if (outlinesMemo) return outlinesMemo;
    const { Vertices } = Matter;
    const probe = document.createElementNS(NS, 'svg');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden';
    document.body.appendChild(probe);
    const outlines = {};
    ICONS.forEach(name => {
      const sym = document.getElementById(`i-${name}`);
      if (!sym) return;
      const [vx, vy, vw, vh] = sym.getAttribute('viewBox').split(/[\s,]+/).map(Number);
      probe.setAttribute('width', vw); probe.setAttribute('height', vh);
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = sym.innerHTML;
      probe.appendChild(g);
      const els = $$('path, circle, ellipse, rect, polygon', g).filter(el =>
        !el.closest('clipPath, defs, mask') && el.getAttribute('fill') !== 'none' && !el.hasAttribute('style'));
      const lens = els.map(el => el.getTotalLength());
      const total = lens.reduce((a, b) => a + b, 0) || 1;
      const pts = [];
      els.forEach((el, k) => {
        const m = el.getCTM(), n = Math.max(12, Math.round(lens[k] / total * 120));
        for (let i = 0; i < n; i++) {
          const p = el.getPointAtLength(lens[k] * i / n).matrixTransform(m);
          pts.push({ x: p.x - vx, y: p.y - vy });
        }
      });
      g.remove();
      if (pts.length >= 3) outlines[name] = { w: vw, h: vh, hull: Vertices.hull(pts) };
    });
    probe.remove();
    return (outlinesMemo = outlines);
  };

  /* ---------- 2. Іконка в логотипі: один цикл око → квітка → стрілки → серце → око і стоп (WCAG 2.2.2) ---------- */
  const heroIcons = $$('.hero__ico');
  let heroIdx = 0, heroLeft = 0, heroTimer = 0, heroHp = 0;
  const heroStep = () => {
    // поки hero скролять — пауза
    if (heroHp > .05) { heroTimer = setTimeout(heroStep, 400); return; }
    const cur = heroIcons[heroIdx];
    cur.classList.remove('is-on'); cur.classList.add('is-out');
    setTimeout(() => cur.classList.remove('is-out'), 700);
    heroIdx = (heroIdx + 1) % heroIcons.length;
    heroIcons[heroIdx].classList.add('is-on');
    heroTimer = --heroLeft > 0 ? setTimeout(heroStep, 1700) : 0;
  };
  // ще один цикл — на наведення на лого
  const heroCycle = (delay = 1700) => {
    if (reduce || heroTimer) return;
    heroLeft = heroIcons.length;
    heroTimer = setTimeout(heroStep, delay);
  };
  heroCycle();
  $('.hero__logo').addEventListener('mouseenter', () => heroCycle(250));

  // «Робимо науку видимою» — по висоті блоку «текст + кнопки» (у дві колонки; на мобільному гасло над текстом — розмір з CSS)
  const heroClaim = $('.hero__claim'), heroIntro = $('.hero__intro');
  const twoCols = matchMedia('(min-width: 761px)');
  const fitClaim = () => {
    heroClaim.style.removeProperty('--claim-fs');
    if (!twoCols.matches) return;
    const H = heroIntro.getBoundingClientRect().height;
    for (let i = 0; i < 2; i++) {   // висота гасла пропорційна кеглю — другий прохід лише уточнює
      const fs = parseFloat(getComputedStyle(heroClaim).fontSize);
      heroClaim.style.setProperty('--claim-fs', `${(fs * H / heroClaim.getBoundingClientRect().height).toFixed(2)}px`);
    }
  };
  new ResizeObserver(fitClaim).observe(heroIntro);
  document.fonts.ready.then(fitClaim);

  /* ---------- 3. Рядки тексту для появи з маски ---------- */
  // [data-ln] — джерело рядків: за <br> — рядок на відрізок; "measure" — абзац міряємо й ділимо на рядки
  // (розбита копія aria-hidden, цілий текст — для скрінрідера); "kids" — рядок на кожну дочірню частину;
  // посилання й кнопки — цілим рядком ззовні. Індекс рядка (--ln) наскрізний у межах свого .reveal: крок 75 мс
  const mk = (tag, cls) => Object.assign(document.createElement(tag), { className: cls });
  const lineOf = (nodes, cls = 'ln') => {
    const ln = mk('span', cls);
    ln.appendChild(mk('span', 'ln__i')).append(...nodes);
    return ln;
  };
  const lnCount = new Map();   // .reveal → скільки рядків у ньому вже є
  const lnIndex = el => {
    const root = el.closest('.reveal') || el, i = lnCount.get(root) || 0;
    lnCount.set(root, i + 1);
    return i;
  };
  const withLn = (ln, i) => { ln.style.setProperty('--ln', i); return ln; };
  // абзац без <br>: слова в рядок → де браузер переносить, там і межа рядка; перебудова — лише коли змінилась ширина
  const measureLines = el => {
    if (!el._vis) {
      el._text = el.textContent.replace(/\s+/g, ' ').trim();
      el._vis = mk('span', '');
      el._vis.setAttribute('aria-hidden', 'true');
      el.replaceChildren(Object.assign(mk('span', 'sr-only'), { textContent: el._text }), el._vis);
      el._w = -1;
    }
    const w = el.clientWidth;
    if (w === el._w) return;
    el._w = w;
    const words = el._text.split(' ').map(t => Object.assign(document.createElement('span'), { textContent: t }));
    el._vis.replaceChildren(...words.flatMap((s, i) => i ? [' ', s] : [s]));
    const lines = [];
    let top = -1e9;
    words.forEach(s => { if (s.offsetTop > top + 2) { lines.push([]); top = s.offsetTop; } lines.at(-1).push(s.textContent); });
    if (el._ln0 == null) { el._ln0 = lnIndex(el); for (let k = 1; k < lines.length; k++) lnIndex(el); }
    el._vis.replaceChildren(...lines.map((l, k) => withLn(lineOf([l.join(' ')], 'ln ln--m'), el._ln0 + k)));
  };
  // ручні розбивки: <br class="br-d"> — лише на desktop, <br class="br-m"> — лише на мобільному (перед ним — пробіл,
  // щоб без розриву слова не злиплися); на межі 760 px рядки перебудовуються, індекси — ті самі
  const brLines = el => {
    const off = twoCols.matches ? 'br-m' : 'br-d', groups = [[]];
    el._src.forEach(n => (n.nodeName !== 'BR' ? groups.at(-1).push(n) : n.classList.contains(off) || groups.push([])));
    const lines = groups.filter(g => g.some(n => n.nodeType === 1 || n.textContent.trim()));
    el.replaceChildren(...lines.map((g, k) => withLn(lineOf(g), el._ln0 + k)));
  };
  const brSplit = [];
  $$('[data-ln]').forEach(el => {
    const mode = el.dataset.ln;
    if (mode === 'measure') {
      measureLines(el);
      new ResizeObserver(() => measureLines(el)).observe(el);
      document.fonts?.ready.then(() => { el._w = -1; measureLines(el); });
    } else if (mode === 'kids') {
      [...el.children].forEach(c => c.replaceChildren(withLn(lineOf([...c.childNodes]), lnIndex(el))));
    } else if (el.matches('a, button')) {
      const ln = withLn(lineOf([]), lnIndex(el));
      el.before(ln);
      ln.firstChild.append(el);
    } else {
      el._src = [...el.childNodes];
      el._ln0 = lnIndex(el);   // рядків резервуємо стільки, скільки в довшому з двох варіантів
      const n = cls => el._src.filter(c => c.nodeName === 'BR' && !c.classList.contains(cls)).length;
      for (let k = Math.max(n('br-m'), n('br-d')); k > 0; k--) lnIndex(el);
      if (el._src.some(c => c.nodeName === 'BR' && c.className)) brSplit.push(el);
      brLines(el);
    }
  });
  twoCols.addEventListener('change', () => brSplit.forEach(brLines));

  /* ---------- 4. Поява при скролі: .reveal → .in (рядки з маски, картки й форми .pop — як у футері) ---------- */
  // форми й картки йдуть по черзі (крок 70 мс), якщо порядок не задано в розмітці (--i на самій формі чи на її картці).
  // Елемент треку зі snap не масштабуємо — scale зсуває точки прилипання; у новинах зʼявляються частини картки
  $$('.reveal').forEach(root => $$('.pop', root).forEach((el, i) => { if (!getComputedStyle(el).getPropertyValue('--i')) el.style.setProperty('--i', i); }));
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .18, rootMargin: '0px 0px -8% 0px' });
  // [data-manual] — тригер у скрол-циклі («Підтримати»: текст — коли синє коло вже під ним)
  $$('.reveal:not([data-manual])').forEach(el => reduce ? el.classList.add('in') : io.observe(el));
  // Прийшли якорем, з меню чи фокусом — вміст секції вже на місці, без «порожнього» кадру
  const revealNow = scope => {
    [scope, ...$$('.reveal', scope)].filter(el => el.matches('.reveal:not(.in)')).forEach(el => {
      if (el.hasAttribute('data-manual')) { el.dataset.instant = ''; return; }
      el.classList.add('in', 'is-instant');
      io.unobserve(el);
    });
  };
  const revealHash = hash => {
    const t = hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (t) revealNow(t.closest('section, footer') || t);
  };
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (a) revealHash(a.getAttribute('href')); });
  addEventListener('hashchange', () => revealHash(location.hash));
  if (location.hash) revealHash(location.hash);
  document.addEventListener('focusin', e => { const r = e.target.closest?.('.reveal:not(.in)'); if (r) revealNow(r); });

  /* ---------- 5. Напрямки: лічильники проєктів ---------- */
  const cards = $$('.pcard');
  const plural = n => n === 1 ? 'проєкт' : (n >= 2 && n <= 4 ? 'проєкти' : 'проєктів');
  // лічильник уже є в HTML; тут лише звіряємо з картками
  $$('.dir').forEach(d => {
    const n = cards.filter(c => c.dataset.dirs.split(' ').includes(d.dataset.dir)).length;
    $('[data-count]', d).textContent = `${n} ${plural(n)}`;
  });

  // Кола-патерни брендбуку 2.3: інлайн SVG, частини згруповані для ритму на hover (CSS-класи pat-*)
  const PC = 191.5;   // центр кола у viewBox 0 0 383 383
  const svgEl = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };
  // GRID — смуги довші за коло: кожна колонка (верх + низ) окремою групою, парні й непарні — назустріч
  const groupGrid = svg => {
    const cols = new Map();
    $$('path', svg).forEach(p => {
      const x = parseFloat(p.getAttribute('d').slice(1));
      const k = Math.round(x / 54.94);
      if (!cols.has(k)) cols.set(k, svgEl('g', { class: `pat-col${k & 1 ? ' pat-col--odd' : ''}` }));
      cols.get(k).appendChild(p);
    });
    const root = $('g', svg);
    [...cols.keys()].sort((a, b) => a - b).forEach(k => root.appendChild(cols.get(k)));
  };
  // INTERSECTION — кільця з 45°-секторів; кільце визначаємо за відстанню центру сектора від центру кола
  const groupIntersection = svg => {
    const root = $('g', svg), rings = [0, 1, 2, 3].map(i => svgEl('g', { class: `pat-ring${i & 1 ? ' pat-ring--odd' : ''}` }));
    $$('path', root).forEach(p => {
      const b = p.getBBox(), d = Math.hypot(b.x + b.width / 2 - PC, b.y + b.height / 2 - PC);
      rings[d > 130 ? 0 : d > 75 ? 1 : d > 22 ? 2 : 3].appendChild(p);
    });
    rings.forEach(r => root.appendChild(r));
  };
  // DENSITY — чотири концентричні форми; три внутрішні «дихають» зі зсувом фази
  const groupDensity = svg => {
    $$('path', svg).forEach((p, i) => {
      if (!i) return;
      const g = svgEl('g', { class: 'pat-beat' });
      g.style.setProperty('--k', i);
      g.style.setProperty('--to', [0, .95, 1.07, 1.22][i]);
      p.replaceWith(g); g.appendChild(p);
    });
  };
  // FLOW — будуємо заново з тих самих кривих (смуга 54.93, S-хвиля 108.68 × 19.03), але з запасом угору й униз,
  // щоб хвилі текли безшовно. Права половина — ліва, повернута на 180° навколо центру (як у брендбуку)
  const buildFlow = () => {
    const H = 54.934, W = 108.68, A = 19.035, X0 = 28.42 - W, Y0 = 255.896;
    const COL = ['#054FF0', '#FF3666'];
    const wave = (y, rev) => {   // межа смуги: ланцюжок S-кривих від X0 до X0 + 3W
      const pts = [];
      for (let i = 0; i <= 3; i++) pts.push([X0 + i * W, y - (i & 1 ? 0 : A)]);
      if (rev) pts.reverse();
      let d = `${rev ? 'L' : 'M'}${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [xa, ya] = pts[i - 1], [xb, yb] = pts[i], xm = (xa + xb) / 2;
        d += `C${xm} ${ya} ${xm} ${yb} ${xb} ${yb}`;
      }
      return d;
    };
    const half = () => {
      const g = svgEl('g', { class: 'pat-flow' });
      for (let k = -9; k <= 5; k++) g.appendChild(svgEl('path', { d: `${wave(Y0 + k * H)}${wave(Y0 + (k + 1) * H, true)}Z`, fill: COL[k & 1] }));
      return g;
    };
    const svg = svgEl('svg', { viewBox: '0 0 383 383', class: 'dir__pat' });
    const defs = svgEl('defs');
    const clip = svgEl('clipPath', { id: 'pat-flow-half' });
    clip.appendChild(svgEl('rect', { x: -1, y: -1, width: PC + 1, height: 385 }));
    defs.appendChild(clip);
    svg.appendChild(defs);
    const L = svgEl('g', { 'clip-path': 'url(#pat-flow-half)' }), R = svgEl('g', { transform: `rotate(180 ${PC} ${PC})` });
    L.appendChild(half());
    R.appendChild(svgEl('g', { 'clip-path': 'url(#pat-flow-half)' })).appendChild(half());
    svg.append(L, R);
    return svg;
  };
  const PATTERN_GROUP = { grid: groupGrid, intersection: groupIntersection, density: groupDensity };
  const patternsReady = Promise.all($$('.dir').map(d => {
    const name = d.dataset.dir, disc = $('.dir__disc', d);
    if (name === 'flow') { disc.replaceChildren(buildFlow()); return; }
    return fetch(`assets/patterns/${name}.svg`).then(r => r.text()).then(txt => {
      const doc = new DOMParser().parseFromString(txt, 'image/svg+xml').documentElement;
      const svg = svgEl('svg', { viewBox: doc.getAttribute('viewBox'), class: 'dir__pat' });
      svg.innerHTML = doc.innerHTML
        .replace(/id="([^"]+)"/g, `id="pat-${name}-$1"`)
        .replace(/url\(#([^)]+)\)/g, `url(#pat-${name}-$1)`);
      disc.replaceChildren(svg);   // у DOM — щоб getBBox працював
      PATTERN_GROUP[name](svg);
    }).catch(err => console.warn('pattern', name, err));
  }));

  // Ритм диска — один цикл (.is-play): коли диск уперше в кадрі — каскадом 120 мс зліва направо, далі — від hover,
  // фокусу й тапу. Нескінченного автоплею немає; поза кадром цикл стоїть на паузі (.is-off)
  const dirsGrid = $('.dirs__grid');
  const dirEls = $$('.dir', dirsGrid);
  let dirsReady = false;
  const playDir = d => { if (!reduce && dirsReady) d.classList.add('is-play'); };
  const dirSeen = new Set(), dirDone = new Set();
  // перший цикл: лише для дисків у кадрі
  const firstPlay = () => {
    if (reduce || !dirsReady) return;
    dirEls.filter(d => dirSeen.has(d) && !dirDone.has(d)).forEach((d, k) => {
      dirDone.add(d);
      setTimeout(() => playDir(d), 700 + k * 120);   // диск спершу зʼявляється (.pop), потім оживає
    });
  };
  dirEls.forEach(d => {
    // цикл скінчився — знімаємо клас, щоб наступний hover / фокус / тап запустив його знову
    d.addEventListener('animationend', () => {
      if (!d.getAnimations({ subtree: true }).some(a => a.animationName?.startsWith('pat') && a.playState !== 'finished')) d.classList.remove('is-play');
    });
    d.addEventListener('mouseenter', () => playDir(d));
    d.addEventListener('focus', () => { if (d.matches(':focus-visible')) playDir(d); });
    d.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') playDir(d); });
  });
  if (!reduce) {
    const dio = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) dirSeen.add(e.target.closest('.dir')); });
      firstPlay();
    }, { threshold: .6 });
    dirEls.forEach(d => dio.observe($('.dir__art', d)));
    new IntersectionObserver(([e]) => dirsGrid.classList.toggle('is-off', !e.isIntersecting)).observe(dirsGrid);
    patternsReady.then(() => { dirsReady = true; firstPlay(); });
  }

  // Колода проєктів: на десктопі сцена закріплюється, скрол гортає картки, як спікер — картки свого виступу.
  // Поточна стоїть у слоті, наступні чекають у ряд праворуч (клік по видимій — гортаємо до неї); заїжджаючи,
  // картка лягає поверх попередньої, а пройдені складаються під нею в стопку по центру (трохи менші, з легким нахилом).
  const deck = $('.pdeck');
  const deckStage = $('.pdeck__stage', deck);
  const ptrack = $('.ptrack', deck);
  const deckNum = $('.pdeck__count b', deck);
  const deckTotal = $('.pdeck__total', deck);
  const deckBtns = $$('.pdeck__btn', deck);
  const deckLive = $('.pdeck__live', deck);   // позиція колоди для скрінрідера — h3 поточної картки
  const deckMQ = matchMedia('(min-width: 900px) and (min-height: 600px)');
  const DECK_STEP = .75;   // висоти екрана скролу на одну картку
  let deckOn = false, deckCards = [], deckW = 0, deckRaw = -1, deckIdx = 0, deckStick = 0;
  cards.forEach(c => { c._over = $('.pcard__over', c); });
  const pad2 = n => String(n).padStart(2, '0');
  const deckTop = () => scrollY + deck.getBoundingClientRect().top - deckStick;   // скрол, з якого сцена закріплена
  const deckRun = () => deck.offsetHeight - deckStage.offsetHeight;
  function layoutDeck() {
    deckOn = !reduce && deckMQ.matches;
    deck.classList.toggle('is-pinned', deckOn);
    deckCards = cards;
    deckTotal.textContent = pad2(deckCards.length);
    cards.forEach(c => { c.style.transform = ''; c.style.zIndex = ''; c.style.opacity = ''; c._over.style.transform = ''; c.classList.remove('is-back'); });
    deck.style.height = '';
    deckStick = parseFloat(getComputedStyle(deckStage).top) || 0;   // = --hdr, сцена стоїть під хедером
    if (deckOn) {
      deckW = (deckCards[0]?.offsetWidth || 0) + (parseFloat(getComputedStyle(deck).getPropertyValue('--gap')) || 28);
      deck.style.height = `${deckStage.offsetHeight + Math.max(0, deckCards.length - 1) * innerHeight * DECK_STEP}px`;
    }
    deckRaw = -1;
  }
  let deckSaid = -1;
  function setDeckIdx(i) {
    // оголошуємо лише зміну (не початковий стан)
    if (deckSaid >= 0 && i !== deckSaid) deckLive.textContent = $('.pcard__title', deckCards[i]).textContent;
    // верхня картка: форма її напрямку виходить за рамку фото
    if (i !== deckSaid) deckCards.forEach((c, k) => c.classList.toggle('is-top', k === i));
    deckSaid = i;
    deckIdx = i;
    deckNum.textContent = pad2(i + 1);
    deckBtns[0].disabled = i <= 0;
    deckBtns[1].disabled = i >= deckCards.length - 1;
  }
  function renderDeck(force) {
    const n = deckCards.length;
    if (!deckOn) {
      // нативний ряд: номер — за найближчою до лівого краю карткою
      const step = deckCards[1] ? deckCards[1].offsetLeft - deckCards[0].offsetLeft : 1;
      const k = n > 1 ? clamp(ptrack.scrollLeft / (step * (n - 1))) : 0;
      setDeckIdx(Math.round(k * (n - 1)));
      return;
    }
    const raw = n > 1 ? clamp((deckStick - deck.getBoundingClientRect().top) / deckRun()) : 0;
    if (raw === deckRaw && !force) return;
    deckRaw = raw;
    const t = raw * (n - 1), i = Math.min(Math.floor(t), n - 2), fr = t - Math.max(i, 0);
    const p = n > 1 ? Math.max(i, 0) + ease(range(fr, .14, .86)) : 0;   // плато: картка трохи стоїть, перш ніж її перегорнуть
    const room = ptrack.clientWidth;
    deckCards.forEach((c, k) => {
      const d = k - p;
      let x, s = 1, rot = 0, o = 1;
      if (d >= 0) x = d * deckW;
      else {
        const e = Math.min(-d, 3);
        x = 0; s = 1 - e * .03; o = 1 - range(-d, 2.4, 3.2);   // стопка по центру: краї видно з обох боків
        rot = (k % 2 ? 1.6 : -2.2) * Math.min(-d, 1) + (k % 3 - 1) * .6 * range(-d, 1, 2);
      }
      c.style.zIndex = k + 1;
      c.style.opacity = o < 1 ? o.toFixed(3) : '';
      c.style.transform = `translate3d(${x.toFixed(1)}px,0,0) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`;
      // фото трохи запізнюється за карткою, що заїжджає
      c._over.style.transform = d > 0 && d < 1.6 ? `translate3d(${(Math.min(d, 1) * 90).toFixed(1)}px,0,0)` : '';
      // наступна, що виглядає справа, — клікабельна
      c.classList.toggle('is-back', d > .5 && c.offsetLeft + x < room);
    });
    setDeckIdx(Math.round(p));
  }
  // Позиція скролу, на якій картка i лежить у слоті
  const deckY = i => deckTop() + (deckCards.length > 1 ? i / (deckCards.length - 1) : 0) * deckRun();
  // Перехід до картки i: на десктопі — скрол до її місця в колоді, у нативному ряду — до секції й картки в ряду.
  // here — перехід зсередини колоди (←/→): сторінка й фокус лишаються на місці
  const goToCard = (i, here) => {
    const behavior = reduce ? 'auto' : 'smooth', c = deckCards[i];
    revealNow($('#projects'));
    if (deckOn) scrollTo({ top: deckY(i), behavior });
    else {
      if (!here) $('#projects').scrollIntoView({ behavior });
      ptrack.scrollTo({ left: c.offsetLeft - deckCards[0].offsetLeft, behavior });
    }
    if (!here) $('.pcard__more', c)?.focus({ preventScroll: true });   // наступний Tab — з цієї картки
  };
  deckBtns.forEach(b => b.addEventListener('click', () => goToCard(clamp(deckIdx + +b.dataset.step, 0, deckCards.length - 1), true)));
  // Форма напрямку біля фото (003 Overlap): велика, плоска, у кодовому кольорі (розмітка); рамка рівної площі —
  // пропорції зі спрайта, щоб широке око не важило більше за серце
  spriteReady.then(() => $$('.pcard__shape', deck).forEach(el => {
    const vb = document.getElementById($('use', el).getAttribute('href').slice(1))?.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
    if (vb) el.style.setProperty('--sq', Math.sqrt(vb[2] / vb[3]).toFixed(3));
  }));
  // Напрямок веде до своєї першої картки (data-dirs); без JS — до «Проєктів»
  dirEls.forEach(d => d.addEventListener('click', e => {
    const i = deckCards.findIndex(c => c.dataset.dirs.split(' ').includes(d.dataset.dir));
    if (i < 0) return;
    e.preventDefault();
    goToCard(i);
  }));
  // Клавіатура: фокус на картці за кадром — догортаємо до неї
  ptrack.addEventListener('focusin', e => {
    const c = e.target.closest('.pcard');
    if (!deckOn || !c) return;
    ptrack.scrollLeft = 0;
    scrollTo({ top: deckY(deckCards.indexOf(c)), behavior: 'smooth' });
  });
  // Клік по краю картки позаду — гортаємо до неї
  ptrack.addEventListener('click', e => {
    const c = e.target.closest('.pcard.is-back');
    if (!deckOn || !c) return;
    e.preventDefault();
    scrollTo({ top: deckY(deckCards.indexOf(c)), behavior: 'smooth' });
  });
  ptrack.addEventListener('scroll', () => { if (!deckOn) renderDeck(); }, { passive: true });
  deckMQ.addEventListener('change', () => { layoutDeck(); renderDeck(true); });
  layoutDeck();
  renderDeck(true);

  let rzP;
  addEventListener('resize', () => { clearTimeout(rzP); rzP = setTimeout(() => { layoutDeck(); renderDeck(true); }, 150); });


  /* ---------- 7. Скрол-цикл: hero-картотека, колода, «Підтримати», тема хедера ---------- */
  const hero = $('.hero');
  const heroContent = $('.hero__content');
  const heroSticky = $('.hero__sticky');
  const heroHidden = $('.hero__hidden');
  const heroField = $('.hero__field');
  // Фон hero «Великі світи» і лупа (розділ 11); false — лише синій, без форм і лупи
  const HERO_ART = false;
  heroHidden.hidden = !HERO_ART;
  const about = $('#about');

  // Поле форм: елемент більший за екран (запас на будь-яке співвідношення сторін).
  // Форми (розділ 11) малюються в координатах hero; svg поля дивиться на них через viewBox = heroFieldBox
  const heroFieldBox = { x: 0, y: 0, s: 0 };
  let heroCompose = () => {};   // композицію будує розділ 11, коли спрайт готовий
  function sizeField() {
    const vw = innerWidth, vh = innerHeight, W = heroSticky.clientWidth, H = heroSticky.clientHeight;
    const E = Math.ceil(Math.hypot(vw, vh) / 2 * 1.04) + 2;
    Object.assign(heroFieldBox, { x: W / 2 - E, y: H / 2 - E, s: 2 * E });
    Object.assign(heroField.style, {
      inset: 'auto', left: `${W / 2 - E}px`, top: `${H / 2 - E}px`, width: `${2 * E}px`, height: `${2 * E}px`,
    });
    heroCompose();
  }
  sizeField();
  let heroLensScroll = () => {};   // лупа hero (розділ 11) згортається, коли сцену скролять
  // «Про нас» заходить на другий екран hero і заїжджає поверх закріпленого hero знизу
  if (!reduce) document.documentElement.classList.add('has-stack');
  // той самий жест для «Про нас пишуть»: новини стоять, коли дійшли низом до краю екрана, лайм наїжджає поверх.
  // CSS бере висоту новин (--wh, на скільки підняти sticky) і медіа (--mh, наїзд — не більше екрана)
  const newsSec = $('#news'), newsWrap = $('.wrap', newsSec), mediaSec = $('#media');
  const stackRO = new ResizeObserver(() => {
    newsSec.style.setProperty('--wh', `${newsWrap.offsetHeight}px`);
    newsSec.parentElement.style.setProperty('--mh', `${mediaSec.offsetHeight}px`);
  });
  [newsWrap, mediaSec].forEach(el => stackRO.observe(el));
  // фокус з клавіатури в новинах, які вже під лаймом, — відкочуємо до моменту перед наїздом
  newsSec.addEventListener('focusin', e => {
    const m = mediaSec.getBoundingClientRect().top;
    if (!reduce && m < innerHeight && e.target.getBoundingClientRect().bottom > m && e.target.matches(':focus-visible'))
      scrollTo({ top: scrollY - (innerHeight - m) });
  });
  const support = $('.support');
  const supportInner = $('.support__inner');
  const supportBg = $('.support__bg');
  let lastSp = -1, supportIn = false, supportTop = Infinity;   // supportTop — верх синього кола у вʼюпорті

  function supportShow(instant) {
    supportIn = true;
    support.classList.add('is-in');
    supportInner.classList.add('in');
    if (instant) supportInner.classList.add('is-instant');
  }
  // фокус з клавіатури всередині — текст і кнопки мають бути видно одразу
  supportInner.addEventListener('focusin', () => { if (!supportIn) supportShow(true); });

  // Синє коло розкривається чистим, без форм по краю
  function renderSupport(sp, sr, vw, vh) {
    // текст не скрабимо: один тригер — рядки заголовка й ліду, потім реквізити (CSS); прийшли якорем — одразу на місці
    if (sp > .7 && !supportIn) supportShow('instant' in supportInner.dataset);
    if (sp === lastSp) return;
    lastSp = sp;
    const k = range(sp, 0, .7);   // до тригера тексту синє вже повне — білий текст не ляже на папір
    const sR = Math.hypot(vw / 2, Math.max(sr.height * .85, vh));
    const R = sR * Math.pow(k, 1.8);
    // шари заходять вище секції (--up), тож центр кола рахуємо від їхнього верху
    const up = -supportBg.offsetTop;
    const cy = up + sr.height * .35;
    supportTop = k > 0 ? sr.top + sr.height * .35 - R : Infinity;
    supportBg.style.clipPath = k >= 1 && !up ? 'none' : `circle(${R}px at 50% ${cy}px)`;
  }
  const hdr = $('.hdr');
  const ftr = $('.ftr');
  const sections = $$('main > section, .ftr');
  let pileRise = 0;   // наскільки купа фігур футера виросла над своєю зоною (рахує фізика нижче)

  const progress = el => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  };

  function frame() {
    const vw = innerWidth, vh = innerHeight;

    // HERO: «Про нас» заїжджає поверх знизу (hp 0 → 1 — рівно один екран), hero стоїть на місці
    const hp = reduce ? 0 : progress(hero);
    heroHp = hp;
    heroLensScroll(hp);

    // ПРОЄКТИ: колода
    if (deckOn) renderDeck();


    // ПІДТРИМКА
    const sr = support.getBoundingClientRect();
    const sp = reduce ? 1 : clamp((vh - sr.top) / (vh * 1.05));
    renderSupport(sp, sr, vw, vh);

    // Тема хедера за секцією під ним
    const y = 40;
    let theme = 'light', mark = false;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) {
        if (s === newsSec && !mediaSec.hidden && mediaSec.getBoundingClientRect().top <= y) continue;   // лайм уже наїхав під шапку
        if (s === hero) {
          if (about.getBoundingClientRect().top <= y) continue;   // «Про нас» уже наїхала під шапку
          mark = scrollY < 8;         // лише на самому верху в шапці зірка з «C»; щойно гортаємо — повне лого
          theme = 'blue';
        }
        else if (s === support) theme = sp >= .7 ? 'solid-blue' : 'light';
        else if (s.dataset.theme === 'field') {
          theme = 'field';
          hdr.style.setProperty('--field', s.style.getPropertyValue('--field'));
          hdr.style.setProperty('--on', s.style.getPropertyValue('--on'));
          hdr.style.setProperty('--off', s.style.getPropertyValue('--off') || 'var(--ink)');   // текст CTA на тлі --on
        }
        else theme = s.dataset.theme === 'blue' ? 'solid-blue' : 'light';
        break;
      }
    }
    // синє коло «Підтримати» піднялося під хедер ще над «Партнерами»
    if (theme === 'light' && sr.top > y && supportTop < hdr.offsetHeight) theme = 'solid-blue';
    if (hdr.dataset.theme !== theme) hdr.dataset.theme = theme;
    hdr.classList.toggle('is-mark', mark);

    // Футер: хедер більше не кріпиться — стоїть над купою фігур і їде вгору разом зі сторінкою, не перекриваючи їх
    const lift = Math.min(0, ftr.getBoundingClientRect().top - pileRise - hdr.offsetHeight);
    hdr.style.transform = lift && !hdr.classList.contains('is-open') ? `translateY(${lift}px)` : '';
  }

  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { frame(); ticking = false; }); } };
  addEventListener('scroll', onScroll, { passive: true });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { lastSp = -1; sizeField(); frame(); }, 120); });
  frame();

  // Фокус у hero, коли сцену вже прокручено, — повертаємо її на початок: білий текст має лежати на синьому
  heroContent.addEventListener('focusin', () => {
    if (heroHp > .05) scrollTo({ top: scrollY + hero.getBoundingClientRect().top });
  });

  /* ---------- 8. Медіа: ховаємо секцію, якщо матеріалів < 3 ---------- */
  if ($$('#media .mcard').length < 3) $('#media').hidden = true;

  /* ---------- 9. Копіювання реквізитів: чесні стани — успіх (тост) або помилка (значення виділено вручну) ---------- */
  const toast = $('.toast');
  const reqStatus = $('.req__status');
  let tt;
  // видимий текст кнопки — частина її доступного імені («Скопіювати IBAN»); «fail» — UI-мікрокопі, потрібне погодження
  const COPY = { idle: 'Скопіювати', done: 'Скопійовано<span aria-hidden="true"> ✓</span>', fail: 'Скопіюйте вручну' };
  const copyText = async (text, node) => {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    // запасний шлях: виділяємо значення й пробуємо execCommand — відповідь дає саме його результат
    const sel = getSelection(), r = document.createRange();
    r.selectNodeContents(node); sel.removeAllRanges(); sel.addRange(r);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    if (ok) sel.removeAllRanges();
    return ok;
  };
  $$('.req__row').forEach(row => {
    const btn = $('.req__btn', row), txt = $('.req__btn-t', btn), val = $('[data-copy]', row), label = $('dt', row).textContent;
    let rt;
    const setState = st => {
      btn.classList.toggle('is-done', st === 'done');
      btn.classList.toggle('is-error', st === 'fail');
      row.classList.toggle('is-error', st === 'fail');
      txt.innerHTML = COPY[st];
    };
    btn.addEventListener('click', async () => {
      clearTimeout(rt);
      const ok = await copyText(val.textContent.trim(), val);
      setState(ok ? 'done' : 'fail');
      if (ok) {
        toast.textContent = `${label} скопійовано`;
        toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 1800);
        rt = setTimeout(() => setState('idle'), 1800);
      } else {
        // тосту немає; значення лишається виділеним — людина копіює сама. Текст — потрібне погодження
        reqStatus.textContent = `${label}: не вдалося скопіювати. Значення виділено — скопіюйте вручну.`;
        rt = setTimeout(() => { setState('idle'); reqStatus.textContent = ''; }, 6000);
      }
    });
  });

  /* ---------- 10. Футер: фігури брендбуку падають і складаються (Matter.js) ---------- */
  const zone = $('.ftr__shapes');
  if (zone && window.Matter) {
    const { Engine, Runner, Bodies, Body, Composite, Events, Mouse, MouseConstraint, Vertices, Query } = Matter;
    const COLORS = ['lime', 'pink', 'red', 'purple', 'green', 'coral', 'hotpink', 'brown', 'maroon', 'paper'];
    // першими падають чотири форми напрямків; око на синьому — кольору паперу
    const DIRS = [['eye', 'paper'], ['flower', 'lime'], ['arrows', 'pink'], ['heart', 'purple']];
    const MAX_SHAPES = 20;
    const canDrag = matchMedia('(hover: hover) and (pointer: fine)').matches;

    let outlines = null;

    let engine, runner, shapes = [], timers = [], W = 0, H = 0, started = false, visible = false, lastVW = innerWidth;
    let mouse = null, mc = null, base = 60, nextColor = () => 'lime';

    const render = () => {
      let top = 0;
      for (const s of shapes) {
        const { x, y } = s.body.position;
        // Підстраховка: фігуру викинуло за межі — повертаємо зверху
        if (y > H + 300 || x < -300 || x > W + 300) {
          Body.setPosition(s.body, { x: W / 2, y: -s.size }); Body.setVelocity(s.body, { x: 0, y: 0 });
        }
        s.el.style.transform = `translate(${x}px,${y}px) rotate(${s.body.angle}rad) translate(${-s.cx}px,${-s.cy}px)`;
        // у купу рахуємо лише ті, що вже впали й лежать (щойно створена теж має нульову швидкість; ту, що тягнуть, — ні)
        if (s.body.speed > 1) s.fell = true;
        else if (s.fell && s.body.speed < .3 && mc?.body !== s.body) top = Math.min(top, s.body.bounds.min.y);
      }
      if (Math.abs(-top - pileRise) > 4) { pileRise = -top; onScroll(); }
    };

    const addShape = (name, color, size, x, y, i) => {
      const o = outlines[name];
      const k = size / Math.max(o.w, o.h);
      const hull = o.hull.map(p => ({ x: p.x * k, y: p.y * k }));
      const c = Vertices.centre(hull);
      const body = Bodies.fromVertices(x, y, [hull], {
        restitution: .3, friction: .5, frictionAir: .01, density: .002, angle: Math.random() * Math.PI * 2,
      });
      const el = document.createElement('div');
      el.className = 'ftr__shape';
      el.style.cssText = `width:${o.w * k}px;height:${o.h * k}px;color:var(--${color});--i:${i}`;
      el.innerHTML = `<svg viewBox="0 0 ${o.w} ${o.h}"><use href="#i-${name}"/></svg>`;
      zone.appendChild(el);
      Composite.add(engine.world, body);
      const s = { body, el, size, cx: c.x, cy: c.y, fell: reduce };   // без руху купу прораховано наперед — фігури вже лежать
      shapes.push(s);
      return s;
    };

    const init = () => {
      W = zone.clientWidth; H = zone.clientHeight;
      engine = Engine.create({ positionIterations: 8, velocityIterations: 6 });
      engine.gravity.y = 1;
      const T = 400, wall = { isStatic: true, friction: .6 };
      Composite.add(engine.world, [
        Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, wall),            // підлога — лінія
        Bodies.rectangle(-T / 2, H - 4000, T, 8000 + T, wall),             // ліва стіна
        Bodies.rectangle(W + T / 2, H - 4000, T, 8000 + T, wall),          // права стіна
      ]);

      base = W >= 1100 ? W / 6 : W >= 600 ? W / 4.2 : W / 3.6;
      const count = W >= 1100 ? 12 : W >= 600 ? 10 : 7;
      let colors = [];
      nextColor = () => { if (!colors.length) colors = shuffle(COLORS.slice()); return colors.pop(); };
      // спершу чотири напрямки, далі — решта форм у перемішаних кольорах
      const queue = [
        ...DIRS.filter(([n]) => outlines[n]),
        ...shuffle(Array.from({ length: count - DIRS.length }, (_, i) => ICONS[i % ICONS.length]).filter(n => outlines[n])).map(n => [n, null]),
      ];
      const spawnX = size => size / 2 + Math.random() * Math.max(1, W - size);

      if (reduce) {
        // Без руху: одразу прораховуємо, як фігури ляжуть, і малюємо купу статично
        queue.forEach(([n, c], i) => { const size = base * (.85 + Math.random() * .3); addShape(n, c || nextColor(), size, spawnX(size), -size - i * size * .6, 0); });
        for (let i = 0; i < 900; i++) Engine.update(engine, 1000 / 60);
        render();
        zone.classList.add('is-static');
        return;
      }

      Events.on(engine, 'afterUpdate', render);
      runner = Runner.create();
      if (visible) Runner.run(runner, engine);

      queue.forEach(([n, c], i) => timers.push(setTimeout(() => {
        const size = base * (.85 + Math.random() * .3);
        const s = addShape(n, c || nextColor(), size, spawnX(size), -size * 1.2, 0);
        Body.setAngularVelocity(s.body, (Math.random() - .5) * .08);
        render();
      }, i * 110)));

      if (canDrag) {
        if (!mouse) {
          mouse = Mouse.create(zone);
          // Колесо і тач лишаємо сторінці: прибираємо слухачі Matter, які роблять preventDefault
          ['wheel', 'mousewheel', 'DOMMouseScroll'].forEach(e => zone.removeEventListener(e, mouse.mousewheel));
          zone.removeEventListener('touchmove', mouse.mousemove);
          zone.removeEventListener('touchstart', mouse.mousedown);
          zone.removeEventListener('touchend', mouse.mouseup);
          addEventListener('mouseup', e => { if (mouse.button === 0) mouse.mouseup(e); });
          zone.addEventListener('mousemove', tickle);
        }
        mc = MouseConstraint.create(engine, { mouse, constraint: { stiffness: .2, damping: .1, render: { visible: false } } });
        Composite.add(engine.world, mc);
        Events.on(mc, 'startdrag', () => zone.classList.add('is-dragging'));
        Events.on(mc, 'enddrag', () => zone.classList.remove('is-dragging'));
      }
    };

    // «Кожен додає свою»: клік/тап по порожньому місцю зони — нова форма в цій точці (без руху > 4px і не під час drag)
    let down = null;
    zone.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    zone.addEventListener('pointercancel', () => { down = null; });
    zone.addEventListener('pointerup', e => {
      const d = down; down = null;
      if (!d || !engine || zone.classList.contains('is-dragging')) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
      const r = zone.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (Query.point(shapes.map(s => s.body), { x, y }).length) return;   // влучили у форму — це не порожнє місце
      // ліміт: найстаріша «додана» форма поступається місцем (чотири напрямки лишаються)
      if (shapes.length >= MAX_SHAPES) {
        const [old] = shapes.splice(DIRS.length, 1);
        Composite.remove(engine.world, old.body); old.el.remove();
      }
      const names = ICONS.filter(n => outlines[n]);
      const size = base * (.85 + Math.random() * .3);
      const s = addShape(names[Math.random() * names.length | 0], nextColor(), size, clamp(x, size / 2, W - size / 2), y, 0);
      if (reduce) {
        // без анімації падіння: одразу кладемо на купу
        for (let i = 0; i < 600; i++) Engine.update(engine, 1000 / 60);
        render();
      } else {
        Body.setAngularVelocity(s.body, (Math.random() - .5) * .08);
        render();
      }
    });

    // «Лоскіт»: фігури біля курсора легенько відштовхуються
    let lastMove = null;
    const tickle = e => {
      if (!engine || zone.classList.contains('is-dragging')) return;
      const r = zone.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const speed = lastMove ? Math.hypot(mx - lastMove.x, my - lastMove.y) : 0;
      lastMove = { x: mx, y: my };
      if (speed < 2) return;
      const R = 130, f = Math.min(speed, 40) * .00004;
      for (const s of shapes) {
        const dx = s.body.position.x - mx, dy = s.body.position.y - my, d = Math.hypot(dx, dy);
        if (d > R || d < 1) continue;
        const k = (1 - d / R) * f * s.body.mass;
        Body.applyForce(s.body, s.body.position, { x: dx / d * k, y: (dy / d - .6) * k });
      }
    };

    const teardown = () => {
      timers.forEach(clearTimeout); timers = [];
      if (runner) Runner.stop(runner);
      if (engine) { Events.off(engine); Composite.clear(engine.world, false); Engine.clear(engine); }
      shapes.forEach(s => s.el.remove()); shapes = []; pileRise = 0;
      zone.classList.remove('is-dragging', 'is-static');
      engine = runner = mc = null;
    };

    // Стартуємо, коли зона з'являється на екрані; поза екраном — пауза
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !started) {
        started = true;
        spriteReady.then(() => { outlines = getOutlines(); init(); });
      } else if (runner) {
        visible ? Runner.run(runner, engine) : Runner.stop(runner);
      }
    }, { threshold: .2 }).observe(zone);

    let rzF;
    addEventListener('resize', () => {
      if (!started || innerWidth === lastVW) return;
      clearTimeout(rzF);
      rzF = setTimeout(() => { lastVW = innerWidth; teardown(); init(); }, 200);
    });
  }

  /* ---------- 10а. «Про нас»: форми засипаються з боків і лягають рамкою під текстом (Matter.js, як у футері) ---------- */
  // Рамка, а не вистава: спершу з'являється текст, слідом — один раз — форми розміру футера влітають з-за лівого
  // й правого краю і лягають двома низькими купами в нижніх кутах (трохи «втоплені» за край секції). Над ними —
  // невидима стеля на рівні низу тексту: у текст форми не залітають, центр під ним лишається вільним. Лайму немає —
  // він лишається акцентом «людям». Відлежались — фізика зупиняється; без руху купа одразу лежить
  const pourZone = $('.about__stage');
  if (pourZone && window.Matter) {
    const { Engine, Runner, Bodies, Body, Composite, Events, Vertices } = Matter;
    const POUR_COLORS = ['pink', 'paper', 'purple', 'blue', 'coral', 'maroon', 'brown'];
    const aboutBody = $('.about__body');
    const aboutText = [$('.about__title'), ...aboutBody.children];   // сам лід — без нижнього відступу (мобільний)
    let pe = null, pr = null, pShapes = [], pTimers = [], pSize = '';

    const pRender = () => pShapes.forEach(s => {
      const { x, y } = s.body.position;
      s.el.style.transform = `translate(${x}px,${y}px) rotate(${s.body.angle}rad) translate(${-s.cx}px,${-s.cy}px)`;
    });
    const pTeardown = () => {
      pTimers.forEach(clearTimeout); pTimers = [];
      if (pr) Runner.stop(pr);
      if (pe) { Events.off(pe); Composite.clear(pe.world, false); Engine.clear(pe); }
      pShapes.forEach(s => s.el.remove()); pShapes = [];
      pe = pr = null;
    };
    // still — без анімації: прораховуємо падіння наперед і малюємо, як форми лягли
    const pour = still => {
      const outlines = getOutlines();
      const W = pourZone.clientWidth, H = pourZone.clientHeight;
      pSize = `${W}x${H}`;
      const ceil = Math.max(...aboutText.map(el => el.getBoundingClientRect().bottom)) - pourZone.getBoundingClientRect().top + 24;
      const base = Math.min(W >= 1100 ? W / 6 : W >= 600 ? W / 4.2 : W / 3.6, (H - ceil) * .55);
      // підлога — пологий «пагорб»: від центру спадає до країв, тож форми скочуються в кути й центр лишається вільним.
      // Крайні стіни трохи за краєм екрана; форма, що влітає з-за краю, «бачить» їх лише коли вже вся всередині
      const sink = base * .12, rise = base * .4, edge = base * .1, T = 400, WALL = 2;
      const solid = { isStatic: true, friction: .6 };
      // схил: верх лежить на відрізку від (−edge, H + sink) біля краю до (W/2, H − rise) у центрі
      const slope = Math.atan2(rise + sink, W / 2 + edge), len = Math.hypot(W / 2 + edge, rise + sink);
      const plane = side => Bodies.rectangle(
        W / 2 + side * (W / 4 + edge / 2) - side * Math.sin(slope) * T / 2, H + (sink - rise) / 2 + Math.cos(slope) * T / 2,
        len, T, { ...solid, angle: side * slope });
      pe = Engine.create({ positionIterations: 8, velocityIterations: 6 });
      Composite.add(pe.world, [
        plane(-1), plane(1),
        Bodies.rectangle(W / 2, ceil - T / 2, W + 4 * (base + T), T, solid),                         // стеля — низ тексту
        Bodies.rectangle(-edge - T / 2, H / 2, T, H * 4, { ...solid, collisionFilter: { category: WALL } }),
        Bodies.rectangle(W + edge + T / 2, H / 2, T, H * 4, { ...solid, collisionFilter: { category: WALL } }),
      ]);
      const names = shuffle(ICONS.filter(n => outlines[n])).slice(0, (W >= 600 ? 3 : 2) * 2);
      const colors = shuffle(POUR_COLORS.slice());
      // по черзі зліва і справа: перша з кожного боку лягає в кут, друга — поруч, третя — зверху між ними
      const LAND = [.04, .13, .08];
      const add = i => {
        const o = outlines[names[i]], left = i % 2 === 0, row = i >> 1, dir = left ? 1 : -1;
        const size = base * (.85 + Math.random() * .3), k = size / Math.max(o.w, o.h);
        const hull = o.hull.map(p => ({ x: p.x * k, y: p.y * k }));
        const c = Vertices.centre(hull);
        const x = left ? -size * .6 : W + size * .6, y = ceil + size * .72;
        const body = Bodies.fromVertices(x, y, [hull], {
          restitution: .1, friction: .8, frictionAir: .012, density: .002, angle: Math.random() * Math.PI * 2,
          collisionFilter: { mask: ~WALL },
        });
        const tx = W * LAND[row % LAND.length] + size * .6;                     // скільки пролетіти всередину
        const steps = Math.sqrt(2 * Math.max(60, H - size / 2 - y) / .278);   // кроків до підлоги (g ≈ .278 px/крок²)
        Body.setVelocity(body, { x: dir * tx / (steps * .9), y: 0 });
        Body.setAngularVelocity(body, dir * (.02 + Math.random() * .03));
        const el = document.createElement('div');
        el.className = 'about__shape';
        el.style.cssText = `width:${o.w * k}px;height:${o.h * k}px;color:var(--${colors[i % colors.length]})`;
        el.innerHTML = `<svg viewBox="0 0 ${o.w} ${o.h}"><use href="#i-${names[i]}"/></svg>`;
        pourZone.appendChild(el);
        Composite.add(pe.world, body);
        pShapes.push({ body, el, cx: c.x, cy: c.y, left, armed: false });
      };
      // центр перетнув край екрана — тепер крайня стіна її тримає
      const arm = () => pShapes.forEach(s => {
        const { x } = s.body.position;
        if (!s.armed && (s.left ? x > 0 : x < W)) { s.armed = true; s.body.collisionFilter.mask = -1; }
      });
      if (still) {
        const step = n => { for (let t = 0; t < n; t++) { Engine.update(pe, 1000 / 60); arm(); } };
        names.forEach((_, i) => { add(i); step(12); });
        step(600);
        pRender();
        return;
      }
      let calm = 0;
      Events.on(pe, 'afterUpdate', () => {
        arm();
        pRender();
        if (pShapes.length < names.length) return;
        calm = pShapes.every(s => s.body.speed < .15 && s.body.angularSpeed < .01) ? calm + 1 : 0;
        if (calm > 30) Runner.stop(pr);
      });
      pr = Runner.create();
      Runner.run(pr, pe);
      names.forEach((_, i) => pTimers.push(setTimeout(() => add(i), i * 180)));
      pTimers.push(setTimeout(() => Runner.stop(pr), 6000));
    };

    // Тригер: лід «Про нас» уже з'являється і низ секції (куди лягають форми) в кадрі — на десктопі це мить, коли
    // секція доїхала; на мобільному — коли дочитали до низу. Прийшли якорем — без затримки
    const floor = pourZone.appendChild(Object.assign(document.createElement('div'), { style: 'position:absolute;left:0;bottom:0;width:1px;height:1px' }));
    let poured = false, floorIn = false;
    const check = () => {
      if (poured || !floorIn || !aboutBody.classList.contains('in')) return;
      poured = true;
      const delay = reduce || aboutBody.classList.contains('is-instant') ? 0 : 300;
      Promise.all([spriteReady, document.fonts.ready]).then(() => setTimeout(() => pour(reduce), delay));
    };
    const mo = new MutationObserver(check);
    mo.observe(aboutBody, { attributes: true, attributeFilter: ['class'] });
    const fio = new IntersectionObserver(([e]) => {
      floorIn = e.isIntersecting;
      check();
      if (poured) { fio.disconnect(); mo.disconnect(); }
    });
    fio.observe(floor);
    // змінився розмір — купу перераховуємо одразу лежачою, без повторного засипання
    let rzP;
    new ResizeObserver(() => {
      clearTimeout(rzP);
      rzP = setTimeout(() => {
        if (!pe || `${pourZone.clientWidth}x${pourZone.clientHeight}` === pSize) return;
        pTeardown();
        pour(true);
      }, 200);
    }).observe(pourZone);
  }

  /* ---------- 11. Hero: «Великі світи» і лупа «Фокус» ---------- */
  // Ззовні — кілька великих форм спрайта тон-в-тон: суцільний синій, трохи глибший за поле (мікс --blue і --blue-deep,
  // без прозорості й світлих тинтів), частина за краєм екрана. Під лупою ті самі форми проявляються у своєму кольорі,
  // як у футері: форми напрямків — кодовий колір, решта — палітра (червоний — лише декоративна форма).
  // Між формами під лупою — просто синій. Шари за глибиною: [0] тон, [1] колір
  const DEPTH = 2;
  // Композиція (еталони 1440×900 і 390×844), знизу вгору: n — форма спрайта; c — колір під лупою; x, y — центр у % hero;
  // s — розмір у vmin (портрет — у vw телефона-еталона) по більшій стороні; a — поворот; t — глибина тону (частка
  // --blue-deep). На 16:9 і ширше x прив'язано до опор (ax): між 16:10 і 16:9 — плавний перехід від % до опор; вужче
  // за 16:10 — % від кадру 16:10 по центру. Мало форм, великі й спокійні; довкола ока в «C» — галявина ≥ 15vmin,
  // між формами ≥ 10vmin
  const DESK = [
    { n: 'flower', c: 'lime', x: 91, y: 13, s: 64, a: 14, t: .2, ax: m => m.W - 13 * m.u },
    { n: 'clover', c: 'hotpink', x: 2, y: 62, s: 52, a: -12, t: .2, ax: m => 3.2 * m.u },
    // від лого, але не ближче 30vmin до ока
    { n: 'drop', c: 'coral', x: 22, y: 14, s: 30, a: 20, t: .26, ax: m => Math.min(m.wm + 22 * m.u, m.eye - 30 * m.u) },
    { n: 'burst', c: 'red', x: 64.5, y: 67, s: 34, a: 10, t: .26, ax: m => m.intro + 20 * m.u },
    { n: 'star', c: 'paper', x: 39, y: 94, s: 30, a: 8, t: .26, ax: m => (m.claim + m.intro) / 2 - 6.4 * m.u },
    { n: 'heart', c: 'purple', x: 95, y: 93, s: 40, a: -16, t: .2, ax: m => m.W - 8 * m.u },
  ];
  const MOB = [
    { n: 'flower', c: 'lime', x: 95, y: 14, s: 72, a: 14, t: .2 },
    { n: 'drop', c: 'coral', x: 18, y: 16, s: 30, a: 28, t: .26 },
    { n: 'clover', c: 'hotpink', x: 2.5, y: 56, s: 60, a: -12, t: .2 },
    { n: 'burst', c: 'red', x: 87, y: 71, s: 40, a: 10, t: .26 },
    { n: 'heart', c: 'purple', x: 33, y: 100, s: 56, a: -16, t: .2 },
  ];
  const rootCS = getComputedStyle(document.documentElement);
  const token = (name, fb) => rootCS.getPropertyValue(`--${name}`).trim() || fb;
  // тон форми: суцільний мікс поля й --blue-deep (непрозорий — перекриття не темнішають)
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const BLUE = rgb(token('blue', '#054FF0')), DEEP = rgb(token('blue-deep', '#0337A8'));
  const tone = t => `rgb(${BLUE.map((v, i) => Math.round(lerp(v, DEEP[i], t))).join(',')})`;
  const BOX = {};   // форма спрайта → [ширина, висота] viewBox
  const heroArt = !HERO_ART ? Promise.resolve(false) : spriteReady.then(() => {
    new Set(DESK.concat(MOB).map(it => it.n)).forEach(n => {
      const vb = document.getElementById(`i-${n}`)?.getAttribute('viewBox');
      if (vb) BOX[n] = vb.split(/[\s,]+/).slice(2).map(Number);
    });
    return true;
  });

  // svg поля: координати hero, viewBox — коробка поля (більша за екран), тож форми, обрізані екраном, цілі
  const fieldArt = heroField.appendChild(svgEl('svg', { class: 'hero__art' }));
  let loupeDepth = null;   // шари лупи (<g> за глибиною) — створює блок лупи нижче
  const use = (n, tf, c) => `<use href="#i-${n}" width="${BOX[n][0]}" height="${BOX[n][1]}" transform="${tf}" color="${c}"/>`;
  function compose() {
    if (!BOX.flower) return;
    const hr = heroSticky.getBoundingClientRect(), W = hr.width, H = hr.height;
    const mob = H > W;   // портрет (мобільний і планшет) — своя композиція у vw
    // опори композиції — межі лого, тексту claim і ліду без скрол-трансформації контенту
    const keep = heroContent.style.transform;
    heroContent.style.transform = 'none';
    const claim = document.createRange();
    claim.selectNodeContents($('.hero__claim'));
    const m = { W, H, u: Math.min(W, H) / 100, wm: $('.hero__wm').getBoundingClientRect().left - hr.left,
      intro: $('.hero__intro').getBoundingClientRect().left - hr.left, claim: claim.getBoundingClientRect().right - hr.left };
    const eye = $('.hero__slot').getBoundingClientRect();
    m.eye = eye.left + eye.width / 2 - hr.left;   // око в «C» — довкола нього галявина
    heroContent.style.transform = keep;
    const ar = W / H, t = ease(clamp((ar - 1.6) / (16 / 9 - 1.6)));
    const fw = mob ? W : Math.max(W, 1.6 * H);   // вужче за 16:10 — % від кадру 16:10 по центру: проміжки у vmin як в еталоні
    const u = mob ? Math.min(W, H * 390 / 844) / 100 : m.u;   // портрет ширший за телефон-еталон — форми за висотою
    const field = [], layers = Array.from({ length: DEPTH }, () => []);
    (mob ? MOB : DESK).forEach(it => {
      const xp = W / 2 + (it.x - 50) * fw / 100;
      const x = mob || !it.ax ? xp : lerp(xp, it.ax(m), t), y = it.y * H / 100;
      const [bw, bh] = BOX[it.n];
      const k = it.s * u / Math.max(bw, bh);
      const tf = `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${it.a}) scale(${k.toFixed(5)}) translate(${-bw / 2} ${-bh / 2})`;
      const tn = tone(it.t);
      field.push(use(it.n, tf, tn));
      layers[0].push(use(it.n, tf, tn));
      layers[1].push(use(it.n, tf, token(it.c)));
    });
    const { x, y, s } = heroFieldBox;
    fieldArt.setAttribute('viewBox', `${x.toFixed(2)} ${y.toFixed(2)} ${s} ${s}`);
    fieldArt.innerHTML = field.join('');
    if (loupeDepth) loupeDepth.forEach((g, L) => { g.innerHTML = layers[L].join(''); });
  }
  heroCompose = compose;
  heroArt.then(compose);
  document.fonts?.ready.then(compose);   // ширина ліду й claim залежить від шрифту

  // Лупа «Фокус»: з'являється лише на справжній рух миші (на тачі — разовий тап), без автономного руху.
  // Бокс 2Rb×2Rb їде translate3d, радіус — clip-path на ньому; усередині svg тих самих форм (ті самі <use> спрайта)
  // у координатах hero, зсунутий і збільшений CSS-transform — фокус ×k векторний, без layout; малюється лише коло лупи.
  // Тихі зони (текст, кнопки, шапка) гасять колір — лишається тон. Зіниця ока в «C» дивиться туди ж, куди лупа.
  // rAF — лише поки щось рухається: лупа спокійна — цикл спить до руху або до ховання за простоєм.
  if (!reduce && HERO_ART) {
    // криві з брифу (CSS cubic-bezier) для JS-таймлайну
    const bezier = (x1, y1, x2, y2) => {
      const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
      const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
      return x => {
        if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
        let lo = 0, hi = 1, t = x;
        for (let i = 0; i < 24; i++) { const v = X(t) - x; if (Math.abs(v) < 1e-5) break; if (v > 0) hi = t; else lo = t; t = (lo + hi) / 2; }
        return Y(t);
      };
    };
    const POP = bezier(.34, 1.45, .64, 1), FOCUS = bezier(.22, 1, .36, 1), SOFT = bezier(.2, .7, .1, 1),
      OUT_K = bezier(.4, 0, 1, 1), OUT_R = bezier(.5, 0, .75, 0);
    const smooth = t => t * t * (3 - 2 * t);
    // твін завжди стартує з поточного значення: рух посеред ховання розвертає лупу без стрибка
    const tween = () => ({ a: 0, b: 0, t0: 0, d: 1, e: SOFT });
    const val = (w, now) => w.a + (w.b - w.a) * w.e(clamp((now - w.t0) / w.d));
    const to = (w, b, now, delay, d, e) => { w.a = val(w, now); w.b = b; w.t0 = now + delay; w.d = d; w.e = e; busy = Math.max(busy, w.t0 + d); };

    const lens = heroHidden.appendChild(Object.assign(document.createElement('div'), { className: 'hero__lens' }));
    const loupe = lens.appendChild(svgEl('svg', { class: 'hero__loupe' }));
    loupeDepth = Array.from({ length: DEPTH }, () => loupe.appendChild(svgEl('g')));
    const tones = loupeDepth.slice(1);   // кольоровий шар; [0] — тон, видимий одразу
    tones.forEach(g => { g.style.opacity = 0; });
    compose();

    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const QZ = [[0, .55]];   // тихі зони: колір гасне, лишається тон
    const KMAX = 1.5;   // фокус лупи: помірний — край великої форми під лінзою лишається впізнаваним
    // поява: радіус, фокус k 1→KMAX (+60 мс), колір (+200 мс); тач — ще й утримання
    const SHOW = { mouse: { r: 300, k: 420 }, touch: { r: 280, k: 360, hold: 420 + 700 } };
    const radius = m => {
      const v = Math.min(innerWidth, innerHeight);
      return m === 'touch' ? clamp(v * .12, 56, 84) : clamp(v * .07, 52, 80);
    };
    const tr = tween(), tz = tween(), tl = QZ.map(tween);
    let state = 'off', mode = 'mouse', R = 60, Rb = 0, zones = [], hx = 0, hy = 0, hw = 0, hh = 0;
    let px = 0, py = 0, lx = 0, ly = 0, vpx = 0, vpy = 0, vs = 0, ks = KMAX, kv = 0, qz = 0;
    let lastMove = 0, holdUntil = 0, hideEnd = 0, locked = false, ax = -1e4, ay = -1e4;
    let raf = 0, last = 0, clip = '', loupeTf = '', busy = 0, idle = 0;
    // зіниця ока в «C»: зсув — частка ока (12% по кожній осі, у межах 8–15%), повне відхилення — курсор за 30vmin;
    // у спокої (лупа сховалась) — у центрі. Зіниця — окремий svg над оком: CSS-transform без layout
    const pupil = $('.hero__pupil'), PUPIL = [156 * .12, 81 * .12];
    let eyeX = 0, eyeY = 0, eyeU = 1, reach = 1, ex = 0, ey = 0, pupilTf = '';
    const ops = tones.map(() => '');

    // прямокутник hero — на resize і на появу (не щокадру)
    const place = () => { const r = heroSticky.getBoundingClientRect(); hx = r.left; hy = r.top; hw = r.width; hh = r.height; };
    place();
    // розмір бокса лупи і тихі зони — на появу лупи
    function measure() {
      place();
      const rb = Math.ceil(Math.max(radius('mouse'), radius('touch')) * 1.08);   // запас на переліт радіуса
      if (rb !== Rb) {
        Rb = rb;
        lens.style.width = lens.style.height = `${2 * Rb}px`;
      }
      const vb = `0 0 ${hw} ${hh}`;   // svg лупи — у координатах hero, як поле
      if (loupe.getAttribute('viewBox') !== vb) {
        loupe.setAttribute('viewBox', vb); loupe.setAttribute('width', hw); loupe.setAttribute('height', hh);
      }
      const box = (r, pad = 0) => ({ l: r.left - hx - pad, t: r.top - hy - pad, r: r.right - hx + pad, b: r.bottom - hy + pad });
      const claim = document.createRange();
      claim.selectNodeContents($('.hero__claim'));   // межі самого тексту, не колонки
      zones = [box($('.hero__intro').getBoundingClientRect(), 16), box(claim.getBoundingClientRect()),
        { l: -1e5, t: -1e5, r: 1e5, b: hdr.offsetHeight - hy }];
      const e = $('.hero__slot').getBoundingClientRect();
      eyeX = e.left + e.width / 2 - hx; eyeY = e.top + e.height / 2 - hy; eyeU = e.width / 156; reach = .3 * Math.min(hw, hh);
    }
    // близькість до тихої зони: 0, поки лінза лише торкається прямокутника (d ≥ R), 1 — коли зайшла на нього на 60% радіуса
    const quiet = (x, y) => zones.reduce((q, z) => {
      const d = Math.hypot(Math.max(z.l - x, 0, x - z.r), Math.max(z.t - y, 0, y - z.b));
      return Math.max(q, smooth(clamp((R - d) / (.6 * R))));
    }, 0);

    const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    // поява одразу в точці курсора (без прильоту) або розворот посеред ховання
    function show(m, cx, cy, now) {
      const fresh = state === 'off';
      if (fresh) measure();
      mode = m; R = radius(m);
      px = cx - hx; py = cy - hy;
      if (fresh) {
        lx = vpx = px; ly = vpy = py; vs = 0; ks = KMAX; kv = 0;
        qz = quiet(px, py);
        lens.style.visibility = 'visible';
      }
      state = 'on';
      to(tr, R, now, 0, SHOW[m].r, POP);
      to(tz, 1, now, fresh ? 60 : 0, SHOW[m].k, FOCUS);
      tl.forEach((w, i) => to(w, 1, now, (fresh ? 200 : 0) + 60 * i, 240, SOFT));
      wake();
    }
    // ховання: кольорові шари гаснуть разом → k → 1 → радіус → 0; total — тривалість усього (звичайне 340 мс)
    function hide(total, now) {
      if (state === 'off' || (state === 'hiding' && hideEnd <= now + total)) return;
      const f = total / 340;
      state = 'hiding'; hideEnd = now + total;
      tl.forEach(w => to(w, 0, now, 0, 160 * f, SOFT));
      to(tz, 0, now, 40 * f, 220 * f, OUT_K);
      to(tr, 0, now, 100 * f, 240 * f, OUT_R);
      wake();
    }
    const hideNow = () => hide(200, performance.now());

    function tick(now) {
      const dt = clamp(now - last, 1, 50);
      last = now;
      // простій: миша стоїть 1.6 с, тап — після утримання
      if (state === 'on' && now > (mode === 'touch' ? holdUntil : lastMove + 1600)) hide(mode === 'touch' ? 300 : 340, now);
      // ведення: центр наздоганяє курсор; швидкість (τ 80 мс) трохи послаблює фокус на швидкому русі
      const a = 1 - Math.exp(-dt / 30);
      lx += (px - lx) * a; ly += (py - ly) * a;
      vs += (Math.hypot(px - vpx, py - vpy) / dt - vs) * (1 - Math.exp(-dt / 80));
      vpx = px; vpy = py;
      const kt = lerp(KMAX, KMAX - .2, clamp(vs / 2));
      // пружина k (stiffness 200, damping 22, mass 1), кроки ≤ 8 мс
      for (let n = Math.ceil(dt / 8), h = dt / 1000 / n, i = 0; i < n; i++) { kv += (200 * (kt - ks) - 22 * kv) * h; ks += kv * h; }
      const qt = quiet(lx, ly);
      qz += (qt - qz) * (1 - Math.exp(-dt / 120));
      // зіниця: до курсора, поки лупа на місці; ховається лупа — повертається в центр (τ 90 мс)
      let tx = 0, ty = 0;
      if (state === 'on') {
        const dx = px - eyeX, dy = py - eyeY, d = Math.hypot(dx, dy) || 1, g = Math.min(1, d / reach) / d;
        tx = dx * g; ty = dy * g;
      }
      const b = 1 - Math.exp(-dt / 90);
      ex += (tx - ex) * b; ey += (ty - ey) * b;
      const pupilStill = Math.abs(tx - ex) < 2e-3 && Math.abs(ty - ey) < 2e-3;
      if (state !== 'on' && pupilStill) ex = ey = 0;
      const pt = ex || ey ? `translate3d(${(ex * PUPIL[0] * eyeU).toFixed(2)}px,${(ey * PUPIL[1] * eyeU).toFixed(2)}px,0)` : '';
      if (pt !== pupilTf && pupil) { pupilTf = pt; pupil.style.transform = pt; }

      // кадр: лише transform, clip-path і opacity (перемальовується лише бокс 2Rb×2Rb)
      const r = val(tr, now), k = 1 + (ks - 1) * val(tz, now);
      lens.style.transform = `translate3d(${(lx - Rb).toFixed(2)}px,${(ly - Rb).toFixed(2)}px,0)`;
      // у центрі лінзи — та сама точка поля, ×k: svg лупи збільшено від кута й зсунуто так, що (lx, ly) — у центрі бокса
      const lt = `translate(${(Rb - lx * k).toFixed(2)}px,${(Rb - ly * k).toFixed(2)}px) scale(${k.toFixed(4)})`;
      if (lt !== loupeTf) { loupeTf = lt; loupe.style.transform = lt; }
      const c = `circle(${Math.max(r, 0).toFixed(2)}px at 50% 50%)`;
      if (c !== clip) { clip = c; lens.style.clipPath = c; }
      tl.forEach((w, i) => {
        const o = (val(w, now) * (1 - smooth(range(qz, ...QZ[i])))).toFixed(3);
        if (o !== ops[i]) { ops[i] = o; tones[i].style.opacity = o; }
      });

      if (state === 'hiding' && now >= hideEnd) { state = 'off'; lens.style.visibility = 'hidden'; }
      if (state === 'off' && pupilStill) { raf = 0; return; }
      // спокій: курсор стоїть, усе доїхало — цикл спить до руху або до ховання за простоєм
      if (state === 'on' && now > busy && pupilStill && Math.abs(px - lx) < .05 && Math.abs(py - ly) < .05 &&
        vs < .01 && Math.abs(kt - ks) < 1e-3 && Math.abs(kv) < 1e-3 && Math.abs(qt - qz) < 2e-3) {
        raf = 0;
        clearTimeout(idle);
        idle = setTimeout(wake, Math.max(0, (mode === 'touch' ? holdUntil : lastMove + 1600) - now) + 20);
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    // Миша: лише справжній рух (≥ 2 px від попередньої зарахованої події) над hero, поки сцену не скролять
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || !fine.matches || (state !== 'off' && mode !== 'mouse')) return;
      px = e.clientX - hx; py = e.clientY - hy;
      if (Math.hypot(e.clientX - ax, e.clientY - ay) < 2) return;
      ax = e.clientX; ay = e.clientY;
      const now = performance.now();
      if (heroHp >= .03 || locked) return;
      if (px < 0 || py < 0 || px >= hw || py >= hh) { hide(200, now); return; }
      lastMove = now;
      if (state !== 'on') show('mouse', e.clientX, e.clientY, now);
      else wake();
    }, { passive: true });
    // миттєве ховання: курсор пішов із вікна, вкладка втратила фокус чи стала невидимою
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) hideNow(); });
    addEventListener('blur', hideNow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) hideNow(); });
    let rzL;
    addEventListener('resize', () => { hideNow(); clearTimeout(rzL); rzL = setTimeout(place, 150); });
    // скрол: сцена рушила — згортаємо й не повертаємо, доки hero знову не на самому початку
    heroLensScroll = hp => {
      if (hp > .03) { hide(240, performance.now()); locked = true; }
      else if (hp <= .01) locked = false;
    };

    // Тач: тап по полю hero (не по посиланню чи кнопці) — разова лупа в точці тапу; зсув пальця > 10 px — це скрол
    let tap = null;
    heroSticky.addEventListener('pointerdown', e => {
      tap = e.pointerType !== 'mouse' && e.isPrimary && !e.target.closest('a, button') ? { x: e.clientX, y: e.clientY } : null;
    });
    heroSticky.addEventListener('pointermove', e => { if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 10) tap = null; });
    heroSticky.addEventListener('pointercancel', () => { tap = null; });
    heroSticky.addEventListener('pointerup', e => {
      const t = tap;
      tap = null;
      if (!t || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 || heroHp >= .03 || locked) return;
      const now = performance.now();
      show('touch', e.clientX, e.clientY, now);   // лупа вже видно — просто переїжджає в нову точку
      holdUntil = now + SHOW.touch.hold;
    });
  }

  /* ---------- 12. Мобільне меню (≤ --bp-menu, 1180px) ---------- */
  const burger = $('.hdr__burger');
  const menu = $('#menu');
  const menuLinks = $$('a', menu);
  const menuOpen = () => menu.classList.contains('is-open');
  function setMenu(open, restoreFocus = true) {
    // коло меню розкривається з центру бургера і згортається туди ж (шапка могла зʼїхати над футером)
    if (burger.offsetParent) {
      const b = burger.getBoundingClientRect();
      menu.style.setProperty('--mx', `${(menu.offsetWidth - b.left - b.width / 2).toFixed(1)}px`);
      menu.style.setProperty('--my', `${(b.top + b.height / 2).toFixed(1)}px`);
    }
    burger.setAttribute('aria-expanded', open);
    menu.classList.toggle('is-open', open);
    hdr.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('is-locked', open);   // сторінка під меню не скролиться
    if (open) requestAnimationFrame(() => menuLinks[0].focus());
    else if (restoreFocus) burger.focus();
  }
  burger.addEventListener('click', () => setMenu(!menuOpen()));
  menuLinks.forEach(a => a.addEventListener('click', () => setMenu(false, false)));
  addEventListener('keydown', e => {
    if (!menuOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); setMenu(false); return; }
    if (e.key !== 'Tab') return;
    // фокус ходить по колу: бургер + пункти меню
    const f = [burger, ...menuLinks.filter(a => a.offsetParent)];   // лише видимі (мова в меню — до 760px)
    const i = f.indexOf(document.activeElement);
    const out = e.shiftKey ? i <= 0 : (i < 0 || i === f.length - 1);
    if (out) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
  });
  // один брейкпоінт із CSS (--bp-menu): ширше — меню немає, тож відкрите закриваємо й знімаємо блок скролу
  const BP_MENU = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bp-menu')) || 1180;
  matchMedia(`(min-width: ${BP_MENU + 1}px)`).addEventListener('change', e => {
    if (!e.matches || !menuOpen()) return;
    const inside = menu.contains(document.activeElement) || document.activeElement === document.body;   // меню вже сховане CSS — фокус міг злетіти
    setMenu(false, false);
    if (inside) $('.hdr__logo').focus();   // бургер сховано — фокус на початок шапки
  });

  /* ---------- 13. Стрічка партнерів: кнопка паузи; поза кадром і на прихованій вкладці стоїть (hover і фокус — у CSS) ---------- */
  const marquee = $('.marquee');
  const mToggle = $('.marquee__toggle');
  // поява по одному: копія списку (для безшовної стрічки) — з тими самими кроками, тож стрічка рушає, щойно вийшло останнє лого
  const mItems = $$('.marquee__list', marquee).map(l => $$('li', l));
  mItems.forEach(list => list.forEach((li, i) => li.style.setProperty('--i', i)));
  marquee.style.setProperty('--run', `${800 + (mItems[0].length - 1) * 70}ms`);
  if (reduce) mToggle.closest('.partners__foot').hidden = true;   // статичний грід — пауза не потрібна
  else {
    mToggle.addEventListener('click', () => {
      const paused = mToggle.getAttribute('aria-pressed') !== 'true';
      mToggle.setAttribute('aria-pressed', paused);
      marquee.classList.toggle('is-paused', paused);
    });
    let mSeen = false;
    const mSync = () => marquee.classList.toggle('is-off', !mSeen || document.hidden);
    new IntersectionObserver(([e]) => { mSeen = e.isIntersecting; mSync(); }).observe(marquee);
    document.addEventListener('visibilitychange', mSync);
    mSync();
  }

  /* ---------- 14. Новини: слайдер (нативний скрол зі snap), кнопки, перетягування мишею ---------- */
  const track = $('.ntrack');
  const newsBtns = $$('.news__btn');
  const newsCards = $$('.newscard', track);
  const newsNum = $('.news__count b');
  $('.news__count span').textContent = pad2(newsCards.length);
  const stepW = () => newsCards[1] ? newsCards[1].offsetLeft - newsCards[0].offsetLeft : track.clientWidth;
  // краї вимикають стрілки; номер — перша картка в кадрі
  const newsEdges = () => {
    const max = track.scrollWidth - track.clientWidth;
    newsBtns[0].disabled = track.scrollLeft <= 2;
    newsBtns[1].disabled = track.scrollLeft >= max - 2;
    newsNum.textContent = pad2(Math.round(track.scrollLeft / stepW()) + 1);
  };
  newsBtns.forEach(b => b.addEventListener('click', () => {
    track.scrollBy({ left: +b.dataset.step * stepW(), behavior: reduce ? 'auto' : 'smooth' });
  }));
  // Мишею трек можна тягнути; після перетягування клік по картці не спрацьовує
  let drag = null, dragged = false;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button) return;
    drag = { x: e.clientX, left: track.scrollLeft }; dragged = false;
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!dragged && Math.abs(dx) > 5) { dragged = true; track.classList.add('is-drag'); }
    if (dragged) track.scrollLeft = drag.left - dx;
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    if (!dragged) return;
    // доводимо до найближчої картки (snap на час перетягування вимкнено)
    const left = track.scrollLeft, w = stepW();
    track.classList.remove('is-drag');
    track.scrollLeft = left;
    track.scrollTo({ left: Math.round(left / w) * w, behavior: reduce ? 'auto' : 'smooth' });
  });
  track.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
  // На тачі фото стягується до фігури в картці, найближчій до центру треку, — коли трек у кадрі
  const touch = !matchMedia('(hover: hover)').matches;
  let trackSeen = false;
  const cutNearest = () => {
    if (!touch) return;
    const r = track.getBoundingClientRect(), mid = r.left + r.width / 2;
    let best = null, bd = Infinity;
    newsCards.forEach(c => { const cr = c.getBoundingClientRect(), d = Math.abs(cr.left + cr.width / 2 - mid); if (d < bd) { bd = d; best = c; } });
    newsCards.forEach(c => c.classList.toggle('is-cut', trackSeen && c === best));
  };
  if (touch) new IntersectionObserver(([e]) => { trackSeen = e.isIntersecting; cutNearest(); }, { rootMargin: '-25% 0px -25% 0px' }).observe(track);
  let nt = 0;
  track.addEventListener('scroll', () => { newsEdges(); clearTimeout(nt); nt = setTimeout(cutNearest, 80); }, { passive: true });
  addEventListener('resize', newsEdges);
  newsEdges();

  /* ---------- 15. Ховер кнопок: коло заливки росте від точки входу курсора й стягується в точку виходу ---------- */
  const fillXY = (el, e) => {
    if (e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', `${(e.clientX - r.left).toFixed(0)}px`);
    el.style.setProperty('--y', `${(e.clientY - r.top).toFixed(0)}px`);
  };
  $$('.btn, .req__btn, .mcard').forEach(el => {
    el.addEventListener('pointerenter', e => fillXY(el, e));
    el.addEventListener('pointerleave', e => fillXY(el, e));
    // фокус з клавіатури — від центру
    el.addEventListener('focus', () => { if (el.matches(':focus-visible')) { el.style.removeProperty('--x'); el.style.removeProperty('--y'); } });
  });
  // крок стрілки — у її напрямку
  const ARROW = { '↓': ['0px', '4px'], '↗': ['3px', '-3px'], '→': ['5px', '0px'] };
  $$('.btn > span[aria-hidden]').forEach(sp => {
    const a = ARROW[sp.textContent.trim()];
    if (a) { sp.parentElement.style.setProperty('--ax', a[0]); sp.parentElement.style.setProperty('--ay', a[1]); }
  });
})();

/* INSCIENCE — головна: спрайт іконок, скрол-сцени, фільтр, копіювання, фігури у футері */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
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

  // Силует кожної форми для фізики футера: точки контуру → опукла оболонка (в одиницях viewBox).
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
  // Лаймовий пагорб (розділ 7) — копія вмісту hero без h1, неактивна; іконки в копії міняються разом з оригіналом
  const heroDome = $('.hero__dome');
  if (!reduce) {
    const copy = $('.hero__content').cloneNode(true);
    $('h1', copy).remove();
    copy.inert = true;
    heroDome.appendChild(copy);
  }
  const heroIcoSets = $$('.hero__slot').map(s => $$('.hero__ico', s));
  const heroIcons = heroIcoSets[0];
  let heroIdx = 0, heroLeft = 0, heroTimer = 0, heroHp = 0;
  const heroStep = () => {
    // поки hero скролять — пауза
    if (heroHp > .05) { heroTimer = setTimeout(heroStep, 400); return; }
    heroIcoSets.forEach(set => {
      const cur = set[heroIdx];
      cur.classList.remove('is-on'); cur.classList.add('is-out');
      setTimeout(() => cur.classList.remove('is-out'), 700);
      set[(heroIdx + 1) % set.length].classList.add('is-on');
    });
    heroIdx = (heroIdx + 1) % heroIcons.length;
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

  /* ---------- 5. Напрямки: ілюстрації з шарів форм ---------- */
  const cards = $$('.pcard');   // картки проєктів: напрямок веде до своєї першої (блок 6)

  const svgEl = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };

  // Ілюстрація напрямку — шари форм брендбуку, як слайд 1.4 «Multiple ideas»: велика база → менша форма іншого
  // кольору → форма напрямку в кодовому кольорі (око синє, квітка лайм, стрілки рожеві, серце фіолетове).
  // Контури беремо з ілюстрацій брендбуку (assets/illustrations/, елемент за id) і зі спрайта (#i-<name>);
  // усе — у квадраті ART × ART. Шар: ill + ids — контури файлу ілюстрації; icon — форма спрайта (w — ширина
  // в частках квадрата, x / y — центр); c — колір; hole — колір отвору форми (типово білий, як зіниця ока);
  // r — поворот; hr — поворот на hover
  const ART = 320;
  const DIR_ART = {
    // Наука для всіх: всесвіт, який стає видимим — бордова хмарка, дві зірки, синє око з білою зіницею
    flow: [
      { ill: 'icon', ids: ['Vector'], c: 'maroon', hr: -4 },
      { ill: 'icon', ids: ['Vector_3'], c: 'hotpink', hr: -14 },
      { ill: 'icon', ids: ['Vector_4'], c: 'lime', hr: 12 },
      { icon: 'eye', c: 'blue', w: .8, x: .5, y: .48, hr: -6 },
    ],
    // Рівність у STEM: квітка в квітці — лаймова, червона, на ній нескінченність із двох рівних половин
    intersection: [
      { icon: 'flower', c: 'lime', hole: 'lime', w: 1, x: .5, y: .5, hr: 8 },
      { ill: 'flower', ids: ['Vector_3'], c: 'red', hr: -14 },
      { icon: 'infinity', c: 'purple', w: .62, x: .5, y: .5, hr: 10 },
    ],
    // Наука, бізнес і держава: три шари одне на одному — коло, «подушка», рожеві стрілки руху вперед
    grid: [
      { ill: 'combine', ids: ['Ellipse 15'], c: 'brown', hr: -4 },
      { ill: 'combine', ids: ['Vector'], c: 'green', hr: 14 },
      { icon: 'arrows', c: 'pink', w: .58, x: .52, y: .5, hr: -8 },
    ],
    // Здоровʼя: квітка, мʼяка подушка і фіолетове серце в центрі
    density: [
      { ill: 'lungs', ids: ['Vector'], c: 'blue', hr: -6 },
      { ill: 'lungs', ids: ['Vector_2'], c: 'pink', hr: 12 },
      { icon: 'heart', c: 'purple', w: .52, x: .5, y: .52, hr: -8 },
    ],
  };
  const ILL = [...new Set(Object.values(DIR_ART).flat().map(L => L.ill).filter(Boolean))];
  const illDocs = {};
  const illReady = Promise.all(ILL.map(n => fetch(`assets/illustrations/${n}.svg`).then(r => r.text()).then(txt => {
    illDocs[n] = new DOMParser().parseFromString(txt, 'image/svg+xml').documentElement;
  })));
  const vbOf = el => el.getAttribute('viewBox').split(/[\s,]+/).map(Number);
  // шар: зовнішня група — CSS-рух (поява, hover), внутрішня — розміщення в квадраті (атрибут transform)
  const artLayer = (L, k) => {
    const g = svgEl('g', { class: 'dir__layer' });
    g.style.cssText = `--k:${k};--hr:${L.hr || 0}deg;color:var(--${L.c})${L.hole ? `;--hole:var(--${L.hole})` : ''}`;
    const rot = L.r ? `rotate(${L.r} ${ART / 2} ${ART / 2}) ` : '';
    if (L.ill) {
      const doc = illDocs[L.ill], [, , vw, vh] = vbOf(doc), s = ART / Math.max(vw, vh);
      const inner = g.appendChild(svgEl('g', { transform: `${rot}translate(${(ART - vw * s) / 2} ${(ART - vh * s) / 2}) scale(${s})` }));
      L.ids.forEach(id => {
        const el = doc.querySelector(`[id="${id}"]`).cloneNode();
        el.removeAttribute('id');
        el.setAttribute('fill', 'currentColor');
        inner.appendChild(el);
      });
    } else {
      const [, , vw, vh] = vbOf(document.getElementById(`i-${L.icon}`)), w = L.w * ART, h = w * vh / vw;
      const inner = g.appendChild(svgEl('g', rot ? { transform: rot } : {}));
      inner.appendChild(svgEl('use', { href: `#i-${L.icon}`, x: L.x * ART - w / 2, y: L.y * ART - h / 2, width: w, height: h }));
    }
    return g;
  };
  const dirEls = $$('.dir');
  Promise.all([spriteReady, illReady]).then(() => dirEls.forEach(d => {
    const svg = svgEl('svg', { viewBox: `0 0 ${ART} ${ART}`, class: 'dir__ill' });
    DIR_ART[d.dataset.dir].forEach((L, k) => svg.appendChild(artLayer(L, k)));
    $('.dir__art', d).replaceChildren(svg);
  })).catch(err => console.warn('dir art', err));

  /* ---------- 5. «Про нас»: текст проявляється словами за скролом ---------- */
  // Слова переходять з приглушеного (той самий колір, низька непрозорість) у повний, прив'язано до скролу: почали,
  // коли верх тексту виринув з лайму (низ екрана), закінчили, коли його низ на 55% — поступово, на прохід тексту. Край проявлення м'який — на кілька слів.
  // Скрінрідер читає цілий текст, розбита на слова копія aria-hidden.
  // Без JS і при reduced motion — одразу повний колір
  const lead = $('[data-words]');
  const leadWords = [];
  if (lead && !reduce) {
    const text = lead.textContent.replace(/\s+/g, ' ').trim();
    const vis = mk('span', '');
    vis.setAttribute('aria-hidden', 'true');
    [...lead.childNodes].forEach(n => {
      if (n.nodeType !== 3) { const m = n.cloneNode(true); m.classList.add('about__w'); leadWords.push(vis.appendChild(m)); return; }
      n.textContent.replace(/\s+/g, ' ').split(/( )/).forEach(t => {
        if (t === ' ') vis.append(' ');
        else if (t) leadWords.push(vis.appendChild(Object.assign(mk('span', 'about__w'), { textContent: t })));
      });
    });
    lead.replaceChildren(Object.assign(mk('span', 'sr-only'), { textContent: text }), vis);
  }
  const LEAD_DIM = .14, LEAD_SOFT = 6;   // непрозорість приглушеного слова; ширина м'якого краю, слів
  let leadP = -1;
  // гілка скрол-циклу (frame): прогрес → непрозорість кожного слова (лише коли прогрес змінився)
  const leadScrub = vh => {
    const r = lead.getBoundingClientRect();
    const a = vh, end = vh * .55 - r.height;   // верх тексту в кінці проявлення
    const p = clamp((a - r.top) / Math.max(1, a - end));
    if (p === leadP) return;
    leadP = p;
    const n = leadWords.length, head = p * (n + LEAD_SOFT);
    leadWords.forEach((w, i) => { w.style.opacity = lerp(LEAD_DIM, 1, clamp((head - i) / LEAD_SOFT)).toFixed(3); });
  };

  /* ---------- 6. Проєкти: слайдер карток (стрілки й лічильник — розділ 14) ---------- */
  // Цифри на картках: коли плашки картки в кадрі (і по горизонталі теж — картки за краєм треку чекають), кожна
  // докручується з нуля (великі — з останніх 400) до свого значення, по черзі через 120 мс; суфікс («+») — як у розмітці
  if (!reduce) $$('.pcard__stats').forEach(dl => {
    const nums = $$('dt', dl).map(dt => {
      const t = dt.textContent.trim(), to = +t.replace(/\D/g, ''), suf = t.match(/\D*$/)[0];
      return { dt, to, suf, from: to > 1000 ? to - 400 : 0 };
    });
    const fmt = (n, v) => (n.to >= 1000 ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(v)) + n.suf;
    nums.forEach(n => { n.dt.textContent = fmt(n, n.from); });
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = now => {
        let done = true;
        nums.forEach((n, i) => {
          const k = clamp((now - t0 - 250 - i * 120) / 1400);
          if (k < 1) done = false;
          n.dt.textContent = fmt(n, Math.round(lerp(n.from, n.to, 1 - (1 - k) ** 3)));
        });
        if (!done) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: .6 });
    io.observe(dl);
  });
  // Hover / фокус картки — у CSS (--h). Тут — пропорції форм біля фото і перехід із «Напрямків» до картки
  const pgrid = $('.pgrid');
  const pad2 = n => String(n).padStart(2, '0');   // лічильники слайдерів «01 / 08»
  // Форма напрямку біля фото (003 Overlap): велика, плоска, у кодовому кольорі (розмітка); рамка рівної площі —
  // пропорції зі спрайта, щоб широке око не важило більше за серце
  spriteReady.then(() => $$('.pcard__shape', pgrid).forEach(el => {
    const vb = document.getElementById($('use', el).getAttribute('href').slice(1))?.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
    if (vb) el.style.setProperty('--sq', Math.sqrt(vb[2] / vb[3]).toFixed(3));
  }));
  // Напрямок веде до «Проєктів», відфільтрованих за ним (data-dirs; фільтр — розділ 14); без JS — просто до «Проєктів».
  // Фокус — на обрану пілюлю фільтра: звідти Tab іде далі до карток
  dirEls.forEach(d => d.addEventListener('click', e => {
    if (!cards.some(c => c.dataset.dirs.split(' ').includes(d.dataset.dir))) return;
    e.preventDefault();
    const sec = $('#projects');
    revealNow(sec);
    filterProjects(d.dataset.dir);
    sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    $(`.ptab[data-dir="${d.dataset.dir}"]`, sec)?.focus({ preventScroll: true });
  }));


  /* ---------- 7. Скрол-цикл: лаймовий пагорб hero, лід «Про нас», «Підтримати», тема хедера ---------- */
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
  const newsSec = $('#news'), mediaSec = $('#media');
  const support = $('.support');
  // форми «Про нас пишуть» спускаються, коли секція доїхала верхом до краю екрана; скрол назад вище секції — повертаються вгору
  if (!reduce && mediaSec && !mediaSec.hidden) {
    mediaSec.classList.add('is-drop');
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) mediaSec.classList.add('is-landed');
      else if (e.boundingClientRect.top > 0) mediaSec.classList.remove('is-landed');
    }, { rootMargin: '0px 0px -92% 0px' }).observe(mediaSec);
  }
  const supportInner = $('.support__inner');
  let supportIn = false;

  function supportShow(instant) {
    supportIn = true;
    support.classList.add('is-in');
    supportInner.classList.add('in');
    if (instant) supportInner.classList.add('is-instant');
  }
  // фокус з клавіатури всередині — текст і кнопки мають бути видно одразу
  supportInner.addEventListener('focusin', () => { if (!supportIn) supportShow(true); });

  // Синє поле наїжджає рівним краєм (CSS); текст не скрабимо: один тригер — рядки заголовка й ліду, потім реквізити (CSS);
  // прийшли якорем — одразу на місці
  function renderSupport(sp) {
    if (sp > .4 && !supportIn) supportShow('instant' in supportInner.dataset);
  }
  const heroBottom = $('.hero__bottom');
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

    // HERO стоїть один екран (hp 0 → 1): знизу підіймається лаймовий пагорб — коло з центром на пів екрана нижче краю,
    // від радіуса пів екрана (дуга якраз торкається низу) до кутів екрана; нижній текст гасне за перші 30%
    const hp = reduce ? 0 : progress(hero);
    heroHp = hp;
    heroLensScroll(hp);
    let domeTop = vh;
    if (!reduce) {
      const cy = vh * 1.5, r = lerp(vh * .5, Math.hypot(vw / 2, cy) + 20, hp);
      domeTop = cy - r;
      heroDome.style.clipPath = `circle(${r.toFixed(1)}px at 50% ${cy.toFixed(1)}px)`;
      // «Про нас» заходить на hero ще під час пагорба — видно лише всередині тієї ж дуги; лайм залив екран — без обрізки
      about.style.clipPath = hp < 1 ? `circle(${r.toFixed(1)}px at 50% ${(cy - about.getBoundingClientRect().top).toFixed(1)}px)` : '';
      const t = clamp(hp / .3);
      heroBottom.style.opacity = t ? (1 - t).toFixed(3) : '';
      heroBottom.style.transform = t ? `translateY(${(30 * t).toFixed(1)}px)` : '';
      heroBottom.style.visibility = t >= 1 ? 'hidden' : '';
    }

    // ПРО НАС: текст — словами за скролом
    if (leadWords.length) leadScrub(vh);

    // ПІДТРИМКА
    const sr = support.getBoundingClientRect();
    const sp = reduce ? 1 : clamp((vh - sr.top) / (vh * 1.05));
    renderSupport(sp);

    // Тема хедера за секцією під ним
    const y = 40;
    let theme = 'light', mark = false, lime = false, glass = false;
    for (let s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) {
        if (s === hero && domeTop > y) {
          mark = scrollY < 8;         // лише на самому верху в шапці зірка з «C»; щойно гортаємо — повне лого
          theme = 'blue';
        }
        else if (s === support) theme = 'solid-blue';
        else if (s === hero || s.dataset.theme === 'field') {
          glass = s === mediaSec;   // над «Про нас пишуть» — градієнтний блюр замість суцільного тла
          if (s === hero) s = about;   // пагорб уже під шапкою — шапка лаймова, як «Про нас»
          theme = 'field';
          const field = s.style.getPropertyValue('--field');
          lime = field.includes('--lime');   // лаймова «Підтримати» на лаймовому полі зливається — CSS перефарбує її
          hdr.style.setProperty('--field', field);
          hdr.style.setProperty('--on', s.style.getPropertyValue('--on'));
          hdr.style.setProperty('--off', s.style.getPropertyValue('--off') || 'var(--ink)');   // текст CTA на тлі --on
        }
        else theme = s.dataset.theme === 'blue' ? 'solid-blue' : 'light';
        break;
      }
    }
    if (hdr.dataset.theme !== theme) hdr.dataset.theme = theme;
    hdr.classList.toggle('is-mark', mark);
    hdr.classList.toggle('is-lime', lime);
    hdr.classList.toggle('is-glass', glass);

    // Футер: хедер більше не кріпиться — стоїть над купою фігур і їде вгору разом зі сторінкою, не перекриваючи їх
    const lift = Math.min(0, ftr.getBoundingClientRect().top - pileRise - hdr.offsetHeight);
    const lifted = !!lift && !hdr.classList.contains('is-open');
    hdr.style.transform = lifted ? `translateY(${lift}px)` : '';
    hdr.classList.toggle('is-lifted', lifted);   // випадаючий список «Про нас» ховаємо, поки шапку їде вгору — інакше висить обрізаний зверху
  }

  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { frame(); ticking = false; }); } };
  addEventListener('scroll', onScroll, { passive: true });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { sizeField(); frame(); }, 120); });
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

  /* ---------- 13. Стрічка партнерів: поза кадром і на прихованій вкладці стоїть (hover і фокус — у CSS) ---------- */
  const marquee = $('.marquee');
  // поява по одному: копія списку (для безшовної стрічки) — з тими самими кроками, тож стрічка рушає, щойно вийшло останнє лого
  const mItems = $$('.marquee__list', marquee).map(l => $$('li', l));
  mItems.forEach(list => list.forEach((li, i) => li.style.setProperty('--i', i)));
  marquee.style.setProperty('--run', `${800 + (mItems[0].length - 1) * 70}ms`);
  if (!reduce) {   // reduced motion — статичний грід, стрічка не рухається
    let mSeen = false;
    const mSync = () => marquee.classList.toggle('is-off', !mSeen || document.hidden);
    new IntersectionObserver(([e]) => { mSeen = e.isIntersecting; mSync(); }).observe(marquee);
    document.addEventListener('visibilitychange', mSync);
    mSync();
  }

  /* ---------- 14. Слайдери проєктів, новин і «Про нас пишуть»: нативний скрол зі snap, стрілки, лічильник, перетягування мишею ---------- */
  const slider = sec => {
    const track = $('.track', sec), btns = $$('.abtn', sec), all = [...track.children], num = $('.tfoot__count b', sec);
    let items = all;   // видимі картки (фільтр проєктів ховає решту)
    // картки можуть бути різної ширини (проєкти): крок — до сусідньої картки, номер — найближча до лівого краю
    const lefts = () => items.map(el => el.offsetLeft - items[0].offsetLeft);
    const nearest = left => lefts().reduce((b, x, i, a) => Math.abs(x - left) < Math.abs(a[b] - left) ? i : b, 0);
    const go = (i, left = track.scrollLeft) => track.scrollTo({ left: lefts()[clamp(i, 0, items.length - 1)] ?? left, behavior: reduce ? 'auto' : 'smooth' });
    // краї вимикають стрілки; номер — перша картка в кадрі
    const edges = () => {
      const max = track.scrollWidth - track.clientWidth;
      btns[0].disabled = track.scrollLeft <= 2;
      btns[1].disabled = track.scrollLeft >= max - 2;
      num.textContent = pad2(nearest(track.scrollLeft) + 1);
    };
    btns.forEach(b => b.addEventListener('click', () => go(nearest(track.scrollLeft) + +b.dataset.step)));
    // Мишею трек можна тягнути; після перетягування клік по картці не спрацьовує
    let drag = null, dragged = false;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button || track.scrollWidth <= track.clientWidth) return;   // плитка («Про нас пишуть» на десктопі) не тягнеться
      drag = { x: e.clientX, left: track.scrollLeft }; dragged = false;
    });
    track.addEventListener('dragstart', e => e.preventDefault());   // посилання й лого не тягнуться як файли
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
      const left = track.scrollLeft;
      track.classList.remove('is-drag');
      track.scrollLeft = left;
      go(nearest(left));
    });
    track.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
    track.addEventListener('scroll', edges, { passive: true });
    addEventListener('resize', edges);
    // після фільтра: лічильник — по видимих, трек — на початок
    const refresh = () => {
      items = all.filter(el => !el.hidden);
      $('.tfoot__count span', sec).textContent = pad2(items.length);
      track.scrollLeft = 0;
      edges();
    };
    refresh();
    return { track, refresh };
  };
  const sliders = new Map([$('#projects'), newsSec, mediaSec].filter(s => !s.hidden).map(s => [s, slider(s)]));

  // Фільтр проєктів за напрямком: картки інших напрямків ховаємо, трек — на початок, видимі зʼявляються знову
  // (як при першій появі — у кадрі зліва направо). Пілюлі виходять по одній, як форми футера
  const projSlider = sliders.get($('#projects'));
  const ptabs = $$('.ptab');
  ptabs.forEach((b, i) => { b.classList.add('pop'); b.style.setProperty('--i', i); });
  function filterProjects(dir) {
    ptabs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dir === dir)));
    cards.forEach(c => { c.hidden = true; });
    void projSlider.track.offsetWidth;   // з display:none поява картки і її форм програється заново
    let k = 0;
    cards.forEach(c => {
      c.hidden = !!dir && !c.dataset.dirs.split(' ').includes(dir);
      if (!c.hidden) c.style.setProperty('--col', Math.min(k++, 2));
    });
    projSlider.refresh();
  }
  ptabs.forEach(b => b.addEventListener('click', () => { if (b.getAttribute('aria-pressed') !== 'true') filterProjects(b.dataset.dir); }));
  filterProjects('');

  /* ---------- 15. Ховер кнопок: коло заливки росте від точки входу курсора й стягується в точку виходу ---------- */
  const fillXY = (el, e) => {
    if (e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', `${(e.clientX - r.left).toFixed(0)}px`);
    el.style.setProperty('--y', `${(e.clientY - r.top).toFixed(0)}px`);
  };
  // картки новини й напрямку — те саме коло під вмістом; фокус приходить на посилання всередині, тож слухаємо focusin
  $$('.btn, .link, .req__btn, .mcard, .abtn, .newscard, .dir').forEach(el => {
    el.addEventListener('pointerenter', e => fillXY(el, e));
    el.addEventListener('pointerleave', e => fillXY(el, e));
    // фокус з клавіатури — від центру
    el.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) { el.style.removeProperty('--x'); el.style.removeProperty('--y'); } });
  });
  // крок стрілки — у її напрямку
  const ARROW = { '↓': ['0px', '4px'], '↗': ['3px', '-3px'], '→': ['5px', '0px'] };
  $$('.btn > span[aria-hidden]').forEach(sp => {
    const a = ARROW[sp.textContent.trim()];
    if (a) { sp.parentElement.style.setProperty('--ax', a[0]); sp.parentElement.style.setProperty('--ay', a[1]); }
  });
})();

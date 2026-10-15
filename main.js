/* INSCIENCE — головна: спрайт іконок, скрол-сцени, фільтр, копіювання, фігури у футері */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  const range = (p, a, b) => clamp((p - a) / (b - a));   // відрізок [a, b] прогресу → 0…1
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

  /* ---------- 3. Розбивка тексту на слова для появи ---------- */
  $$('.split').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = part;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.classList.contains('kw__shape')) {
          n.style.setProperty('--i', i);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
  });

  /* ---------- 4. Поява при скролі ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .18, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .split, .dirs__grid, .pcard').forEach(el => reduce ? el.classList.add('in') : io.observe(el));

  /* ---------- 5. Напрямки → фільтр проєктів ---------- */
  const cards = $$('.pcard');
  const chips = $$('.chip');
  const projects = $('#projects');
  const dirsGrid = $('.dirs__grid');
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
  $$('.dir').forEach(d => {
    const name = d.dataset.dir, disc = $('.dir__disc', d);
    if (name === 'flow') { disc.replaceChildren(buildFlow()); return; }
    fetch(`assets/patterns/${name}.svg`).then(r => r.text()).then(txt => {
      const doc = new DOMParser().parseFromString(txt, 'image/svg+xml').documentElement;
      const svg = svgEl('svg', { viewBox: doc.getAttribute('viewBox'), class: 'dir__pat' });
      svg.innerHTML = doc.innerHTML
        .replace(/id="([^"]+)"/g, `id="pat-${name}-$1"`)
        .replace(/url\(#([^)]+)\)/g, `url(#pat-${name}-$1)`);
      disc.replaceChildren(svg);   // у DOM — щоб getBBox працював
      PATTERN_GROUP[name](svg);
    }).catch(err => console.warn('pattern', name, err));
  });

  // Фільтр: лишаються лише проєкти табу. Сітка перебудовується (FLIP): ті, що лишились, доїжджають на нові місця,
  // ті, що йдуть, гаснуть на старому місці поверх сітки, нові — проявляються
  const pgridEl = $('.pgrid');
  const hits = (c, f) => f === 'all' || c.dataset.dirs.split(' ').includes(f);
  const FLIP = { duration: 560, easing: 'cubic-bezier(.2,.7,.1,1)' };
  function applyFilter(f) {
    chips.forEach(c => {
      const on = c.dataset.filter === f;
      c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on);
    });
    renderStats(f);
    // попередній фільтр ще анімується — доводимо його до кінця
    cards.forEach(c => {
      c.getAnimations().forEach(an => an.cancel());
      if (c.classList.contains('is-leaving')) {
        c.hidden = true; c.classList.remove('is-leaving');
        ['left', 'top', 'width', 'height'].forEach(k => c.style.removeProperty(k));
      }
    });
    if (reduce) { cards.forEach(c => { c.hidden = !hits(c, f); }); setCols(); return; }
    const g = pgridEl.getBoundingClientRect();
    const before = new Map(cards.filter(c => !c.hidden).map(c => [c, c.getBoundingClientRect()]));
    const leaving = cards.filter(c => !c.hidden && !hits(c, f));
    const entering = cards.filter(c => c.hidden && hits(c, f));
    entering.forEach(c => { c.hidden = false; });
    leaving.forEach(c => {
      const r = before.get(c);
      c.classList.add('is-leaving');
      Object.assign(c.style, { left: `${r.left - g.left}px`, top: `${r.top - g.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    });
    // нова розкладка
    cards.forEach(c => {
      if (c.hidden || leaving.includes(c)) return;
      const r = c.getBoundingClientRect(), o = before.get(c);
      if (!o) { c.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { ...FLIP, delay: 160, fill: 'backwards' }); return; }
      const dx = o.left - r.left, dy = o.top - r.top;
      if (Math.abs(dx) + Math.abs(dy) > 1) c.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], FLIP);
    });
    leaving.forEach(c => {
      c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' })
        .onfinish = () => {
          c.hidden = true; c.classList.remove('is-leaving');
          ['left', 'top', 'width', 'height'].forEach(k => c.style.removeProperty(k));
          c.getAnimations().forEach(an => an.cancel());
        };
    });
    setCols();
  }
  chips.forEach(c => c.addEventListener('click', () => applyFilter(c.dataset.filter)));

  // Цифри впливу за табом: старі гаснуть, нові «нараховуються»; немає цифр — рядок згортається
  const pstats = $('.pstats');
  const pstatEls = $$('.pstat');
  let statsSeen = false;
  const fmtStat = (b, v) => b.dataset.fmt === 'mln'
    ? `${v.toFixed(1).replace('.', ',')} млн`
    : `${Math.round(v).toLocaleString('uk-UA').replace(/\s/g, ' ')}${b.dataset.suf || ''}`;
  function countUp(b) {
    const to = parseFloat(b.dataset.to), t0 = performance.now(), dur = reduce ? 0 : 1200;
    b._t0 = t0;
    const tick = now => {
      if (b._t0 !== t0) return;   // уже запущено новий відлік
      const k = dur ? easeOut(clamp((now - t0) / dur)) : 1;
      b.textContent = fmtStat(b, to * k);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function renderStats(f) {
    const show = pstatEls.filter(el => f === 'all' || el.dataset.dir === f);
    pstats.classList.toggle('is-empty', !show.length);
    pstatEls.forEach(el => {
      const on = show.includes(el), was = !el.hidden;
      el.hidden = !on;
      if (on && statsSeen && !was) {
        if (!reduce) el.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { ...FLIP, delay: 80 * show.indexOf(el), fill: 'backwards' });
        countUp($('b', el));
      }
    });
  }
  // перший показ — відлік, коли рядок у кадрі
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    o.disconnect(); statsSeen = true;
    pstatEls.filter(el => !el.hidden).forEach(el => countUp($('b', el)));
  }, { threshold: .4 }).observe(pstats);

  // Номер колонки картки — для каскаду появи (60 мс на колонку)
  const pgrid = $('.pgrid');
  const setCols = () => {
    const n = getComputedStyle(pgrid).gridTemplateColumns.split(' ').length;
    cards.forEach(c => c.style.setProperty('--col', Math.round((c.offsetLeft - pgrid.offsetLeft) / (pgrid.clientWidth / n))));
  };
  setCols();

  // Чипи на мобільному: затухання справа зникає, коли доскролили до кінця
  const chipsBox = $('.chips');
  const chipsEnd = () => chipsBox.classList.toggle('is-end', chipsBox.scrollLeft + chipsBox.clientWidth >= chipsBox.scrollWidth - 4);
  chipsBox.addEventListener('scroll', chipsEnd, { passive: true });
  chipsEnd();

  // Параллакс фото/форми: лише десктоп, лише картки в кадрі (сам рух — у frame())
  const parallaxMQ = matchMedia('(min-width: 1000px) and (hover: hover)');
  const cardsInView = new Set();
  cards.forEach(c => { c._over = $('.pcard__over', c); c._shape = $('.pcard__shape', c); });
  if (!reduce) {
    const pio = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? cardsInView.add(e.target) : cardsInView.delete(e.target))));
    cards.forEach(c => pio.observe(c));
  }
  parallaxMQ.addEventListener('change', () => cards.forEach(c => { c._over.style.transform = ''; if (c._shape) c._shape.style.transform = ''; }));
  let rzP;
  addEventListener('resize', () => { clearTimeout(rzP); rzP = setTimeout(() => { setCols(); chipsEnd(); }, 150); });

  // Ритми дисків крутяться лише поки сітка в кадрі (і лише на hover/focus — це в CSS)
  if (!reduce) new IntersectionObserver(([e]) => dirsGrid.classList.toggle('is-live', e.isIntersecting)).observe(dirsGrid);

  // Колбек після завершення плавного скролу: scrollend або запасний таймер
  const afterScroll = cb => {
    let done = false, t = 0;
    const fin = () => { if (done) return; done = true; clearTimeout(t); removeEventListener('scrollend', fin); cb(); };
    addEventListener('scrollend', fin);
    t = setTimeout(fin, 'onscrollend' in window ? 2500 : 900);
  };
  // Де зупиниться сторінка, коли доскролимо до #projects (з урахуванням scroll-padding під хедер)
  const projectsY = () => {
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    return clamp(scrollY + projects.getBoundingClientRect().top - pad, 0, document.documentElement.scrollHeight - innerHeight);
  };

  // Бейдж летить у свій чип (FLIP): чип рахуємо там, де він опиниться після скролу
  function flyBadge(d, f, endY) {
    const src = $('.dir__badge svg', d), chip = chips.find(c => c.dataset.filter === f);
    if (!src || !chip || !src.animate) return;
    const a = src.getBoundingClientRect(), b = $('svg', chip).getBoundingClientRect();
    const fly = src.cloneNode(true);
    fly.classList.add('fly');
    fly.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;color:${getComputedStyle(src).color}`;
    document.body.appendChild(fly);
    const tx = b.left + b.width / 2 - (a.left + a.width / 2);
    const ty = b.top + b.height / 2 + (scrollY - endY) - (a.top + a.height / 2);
    const k = b.width / a.width;
    fly.animate([
      { transform: 'none' },
      { transform: `translate(${tx * .5}px,${ty * .5 - 80}px) scale(${(1 + k) / 2 * 1.15}) rotate(-180deg)`, offset: .5 },
      { transform: `translate(${tx}px,${ty}px) scale(${k}) rotate(-360deg)` },
    ], { duration: 900, easing: 'cubic-bezier(.2,.7,.1,1)' }).onfinish = () => fly.remove();
  }

  $$('.dir').forEach(d => d.addEventListener('click', e => {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // нова вкладка — як звичайне посилання
    e.preventDefault();
    const f = d.dataset.dir;
    const chip = chips.find(c => c.dataset.filter === f);
    const land = () => {
      applyFilter(f);
      chip.focus({ preventScroll: true });
      chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });   // на мобільному чип може бути за краєм стрічки
    };
    if (reduce) { projects.scrollIntoView(); land(); return; }
    const endY = projectsY();
    if (Math.abs(endY - scrollY) < 4) { land(); return; }
    flyBadge(d, f, endY);
    scrollTo({ top: endY, behavior: 'smooth' });
    afterScroll(land);   // фільтр — після прибуття, щоб було видно підсвічування збігів
  }));

  /* ---------- 6. Форми напрямків (кільце в «Підтримати») ---------- */
  const FORMS = [
    { name: 'flower', c: 'var(--lime)' },
    { name: 'heart', c: 'var(--purple)' },
    { name: 'eye', c: 'var(--blue)' },
  ];
  // Форма зі спрайта як окремий svg
  const shapeEl = (name, cls, color) => {
    const el = document.createElementNS(NS, 'svg');
    el.setAttribute('class', cls);
    el.style.setProperty('--c', color);
    const use = document.createElementNS(NS, 'use');
    use.setAttribute('href', `#i-${name}`);
    el.appendChild(use);
    return el;
  };

  /* ---------- 7. Скрол-цикл: hero, кульмінація, повернення синього, тема хедера ---------- */
  const hero = $('.hero');
  const heroBlue = $('.hero__blue');
  const heroContent = $('.hero__content');
  const heroDot = $('.hero__dot');
  const heroHidden = $('.hero__hidden');
  const heroLens = $('.hero__lens');
  const heroMag = $('.hero__mag');
  const heroRing = $('.hero__ring');
  const heroPortal = $('.hero__portal');
  const about = $('#about');
  const aboutForms = $$('.about__form', about);
  aboutForms.forEach(el => { el._k = parseFloat(el.style.getPropertyValue('--k')) || 0; });
  // одноколірна копія прихованих форм — живе в лупі
  const heroTone = $('.hero__shapes--tone');
  const heroColor = heroTone.cloneNode(true);
  heroColor.className = 'hero__shapes hero__shapes--color';
  heroMag.appendChild(heroColor);
  const heroShapes = [heroTone, heroColor];
  // Портал: копія сцени «Про нас» (уже в кінцевому стані) — її видно крізь коло, що росте.
  // Справжня секція заходить під кінець hero і з'являється, щойно коло покрило весь екран.
  let aboutForced = false;
  if (!reduce) {
    document.documentElement.classList.add('has-portal');
    const clone = about.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('about--clone');
    $$('[id]', clone).forEach(e => e.removeAttribute('id'));
    $$('.split, .reveal', clone).forEach(e => e.classList.add('in'));
    heroPortal.appendChild(clone);
    // клавіатура зайшла в «Про нас» до кінця порталу — доводимо скрол до справжньої секції
    about.addEventListener('focusin', () => { if (heroHp < 1) scrollTo({ top: scrollY + about.getBoundingClientRect().top }); });
  }
  const support = $('.support');
  const supportBg = $('.support__bg');
  const supportRing = $('.support__ring');
  // кільце з форм напрямків: око / квітка / серце
  const RING_N = 42;
  const ringEls = Array.from({ length: RING_N }, (_, i) => {
    const f = FORMS[i % 3];
    return supportRing.appendChild(shapeEl(f.name, '', f.c));
  });
  let lastSp = -1, supportIn = false, supportTop = Infinity;   // supportTop — верх синього кола у вʼюпорті

  // Синє коло розкривається з патерну; кільце форм іде по краю на R + 28px, під синім
  function renderSupport(sp, sr, vw, vh) {
    // текст не скрабимо: один тригер — заголовок, потім грід (CSS)
    if (sp > .7 && !supportIn) { supportIn = true; support.classList.add('is-in'); }
    if (sp === lastSp) return;
    lastSp = sp;
    const k = range(sp, 0, .7);   // до тригера тексту синє вже повне — білий текст не ляже на папір
    const sR = Math.hypot(vw / 2, Math.max(sr.height * .85, vh));
    const R = sR * Math.pow(k, 1.8);
    // шари заходять вище секції (--up), тож центр кола рахуємо від їхнього верху
    const up = -supportBg.offsetTop;
    const cx = sr.width / 2, cy = up + sr.height * .35, rr = R + 28;
    supportTop = k > 0 ? sr.top + sr.height * .35 - R : Infinity;
    supportBg.style.clipPath = k >= 1 && !up ? 'none' : `circle(${R}px at 50% ${cy}px)`;
    const fade = 1 - range(k, .85, 1);
    supportRing.style.opacity = k > 0 ? fade : 0;
    if (!(k > 0) || !fade) return;
    // поки коло мале, форми менші — щоб не налазили одна на одну
    const size = Math.min(1, (2 * Math.PI * rr / RING_N) * .6 / 24);
    ringEls.forEach((el, i) => {
      const a = i / RING_N * Math.PI * 2 + k * .6;
      el.style.transform = `translate3d(${cx + Math.cos(a) * rr}px,${cy + Math.sin(a) * rr}px,0) rotate(${a + Math.PI / 2}rad) scale(${size})`;
    });
  }
  const hdr = $('.hdr');
  const sections = $$('main > section, .ftr');

  const progress = el => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  };

  function frame() {
    const vw = innerWidth, vh = innerHeight;
    const diag = Math.hypot(vw, vh) / 2 * 1.04;

    // HERO, фаза 1 (hp 0–.5): пауза → синій стискається в коло, прихована наука стягується в центр → коло з оком
    const hp = reduce ? 0 : progress(hero);
    heroHp = hp;
    const q = range(hp, 0, .5);
    const rMin = Math.min(vw, vh) * .09;
    // фаза 2 (hp .56–1): дзеркально — та сама крива; коло росте, усередині відкривається «Про нас»
    const t2 = range(hp, .56, 1);
    const te = ease(t2);
    const ri = lerp(0, diag, te);                      // портал
    const rb = te > 0 ? ri + rMin * (1 - te) : lerp(diag, rMin, ease(range(q, .12, .85)));   // синій обідок тоншає
    const clip = `circle(${rb}px at 50% 50%)`;
    heroBlue.style.clipPath = clip;
    heroHidden.style.clipPath = clip;
    heroHidden.style.opacity = 1 - range(q, .3, .75);
    const hs = ease(range(q, .12, .72));
    const shapesT = `scale(${lerp(1, .3, hs)}) rotate(${hs * -24}deg)`;
    heroShapes.forEach(el => { el.style.transform = shapesT; });
    const hc = range(q, .12, 1);
    heroContent.style.opacity = 1 - range(q, .12, .42);
    heroContent.style.transform = `translateY(${-hc * 80}px) scale(${1 - hc * .05})`;
    const dp = range(q, .55, .85);
    // око росте разом із колом і розчиняється
    heroDot.style.opacity = dp * (1 - range(t2, 0, .35));
    heroDot.style.transform = te > 0
      ? `scale(${rb / rMin})`
      : `scale(${lerp(.4, 1, easeOutBack(dp))}) rotate(${(1 - dp) * -90}deg)`;
    if (!reduce) {
      heroPortal.style.visibility = te > 0 ? 'visible' : 'hidden';
      heroPortal.style.clipPath = `circle(${ri}px at 50% 50%)`;
      // справжня секція — лише коли портал повністю відкритий (кадри ідентичні, тож стик невидимий)
      const open = hp >= .999;
      about.style.opacity = open ? '' : '0';
      about.style.pointerEvents = open ? '' : 'none';
      if (hp > .5 && !aboutForced) {
        aboutForced = true;
        $$('.split, .reveal', about).forEach(el => { el.classList.add('in'); io.unobserve(el); });
      }
    }

    // ПРОЄКТИ: легкий параллакс фото й форми — лише десктоп і лише картки в кадрі
    if (!reduce && parallaxMQ.matches) for (const c of cardsInView) {
      const r = c.getBoundingClientRect();
      const k = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
      c._over.style.transform = `translate3d(0,${(k * -14).toFixed(1)}px,0)`;
      if (c._shape) c._shape.style.transform = `translate3d(0,${(k * 18).toFixed(1)}px,0)`;
    }

    // ПРО НАС: великі форми поля трохи пливуть (лише поки секція в кадрі)
    if (!reduce) {
      const ar = about.getBoundingClientRect();
      if (ar.bottom > 0 && ar.top < vh) {
        const k = (ar.top + ar.height / 2 - vh / 2) / vh;
        aboutForms.forEach(el => { el.style.transform = `translate3d(0,${(k * el._k * vh).toFixed(1)}px,0)`; });
      }
    }

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
        if (s === hero) {
          if (hp >= .999) continue;   // портал відкрито — під хедером уже «Про нас»
          mark = true;                // на hero в шапці лише зірка з «C»
          theme = hp < .06 ? 'blue' : 'light';
        }
        else if (s === support) theme = sp >= .7 ? 'solid-blue' : 'light';
        else if (s.dataset.theme === 'field') {
          theme = 'field';
          hdr.style.setProperty('--field', s.style.getPropertyValue('--field'));
          hdr.style.setProperty('--on', s.style.getPropertyValue('--on'));
        }
        else theme = s.dataset.theme === 'blue' ? 'solid-blue' : 'light';
        break;
      }
    }
    // синє коло «Підтримати» піднялося під хедер ще над «Партнерами»
    if (theme === 'light' && sr.top > y && supportTop < hdr.offsetHeight) theme = 'solid-blue';
    if (hdr.dataset.theme !== theme) hdr.dataset.theme = theme;
    hdr.classList.toggle('is-mark', mark);
  }

  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { frame(); ticking = false; }); } };
  addEventListener('scroll', onScroll, { passive: true });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { lastSp = -1; frame(); }, 120); });
  frame();

  // Фокус у hero, коли сцену вже прокручено, — повертаємо її на початок: білий текст має лежати на синьому
  heroContent.addEventListener('focusin', () => {
    if (heroHp > .05) scrollTo({ top: scrollY + hero.getBoundingClientRect().top });
  });

  /* ---------- 8. Медіа: ховаємо секцію, якщо матеріалів < 3 ---------- */
  if ($$('#media .mcard').length < 3) $('#media').hidden = true;

  /* ---------- 9. Копіювання реквізитів ---------- */
  const toast = $('.toast');
  let tt;
  $$('.req__row').forEach(row => {
    const btn = $('.req__btn', row), val = $('[data-copy]', row), label = $('dt', row).textContent;
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(val.textContent.trim()); }
      catch { const r = document.createRange(); r.selectNodeContents(val); getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand('copy'); }
      btn.textContent = 'Скопійовано ✓'; btn.classList.add('is-done');
      setTimeout(() => { btn.textContent = 'Скопіювати'; btn.classList.remove('is-done'); }, 1800);
      toast.textContent = `${label} скопійовано`;
      toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 1800);
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
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

    // Силует кожної форми: точки контуру → опукла оболонка (в одиницях viewBox)
    let outlines = null;
    const buildOutlines = () => {
      const probe = document.createElementNS(NS, 'svg');
      probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden';
      document.body.appendChild(probe);
      outlines = {};
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
    };

    let engine, runner, shapes = [], timers = [], W = 0, H = 0, started = false, visible = false, lastVW = innerWidth;
    let mouse = null, mc = null, base = 60, nextColor = () => 'lime';

    const render = () => {
      for (const s of shapes) {
        const { x, y } = s.body.position;
        // Підстраховка: фігуру викинуло за межі — повертаємо зверху
        if (y > H + 300 || x < -300 || x > W + 300) {
          Body.setPosition(s.body, { x: W / 2, y: -s.size }); Body.setVelocity(s.body, { x: 0, y: 0 });
        }
        s.el.style.transform = `translate(${x}px,${y}px) rotate(${s.body.angle}rad) translate(${-s.cx}px,${-s.cy}px)`;
      }
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
      const s = { body, el, size, cx: c.x, cy: c.y };
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
      shapes.forEach(s => s.el.remove()); shapes = [];
      zone.classList.remove('is-dragging', 'is-static');
      engine = runner = mc = null;
    };

    // Стартуємо, коли зона з'являється на екрані; поза екраном — пауза
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !started) {
        started = true;
        spriteReady.then(() => { if (!outlines) buildOutlines(); init(); });
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

  /* ---------- 11. Hero: лінза, що робить науку видимою ---------- */
  // Курсор — лінза: під нею приховані форми проявляються в кольорі. На тачі лінза мандрує сама.
  if (!reduce) {
    const heroSticky = $('.hero__sticky');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let mx = 0, my = 0, follow = false, lx = innerWidth * .62, ly = innerHeight * .4, lr = 0, raf = 0;
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      mx = e.clientX; my = e.clientY; follow = true;
    }, { passive: true });
    // курсор пішов із вікна — лінза знову мандрує
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) follow = false; });

    const loop = now => {
      raf = requestAnimationFrame(loop);
      if (heroHp > .45) return;
      const r = heroSticky.getBoundingClientRect();
      const R = Math.min(r.width, r.height) * (fine.matches ? .16 : .22);
      let tx, ty;
      if (follow && fine.matches) { tx = mx - r.left; ty = my - r.top; }
      else {
        // фігура Ліссажу 1:2, повний цикл ≈ 9 с
        const t = now / 9000 * Math.PI * 2;
        tx = r.width * (.5 + .32 * Math.sin(t));
        ty = r.height * (.46 + .26 * Math.sin(2 * t + Math.PI / 2));
      }
      lx += (tx - lx) * .12; ly += (ty - ly) * .12; lr += (R - lr) * .12;
      heroLens.style.clipPath = `circle(${lr.toFixed(1)}px at ${lx.toFixed(1)}px ${ly.toFixed(1)}px)`;
      // лупа: копія шару збільшена ×1.18 від центру лінзи
      heroMag.style.transform = `translate(${lx}px,${ly}px) scale(1.18) translate(${-lx}px,${-ly}px)`;
      // тонкий край лінзи (елемент розміру R, масштабуємо — без layout)
      if (heroRing._r !== R) { heroRing._r = R; heroRing.style.width = heroRing.style.height = `${R * 2}px`; }
      heroRing.style.transform = `translate(${lx - R}px,${ly - R}px) scale(${(lr / R).toFixed(3)})`;
    };
    // цикл живе, лише поки hero в кадрі
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !raf) raf = requestAnimationFrame(loop);
      else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(hero);
  }

  /* ---------- 12. Мобільне меню (≤1180px) ---------- */
  const burger = $('.hdr__burger');
  const menu = $('#menu');
  const menuLinks = $$('a', menu);
  const menuOpen = () => menu.classList.contains('is-open');
  function setMenu(open, restoreFocus = true) {
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
    const f = [burger, ...menuLinks];
    const i = f.indexOf(document.activeElement);
    const out = e.shiftKey ? i <= 0 : (i < 0 || i === f.length - 1);
    if (out) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
  });
  matchMedia('(min-width: 1181px)').addEventListener('change', e => { if (e.matches && menuOpen()) setMenu(false, false); });

  /* ---------- 13. Тікер партнерів: пауза по тапу (hover і фокус — у CSS) ---------- */
  if (!reduce) $$('.marquee').forEach(m => m.addEventListener('click', e => {
    if (!e.target.closest('a')) m.classList.toggle('is-paused');   // тап по логотипу — це перехід, не пауза
  }));

  /* ---------- 14. Новини: слайдер (нативний скрол зі snap), кнопки, перетягування мишею ---------- */
  const track = $('.ntrack');
  const newsBtns = $$('.news__btn');
  const newsCards = $$('.newscard', track);
  const stepW = () => newsCards[1] ? newsCards[1].offsetLeft - newsCards[0].offsetLeft : track.clientWidth;
  const newsEdges = () => {
    const max = track.scrollWidth - track.clientWidth;
    newsBtns[0].disabled = track.scrollLeft <= 2;
    newsBtns[1].disabled = track.scrollLeft >= max - 2;
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
  $$('.btn, .chip, .req__btn, .rbtn, .mcard').forEach(el => {
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

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

  // Колода проєктів: на десктопі сцена закріплюється, скрол гортає картки, як спікер — картки свого виступу.
  // Поточна стоїть у слоті, наступні чекають у ряд праворуч (клік по видимій — гортаємо до неї); заїжджаючи,
  // картка лягає поверх попередньої, а пройдені складаються під нею в стопку по центру (трохи менші, з легким нахилом).
  const deck = $('.pdeck');
  const deckStage = $('.pdeck__stage', deck);
  const ptrack = $('.ptrack', deck);
  const deckNum = $('.pdeck__count b', deck);
  const deckTotal = $('.pdeck__total', deck);
  const deckBtns = $$('.pdeck__btn', deck);
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
  function setDeckIdx(i) {
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
  deckBtns.forEach(b => b.addEventListener('click', () => {
    const i = clamp(deckIdx + +b.dataset.step, 0, deckCards.length - 1);
    if (deckOn) scrollTo({ top: deckY(i), behavior: 'smooth' });
    else ptrack.scrollTo({ left: deckCards[i].offsetLeft - deckCards[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
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
  const heroSticky = $('.hero__sticky');
  const heroHidden = $('.hero__hidden');
  const heroField = $('.hero__field');
  // Спроба: фон hero — лише синій, без форм «Великих світів» і лупи (true — повернути обидва)
  const HERO_ART = false;
  heroHidden.hidden = !HERO_ART;
  const heroPortal = $('.hero__portal');
  const heroGreen = $('.hero__green');
  const heroEye = $('.hero__eye');
  const eyePath = $('path', heroEye);
  // око зі спрайта: 156×81, зіниця r = 13.53 з центром у (78, 40.01) — це центр занурення
  const EYE_LENS = eyePath.getAttribute('d'), EYE_CX = 78.0003, EYE_CY = 40.0133, EYE_W = 156, EYE_PUPIL = 13.53;
  const pupilD = r => `M${EYE_CX - r} ${EYE_CY}A${r} ${r} 0 1 0 ${EYE_CX + r} ${EYE_CY}A${r} ${r} 0 1 0 ${EYE_CX - r} ${EYE_CY}Z`;
  // кліпання: передчуття → швидке закриття → пауза → розплющення з перельотом (hp → scaleY ока)
  const blinkY = hp => {
    if (hp < .48 || hp >= .61) return 1;
    if (hp < .50) return 1 + .05 * easeOut(range(hp, .48, .50));
    if (hp < .535) return lerp(1.05, .06, Math.pow(range(hp, .50, .535), 2));
    if (hp < .555) return .06;
    return lerp(.06, 1, easeOutBack(range(hp, .555, .61), 1.2));
  };
  const about = $('#about');
  const aboutForms = $$('.about__form', about);
  const dirsSec = $('#directions');

  // Політ «Про нас» → «Напрямки» (001 Form → 002 Repeat → 005 Pattern). Форми стоять рівно над колонками дисків,
  // тож кожна падає вертикально у свою: на межі секцій набирає колір напрямку, у диску множиться в сітку 3×3
  // своїх копій, і поверх повтору розкривається патерн. Скрол-скраб лише на десктопі; поки летять — фіксований шар
  const DIR_COLOR = { flow: 'var(--blue)', intersection: 'var(--lime)', grid: 'var(--pink)', density: 'var(--purple)' };
  const REP = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];   // спершу хрест, потім кути
  const REP_S = .26;   // копія — частка диска (клітинка 1/3)
  const aflight = document.body.appendChild(document.createElement('div'));
  aflight.className = 'aflight';
  aflight.setAttribute('aria-hidden', 'true');
  aflight.style.setProperty('--field', about.style.getPropertyValue('--field'));
  const div = (parent, cls) => parent.appendChild(Object.assign(document.createElement('div'), { className: cls }));
  const flights = aboutForms.map(src => {
    const dir = $(`.dir[data-dir="${src.dataset.dir}"]`);
    const name = $('use', src).getAttribute('href').slice(3), c = DIR_COLOR[src.dataset.dir];
    const k = parseFloat(getComputedStyle(src).getPropertyValue('--k')) || 1;
    const item = div(aflight, 'aflight__item');
    const rep = div(item, 'aflight__rep');
    const copies = REP.map(([x, y]) => {
      const el = rep.appendChild(shapeEl(name, 'aflight__copy', c));
      el.style.left = `${50 + x * 100 / 3}%`;
      el.style.top = `${50 + y * 100 / 3}%`;
      el.style.width = el.style.height = `${Math.min(REP_S * k, .3) * 100}%`;   // широке око — без дотиків сусідів
      return el;
    });
    // сама форма — дві копії, розрізані межею секцій: над полем кольору паперу, над папером — кольору напрямку
    const layers = ['field', 'paper'].map(m => {
      const l = div(item, `aflight__layer aflight__layer--${m}`);
      l.appendChild(shapeEl(name, 'aflight__form', c));
      return l;
    });
    const pat = div(item, 'aflight__pat');
    return { src, k, item, rep, copies, layers, forms: layers.map(l => l.firstChild), pat,
      art: $('.dir__art', dir), disc: $('.dir__disc', dir), d: (+dir.style.getPropertyValue('--i') || 0) * .06 };
  });
  // копія готового патерну диска — з власними id, щоб clipPath не перетинались
  patternsReady.then(() => flights.forEach(f => {
    const svg = $('.dir__pat', f.disc);
    if (svg) f.pat.innerHTML = svg.outerHTML.replace(/id="([^"]+)"/g, 'id="$1-fly"').replace(/url\(#([^)]+)\)/g, 'url(#$1-fly)');
  }));
  let flightOn = false, flightT = -1;
  function setFlightOn() {
    flightOn = !reduce && deckMQ.matches;
    document.documentElement.classList.toggle('has-aflight', flightOn);
    flightT = -1;
    if (!flightOn) {
      aflight.style.visibility = '';
      flights.forEach(f => { f.src.style.visibility = ''; f.disc.style.visibility = ''; });
    }
  }
  function renderAboutFlight() {
    if (!flightOn) return;
    const ar = about.getBoundingClientRect();
    // t: 0 — «Про нас» рівно на весь екран (портал щойно відкрився), 1 — «Напрямки» стоять під хедером
    const run = dirsSec.getBoundingClientRect().top - ar.top - hdr.offsetHeight;
    const t = clamp(-ar.top / Math.max(run, 1));
    if (t === flightT) return;
    flightT = t;
    const flying = t > 0 && t < 1;
    aflight.style.visibility = flying ? 'visible' : 'hidden';
    dirsSec.classList.toggle('is-landed', t >= .82);
    flights.forEach(f => {
      f.src.style.visibility = t > 0 ? 'hidden' : '';
      f.disc.style.visibility = t < 1 ? 'hidden' : '';
      if (!flying) return;
      const a = f.src.getBoundingClientRect(), b = f.art.getBoundingClientRect(), w = b.width;
      const lt = range(t, f.d, f.d + .82);
      // 001: падіння у своїй колонці через увесь скрол — форма весь час у кадрі (коробка — одразу розміру диска,
      // форма в ній зменшується до клітинки повтору)
      const p = ease(lt);
      const cx = lerp(a.left + a.width / 2, b.left + w / 2, p), cy = lerp(a.top + a.height / 2, b.top + w / 2, p);
      const top = cy - w / 2;
      f.item.style.width = f.item.style.height = `${w.toFixed(1)}px`;
      f.item.style.transform = `translate3d(${(cx - w / 2).toFixed(1)}px,${top.toFixed(1)}px,0)`;
      const fs = lerp(a.width, w * Math.min(REP_S * f.k, .3), ease(range(lt, .25, .5)));
      f.forms.forEach(el => { el.style.width = el.style.height = `${fs.toFixed(1)}px`; });
      // межа «Про нас» / «Напрямки» у координатах коробки
      const cut = clamp(ar.bottom - top, 0, w);
      f.layers[0].style.clipPath = `inset(0 0 ${(w - cut).toFixed(1)}px 0)`;
      f.layers[1].style.clipPath = `inset(${cut.toFixed(1)}px 0 0 0)`;
      // 002: форма множиться — копії виростають із клітинок, хрест раніше за кути
      f.copies.forEach((el, i) => {
        const s0 = .48 + (i < 4 ? 0 : .06);
        el.style.scale = easeOutBack(range(lt, s0, s0 + .14)).toFixed(3);
      });
      // 005: поверх повтору з центру розкривається патерн (той самий жест, що поява дисків); повтор гасне під ним
      const g = ease(range(lt, .66, .92));
      f.pat.style.clipPath = `circle(${(g * 50).toFixed(2)}% at 50% 50%)`;
      f.pat.style.rotate = `${((1 - g) * -90).toFixed(1)}deg`;
      const o = (1 - range(lt, .86, .95)).toFixed(3);
      f.rep.style.opacity = o;
      f.layers.forEach(l => { l.style.opacity = o; });
    });
  }
  setFlightOn();
  deckMQ.addEventListener('change', () => { setFlightOn(); frame(); });
  // Фаза 1 стиску: радіус синього кола і масштаб поля модулів (спільні для frame() і розміру поля)
  const heroRb = (q, diag, rMin) => lerp(diag, rMin, ease(range(q, .12, .85)));
  const heroFs = q => lerp(1, .3, ease(range(q, .12, .72)));
  // Поле форм: елемент більший за екран рівно настільки, щоб, стискаючись разом із колом, не показати країв.
  // Форми (розділ 11) малюються в координатах hero; svg поля дивиться на них через viewBox = heroFieldBox
  const heroFieldBox = { x: 0, y: 0, s: 0 };
  let heroCompose = () => {};   // композицію будує розділ 11, коли ілюстрації завантажені
  function sizeField() {
    const vw = innerWidth, vh = innerHeight, W = heroSticky.clientWidth, H = heroSticky.clientHeight;
    const diag = Math.hypot(vw, vh) / 2 * 1.04, rMin = Math.min(vw, vh) * .09;
    let E = diag;
    for (let q = .12; q < .75; q += .005) E = Math.max(E, heroRb(q, diag, rMin) / heroFs(q));   // після .75 поле вже згасло
    E = Math.ceil(E) + 2;
    Object.assign(heroFieldBox, { x: W / 2 - E, y: H / 2 - E, s: 2 * E });
    Object.assign(heroField.style, {
      inset: 'auto', left: `${W / 2 - E}px`, top: `${H / 2 - E}px`, width: `${2 * E}px`, height: `${2 * E}px`,
    });
    heroCompose();
  }
  sizeField();
  let heroLensScroll = () => {};   // лупа hero (розділ 11) згортається, коли сцену скролять
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
  const ftr = $('.ftr');
  const sections = $$('main > section, .ftr');
  let pileRise = 0;   // наскільки купа фігур футера виросла над своєю зоною (рахує фізика нижче)

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
    heroLensScroll(hp);
    const q = range(hp, 0, .5);
    const rMin = Math.min(vw, vh) * .09;
    // фаза 2: око кліпає → з лінії повіки розкривається зелене коло → заливає екран → біле око росте, крізь зіницю відкривається «Про нас»
    const by = blinkY(hp);
    const bx = lerp(1, 1.04, clamp((1.05 - by) / .99));
    const cu = ease(range(hp, .565, .64));                      // зелена шторка від лінії повіки
    const fl = ease(range(hp, .63, .74));                       // зелене заливає
    const rb = heroRb(q, diag, rMin);                           // синє коло фази 1
    const rg = lerp(rMin, diag, fl);                            // зелене
    const clip = `circle(${rb}px at 50% 50%)`;
    heroBlue.style.clipPath = clip;
    heroHidden.style.clipPath = clip;
    heroGreen.style.visibility = cu > 0 ? 'visible' : 'hidden';
    heroGreen.style.clipPath = `ellipse(${rg}px ${rg * cu}px at 50% 50%)`;
    heroHidden.style.opacity = 1 - range(q, .3, .75);
    // поле модулів стягується в центр разом із колом
    const hs = ease(range(q, .12, .72));
    heroField.style.transform = `scale(${heroFs(q)}) rotate(${hs * -24}deg)`;
    const hc = range(q, .12, 1);
    heroContent.style.opacity = 1 - range(q, .12, .42);
    heroContent.style.transform = `translateY(${-hc * 80}px) scale(${1 - hc * .05})`;
    const dp = range(q, .55, .85);
    // око лишається білим: кліпає, чекає в центрі, поки зелене заливає екран, і пірнає
    const t = reduce ? 0 : range(hp, .70, 1);
    heroDot.style.opacity = t > 0 ? 0 : dp;
    heroDot.style.setProperty('--hole', cu > 0 ? `color-mix(in srgb, var(--blue), var(--green) ${(cu * 100).toFixed(1)}%)` : '');
    const ds = lerp(.4, 1, easeOutBack(dp));
    heroDot.style.transform = `scale(${(ds * bx).toFixed(4)}, ${(ds * by).toFixed(4)}) rotate(${(1 - dp) * -90}deg)`;
    let ri = 0, lensCover = false, lf = 0;
    if (!reduce) {
      // занурення: розмір росте експоненційно (рівномірний дайв), зіниця розширюється; зіниця — вікно в «Про нас»
      const k0 = .52 * .18 * Math.min(vw, vh) / EYE_W;
      const PF = 2.2;   // наприкінці зіниця майже на всю висоту ока — біла склера лишається тонким обідком і пролітає швидко
      const pf = lerp(1, PF, ease(range(hp, .72, .96)));
      const k = k0 * Math.pow(diag / (EYE_PUPIL * PF * k0), Math.pow(t, 1.5));
      ri = EYE_PUPIL * pf * k;
      // проходячи крізь око, склера розчиняється в полі «Про нас»: білий не заповнює екран
      lf = range(hp, .86, .97);
      heroEye.style.fill = lf > 0 ? `color-mix(in srgb, #fff, var(--green) ${(lf * 100).toFixed(1)}%)` : '';
      heroEye.style.visibility = t > 0 ? 'visible' : 'hidden';
      if (t > 0) {
        eyePath.setAttribute('d', EYE_LENS + pupilD(EYE_PUPIL * pf));
        eyePath.setAttribute('transform', `translate(${vw / 2} ${vh / 2}) scale(${k}) translate(${-EYE_CX} ${-EYE_CY})`);
        // біле око накрило верхні кути екрана — під шапкою суцільний папір
        lensCover = [[0, 0], [vw, 0]].every(([x, y]) =>
          eyePath.isPointInFill(new DOMPoint((x - vw / 2) / k + EYE_CX, (y - vh / 2) / k + EYE_CY)));
      }
      heroPortal.style.visibility = t > 0 ? 'visible' : 'hidden';
      heroPortal.style.opacity = range(t, 0, .06);
      heroPortal.style.clipPath = `circle(${ri + 1}px at 50% 50%)`;
      // справжня секція — лише коли портал повністю відкритий (кадри ідентичні, тож стик невидимий)
      const open = hp >= .999;
      about.style.opacity = open ? '' : '0';
      about.style.pointerEvents = open ? '' : 'none';
      if (hp > .5 && !aboutForced) {
        aboutForced = true;
        $$('.split, .reveal', about).forEach(el => { el.classList.add('in'); io.unobserve(el); });
      }
    }

    // ПРОЄКТИ: колода
    if (deckOn) renderDeck();

    // ПРО НАС → НАПРЯМКИ: форми летять у диски
    renderAboutFlight();

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
          mark = scrollY < 8;         // лише на самому верху в шапці зірка з «C»; щойно гортаємо — повне лого
          theme = rb >= Math.hypot(vw / 2 - 40, vh / 2 - y) ? 'blue' : 'light';   // прозора шапка: білий текст, поки синє коло ще під лого/навігацією
          const field = () => {
            theme = 'field';
            hdr.style.setProperty('--field', about.style.getPropertyValue('--field'));
            hdr.style.setProperty('--on', about.style.getPropertyValue('--on'));
          };
          if (ri >= Math.hypot(vw / 2, vh / 2)) field();                          // зіниця накрила шапку: зелене поле, як у «Про нас»
          else if (lensCover && lf < .5) theme = 'light';                         // під шапкою біле око
          else if (fl > 0 && rg >= Math.hypot(vw / 2, vh / 2 - 40)) field();      // зелене заливає шапку
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

    // Футер: хедер більше не кріпиться — стоїть над купою фігур і їде вгору разом зі сторінкою, не перекриваючи їх
    const lift = Math.min(0, ftr.getBoundingClientRect().top - pileRise - hdr.offsetHeight);
    hdr.style.transform = lift && !hdr.classList.contains('is-open') ? `translateY(${lift}px)` : '';
  }

  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { frame(); ticking = false; }); } };
  addEventListener('scroll', onScroll, { passive: true });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { lastSp = -1; flightT = -1; sizeField(); frame(); }, 120); });
  frame();

  // Фокус у hero, коли сцену вже прокручено, — повертаємо її на початок: білий текст має лежати на синьому
  heroContent.addEventListener('focusin', () => {
    if (heroHp > .05) scrollTo({ top: scrollY + hero.getBoundingClientRect().top });
  });

  // Перехід крізь око — за один скрол-рух: жест у hero сам доводить сцену до кінця (або назад на початок)
  if (!reduce) {
    const ends = () => { const y0 = hero.offsetTop; return [y0, y0 + hero.offsetHeight - innerHeight]; };
    const DUR = 1800;
    const easeIO = t => -(Math.cos(Math.PI * t) - 1) / 2;
    let tween = 0, lastSet = 0, lastWheel = 0, lockUntil = 0;
    const glide = to => {
      if (tween) return;
      const from = scrollY, t0 = performance.now();
      lastSet = from;
      const step = now => {
        // користувач тягне скролбар — віддаємо йому керування
        if (Math.abs(scrollY - lastSet) > 2) { tween = 0; return; }
        const p = Math.min(1, (now - t0) / DUR);
        lastSet = Math.round(lerp(from, to, easeIO(p)));
        scrollTo({ top: lastSet, behavior: 'instant' });
        if (p < 1) tween = requestAnimationFrame(step);
        else { tween = 0; lockUntil = now + 400; }
      };
      tween = requestAnimationFrame(step);
    };
    // куди веде жест: 1 — крізь око вниз, -1 — назад на початок, 0 — звичайний скрол
    const target = dir => {
      const [y0, y1] = ends(), y = scrollY;
      if (dir > 0 && y >= y0 - 1 && y < y1 - 1) return y1;
      if (dir < 0 && y > y0 + 1 && y <= y1 + 1) return y0;
      return null;
    };
    // інерція трекпада після переходу не повинна прокручувати далі
    const swallowing = now => tween || now < lockUntil || (now - lastWheel < 120 && now - lockUntil < 1200);
    addEventListener('wheel', e => {
      if (e.ctrlKey || !e.deltaY) return;
      const now = performance.now(), busy = swallowing(now);
      lastWheel = now;
      if (busy) { e.preventDefault(); return; }
      const to = target(Math.sign(e.deltaY));
      if (to !== null) { e.preventDefault(); glide(to); }
    }, { passive: false });

    let touchY = null;
    addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchmove', e => {
      if (touchY === null) return;
      if (tween) { e.preventDefault(); return; }
      const dy = touchY - e.touches[0].clientY;
      const to = target(Math.sign(dy));
      if (to === null) return;
      e.preventDefault();
      if (Math.abs(dy) > 8) { touchY = null; glide(to); }
    }, { passive: false });

    addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input, textarea, select, button, [contenteditable]')) return;
      const dir = { ArrowDown: 1, PageDown: 1, ' ': e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 }[e.key];
      if (!dir) return;
      if (tween) { e.preventDefault(); return; }
      const to = target(dir);
      if (to !== null) { e.preventDefault(); glide(to); }
    });

    // скролбар, інерція тачу з «Про нас» тощо зупинили сцену посередині — доводимо в бік руху
    let idle, prevY = scrollY, lastDir = 1;
    addEventListener('scroll', () => {
      if (scrollY !== prevY) lastDir = Math.sign(scrollY - prevY);
      prevY = scrollY;
      clearTimeout(idle);
      if (tween) return;
      idle = setTimeout(() => {
        const [y0, y1] = ends();
        if (!tween && scrollY > y0 + 1 && scrollY < y1 - 1) glide(lastDir > 0 ? y1 : y0);
      }, 160);
    }, { passive: true });
  }

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

  /* ---------- 11. Hero: «Великі світи» і лупа «Фокус» ---------- */
  // Ззовні — прості форми: силуети ілюстрацій брендбуку тон-в-тон (--blue-deep, у кожної своя прозорість) — чотири
  // великі й кілька малих, окремих елементів тих самих ілюстрацій. Під лупою ×2 — «складний світ»: внутрішні шари
  // ілюстрації в масштабі самої форми. Порожній синій між формами під лупою — просто синій.
  // Шари за глибиною: [0] силуети суцільним --blue-deep, [1] основи в кольорі й малі елементи, [2…4] внутрішні шари
  const ART = {
    combine: [[], ['Group'], ['Vector_3'], ['Vector_4']],   // основа в оригіналі червона — лишається глибоким синім
    icon: [['Group'], ['Layer_1', 'Layer_1_2'], ['Group_2'], ['Vector_7']],
    flower: [['Outer petals'], ['Vector_3'], ['Vector_4'], ['Vector_5']],
    lungs: [['Vector'], ['Vector_2'], ['Vector_3'], ['Vector_4']],
  };
  const SIL = { combine: 'Ellipse 15', icon: 'Group', flower: 'Outer petals', lungs: 'Vector' };   // силует — нижній шар
  const HOLE = { 'icon/Group': true };   // м'який квадрат з отвором: контури одним шляхом evenodd
  const DEPTH = 5;
  // Композиція (еталони 1440×900 і 390×844), знизу вгору: x, y — центр у % hero; s — розмір у vmin (портрет — у vw
  // телефона-еталона) по стороні by (за замовчуванням — більшій); a — поворот; o — прозорість ззовні; id — малий елемент
  // ілюстрації f; over — лежить над великою формою (під лупою перекриває і її внутрішні шари); k — ім'я опори для інших.
  // На 16:9 і ширше x прив'язано до опор (ax): між 16:10 і 16:9 — плавний перехід від % до опор; вужче за 16:10 —
  // % від кадру 16:10 по центру. Верхній ряд малих форм іде від ока: галявина ≥ 15vmin, проміжки між формами ≥ 10vmin
  const DESK = [
    { f: 'combine', x: 89, y: 16, s: 66, a: 14, o: .17, ax: m => m.W - 17.6 * m.u },                          // A
    { f: 'icon', x: 3, y: 58, s: 52, a: -12, o: .17, ax: m => 4.8 * m.u },                                    // B
    { f: 'flower', x: 61, y: 64, s: 38, by: 'h', a: 20, o: .2, ax: m => m.intro + 12 * m.u, k: 'C' },         // C
    { f: 'lungs', x: 39, y: 99, s: 30, a: -8, o: .2, ax: m => (m.claim + m.intro) / 2 - 4 * m.u },            // D
    { f: 'lungs', id: 'Vector_2', x: 50, y: 67, s: 16, a: 18, o: .26, ax: m => m.C - 18 * m.u, over: true },  // e1
    { f: 'combine', id: 'Vector_4', x: 33, y: 60, s: 12, by: 'h', a: 24, o: .26, ax: m => m.C - 45 * m.u },   // e2
    // e3: від лого, але центр не ближче 23vmin до ока; e4 і e6 — ланцюжком від e3
    { f: 'icon', id: 'Layer_1', x: 26, y: 12, s: 22, by: 'w', a: -16, o: .26, k: 'e3',
      ax: m => Math.min(m.wm + 27 * m.u, m.eye - Math.sqrt(Math.max(0, (23 * m.u) ** 2 - (m.eyeY - .12 * m.H) ** 2))) },
    { f: 'icon', id: 'Layer_1_2', x: 10.5, y: 16, s: 10, by: 'w', a: 24, o: .26, ax: m => m.e3 - 25.5 * m.u, k: 'e4' },
    { f: 'combine', id: 'Vector', x: 97, y: 65, s: 12, a: 28, o: .26, ax: m => m.W - 4.8 * m.u },             // e5
    // e6: від 2:1, якщо між B і e4 є місце
    { f: 'combine', id: 'Vector', y: 20, s: 18, a: -10, o: .26, ax: m => m.e4 - 23 * m.u, wide: (x, m) => x >= 38 * m.u },
  ];
  const MOB = [
    { f: 'combine', x: 92, y: 9, s: 76, a: 14, o: .17 },
    { f: 'icon', id: 'Layer_1', x: 26, y: 10, s: 28, by: 'w', a: -16, o: .26 },
    { f: 'icon', x: 0, y: 44, s: 62, a: -12, o: .17 },
    { f: 'flower', x: 84, y: 43, s: 50, by: 'h', a: 20, o: .2, k: 'C' },
    // над C — зсув від C у тих самих одиницях, що й розмір (на 390×844 — рівно 62% / 36%)
    { f: 'lungs', id: 'Vector_2', x: 62, y: 36, s: 18, a: 18, o: .26, over: true, at: m => [m.C - 22 * m.k, m.Cy - 7 * 8.44 / 3.9 * m.k] },
    { f: 'lungs', x: 93, y: 99, s: 44, a: -8, o: .2 },
  ];
  // колір із файлу → брендовий токен styles.css (усі кольори ілюстрацій збігаються з токенами; червоний — декор)
  const FILE_TOKEN = { '#054FF0': 'blue', '#BDC71E': 'lime', '#FC80ED': 'pink', '#FD1C00': 'red', '#8303DC': 'purple',
    '#0D6F3F': 'green', '#4B0F1E': 'maroon', '#FF3666': 'hotpink' };
  const rootCS = getComputedStyle(document.documentElement);
  const token = (name, fb) => rootCS.getPropertyValue(`--${name}`).trim() || fb;
  const paint = fill => FILE_TOKEN[fill.toUpperCase()] ? token(FILE_TOKEN[fill.toUpperCase()], fill) : fill === 'white' ? '#fff' : fill;
  const DEEP = token('blue-deep', '#0337A8');
  const pieceId = (f, id) => `hw-${f}-${id.replace(/\W/g, '')}`;
  // шматок ілюстрації — один шлях (контури групи разом: без швів антиаліасингу між сусідніми частинами)
  const pathD = el => el.matches('circle')
    ? (([cx, cy, r]) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`)(['cx', 'cy', 'r'].map(a => +el.getAttribute(a)))
    : el.matches('path') ? el.getAttribute('d') : $$('path, circle', el).map(pathD).join('');
  const PIECES = {};   // `${f}/${id}` → { href, color, cx, cy, w, h } — центр і розміри bbox в одиницях файлу
  const heroArt = !HERO_ART ? Promise.resolve(false) : Promise.all(Object.keys(ART).map(f => fetch(`assets/illustrations/${f}.svg`).then(r => r.text()).then(txt => {
    const doc = new DOMParser().parseFromString(txt, 'image/svg+xml').documentElement;
    const ids = new Set([SIL[f], ...ART[f].flat(), ...DESK.concat(MOB).filter(it => it.f === f && it.id).map(it => it.id)]);
    return [...ids].map(id => {
      const el = doc.querySelector(`[id="${id}"]`);
      const fill = el.getAttribute('fill') || el.querySelector('[fill]').getAttribute('fill');
      return { key: `${f}/${id}`, href: pieceId(f, id), color: paint(fill), d: pathD(el), hole: HOLE[`${f}/${id}`] };
    });
  }))).then(lists => {
    // спільні defs — у спрайті: на них посилаються і поле, і лупа; bbox міряємо на тимчасовому svg
    const defs = sprite.appendChild(svgEl('defs'));
    const probe = document.body.appendChild(svgEl('svg', { style: 'position:absolute;left:-9999px;top:0;visibility:hidden' }));
    lists.flat().forEach(p => {
      const attrs = { id: p.href, d: p.d };
      if (p.hole) attrs['fill-rule'] = 'evenodd';
      const b = probe.appendChild(svgEl('path', attrs)).getBBox();
      defs.appendChild(svgEl('path', attrs));
      PIECES[p.key] = { href: p.href, color: p.color, cx: b.x + b.width / 2, cy: b.y + b.height / 2, w: b.width, h: b.height };
    });
    probe.remove();
    return true;
  }).catch(err => console.warn('hero art', err));

  // svg поля: координати hero, viewBox — коробка поля (більша за екран), тож форми, обрізані екраном, цілі
  const fieldArt = heroField.appendChild(svgEl('svg', { class: 'hero__art' }));
  let loupeDepth = null;   // шари лупи (<g> за глибиною) — створює блок лупи нижче
  const use = (p, tf, fill, extra = '') => `<use href="#${p.href}" transform="${tf}" fill="${fill}"${extra}/>`;
  function compose() {
    if (!PIECES['combine/Ellipse 15']) return;
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
    m.eye = eye.left + eye.width / 2 - hr.left; m.eyeY = eye.top + eye.height / 2 - hr.top;   // око в «C» — довкола нього галявина
    heroContent.style.transform = keep;
    const ar = W / H, t = ease(clamp((ar - 1.6) / (16 / 9 - 1.6)));
    const fw = mob ? W : Math.max(W, 1.6 * H);   // вужче за 16:10 — % від кадру 16:10 по центру: проміжки у vmin як в еталоні
    const u = m.k = mob ? Math.min(W, H * 390 / 844) / 100 : m.u;   // портрет ширший за телефон-еталон — форми за висотою
    const field = [], layers = Array.from({ length: DEPTH }, () => []);
    (mob ? MOB : DESK).forEach(it => {
      const xp = W / 2 + (it.x - 50) * fw / 100;
      const x = it.at ? it.at(m)[0] : mob || !it.ax ? xp : it.x == null ? it.ax(m) : lerp(xp, it.ax(m), t);
      if (it.wide && (ar < 2 || !it.wide(x, m))) return;
      const y = it.at ? it.at(m)[1] : it.y * H / 100;
      if (it.k) { m[it.k] = x; m[`${it.k}y`] = y; }
      const sil = PIECES[`${it.f}/${it.id || SIL[it.f]}`];
      const k = it.s * u / (it.by === 'h' ? sil.h : it.by === 'w' ? sil.w : Math.max(sil.w, sil.h));
      const tf = `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${it.a}) scale(${k.toFixed(5)}) translate(${(-sil.cx).toFixed(2)} ${(-sil.cy).toFixed(2)})`;
      field.push(use(sil, tf, DEEP, ` opacity="${it.o}"`));
      layers[0].push(use(sil, tf, DEEP));
      if (it.id) {
        // малий елемент: [1] у своєму кольорі; той, що лежить над великою формою, — повторено на кожній глибині
        for (let L = 1; L < (it.over ? DEPTH : 2); L++) layers[L].push(use(sil, tf, sil.color));
      } else {
        ART[it.f].forEach((ids, L) => ids.forEach(id => { const p = PIECES[`${it.f}/${id}`]; layers[L + 1].push(use(p, tf, p.color)); }));
      }
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
  // Бокс 2Rb×2Rb їде translate3d, радіус — clip-path на ньому; усередині маленький svg тих самих форм (спільні defs),
  // щокадру міняється лише його viewBox — фокус ×k векторний, перемальовується тільки коло лупи.
  // Тихі зони (текст, кнопки, шапка) гасять кольорові шари — лишається основа.
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
    const to = (w, b, now, delay, d, e) => { w.a = val(w, now); w.b = b; w.t0 = now + delay; w.d = d; w.e = e; };

    const lens = div(heroHidden, 'hero__lens');
    const loupe = lens.appendChild(svgEl('svg', { class: 'hero__loupe' }));
    loupeDepth = Array.from({ length: DEPTH }, () => loupe.appendChild(svgEl('g')));
    const tones = loupeDepth.slice(1);   // кольорові шари; [0] — силуети, видимі одразу
    tones.forEach(g => { g.style.opacity = 0; });
    compose();

    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const QZ = [[.30, .85], [.20, .75], [.10, .65], [0, .55]];   // тихі зони: кольорові шари гаснуть зверху вниз
    // поява: радіус, фокус k 1→2 (+60 мс), шари знизу вгору (+200 мс, крок 60 мс); тач — ще й утримання
    const SHOW = { mouse: { r: 300, k: 420 }, touch: { r: 280, k: 360, hold: 420 + 700 } };
    const radius = m => {
      const v = Math.min(innerWidth, innerHeight);
      return m === 'touch' ? clamp(v * .12, 56, 84) : clamp(v * .07, 52, 80);
    };
    const tr = tween(), tz = tween(), tl = QZ.map(tween);
    let state = 'off', mode = 'mouse', R = 60, Rb = 0, zones = [], hx = 0, hy = 0, hw = 0, hh = 0;
    let px = 0, py = 0, lx = 0, ly = 0, vpx = 0, vpy = 0, vs = 0, ks = 2, kv = 0, qz = 0;
    let lastMove = 0, holdUntil = 0, hideEnd = 0, locked = false, ax = -1e4, ay = -1e4;
    let raf = 0, last = 0, clip = '', vbox = '';
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
        loupe.setAttribute('width', 2 * Rb); loupe.setAttribute('height', 2 * Rb);
      }
      const box = (r, pad = 0) => ({ l: r.left - hx - pad, t: r.top - hy - pad, r: r.right - hx + pad, b: r.bottom - hy + pad });
      const claim = document.createRange();
      claim.selectNodeContents($('.hero__claim'));   // межі самого тексту, не колонки
      zones = [box($('.hero__intro').getBoundingClientRect(), 16), box(claim.getBoundingClientRect()),
        { l: -1e5, t: -1e5, r: 1e5, b: hdr.offsetHeight - hy }];
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
        lx = vpx = px; ly = vpy = py; vs = 0; ks = 2; kv = 0;
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
      const kt = lerp(2, 1.8, clamp(vs / 2));
      // пружина k (stiffness 200, damping 22, mass 1), кроки ≤ 8 мс
      for (let n = Math.ceil(dt / 8), h = dt / 1000 / n, i = 0; i < n; i++) { kv += (200 * (kt - ks) - 22 * kv) * h; ks += kv * h; }
      qz += (quiet(lx, ly) - qz) * (1 - Math.exp(-dt / 120));

      // кадр: transform, clip-path, opacity шарів і viewBox svg лупи (перемальовується лише бокс 2Rb×2Rb)
      const r = val(tr, now), k = 1 + (ks - 1) * val(tz, now);
      lens.style.transform = `translate3d(${(lx - Rb).toFixed(2)}px,${(ly - Rb).toFixed(2)}px,0)`;
      // у центрі лінзи — та сама точка поля, ×k: видно квадрат 2Rb / k навколо неї
      const v = Rb / k, vb = `${(lx - v).toFixed(2)} ${(ly - v).toFixed(2)} ${(2 * v).toFixed(2)} ${(2 * v).toFixed(2)}`;
      if (vb !== vbox) { vbox = vb; loupe.setAttribute('viewBox', vb); }
      const c = `circle(${Math.max(r, 0).toFixed(2)}px at 50% 50%)`;
      if (c !== clip) { clip = c; lens.style.clipPath = c; }
      tl.forEach((w, i) => {
        const o = (val(w, now) * (1 - smooth(range(qz, ...QZ[i])))).toFixed(3);
        if (o !== ops[i]) { ops[i] = o; tones[i].style.opacity = o; }
      });

      if (state === 'hiding' && now >= hideEnd) {
        state = 'off'; lens.style.visibility = 'hidden'; raf = 0;
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
  $$('.btn, .req__btn, .rbtn, .mcard').forEach(el => {
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

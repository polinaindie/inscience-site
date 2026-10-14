/* INSCIENCE — головна: спрайт іконок, скрол-сцени, фільтр, копіювання */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Спрайт іконок брендбуку ---------- */
  const ICONS = ['eye', 'flower', 'arrows', 'heart', 'star', 'clover', 'hash', 'drop',
    'circle', 'ring', 'burst', 'infinity', 'planet', 'molecule'];
  const NS = 'http://www.w3.org/2000/svg';
  const sprite = document.createElementNS(NS, 'svg');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  document.body.prepend(sprite);

  Promise.all(ICONS.map(name => fetch(`assets/icons/${name}.svg`).then(r => r.text()).then(txt => {
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

  /* ---------- 2. Іконка в логотипі змінюється: око → квітка → стрілки → серце ---------- */
  const heroIcons = $$('.hero__ico');
  const dotUse = $('.hero__dot use');
  let heroIdx = 0;
  if (!reduce) {
    setInterval(() => {
      const cur = heroIcons[heroIdx];
      cur.classList.remove('is-on'); cur.classList.add('is-out');
      setTimeout(() => cur.classList.remove('is-out'), 700);
      heroIdx = (heroIdx + 1) % heroIcons.length;
      heroIcons[heroIdx].classList.add('is-on');
      dotUse.setAttribute('href', heroIcons[heroIdx].querySelector('use').getAttribute('href'));
    }, 1700);
  }

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
  $$('.reveal, .split, .dirs__grid').forEach(el => reduce ? el.classList.add('in') : io.observe(el));

  /* ---------- 5. Напрямки → фільтр проєктів ---------- */
  const cards = $$('.pcard');
  const chips = $$('.chip');
  const plural = n => n === 1 ? 'проєкт' : (n >= 2 && n <= 4 ? 'проєкти' : 'проєктів');
  $$('.dir').forEach(d => {
    const n = cards.filter(c => c.dataset.dirs.split(' ').includes(d.dataset.dir)).length;
    $('[data-count]', d).textContent = `${n} ${plural(n)}`;
  });

  function applyFilter(f) {
    chips.forEach(c => {
      const on = c.dataset.filter === f;
      c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on);
    });
    cards.forEach((c, k) => {
      const hit = f === 'all' || c.dataset.dirs.split(' ').includes(f);
      c.classList.toggle('is-dim', !hit);
      c.classList.remove('is-hit');
      if (hit && f !== 'all') { void c.offsetWidth; c.style.animationDelay = `${k * 40}ms`; c.classList.add('is-hit'); }
    });
  }
  chips.forEach(c => c.addEventListener('click', () => applyFilter(c.dataset.filter)));
  $$('.dir').forEach(d => d.addEventListener('click', () => {
    applyFilter(d.dataset.dir);
    $('#projects').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- 6. Кульмінація: форма → повтор → накладання → шар → патерн ---------- */
  const impact = $('.impact');
  const field = $('.impact__field');
  const steps = $$('.impact__steps li');
  const PATTERNS = ['flow', 'intersection', 'grid', 'density'];
  const LAYER_ICONS = ['star', 'heart', 'eye', 'flower', 'arrows', 'burst', 'drop', 'clover'];
  let tiles = [];

  function buildField() {
    field.innerHTML = '';
    const vw = innerWidth, vh = innerHeight;
    const cols = vw > 1100 ? 8 : vw > 700 ? 6 : 4;
    const s = vw / cols;
    const rows = Math.ceil(vh / s) + 1;
    const cx = vw / 2, cy = vh / 2;
    const ox = cx - s * (cols / 2), oy = cy - s * (rows / 2);
    const list = [];
    // шахова сітка: лише половина клітин — більше повітря
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if ((r + c) % 2) continue;
      const x = ox + (c + .5) * s, y = oy + (r + .5) * s;
      list.push({ x, y, d: Math.hypot(x - cx, y - cy), r, c });
    }
    const maxD = Math.max(...list.map(t => t.d));
    list.sort((a, b) => a.d - b.d);
    tiles = list.map((t, k) => {
      const el = document.createElement('div');
      el.className = 'tile';
      el.style.width = el.style.height = `${s}px`;
      // один патерн на колонку — спокійний ритм
      el.innerHTML = `<img src="assets/patterns/${PATTERNS[t.c % 4]}.svg" alt="">`;
      let ico = null;
      if (k > 0 && k % 3 === 0) {
        el.insertAdjacentHTML('beforeend', `<svg class="tile__ico"><use href="#i-${LAYER_ICONS[k % LAYER_ICONS.length]}"/></svg>`);
        ico = el.lastElementChild;
      }
      field.appendChild(el);
      return { el, ico, x: t.x - s / 2, y: t.y - s / 2, d: t.d / maxD, first: k === 0 };
    });
  }

  let statsDone = false;
  function renderImpact(p) {
    const ov = ease(clamp((p - .4) / .18));     // накладання: кола ледь заходять одне на одне
    const ly = easeOut(clamp((p - .58) / .16)); // шар: іконки на кожному третьому колі
    tiles.forEach(t => {
      let sc = t.first
        ? lerp(.35, 1, easeOut(clamp(p / .14)))
        : easeOut(clamp((p - .16 - t.d * .2) / .08));
      sc *= lerp(.62, 1.3, ov);
      t.el.style.transform = `translate3d(${t.x}px,${t.y}px,0) scale(${sc})`;
      if (t.ico) { t.ico.style.opacity = ly; t.ico.style.transform = `scale(${lerp(.4, 1, ly)})`; }
    });

    const step = p < .16 ? 0 : p < .4 ? 1 : p < .58 ? 2 : p < .76 ? 3 : 4;
    steps.forEach((li, k) => { li.classList.toggle('is-on', k === step); li.classList.toggle('is-done', k < step); });
    $('.impact__steps').style.opacity = p > .86 ? 0 : 1;

    const show = p > .8;
    impact.classList.toggle('show-stats', show);
    if (show && !statsDone) { statsDone = true; countUp(); }
  }

  function countUp() {
    $$('.stat b').forEach(b => {
      const to = parseFloat(b.dataset.to), fmt = b.dataset.fmt, suf = b.dataset.suf || '';
      const t0 = performance.now(), dur = reduce ? 0 : 1400;
      const tick = now => {
        const k = dur ? easeOut(clamp((now - t0) / dur)) : 1;
        const v = to * k;
        b.textContent = fmt === 'mln'
          ? `${v.toFixed(1).replace('.', ',')} млн`
          : `${Math.round(v).toLocaleString('uk-UA').replace(/\s/g, ' ')}${suf}`;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- 7. Скрол-цикл: hero, кульмінація, повернення синього, тема хедера ---------- */
  const hero = $('.hero');
  const heroBlue = $('.hero__blue');
  const heroContent = $('.hero__content');
  const heroDot = $('.hero__dot');
  const support = $('.support');
  const supportBg = $('.support__bg');
  const supportInner = $('.support__inner');
  const hdr = $('.hdr');
  const sections = $$('main > section, .ftr');

  const progress = el => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  };

  function frame() {
    const vw = innerWidth, vh = innerHeight;
    const diag = Math.hypot(vw, vh) / 2 * 1.04;

    // HERO: синій стискається в коло
    const hp = reduce ? 0 : progress(hero);
    const he = ease(clamp(hp / .85));
    heroBlue.style.clipPath = `circle(${lerp(diag, Math.min(vw, vh) * .09, he)}px at 50% 50%)`;
    heroContent.style.opacity = 1 - clamp(hp / .4);
    heroContent.style.transform = `translateY(${-hp * 80}px) scale(${1 - hp * .05})`;
    const dp = clamp((hp - .55) / .3);
    heroDot.style.opacity = dp;
    heroDot.style.transform = `scale(${lerp(.4, 1, easeOut(dp))}) rotate(${(1 - dp) * -90}deg)`;

    // КУЛЬМІНАЦІЯ
    renderImpact(reduce ? 1 : progress(impact));

    // ПІДТРИМКА: синє коло розширюється назад
    const sr = support.getBoundingClientRect();
    const sp = reduce ? 1 : clamp((vh - sr.top) / (vh * 1.05));
    const sR = Math.hypot(vw / 2, Math.max(sr.height * .85, vh));
    supportBg.style.clipPath = sp >= 1 ? 'none' : `circle(${sR * Math.pow(sp, 2.2)}px at 50% 15%)`;
    supportInner.style.opacity = clamp((sp - .62) / .3);

    // Тема хедера за секцією під ним
    const y = 40;
    let theme = 'light';
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) {
        if (s === hero) theme = hp < .06 ? 'blue' : 'light';
        else if (s === support) theme = sp > .9 ? 'solid-blue' : 'light';
        else theme = s.dataset.theme === 'blue' ? 'solid-blue' : 'light';
        break;
      }
    }
    if (hdr.dataset.theme !== theme) hdr.dataset.theme = theme;
  }

  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { frame(); ticking = false; }); } };
  addEventListener('scroll', onScroll, { passive: true });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { buildField(); frame(); }, 120); });
  buildField();
  frame();

  /* ---------- 8. Медіа: ховаємо секцію, якщо матеріалів < 3 ---------- */
  const mediaItems = $$('.mlist li');
  if (mediaItems.length < 3) $('#media').hidden = true;

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
})();

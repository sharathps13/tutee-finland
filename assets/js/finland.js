/* ==========================================================================
   Tutee Connect — Finland landing page interactions.
   Loaded with `defer`. No dependencies; CSP-safe (no inline script/eval).
   universities.html keeps using main.js; this file serves index.html only.

   The motion layer is a vanilla take on React Bits patterns (RotatingText,
   SplitText, SpotlightCard, TiltedCard, Magnet, ClickSpark, ScrollVelocity,
   CountUp), rebuilt here because the CSP allows no third-party scripts and
   the site has no build step. Everything respects prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var reduceMotion = mq('(prefers-reduced-motion: reduce)');
  var finePointer = mq('(hover: hover) and (pointer: fine)');
  var ENQUIRY_ENDPOINT = '/api/enquiry';
  document.documentElement.classList.add('js');

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Minimal markdown: **bold** + newlines, HTML escaped first. */
  function mdToHtml(s) {
    return escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }
  function enquiryPage() {
    try { return location.host + location.pathname; } catch (e) { return ''; }
  }
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ------------------------------------------------------------------ *
   * FX canvas — click sparks and confetti share one fixed overlay
   * ------------------------------------------------------------------ */
  var fx = (function () {
    var canvas = $('[data-fx]');
    if (!canvas || !canvas.getContext || reduceMotion) return { spark: function () {}, confetti: function () {} };
    var ctx = canvas.getContext('2d'), parts = [], running = false, dpr = 1;
    var COLORS = ['#003580', '#ffffff', '#2fe3b4', '#6c8cff', '#f2a93b', '#7a0f14'];
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function loop() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter(function (p) { return p.life > 0; });
      parts.forEach(function (p) {
        p.life -= 1;
        var k = p.life / p.max;
        if (p.kind === 'spark') {
          var d = (1 - k) * p.len;
          ctx.strokeStyle = 'rgba(47,227,180,' + k + ')';
          ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(p.a) * d, p.y + Math.sin(p.a) * d);
          ctx.lineTo(p.x + Math.cos(p.a) * (d + 8 * k), p.y + Math.sin(p.a) * (d + 8 * k));
          ctx.stroke();
        } else {
          p.vy += 0.18; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillStyle = p.c; ctx.fillRect(-4, -2.5, 8, 5);
          if (p.c === '#ffffff') { ctx.strokeStyle = 'rgba(0,53,128,.35)'; ctx.strokeRect(-4, -2.5, 8, 5); }
          ctx.restore();
        }
      });
      if (parts.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }
    size();
    window.addEventListener('resize', size);
    return {
      spark: function (x, y) {
        for (var i = 0; i < 8; i++) parts.push({ kind: 'spark', x: x, y: y, a: i / 8 * Math.PI * 2, len: 26, life: 22, max: 22 });
        kick();
      },
      confetti: function (x, y, n) {
        for (var i = 0; i < (n || 90); i++) {
          var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9, s = 6 + Math.random() * 8;
          parts.push({ kind: 'c', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
                       c: COLORS[i % COLORS.length], life: 90 + Math.random() * 40, max: 130 });
        }
        kick();
      }
    };
  })();

  function initClickSpark() {
    document.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || (e.target.closest && e.target.closest('input, textarea, select, .chat'))) return;
      fx.spark(e.clientX, e.clientY);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * Header state, scroll progress, scroll-spy (nav + dots), mobile bar
   * ------------------------------------------------------------------ */
  function initScrollUi() {
    var header = $('[data-header]');
    var bar = $('[data-progress]');
    var mbar = $('[data-mbar]');
    var hero = $('#home');
    var contact = $('#contact');
    var navLinks = $$('[data-nav]');
    var dots = $$('[data-dot]');
    var ids = dots.map(function (d) { return d.getAttribute('data-dot'); });
    var sections = ids.map(function (id) { return document.getElementById(id); });
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      // Stay transparent over the night-sky hero; turn solid once the flag (or the page) shows.
      var hx = $('[data-hp].is-live');
      var overNight = hx && hx.getBoundingClientRect().bottom > 80;
      if (header) header.classList.toggle('is-scrolled', y > 40 && !overNight);
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';

      if (mbar && hero && contact) {
        var on = hero.getBoundingClientRect().bottom < 80 && contact.getBoundingClientRect().top > window.innerHeight * 0.75;
        mbar.classList.toggle('is-on', on);
        document.body.classList.toggle('mbar-on', on);
      }

      var mid = window.innerHeight * 0.4, active = 0;
      sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= mid) active = i; });
      var id = ids[active];
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === active); });
      navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-nav') === id); });
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------------ *
   * Mobile drawer + back-to-top links
   * ------------------------------------------------------------------ */
  function initDrawer() {
    var drawer = $('[data-drawer]');
    var openBtn = $('[data-menu-open]');
    if (drawer && openBtn) {
      var open = function () {
        drawer.classList.add('is-open');
        openBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        var first = $('.drawer__links a', drawer);
        if (first) setTimeout(function () { first.focus(); }, 300);
      };
      var close = function () {
        if (!drawer.classList.contains('is-open')) return;
        drawer.classList.remove('is-open');
        openBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      };
      openBtn.addEventListener('click', open);
      $$('[data-menu-close]', drawer).forEach(function (b) { b.addEventListener('click', close); });
      $$('a', drawer).forEach(function (a) { a.addEventListener('click', close); });
      window.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
      window.addEventListener('resize', function () { if (window.innerWidth >= 1160) close(); });
    }
    $$('[data-scroll-to="top"]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Split headings, reveal on scroll, count-up
   * ------------------------------------------------------------------ */
  function splitWords(root) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            w.className = 'w'; w.style.setProperty('--i', i++); w.textContent = part;
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          // Gradient text breaks if its words become separate layers, so it moves as one.
          if (n.classList.contains('text-grad')) { n.classList.add('w'); n.style.setProperty('--i', i++); }
          else walk(n);
        }
      });
    })(root);
  }

  function countUp(el) {
    var target = Number(el.getAttribute('data-count'));
    if (isNaN(target) || reduceMotion) { el.textContent = String(target); return; }
    var start = null, dur = 1400;
    function step(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  function initReveal() {
    $$('.h2').forEach(splitWords);
    var items = $$('.reveal');
    var counters = $$('[data-count]');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
    // Headings outside a .reveal block (the journey) observe themselves.
    $$('.h2').forEach(function (h) { if (!h.closest('.reveal')) io.observe(h); });

    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        countUp(e.target);
        cio.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ------------------------------------------------------------------ *
   * Hero — rotating word, pointer-reactive aurora, snowfall
   * ------------------------------------------------------------------ */
  function initRotator() {
    var rot = $('[data-rotate]');
    if (!rot || reduceMotion) return;
    var words = rot.getAttribute('data-rotate').split('|'), i = 0;
    var cur = $('.rotator__word', rot);
    rot.style.width = cur.offsetWidth + 'px';
    setInterval(function () {
      if (document.hidden) return;
      i = (i + 1) % words.length;
      var next = document.createElement('span');
      next.className = 'rotator__word text-grad is-in';
      next.textContent = words[i];
      rot.appendChild(next);
      rot.style.width = next.offsetWidth + 'px';
      cur.classList.remove('is-in');
      cur.classList.add('is-out');
      var old = cur;
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 500);
      cur = next;
    }, 2600);
    var fit = function () { rot.style.width = cur.offsetWidth + 'px'; };
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }

  var heroPointer = { x: -9999, y: -9999 };
  function initHeroPointer() {
    var hero = $('[data-hero]'), aurora = $('[data-aurora]');
    if (!hero || !finePointer || reduceMotion) return;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      heroPointer.x = e.clientX - r.left; heroPointer.y = e.clientY - r.top;
      if (aurora) {
        var px = heroPointer.x / r.width - 0.5, py = heroPointer.y / r.height - 0.5;
        aurora.style.transform = 'translate3d(' + (px * 60) + 'px,' + (py * 40) + 'px,0)';
      }
    });
    hero.addEventListener('pointerleave', function () {
      heroPointer.x = heroPointer.y = -9999;
      if (aurora) aurora.style.transform = '';
    });
  }

  function initSnow() {
    var canvas = $('[data-snow]');
    if (!canvas || reduceMotion || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var flakes = [], w = 0, h = 0, dpr = 1, running = false, raf = 0;
    function size() {
      var r = canvas.parentNode.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(120, (w * h) / 13000));
      flakes = [];
      for (var i = 0; i < n; i++) {
        flakes.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.8 + 0.6, vx: 0,
                      s: Math.random() * 0.5 + 0.25, d: Math.random() * Math.PI * 2, o: Math.random() * 0.5 + 0.3 });
      }
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        // Flakes drift away from the pointer.
        var dx = f.x - heroPointer.x, dy = f.y - heroPointer.y, dist = dx * dx + dy * dy;
        if (dist < 9000) { var k = (9000 - dist) / 9000; f.vx += (dx > 0 ? 1 : -1) * k * 0.6; f.y += dy > 0 ? k : -k * 0.3; }
        f.vx *= 0.92;
        f.y += f.s; f.d += 0.01; f.x += Math.sin(f.d) * 0.3 + f.vx;
        if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
        if (f.x < -4) f.x = w + 4; else if (f.x > w + 4) f.x = -4;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,' + f.o + ')';
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (running) raf = requestAnimationFrame(frame);
    }
    function play(on) {
      if (on === running) return;
      running = on;
      if (on) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
    }
    size();
    window.addEventListener('resize', size);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { play(e[0].isIntersecting && !document.hidden); }).observe(canvas);
    } else { play(true); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) play(false); });
  }

  /* ------------------------------------------------------------------ *
   * Marquees — duplicate content once so translateX(-50%) loops cleanly
   * ------------------------------------------------------------------ */
  function initMarquees() {
    $$('.rail__track, .wall__track, [data-logos]').forEach(function (track) {
      Array.prototype.slice.call(track.children).forEach(function (n) {
        var c = n.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        $$('img', c).forEach(function (i) { i.alt = ''; });
        track.appendChild(c);
      });
    });
  }

  /* Scroll-velocity rails: drift constantly, speed up with scroll and flip
     direction when the reader scrolls back up. */
  function initVelocityRails() {
    var rails = $$('[data-velocity]').map(function (r) {
      return { track: $('.rail__track', r), dir: Number(r.getAttribute('data-velocity')) || 1, x: 0, w: 0 };
    });
    if (!rails.length) return;
    function measure() { rails.forEach(function (r) { r.w = r.track.scrollWidth / 2; }); }
    measure();
    window.addEventListener('resize', measure);
    if (reduceMotion) return;
    var lastY = window.scrollY, lastT = performance.now(), vel = 0, sign = 1, visible = true, raf = 0;
    function tick(t) {
      var dt = Math.min(64, t - lastT); lastT = t;
      var y = window.scrollY, v = (y - lastY) / Math.max(dt, 1); lastY = y;
      vel += (v - vel) * 0.12;
      if (Math.abs(vel) > 0.05) sign = vel > 0 ? 1 : -1;
      var speed = 0.045 * (1 + Math.min(Math.abs(vel) * 5, 9));
      rails.forEach(function (r) {
        r.x -= r.dir * sign * speed * dt;
        if (r.w) { r.x = r.x % r.w; if (r.x > 0) r.x -= r.w; }
        r.track.style.transform = 'translate3d(' + r.x + 'px,0,0)';
      });
      if (visible) raf = requestAnimationFrame(tick);
    }
    var host = $('.rails');
    if ('IntersectionObserver' in window && host) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible) { lastT = performance.now(); lastY = window.scrollY; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
      }).observe(host);
    } else { raf = requestAnimationFrame(tick); }
  }

  /* ------------------------------------------------------------------ *
   * Four seasons of Finland
   * ------------------------------------------------------------------ */
  var SEASONS = {
    autumn: { word: 'Ruska', kicker: 'Semester one', title: 'Ruska: forests turn red and gold',
      text: 'Term starts as the forests change colour. Student unions run orientation weeks, every newcomer is paired with a tutor group, and the lakes are still warm enough for one last swim.',
      facts: ['Tutor groups help you settle in from week one', 'Hands-on, project-based teaching from day one'] },
    winter: { word: 'Revontulet', kicker: 'Winter term', title: 'Northern lights & cosy campuses',
      text: 'Snow brightens the short days. In Lapland the northern lights dance on clear, dark nights, and every campus town has saunas, skating rinks and ski trails.',
      facts: ['Campuses, libraries and transport run smoothly all winter', 'Sauna: the Finnish way to warm up after the cold'] },
    spring: { word: 'Vappu', kicker: 'Spring term', title: "Vappu: Finland's biggest student festival",
      text: 'As the snow melts, the whole country celebrates May Day. Students wear their white caps, picnic in the parks and fill the streets in colourful student overalls.',
      facts: ['Student associations host events all year round', 'Light returns fast, with long evenings by May'] },
    summer: { word: 'Yötön yö', kicker: 'Summer break', title: 'Midnight sun & endless evenings',
      text: "In the far north the sun doesn't set for weeks, and even Helsinki stays light late into the night. Your work allowance is averaged across the year, so many students work full time over the summer.",
      facts: ["Everyman's right: forests, lakes and islands are open to all", 'Prime time for internships and summer jobs'] }
  };

  function initSeasons() {
    var root = $('[data-seasons]');
    if (!root) return;
    var tabs = $$('[data-season-tab]', root);
    var order = tabs.map(function (t) { return t.getAttribute('data-season-tab'); });
    var panel = $('.seasons__panel', root), timer = $('[data-season-timer]', root);
    var word = $('[data-season-word]', root), kicker = $('[data-season-kicker]', root);
    var title = $('[data-season-title]', root), text = $('[data-season-text]', root), facts = $('[data-season-facts]', root);
    var idx = 0, auto = !reduceMotion, DUR = 7000, started = 0, raf = 0, inView = false;

    /* Real photographs of each season sit over the illustrated sky once they
       load; the drawing stays as the fallback (and under the particles). */
    var sky = $('.sky', root), photos = {}, credit = document.createElement('span');
    credit.className = 'sky__credit';
    order.forEach(function (key) {
      var path = 'assets/img/seasons/' + key + '.jpg';
      var fig = document.createElement('div');
      fig.className = 'sky__photo';
      fig.innerHTML = '<img src="./' + path + '" alt="" decoding="async" loading="lazy">';
      $('img', fig).addEventListener('load', function () {
        sky.classList.add('has-photos');
        if (key === order[idx]) paintPhoto();
      });
      sky.insertBefore(fig, sky.firstChild);
      photos[key] = { el: fig, path: path };
    });
    sky.appendChild(credit);
    function paintPhoto() {
      var key = order[idx];
      order.forEach(function (k) { photos[k].el.classList.toggle('is-on', k === key && $('img', photos[k].el).naturalWidth > 0); });
      var c = (window.TC_PHOTO_CREDITS || {})[photos[key].path];
      credit.textContent = c ? c.short : '';
    }

    function show(i, focus) {
      idx = (i + order.length) % order.length;
      var key = order[idx], s = SEASONS[key];
      root.setAttribute('data-season', key);
      paintPhoto();
      tabs.forEach(function (t, j) {
        t.setAttribute('aria-selected', j === idx ? 'true' : 'false');
        t.tabIndex = j === idx ? 0 : -1;
      });
      if (focus) tabs[idx].focus();
      word.textContent = s.word; kicker.textContent = s.kicker; title.textContent = s.title; text.textContent = s.text;
      facts.innerHTML = s.facts.map(function (f) {
        return '<li><svg class="ico ico-sm"><use href="#i-check"/></svg>' + escapeHtml(f) + '</li>';
      }).join('');
      panel.classList.remove('is-swap'); void panel.offsetWidth; panel.classList.add('is-swap');
      started = performance.now();
    }
    function stopAuto() { auto = false; if (timer) timer.style.width = '0'; }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { stopAuto(); show(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); stopAuto(); show(idx + 1, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); stopAuto(); show(idx - 1, true); }
      });
    });
    function tick(t) {
      if (auto && inView && !document.hidden) {
        var p = (t - started) / DUR;
        if (timer) timer.style.width = Math.min(100, p * 100) + '%';
        if (p >= 1) show(idx + 1);
      } else { started = t - (parseFloat(timer && timer.style.width) || 0) / 100 * DUR; }
      if (auto) raf = requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { inView = e[0].isIntersecting; }, { threshold: 0.4 }).observe(root);
    } else { inView = true; }
    if (auto) { started = performance.now(); raf = requestAnimationFrame(tick); }
  }

  /* ------------------------------------------------------------------ *
   * Services tabs, fed by FI_SERVICES
   * ------------------------------------------------------------------ */
  function initServices() {
    var services = window.FI_SERVICES || [];
    var tabs = $$('[data-svc-tabs] [role="tab"]');
    if (!tabs.length || !services.length) return;
    var icon = $('[data-svc-icon]'), title = $('[data-svc-title]'), tag = $('[data-svc-tagline]'), desc = $('[data-svc-desc]');
    var count = $('[data-svc-count]');
    var panel = $('#svc-panel');
    var idx = 0;

    /* First paragraph always shows; the rest sits behind "Read more" so the
       panel stays compact, especially on phones. */
    function renderDesc(s) {
      if (!desc) return;
      var paras = String(s.desc).split(/\n\s*\n/).map(function (p) {
        return '<p>' + escapeHtml(p.trim()) + '</p>';
      });
      desc.innerHTML = paras[0] + (paras.length > 1
        ? '<div class="svc__extra" id="svc-extra" hidden>' + paras.slice(1).join('') + '</div>' +
          '<button class="svc__more" type="button" aria-expanded="false" aria-controls="svc-extra">Read more' +
          '<svg class="ico ico-sm"><use href="#i-down"/></svg></button>'
        : '');
      var more = $('.svc__more', desc), extra = $('.svc__extra', desc);
      if (more) more.addEventListener('click', function () {
        var open = more.getAttribute('aria-expanded') !== 'true';
        more.setAttribute('aria-expanded', String(open));
        extra.hidden = !open;
        more.firstChild.textContent = open ? 'Show less' : 'Read more';
      });
    }

    function select(i, focus) {
      idx = (i + tabs.length) % tabs.length;
      var s = services[idx];
      tabs.forEach(function (t, j) {
        var on = j === idx;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) tabs[idx].focus();
      var strip = tabs[idx].parentNode;
      if (strip.scrollWidth > strip.clientWidth) {
        strip.scrollTo({ left: tabs[idx].offsetLeft - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      if (!s) return;
      if (icon) icon.innerHTML = s.icon;
      if (title) title.textContent = s.title;
      if (tag) tag.textContent = s.tagline;
      if (count) count.textContent = ('0' + (idx + 1)).slice(-2) + ' / ' + ('0' + tabs.length).slice(-2);
      renderDesc(s);
      if (panel) {
        panel.classList.remove('svc__fade');
        void panel.offsetWidth;
        panel.classList.add('svc__fade');
      }
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select(idx + 1, true); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select(idx - 1, true); }
        if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
      });
    });
    var prev = $('[data-svc-prev]'), next = $('[data-svc-next]');
    if (prev) prev.addEventListener('click', function () { select(idx - 1); });
    if (next) next.addEventListener('click', function () { select(idx + 1); });
    var cta = $('[data-svc-cta]');
    if (cta) cta.addEventListener('click', function () { setDestination(services[idx] ? 'Service: ' + services[idx].title : ''); });

    // Static HTML carries a short version of the first description.
    if (services[0]) renderDesc(services[0]);
  }

  /* ------------------------------------------------------------------ *
   * Find-your-Finland-match quiz
   * ------------------------------------------------------------------ */
  /* Broad subject strengths and regions for the twelve QS-ranked
     institutions. Deliberately coarse: it suggests where to start, and the
     page says a counsellor confirms programmes with the student. */
  var UNIS = [
    { n: 'Aalto University', r: 1, uas: false, city: 'Espoo, Helsinki region', reg: 'capital', f: ['tech', 'business', 'arts'] },
    { n: 'University of Helsinki', r: 2, uas: false, city: 'Helsinki', reg: 'capital', f: ['science', 'health', 'society'] },
    { n: 'University of Turku', r: 3, uas: false, city: 'Turku', reg: 'coast', f: ['health', 'science', 'business', 'society'] },
    { n: 'University of Oulu', r: 4, uas: false, city: 'Oulu', reg: 'north', f: ['tech', 'health', 'science'] },
    { n: 'Tampere University', r: 5, uas: false, city: 'Tampere', reg: 'lakeland', f: ['tech', 'health', 'society'] },
    { n: 'University of Jyväskylä', r: 6, uas: false, city: 'Jyväskylä', reg: 'lakeland', f: ['society', 'science', 'business'] },
    { n: 'University of Eastern Finland', r: 7, uas: false, city: 'Joensuu & Kuopio', reg: 'north', f: ['health', 'science', 'society'] },
    { n: 'LUT University', r: 8, uas: false, city: 'Lappeenranta', reg: 'lakeland', f: ['tech', 'business'] },
    { n: 'Åbo Akademi University', r: 9, uas: false, city: 'Turku', reg: 'coast', f: ['science', 'society', 'business'] },
    { n: 'University of Vaasa', r: 10, uas: false, city: 'Vaasa', reg: 'coast', f: ['business', 'tech'] },
    { n: 'Turku University of Applied Sciences', r: 11, uas: true, city: 'Turku', reg: 'coast', f: ['tech', 'health', 'arts', 'business'] },
    { n: 'Jamk University of Applied Sciences', r: 12, uas: true, city: 'Jyväskylä', reg: 'lakeland', f: ['business', 'tech', 'health'] }
  ];
  // Directory ids (universities-data.js), in rank order, for detail-page links and the shortlist.
  ['aalto-university', 'university-of-helsinki', 'university-of-turku', 'university-of-oulu', 'tampere-university',
   'university-of-jyvaskyla', 'university-of-eastern-finland', 'lut-university', 'abo-akademi-university',
   'university-of-vaasa', 'turku-university-of-applied-sciences', 'jamk-university-of-applied-sciences']
    .forEach(function (id, i) { UNIS[i].id = id; });
  var FIELD_LABEL = { tech: 'Tech & engineering', business: 'Business', health: 'Health & life sciences', science: 'Natural sciences', arts: 'Arts & design', society: 'Education & society' };
  var REGION_LABEL = { capital: 'Helsinki region', lakeland: 'Lakeland', coast: 'Coast & archipelago', north: 'North & east' };

  function initQuiz() {
    var root = $('[data-quiz]');
    if (!root) return;
    var steps = $$('.quiz__step', root);
    var bars = $$('.quiz__progress span', root);
    var back = $('[data-quiz-back]', root);
    var answers = {}, cur = 0, shortlist = [];

    function go(i) {
      cur = i;
      steps.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
      bars.forEach(function (b, j) { b.classList.toggle('is-on', j <= Math.min(i, 2)); });
      back.hidden = i === 0;
    }
    function score(u) {
      var reg = u.reg === answers.region, fld = u.f.indexOf(answers.field) > -1;
      var s = (reg ? 3 : 0) + (fld ? 3 : 0) + (13 - u.r) / 12;
      if (answers.level === "Bachelor's" && u.uas) s += 0.8;
      return { u: u, s: s, reg: reg, fld: fld };
    }
    function result() {
      var pool = UNIS.filter(function (u) { return !(answers.level === 'Doctoral' && u.uas); });
      shortlist = pool.map(score).sort(function (a, b) { return b.s - a.s; }).slice(0, 3);
      var top = shortlist[0];
      var pct = clamp(Math.round(64 + (top.reg ? 15 : 0) + (top.fld ? 15 : 0) + (13 - top.u.r) / 2), 60, 98);

      $('[data-result-title]', root).textContent = top.reg && top.fld ? 'A strong fit, right where you want to be' : 'Great places to start';
      $('[data-result-chips]', root).innerHTML = [answers.level, FIELD_LABEL[answers.field], REGION_LABEL[answers.region]].map(function (c) {
        return '<span class="chip chip--glass">' + escapeHtml(c) + '</span>';
      }).join('');
      $('[data-picks]', root).innerHTML = shortlist.map(function (p, i) {
        var why = p.reg && p.fld ? 'Field + location' : p.fld ? 'Your field' : p.reg ? 'Your location' : 'Top ranked';
        return '<li class="pick" style="--i:' + i + '"><div class="pick__top"><span class="pick__tag">' + why + '</span>' +
          '<span class="pick__rank">QS Europe #' + p.u.r + '</span></div><h4><a href="./university.html?id=' + p.u.id + '">' + escapeHtml(p.u.n) + '</a></h4>' +
          '<span class="pick__loc"><svg class="ico ico-sm"><use href="#i-pin"/></svg>' + escapeHtml(p.u.city) + '</span></li>';
      }).join('');

      var ring = $('[data-ring]', root), val = $('[data-ring-val]', root);
      if (reduceMotion) { ring.style.setProperty('--p', pct); val.textContent = pct + '%'; }
      else {
        var t0 = null;
        requestAnimationFrame(function anim(t) {
          if (t0 === null) t0 = t;
          var k = Math.min(1, (t - t0) / 1100), v = Math.round(pct * (1 - Math.pow(1 - k, 3)));
          ring.style.setProperty('--p', v); val.textContent = v + '%';
          if (k < 1) requestAnimationFrame(anim);
        });
      }
      go(3);
      var r = ring.getBoundingClientRect();
      setTimeout(function () { fx.confetti(r.left + r.width / 2, r.top + r.height / 2, 110); }, 350);
    }

    steps.slice(0, 3).forEach(function (step, i) {
      var key = step.getAttribute('data-q');
      $$('.opt', step).forEach(function (opt) {
        opt.addEventListener('click', function () {
          $$('.opt', step).forEach(function (o) { o.classList.toggle('is-picked', o === opt); });
          answers[key] = opt.getAttribute('data-v');
          setTimeout(function () { if (i < 2) go(i + 1); else result(); }, reduceMotion ? 0 : 260);
        });
      });
    });
    back.addEventListener('click', function () { go(Math.max(0, cur - 1)); });
    $('[data-quiz-restart]', root).addEventListener('click', function () {
      answers = {};
      $$('.opt', root).forEach(function (o) { o.classList.remove('is-picked'); });
      go(0);
    });
    $('[data-quiz-send]', root).addEventListener('click', function () {
      if (window.TCShortlist) {
        shortlist.forEach(function (p) { window.TCShortlist.add({ id: p.u.id, name: p.u.n, city: p.u.city }); });
      } else {
        setDestination('Shortlist: ' + shortlist.map(function (p) { return p.u.n; }).join(', '));
      }
      var lvl = $('[data-level-select]');
      if (lvl && answers.level) lvl.value = answers.level;
      refreshStrength();
    });
  }

  /* ------------------------------------------------------------------ *
   * Universities carousel — buttons, progress bar, drag to scroll
   * ------------------------------------------------------------------ */
  function initCarousel(name) {
    var track = $('[data-car="' + name + '"]');
    if (!track) return;
    var prev = $('[data-car-prev="' + name + '"]');
    var next = $('[data-car-next="' + name + '"]');
    var bar = $('[data-car-bar="' + name + '"]');

    function stepSize() {
      var card = track.firstElementChild;
      if (!card) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 14;
      return card.getBoundingClientRect().width + gap;
    }
    function go(dir) {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (dir > 0 && track.scrollLeft >= max) track.scrollTo({ left: 0, behavior: 'smooth' });
      else if (dir < 0 && track.scrollLeft <= 2) track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
      else track.scrollBy({ left: dir * stepSize(), behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    function paint() {
      if (!bar) return;
      var visible = track.clientWidth / track.scrollWidth;
      var max = track.scrollWidth - track.clientWidth;
      var p = max > 0 ? track.scrollLeft / max : 0;
      bar.style.width = Math.max(12, visible * 100) + '%';
      bar.style.transform = 'translateX(' + (p * (1 / Math.max(visible, 0.12) - 1) * 100) + '%)';
    }
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    track.addEventListener('scroll', function () { requestAnimationFrame(paint); }, { passive: true });
    window.addEventListener('resize', paint);
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    paint();

    // Mouse drag (touch already scrolls natively).
    if (track.hasAttribute('data-drag') && finePointer) {
      var down = false, moved = 0, startX = 0, startL = 0;
      track.style.cursor = 'grab';
      track.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; moved = 0; startX = e.clientX; startL = track.scrollLeft;
        track.style.scrollSnapType = 'none'; track.style.scrollBehavior = 'auto'; track.style.cursor = 'grabbing';
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        moved = Math.max(moved, Math.abs(e.clientX - startX));
        track.scrollLeft = startL - (e.clientX - startX);
      });
      window.addEventListener('pointerup', function () {
        if (!down) return;
        down = false; track.style.cursor = 'grab'; track.style.scrollBehavior = '';
        setTimeout(function () { track.style.scrollSnapType = ''; }, 60);
      });
      // A drag must not count as a click on the card underneath.
      track.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
      track.addEventListener('dragstart', function (e) { e.preventDefault(); });
    }
  }

  /* ------------------------------------------------------------------ *
   * Journey — pinned horizontal scroll story on large screens,
   * a vertical chapter list everywhere else
   * ------------------------------------------------------------------ */
  function initJourney() {
    var sec = $('[data-journey]');
    if (!sec) return;
    var track = $('[data-journey-track]', sec);
    var chapters = $$('.chapter', track);
    var stepEl = $('[data-journey-step]', sec);
    var pinned = false, dist = 0, active = -1;

    function setActive(i) {
      if (i === active) return;
      active = i;
      chapters.forEach(function (c, j) {
        c.classList.toggle('is-active', j === i);
        c.classList.toggle('is-seen', j < i);
      });
      if (stepEl) stepEl.textContent = ('0' + (i + 1)).slice(-2);
    }
    function setup() {
      pinned = !reduceMotion && mq('(min-width: 980px) and (min-height: 620px)');
      sec.classList.toggle('is-pinned', pinned);
      if (pinned) {
        track.style.setProperty('--jx', '0px');
        dist = Math.max(0, track.scrollWidth - window.innerWidth);
        // 1.5x the travel distance so each chapter gets a comfortable dwell.
        sec.style.setProperty('--jh', (window.innerHeight + dist * 1.5) + 'px');
      } else {
        sec.style.removeProperty('--jh');
        track.style.removeProperty('--jx');
      }
      update();
    }
    function update() {
      if (!pinned) return;
      var total = sec.offsetHeight - window.innerHeight;
      var p = total > 0 ? clamp(-sec.getBoundingClientRect().top / total, 0, 1) : 0;
      track.style.setProperty('--jx', (-p * dist) + 'px');
      sec.style.setProperty('--jp', (p * 100) + '%');
      setActive(Math.round(p * (chapters.length - 1)));
    }
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (pinned && !ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); }
    }, { passive: true });
    window.addEventListener('resize', setup);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (pinned) return;
        entries.forEach(function (e) { if (e.isIntersecting) setActive(chapters.indexOf(e.target)); });
      }, { threshold: 0.65 });
      chapters.forEach(function (c) { io.observe(c); });
    }
    setup();
    setActive(0);
    // Images and fonts change widths after first paint.
    window.addEventListener('load', setup);
  }

  /* Gentle parallax on the photo band. */
  function initParallax() {
    var figs = $$('.photo-band figure');
    if (!figs.length || reduceMotion) return;
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      figs.forEach(function (f, i) {
        var r = f.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2) / vh - 0.5;
        $('img', f).style.setProperty('--py', (p * (i % 2 ? 36 : -36)) + 'px');
      });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------ *
   * Spotlight cards, tilt, magnetic buttons
   * ------------------------------------------------------------------ */
  /* Binds spotlight + tilt inside `root`; safe to call again on content
     rendered later (the directory re-renders its cards). */
  function bindSpot(root) {
    $$('[data-spot]', root).forEach(function (el) {
      if (el.__spot) return;
      el.__spot = true;
      var s = document.createElement('span');
      s.className = 'spot'; s.setAttribute('aria-hidden', 'true');
      el.appendChild(s);
      if (!finePointer) return;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    if (!finePointer || reduceMotion) return;
    $$('[data-tilt]', root).forEach(function (el) {
      if (el.__tilt) return;
      el.__tilt = true;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = 'transform .12s ease-out';
        el.style.transform = 'perspective(900px) rotateX(' + (-y * 8) + 'deg) rotateY(' + (x * 8) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .5s var(--ease)';
        el.style.transform = '';
      });
    });
  }

  function initPointerFx() {
    bindSpot(document);
    window.TCFX = { spot: bindSpot, confetti: fx.confetti };
    if (!finePointer || reduceMotion) return;
    $$('[data-magnet]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--tx', clamp((e.clientX - r.left - r.width / 2) * 0.25, -10, 10) + 'px');
        el.style.setProperty('--ty', clamp((e.clientY - r.top - r.height / 2) * 0.35, -8, 8) + 'px');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--tx', '0px');
        el.style.setProperty('--ty', '0px');
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * FAQ accordion + live search
   * ------------------------------------------------------------------ */
  function initAccordion() {
    var items = $$('[data-acc] .acc__item');
    items.forEach(function (item) {
      var q = $('.acc__q', item);
      q.addEventListener('click', function () {
        var wasOpen = item.classList.contains('is-open');
        items.forEach(function (o) {
          o.classList.remove('is-open');
          $('.acc__q', o).setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          item.classList.add('is-open');
          q.setAttribute('aria-expanded', 'true');
        }
      });
    });
    var search = $('[data-faq-search]'), empty = $('[data-faq-empty]');
    if (!search) return;
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase(), shown = 0, first = null;
      items.forEach(function (item) {
        var hit = !q || item.textContent.toLowerCase().indexOf(q) > -1;
        item.hidden = !hit;
        if (hit) { shown++; if (!first) first = item; }
      });
      if (empty) empty.hidden = shown > 0;
      // Open the best match so the answer is visible straight away.
      if (q && first && !first.classList.contains('is-open')) $('.acc__q', first).click();
    });
  }

  /* ------------------------------------------------------------------ *
   * Lead forms → /api/enquiry
   * ------------------------------------------------------------------ */
  var COUNTRY_CODES = [
    ['AE', '+971'], ['AF', '+93'], ['AR', '+54'], ['AT', '+43'], ['AU', '+61'], ['BD', '+880'], ['BE', '+32'], ['BR', '+55'],
    ['CH', '+41'], ['CL', '+56'], ['CN', '+86'], ['CO', '+57'], ['DE', '+49'], ['DK', '+45'], ['DZ', '+213'], ['EG', '+20'],
    ['ES', '+34'], ['FI', '+358'], ['FR', '+33'], ['GR', '+30'], ['HU', '+36'], ['ID', '+62'], ['IE', '+353'], ['IN', '+91'],
    ['IR', '+98'], ['IT', '+39'], ['JP', '+81'], ['KE', '+254'], ['KR', '+82'], ['LK', '+94'], ['MA', '+212'], ['MM', '+95'],
    ['MX', '+52'], ['MY', '+60'], ['NG', '+234'], ['NL', '+31'], ['NO', '+47'], ['NP', '+977'], ['NZ', '+64'], ['PE', '+51'],
    ['PH', '+63'], ['PK', '+92'], ['PL', '+48'], ['PT', '+351'], ['QA', '+974'], ['RO', '+40'], ['RU/KZ', '+7'], ['SA', '+966'],
    ['SE', '+46'], ['SG', '+65'], ['TH', '+66'], ['TN', '+216'], ['TR', '+90'], ['TZ', '+255'], ['UA', '+380'], ['UG', '+256'],
    ['UK', '+44'], ['US/CA', '+1'], ['VE', '+58'], ['VN', '+84'], ['ZA', '+27']
  ];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_RE = /^[0-9]{7,15}$/;

  function fillCountryCodes() {
    $$('[data-cc]').forEach(function (sel) {
      var current = sel.value || '+91';
      sel.innerHTML = COUNTRY_CODES.map(function (c) {
        return '<option value="' + c[1] + '"' + (c[1] === current ? ' selected' : '') + '>' + c[0] + ' ' + c[1] + '</option>';
      }).join('');
    });
  }

  function setDestination(label) {
    var v = label || 'General Finland Inquiry';
    $$('[data-destination-input]').forEach(function (i) { i.value = v; });
    $$('[data-destination-label]').forEach(function (l) { l.textContent = v; });
  }

  /* "Profile strength" meter on the main form — a nudge to finish it. */
  function refreshStrength() {
    var form = $('[data-strength-form]'), bar = $('[data-strength]'), label = $('[data-strength-label]');
    if (!form || !bar) return;
    var f = function (n) { return form.elements[n] ? form.elements[n].value : ''; };
    var pct = 0;
    if (f('name').trim().length > 1) pct += 25;
    if (EMAIL_RE.test(f('email'))) pct += 25;
    if (PHONE_RE.test(f('phone_number').replace(/\D/g, ''))) pct += 30;
    if (f('study_level') && f('study_level') !== 'Not sure') pct += 10;
    if (f('destination') !== 'General Finland Inquiry') pct += 10;
    bar.style.width = pct + '%';
    bar.style.backgroundPosition = (100 - pct) + '% 0';
    label.textContent = pct >= 90 ? 'Ready for review ✓' : pct >= 60 ? 'Looking strong' : pct >= 25 ? 'Getting there' : "Let's start";
  }

  function initForms() {
    fillCountryCodes();

    $$('form[data-lead-form]').forEach(function (form) {
      var btn = $('[data-submit-btn]', form);
      var btnLabel = btn ? btn.textContent : '';
      var okBox = $('[data-form-success]', form);
      var errBox = $('[data-form-error]', form);

      function status(state, msg) {
        if (okBox) okBox.classList.toggle('hidden', state !== 'success');
        if (errBox) {
          errBox.classList.toggle('hidden', state !== 'error');
          if (state === 'error' && msg) ($('[data-form-error-text]', errBox) || errBox).textContent = msg;
        }
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        status('idle');
        var data = {};
        new FormData(form).forEach(function (v, k) { data[k] = v; });

        if (!String(data.name || '').trim()) { status('error', 'Please enter your name.'); return; }
        if (!PHONE_RE.test(String(data.phone_number || '').replace(/\D/g, ''))) {
          status('error', 'Please enter a valid phone number (7-15 digits).'); return;
        }
        if (!EMAIL_RE.test(data.email || '')) { status('error', 'Please enter a valid email address.'); return; }

        data.phone = (data.country_code || '') + ' ' + (data.phone_number || '');
        delete data.country_code;
        delete data.phone_number;
        data.page = enquiryPage();
        Object.keys(UTM).forEach(function (k) { data[k] = UTM[k]; });

        if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
        fetch(ENQUIRY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data)
        })
          .then(function (r) { return r.json().catch(function () { return { success: false }; }); })
          .then(function (res) {
            if (res && res.success) {
              status('success');
              if (btn) { var r = btn.getBoundingClientRect(); fx.confetti(r.left + r.width / 2, r.top, 120); }
              form.reset();
              fillCountryCodes();
              syncShortlist();
              setTimeout(function () { status('idle'); }, 6000);
            } else {
              status('error', (res && res.message) || 'Something went wrong. Please try again.');
            }
          })
          .catch(function () { status('error', 'Network error. Please check your connection and try again.'); })
          .then(function () { if (btn) { btn.disabled = false; btn.textContent = btnLabel; } });
      });
    });

    var sf = $('[data-strength-form]');
    if (sf) { sf.addEventListener('input', refreshStrength); sf.addEventListener('change', refreshStrength); refreshStrength(); }

    // The shared shortlist (built on the directory, detail pages or the quiz)
    // rides along with every enquiry and shows as removable chips.
    syncShortlist();
    if (window.TCShortlist) window.TCShortlist.onChange(syncShortlist);
  }

  function syncShortlist() {
    var SL = window.TCShortlist;
    if (!SL) return;
    var items = SL.all();
    if (items.length) setDestination('Shortlist: ' + items.map(function (x) { return x.name; }).join(', '));
    else if (/^Shortlist: /.test(($('[data-destination-input]') || {}).value || '')) setDestination('');
    $$('[data-sl-chips]').forEach(function (box) {
      box.hidden = !items.length;
      var list = $('[data-sl-chip-list]', box);
      if (list) list.innerHTML = items.map(function (x) {
        return '<span class="slchip"><a href="./university.html?id=' + encodeURIComponent(x.id) + '">' + escapeHtml(x.name) + '</a>' +
          '<button type="button" aria-label="Remove ' + escapeHtml(x.name) + '" data-chip-remove="' + escapeHtml(x.id) + '"><svg class="ico ico-sm"><use href="#i-x"/></svg></button></span>';
      }).join('');
    });
    refreshStrength();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-chip-remove]');
    if (b && window.TCShortlist) window.TCShortlist.remove(b.getAttribute('data-chip-remove'));
  });

  /* Campaign attribution: remember UTM tags from the landing URL for the visit. */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  function utm() {
    var out = {};
    try {
      var p = new URLSearchParams(location.search), stored = JSON.parse(sessionStorage.getItem('tcUtm') || '{}');
      UTM_KEYS.forEach(function (k) { if (p.get(k)) stored[k] = p.get(k).slice(0, 100); });
      sessionStorage.setItem('tcUtm', JSON.stringify(stored));
      out = stored;
    } catch (e) { /* storage unavailable */ }
    return out;
  }
  var UTM = utm();

  /* ------------------------------------------------------------------ *
   * Tutee AI counsellor (scripted answers + lead capture)
   * ------------------------------------------------------------------ */
  var CHAT_WELCOME = "Hi! 👋 I'm your **Tutee Connect AI Counsellor**.\n\nI can answer questions about Finnish residence permits, top Finnish universities, and our 99% success rate programmes. How can I help you today?";

  function cannedReply(text) {
    var q = text.toLowerCase();
    if (/visa|permit|migri|enter finland|interview|refus/.test(q))
      return 'Finland issues a **residence permit for studies**, not a student visa — and a degree student at a higher education institution gets a **continuous A permit for the whole length of the studies**. You apply on **Enter Finland**, show that you have **the funds Migri requires**, take out insurance and identify yourself at a Finnish mission. Ask for the **D visa** in the same application and you can fly before the card arrives. There is **no credibility interview**. Tutee Connect boasts a **99% Finnish permit success rate** on rigorous documentation support.';
    if (/scholarship|fund|financial|aid|bursar/.test(q))
      return 'Finland funds international students well. The **Finland Scholarship** covers **100% of the first year’s tuition plus a relocation grant** for non-EU/EEA master’s entrants at participating institutions, most universities award **50–100% tuition-fee scholarships** in the admission decision, and **doctoral study carries no tuition fee at all**. We analyse your academic profile and help you apply where you have the highest chance of securing funding.';
    if (/cost|fee|tuition|money|expense|budget|loan/.test(q))
      return 'Tuition depends on the institution and programme, and **doctoral study is free of tuition**. Migri also asks you to show that you can cover your living costs. Your counsellor builds an exact budget with you, and we help with **non-collateral education loans**, the **Finland Scholarship** and part-time work.';
    if (/job|work|earn|part.?time|job.?search|permanent residence/.test(q))
      return "Absolutely! A Finnish study permit lets you work an **average of 30 hours a week** in any field, with **no separate work permit** — and the average is taken **across the calendar year**, so you can work full time over the summer. After graduating you can take a **permit to look for work or start a business for up to two years**, and a **Finnish degree removes the period-of-residence requirement for permanent residence** once your Finnish or Swedish is good enough.";
    if (/ielts|pte|duolingo|gmat|exam|english/.test(q))
      return 'This is an **admission** question in Finland, not an immigration one — **Migri sets no language requirement for the permit at all**. Each institution publishes its own list, and **IELTS Academic, TOEFL iBT, PTE Academic and Cambridge C1/C2** are accepted across Finnish higher education. The **Duolingo English Test is accepted by some institutions and not others**, so check the programme before booking it. Many bachelor programmes also set an **entrance examination**.';
    if (/universit|college|aalto|helsinki|tampere|turku|oulu|match/.test(q))
      return 'Finland has **13 universities and 22 universities of applied sciences** under the Ministry of Education and Culture, and **12 of them are ranked in QS Europe 2026**, led by **Aalto** and the **University of Helsinki**. Try the **Find my Finland match** quiz on this page for a quick shortlist, and we will refine it with you.';
    if (/tutee|connect|service|help/.test(q))
      return 'Tutee Connect provides end-to-end support for Finnish admissions! From institution shortlisting and the **Studyinfo** joint application, to the Enter Finland permit file, education loans, and post-landing settlement. We are your one-stop solution.';
    return "That's a great question! Studying in Finland involves a lot of moving parts (the Studyinfo application round, the Enter Finland permit file, insurance, loans), and our experts at Tutee Connect are dedicated to navigating every single detail with you.";
  }

  function initChat() {
    var panel = $('[data-chat]');
    if (!panel) return;
    var list = $('[data-chat-list]', panel);
    var typing = $('[data-chat-typing]', panel);
    var chipRow = $('[data-chat-chips]', panel);
    var form = $('[data-chat-form]', panel);
    var input = $('[data-chat-input]', panel);
    var sendBtn = $('[data-chat-send]', panel);
    var launcher = $('[data-chat-launcher]');
    var stage = 'idle', lead = { name: '', phone: '', email: '' }, askedForDetails = false, seeded = false;

    function clock() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    function push(role, content) {
      var div = document.createElement('div');
      div.className = 'msg ' + (role === 'assistant' ? 'msg--ai' : 'msg--me');
      div.innerHTML = mdToHtml(content) + '<time>' + clock() + '</time>';
      list.insertBefore(div, typing);
      list.scrollTop = list.scrollHeight;
    }
    function setTyping(on) { typing.classList.toggle('hidden', !on); list.scrollTop = list.scrollHeight; }
    function open() {
      if (!seeded) { seeded = true; push('assistant', CHAT_WELCOME); }
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      if (launcher) launcher.classList.add('is-hidden');
      if (mq('(min-width: 561px)')) setTimeout(function () { input.focus(); }, 250);
    }
    function close() {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      if (launcher) launcher.classList.remove('is-hidden');
    }
    function reset() {
      $$('.msg', list).forEach(function (n) { n.remove(); });
      stage = 'idle'; lead = { name: '', phone: '', email: '' }; askedForDetails = false;
      chipRow.classList.remove('hidden');
      input.value = ''; syncSend(); setTyping(false);
      push('assistant', CHAT_WELCOME);
    }
    function submitLead() {
      return fetch(ENQUIRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          subject: 'New Lead from Chatbot!', from_name: 'Tutee AI Counsellor',
          name: lead.name, phone: lead.phone, email: lead.email,
          destination: 'Chatbot General Inquiry', page: enquiryPage()
        })
      }).then(function (r) { return r.json().catch(function () { return { success: false }; }); });
    }
    function later(fn, ms) { setTyping(true); setTimeout(function () { setTyping(false); fn(); }, ms); }

    function send(text) {
      if (!text || !text.trim()) return;
      text = text.trim();
      push('user', text);
      input.value = ''; syncSend();
      chipRow.classList.add('hidden');

      if (stage === 'asking_name') {
        lead.name = text; stage = 'asking_phone';
        return later(function () { push('assistant', 'Thanks ' + text.split(' ')[0] + '! What is the best **phone number** (with country code) to reach you at?'); }, 600);
      }
      if (stage === 'asking_phone') {
        if (!PHONE_RE.test(text.replace(/\D/g, '')))
          return later(function () { push('assistant', "That doesn't look like a valid phone number. Please enter a valid number (e.g., +91 98765 43210)."); }, 500);
        lead.phone = text; stage = 'asking_email';
        return later(function () { push('assistant', 'Got it. Lastly, what is your **email address**?'); }, 600);
      }
      if (stage === 'asking_email') {
        if (!EMAIL_RE.test(text))
          return later(function () { push('assistant', "That doesn't look like a valid email address. Could you double-check and try again?"); }, 500);
        lead.email = text; stage = 'idle';
        push('assistant', 'Perfect! Submitting your profile to our experts now...');
        setTyping(true);
        submitLead().then(function (res) {
          setTyping(false);
          push('assistant', res && res.success
            ? '✅ **Success!** Your profile has been assigned to an expert counsellor. They will contact you shortly to help with your admission and permit process.\n\nIs there anything else I can help you with in the meantime?'
            : 'Oops, something went wrong submitting your profile. Please use the evaluation form on this page or WhatsApp us.');
        }).catch(function () {
          setTyping(false);
          push('assistant', 'Network error while submitting. Please try the evaluation form or WhatsApp!');
        });
        return;
      }
      if (/^evaluate my profile$/i.test(text)) {
        return later(function () {
          stage = 'asking_name';
          push('assistant', "I'd be happy to help you evaluate your profile! Our expert human counsellors review these directly to ensure accuracy.\n\nCould I please get your **full name**?");
        }, 500);
      }
      later(function () {
        push('assistant', cannedReply(text));
        if (!askedForDetails) {
          askedForDetails = true;
          later(function () {
            stage = 'asking_name';
            push('assistant', 'To give you the most accurate and personalised guidance for your profile, could I quickly grab your **full name**?');
          }, 1400);
        }
      }, 700);
    }
    function syncSend() { sendBtn.disabled = !input.value.trim(); }

    $$('[data-chat-open]').forEach(function (b) { b.addEventListener('click', open); });
    $$('[data-chat-close]', panel).forEach(function (b) { b.addEventListener('click', close); });
    $$('[data-chat-reset]', panel).forEach(function (b) { b.addEventListener('click', reset); });
    $$('[data-chat-contact]', panel).forEach(function (b) {
      b.addEventListener('click', function () { close(); scrollToId('contact'); });
    });
    $$('button', chipRow).forEach(function (c) { c.addEventListener('click', function () { send(c.textContent); }); });
    form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
    input.addEventListener('input', syncSend);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
    });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) close(); });
  }

  /* ------------------------------------------------------------------ *
   * Particle hero — snow gathers into the silhouette of Finland, then
   * scrolling moves through 36 → 2 YRS → 30 H → snowfall.
   * Scroll only *chooses* the stage; every morph is a timed, staggered
   * flight along a gentle curve, so the scene is never frozen half-way.
   * ------------------------------------------------------------------ */
  /* Finland's outline as [lon, lat], clockwise from Hanko. Coarse on purpose:
     it only has to read as Finland once it is filled with points. */
  var FI_OUTLINE = [[22.95, 59.82], [23.43, 59.97], [24.94, 60.15], [25.66, 60.3], [26.95, 60.45], [27.8, 60.55],
    [28.85, 61.17], [29.55, 61.55], [30.65, 62.2], [31.3, 62.75], [31.58, 62.9], [30.9, 63.4], [30.55, 64.1],
    [29.95, 64.9], [29.65, 65.6], [29.6, 66.05], [29.1, 66.85], [28.6, 67.7], [28.75, 68.15], [28.45, 68.5],
    [28.7, 68.85], [28.93, 69.05], [29.1, 69.65], [28.5, 69.85], [27.95, 70.09], [27.0, 69.9], [25.85, 69.4],
    [25.0, 68.95], [24.0, 68.65], [22.9, 68.7], [21.7, 69.25], [21.27, 69.31], [20.55, 69.06], [21.6, 68.75],
    [22.5, 68.45], [23.55, 67.95], [23.8, 67.35], [23.95, 66.78], [23.65, 66.3], [24.15, 65.85], [24.55, 65.73],
    [25.35, 65.3], [25.45, 65.0], [24.45, 64.68], [24.0, 64.25], [23.1, 63.85], [22.7, 63.68], [21.6, 63.1],
    [21.3, 62.45], [21.35, 62.27], [21.45, 61.5], [21.45, 61.13], [21.35, 60.8], [22.2, 60.45], [23.1, 60.37]];
  var FI_CITIES = [['Helsinki', 24.94, 60.17], ['Turku', 22.27, 60.45], ['Tampere', 23.76, 61.5], ['Lappeenranta', 28.19, 61.06],
    ['Jyväskylä', 25.75, 62.24], ['Kuopio', 27.68, 62.89], ['Joensuu', 29.76, 62.6], ['Vaasa', 21.62, 63.1],
    ['Oulu', 25.47, 65.01], ['Rovaniemi', 25.73, 66.5]];
  var LON0 = 20.4, LAT0 = 70.2, KX = 0.438;   // equirectangular, squeezed for ~64°N

  function initParticleHero() {
    var sec = $('[data-hp]');
    if (!sec) return;
    var pin = $('.hp__pin', sec), canvas = $('[data-hp-canvas]', sec), tip = $('[data-hp-tip]', sec);
    var steps = $$('[data-hp-step]', sec), ticks = $$('[data-hp-tick]', sec), clock = $('[data-hp-clock]', sec);
    var bgs = $$('[data-hp-bg]', sec);
    var ctx = canvas.getContext && canvas.getContext('2d');

    function tickClock() {
      try { clock.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit' }).format(new Date()); }
      catch (e) { /* keep the placeholder */ }
    }
    if (clock) { tickClock(); setInterval(tickClock, 20000); }
    if (!ctx) return;
    var live = !reduceMotion;
    if (live) sec.classList.add('is-live');

    // Season photos load after the page so they never compete with first paint.
    function loadBgs() { bgs.forEach(function (img) { var s = img.getAttribute('data-src'); if (s) { img.src = s; img.removeAttribute('data-src'); } }); }
    if (live) { if (document.readyState === 'complete') setTimeout(loadBgs, 300); else window.addEventListener('load', function () { setTimeout(loadBgs, 300); }); }

    var STAGES = 5;
    var W = 0, H = 0, dpr = 1, N = 0, parts = [], shapes = [], cities = [];
    var outline = [], STEP = 200;   // px of scroll per stage: two wheel notches
    var stage = -1, mapShown = 0, mapAt = 0, mouse = { x: -9999, y: -9999 }, hover = -1, time = 0;

    function sample(box, draw) {
      var w = Math.max(1, Math.round(box.w)), h = Math.max(1, Math.round(box.h));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var x = c.getContext('2d'); x.fillStyle = '#fff'; draw(x, w, h);
      var data = x.getImageData(0, 0, w, h).data, area = 0;
      for (var yy = 0; yy < h; yy += 2) for (var xx = 0; xx < w; xx += 2) if (data[(yy * w + xx) * 4 + 3] > 128) area += 4;
      var step = Math.max(2, Math.sqrt(area / N) * 0.97), pts = [];
      for (var gy = step / 2; gy < h; gy += step) {
        for (var gx = step / 2; gx < w; gx += step) {
          var jx = gx + (Math.random() - 0.5) * step * 0.6, jy = gy + (Math.random() - 0.5) * step * 0.6;
          var ix = clamp(Math.round(jx), 0, w - 1), iy = clamp(Math.round(jy), 0, h - 1);
          if (data[(iy * w + ix) * 4 + 3] > 128) pts.push([box.x + jx, box.y + jy]);
        }
      }
      for (var i = pts.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
      return pts.length ? pts : [[box.x + w / 2, box.y + h / 2]];
    }
    function mapShape(box) {
      var mw = (31.7 - LON0) * KX, mh = LAT0 - 59.7;
      var s = Math.min(box.w / mw, box.h / mh), ox = box.x + (box.w - mw * s) / 2, oy = box.y + (box.h - mh * s) / 2;
      var P = function (lon, lat) { return [ox + (lon - LON0) * KX * s, oy + (LAT0 - lat) * s]; };
      cities = FI_CITIES.map(function (c) { var q = P(c[1], c[2]); return { name: c[0], x: q[0], y: q[1] }; });
      outline = FI_OUTLINE.map(function (pt) { return P(pt[0], pt[1]); });
      return sample(box, function (x) {
        x.beginPath();
        FI_OUTLINE.forEach(function (pt, i) { var q = P(pt[0], pt[1]); x[i ? 'lineTo' : 'moveTo'](q[0] - box.x, q[1] - box.y); });
        x.closePath(); x.fill();
      });
    }
    function textShape(box, text) {
      return sample(box, function (x, w, h) {
        x.font = '700 100px Quicksand, system-ui, sans-serif';
        var tw = x.measureText(text).width, fsz = Math.min(100 * (w * 0.96) / tw, h * 0.78);
        x.font = '700 ' + fsz + 'px Quicksand, system-ui, sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(text, w / 2, h / 2 + fsz * 0.04);
      });
    }

    function layout() {
      var r = pin.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var mobile = W < 860;
      var mapBox = mobile ? { x: W * 0.08, y: H * 0.13, w: W * 0.84, h: H * 0.45 } : { x: W * 0.5, y: H * 0.09, w: W * 0.44, h: H * 0.84 };
      var txtBox = mobile ? { x: W * 0.05, y: H * 0.2, w: W * 0.9, h: H * 0.32 } : { x: W * 0.55, y: H * 0.26, w: W * 0.39, h: H * 0.46 };
      var n = Math.round(clamp(W * H / 430, 900, 2600));
      if (n !== N) {
        N = n; parts = [];
        for (var i = 0; i < N; i++) {
          parts.push({ x: Math.random() * W, y: Math.random() * H, mode: 'fall',
            fx: 0, fy: 0, tx: 0, ty: 0, cx: 0, cy: 0, t0: 0, dur: 1,
            fall: 14 + Math.random() * 30, sway: Math.random() * 6.28,
            tw: 0.6 + Math.random() * 1.6, g: Math.random() < 0.16, r: 0.8 + Math.random() * 0.9 });
        }
      }
      shapes = [mapShape(mapBox), textShape(txtBox, '36'), textShape(txtBox, '2 YRS'), textShape(txtBox, '30 H'), null];
    }

    var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

    /* Send every particle to stage k: a curved, staggered flight that
       sweeps left to right across the shape. */
    function goTo(k, now, quick) {
      stage = k;
      var s = shapes[k], minX = W, maxX = 0;
      if (s) s.forEach(function (q) { if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0]; });
      var span = Math.max(1, maxX - minX);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], tx, ty;
        if (s) {
          var q = s[i % s.length], extra = i >= s.length;
          tx = q[0] + (extra ? ((i * 7) % 5 - 2) * 0.6 : 0); ty = q[1] + (extra ? ((i * 3) % 5 - 2) * 0.6 : 0);
        } else { tx = Math.random() * W; ty = Math.random() * H * 0.9 - H * 0.1; }
        p.fx = p.x; p.fy = p.y; p.tx = tx; p.ty = ty;
        var dx = tx - p.x, dy = ty - p.y, len = Math.hypot(dx, dy) || 1, bend = (Math.random() - 0.5) * Math.min(260, len * 0.6);
        p.cx = (p.x + tx) / 2 - dy / len * bend; p.cy = (p.y + ty) / 2 + dx / len * bend;
        var order = s ? (tx - minX) / span : Math.random();
        p.t0 = now + (quick ? 0 : order * 0.5 + Math.random() * 0.22) * 1000;
        p.dur = (quick ? 0.5 : 1.05 + Math.random() * 0.45) * 1000;
        p.mode = 'fly';
      }
      if (k === 0) mapAt = now + (quick ? 0 : 1500);
      steps.forEach(function (st, i) { st.classList.toggle('is-on', i === k); });
      ticks.forEach(function (t, i) { t.parentNode.classList.toggle('is-on', i <= k); t.parentNode.classList.toggle('is-now', i === k); });
      bgs.forEach(function (b, i) { b.classList.toggle('is-on', i === k); });
    }

    function update(now, dt) {
      time += dt;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.mode === 'fly') {
          var t = clamp((now - p.t0) / p.dur, 0, 1), e = ease(t), u = 1 - e;
          p.x = u * u * p.fx + 2 * u * e * p.cx + e * e * p.tx;
          p.y = u * u * p.fy + 2 * u * e * p.cy + e * e * p.ty;
          if (t >= 1) p.mode = shapes[stage] ? 'hold' : 'fall';
        } else if (p.mode === 'hold') {
          p.x = p.tx + Math.sin(time * p.tw + i) * 0.55;
          p.y = p.ty + Math.cos(time * p.tw * 0.8 + i) * 0.55;
        } else {
          p.sway += dt * 0.8;
          p.y += p.fall * dt; p.x += Math.sin(p.sway) * 0.25;
          if (p.y > H + 8) { p.y = -8; p.x = Math.random() * W; }
        }
      }
      var want = stage === 0 && now > mapAt ? 1 : 0;
      mapShown += (want - mapShown) * Math.min(1, dt * (want ? 2.2 : 6));
    }

    /* Round, softly anti-aliased dots (pre-rendered once) instead of squares,
       so the map stays crisp at any size. */
    function dotSprite(rgb) {
      var c = document.createElement('canvas'), z = 16, g;
      c.width = c.height = z;
      var x = c.getContext('2d');
      g = x.createRadialGradient(z / 2, z / 2, 0, z / 2, z / 2, z / 2);
      g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.45, 'rgba(' + rgb + ',.95)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      x.fillStyle = g; x.fillRect(0, 0, z, z);
      return c;
    }
    var DOTS = [dotSprite('234,242,255'), dotSprite('125,243,211')];

    // Lantern: snow near the cursor brightens gently; size and position never change.
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var lantern = mouse.x > -999, R = 160, R2 = R * R;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var a = 0.62 + 0.38 * Math.sin(time * p.tw * 2 + i), s = p.r * 2.6;
        if (lantern) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < R2) { var k = 1 - Math.sqrt(d2) / R; a = Math.min(1, a + k * k * 0.35); }
        }
        ctx.globalAlpha = a;
        ctx.drawImage(DOTS[p.g ? 1 : 0], p.x - s / 2, p.y - s / 2, s, s);
      }
      drawNetwork();
      ctx.globalAlpha = 1;
    }

    /* "Connect": lines of light trace from Helsinki to every campus city,
       with pulses travelling along them, once the map has formed. */
    function curve(a, b, i) {
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      var bend = (i % 2 ? 1 : -1) * Math.min(60, len * 0.22);
      return { cx: mx - dy / len * bend, cy: my + dx / len * bend };
    }
    function at(a, c, b, t) {
      var u = 1 - t;
      return [u * u * a.x + 2 * u * t * c.cx + t * t * b.x, u * u * a.y + 2 * u * t * c.cy + t * t * b.y];
    }
    function drawNetwork() {
      if (mapShown < 0.01 || !cities.length) return;
      if (outline.length) {
        ctx.beginPath();
        outline.forEach(function (q, i) { ctx[i ? 'lineTo' : 'moveTo'](q[0], q[1]); });
        ctx.closePath();
        ctx.globalAlpha = 0.1 * mapShown; ctx.fillStyle = '#2fe3b4'; ctx.fill();
        ctx.globalAlpha = 0.75 * mapShown; ctx.strokeStyle = '#9ff5df'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(47,227,180,.8)'; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
      }
      var hub = cities[0], grow = clamp((performance.now() - mapAt) / 1600, 0, 1);
      ctx.lineWidth = 1.1; ctx.strokeStyle = '#2fe3b4';
      for (var i = 1; i < cities.length; i++) {
        var c = cities[i], ctl = curve(hub, c, i), reach = clamp(grow * 1.4 - i * 0.04, 0, 1);
        if (reach <= 0) continue;
        ctx.globalAlpha = 0.32 * mapShown;
        ctx.beginPath(); ctx.moveTo(hub.x, hub.y);
        for (var s = 1; s <= 24; s++) { var q = at(hub, ctl, c, reach * s / 24); ctx.lineTo(q[0], q[1]); }
        ctx.stroke();
        if (reach >= 1) {
          var pt = at(hub, ctl, c, (time * 0.32 + i * 0.17) % 1);
          ctx.globalAlpha = 0.95 * mapShown; ctx.fillStyle = '#c9fff0';
          ctx.beginPath(); ctx.arc(pt[0], pt[1], 2.1, 0, Math.PI * 2); ctx.fill();
        }
      }
      cities.forEach(function (c, i) {
        var on = i === hover, pulse = (time * 0.55 + i * 0.13) % 1;
        ctx.globalAlpha = mapShown * (1 - pulse) * 0.6; ctx.strokeStyle = on ? '#ffd58f' : '#2fe3b4';
        ctx.beginPath(); ctx.arc(c.x, c.y, (i ? 4 : 6) + pulse * (i ? 14 : 22), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = mapShown; ctx.fillStyle = on ? '#ffd58f' : (i ? '#2fe3b4' : '#ffffff');
        ctx.beginPath(); ctx.arc(c.x, c.y, on ? 5 : (i ? 3.4 : 4.6), 0, Math.PI * 2); ctx.fill();
      });
    }

    function stageForScroll() {
      var y = Math.max(0, -sec.getBoundingClientRect().top);
      sec.style.setProperty('--hp-p', clamp(y / (STEP * STAGES), 0, 1).toFixed(4));
      return clamp(Math.floor(y / STEP), 0, STAGES - 1);
    }

    layout();
    if (!live) {
      // Static: the map, fully formed, with its network drawn once.
      parts.forEach(function (p, i) { var q = shapes[0][i % shapes[0].length]; p.x = q[0]; p.y = q[1]; p.mode = 'hold'; });
      stage = 0; mapShown = 1; mapAt = -1e9;
      draw();
      window.addEventListener('resize', function () { layout(); parts.forEach(function (p, i) { var q = shapes[0][i % shapes[0].length]; p.x = q[0]; p.y = q[1]; }); draw(); });
      return;
    }

    var startAt = performance.now();
    var introDone = false;
    function onScroll() {
      if (!introDone) return;
      var k = stageForScroll();
      if (k !== stage) goTo(k, performance.now());
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { layout(); goTo(introDone ? stageForScroll() : 0, performance.now(), true); }, 150);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); if (introDone) goTo(stage, performance.now(), true); });

    // Rail buttons jump to the middle of their chapter.
    ticks.forEach(function (b, i) {
      b.addEventListener('click', function () {
        window.scrollTo({ top: sec.offsetTop + STEP * (i + 0.5), behavior: 'smooth' });
      });
    });

    if (finePointer) {
      pin.addEventListener('pointermove', function (e) {
        var r = pin.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
        hover = -1;
        if (mapShown > 0.5) cities.forEach(function (c, i) { if (Math.hypot(c.x - mouse.x, c.y - mouse.y) < 18) hover = i; });
        if (hover > -1) {
          tip.textContent = cities[hover].name;
          tip.style.transform = 'translate(' + (cities[hover].x + 12) + 'px,' + (cities[hover].y - 12) + 'px)';
          tip.classList.add('is-on');
        } else tip.classList.remove('is-on');
      });
      pin.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; hover = -1; tip.classList.remove('is-on'); });
    }

    var running = false, raf = 0, last = 0, inView = true;
    function frame(now) {
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      // Intro: a moment of snowfall, then the snow gathers into Finland.
      if (!introDone && now - startAt > 700) {
        introDone = true;
        goTo(stageForScroll(), now);
      }
      update(now, dt); draw();
      if (running) raf = requestAnimationFrame(frame);
    }
    function sync() {
      var want = inView && !document.hidden;
      if (want === running) return;
      running = want; last = 0;
      if (running) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { inView = e[0].isIntersecting; sync(); }).observe(pin);
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  /* Footer credit list for the HD photos (CC BY requires visible attribution). */
  function initCredits() {
    var credits = window.TC_PHOTO_CREDITS || {};
    $$('[data-photo-credits-list]').forEach(function (ul) {
      ul.innerHTML = Object.keys(credits).map(function (k) {
        var c = credits[k];
        return '<li>' + escapeHtml(c.subject) + ' &mdash; <a href="' + escapeHtml(c.url) + '" target="_blank" rel="noopener">' +
          escapeHtml(c.author) + '</a>, ' + escapeHtml(c.licence) + '</li>';
      }).join('');
    });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  initMarquees();
  initParticleHero();
  initScrollUi();
  initDrawer();
  initReveal();
  initRotator();
  initHeroPointer();
  initSnow();
  initVelocityRails();
  initSeasons();
  initServices();
  initQuiz();
  initCarousel('uni');
  initJourney();
  initParallax();
  initPointerFx();
  initAccordion();
  initForms();
  initChat();
  initClickSpark();
  initCredits();
})();

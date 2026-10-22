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
    // Headings outside a .reveal block observe themselves.
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
   * Why Finland — season stage. Pinned like the hero on desktop (200px of
   * scroll per season); tabs and swipes work everywhere. The reading
   * column only fades. All motion is inside the photo window: a circle
   * wipe between seasons, a pointer tilt, and season particles (leaves,
   * snow, petals, fireflies) that the cursor stirs and a click gusts.
   * ------------------------------------------------------------------ */
  function seasonFx(canvas) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;
    var W = 0, H = 0, dpr = 1, kind = 0, parts = [], t = 0;
    var DENSITY = [26, 0, 34, 0];                 // per 600x600 window; winter and summer are video
    var LEAF = ['#e2582a', '#f2a93b', '#c8321e', '#f4c04a', '#b5461d'];
    var PETAL = ['#ffd1dc', '#ffb6c8', '#fff0f4', '#f7a8bf'];
    function sprite(rgb) {
      var c = document.createElement('canvas'), z = 32, x = c.getContext('2d');
      c.width = c.height = z;
      var g = x.createRadialGradient(z / 2, z / 2, 0, z / 2, z / 2, z / 2);
      g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.3, 'rgba(' + rgb + ',.8)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      x.fillStyle = g; x.fillRect(0, 0, z, z);
      return c;
    }
    var SNOW = sprite('255,255,255'), FLY = sprite('255,214,120');
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
    function spawn(k, x, y) {
      var p = { k: k, x: x == null ? rnd(0, W) : x, y: y == null ? rnd(0, H) : y, ex: 0, ey: 0, a: 0, ph: rnd(0, 6.28), r: rnd(0, 6.28), vr: rnd(-1.6, 1.6), out: false, ttl: -1 };
      if (k === 0) { p.s = rnd(5, 9); p.vx = rnd(-8, 8); p.vy = rnd(28, 55); p.c = pick(LEAF); }
      else if (k === 1) { p.s = rnd(1, 2.6); p.vx = rnd(-6, 6); p.vy = rnd(18, 42); }
      else if (k === 2) { p.s = rnd(3.5, 6); p.vx = rnd(12, 30); p.vy = rnd(16, 32); p.c = pick(PETAL); }
      else { p.s = rnd(2, 3.6); p.vx = rnd(-6, 6); p.vy = rnd(-16, -5); }
      parts.push(p);
      return p;
    }
    function target() { return Math.round(DENSITY[kind] * Math.min(1.4, W * H / 360000)); }
    function resize() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    function step(dt) {
      t += dt;
      var alive = 0, damp = Math.exp(-2.4 * dt);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i], sx = 0, sy = 0;
        if (p.ttl > 0 && (p.ttl -= dt) <= 0) p.out = true;
        p.ex *= damp; p.ey *= damp;
        if (p.k === 0) sx = Math.sin(t * 1.3 + p.ph) * 22;
        else if (p.k === 1) sx = Math.sin(t * 0.8 + p.ph) * 8;
        else if (p.k === 2) sx = Math.sin(t * 1.8 + p.ph) * 12;
        else { sx = Math.sin(t * 0.7 + p.ph) * 10; sy = Math.cos(t * 0.9 + p.ph) * 6; }
        p.x += (p.vx + sx + p.ex) * dt; p.y += (p.vy + sy + p.ey) * dt; p.r += p.vr * dt;
        p.a = p.out ? p.a - dt * 1.6 : Math.min(1, p.a + dt * 1.2);
        if (p.out) { if (p.a <= 0) parts.splice(i, 1); continue; }
        if (p.x < -24) p.x = W + 20; else if (p.x > W + 24) p.x = -20;
        if (p.vy > 0 && p.y > H + 24) { p.y = -20; p.x = rnd(0, W); }
        if (p.vy < 0 && p.y < -24) { p.y = H + 20; p.x = rnd(0, W); }
        if (p.y < -60 || p.y > H + 60) p.y = p.vy > 0 ? -20 : H + 20;
        if (p.ttl < 0) alive++;
      }
      for (var n = target() - alive, m = 0; n > 0 && m < 3; n--, m++) spawn(kind);
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.a <= 0) continue;
        if (p.k === 1) {
          ctx.globalAlpha = p.a * 0.9;
          ctx.drawImage(SNOW, p.x - p.s * 2, p.y - p.s * 2, p.s * 4, p.s * 4);
        } else if (p.k === 3) {
          ctx.globalAlpha = p.a * (0.45 + 0.55 * Math.abs(Math.sin(t * 1.6 + p.ph)));
          ctx.drawImage(FLY, p.x - p.s * 3, p.y - p.s * 3, p.s * 6, p.s * 6);
        } else {
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.r);
          ctx.scale(1, 0.25 + 0.75 * Math.abs(Math.cos(t * 2 + p.ph)));   // tumbling
          ctx.globalAlpha = p.a * 0.95;
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * (p.k === 0 ? 0.48 : 0.62), 0, 0, 6.2832); ctx.fill();
          if (p.k === 0) { ctx.globalAlpha = p.a * 0.5; ctx.strokeStyle = 'rgba(60,20,0,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-p.s, 0); ctx.lineTo(p.s * 1.3, 0); ctx.stroke(); }
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }
    return {
      resize: resize,
      frame: function (dt) { step(dt); draw(); },
      season: function (k, fill) {
        kind = k;
        parts.forEach(function (p) { if (p.k !== k) p.out = true; });
        if (fill) for (var n = target(); n > 0; n--) spawn(k).a = Math.random();
      },
      stir: function (x, y, dx, dy) {
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i], d = Math.hypot(p.x - x, p.y - y);
          if (d > 130) continue;
          var f = (1 - d / 130) * 3.2;
          p.ex = clamp(p.ex + dx * f, -420, 420); p.ey = clamp(p.ey + dy * f, -420, 420);
        }
      },
      gust: function (x, y) {
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i], ddx = p.x - x, ddy = p.y - y, d = Math.hypot(ddx, ddy) || 1;
          if (d > 220) continue;
          var f = (1 - d / 220) * 320;
          p.ex += ddx / d * f; p.ey += ddy / d * f;
        }
        for (var k = DENSITY[kind] ? 0 : 12; k < 12; k++) {
          var q = spawn(kind, x, y), ang = rnd(0, 6.2832), sp = rnd(120, 300);
          q.a = 1; q.ttl = rnd(1.8, 3); q.ex = Math.cos(ang) * sp; q.ey = Math.sin(ang) * sp;
        }
      }
    };
  }

  function initSeasonStage() {
    var sec = $('[data-ws]');
    if (!sec) return;
    var tabs = $$('[data-ws-tab]', sec), panels = $$('[data-ws-panel]', sec), figs = $$('[data-ws-fig]', sec);
    var win = $('[data-ws-window]', sec), tilt = $('[data-ws-tilt]', sec), bar = $('[data-ws-bar]', sec);
    var N = tabs.length, STEP = 360, stage = -1, seen = false, lastPointer = null;
    var pinMq = window.matchMedia ? window.matchMedia('(min-width: 900px) and (min-height: 620px)') : null;
    function pinned() { return !reduceMotion && !!pinMq && pinMq.matches; }
    function syncLive() { sec.classList.toggle('is-live', pinned()); }
    syncLive();
    if (pinMq) { if (pinMq.addEventListener) pinMq.addEventListener('change', syncLive); else if (pinMq.addListener) pinMq.addListener(syncLive); }
    window.addEventListener('load', function () { figs.forEach(function (f) { var im = $('img', f); if (im) im.loading = 'eager'; }); });
    // Winter and summer are video loops: only the visible one plays, and only on screen.
    function syncVideos() {
      figs.forEach(function (f, k) {
        var v = $('[data-ws-vid]', f);
        if (!v) return;
        if (k === stage && inView && !reduceMotion && !document.hidden) {
          if (v.preload !== 'auto') v.preload = 'auto';
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else if (!v.paused) v.pause();
      });
    }

    var fx = reduceMotion ? null : seasonFx($('[data-ws-fx]', sec));
    if (fx) fx.resize();

    function countUp(panel, quick) {
      var el = $('[data-ws-num]', panel), to = Number(el.getAttribute('data-ws-num'));
      if (quick || reduceMotion) { el.textContent = to; return; }
      var t0 = performance.now(), mine = stage;
      (function tick(now) {
        var k = Math.min(1, (now - t0) / 850);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1 && stage === mine) requestAnimationFrame(tick); else el.textContent = to;
      })(t0);
    }
    function show(i, quick) {
      if (i === stage) return;
      var prev = stage, fig = figs[i];
      stage = i;
      tabs.forEach(function (b, k) {
        var on = k === i;
        b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
      // The new photo wipes open from the pointer, or from the side the year is moving towards.
      var o = lastPointer || (i > prev ? [8, 100] : [92, 0]);
      fig.style.setProperty('--ox', o[0] + '%'); fig.style.setProperty('--oy', o[1] + '%');
      if (quick) fig.style.transition = 'none';
      // Close the incoming photo first (it may still be fully open underneath as the
      // previous season), so the wipe replays on every change, then commit the origin.
      fig.classList.remove('is-prev', 'is-on');
      void fig.offsetWidth;
      figs.forEach(function (f, k) { f.classList.toggle('is-prev', k === prev); f.classList.toggle('is-on', k === i); });
      if (quick) { void fig.offsetWidth; fig.style.transition = ''; }
      if (bar) bar.style.width = ((i + 1) / N * 100) + '%';
      if (seen) countUp(panels[i], quick);
      sec.classList.toggle('is-film', !!$('[data-ws-vid]', fig));
      if (fx) fx.season(i, quick);
      syncVideos();
    }
    function stageForScroll() {
      return clamp(Math.floor(Math.max(0, -sec.getBoundingClientRect().top) / STEP), 0, N - 1);
    }
    function goTo(i) {
      i = clamp(i, 0, N - 1);
      if (pinned()) window.scrollTo({ top: sec.offsetTop + STEP * (i + 0.5), behavior: 'smooth' });
      else show(i);
    }
    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { lastPointer = null; goTo(i); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var k = (i + d + N) % N;
        tabs[k].focus(); lastPointer = null; goTo(k);
      });
    });
    show(0, true);
    window.addEventListener('scroll', function () { if (pinned()) show(stageForScroll()); }, { passive: true });
    // While the stage is pinned, one wheel gesture moves exactly one season
    // (a fast flick or trackpad swipe can't skip ahead); past the first or
    // last season the page scrolls on as normal.
    var wheelLock = 0;
    window.addEventListener('wheel', function (e) {
      if (!pinned() || e.ctrlKey || Math.abs(e.deltaY) < 2) return;
      var r = sec.getBoundingClientRect();
      if (r.top > 1 || r.bottom < window.innerHeight - 1) return;
      var dir = e.deltaY > 0 ? 1 : -1, cur = stageForScroll(), next = cur + dir;
      if (next < 0 || next > N - 1) return;
      e.preventDefault();
      var now = performance.now();
      if (now < wheelLock) return;
      wheelLock = now + 650;
      window.scrollTo({ top: sec.offsetTop + STEP * (next + 0.5), behavior: 'smooth' });
    }, { passive: false });
    if (pinned()) show(stageForScroll(), true);

    // Swipe the window (touch) to move through the year.
    var sx = null, sy = 0;
    win.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    win.addEventListener('pointerup', function (e) {
      if (sx == null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) { lastPointer = null; goTo(stage + (dx < 0 ? 1 : -1)); sec.classList.add('is-stirred'); }
    });
    win.addEventListener('pointercancel', function () { sx = null; });

    function local(e) {
      var r = win.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    }
    var px = null, py = null, moved = 0;
    if (finePointer && !reduceMotion) {
      win.addEventListener('pointermove', function (e) {
        var p = local(e), u = p.x / p.w, v = p.y / p.h;
        tilt.style.setProperty('--ry', ((u - 0.5) * 6).toFixed(2) + 'deg');
        tilt.style.setProperty('--rx', ((0.5 - v) * 4).toFixed(2) + 'deg');
        tilt.style.setProperty('--px', ((0.5 - u) * 18).toFixed(1) + 'px');
        tilt.style.setProperty('--py', ((0.5 - v) * 12).toFixed(1) + 'px');
        lastPointer = [Math.round(u * 100), Math.round(v * 100)];
        if (px != null && fx) fx.stir(p.x, p.y, p.x - px, p.y - py);
        if (px != null && (moved += Math.abs(p.x - px) + Math.abs(p.y - py)) > 400) sec.classList.add('is-stirred');
        px = p.x; py = p.y;
      });
      win.addEventListener('pointerleave', function () {
        px = py = null; lastPointer = null;
        ['--rx', '--ry', '--px', '--py'].forEach(function (k) { tilt.style.removeProperty(k); });
      });
    }
    if (fx) win.addEventListener('click', function (e) { var p = local(e); fx.gust(p.x, p.y); sec.classList.add('is-stirred'); });

    // Count the first stat when the section arrives; animate only while visible.
    var running = false, raf = 0, last = 0, inView = false;
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      fx.frame(dt);
      if (running) raf = requestAnimationFrame(frame);
    }
    function sync() {
      var want = !!fx && inView && !document.hidden;
      if (want === running) return;
      running = want;
      if (running) { last = performance.now(); raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
    }
    if (fx) {
      var rt = 0;
      window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fx.resize, 120); });
      document.addEventListener('visibilitychange', sync);
      document.addEventListener('visibilitychange', syncVideos);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting;
        syncVideos();
        if (inView && !seen) { seen = true; countUp(panels[stage], false); }
        sync();
      }, { threshold: 0.15 }).observe(win);
    } else { seen = true; inView = true; sync(); }
  }



  /* ------------------------------------------------------------------ *
   * What we do — the service dial. Drag or flick the ring (it keeps a
   * little momentum, then snaps), click an icon, or use the arrow keys;
   * whichever service lands in the glowing slot fills the panel. The ring
   * angle lives in --rot; nodes counter-rotate in CSS to stay upright.
   * ------------------------------------------------------------------ */
  function initServices() {
    var services = window.FI_SERVICES || [];
    var root = $('[data-orb]');
    if (!root || !services.length) return;
    var dial = $('[data-orb-dial]', root), ring = $('[data-orb-ring]', root), nodes = $$('[data-orb-node]', root);
    var slot = $('[data-orb-slot]', root), num = $('[data-orb-num]', root), name = $('[data-orb-name]', root);
    var bgs = $$('[data-orb-bg]', root), place = $('[data-orb-place]', root), comet = $('[data-orb-comet]', root);
    var panel = $('#svc-panel'), content = $('[data-svc-content]', root), mark = $('[data-svc-mark]', root);
    var ghost = $('[data-svc-ghost]', root), points = $('[data-svc-points]', root), dots = $$('[data-svc-dot]', root);
    var line = $('.orb__track-line', root), stage = $('.orb__stage', root);
    var wash = $('[data-svc-wash]', root), phase = $('[data-svc-phase]', root), underline = $('.orb__underline', root);
    // Where each service sits: planning, applying, or arriving and settling.
    var PHASES = ['plan', 'plan', 'plan', 'apply', 'apply', 'arrive', 'apply', 'arrive', 'arrive'];
    var PHASE_NAMES = { plan: 'Plan', apply: 'Apply', arrive: 'Arrive & settle' };
    var title = $('[data-svc-title]', root), tag = $('[data-svc-tagline]', root), desc = $('[data-svc-desc]', root), count = $('[data-svc-count]', root);
    var N = nodes.length, STEP = 360 / N, idx = 0, rot = 0, raf = 0, lastFrame = 0;
    var wide = window.matchMedia ? window.matchMedia('(min-width: 960px)') : null;
    var P = wide && wide.matches ? 0 : 90;
    function pad(n) { return ('0' + n).slice(-2); }
    function mod(i) { return ((i % N) + N) % N; }

    /* ---------- ring motion ---------- */
    // The comet trail grows with the spin speed and trails behind the slot.
    var vel = 0, lastT = 0, fadeT = 0;
    function trail() {
      if (!comet) return;
      var L = Math.min(80, Math.abs(vel) * 7);
      comet.style.strokeDasharray = L.toFixed(1) + ' ' + (360 - L).toFixed(1);
      comet.style.strokeDashoffset = vel > 0 ? L.toFixed(1) : '0';
      comet.style.opacity = Math.min(1, L / 18).toFixed(2);
    }
    function setRot(r) {
      var now = performance.now(), d = r - rot;
      vel = vel * 0.6 + (d / Math.max(8, now - lastT)) * 16 * 0.4;
      lastT = now; rot = r;
      ring.style.setProperty('--rot', r.toFixed(2) + 'deg');
      trail();
      clearTimeout(fadeT);
      fadeT = setTimeout(function () { vel = 0; trail(); }, 90);
    }
    function nearest(r) { return mod(Math.round((P - r) / STEP)); }
    function targetFor(i, from) { var t = P - i * STEP; return t + 360 * Math.round(((from == null ? rot : from) - t) / 360); }
    function tween(to, ms) {
      cancelAnimationFrame(raf);
      if (reduceMotion || !ms) { setRot(to); return; }
      var from = rot, t0 = performance.now();
      raf = requestAnimationFrame(function step(now) {
        var k = Math.min(1, Math.max(0, now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        setRot(from + (to - from) * e);
        lastFrame = now;
        raf = k < 1 ? requestAnimationFrame(step) : 0;
      });
    }
    function preview(i) {
      root.classList.toggle('is-preview', i !== idx);
      num.textContent = pad(i + 1);
      name.textContent = nodes[i].getAttribute('data-short');
      nodes.forEach(function (b, k) { b.classList.toggle('is-near', k === i && i !== idx); });
    }

    /* ---------- panel ---------- */
    /* A three-line summary shows; "Read full details" opens the rest. */
    function renderDesc(s) {
      var paras = String(s.desc).split(/\n\s*\n/).map(function (p) { return '<p>' + escapeHtml(p.trim()) + '</p>'; });
      desc.innerHTML = paras[0] + (paras.length > 1
        ? '<div class="svc__extra" id="svc-extra" hidden>' + paras.slice(1).join('') + '</div>' +
          '<button class="svc__more" type="button" aria-expanded="false" aria-controls="svc-extra">Read full details' +
          '<svg class="ico ico-sm"><use href="#i-down"/></svg></button>'
        : '');
      var more = $('.svc__more', desc), extra = $('.svc__extra', desc);
      if (more) more.addEventListener('click', function () {
        var open = more.getAttribute('aria-expanded') !== 'true';
        more.setAttribute('aria-expanded', String(open));
        extra.hidden = !open;
        desc.classList.toggle('is-full', open);
        more.firstChild.textContent = open ? 'Show less' : 'Read full details';
      });
    }
    function select(i, opts) {
      opts = opts || {};
      i = mod(i);
      var prev = idx, s = services[i], node = nodes[i];
      idx = i;
      nodes.forEach(function (b, k) {
        var on = k === i;
        b.classList.toggle('is-on', on); b.classList.remove('is-near');
        b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      });
      if (opts.focus) node.focus({ preventScroll: true });
      root.classList.remove('is-preview');
      num.textContent = pad(i + 1);
      name.textContent = node.getAttribute('data-short');
      root.style.setProperty('--pp', ((i + 1) / N * 100).toFixed(2));
      if (line) line.style.setProperty('--jp', (i / (N - 1) * 100).toFixed(2) + '%');
      dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); d.classList.toggle('is-done', k < i); });
      bgs.forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
      if (place) place.textContent = node.getAttribute('data-place');
      if (opts.spin !== false) tween(targetFor(i), 600);
      if (i === prev && !opts.force) return;
      title.textContent = node.getAttribute('data-title');
      tag.textContent = s.tagline;
      count.textContent = pad(i + 1) + ' / ' + pad(N);
      if (mark) mark.setAttribute('href', '#' + node.getAttribute('data-icon'));
      if (ghost) ghost.textContent = pad(i + 1);
      if (wash && bgs[i]) wash.src = bgs[i].getAttribute('src');
      if (phase) { var ph = PHASES[i] || 'plan'; phase.setAttribute('data-phase', ph); phase.textContent = PHASE_NAMES[ph]; }
      if (points && s.points) points.innerHTML = s.points.map(function (p) {
        return '<li><svg class="ico ico-sm"><use href="#i-check"/></svg><span>' + escapeHtml(p) + '</span></li>';
      }).join('');
      desc.classList.remove('is-full');
      if (panel) panel.setAttribute('aria-labelledby', node.id);
      renderDesc(s);
      if (!reduceMotion && i !== prev) {
        var dir = mod(i - prev) <= N / 2 ? 1 : -1;
        if (content.animate) content.animate([{ opacity: 0, transform: 'translateX(' + (18 * dir) + 'px)' }, { opacity: 1, transform: 'none' }],
          { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
        slot.classList.remove('is-pulse'); void slot.offsetWidth; slot.classList.add('is-pulse');
        if (wash && wash.animate) wash.animate([{ opacity: 0 }, { opacity: 0.5 }], { duration: 600, easing: 'ease-out' });
        if (underline && underline.animate) underline.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 500, delay: 120, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
        $$('li', points).forEach(function (li, k) {
          if (li.animate) li.animate([{ opacity: 0, transform: 'translateY(10px) scale(.98)' }, { opacity: 1, transform: 'none' }],
            { duration: 380, delay: 90 + k * 70, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
        });
      }
    }

    /* ---------- drag / flick ---------- */
    var drag = null, swallowClick = false;
    function angleOf(e, c) { return Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI; }
    function wrap(d) { return d > 180 ? d - 360 : d < -180 ? d + 360 : d; }
    dial.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var r = dial.getBoundingClientRect(), c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      drag = { c: c, a: angleOf(e, c), r0: rot, acc: 0, x: e.clientX, y: e.clientY, t: performance.now(), v: 0, live: false, id: e.pointerId };
      swallowClick = false;
    });
    dial.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.live) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
        drag.live = true;
        cancelAnimationFrame(raf);
        drag.r0 = rot;
        try { dial.setPointerCapture(e.pointerId); } catch (err) {}
        root.classList.add('is-dragging', 'is-touched');
      }
      var a = angleOf(e, drag.c), d = wrap(a - drag.a), now = performance.now(), dt = Math.max(1, now - drag.t);
      drag.a = a; drag.t = now; drag.acc += d;
      drag.v = drag.v * 0.7 + (d / dt) * 0.3;
      setRot(drag.r0 + drag.acc);
      preview(nearest(rot));
    });
    function release(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var d = drag;
      drag = null;
      if (!d.live) return;
      swallowClick = true;
      root.classList.remove('is-dragging');
      var proj = rot + clamp(d.v * 240, -150, 150), i = nearest(proj);
      select(i, { spin: false });
      tween(targetFor(i, proj), 520);
    }
    dial.addEventListener('pointerup', release);
    dial.addEventListener('pointercancel', release);
    dial.addEventListener('lostpointercapture', release);

    /* ---------- clicks, hover, keys ---------- */
    nodes.forEach(function (b, i) {
      b.addEventListener('click', function () {
        if (swallowClick) { swallowClick = false; return; }
        root.classList.add('is-touched');
        select(i);
      });
      b.addEventListener('mouseenter', function () { if (!drag) preview(i); });
      b.addEventListener('mouseleave', function () { if (!drag) preview(idx); });
      b.addEventListener('keydown', function (e) {
        var k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (k) { e.preventDefault(); select(idx + k, { focus: true }); }
        else if (e.key === 'Home') { e.preventDefault(); select(0, { focus: true }); }
        else if (e.key === 'End') { e.preventDefault(); select(N - 1, { focus: true }); }
      });
    });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { select(k); }); });

    /* ---------- wheel over the stage ---------- */
    // Each wheel gesture over the dial's box moves one service. At the first or
    // last service the wheel goes back to scrolling the page (after letting a
    // trackpad's momentum from the last step die out).
    var wheelAcc = 0, lastWheel = 0, lastStep = 0;
    stage.addEventListener('wheel', function (e) {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      var dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      var dir = dy > 0 ? 1 : -1, now = performance.now();
      var atEnd = (dir > 0 && idx === N - 1) || (dir < 0 && idx === 0);
      if (atEnd && now - lastStep > 450) { wheelAcc = 0; return; }
      e.preventDefault();
      if (atEnd) return;
      if (now - lastWheel > 200 || (wheelAcc && (wheelAcc > 0) !== (dy > 0))) wheelAcc = 0;
      lastWheel = now;
      wheelAcc += dy;
      if (Math.abs(wheelAcc) >= 40 && now - lastStep > 280) {
        wheelAcc = 0; lastStep = now;
        root.classList.add('is-touched');
        select(idx + dir);
      }
    }, { passive: false });

    var prevBtn = $('[data-svc-prev]', root), nextBtn = $('[data-svc-next]', root);
    if (prevBtn) prevBtn.addEventListener('click', function () { select(idx - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { select(idx + 1); });
    var cta = $('[data-svc-cta]', root);
    if (cta) cta.addEventListener('click', function () { setDestination('Service: ' + nodes[idx].getAttribute('data-title').replace('&amp;', '&')); });

    // The slot moves from the right (desktop) to the bottom (phones).
    function syncP() { P = wide && wide.matches ? 0 : 90; tween(targetFor(idx), 0); }
    if (wide) { if (wide.addEventListener) wide.addEventListener('change', syncP); else if (wide.addListener) wide.addListener(syncP); }

    window.addEventListener('load', function () { bgs.forEach(function (b) { b.loading = 'eager'; }); });
    select(0, { spin: false, force: true });
    // The dial spins into place the first time it scrolls into view.
    if (reduceMotion || !('IntersectionObserver' in window)) { setRot(targetFor(0)); return; }
    setRot(targetFor(0) - 140);
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      tween(targetFor(idx), 1300);
      // If frames were held back (e.g. a reload that lands on the dial), settle anyway.
      setTimeout(function () {
        if (drag || Math.abs(rot - targetFor(idx)) < 0.5 || (raf && performance.now() - lastFrame < 200)) return;
        cancelAnimationFrame(raf); raf = 0; setRot(targetFor(idx));
      }, 1600);
    }, { threshold: 0.35 });
    io.observe(dial);
  }

  /* ------------------------------------------------------------------ *
   * Funding plan builder — each source switch lights up the degree costs
   * it covers (tags, meter, headline); the help note follows the last
   * source touched, and the button carries the chosen mix to the form.
   * A fully covered plan earns a small burst of confetti.
   * ------------------------------------------------------------------ */
  function initFundingPlan() {
    var root = $('[data-fpl]');
    if (!root) return;
    var srcs = $$('[data-fpl-src]', root), costs = $$('[data-fpl-cost]', root);
    var meter = $('[data-fpl-meter]', root), headline = $('[data-fpl-headline]', root);
    var helpTitle = $('[data-fpl-helptitle]', root), helpText = $('[data-fpl-helptext]', root), chosen = $('[data-fpl-chosen]', root);
    var wasFull = false;
    function picked() { return srcs.filter(function (s) { return s.classList.contains('is-on'); }); }
    function render(focusSrc) {
      var on = picked(), covered = 0;
      costs.forEach(function (c) {
        var key = c.getAttribute('data-fpl-cost');
        var by = on.filter(function (s) { return s.getAttribute('data-covers').split(' ').indexOf(key) > -1; });
        var tags = $('[data-fpl-tags]', c), was = c.classList.contains('is-covered');
        c.classList.toggle('is-covered', by.length > 0);
        $('[data-fpl-state]', c).textContent = by.length ? 'Covered' : 'Not planned yet';
        // Rebuild tags, animating only the newly added ones.
        var before = $$('span', tags).map(function (t) { return t.getAttribute('data-key'); });
        tags.innerHTML = by.map(function (s) {
          var k = s.getAttribute('data-key');
          return '<span data-key="' + k + '"' + (before.indexOf(k) > -1 ? ' style="animation:none"' : '') + '>' + escapeHtml(s.getAttribute('data-tag')) + '</span>';
        }).join('');
        if (by.length) covered++;
        if (!was && by.length && !reduceMotion && c.animate) c.animate([{ transform: 'scale(.97)' }, { transform: 'scale(1.02)' }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
      });
      meter.style.width = (covered / costs.length * 100) + '%';
      headline.textContent = covered === costs.length ? 'All 4 costs planned' : covered + ' of ' + costs.length + ' costs planned';
      chosen.innerHTML = on.length ? '<b>' + on.length + '</b> source' + (on.length > 1 ? 's' : '') + ' in your plan' : 'Switch on a source to start';
      var h = focusSrc || on[on.length - 1] || srcs[0];
      helpTitle.textContent = 'How we help: ' + h.querySelector('b').textContent;
      helpText.textContent = h.getAttribute('data-help');
      var full = covered === costs.length;
      if (full && !wasFull && focusSrc && window.TCFX) {
        var r = $('.fpl__hero', root).getBoundingClientRect();
        window.TCFX.confetti(r.left + r.width / 2, r.top + r.height / 2, 90);
      }
      wasFull = full;
    }
    srcs.forEach(function (s) {
      s.addEventListener('click', function () {
        var on = !s.classList.contains('is-on');
        s.classList.toggle('is-on', on);
        s.setAttribute('aria-checked', String(on));
        render(s);
      });
    });
    $('[data-fpl-cta]', root).addEventListener('click', function () {
      var on = picked().map(function (s) { return s.getAttribute('data-tag'); });
      setDestination('Funding plan: ' + (on.length ? on.join(', ') : 'help me choose'));
    });
    render();
  }



  /* ------------------------------------------------------------------ *
   * Universities — postcards from Finland. Each stamp "mails" its
   * postcard: the old card slides away, the new one lands and the
   * postmark thumps down. Clicking the card flips it to the written back
   * (strengths, city, type, link, shortlist). Chips filter the album.
   * ------------------------------------------------------------------ */
  var PC_FIELDS = { tech: 'Technology', business: 'Business', health: 'Health', science: 'Science', society: 'Society & education', arts: 'Arts & design' };

  function initPostcards() {
    var root = $('[data-pc]');
    if (!root) return;
    var card = $('[data-pc-card]', root), inner = $('[data-pc-inner]', root), front = $('[data-pc-front]', root), back = $('[data-pc-back]', root);
    var stamps = $$('[data-pc-stamp]', root), big = $('[data-pc-big]', root), postmark = $('[data-pc-postmark]', root), hearts = $$('[data-pc-heart]', root);
    var sel = 0, filt = { type: 'all', field: null }, busy = 0;
    var data = stamps.map(function (b, i) {
      return { i: i, id: b.getAttribute('data-id'), name: b.getAttribute('data-name'), big: b.getAttribute('data-big'), where: b.getAttribute('data-where'),
        region: b.getAttribute('data-region'), img: b.getAttribute('data-img'), f: b.getAttribute('data-f').split(' '), uas: b.hasAttribute('data-uas') };
    });
    function set(sel_, text) { var n = $(sel_, root); if (n) n.textContent = text; }
    // The big letters grow to fill the card's width (capped for short names).
    function fitBig() {
      big.style.fontSize = '';
      var room = front.clientWidth * 0.84, w = big.scrollWidth, fs = parseFloat(getComputedStyle(big).fontSize);
      if (w && room) big.style.fontSize = Math.min(fs * room / w, front.clientWidth * 0.24).toFixed(1) + 'px';
    }

    /* ---------- filters ---------- */
    function matches(u) { return (filt.type === 'all' || (filt.type === 'uas') === u.uas) && (!filt.field || u.f.indexOf(filt.field) > -1); }
    function renderFields(u) {
      $('[data-pc-fields]', root).innerHTML = u.f.map(function (k) {
        return '<span' + (k === filt.field ? ' class="is-match"' : '') + '>' + escapeHtml(PC_FIELDS[k] || k) + '</span>';
      }).join('');
    }
    function applyFilter() {
      var shown = 0;
      data.forEach(function (u) { var ok = matches(u); stamps[u.i].classList.toggle('is-out', !ok); if (ok) shown++; });
      set('[data-pc-count]', shown + ' shown');
      if (!matches(data[sel])) { var first = data.filter(matches)[0]; if (first) select(first.i); }
      else renderFields(data[sel]);
    }
    $$('[data-pc-type]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        filt.type = b.getAttribute('data-pc-type');
        $$('[data-pc-type]', root).forEach(function (o) { o.classList.toggle('is-on', o === b); o.setAttribute('aria-pressed', String(o === b)); });
        applyFilter();
      });
    });
    $$('[data-pc-field]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-pc-field');
        filt.field = filt.field === f ? null : f;
        $$('[data-pc-field]', root).forEach(function (o) { var on = o.getAttribute('data-pc-field') === filt.field; o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', String(on)); });
        applyFilter();
      });
    });

    /* ---------- shortlist ---------- */
    function syncHeart() {
      var SL = window.TCShortlist, u = data[sel];
      stamps.forEach(function (b, i) { b.classList.toggle('is-fav', !!(SL && SL.has(data[i].id))); });
      var on = !!(SL && SL.has(u.id));
      hearts.forEach(function (h) { h.setAttribute('aria-pressed', String(on)); h.lastChild.textContent = on ? 'Shortlisted' : 'Shortlist'; });
    }
    // One heart on each side of the card; both stay in sync.
    hearts.forEach(function (heart) { heart.addEventListener('click', function (e) {
      e.stopPropagation();
      var SL = window.TCShortlist, u = data[sel];
      if (!SL) return;
      var ok = SL.toggle({ id: u.id, name: u.name, city: u.where.replace('&amp;', '&') });
      syncHeart();
      if (ok === false && !SL.has(u.id)) heart.lastChild.textContent = 'Shortlist full';
      heart.classList.remove('is-pop'); void heart.offsetWidth; heart.classList.add('is-pop');
    }); });
    if (window.TCShortlist) window.TCShortlist.onChange(syncHeart);

    /* ---------- flip ---------- */
    function flip(to) {
      var on = to == null ? !root.classList.contains('is-flipped') : to;
      root.classList.toggle('is-flipped', on);
      front.setAttribute('aria-hidden', String(on)); back.setAttribute('aria-hidden', String(!on));
      $$('a, button', front).forEach(function (n) { n.tabIndex = on ? -1 : 0; });
      $$('a, button', back).forEach(function (n) { n.tabIndex = on ? 0 : -1; });
    }
    inner.addEventListener('click', function (e) { if (!e.target.closest('a, [data-pc-heart]')) flip(); });
    flip(false);

    /* ---------- select / mail a postcard ---------- */
    function fill(u) {
      big.textContent = u.big;
      big.style.backgroundImage = 'url(' + u.img + ')';
      fitBig();
      set('[data-pc-uni]', u.name);
      set('[data-pc-rank]', u.i + 1); set('[data-pc-rank2]', u.i + 1);
      set('[data-pc-pmcity]', u.big.toUpperCase());
      set('[data-pc-name]', u.name);
      set('[data-pc-where]', u.where.replace('&amp;', '&') + ', ' + u.region.replace('&amp;', '&'));
      set('[data-pc-kind]', u.uas ? 'University of applied sciences' : 'University');
      set('[data-pc-note]', u.name + ' is ranked #' + (u.i + 1) + ' in Finland. Its broad strengths:');
      $('[data-pc-link]', root).setAttribute('href', './university.html?id=' + u.id);
      $('[data-pc-snap]', root).setAttribute('src', u.img);
      set('[data-pc-snapcap]', u.big);
      $('[data-pc-mini]', root).style.backgroundImage = 'url(' + u.img + ')';
      renderFields(u);
      syncHeart();
    }
    function select(i) {
      var u = data[i];
      if (i === sel) { flip(false); return; }
      sel = i;
      stamps.forEach(function (b, k) { var on = k === i; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      if (reduceMotion || !card.animate) { flip(false); fill(u); return; }
      // The current card slides off like a dealt postcard, the new one lands.
      var token = ++busy;
      var out = card.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(-40px, 16px) rotate(-6deg)', opacity: 0 }], { duration: 220, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = function () {
        if (token !== busy) return;
        flip(false); fill(u);
        out.cancel();
        card.animate([{ transform: 'translate(60px, -20px) rotate(7deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
        postmark.animate([{ transform: 'rotate(-14deg) scale(1.8)', opacity: 0 }, { transform: 'rotate(-14deg) scale(.92)', opacity: 1, offset: .7 }, { transform: 'rotate(-14deg) scale(1)', opacity: 1 }],
          { duration: 420, delay: 380, easing: 'ease-out', fill: 'backwards' });
        busy = 0;
      };
    }
    stamps.forEach(function (b, i) {
      b.addEventListener('click', function () { select(i); });
      b.addEventListener('keydown', function (e) {
        var k = { ArrowRight: 1, ArrowDown: 4, ArrowLeft: -1, ArrowUp: -4 }[e.key];
        if (!k) return;
        e.preventDefault();
        var n = clamp(i + k, 0, stamps.length - 1);
        stamps[n].focus(); select(n);
      });
    });

    // The postcard leans toward the cursor.
    if (finePointer && !reduceMotion) {
      var stage = $('.pc__stage', root);
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg'); card.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
      });
      stage.addEventListener('pointerleave', function () { card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); });
    }
    fill(data[0]);
    applyFilter();
    var ft = 0;
    window.addEventListener('resize', function () { clearTimeout(ft); ft = setTimeout(fitBig, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBig);
  }



  /* ------------------------------------------------------------------ *
   * Journey — roadmap. The route is a smooth curve through the six node
   * centres (horizontal zigzag on desktop, a gentle S down the left on
   * phones). It draws in on view, a pulse flows along it, and a marker
   * tours the milestones while in view; hover or focus a card to send
   * the marker there (the tour pauses meanwhile).
   * ------------------------------------------------------------------ */
  function initJourneyRoute() {
    var root = $('[data-rm]');
    if (!root) return;
    var svg = $('[data-rm-svg]', root), steps = $$('[data-rm-step]', root), nodes = $$('[data-rm-node]', root);
    var NS = 'http://www.w3.org/2000/svg', line, flow, dot, halo, stops = [], L = 0;
    var active = -1, pos = 0, raf = 0, timer = 0, inView = false, hover = false, drawn = false;
    function centre(n) {
      var r = n.getBoundingClientRect(), b = root.getBoundingClientRect();
      return [r.left + r.width / 2 - b.left, r.top + r.height / 2 - b.top];
    }
    function build() {
      var pts = nodes.map(centre), d = 'M' + pts[0][0] + ' ' + pts[0][1], segs = [];
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], seg;
        if (Math.abs(dx) > Math.abs(dy)) seg = 'C' + (a[0] + dx / 2) + ' ' + a[1] + ' ' + (b[0] - dx / 2) + ' ' + b[1] + ' ' + b[0] + ' ' + b[1];
        else { var w = (i % 2 ? 1 : -1) * 22; seg = 'C' + (a[0] + w) + ' ' + (a[1] + dy / 2) + ' ' + (b[0] + w) + ' ' + (b[1] - dy / 2) + ' ' + b[0] + ' ' + b[1]; }
        segs.push(seg); d += seg;
      }
      svg.innerHTML = '<defs><linearGradient id="rmGrad" gradientUnits="userSpaceOnUse" x1="' + pts[0][0] + '" y1="' + pts[0][1] + '" x2="' + pts[5][0] + '" y2="' + pts[5][1] + '">' +
        '<stop offset="0" stop-color="#2fe3b4"/><stop offset=".55" stop-color="#8fb8ff"/><stop offset="1" stop-color="#ffd36e"/></linearGradient></defs>' +
        '<path class="rm__base" d="' + d + '"/><path class="rm__line" d="' + d + '"/><path class="rm__flow" d="' + d + '"/>' +
        '<circle class="rm__halo" r="9"/><circle class="rm__traveller" r="6"/>';
      line = $('.rm__line', svg); flow = $('.rm__flow', svg); dot = $('.rm__traveller', svg); halo = $('.rm__halo', svg);
      L = line.getTotalLength();
      // Length along the route at each node: measure each prefix.
      var tmp = document.createElementNS(NS, 'path'), acc = 'M' + pts[0][0] + ' ' + pts[0][1];
      svg.appendChild(tmp);
      stops = [0];
      segs.forEach(function (s) { acc += s; tmp.setAttribute('d', acc); stops.push(tmp.getTotalLength()); });
      svg.removeChild(tmp);
      line.style.strokeDasharray = L;
      line.style.strokeDashoffset = drawn || reduceMotion ? 0 : L;
      place(stops[Math.max(0, active)]);
    }
    function place(len) {
      pos = len;
      var p = line.getPointAtLength(clamp(len, 0, L));
      dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y);
      halo.setAttribute('cx', p.x); halo.setAttribute('cy', p.y);
    }
    var wide = window.matchMedia ? window.matchMedia('(min-width: 1000px)') : { matches: true };
    function go(i) {
      if (i === active) return;
      active = i;
      steps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); s.classList.toggle('is-past', k < i); });
      // On phones the opened card changes the layout, so redraw the route around it.
      if (!wide.matches) { build(); return; }
      var from = pos, to = stops[i];
      cancelAnimationFrame(raf);
      if (reduceMotion) { place(to); return; }
      var t0 = performance.now(), dur = 500 + Math.abs(to - from) * 0.6;
      (function anim(now) {
        var k = Math.min(1, (now - t0) / dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        place(from + (to - from) * e);
        if (k < 1) raf = requestAnimationFrame(anim);
      })(t0);
    }
    function tour() {
      clearTimeout(timer);
      if (!inView || hover || reduceMotion || !wide.matches) return;
      timer = setTimeout(function () { go((active + 1) % steps.length); tour(); }, 3200);
    }
    steps.forEach(function (s, i) {
      var c = $('.rm__card', s);
      [c, nodes[i]].forEach(function (el) {
        el.addEventListener('mouseenter', function () { hover = true; clearTimeout(timer); go(i); });
        el.addEventListener('mouseleave', function () { hover = false; tour(); });
      });
      c.addEventListener('focus', function () { hover = true; clearTimeout(timer); go(i); });
      c.addEventListener('blur', function () { hover = false; tour(); });
      c.addEventListener('click', function () { go(i); });
    });
    build();
    go(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting;
        if (inView && !drawn) {
          drawn = true;
          if (!reduceMotion && line.animate) line.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 1600, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
          else line.style.strokeDashoffset = 0;
          steps.forEach(function (s, k) { if (!reduceMotion && s.animate) $('.rm__card', s).animate([{ opacity: 0, transform: 'translateY(' + (k % 2 ? -14 : 14) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 200 + k * 150, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }); });
        }
        tour();
      }, { threshold: 0.3 }).observe(root);
    } else { drawn = true; line.style.strokeDashoffset = 0; }
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  }





  /* ------------------------------------------------------------------ *
   * Family move planner. The partner switch and the children stepper
   * rebuild the avatar row and the plan: permits, rights and documents,
   * each tagged with who it is for. New rows and avatars animate in.
   * ------------------------------------------------------------------ */
  function initFamilyPlanner() {
    var root = $('[data-fam]');
    if (!root) return;
    var partnerBtn = $('[data-fam-partner]', root), minus = $('[data-fam-minus]', root), plus = $('[data-fam-plus]', root);
    var kidsOut = $('[data-fam-kids]', root), kidsNote = $('[data-fam-kidsnote]', root), avatars = $('[data-fam-avatars]', root);
    var groups = $('[data-fam-groups]', root), summary = $('[data-fam-summary]', root);
    var MAX_KIDS = 5, partner = true, kids = 1, shown = {}, avShown = {}, openGroup = 0;
    var WORDS = ['No children', 'One child', 'Two children', 'Three children', 'Four children', 'Five children'];

    function who(list) {
      return '<span class="fam__who">' + list.map(function (w) {
        var cls = w === 'You' ? 'w-you' : w === 'Partner' ? 'w-partner' : w === 'Everyone' ? 'w-all' : 'w-child';
        return '<span class="' + cls + '">' + w + '</span>';
      }).join('') + '</span>';
    }
    function render(first) {
      var children = [], i;
      for (i = 1; i <= kids; i++) children.push(kids > 1 ? 'Child ' + i : 'Child');
      var family = (partner ? ['Partner'] : []).concat(children), anyone = family.length > 0;

      // Avatars: you, then partner, then each child.
      var av = [{ k: 'you', cls: 'fam__av--you', icon: 'i-cap', label: 'You' }];
      if (partner) av.push({ k: 'partner', cls: 'fam__av--partner', icon: 'i-heart', label: 'Partner' });
      children.forEach(function (c, n) { av.push({ k: 'child' + n, cls: 'fam__av--child', icon: 'i-sprout', label: c }); });
      var nextAv = {};
      avatars.innerHTML = av.map(function (a) {
        nextAv[a.k] = 1;
        return '<span class="fam__av ' + a.cls + (!first && !avShown[a.k] ? ' is-new' : '') + '"><i><svg class="ico"><use href="#' + a.icon + '"/></svg></i><span>' + a.label + '</span></span>';
      }).join('');
      avShown = nextAv;

      // The plan, grouped. Each row: key, text, who it is for.
      var G = [
        { h: 'Residence permits', rows: [
          ['p-you', 'Student residence permit (A permit) for your whole degree', ['You']],
          partner && ['p-partner', 'Residence permit on the basis of family ties', ['Partner']],
          kids && ['p-kids', kids > 1 ? 'A family-ties residence permit for each child' : 'Residence permit on the basis of family ties', children]
        ] },
        { h: 'Rights & everyday life', rows: [
          partner && ['r-work', 'Unrestricted right to work in any job, from day one', ['Partner']],
          kids && ['r-school', 'Free basic education, with free school meals', children],
          ['r-reg', 'Personal identity code and municipality registration', anyone ? ['Everyone'] : ['You']]
        ] },
        { h: 'Documents we prepare with you', rows: [
          ['d-pass', anyone ? 'Valid passports for everyone moving' : 'Valid passport', anyone ? ['Everyone'] : ['You']],
          partner && ['d-marriage', 'Marriage or registered-partnership certificate', ['Partner']],
          kids && ['d-birth', kids > 1 ? 'Birth certificate for each child' : 'Birth certificate', children],
          kids && !partner && ['d-custody', 'Custody papers and the other guardian’s consent, where needed', children],
          anyone && ['d-funds', 'Evidence of funds for each family member, on top of your own', family]
        ] }
      ];
      var next = {}, docs = 0;
      groups.innerHTML = G.map(function (g, gi) {
        var rows = g.rows.filter(Boolean);
        if (g.h.indexOf('Documents') === 0) docs = rows.length;
        return '<section class="fam__group' + (gi === openGroup ? ' is-open' : '') + '"><h4><button type="button" aria-expanded="' + (gi === openGroup) + '" data-fam-group="' + gi + '">' + g.h +
          '<span>' + rows.length + '</span><svg class="ico ico-sm"><use href="#i-down"/></svg></button></h4><ul>' + rows.map(function (r) {
          next[r[0]] = 1;
          return '<li class="fam__item' + (!first && !shown[r[0]] ? ' is-new' : '') + '"><svg class="ico ico-sm"><use href="#i-check"/></svg><div><p>' + escapeHtml(r[1]) + '</p>' + who(r[2]) + '</div></li>';
        }).join('') + '</ul></section>';
      }).join('');
      shown = next;

      var permits = 1 + (partner ? 1 : 0) + kids;
      summary.textContent = permits + ' permit' + (permits > 1 ? 's' : '') + ' · ' + docs + ' document' + (docs > 1 ? 's' : '');
      kidsOut.textContent = kids;
      kidsNote.textContent = kids ? WORDS[kids] + ' joining you' : 'Add children under 18';
      minus.disabled = kids === 0; plus.disabled = kids === MAX_KIDS;
      partnerBtn.classList.toggle('is-on', partner);
      partnerBtn.setAttribute('aria-checked', String(partner));
    }
    // Phones show one plan group at a time; the headers toggle them.
    groups.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fam-group]');
      if (!b) return;
      var g = +b.getAttribute('data-fam-group');
      openGroup = openGroup === g ? -1 : g;
      $$('.fam__group', groups).forEach(function (s, k) { s.classList.toggle('is-open', k === openGroup); $('button', s).setAttribute('aria-expanded', String(k === openGroup)); });
    });
    partnerBtn.addEventListener('click', function () { partner = !partner; render(); });
    minus.addEventListener('click', function () { if (kids > 0) { kids--; render(); } });
    plus.addEventListener('click', function () { if (kids < MAX_KIDS) { kids++; render(); } });
    $('[data-fam-cta]', root).addEventListener('click', function () {
      var parts = [];
      if (partner) parts.push('partner');
      if (kids) parts.push(kids + (kids > 1 ? ' children' : ' child'));
      setDestination('Family move: ' + (parts.length ? 'with ' + parts.join(' and ') : 'just me'));
    });
    render(true);
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
        // Start immediately; a tiny left-to-right offset keeps the wave without a pause.
        p.t0 = now + (quick ? 0 : order * 0.08) * 1000;
        p.dur = (quick ? 0.4 : 0.55 + Math.random() * 0.15) * 1000;
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
  initSeasonStage();
  initServices();
  initPostcards();
  initFundingPlan();
  initJourneyRoute();
  initFamilyPlanner();
  initPointerFx();
  initAccordion();
  initForms();
  initChat();
  initClickSpark();
  initCredits();
})();

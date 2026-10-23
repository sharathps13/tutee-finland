/* ==========================================================================
   Tutee Connect — universities directory (universities.html).
   Each institution opens in a popup with its details and English-taught
   courses; ?open=<id> deep-links straight to one.
   Data: FI_UNIVERSITIES (universities-data.js, optionally refreshed from
   Supabase via supabase-data.js) and FI_PROGRAMMES (programmes-data.js).
   No fees or other monetary values are ever rendered.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var reduceMotion = mq('(prefers-reduced-motion: reduce)');
  var SL = window.TCShortlist;
  var APPLY_URL = './index.html#contact';
  var all = (window.FI_UNIVERSITIES || []).slice();

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fold(s) {
    s = String(s || '').toLowerCase();
    s = s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
    return s.replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function slug(s) { return fold(s).replace(/ /g, '-'); }
  function cityOf(u) { return u.city || String(u.location || '').split(',')[0].trim(); }
  function fieldsOf(u) { return String(u.fields || u.programs || '').split(/\s*[|,]\s*/).filter(Boolean); }
  function isUas(u) { return /applied/i.test(u.type || ''); }
  function progsOf(u) { return (window.FI_PROGRAMMES || {})[u.id] || []; }
  function byId(id) { return all.filter(function (u) { return u.id === id; })[0]; }
  function initials(name) {
    return String(name).replace(/\(.*?\)/g, '').split(/\s+/).filter(function (w) { return /^[A-ZÅÄÖ]/.test(w); })
      .slice(0, 2).map(function (w) { return w[0]; }).join('');
  }
  function cityPhoto(city) { return './assets/img/cities/' + slug(city) + '.jpg'; }
  /* A university's own campus photo where one is published (photo-credits.js
     lists it), otherwise a photo of its campus city. */
  function uniPhoto(u) {
    var own = './assets/img/campus/' + u.id + '.jpg';
    return (window.TC_PHOTO_CREDITS || {})[own.replace('./', '')] ? own : cityPhoto(cityOf(u));
  }
  /* Region tint shown behind a photo until (or instead of) it loads. */
  var TINTS = ['#0a2147,#1d5fc1', '#073b3a,#13a884', '#3b0a2e,#7a0f14', '#1a1446,#6c4bd1', '#0b2a4a,#0e7490'];
  function tint(city) {
    var h = 0, s = slug(city);
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return 'linear-gradient(135deg,' + TINTS[h % TINTS.length] + ')';
  }
  function photoCredit(path) {
    var c = (window.TC_PHOTO_CREDITS || {})[path.replace('./', '')];
    return c ? c.short : '';
  }
  /* Photos load lazily; a missing file just leaves the tinted panel. */
  function guardImages(root) {
    $$('img[data-ph]', root).forEach(function (img) {
      if (img.complete && img.naturalWidth === 0) img.classList.add('is-missing');
      img.addEventListener('error', function () { img.classList.add('is-missing'); });
    });
  }
  function num(n) { return Number(n || 0).toLocaleString('en-GB'); }

  var ICON = {
    heart: '<svg class="ico ico-sm"><use href="#i-heart"/></svg>',
    pin: '<svg class="ico ico-sm"><use href="#i-pin"/></svg>',
    arrow: '<svg class="ico ico-sm"><use href="#i-arrow"/></svg>',
    up: '<svg class="ico ico-sm"><use href="#i-up"/></svg>',
    x: '<svg class="ico ico-sm"><use href="#i-x"/></svg>',
    check: '<svg class="ico ico-sm"><use href="#i-check"/></svg>',
    award: '<svg class="ico ico-sm"><use href="#i-award"/></svg>'
  };

  /* ------------------------------------------------------------------ *
   * Toast + shortlist
   * ------------------------------------------------------------------ */
  var toastTimer = 0;
  function toast(msg) {
    var t = $('[data-toast]');
    if (!t) return;
    t.innerHTML = ICON.check + '<span>' + esc(msg) + '</span>';
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2200);
  }
  function toggleShortlist(u, btn) {
    if (!SL) return;
    var was = SL.has(u.id);
    var ok = SL.toggle({ id: u.id, name: u.name, city: cityOf(u) });
    if (!was && !ok) { toast('Your shortlist is full (' + SL.MAX + ' max)'); return; }
    if (btn) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
    toast(was ? 'Removed from your shortlist' : 'Added to your shortlist');
  }
  function syncHearts() {
    $$('[data-sl-id]').forEach(function (b) { b.setAttribute('aria-pressed', SL && SL.has(b.getAttribute('data-sl-id')) ? 'true' : 'false'); });
  }

  /* The bar at the bottom is always there: it shows the shortlist and
     takes the visitor to the evaluation form, which reads the same store. */
  function initDock() {
    var dock = $('[data-dock]'), drawer = $('[data-sldrawer]');
    if (!dock || !SL) return;
    var count = $('[data-dock-count]', dock), label = $('[data-dock-label]', dock), stack = $('[data-dock-stack]', dock);
    var list = drawer && $('[data-sl-list]', drawer);

    function render(items) {
      var n = items.length;
      dock.classList.toggle('has-items', n > 0);
      count.textContent = n;
      count.classList.remove('pop'); void count.offsetWidth; count.classList.add('pop');
      label.textContent = !n ? 'Tap the heart on any university to add it'
        : n === 1 ? items[0].name : n + ' universities saved';
      stack.innerHTML = items.slice(-4).map(function (x) { return '<span>' + esc(initials(x.name)) + '</span>'; }).join('');
      $$('[data-sl-n]').forEach(function (el) { el.textContent = n; });
      if (list) {
        list.innerHTML = n ? items.map(function (x) {
          return '<div class="slitem"><button type="button" class="slitem__open" data-open-uni="' + esc(x.id) + '">' + esc(x.name) +
            (x.city ? '<span>' + esc(x.city) + '</span>' : '') + '</button>' +
            '<button type="button" aria-label="Remove ' + esc(x.name) + '" data-sl-remove="' + esc(x.id) + '">' + ICON.x + '</button></div>';
        }).join('') : '<p class="sldrawer__empty">Your shortlist is empty. Tap the heart on any university to add it.</p>';
      }
      syncHearts();
    }
    SL.onChange(render);
    render(SL.all());

    if (!drawer) return;
    function open() { drawer.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
    function close() { drawer.classList.remove('is-open'); if (!modalOpen()) document.body.style.overflow = ''; }
    $$('[data-sl-open]').forEach(function (b) { b.addEventListener('click', open); });
    $$('[data-sl-close]', drawer).forEach(function (b) { b.addEventListener('click', close); });
    drawer.addEventListener('click', function (e) {
      var rm = e.target.closest && e.target.closest('[data-sl-remove]');
      if (rm) SL.remove(rm.getAttribute('data-sl-remove'));
      var op = e.target.closest && e.target.closest('[data-open-uni]');
      if (op) { close(); openUni(op.getAttribute('data-open-uni')); }
    });
    var clear = $('[data-sl-clear]', drawer);
    if (clear) clear.addEventListener('click', function () { SL.clear(); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('is-open')) close(); });
  }

  /* ------------------------------------------------------------------ *
   * Directory
   * ------------------------------------------------------------------ */
  function cardHtml(u, i) {
    var city = cityOf(u), on = SL && SL.has(u.id), f = fieldsOf(u), progs = progsOf(u), seen = {};
    progs.forEach(function (p) { if (p.city) seen[p.city] = 1; });
    var nCities = Object.keys(seen).length || 1;
    return '<article class="uc" style="--i:' + i + '">' +
      '<button class="uc__open" type="button" data-open-uni="' + esc(u.id) + '" aria-label="' + esc(u.name) + ': view details and courses"></button>' +
      '<div class="ph" style="--ph-bg:' + tint(city) + '">' +
        '<span class="ph__mono" aria-hidden="true">' + esc(initials(u.name)) + '</span>' +
        '<img data-ph src="' + uniPhoto(u) + '" alt="" loading="lazy" decoding="async">' +
        '<span class="uc__type' + (isUas(u) ? ' uc__type--uas' : '') + '">' + (isUas(u) ? 'Applied Sciences' : 'University') + '</span>' +
        '<button class="slbtn" type="button" data-sl-id="' + esc(u.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="Shortlist ' + esc(u.name) + '">' + ICON.heart + '</button>' +
        '<span class="ph__city">' + ICON.pin + esc(city) + '</span>' +
        (u.ranked ? '<span class="rankpill">' + ICON.award + '#' + esc(u.rank) + ' in Finland</span>' : '') +
      '</div>' +
      '<div class="uc__body">' +
        '<h3>' + esc(u.name) + '</h3>' +
        '<dl class="uc__nums">' +
          '<div><dt>Courses in English</dt><dd>' + (progs.length || '&ndash;') + '</dd></div>' +
          '<div><dt>Study fields</dt><dd>' + f.length + '</dd></div>' +
          '<div><dt>' + (nCities === 1 ? 'Campus city' : 'Campus cities') + '</dt><dd>' + nCities + '</dd></div>' +
        '</dl>' +
        '<div class="uc__fields">' + f.slice(0, 3).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') +
          (f.length > 3 ? '<span class="uc__more">+' + (f.length - 3) + '</span>' : '') + '</div>' +
        '<span class="uc__foot">View details &amp; courses' + ICON.arrow + '</span>' +
      '</div></article>';
  }

  /* Mouse and pen can drag the city rail sideways (touch already swipes
     natively), with a little glide on release. A drag never counts as a
     click on the tile it started on. */
  function initRailDrag(rail) {
    var down = false, moved = false, startX = 0, startLeft = 0, lastX = 0, lastT = 0, v = 0, raf = 0;
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      cancelAnimationFrame(raf);
      down = true; moved = false;
      startX = lastX = e.clientX; startLeft = rail.scrollLeft; lastT = e.timeStamp; v = 0;
    });
    rail.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        rail.classList.add('is-dragging');
        try { rail.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
      }
      if (!moved) return;
      rail.scrollLeft = startLeft - dx;
      var dt = e.timeStamp - lastT;
      if (dt > 0) v = (lastX - e.clientX) / dt;
      lastX = e.clientX; lastT = e.timeStamp;
    });
    function end() {
      if (!down) return;
      down = false;
      if (!moved) return;
      v = Math.max(-2.5, Math.min(2.5, v));   // px per ms
      if (reduceMotion || Math.abs(v) < 0.05) { rail.classList.remove('is-dragging'); return; }
      var t0 = performance.now();
      (function glide(now) {
        var dt = Math.min(32, now - t0); t0 = now;
        var before = rail.scrollLeft;
        rail.scrollLeft += v * dt;
        v *= Math.pow(0.92, dt / 16);
        if (Math.abs(v) > 0.03 && rail.scrollLeft !== before) raf = requestAnimationFrame(glide);
        else rail.classList.remove('is-dragging');
      })(t0);
    }
    rail.addEventListener('pointerup', end);
    rail.addEventListener('pointercancel', end);
    rail.addEventListener('lostpointercapture', end);
    rail.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopImmediatePropagation(); moved = false; }
    }, true);
  }

  function initDirectory() {
    var grid = $('[data-uni-grid]');
    if (!grid) return;
    var search = $('[data-search]'), clearBtn = $('[data-clear]');
    var typeBtns = $$('[data-type]'), fieldBox = $('[data-field-opts]'), sortBtns = $$('[data-sort-opt]');
    var panel = $('[data-filter-panel]'), openBtn = $('[data-filter-open]'), badge = $('[data-filter-n]'), activeBox = $('[data-active-chips]');
    var showBtn = $('[data-filter-show]');
    var countEl = $('[data-count-out]'), empty = $('[data-empty]'), resetBtns = $$('[data-reset]');
    var chipBox = $('[data-field-chips]'), rail = $('[data-city-rail]');
    var state = { q: '', type: '', field: '', city: '', sort: 'rank' };

    var params = new URLSearchParams(location.search);
    ['q', 'type', 'field', 'city', 'sort'].forEach(function (k) { if (params.get(k)) state[k] = params.get(k); });

    function hay(u) {
      if (u.__hay === undefined) {
        u.__hay = fold([u.name, u.location, u.programs, u.fields, u.type, u.alt].join(' ') + ' ' +
          progsOf(u).map(function (p) { return p.n; }).join(' '));
      }
      return u.__hay;
    }
    function stats() {
      var uas = all.filter(isUas).length, progs = 0;
      all.forEach(function (u) { progs += progsOf(u).length; });
      var set = function (k, v) { $$('[data-stat="' + k + '"]').forEach(function (el) { el.textContent = v; }); };
      set('all', all.length); set('uni', all.length - uas); set('uas', uas); set('progs', num(progs));
    }
    function fillFacets() {
      var fields = {}, cities = {};
      all.forEach(function (u) { fieldsOf(u).forEach(function (f) { fields[f] = (fields[f] || 0) + 1; }); var c = cityOf(u); cities[c] = (cities[c] || 0) + 1; });
      var fieldNames = Object.keys(fields).sort();
      if (fieldBox) fieldBox.innerHTML = '<button type="button" data-field-opt="" aria-pressed="false">All fields</button>' + fieldNames.map(function (f) {
        return '<button type="button" data-field-opt="' + esc(f) + '" aria-pressed="false">' + esc(f) + ' <small>' + fields[f] + '</small></button>'; }).join('');
      if (chipBox) chipBox.innerHTML = Object.keys(fields).sort(function (a, b) { return fields[b] - fields[a]; }).slice(0, 7).map(function (f) {
        return '<button type="button" data-field-chip="' + esc(f) + '">' + esc(f) + '</button>';
      }).join('');
      if (rail) rail.innerHTML = Object.keys(cities).sort(function (a, b) { return cities[b] - cities[a] || a.localeCompare(b); }).map(function (c) {
        return '<button type="button" class="ux-city" data-city-tile="' + esc(c) + '" aria-pressed="false" style="--ph-bg:' + tint(c) + '">' +
          '<img data-ph src="' + cityPhoto(c) + '" alt="" loading="lazy" decoding="async">' +
          '<span class="ux-city__txt"><b>' + esc(c) + '</b><small>' + cities[c] + (cities[c] === 1 ? ' institution' : ' institutions') + '</small></span></button>';
      }).join('');
      guardImages(rail);
    }
    function syncUrl() {
      var p = new URLSearchParams(location.search);
      ['q', 'type', 'field', 'city'].forEach(function (k) { if (state[k]) p.set(k, state[k]); else p.delete(k); });
      if (state.sort !== 'rank') p.set('sort', state.sort); else p.delete('sort');
      var qs = p.toString();
      try { history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* file:// */ }
    }
    function render() {
      var q = fold(state.q);
      var rows = all.filter(function (u) {
        if (state.type === 'uni' && isUas(u)) return false;
        if (state.type === 'uas' && !isUas(u)) return false;
        if (state.field && fieldsOf(u).indexOf(state.field) < 0) return false;
        if (state.city && cityOf(u) !== state.city) return false;
        return !q || hay(u).indexOf(q) > -1;
      });
      rows.sort(function (a, b) {
        if (state.sort === 'name') return a.name.localeCompare(b.name);
        if (state.sort === 'programmes') return Number(b.programmes) - Number(a.programmes);
        return (a.rank || 999) - (b.rank || 999);
      });
      grid.innerHTML = rows.map(cardHtml).join('');
      guardImages(grid);
      if (countEl) countEl.innerHTML = '<b>' + rows.length + '</b> of ' + all.length + ' shown';
      if (empty) empty.hidden = rows.length > 0;
      typeBtns.forEach(function (b) { b.setAttribute('aria-pressed', (b.getAttribute('data-type') || '') === state.type ? 'true' : 'false'); });
      $$('[data-field-opt]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-field-opt') === state.field ? 'true' : 'false'); });
      sortBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-sort-opt') === state.sort ? 'true' : 'false'); });
      // Active filters: a badge on the funnel and a removable chip for each.
      var act = [];
      if (state.q) act.push(['q', '\u201c' + state.q + '\u201d']);
      if (state.type) act.push(['type', state.type === 'uas' ? 'Applied sciences' : 'Universities']);
      if (state.field) act.push(['field', state.field]);
      if (state.city) act.push(['city', state.city]);
      if (badge) { badge.hidden = !act.length; badge.textContent = act.length; }
      if (openBtn) openBtn.classList.toggle('has-active', act.length > 0);
      var sortName = state.sort === 'name' ? 'A\u2013Z' : state.sort === 'programmes' ? 'most courses' : 'ranking';
      if (activeBox) activeBox.innerHTML = act.length ? act.map(function (a) {
        return '<button type="button" class="fchip" data-clear-filter="' + a[0] + '" aria-label="Remove filter ' + esc(a[1]) + '">' + esc(a[1]) + ICON.x + '</button>';
      }).join('') + '<button type="button" class="link-btn" data-clear-all>Clear all</button>' : '<span class="fchips__none">All institutions \u00b7 sorted by ' + sortName + '</span>';
      if (showBtn) showBtn.textContent = rows.length ? 'Show ' + rows.length + (rows.length === 1 ? ' institution' : ' institutions') : 'No institutions match';
      $$('[data-field-chip]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-field-chip') === state.field); });
      $$('[data-city-tile]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-city-tile') === state.city ? 'true' : 'false'); });
      if (clearBtn) clearBtn.hidden = !state.q;
      syncUrl();
    }
    function toResults() { $('[data-results]').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }

    // Supabase hand-off (supabase-data.js calls this with fresher rows).
    window.TC_applyUniversities = function (rows) {
      if (!Array.isArray(rows) || !rows.length) return false;
      all = rows; fillFacets(); stats(); render(); return true;
    };
    if (Array.isArray(window.TC_pendingUniversities) && window.TC_pendingUniversities.length) {
      all = window.TC_pendingUniversities; window.TC_pendingUniversities = null;
    }

    if (search) {
      search.value = state.q;
      var t = 0;
      search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = search.value.trim(); render(); }, 90); });
      search.addEventListener('keydown', function (e) { if (e.key === 'Enter') toResults(); });
      window.addEventListener('keydown', function (e) {
        if (e.key === '/' && document.activeElement !== search && !/input|textarea|select/i.test(document.activeElement.tagName) && !modalOpen()) {
          e.preventDefault(); search.focus();
        }
      });
    }
    if (clearBtn) clearBtn.addEventListener('click', function () { search.value = ''; state.q = ''; render(); search.focus(); });
    typeBtns.forEach(function (b) { b.addEventListener('click', function () { state.type = b.getAttribute('data-type') || ''; render(); }); });
    if (fieldBox) fieldBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-field-opt]');
      if (b) { state.field = b.getAttribute('data-field-opt'); render(); }
    });
    sortBtns.forEach(function (b) { b.addEventListener('click', function () { state.sort = b.getAttribute('data-sort-opt'); render(); }); });
    if (activeBox) activeBox.addEventListener('click', function (e) {
      var c = e.target.closest('[data-clear-filter]');
      if (c) { var k = c.getAttribute('data-clear-filter'); state[k] = ''; if (k === 'q' && search) search.value = ''; render(); return; }
      if (e.target.closest('[data-clear-all]')) resetAll();
    });

    // The filter funnel: a panel under the button (a bottom sheet on phones).
    function openPanel() {
      if (!panel) return;
      panel.hidden = false;
      requestAnimationFrame(function () { panel.classList.add('is-open'); });
      document.body.classList.add('filters-open');
      openBtn.setAttribute('aria-expanded', 'true');
      if (mq('(max-width: 699px)')) document.body.style.overflow = 'hidden';
      var first = $('[aria-pressed="true"]', panel); if (first) first.focus({ preventScroll: true });
    }
    function closePanel(refocus) {
      if (!panel || panel.hidden) return;
      panel.classList.remove('is-open');
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('filters-open');
      if (!modalOpen()) document.body.style.overflow = '';
      setTimeout(function () { if (!panel.classList.contains('is-open')) panel.hidden = true; }, reduceMotion ? 0 : 220);
      if (refocus) openBtn.focus({ preventScroll: true });
    }
    if (openBtn) openBtn.addEventListener('click', function () { if (panel.hidden) openPanel(); else closePanel(true); });
    $$('[data-filter-close]').forEach(function (b) { b.addEventListener('click', function () { closePanel(true); }); });
    document.addEventListener('click', function (e) {
      if (panel && !panel.hidden && !panel.contains(e.target) && !openBtn.contains(e.target)) closePanel(false);
    });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel && !panel.hidden) closePanel(true); });
    if (chipBox) chipBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-field-chip]');
      if (!b) return;
      var f = b.getAttribute('data-field-chip');
      state.field = state.field === f ? '' : f;
      render(); toResults();
    });
    if (rail) rail.addEventListener('click', function (e) {
      var b = e.target.closest('[data-city-tile]');
      if (!b) return;
      var c = b.getAttribute('data-city-tile');
      state.city = state.city === c ? '' : c;
      render(); toResults();
    });
    $$('[data-rail]').forEach(function (b) {
      b.addEventListener('click', function () {
        rail.scrollBy({ left: Number(b.getAttribute('data-rail')) * rail.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
    if (rail) initRailDrag(rail);
    function resetAll() {
      state.q = state.type = state.field = state.city = '';
      state.sort = 'rank';
      if (search) search.value = '';
      render();
    }
    resetBtns.forEach(function (b) { b.addEventListener('click', resetAll); });

    // Cards: heart toggles the shortlist, anywhere else opens the popup.
    grid.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-sl-id]');
      if (b) {
        e.preventDefault(); e.stopPropagation();
        var u = byId(b.getAttribute('data-sl-id'));
        if (u) toggleShortlist(u, b);
        return;
      }
      var o = e.target.closest && e.target.closest('[data-open-uni]');
      if (o) openUni(o.getAttribute('data-open-uni'));
    });

    fillFacets();
    stats();
    render();
  }

  /* ------------------------------------------------------------------ *
   * University popup
   * ------------------------------------------------------------------ */
  var um = $('[data-um]'), current = null, lastFocus = null;
  function modalOpen() { return !!(um && !um.hidden); }
  function years(dur) {
    var m = parseInt(dur, 10);
    if (!m || m > 96) return '';
    if (m % 12 === 0) return (m / 12) + (m === 12 ? ' year' : ' years');
    if (m % 6 === 0) return (m / 12) + ' years';
    return m + ' months';
  }
  function progFields(p) { return String(p.fld || '').split(/\s*,\s*/).filter(Boolean); }
  var LEVELS = [['', 'All'], ['bachelor', "Bachelor's"], ['master', "Master's"], ['doctoral', 'Doctoral']];
  function lvlOf(p, k) {
    if (!k) return true;
    if (k === 'bachelor') return /bachelor/i.test(p.lvl);
    if (k === 'master') return /master/i.test(p.lvl);
    return /doctoral/i.test(p.lvl);
  }
  var st = { q: '', lvl: '', fld: '', shown: 12 };

  function renderCourses() {
    if (!current) return;
    var progs = progsOf(current), q = fold(st.q);
    var rows = progs.filter(function (p) {
      return lvlOf(p, st.lvl) && (!st.fld || progFields(p).indexOf(st.fld) > -1) && (!q || fold(p.n + ' ' + p.fld + ' ' + p.city).indexOf(q) > -1);
    });
    var list = $('[data-um-list]', um);
    $('[data-um-count]', um).textContent = progs.length ? rows.length + ' of ' + progs.length : '';
    if (!progs.length) {
      list.innerHTML = '<p class="um__empty">Studyinfo lists no English-taught course for this institution right now. Our counsellors can check current intakes with you.</p>';
    } else if (!rows.length) {
      list.innerHTML = '<p class="um__empty">No courses match those filters.</p>';
    } else {
      list.innerHTML = rows.slice(0, st.shown).map(function (p, i) {
        var meta = [progFields(p).join(', '), p.city, years(p.dur)].filter(Boolean).map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('');
        var name = String(p.n).replace(/\s*\((\d+(?:[.,]\d+)?)\s*yrs?\)\s*$/, '');
        return '<div class="umc" style="animation-delay:' + Math.min(i, 12) * 25 + 'ms">' +
          '<span class="umc__lvl">' + esc(p.lvl) + '</span>' +
          '<b>' + esc(name) + '</b>' +
          '<div class="umc__meta">' + meta + (p.sch ? '<span class="umc__sch">Scholarship available</span>' : '') + '</div></div>';
      }).join('');
    }
    var more = $('[data-um-more]', um);
    more.hidden = rows.length <= st.shown;
    more.textContent = 'Show ' + Math.min(24, rows.length - st.shown) + ' more courses';
    $$('[data-um-lvl]', um).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-um-lvl') === st.lvl ? 'true' : 'false'); });
    $$('[data-um-fld]', um).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-um-fld') === st.fld ? 'true' : 'false'); });
  }

  function fillModal(u) {
    var city = cityOf(u), progs = progsOf(u);
    var text = function (sel, t) { $$(sel, um).forEach(function (el) { el.textContent = t; }); };
    var html = function (sel, h) { $$(sel, um).forEach(function (el) { el.innerHTML = h; }); };
    current = u;
    st = { q: '', lvl: '', fld: '', shown: 12 };
    $('[data-um-q]', um).value = '';

    var img = $('[data-um-photo]', um), path = uniPhoto(u), own = path.indexOf('/campus/') > -1;
    $('.um__hero', um).style.setProperty('--ph-bg', tint(city));
    img.classList.remove('is-missing');
    img.onerror = function () { img.classList.add('is-missing'); };
    img.src = path; img.alt = own ? u.name + ' campus' : 'Campus city: ' + city;
    text('[data-um-mono]', initials(u.name));
    var credit = photoCredit(path);
    text('[data-um-credit]', credit ? 'Header: ' + (own ? u.name : city) + '. ' + credit : '');
    text('[data-um-name]', u.name);
    html('[data-um-where]', ICON.pin + esc(u.location || city) + ', Finland');
    html('[data-um-badges]', '<span class="um__badge">' + (isUas(u) ? 'University of Applied Sciences' : 'University') + '</span>' +
      (u.ranked ? '<span class="um__badge um__badge--gold">' + ICON.award + '#' + esc(u.rank) + ' in Finland &middot; QS Europe 2026</span>' : ''));

    // Numbers
    var cities = {}, fieldCount = {};
    progs.forEach(function (p) {
      if (p.city) cities[p.city] = (cities[p.city] || 0) + 1;
      progFields(p).forEach(function (f) { fieldCount[f] = (fieldCount[f] || 0) + 1; });
    });
    if (!Object.keys(cities).length) cities[city] = 1;
    var fieldNames = Object.keys(fieldCount).sort(function (a, b) { return fieldCount[b] - fieldCount[a]; });
    if (!fieldNames.length) fieldsOf(u).forEach(function (f) { fieldNames.push(f); });
    var cityNames = Object.keys(cities).sort(function (a, b) { return cities[b] - cities[a]; });
    var nLvl = function (k) { return progs.filter(function (p) { return lvlOf(p, k); }).length; };
    html('[data-um-stats]', [
      [progs.length, 'Courses taught in English'],
      [nLvl('bachelor'), "Bachelor's courses"],
      [nLvl('master'), "Master's courses"],
      [nLvl('doctoral'), 'Doctoral courses']
    ].map(function (s) { return '<div><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>'; }).join(''));

    // Level + field filters (only levels this institution offers)
    var levels = LEVELS.filter(function (l) { return !l[0] || progs.some(function (p) { return lvlOf(p, l[0]); }); });
    html('[data-um-lvls]', levels.length > 2 || !progs.length ? levels.map(function (l) {
      var n = progs.filter(function (p) { return lvlOf(p, l[0]); }).length;
      return '<button type="button" data-um-lvl="' + l[0] + '" aria-pressed="false">' + l[1] + ' <small>' + n + '</small></button>';
    }).join('') : '');
    html('[data-um-fields]', fieldNames.length > 1 ? fieldNames.map(function (f) {
      return '<button type="button" data-um-fld="' + esc(f) + '" aria-pressed="false">' + esc(f) + (fieldCount[f] ? ' <small>' + fieldCount[f] + '</small>' : '') + '</button>';
    }).join('') : '');

    // Facts
    text('[data-um-type]', isUas(u) ? 'University of Applied Sciences' : 'University');
    text('[data-um-loc]', u.location || city);
    html('[data-um-cities]', cityNames.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join(''));
    text('[data-um-names]', String(u.alt || '').split(/\s*,\s*/).filter(function (n) { return n && cityNames.indexOf(n) < 0 && n !== city; }).slice(0, 6).join(' · ') || '—');
    $('[data-um-aland]', um).hidden = u.branch !== 'aland';
    syncModalHeart();
    renderCourses();
    var tn = $('[data-um-tabn]', um); if (tn) tn.textContent = progs.length;
    if (um.__tab) um.__tab('courses');
  }
  function syncModalHeart() {
    if (!current) return;
    var on = !!(SL && SL.has(current.id));
    $$('[data-um-sl]', um).forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', on ? 'Remove from shortlist' : 'Add to shortlist'); });
    var l = $('[data-um-sl-label]', um); if (l) l.textContent = on ? 'Shortlisted' : 'Add to shortlist';
  }

  function openUni(id, fromHistory) {
    var u = byId(id);
    if (!um || !u) return;
    var wasOpen = modalOpen();
    if (!wasOpen) lastFocus = document.activeElement;
    fillModal(u);
    um.hidden = false;
    $('[data-um-body]', um).scrollTop = 0;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { um.classList.add('is-open'); });
    $('.um__panel', um).focus({ preventScroll: true });
    document.title = u.name + ' | Finnish universities | Tutee Connect';
    if (!fromHistory) {
      var p = new URLSearchParams(location.search); p.set('open', u.id);
      try { history[wasOpen ? 'replaceState' : 'pushState']({ open: u.id }, '', location.pathname + '?' + p.toString()); } catch (e) { /* file:// */ }
    }
  }
  var BASE_TITLE = document.title;
  function closeUni(fromHistory) {
    if (!modalOpen()) return;
    um.classList.remove('is-open');
    setTimeout(function () { if (!um.classList.contains('is-open')) um.hidden = true; }, reduceMotion ? 0 : 280);
    document.body.style.overflow = '';
    document.title = BASE_TITLE;
    current = null;
    if (!fromHistory) {
      // Step back over the entry openUni pushed; a deep link has none.
      if (history.state && history.state.open && !history.state.landed) history.back();
      else {
        var p = new URLSearchParams(location.search); p.delete('open');
        var qs = p.toString();
        try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* file:// */ }
      }
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function initModal() {
    if (!um) return;
    window.TCOpenUni = function (id) { openUni(id); };   // Tutee AI links open the popup
    // Phones: Courses / About tabs at the top of the popup (hidden elsewhere).
    var body = $('[data-um-body]', um), tabs = document.createElement('div');
    tabs.className = 'um__tabs'; tabs.setAttribute('role', 'tablist');
    tabs.innerHTML = '<button type="button" role="tab" aria-selected="true" data-um-tab="courses">Courses <b data-um-tabn></b></button>' +
      '<button type="button" role="tab" aria-selected="false" data-um-tab="about">About</button>';
    body.insertBefore(tabs, body.firstChild.nextSibling);
    function tab(name) {
      um.classList.toggle('show-about', name === 'about');
      $$('[data-um-tab]', tabs).forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-um-tab') === name ? 'true' : 'false'); });
      var top = tabs.offsetTop - 4;
      if (body.scrollTop > top) body.scrollTop = top;
    }
    $$('[data-um-tab]', tabs).forEach(function (b) { b.addEventListener('click', function () { tab(b.getAttribute('data-um-tab')); }); });
    um.__tab = tab;
    $$('[data-um-close]', um).forEach(function (b) { b.addEventListener('click', function () { closeUni(); }); });
    $$('[data-um-sl]', um).forEach(function (b) { b.addEventListener('click', function () { if (current) toggleShortlist(current, b); }); });
    $('[data-um-apply]', um).addEventListener('click', function () {
      if (current && SL && !SL.has(current.id)) SL.add({ id: current.id, name: current.name, city: cityOf(current) });
    });
    $('[data-um-q]', um).addEventListener('input', function (e) { st.q = e.target.value; st.shown = 12; renderCourses(); });
    um.addEventListener('click', function (e) {
      var l = e.target.closest('[data-um-lvl]');
      if (l) { st.lvl = l.getAttribute('data-um-lvl'); st.shown = 12; renderCourses(); return; }
      var f = e.target.closest('[data-um-fld]');
      if (f) { var v = f.getAttribute('data-um-fld'); st.fld = st.fld === v ? '' : v; st.shown = 12; renderCourses(); }
    });
    $('[data-um-more]', um).addEventListener('click', function () { st.shown += 24; renderCourses(); });
    window.addEventListener('keydown', function (e) {
      if (!modalOpen()) return;
      if (e.key === 'Escape') { closeUni(); return; }
      if (e.key !== 'Tab') return;   // keep focus inside the dialog
      var f = $$('a[href], button:not([disabled]), input', um).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener('popstate', function () {
      var id = new URLSearchParams(location.search).get('open');
      if (id && byId(id)) openUni(id, true); else closeUni(true);
    });
    if (SL) SL.onChange(syncModalHeart);

    var start = new URLSearchParams(location.search).get('open');
    if (start && byId(start)) {
      try { history.replaceState({ open: start, landed: true }, '', location.href); } catch (e) { /* file:// */ }
      openUni(start, true);
    }
  }

  // Every apply link carries the shortlist to the main page's form.
  $$('[data-sl-apply]').forEach(function (a) { a.setAttribute('href', APPLY_URL); });

  initDock();
  initDirectory();
  initModal();
})();

/* ==========================================================================
   Tutee Connect — universities directory (universities.html) and
   university detail page (university.html?id=…).
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
  var finePointer = mq('(hover: hover) and (pointer: fine)');
  var SL = window.TCShortlist;
  var APPLY_URL = './index.html#contact';

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
  function initials(name) {
    return String(name).replace(/\(.*?\)/g, '').split(/\s+/).filter(function (w) { return /^[A-ZÅÄÖ]/.test(w); })
      .slice(0, 2).map(function (w) { return w[0]; }).join('');
  }
  function cityPhoto(city) { return './assets/img/cities/' + slug(city) + '.jpg'; }
  function detailUrl(u) { return './university.html?id=' + encodeURIComponent(u.id); }
  /* Region tint shown behind a card until (or instead of) its photo. */
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

  var ICON = {
    heart: '<svg class="ico"><use href="#i-heart"/></svg>',
    pin: '<svg class="ico ico-sm"><use href="#i-pin"/></svg>',
    arrow: '<svg class="ico ico-sm"><use href="#i-arrow"/></svg>',
    up: '<svg class="ico ico-sm"><use href="#i-up"/></svg>',
    x: '<svg class="ico ico-sm"><use href="#i-x"/></svg>',
    check: '<svg class="ico ico-sm"><use href="#i-check"/></svg>'
  };

  /* ------------------------------------------------------------------ *
   * Toast + shortlist dock + drawer (both pages)
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

  function initDock() {
    var dock = $('[data-dock]'), drawer = $('[data-sldrawer]');
    if (!dock || !SL) return;
    var count = $('[data-dock-count]', dock), label = $('[data-dock-label]', dock), stack = $('[data-dock-stack]', dock);
    var list = drawer && $('[data-sl-list]', drawer);

    function render(items) {
      var n = items.length;
      dock.classList.toggle('is-on', n > 0);
      document.body.classList.toggle('has-dock', n > 0);
      count.textContent = n;
      count.classList.remove('pop'); void count.offsetWidth; count.classList.add('pop');
      label.textContent = n === 1 ? items[0].name : n + ' universities shortlisted';
      stack.innerHTML = items.slice(-3).map(function (x) { return '<span>' + esc(initials(x.name)) + '</span>'; }).join('');
      $$('[data-sl-n]').forEach(function (el) { el.textContent = n; });
      if (list) {
        list.innerHTML = n ? items.map(function (x) {
          return '<div class="slitem"><a href="./university.html?id=' + encodeURIComponent(x.id) + '">' + esc(x.name) +
            (x.city ? '<span>' + esc(x.city) + '</span>' : '') + '</a>' +
            '<button type="button" aria-label="Remove ' + esc(x.name) + '" data-sl-remove="' + esc(x.id) + '">' + ICON.x + '</button></div>';
        }).join('') : '<p class="sldrawer__empty">Your shortlist is empty. Tap the heart on any university to add it.</p>';
      }
      $$('[data-sl-id]').forEach(function (b) { b.setAttribute('aria-pressed', SL.has(b.getAttribute('data-sl-id')) ? 'true' : 'false'); });
    }
    SL.onChange(render);
    render(SL.all());

    if (!drawer) return;
    function open() { drawer.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
    function close() { drawer.classList.remove('is-open'); document.body.style.overflow = ''; }
    $$('[data-sl-open]').forEach(function (b) { b.addEventListener('click', open); });
    $$('[data-sl-close]', drawer).forEach(function (b) { b.addEventListener('click', close); });
    drawer.addEventListener('click', function (e) {
      var rm = e.target.closest && e.target.closest('[data-sl-remove]');
      if (rm) SL.remove(rm.getAttribute('data-sl-remove'));
    });
    var clear = $('[data-sl-clear]', drawer);
    if (clear) clear.addEventListener('click', function () { SL.clear(); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ------------------------------------------------------------------ *
   * Directory
   * ------------------------------------------------------------------ */
  function cardHtml(u, i) {
    var city = cityOf(u), img = cityPhoto(city), on = SL && SL.has(u.id);
    var fields = fieldsOf(u).slice(0, 3);
    return '<article class="ucard" style="--i:' + i + '" data-spot>' +
      '<a class="ucard__link" href="' + detailUrl(u) + '" aria-label="' + esc(u.name) + ' — view details"></a>' +
      '<div class="ph" style="--ph-bg:' + tint(city) + '">' +
        '<span class="ph__mono" aria-hidden="true">' + esc(initials(u.name)) + '</span>' +
        '<img data-ph src="' + img + '" alt="" loading="lazy" decoding="async">' +
        (u.ranked ? '<span class="rankpill"><small>QS EU</small>#' + esc(u.rank) + '</span>' : '') +
        '<button class="slbtn" type="button" data-sl-id="' + esc(u.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="Shortlist ' + esc(u.name) + '">' + ICON.heart + '</button>' +
        '<span class="ph__city">' + ICON.pin + esc(city) + '</span>' +
      '</div>' +
      '<div class="ucard__body">' +
        '<span class="ucard__type' + (isUas(u) ? ' ucard__type--uas' : '') + '">' + (isUas(u) ? 'Applied Sciences' : 'University') + '</span>' +
        '<h3>' + esc(u.name) + '</h3>' +
        '<p class="ucard__meta"><b>' + esc(u.programmes) + '</b> English-taught study options</p>' +
        '<div class="ucard__fields">' + fields.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>' +
        '<span class="ucard__foot">View details' + ICON.arrow + '</span>' +
      '</div></article>';
  }
  function rowHtml(u, i) {
    var city = cityOf(u), on = SL && SL.has(u.id), img = cityPhoto(city);
    var flow = fieldsOf(u).concat([city]).map(function (f) { return '<span>' + esc(f) + '<i style="background-image:url(' + img + ')"></i></span>'; }).join('');
    return '<article class="urow" style="--i:' + i + '" data-preview="' + img + '">' +
      '<a class="ucard__link" href="' + detailUrl(u) + '" aria-label="' + esc(u.name) + ' — view details"></a>' +
      '<span class="urow__rank">' + (u.ranked ? '#' + esc(u.rank) : '&middot;') + '</span>' +
      '<div><div class="urow__name">' + esc(u.name) + '</div><div class="urow__sub">' + esc(city) + ' &middot; ' +
        (isUas(u) ? 'Applied Sciences' : 'University') + ' &middot; ' + esc(u.programmes) + ' English-taught options</div></div>' +
      '<div class="urow__actions"><button class="slbtn" type="button" data-sl-id="' + esc(u.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="Shortlist ' + esc(u.name) + '">' + ICON.heart + '</button></div>' +
      '<div class="urow__flow" aria-hidden="true"><div class="urow__flow-track">' + flow + flow + '</div></div>' +
      '</article>';
  }

  function initDirectory() {
    var grid = $('[data-uni-grid]');
    if (!grid) return;
    var all = (window.FI_UNIVERSITIES || []).slice();
    var search = $('[data-search]'), clearBtn = $('[data-clear]');
    var typeBtns = $$('[data-type]'), fieldSel = $('[data-field]'), citySel = $('[data-city]'), sortSel = $('[data-sort]');
    var viewBtns = $$('[data-view]'), countEl = $('[data-count-out]'), empty = $('[data-empty]'), resetBtns = $$('[data-reset]');
    var quick = $$('[data-quick]');
    var state = { q: '', type: '', field: '', city: '', sort: 'rank', view: 'grid' };
    var byId = {};

    try { state.view = localStorage.getItem('tcDirView') || 'grid'; } catch (e) { /* ignore */ }
    var params = new URLSearchParams(location.search);
    ['q', 'type', 'field', 'city', 'sort'].forEach(function (k) { if (params.get(k)) state[k] = params.get(k); });

    function hay(u) {
      if (u.__hay === undefined) u.__hay = fold([u.name, u.location, u.programs, u.fields, u.type, u.alt].join(' '));
      return u.__hay;
    }
    function fillFacets() {
      var fields = {}, cities = {};
      all.forEach(function (u) { fieldsOf(u).forEach(function (f) { fields[f] = 1; }); cities[cityOf(u)] = 1; });
      if (fieldSel) fieldSel.innerHTML = '<option value="">All study fields</option>' + Object.keys(fields).sort().map(function (f) {
        return '<option value="' + esc(f) + '">' + esc(f) + '</option>'; }).join('');
      if (citySel) citySel.innerHTML = '<option value="">All cities</option>' + Object.keys(cities).sort().map(function (c) {
        return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
      if (fieldSel) fieldSel.value = state.field;
      if (citySel) citySel.value = state.city;
    }
    function syncUrl() {
      var p = new URLSearchParams();
      ['q', 'type', 'field', 'city'].forEach(function (k) { if (state[k]) p.set(k, state[k]); });
      if (state.sort !== 'rank') p.set('sort', state.sort);
      var qs = p.toString();
      try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* file:// */ }
    }
    function render() {
      byId = {};
      all.forEach(function (u) { byId[u.id] = u; });
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
      var list = state.view === 'list';
      grid.classList.toggle('is-list', list);
      grid.innerHTML = rows.map(list ? rowHtml : cardHtml).join('');
      guardImages(grid);
      if (window.TCFX) window.TCFX.spot(grid);
      if (countEl) countEl.innerHTML = '<b>' + rows.length + '</b> / ' + all.length + ' shown';
      if (empty) empty.hidden = rows.length > 0;
      var filtered = !!(state.q || state.type || state.field || state.city);
      resetBtns.forEach(function (b) { b.hidden = !filtered; });
      typeBtns.forEach(function (b) { b.setAttribute('aria-pressed', (b.getAttribute('data-type') || '') === state.type ? 'true' : 'false'); });
      viewBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === state.view ? 'true' : 'false'); });
      quick.forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-quick') === state.q); });
      if (clearBtn) clearBtn.hidden = !state.q;
      syncUrl();
    }

    // Supabase hand-off (supabase-data.js calls this with fresher rows).
    window.TC_applyUniversities = function (rows) {
      if (!Array.isArray(rows) || !rows.length) return false;
      all = rows; fillFacets(); render(); return true;
    };
    if (Array.isArray(window.TC_pendingUniversities) && window.TC_pendingUniversities.length) {
      all = window.TC_pendingUniversities; window.TC_pendingUniversities = null;
    }

    if (search) {
      search.value = state.q;
      var t = 0;
      search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = search.value.trim(); render(); }, 90); });
      window.addEventListener('keydown', function (e) {
        if (e.key === '/' && document.activeElement !== search && !/input|textarea|select/i.test(document.activeElement.tagName)) {
          e.preventDefault(); search.focus();
        }
      });
    }
    if (clearBtn) clearBtn.addEventListener('click', function () { search.value = ''; state.q = ''; render(); search.focus(); });
    typeBtns.forEach(function (b) { b.addEventListener('click', function () { state.type = b.getAttribute('data-type') || ''; render(); }); });
    if (fieldSel) fieldSel.addEventListener('change', function () { state.field = fieldSel.value; render(); });
    if (citySel) citySel.addEventListener('change', function () { state.city = citySel.value; render(); });
    if (sortSel) { sortSel.value = state.sort; sortSel.addEventListener('change', function () { state.sort = sortSel.value; render(); }); }
    viewBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        state.view = b.getAttribute('data-view');
        try { localStorage.setItem('tcDirView', state.view); } catch (e) { /* ignore */ }
        render();
      });
    });
    quick.forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-quick');
        state.q = state.q === v ? '' : v;
        if (search) search.value = state.q;
        render();
        $('[data-results]').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
    resetBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        state.q = state.type = state.field = state.city = '';
        if (search) search.value = '';
        if (fieldSel) fieldSel.value = '';
        if (citySel) citySel.value = '';
        render();
      });
    });

    // Shortlist buttons inside cards (delegated: cards re-render).
    grid.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-sl-id]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var u = byId[b.getAttribute('data-sl-id')];
      if (u) toggleShortlist(u, b);
    });

    // ChromaGrid spotlight across the whole grid.
    if (finePointer && !reduceMotion) {
      grid.classList.add('is-chroma');
      grid.addEventListener('pointermove', function (e) {
        var r = grid.getBoundingClientRect();
        grid.style.setProperty('--gx', (e.clientX - r.left + 40) + 'px');
        grid.style.setProperty('--gy', (e.clientY - r.top + 40) + 'px');
        grid.style.setProperty('--chroma-o', grid.classList.contains('is-list') ? 0 : 1);
      });
      grid.addEventListener('pointerleave', function () { grid.style.setProperty('--chroma-o', 0); });

      // List view: a photo of the campus city follows the cursor.
      var prev = $('[data-cursor-preview]'), img = prev && $('img', prev), cx = 0, cy = 0, tx = 0, ty = 0, raf = 0;
      if (prev) {
        var loop = function () {
          cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
          prev.style.left = cx + 'px'; prev.style.top = cy + 'px';
          raf = prev.classList.contains('is-on') ? requestAnimationFrame(loop) : 0;
        };
        grid.addEventListener('pointermove', function (e) {
          var row = e.target.closest && e.target.closest('.urow');
          tx = e.clientX + 150; ty = e.clientY;
          if (!row) { prev.classList.remove('is-on'); return; }
          var src = row.getAttribute('data-preview');
          if (img.getAttribute('src') !== src) img.setAttribute('src', src);
          if (!prev.classList.contains('is-on')) { cx = tx; cy = ty; prev.classList.add('is-on'); }
          if (!raf) raf = requestAnimationFrame(loop);
        });
        grid.addEventListener('pointerleave', function () { prev.classList.remove('is-on'); });
        img.addEventListener('error', function () { prev.classList.remove('is-on'); });
      }
    }

    fillFacets();
    render();
  }

  /* ------------------------------------------------------------------ *
   * Detail page
   * ------------------------------------------------------------------ */
  function years(dur) {
    var m = parseInt(dur, 10);
    if (!m || m > 96) return '';
    if (m % 12 === 0) return (m / 12) + (m === 12 ? ' year' : ' years');
    if (m % 6 === 0) return (m / 12) + ' years';
    return m + ' months';
  }
  function progFields(p) { return String(p.fld || '').split(/\s*,\s*/).filter(Boolean); }

  function initDetail() {
    var root = $('[data-detail]');
    if (!root) return;
    var id = new URLSearchParams(location.search).get('id') || '';
    var all = window.FI_UNIVERSITIES || [];
    var u = all.filter(function (x) { return x.id === id; })[0];
    if (!u) {
      root.hidden = true;
      $('[data-notfound]').hidden = false;
      document.title = 'University not found | Tutee Connect';
      return;
    }
    var city = cityOf(u), progs = (window.FI_PROGRAMMES || {})[u.id] || [];
    var set = function (sel, html) { $$(sel).forEach(function (el) { el.innerHTML = html; }); };
    var text = function (sel, t) { $$(sel).forEach(function (el) { el.textContent = t; }); };

    document.title = u.name + ' | Study in Finland | Tutee Connect';
    var md = $('meta[name="description"]');
    if (md) md.setAttribute('content', u.name + ' in ' + city + ', Finland: English-taught programmes, study fields and campus cities. Shortlist it and get a free profile evaluation from Tutee Connect.');

    text('[data-u-name]', u.name);
    text('[data-u-city]', city);
    text('[data-u-location]', u.location);
    text('[data-u-type]', isUas(u) ? 'University of Applied Sciences' : 'University');
    set('[data-u-rank]', u.ranked
      ? '<svg class="ico ico-sm"><use href="#i-award"/></svg>QS Europe 2026 &middot; #' + esc(u.rank) + ' in Finland'
      : 'Not ranked in QS Europe 2026');
    $$('[data-u-rank]').forEach(function (el) { el.classList.toggle('chip--gold', !!u.ranked); });

    // Photo
    var img = $('[data-u-photo]'), path = cityPhoto(city);
    if (img) { img.src = path; img.alt = 'Campus city: ' + city; guardImages(img.parentNode); }
    text('[data-u-mono]', initials(u.name));
    var credit = photoCredit(path);
    text('[data-u-credit]', credit ? city + ' · ' + credit : '');

    // Stats
    var cities = {};
    progs.forEach(function (p) { if (p.city) cities[p.city] = (cities[p.city] || 0) + 1; });
    if (!Object.keys(cities).length) cities[city] = 1;
    var fieldCount = {};
    progs.forEach(function (p) { progFields(p).forEach(function (f) { fieldCount[f] = (fieldCount[f] || 0) + 1; }); });
    var fieldNames = Object.keys(fieldCount).sort(function (a, b) { return fieldCount[b] - fieldCount[a]; });
    if (!fieldNames.length) fieldsOf(u).forEach(function (f) { fieldCount[f] = 0; fieldNames.push(f); });
    set('[data-u-stats]', [
      [u.programmes, 'English-taught study options'],
      [u.degrees || progs.length, 'Degree programmes in English'],
      [fieldNames.length, 'Study fields'],
      [Object.keys(cities).length, Object.keys(cities).length === 1 ? 'Campus city' : 'Campus cities']
    ].map(function (s) {
      return '<div class="uni-stat"><b data-count="' + esc(s[0]) + '">' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>';
    }).join(''));

    // Facts aside
    set('[data-u-site]', u.url ? '<a href="' + esc(u.url) + '" target="_blank" rel="noopener">' + esc(u.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + ' ' + ICON.up + '</a>' : 'Not published');
    text('[data-u-names]', String(u.alt || '').split(/\s*,\s*/).filter(function (n) { return n && n !== city; }).slice(0, 8).join(' · ') || '—');
    var aland = $('[data-u-aland]');
    if (aland) aland.hidden = u.branch !== 'aland';
    $$('[data-u-site-btn]').forEach(function (a) { if (u.url) a.href = u.url; else a.hidden = true; });

    // Fields as interactive bars (click one to filter the programme list)
    var maxF = Math.max.apply(null, fieldNames.map(function (f) { return fieldCount[f]; }).concat([1]));
    set('[data-u-fields]', fieldNames.map(function (f, i) {
      return '<button type="button" class="fieldbar" data-fieldbar="' + esc(f) + '" aria-pressed="false" style="--i:' + i + '">' +
        '<span>' + esc(f) + '</span><span class="fieldbar__track"><span class="fieldbar__fill" data-w="' + (fieldCount[f] / maxF * 100) + '"></span></span>' +
        '<span class="fieldbar__n">' + (fieldCount[f] || '') + '</span></button>';
    }).join(''));

    // Campus cities
    set('[data-u-cities]', Object.keys(cities).sort(function (a, b) { return cities[b] - cities[a]; }).map(function (c) {
      return '<span>' + ICON.pin + esc(c) + '</span>';
    }).join(''));

    // Programme explorer
    var listEl = $('[data-prog-list]'), searchEl = $('[data-prog-search]'), lvlBtns = $$('[data-lvl]'), moreBtn = $('[data-prog-more]');
    var countOut = $('[data-prog-count]');
    var st = { q: '', lvl: '', fld: '', shown: 10 };
    function lvlMatch(p) {
      if (!st.lvl) return true;
      if (st.lvl === 'bachelor') return /bachelor/i.test(p.lvl);
      if (st.lvl === 'master') return /master/i.test(p.lvl);
      return /doctoral/i.test(p.lvl);
    }
    function renderProgs() {
      var q = fold(st.q);
      var rows = progs.filter(function (p) {
        return lvlMatch(p) && (!st.fld || progFields(p).indexOf(st.fld) > -1) && (!q || fold(p.n + ' ' + p.fld + ' ' + p.city).indexOf(q) > -1);
      });
      if (countOut) countOut.textContent = rows.length + ' of ' + progs.length;
      if (!progs.length) {
        listEl.innerHTML = '<p class="prog-empty">Studyinfo lists no English-taught programme for this institution right now. Our counsellors can check current intakes with you.</p>';
      } else if (!rows.length) {
        listEl.innerHTML = '<p class="prog-empty">No programmes match those filters.</p>';
      } else {
        listEl.innerHTML = rows.slice(0, st.shown).map(function (p, i) {
          var meta = [progFields(p).join(', '), p.city, years(p.dur)].filter(Boolean).map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('');
          return '<div class="prog" style="animation-delay:' + Math.min(i, 10) * 30 + 'ms"><div><span class="prog__lvl">' + esc(p.lvl) + '</span></div>' +
            (p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.n) + ICON.up + '</a>' : '<b>' + esc(p.n) + '</b>') +
            '<div class="prog__meta">' + meta + (p.sch ? '<span class="prog__sch">Scholarship available</span>' : '') + '</div></div>';
        }).join('');
      }
      if (moreBtn) moreBtn.hidden = rows.length <= st.shown;
      lvlBtns.forEach(function (b) { b.setAttribute('aria-pressed', (b.getAttribute('data-lvl') || '') === st.lvl ? 'true' : 'false'); });
      $$('[data-fieldbar]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-fieldbar') === st.fld ? 'true' : 'false'); });
    }
    if (searchEl) searchEl.addEventListener('input', function () { st.q = searchEl.value; st.shown = 10; renderProgs(); });
    lvlBtns.forEach(function (b) { b.addEventListener('click', function () { st.lvl = b.getAttribute('data-lvl') || ''; st.shown = 10; renderProgs(); }); });
    if (moreBtn) moreBtn.addEventListener('click', function () { st.shown += 20; renderProgs(); });
    $$('[data-fieldbar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-fieldbar');
        st.fld = st.fld === f ? '' : f; st.shown = 10; renderProgs();
        var target = $('#programmes');
        if (st.fld && target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
    renderProgs();

    // Animate field bars when they scroll into view.
    var bars = $$('.fieldbar__fill');
    var grow = function () { bars.forEach(function (b) { b.style.width = b.getAttribute('data-w') + '%'; }); };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { grow(); io.disconnect(); } }, { threshold: 0.3 });
      var fb = $('[data-u-fields]'); if (fb) io.observe(fb); else grow();
    } else grow();

    // Shortlist + apply
    $$('[data-u-sl]').forEach(function (b) {
      b.setAttribute('data-sl-id', u.id);
      b.setAttribute('aria-pressed', SL && SL.has(u.id) ? 'true' : 'false');
      b.addEventListener('click', function () { toggleShortlist(u, b); });
    });
    if (SL) SL.onChange(function () {
      var on = SL.has(u.id);
      $$('[data-u-sl]').forEach(function (b) {
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        var l = $('[data-sl-label]', b); if (l) l.textContent = on ? 'Shortlisted' : 'Add to shortlist';
      });
    });
    $$('[data-u-sl]').forEach(function (b) { var l = $('[data-sl-label]', b); if (l) l.textContent = SL && SL.has(u.id) ? 'Shortlisted' : 'Add to shortlist'; });
    $$('[data-u-apply]').forEach(function (a) {
      a.addEventListener('click', function () { if (SL) SL.add({ id: u.id, name: u.name, city: city }); });
    });

    // Similar institutions: same city first, then same type, by rank.
    var sim = all.filter(function (x) { return x.id !== u.id; }).map(function (x) {
      return { x: x, s: (cityOf(x) === city ? 3 : 0) + (isUas(x) === isUas(u) ? 1 : 0) - (x.rank || 99) / 100 };
    }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3).map(function (o) { return o.x; });
    var simEl = $('[data-u-similar]');
    if (simEl) {
      simEl.innerHTML = sim.map(cardHtml).join('');
      guardImages(simEl);
      simEl.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-sl-id]');
        if (!b) return;
        e.preventDefault(); e.stopPropagation();
        var x = sim.filter(function (s) { return s.id === b.getAttribute('data-sl-id'); })[0];
        if (x) toggleShortlist(x, b);
      });
      if (window.TCFX) window.TCFX.spot(simEl);
    }

    // Hero photo parallax.
    var photo = $('.uni-photo img');
    if (photo && !reduceMotion) {
      window.addEventListener('scroll', function () {
        photo.style.setProperty('--py', Math.min(80, window.scrollY * 0.12) + 'px');
      }, { passive: true });
    }
  }

  // Apply buttons on the dock/drawer carry the shortlist to the main form.
  $$('[data-sl-apply]').forEach(function (a) { a.setAttribute('href', APPLY_URL); });

  initDock();
  initDirectory();
  initDetail();
})();

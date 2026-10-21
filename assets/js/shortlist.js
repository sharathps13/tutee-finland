/* ==========================================================================
   Tutee Connect — shared university shortlist.
   One small store used by the landing page, the directory and every
   university detail page. Persists in localStorage so a shortlist built on
   the directory arrives pre-filled in the main page's evaluation form.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'tcShortlist';
  var LEGACY_KEY = 'selectedUniversity';   // set by the previous directory page
  var MAX = 12;
  var listeners = [];
  var mem = [];                             // fallback when storage is blocked

  function read() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(raw) ? raw.filter(function (x) { return x && x.id && x.name; }) : [];
    } catch (e) { return mem.slice(); }
  }
  function write(list) {
    mem = list.slice(0, MAX);
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* private mode */ }
    listeners.forEach(function (fn) { fn(mem.slice()); });
  }

  // Carry over a single pick from the old directory page, once.
  try {
    var legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      localStorage.removeItem(LEGACY_KEY);
      var cur = read();
      if (!cur.some(function (x) { return x.name === legacy; })) {
        cur.push({ id: legacy.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: legacy });
        write(cur);
      }
    }
  } catch (e) { /* storage unavailable */ }

  // Another tab changed the list.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) listeners.forEach(function (fn) { fn(read()); });
  });

  window.TCShortlist = {
    MAX: MAX,
    all: read,
    has: function (id) { return read().some(function (x) { return x.id === id; }); },
    add: function (item) {
      var list = read();
      if (list.some(function (x) { return x.id === item.id; })) return true;
      if (list.length >= MAX) return false;
      list.push({ id: item.id, name: item.name, city: item.city || '' });
      write(list);
      return true;
    },
    remove: function (id) { write(read().filter(function (x) { return x.id !== id; })); },
    toggle: function (item) {
      if (this.has(item.id)) { this.remove(item.id); return false; }
      return this.add(item);
    },
    clear: function () { write([]); },
    names: function () { return read().map(function (x) { return x.name; }); },
    onChange: function (fn) { listeners.push(fn); }
  };
})();

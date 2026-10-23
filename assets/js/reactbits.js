/* ==========================================================================
   Vanilla ports of React Bits components used across the Finland pages:
   Aurora (WebGL2), Noise, ScrollReveal, ScrollStack, ShinyText,
   DecryptedText, StarBorder and ImageTrail. Rewritten without React, GSAP
   or any third-party runtime so they run under the site's strict CSP.
   Each one is opt-in through a data attribute and does nothing (or renders
   statically) under prefers-reduced-motion.

   Based on React Bits — https://github.com/DavidHDev/react-bits
   MIT + Commons Clause License Condition v1.0
   Copyright (c) 2026 David Haz

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to
   deal in the Software without restriction, including without limitation the
   rights to use, copy, modify, merge, publish, and distribute the Software as
   part of an application, website, or product, subject to the following
   conditions: The above copyright notice and this permission notice shall be
   included in all copies or substantial portions of the Software.
   Commons Clause: you may use this Software, including for any commercial
   purpose, so long as you do not sell, sublicense, or redistribute the
   components themselves — whether alone, in a bundle, or as a ported version.
   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
   ========================================================================== */
(function () {
  'use strict';

  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* Run `tick(dt, now)` on rAF only while `el` is on screen and the tab is visible. */
  function visibleLoop(el, tick) {
    var on = false, raf = 0, last = 0, inView = true;
    function frame(now) {
      var dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
      last = now;
      tick(dt, now);
      if (on) raf = requestAnimationFrame(frame);
    }
    function sync() {
      var want = inView && !document.hidden;
      if (want === on) return;
      on = want; last = 0;
      if (on) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { inView = e[0].isIntersecting; sync(); }).observe(el);
    }
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  /* ------------------------------------------------------------------ *
   * Aurora — WebGL2 background  <canvas data-gl="aurora" data-stops="…">
   * ------------------------------------------------------------------ */
  var AURORA_VS = '#version 300 es\nin vec2 aPosition;\nvoid main() {\n  gl_Position = vec4(aPosition, 0.0, 1.0);\n}';
  var AURORA_FS = [
    '#version 300 es',
    'precision highp float;', 'precision highp int;',
    'uniform vec2 uResolution;', 'uniform float uTime;', 'uniform vec3 uStops[5];', 'uniform int uStopCount;',
    'uniform float uAmplitude;', 'uniform float uBlend;', 'uniform float uHeight;', 'uniform float uScale;',
    'uniform float uGlow;', 'uniform float uBrightness;', 'uniform int uLayers;', 'uniform float uFlip;',
    'uniform vec3 uPointer;', 'uniform float uReveal;', 'uniform float uOpacity;', 'uniform float uLightMode;',
    'out vec4 outColor;',
    'vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }',
    'float snoise(vec2 v) {',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
    '  vec2 i = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod(i, 289.0);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);',
    '  m = m * m;', '  m = m * m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);',
    '  vec3 g;',
    '  g.x = a0.x * x0.x + h.x * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    'float smootherstep(float edge0, float edge1, float x) {',
    '  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);',
    '  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);',
    '}',
    'vec3 oklabToLinear(vec3 c) {',
    '  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;',
    '  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;',
    '  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;',
    '  l = l * l * l; m = m * m * m; s = s * s * s;',
    '  return vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,',
    '              -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,',
    '              -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);',
    '}',
    'vec3 toSrgb(vec3 c) {',
    '  c = clamp(c, 0.0, 1.0);',
    '  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));',
    '}',
    'vec3 ramp(float t) {',
    '  float x = clamp(t, 0.0, 1.0) * float(uStopCount - 1);',
    '  int i = int(min(floor(x), float(uStopCount - 2)));',
    '  float f = x - float(i);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  vec3 lch = mix(uStops[i], uStops[i + 1], f);',
    '  lch.x = mix(lch.x, min(lch.x, 0.7), uLightMode);',
    '  return toSrgb(oklabToLinear(vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z))));',
    '}',
    'float hash(vec2 p) {',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',
    'void main() {',
    '  vec2 frag = gl_FragCoord.xy;',
    '  float y = 1.0 - frag.y / uResolution.y;',
    '  y = mix(y, 1.0 - y, uFlip);',
    '  float u = frag.x / uResolution.x;',
    '  float X = (frag.x - uResolution.x * 0.5) / uResolution.y;',
    '  float t = uTime;',
    '  float reach = uPointer.z * exp(-pow((X - uPointer.x) / 0.38, 2.0));',
    '  vec3 glow = vec3(0.0);',
    '  float cover = 0.0;',
    '  for (int k = 0; k < 3; k++) {',
    '    if (k >= uLayers) break;',
    '    float layer = float(k);',
    '    float seed = layer * 13.7;',
    '    float pace = t * (1.0 - layer * 0.18);',
    '    float warp = snoise(vec2(X * 0.45 * uScale + pace * 0.02 + seed, pace * 0.05 + seed));',
    '    float wave = snoise(vec2(X * 0.75 * uScale + warp * 0.35 - pace * 0.03 + seed, pace * 0.07 - seed)) * 0.72',
    '      + snoise(vec2(X * 1.6 * uScale + warp * 0.5 + pace * 0.04 - seed, pace * 0.1 + seed * 0.5)) * 0.28;',
    '    float hem = uHeight + layer * 0.07 + wave * 0.15 * uAmplitude;',
    '    hem += reach * 0.08 * (layer < 0.5 ? 1.0 : 0.4);',
    '    hem = mix(-0.25, hem, uReveal);',
    '    float soft = (0.04 + uBlend * 0.16) * (1.0 + layer * 0.9);',
    '    float rise = hem - y;',
    '    float low = -soft - uGlow * 0.14;',
    '    float high = 0.26 + soft * 0.6;',
    '    float body = pow(smootherstep(low, high, rise), 1.5 + uGlow * 0.6);',
    '    float lobes = 0.86 + 0.14 * snoise(vec2(X * 0.9 * uScale - pace * 0.025 + seed, y * 0.3 + pace * 0.04));',
    '    float alpha = body * lobes * (layer < 0.5 ? 1.0 : 0.32 / layer);',
    '    alpha = clamp(alpha * (1.0 + reach * 0.25 * smootherstep(0.9, 0.0, abs(y - hem))), 0.0, 1.0);',
    '    vec3 tint = ramp(u + 0.05 * sin(pace * 0.08 + layer * 2.3) + layer * 0.1 + max(rise, 0.0) * 0.05);',
    '    glow = 1.0 - (1.0 - glow) * (1.0 - tint * alpha);',
    '    cover = 1.0 - (1.0 - cover) * (1.0 - alpha);',
    '  }',
    '  float fade = smootherstep(0.0, 0.7, uReveal) * uOpacity;',
    '  float strength = clamp(uBrightness, 0.0, 2.0);',
    '  glow *= fade * min(strength, 1.0);',
    '  cover *= fade * min(strength, 1.0);',
    '  glow = 1.0 - pow(1.0 - glow, vec3(max(strength, 1.0)));',
    '  float dither = (hash(frag) - 0.5) / 255.0;',
    '  if (uLightMode > 0.5) {',
    '    vec3 tint = cover > 0.0001 ? glow / cover : vec3(0.0);',
    '    cover *= smootherstep(0.0, 0.25, cover);',
    '    float alpha = cover * 0.7;',
    '    outColor = vec4(tint * alpha + dither, clamp(alpha + dither, 0.0, 1.0));',
    '    return;',
    '  }',
    '  outColor = vec4(glow + dither, clamp(cover + dither, 0.0, 1.0));',
    '}'
  ].join('\n');

  function cssRgb(value) {
    var c = document.createElement('canvas'); c.width = c.height = 1;
    var x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillStyle = value; x.fillRect(0, 0, 1, 1);
    var d = x.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  }
  function toOklch(rgb) {
    var lin = rgb.map(function (c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    var r = lin[0], g = lin[1], b = lin[2];
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var lab = [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
               1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
               0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
    return [lab[0], Math.hypot(lab[1], lab[2]), Math.atan2(lab[2], lab[1])];
  }
  function unwrapHues(stops) {
    var known = stops.findIndex(function (s) { return s[1] > 0.02; });
    var prev = known === -1 ? 0 : stops[known][2];
    return stops.map(function (s) {
      var hue = s[1] > 0.02 ? s[2] : prev;
      while (hue - prev > Math.PI) hue -= Math.PI * 2;
      while (hue - prev < -Math.PI) hue += Math.PI * 2;
      prev = hue;
      return [s[0], s[1], hue];
    });
  }

  function aurora(canvas) {
    var gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) return;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, AURORA_VS), fs = sh(gl.FRAGMENT_SHADER, AURORA_FS);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPosition');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['uResolution', 'uTime', 'uStops', 'uStopCount', 'uAmplitude', 'uBlend', 'uHeight', 'uScale', 'uGlow', 'uBrightness',
     'uLayers', 'uFlip', 'uPointer', 'uReveal', 'uOpacity', 'uLightMode'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    var ds = canvas.dataset;
    var stops = (ds.stops || '#003580,#2fe3b4,#6c8cff').split(',').slice(0, 5);
    if (stops.length === 1) stops.push(stops[0]);
    var lch = unwrapHues(stops.map(function (c) { return toOklch(cssRgb(c.trim())); }));
    var flat = new Float32Array(15);
    lch.forEach(function (s, i) { flat[i * 3] = s[0]; flat[i * 3 + 1] = s[1]; flat[i * 3 + 2] = s[2]; });
    gl.uniform3fv(U.uStops, flat); gl.uniform1i(U.uStopCount, lch.length);
    gl.uniform1f(U.uAmplitude, Number(ds.amplitude || 1.1));
    gl.uniform1f(U.uBlend, Number(ds.blend || 0.6));
    gl.uniform1f(U.uHeight, Number(ds.height || 0.45));
    gl.uniform1f(U.uScale, 1); gl.uniform1f(U.uGlow, 0.6); gl.uniform1f(U.uBrightness, Number(ds.brightness || 1));
    gl.uniform1i(U.uLayers, 2); gl.uniform1f(U.uFlip, 0); gl.uniform1f(U.uOpacity, 1); gl.uniform1f(U.uLightMode, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var host = canvas.parentNode, clock = 0, reveal = reduce ? 1 : 0;
    var px = 0, py = 0, reach = 0, tx = 0, ty = 0, inside = false, snapped = false;
    function resize() {
      // The aurora is all soft gradients, so half resolution (stretched by
      // CSS) looks the same and costs a quarter of the GPU work.
      var r = canvas.getBoundingClientRect(), k = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5;
      canvas.width = Math.max(1, Math.round(r.width * k)); canvas.height = Math.max(1, Math.round(r.height * k));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.uResolution, canvas.width, canvas.height);
    }
    function draw() {
      gl.uniform1f(U.uTime, clock); gl.uniform1f(U.uReveal, 1 - Math.pow(1 - reveal, 3));
      gl.uniform3f(U.uPointer, px, py, reach);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); if (reduce) draw(); }).observe(host);
    resize();
    canvas.classList.add('is-on');
    host.classList.add('has-gl');
    if (reduce) { draw(); return; }
    if (fine) {
      window.addEventListener('pointermove', function (e) {
        var r = host.getBoundingClientRect();
        inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        tx = (e.clientX - r.left - r.width / 2) / r.height; ty = (e.clientY - r.top) / r.height;
        if (inside && !snapped) { px = tx; py = ty; snapped = true; }
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', function () { inside = false; });
    }
    var acc = 0;
    visibleLoop(host, function (dt) {
      // A slow drift: 30 frames a second is indistinguishable from 60.
      acc += dt;
      if (acc < 1 / 31) return;
      dt = acc; acc = 0;
      clock += dt * Number(ds.speed || 0.8);
      reveal = Math.min(1, reveal + dt / 2.4);
      var k = 1 - Math.exp(-dt / 0.6);
      px += (tx - px) * k; py += (ty - py) * k;
      reach += ((inside ? 1 : 0) - reach) * (1 - Math.exp(-dt / (inside ? 0.9 : 1.4)));
      draw();
    });
  }

  /* ------------------------------------------------------------------ *
   * Noise — animated film grain  <div data-noise>
   * ------------------------------------------------------------------ */
  var grainUrl = '';
  function grainTile() {
    if (grainUrl) return grainUrl;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'), img = x.createImageData(128, 128), d = img.data, state = 1013904223;
    function rand() {
      state = (state + 0x6d2b79f5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    var range = 0.5 + 0.6 * 1.1;
    for (var i = 0; i < d.length; i += 4) {
      var v = clamp(0.5 + (rand() + rand() - 1) * range, 0, 1) * 255;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    grainUrl = c.toDataURL('image/png');   // data: URL — allowed by img-src
    return grainUrl;
  }
  function noise(el) {
    el.style.backgroundImage = 'url(' + grainTile() + ')';
    if (reduce) return;
    var acc = 0;
    visibleLoop(el.parentNode, function (dt) {
      acc += dt;
      if (acc < 1 / 18) return;
      acc = 0;
      el.style.backgroundPosition = Math.round(Math.random() * 128) + 'px ' + Math.round(Math.random() * 128) + 'px';
    });
  }

  /* ------------------------------------------------------------------ *
   * ScrollReveal — words brighten and un-blur as you scroll  [data-scroll-reveal]
   * ------------------------------------------------------------------ */
  function scrollReveal(el) {
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    var inner = document.createElement('span');
    inner.className = 'sr-text'; inner.setAttribute('aria-hidden', 'true');
    var pieces = [];
    // Keep inline markup (e.g. a highlighted span) by splitting text nodes in place.
    (function walk(node, into) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { into.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'sr-word'; w.textContent = part;
            into.appendChild(w); pieces.push(w);
          });
        } else if (n.nodeType === 1) {
          var clone = n.cloneNode(false); into.appendChild(clone); walk(n, clone);
        }
      });
    })(el, inner);
    el.textContent = ''; el.appendChild(inner);
    if (reduce) return;
    var STAGGER = 0.05, SPAN = 0.5, total = SPAN + (pieces.length - 1) * STAGGER, base = 0.1;
    var ticking = false;
    function update() {
      ticking = false;
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      var start = vh - 0.2 * Math.min(r.height, vh), end = vh - r.height * 0.15 - vh * 0.35;
      var p = clamp((start - r.top) / Math.max(1, start - end), 0, 1);
      pieces.forEach(function (w, i) {
        var t = clamp((p * total - i * STAGGER) / SPAN, 0, 1);
        w.style.opacity = t >= 1 ? '' : (base + (1 - base) * t).toFixed(3);
        w.style.filter = t >= 1 ? '' : 'blur(' + (4 * (1 - t)).toFixed(2) + 'px)';
      });
      var rot = clamp((vh - r.top) / (vh * 0.8), 0, 1);
      inner.style.transform = 'rotate(' + (3 * (1 - rot)).toFixed(2) + 'deg)';
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------------ *
   * ScrollStack — sticky cards that scale and dim as later ones cover them
   * <div data-scroll-stack> > .stack-card …
   * ------------------------------------------------------------------ */
  function scrollStack(root) {
    var cards = $$('.stack-card', root);
    if (cards.length < 2 || reduce) return;
    var ITEM_SCALE = 0.05, BASE = 0.85, DIM = 0.22, OFFSET = 22;
    var ticking = false;
    function update() {
      ticking = false;
      var depth = cards.map(function () { return 0; });
      var rects = cards.map(function (c) { return c.getBoundingClientRect(); });
      var stackTop = parseFloat(getComputedStyle(cards[0]).top) || 100;
      for (var j = 1; j < cards.length; j++) {
        var pinBefore = stackTop + (j - 1) * OFFSET;
        var start = pinBefore + rects[j - 1].height;
        var span = Math.max(1, start - pinBefore - OFFSET);
        var cover = clamp((start - rects[j].top) / span, 0, 1);
        for (var i = 0; i < j; i++) depth[i] += cover;
      }
      cards.forEach(function (c, i) {
        var d = depth[i];
        c.style.transform = d < 0.0005 ? '' : 'scale(' + Math.max(BASE, 1 - d * ITEM_SCALE).toFixed(4) + ')';
        c.style.setProperty('--stack-dim', (1 - Math.pow(1 - DIM, d)).toFixed(3));
      });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------------ *
   * ShinyText — a soft highlight sweeps across the text  [data-shiny]
   * ------------------------------------------------------------------ */
  function shiny(el) {
    el.classList.add('shiny-text');
    var base = el.getAttribute('data-shiny') || 'rgba(255,255,255,.62)', shine = '#ffffff';
    // The text fill is transparent, so it always needs a painted background.
    el.style.backgroundImage = 'linear-gradient(' + base + ',' + base + ')';
    if (reduce) return;
    var speed = 2.4, delay = 1.6, t = -delay;
    visibleLoop(el, function (dt) {
      t += dt;
      if (t < 0) { el.style.backgroundImage = 'linear-gradient(' + base + ',' + base + ')'; return; }
      var k = Math.min(1, t / speed), e = 0.5 - Math.cos(Math.PI * k) / 2;
      var pos = 122 - e * 144;   // 100+22 → -22 (shineWidth 40)
      el.style.backgroundImage = 'linear-gradient(120deg,' + base + ' 0%,' + base + ' ' + (pos - 20) + '%,' + shine + ' ' + pos + '%,' + base + ' ' + (pos + 20) + '%,' + base + ' 100%)';
      if (k >= 1) t = -delay;
    });
  }

  /* ------------------------------------------------------------------ *
   * DecryptedText — letters scramble then settle  [data-decrypt="view|hover"]
   * ------------------------------------------------------------------ */
  var POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅabcdefghijklmnopqrstuvwxyzäöå!@#$%&*';
  function decrypt(el) {
    var text = el.textContent, mode = el.getAttribute('data-decrypt') || 'view';
    el.setAttribute('aria-label', text);
    var vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    el.textContent = ''; el.appendChild(vis); vis.textContent = text;
    if (reduce) return;
    var timer = 0;
    function run() {
      clearInterval(timer);
      var it = 0, MAX = 12;
      timer = setInterval(function () {
        it++;
        var revealN = Math.floor(text.length * it / MAX);
        vis.textContent = text.split('').map(function (ch, i) {
          if (ch === ' ' || i < revealN) return ch;
          return POOL[(Math.random() * POOL.length) | 0];
        }).join('');
        if (it >= MAX) { clearInterval(timer); vis.textContent = text; }
      }, 45);
    }
    if (mode === 'hover') { el.addEventListener('mouseenter', run); el.addEventListener('focus', run); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.5 });
      io.observe(el);
    }
  }

  /* ------------------------------------------------------------------ *
   * StarBorder — a comet of light laps the button border  [data-star-border]
   * ------------------------------------------------------------------ */
  function starBorder(el) {
    if (reduce) return;
    var c = document.createElement('canvas');
    c.className = 'star-border__light'; c.setAttribute('aria-hidden', 'true');
    el.insertBefore(c, el.firstChild);
    el.classList.add('star-border');
    var ctx = c.getContext('2d'), w = 0, h = 0, P = 0, R = 0, dpr = 1, PAD = 48;
    var DURATION = 4.5, phase = 0, extra = 0, lapT = 1, TH = 1.5;
    var color = el.getAttribute('data-star-border') || '#2fe3b4';
    function size() {
      var r = el.getBoundingClientRect();
      w = r.width; h = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
      R = Math.min(h / 2, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 12) - TH / 2;
      c.width = (w + PAD * 2) * dpr; c.height = (h + PAD * 2) * dpr;
      var W = w - TH, H = h - TH;
      P = 2 * (W - 2 * R) + 2 * (H - 2 * R) + 2 * Math.PI * R;
    }
    // Point at arc length s on a rounded rect (origin at its top-left).
    function pointAt(s) {
      var W = w - TH, H = h - TH, a = Math.PI * R / 2, segs = [W - 2 * R, a, H - 2 * R, a, W - 2 * R, a, H - 2 * R, a];
      s = ((s % P) + P) % P;
      for (var i = 0; i < 8; i++) {
        if (s <= segs[i] || i === 7) {
          var f = segs[i] ? s / segs[i] : 0;
          switch (i) {
            case 0: return [R + f * (W - 2 * R), 0];
            case 1: return [W - R + R * Math.sin(f * Math.PI / 2), R - R * Math.cos(f * Math.PI / 2)];
            case 2: return [W, R + f * (H - 2 * R)];
            case 3: return [W - R + R * Math.cos(f * Math.PI / 2), H - R + R * Math.sin(f * Math.PI / 2)];
            case 4: return [W - R - f * (W - 2 * R), H];
            case 5: return [R - R * Math.sin(f * Math.PI / 2), H - R + R * Math.cos(f * Math.PI / 2)];
            case 6: return [0, H - R - f * (H - 2 * R)];
            default: return [R - R * Math.cos(f * Math.PI / 2), R - R * Math.sin(f * Math.PI / 2)];
          }
        }
        s -= segs[i];
      }
      return [0, 0];
    }
    function rgba(a) {
      var m = color.match(/^#(..)(..)(..)$/);
      return m ? 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')' : color;
    }
    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(el);
    if (fine) el.addEventListener('mouseenter', function () { if (lapT >= 1) lapT = 0; });
    visibleLoop(el, function (dt) {
      var lap = 0;
      if (lapT < 1) {
        var before = lapT; lapT = Math.min(1, lapT + dt / 0.9);
        var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2; };
        lap = (ease(lapT) - ease(before)) * P;
      }
      phase += P / DURATION * dt + lap;
      ctx.setTransform(dpr, 0, 0, dpr, (PAD + TH / 2) * dpr, (PAD + TH / 2) * dpr);
      ctx.clearRect(-PAD, -PAD, w + PAD * 2, h + PAD * 2);
      ctx.globalCompositeOperation = 'lighter';
      var len = P * 0.3, steps = clamp(Math.ceil(len / 2), 2, 90);
      for (var i = 0; i < steps; i++) {
        var a = pointAt(phase - len * i / steps), b = pointAt(phase - len * (i + 1) / steps);
        var u = 1 - (i + 0.5) / steps, fade = u * u;
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(fade * 0.12); ctx.lineWidth = 2 + 6 * 0.6;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        ctx.strokeStyle = rgba(fade); ctx.lineWidth = TH;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      var head = pointAt(phase), rad = 12 + 40 * 0.6;
      var g = ctx.createRadialGradient(head[0], head[1], 0, head[0], head[1], rad);
      g.addColorStop(0, rgba(0.24)); g.addColorStop(0.2, rgba(0.1)); g.addColorStop(0.5, rgba(0.024)); g.addColorStop(1, rgba(0));
      ctx.fillStyle = g; ctx.fillRect(head[0] - rad, head[1] - rad, rad * 2, rad * 2);
    });
  }

  /* ------------------------------------------------------------------ *
   * ImageTrail — photos pop along the cursor path  [data-image-trail="a.jpg|b.jpg"]
   * ------------------------------------------------------------------ */
  function imageTrail(host) {
    if (reduce || !fine) return;
    var srcs = host.getAttribute('data-image-trail').split('|').filter(Boolean);
    if (!srcs.length) return;
    var layer = document.createElement('div');
    layer.className = 'trail'; layer.setAttribute('aria-hidden', 'true');
    host.appendChild(layer);
    var imgs = srcs.map(function (s) {
      var d = document.createElement('div'); d.className = 'trail__img';
      d.innerHTML = '<div class="trail__inner" style="background-image:url(' + s + ')"></div>';
      layer.appendChild(d);
      return { el: d, anim: null };
    });
    var mouse = { x: 0, y: 0 }, last = { x: 0, y: 0 }, cache = { x: 0, y: 0 }, idx = -1, z = 1, primed = false;
    host.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      if (!primed) { primed = true; last.x = cache.x = mouse.x; last.y = cache.y = mouse.y; }
    });
    visibleLoop(host, function () {
      cache.x += (mouse.x - cache.x) * 0.1; cache.y += (mouse.y - cache.y) * 0.1;
      if (!primed || Math.hypot(mouse.x - last.x, mouse.y - last.y) <= 90) return;
      last.x = mouse.x; last.y = mouse.y;
      idx = (idx + 1) % imgs.length;
      var it = imgs[idx], el = it.el, w = el.offsetWidth, h = el.offsetHeight;
      if (it.anim) it.anim.cancel();
      el.style.zIndex = ++z;
      var from = 'translate(' + (cache.x - w / 2) + 'px,' + (cache.y - h / 2) + 'px) scale(1)';
      var to = 'translate(' + (mouse.x - w / 2) + 'px,' + (mouse.y - h / 2) + 'px) scale(1)';
      var out = 'translate(' + (mouse.x - w / 2) + 'px,' + (mouse.y - h / 2) + 'px) scale(.2)';
      it.anim = el.animate([
        { opacity: 1, transform: from, offset: 0, easing: 'cubic-bezier(.33,1,.68,1)' },
        { opacity: 1, transform: to, offset: 0.5, easing: 'cubic-bezier(.25,1,.5,1)' },
        { opacity: 0, transform: out, offset: 1 }
      ], { duration: 800, fill: 'forwards' });
    });
  }

  function boot() {
    $$('canvas[data-gl="aurora"]').forEach(aurora);
    $$('[data-noise]').forEach(noise);
    $$('[data-scroll-reveal]').forEach(scrollReveal);
    $$('[data-scroll-stack]').forEach(scrollStack);
    $$('[data-shiny]').forEach(shiny);
    $$('[data-decrypt]').forEach(decrypt);
    $$('[data-star-border]').forEach(starBorder);
    $$('[data-image-trail]').forEach(imageTrail);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

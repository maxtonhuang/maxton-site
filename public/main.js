/* =========================================================
   maxton-site — vanilla JS (no dependencies, no build step)
   - Footer year, mobile nav
   - rAF-throttled scroll: progress bar, header, hero parallax,
     bg-blob parallax, per-letter title DECOMPOSITION on scroll
   - Unified confetti background (colorful floating shapes, parallax, mouse)
   - Cursor spotlight + magnetic buttons
   - Reveal-on-scroll (directional, staggered) + scramble (hero name)
   - Hero 3D confetti globe that DECONSTRUCTS on scroll
   - 3D tilt + glare on cards
   - Live GitHub repositories fetch (#repos)
   ========================================================= */
(function () {
  "use strict";

  var GITHUB_USER = "maxtonhuang";
  var REPOS_URL =
    "https://api.github.com/users/" + GITHUB_USER + "/repos?sort=updated&per_page=12";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var PALETTE = ["#7c5cff", "#ff5d8f", "#ff8a3d", "#ffc83d", "#14b8a6", "#3b82f6"];

  var heroEl = document.getElementById("hero");
  var heroInner = document.querySelector(".hero__inner");
  var heroScrollProgress = 0;
  var scrollY = window.scrollY || 0;
  var nmx = 0, nmy = 0;
  var gravX = 0, gravY = 0, tiltOn = false; // gyroscope "gravity" shared with the confetti

  /* ---- Footer year ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    });
  }

  /* ---- Pointer tracking (shared) ---- */
  if (finePointer) {
    window.addEventListener("pointermove", function (e) {
      nmx = e.clientX / window.innerWidth - 0.5;
      nmy = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  /* ===================================================
     PER-LETTER DECOMPOSITION (titles scatter on scroll)
     =================================================== */
  var decomposeItems = [];
  function initDecompose() {
    document.querySelectorAll("[data-decompose]").forEach(function (el) {
      if (el.getAttribute("data-decomposed")) return;
      el.setAttribute("data-decomposed", "1");
      var text = el.textContent, letters = [];
      el.textContent = "";
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        if (ch === " ") { var sp = document.createElement("span"); sp.className = "decompose-space"; el.appendChild(sp); continue; }
        var span = document.createElement("span");
        span.className = "decompose-letter";
        span.textContent = ch;
        span.style.color = PALETTE[i % PALETTE.length];
        el.appendChild(span);
        letters.push({ s: span, dx: (Math.random() - 0.5) * 2, dy: (Math.random() - 0.5) * 2, rot: (Math.random() - 0.5) * 2 });
      }
      decomposeItems.push({ el: el, letters: letters });
    });
  }
  // Composed across a comfortable band around the centre, then scatters as the
  // heading travels toward the top or bottom of the viewport (visibly, before
  // it slips under the header / off-screen). Nav lands headings inside the band.
  function updateDecompose() {
    var vh = window.innerHeight, LOW = 0.22, HIGH = 0.58;
    for (var i = 0; i < decomposeItems.length; i++) {
      var it = decomposeItems[i], rect = it.el.getBoundingClientRect();
      var p = (rect.top + rect.height / 2) / vh;             // 0 = top of viewport, 1 = bottom
      var raw = p < LOW ? (LOW - p) / LOW : (p > HIGH ? (p - HIGH) / (1 - HIGH) : 0);
      raw = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      var amt = raw * raw * (3 - 2 * raw);                   // smoothstep ease
      var dir = p < LOW ? -1 : (p > HIGH ? 1 : 0);
      for (var j = 0; j < it.letters.length; j++) {
        var L = it.letters[j];
        var tx = L.dx * amt * 130, ty = L.dy * amt * 85 + dir * amt * 45, rot = L.rot * amt * 95, sc = 1 - amt * 0.45;
        L.s.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) rotate(" + rot.toFixed(1) + "deg) scale(" + sc.toFixed(2) + ")";
        L.s.style.opacity = (1 - amt * 0.78).toFixed(2);
      }
    }
  }

  /* ---- Scroll handling (rAF-throttled) ---- */
  var header = document.querySelector(".site-header");
  var progress = document.getElementById("scrollProgress");
  var parallaxEls = document.querySelectorAll("[data-parallax]");
  var ticking = false;

  function updateScroll() {
    scrollY = window.scrollY || window.pageYOffset || 0;
    if (progress) {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (docH > 0 ? (scrollY / docH) * 100 : 0) + "%";
    }
    var heroH = heroEl ? heroEl.offsetHeight : 0;
    if (header) header.classList.toggle("is-scrolled", scrollY > 8);
    heroScrollProgress = heroH > 0 ? Math.min(1, Math.max(0, scrollY / (heroH * 0.9))) : 0;

    if (!reduceMotion) {
      if (heroInner) {
        if (heroScrollProgress > 0.005) {
          heroInner.style.transform = "translateY(" + (heroScrollProgress * 72).toFixed(1) + "px)";
          heroInner.style.opacity = (1 - heroScrollProgress * 0.95).toFixed(3);
        } else { heroInner.style.transform = ""; heroInner.style.opacity = ""; }
      }
      parallaxEls.forEach(function (el) {
        var s = parseFloat(el.getAttribute("data-parallax")) || 0;
        el.style.transform = "translate3d(0," + (scrollY * s).toFixed(1) + "px,0)";
      });
      updateDecompose();
    }
  }
  function requestScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(function () { updateScroll(); ticking = false; }); } }

  /* ---- Cursor spotlight ---- */
  var glow = document.getElementById("cursorGlow");
  if (glow && finePointer && !reduceMotion) {
    window.addEventListener("pointermove", function (e) {
      glow.style.transform = "translate3d(" + (e.clientX - 230) + "px," + (e.clientY - 230) + "px,0)";
      glow.classList.add("is-active");
    }, { passive: true });
    document.addEventListener("pointerleave", function () { glow.classList.remove("is-active"); });
  }

  /* ---- Magnetic buttons ---- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".magnetic").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2), my = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + mx * 0.25 + "px," + (my * 0.25 - 2) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ===================================================
     SCRAMBLE (hero name intro)
     =================================================== */
  var SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_/[]{}=+*?#01";
  function rnd(n) { return Math.floor(Math.random() * n); }
  function scramble(el) {
    var text = el.getAttribute("data-text");
    if (text == null) { text = el.textContent; el.setAttribute("data-text", text); }
    var queue = [];
    for (var i = 0; i < text.length; i++) queue.push({ to: text.charAt(i), start: rnd(18), end: rnd(18) + 12, ch: null });
    var frame = 0;
    (function update() {
      var out = "", done = 0;
      for (var k = 0; k < queue.length; k++) {
        var q = queue[k];
        if (frame >= q.end) { done++; out += q.to; }
        else if (frame >= q.start) {
          if (!q.ch || Math.random() < 0.28) q.ch = SCRAMBLE_CHARS.charAt(rnd(SCRAMBLE_CHARS.length));
          out += '<span class="scramble-char">' + q.ch + "</span>";
        }
      }
      el.innerHTML = out;
      if (done < queue.length) { frame++; window.requestAnimationFrame(update); }
      else { el.textContent = text; }
    })();
  }

  /* ===================================================
     REVEAL ON SCROLL — directional + staggered
     =================================================== */
  function setStagger(el) {
    if (!el.hasAttribute("data-reveal") || !el.parentNode) return;
    var kids = el.parentNode.children, sibs = [];
    for (var i = 0; i < kids.length; i++) if (kids[i].hasAttribute && kids[i].hasAttribute("data-reveal")) sibs.push(kids[i]);
    var idx = sibs.indexOf(el);
    el.style.setProperty("--rd", Math.min(idx < 0 ? 0 : idx, 8) * 75 + "ms");
  }
  function markRevealed(el) {
    el.classList.add("in-view", "is-revealed");
    if (el.hasAttribute("data-scramble") && !el.getAttribute("data-scrambled")) {
      el.setAttribute("data-scrambled", "1"); scramble(el);
    }
  }
  function allReveal() { return document.querySelectorAll(".reveal, [data-reveal], [data-scramble]"); }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    allReveal().forEach(function (el) { el.classList.add("in-view", "is-revealed"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { markRevealed(entry.target); io.unobserve(entry.target); } });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    var registerReveal = function (el) { setStagger(el); io.observe(el); };
    allReveal().forEach(registerReveal);
    window.__registerReveal = registerReveal;
  }

  /* ===================================================
     3D TILT + GLARE
     =================================================== */
  function initTilt(scope) {
    if (!finePointer) return;
    (scope || document).querySelectorAll("[data-tilt]:not([data-tilt-ready])").forEach(function (el) {
      el.setAttribute("data-tilt-ready", "1");
      var glare = document.createElement("span"); glare.className = "card-glare"; el.appendChild(glare);
      var MAX = 8;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.classList.add("is-tilting");
        el.style.transform = "perspective(900px) rotateX(" + ((0.5 - py) * MAX * 2).toFixed(2) + "deg) rotateY(" + ((px - 0.5) * MAX * 2).toFixed(2) + "deg) translateY(-4px)";
        glare.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
        glare.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", function () { el.classList.remove("is-tilting"); el.style.transform = ""; });
    });
  }
  if (!reduceMotion) initTilt(document);

  /* ===================================================
     UNIFIED CONFETTI BACKGROUND
     =================================================== */
  (function confettiField() {
    var canvas = document.getElementById("confetti");
    if (!canvas) return;
    var ctx; try { ctx = canvas.getContext("2d"); } catch (e) { return; }
    if (!ctx) return;
    var w = 0, h = 0, dpr = 1, parts = [], lastT = 0;

    function build() {
      var count = Math.min(reduceMotion ? 42 : 100, Math.round((w * h) / 15000));
      parts = [];
      for (var i = 0; i < count; i++) {
        var depth = Math.random();
        parts.push({
          x: Math.random() * w, y: Math.random() * h,
          size: 6 + Math.random() * 14 * (0.5 + depth),
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          type: Math.floor(Math.random() * 5),
          spd: 5 + Math.random() * 15,
          sway: 12 + Math.random() * 30, swPhase: Math.random() * 6.28, swSpeed: 0.3 + Math.random() * 0.7,
          rot: Math.random() * 6.28, rotSpeed: (Math.random() - 0.5) * 0.6,
          par: 0.08 + depth * 0.5, alpha: 0.45 + Math.random() * 0.4,
          vx: 0, vy: 0
        });
      }
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); build();
    }
    function wrap(v, m) { v %= m; return v < 0 ? v + m : v; }
    function shape(p, x, y, t) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot + (reduceMotion ? 0 : t * 0.001 * p.rotSpeed));
      ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
      var s = p.size;
      switch (p.type) {
        case 0: ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, 6.2832); ctx.fill(); break;
        case 1: ctx.fillRect(-s / 2, -s / 2, s, s); break;
        case 2: ctx.beginPath(); ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2); ctx.closePath(); ctx.fill(); break;
        case 3: ctx.lineWidth = Math.max(1.5, s * 0.18); ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, 6.2832); ctx.stroke(); break;
        default: var b = s * 0.24; ctx.fillRect(-s / 2, -b / 2, s, b); ctx.fillRect(-b / 2, -s / 2, b, s);
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    var ACC = 2000, TERM = 950, MARGIN = 60;
    function place(base, off, size) { var W = size + MARGIN * 2; return wrap(base + off + MARGIN, W) - MARGIN; }
    function render(t) {
      var dt = lastT ? Math.min(60, t - lastT) / 1000 : 0.016; lastT = t;
      var drag = Math.exp(-2.4 * dt); // frame-rate independent air drag → terminal velocity
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (tiltOn) {                              // gyroscope gravity — accelerate downhill (real falling)
          var k = 0.5 + p.par;                     // nearer particles fall faster (depth)
          p.vx = p.vx * drag + gravX * ACC * k * dt;
          p.vy = p.vy * drag + gravY * ACC * k * dt;
          var sp = Math.hypot(p.vx, p.vy), term = TERM * k;
          if (sp > term) { p.vx *= term / sp; p.vy *= term / sp; }
        } else {                                   // idle: ease back to a gentle upward float
          var e = Math.min(1, dt * 3);
          p.vx += (0 - p.vx) * e;
          p.vy += (-(p.spd * 1.3) - p.vy) * e;
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.x = wrap(p.x, w); p.y = wrap(p.y, h);
        var ox = tiltOn ? 0 : (nmx * p.par * 60 + (reduceMotion ? 0 : Math.cos(t * 0.001 * p.swSpeed + p.swPhase) * p.sway * 0.5));
        var oy = -scrollY * p.par + (tiltOn ? 0 : nmy * p.par * 50);
        shape(p, place(p.x, ox, w), place(p.y, oy, h), t);
      }
    }
    var running = false, rafId = 0;
    function frame(t) { if (!running) return; render(t); rafId = window.requestAnimationFrame(frame); }
    function start() { if (running) return; running = true; rafId = window.requestAnimationFrame(frame); }
    function stop() { running = false; if (rafId) window.cancelAnimationFrame(rafId); }
    var rRaf = 0;
    window.addEventListener("resize", function () {
      if (rRaf) window.cancelAnimationFrame(rRaf);
      rRaf = window.requestAnimationFrame(function () { resize(); if (!running) render(0); });
    });
    resize();
    if (reduceMotion) { render(0); return; }
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    start();
  })();

  /* ===================================================
     HERO — 3D confetti globe that DECONSTRUCTS on scroll
     =================================================== */
  (function heroGlobe() {
    var canvas = document.getElementById("heroCanvas");
    if (!canvas) return;
    var ctx; try { ctx = canvas.getContext("2d"); } catch (e) { return; }
    if (!ctx) return;
    var smallScreen = window.matchMedia("(max-width: 720px)").matches;
    var COUNT = smallScreen ? 280 : 640;
    var w = 0, h = 0, dpr = 1, cx = 0, cy = 0, R = 0, pts = [];
    var GOLDEN = Math.PI * (1 + Math.sqrt(5));
    for (var i = 0; i < COUNT; i++) {
      var phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT), theta = GOLDEN * i;
      pts.push({
        x: Math.sin(phi) * Math.cos(theta), y: Math.sin(phi) * Math.sin(theta), z: Math.cos(phi),
        m: i / COUNT, speed: 0.6 + Math.random() * 1.1,
        jx: Math.random() - 0.5, jy: Math.random() - 0.5, jz: Math.random() - 0.5
      });
    }
    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w > 900 ? w * 0.7 : w * 0.5; cy = h * (w > 900 ? 0.5 : 0.42);
      R = Math.min(w, h) * (smallScreen ? 0.46 : 0.34);
    }
    function colorFor(depth, m, alpha) {
      var hue = (m * 320 + 18) % 360, light = 48 + depth * 16;
      return "hsla(" + hue.toFixed(0) + ",88%," + light.toFixed(0) + "%," + alpha.toFixed(3) + ")";
    }
    var autoY = 0, curMX = 0, curMY = 0, persp = 2.4, order = pts.map(function (_, i) { return i; });
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var prog = heroScrollProgress, e = prog * prog, burst = e * 3.2, fade = 1 - prog * 0.82;
      var aY = autoY + curMX * 0.9 + prog * 1.3, aX = curMY * 0.6;
      var cosY = Math.cos(aY), sinY = Math.sin(aY), cosX = Math.cos(aX), sinX = Math.sin(aX);
      for (var k = 0; k < pts.length; k++) {
        var p = pts[k], exp = 1 + burst * p.speed;
        var bx = p.x * exp + p.jx * e * 2.2, by = p.y * exp + p.jy * e * 2.2, bz = p.z * exp + p.jz * e * 2.2;
        var x1 = bx * cosY - bz * sinY, z1 = bx * sinY + bz * cosY;
        p._z = by * sinX + z1 * cosX; p._x = x1; p._y = by * cosX - z1 * sinX;
      }
      order.sort(function (a, b) { return pts[a]._z - pts[b]._z; });
      for (var n = 0; n < order.length; n++) {
        var q = pts[order[n]];
        var scale = persp / (persp - Math.min(q._z, persp - 0.05));
        var depth = Math.max(0, Math.min(1, (q._z + 1) / 2));
        var size = (smallScreen ? 1.2 : 1.6) * scale * (0.5 + depth * 1.1);
        var alpha = (0.25 + depth * 0.6) * fade;
        if (alpha <= 0.01) continue;
        ctx.beginPath(); ctx.fillStyle = colorFor(depth, q.m, alpha);
        ctx.arc(cx + q._x * R * scale, cy + q._y * R * scale, Math.max(0.5, size), 0, 6.2832); ctx.fill();
      }
    }
    var running = false, rafId = 0;
    function frame() { if (!running) return; autoY += 0.0016; curMX += (nmx - curMX) * 0.05; curMY += (nmy - curMY) * 0.05; draw(); rafId = window.requestAnimationFrame(frame); }
    function start() { if (running || reduceMotion) return; running = true; rafId = window.requestAnimationFrame(frame); }
    function stop() { running = false; if (rafId) window.cancelAnimationFrame(rafId); }
    var resizeRaf = 0;
    window.addEventListener("resize", function () {
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      resizeRaf = window.requestAnimationFrame(function () { smallScreen = window.matchMedia("(max-width: 720px)").matches; resize(); if (reduceMotion || !running) draw(); });
    });
    resize();
    if (reduceMotion) { curMX = 0.5; curMY = -0.25; autoY = 0.6; draw(); return; }
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { entries.forEach(function (en) { en.isIntersecting ? start() : stop(); }); }, { threshold: 0.01 }).observe(canvas);
    } else { start(); }
  })();

  /* ---- Wire up scroll after dependent modules are defined ---- */
  if (!reduceMotion) initDecompose();
  updateScroll();
  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", updateScroll, { passive: true });

  /* ---- Anchor navigation: land each heading inside the composed band ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    if (a.classList.contains("skip-link")) return; // keep native a11y behaviour
    a.addEventListener("click", function (e) {
      var href = a.getAttribute("href");
      if (!href || href === "#") return;
      var id = href.slice(1);
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      var y;
      if (id === "top" || id === "hero") {
        y = 0;
      } else {
        var headingEl = el.querySelector("[data-decompose], .section__title") || el;
        var top = headingEl.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
        y = top - window.innerHeight * 0.34; // heading rests ~34% down — centre of the composed band
      }
      window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion ? "auto" : "smooth" });
      if (history.replaceState) history.replaceState(null, "", href);
    });
  });

  /* ===================================================
     HTML5 EXTRAS — Web Audio, Device Orientation, Web Share
     =================================================== */
  /* ---- Toast ---- */
  var toastEl = document.getElementById("toast"), toastTimer = 0;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.hidden = false;
    window.requestAnimationFrame(function () { toastEl.classList.add("show"); });
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("show");
      window.setTimeout(function () { toastEl.hidden = true; }, 320);
    }, 2300);
  }

  /* ---- Web Audio: synthesized UI notes ---- */
  var actx = null, master = null, audioOn = false, noteIdx = 0, lastHover = 0;
  var SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C major pentatonic-ish
  var sndBtn = document.getElementById("soundToggle");
  function ensureAudio() {
    if (actx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    master = actx.createGain(); master.gain.value = 0.5; master.connect(actx.destination);
  }
  function blip(freq, dur, type) {
    if (!audioOn || !actx) return;
    var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.18));
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + (dur || 0.18) + 0.02);
  }
  function hoverNote() {
    var now = (window.performance && performance.now()) || 0;
    if (now - lastHover < 70) return;
    lastHover = now;
    blip(SCALE[noteIdx % SCALE.length], 0.16, "triangle"); noteIdx++;
  }
  if (sndBtn) {
    sndBtn.addEventListener("click", function () {
      ensureAudio();
      if (actx && actx.state === "suspended") actx.resume();
      audioOn = !audioOn;
      sndBtn.setAttribute("aria-pressed", audioOn ? "true" : "false");
      sndBtn.classList.toggle("is-on", audioOn);
      sndBtn.setAttribute("aria-label", audioOn ? "Mute interface sounds" : "Enable interface sounds");
      if (audioOn) { blip(659.25, 0.22, "sine"); showToast("Sound on — hover around ✨"); }
      else showToast("Sound off");
    });
    var SOUND_SEL = "a, button, .glass-card, .tag-list li";
    document.addEventListener("pointerover", function (e) {
      if (audioOn && e.target.closest && e.target.closest(SOUND_SEL)) hoverNote();
    }, { passive: true });
    document.addEventListener("click", function (e) {
      if (audioOn && e.target.closest && e.target.closest(SOUND_SEL) && !e.target.closest("#soundToggle")) {
        blip(SCALE[(noteIdx + 2) % SCALE.length], 0.24, "sine"); noteIdx++;
      }
    }, { passive: true });
  }

  /* ---- Device Orientation: tilt-to-parallax (iOS button + Android auto) ---- */
  (function gyro() {
    var DOE = window.DeviceOrientationEvent;
    if (!DOE) return;
    var fabStack = document.querySelector(".fab-stack");
    var bgMesh = document.querySelector(".bg__mesh");
    var isTouch = !finePointer || (navigator.maxTouchPoints || 0) > 0;
    if (!isTouch) return; // desktop uses the mouse instead
    var hasReq = typeof DOE.requestPermission === "function"; // true on iOS 13+
    var on = false;

    function apply(gx, gy) {
      nmx = gx; nmy = gy; gravX = gx; gravY = gy; // globe rotation + confetti gravity
      if (bgMesh) bgMesh.style.transform = "translate3d(" + (gx * 34).toFixed(1) + "px," + (gy * 34).toFixed(1) + "px,0)"; // shifts the colourful blobs (visible even during scroll pauses)
    }
    function onOrient(e) {
      if (e.gamma == null && e.beta == null) return;
      var gx = Math.sin((e.gamma || 0) * Math.PI / 180);  // screen-plane gravity X (left-right tilt)
      var gy = Math.sin((e.beta || 0) * Math.PI / 180);   // screen-plane gravity Y (up-down tilt)
      apply(Math.max(-1, Math.min(1, gx)), Math.max(-1, Math.min(1, gy)));
    }
    function start() { window.addEventListener("deviceorientation", onOrient, true); on = true; tiltOn = true; }
    function stop() { window.removeEventListener("deviceorientation", onOrient, true); on = false; tiltOn = false; apply(0, 0); }

    var btn = null;
    if (fabStack) {
      btn = document.createElement("button");
      btn.className = "fab"; btn.type = "button";
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", "Toggle tilt motion");
      btn.title = "Tilt motion (gyroscope)";
      btn.innerHTML = '<span class="fab__note" aria-hidden="true">📱</span>';
      fabStack.insertBefore(btn, fabStack.firstChild);
      btn.addEventListener("click", function () {
        if (on) { stop(); btn.classList.remove("is-on"); btn.setAttribute("aria-pressed", "false"); showToast("Tilt off"); return; }
        if (hasReq) {
          DOE.requestPermission().then(function (s) {
            if (s === "granted") { start(); btn.classList.add("is-on"); btn.setAttribute("aria-pressed", "true"); showToast("Tilt your phone 🙂"); }
            else { showToast("Motion access was blocked by the browser"); }
          }).catch(function () { showToast("Couldn't access motion sensors"); });
        } else {
          start(); btn.classList.add("is-on"); btn.setAttribute("aria-pressed", "true"); showToast("Tilt your phone 🙂");
        }
      });
    }

    if (!hasReq) {
      // Android & others: no permission needed — turn it on automatically
      start();
      if (btn) { btn.classList.add("is-on"); btn.setAttribute("aria-pressed", "true"); }
    } else if (btn) {
      // iOS: can't auto-prompt; nudge the user to tap the button once
      window.setTimeout(function () { if (!on) showToast("Tap 📱 (bottom-right) to tilt the background"); }, 1600);
    }
  })();

  /* ---- Web Share API (+ Clipboard fallback) ---- */
  var shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      var data = { title: "Maxton Huang — Software Engineer", text: "Check out my portfolio", url: location.href };
      if (navigator.share) {
        navigator.share(data).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(location.href)
          .then(function () { showToast("Link copied to clipboard!"); })
          .catch(function () { showToast("Couldn't copy — " + location.href); });
      } else {
        showToast(location.href);
      }
    });
  }

  /* ===================================================
     REPOSITORIES (live fetch)
     =================================================== */
  var statusEl = document.getElementById("repos-status");
  var gridEl = document.getElementById("repos-grid");
  var LANG_COLORS = {
    Python: "#3572A5", "C++": "#f34b7d", C: "#555555", "C#": "#178600",
    JavaScript: "#f1e05a", TypeScript: "#3178c6", HTML: "#e34c26", CSS: "#563d7c",
    Java: "#b07219", Go: "#00ADD8", Rust: "#dea584", Ruby: "#701516",
    Shell: "#89e051", Kotlin: "#A97BFF", Swift: "#F05138", Dart: "#00B4AB", PHP: "#4F5D95", Vue: "#41b883"
  };
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function showStatus(message, isError) {
    if (!statusEl) return;
    statusEl.hidden = false; statusEl.innerHTML = message;
    statusEl.classList.toggle("repos-status--error", !!isError);
  }
  function renderRepos(repos) {
    if (!gridEl) return;
    gridEl.innerHTML = repos.map(function (repo) {
      var name = escapeHtml(repo.name);
      var desc = repo.description ? escapeHtml(repo.description) : "No description provided.";
      var lang = repo.language, color = (lang && LANG_COLORS[lang]) || "#8a92a6", stars = repo.stargazers_count || 0;
      var langHtml = lang ? '<span class="lang"><span class="lang__dot" style="--lang:' + color + '"></span>' + escapeHtml(lang) + "</span>" : "";
      return '<article class="repo-card glass-card" data-tilt data-reveal="assemble">' +
        '<h3 class="repo-card__title"><a href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener noreferrer">' + name + "</a></h3>" +
        '<p class="repo-card__desc">' + desc + "</p>" +
        '<div class="repo-card__meta">' + langHtml + '<span class="repo-card__stars" title="Stars">★ ' + stars + "</span></div></article>";
    }).join("");
    gridEl.hidden = false;
    if (statusEl) statusEl.hidden = true;
    if (!reduceMotion) {
      initTilt(gridEl);
      if (window.__registerReveal) gridEl.querySelectorAll("[data-reveal]").forEach(window.__registerReveal);
      else gridEl.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("is-revealed"); });
    } else {
      gridEl.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("is-revealed"); });
    }
  }
  function loadRepos() {
    if (!statusEl || !gridEl) return;
    fetch(REPOS_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (res) {
        if (res.status === 403) throw new Error("rate-limited");
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || data.length === 0) {
          showStatus("No public repositories to show yet — check back soon, or visit " +
            '<a href="https://github.com/' + GITHUB_USER + '" target="_blank" rel="noopener noreferrer">github.com/' + GITHUB_USER + "</a>.");
          return;
        }
        renderRepos(data);
      })
      .catch(function (err) {
        var msg = err && err.message === "rate-limited" ? "GitHub's API rate limit was hit. " : "Couldn't load repositories right now. ";
        showStatus(msg + 'You can browse them directly at <a href="https://github.com/' + GITHUB_USER +
          '" target="_blank" rel="noopener noreferrer">github.com/' + GITHUB_USER + "</a>.", true);
      });
  }
  loadRepos();
})();

/* =========================================================
   maxton-site — vanilla JS (no dependencies, no build step)
   - Footer year
   - Mobile nav toggle
   - Scroll progress bar + sticky-header state (incl. over-hero)
   - Hero parallax + scroll progress feeding the globe
   - Cursor spotlight + magnetic buttons (fine pointers only)
   - Reveal-on-scroll: directional, staggered ([data-reveal])
   - Decode / scramble text on headings ([data-scramble])
   - 3D rotating particle globe that DECONSTRUCTS as you scroll (Canvas 2D)
   - 3D tilt + glare on cards
   - Live GitHub repositories fetch (#repos)
   ========================================================= */
(function () {
  "use strict";

  var GITHUB_USER = "maxtonhuang";
  var REPOS_URL =
    "https://api.github.com/users/" + GITHUB_USER + "/repos?sort=updated&per_page=12";

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer =
    window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var heroEl = document.getElementById("hero");
  var heroInner = document.querySelector(".hero__inner");
  var heroScrollProgress = 0; // 0 (whole) .. 1 (fully deconstructed); shared with the globe

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

  /* ---- Scroll: progress bar, header state, hero progress + parallax ---- */
  var header = document.querySelector(".site-header");
  var progress = document.getElementById("scrollProgress");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;

    if (progress) {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (docH > 0 ? (y / docH) * 100 : 0) + "%";
    }

    var heroH = heroEl ? heroEl.offsetHeight : 0;
    if (header) {
      header.classList.toggle("is-scrolled", y > 8);
      header.classList.toggle("over-hero", y < heroH - 80);
    }

    // Deconstruction progress (eased a touch early so it fully bursts before leaving)
    heroScrollProgress = heroH > 0 ? Math.min(1, Math.max(0, y / (heroH * 0.9))) : 0;

    // Hero content parallax
    if (heroInner && !reduceMotion) {
      if (heroScrollProgress > 0.005) {
        heroInner.style.transform = "translateY(" + (heroScrollProgress * 72).toFixed(1) + "px)";
        heroInner.style.opacity = (1 - heroScrollProgress * 0.95).toFixed(3);
      } else {
        heroInner.style.transform = "";
        heroInner.style.opacity = "";
      }
    }
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

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
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + mx * 0.25 + "px," + (my * 0.25 - 2) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ===================================================
     DECODE / SCRAMBLE TEXT
     =================================================== */
  var SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_\\/[]{}=+*^?#01";
  function rand(n) { return Math.floor(Math.random() * n); }

  function scramble(el) {
    var text = el.getAttribute("data-text");
    if (text == null) { text = el.textContent; el.setAttribute("data-text", text); }
    var queue = [];
    for (var i = 0; i < text.length; i++) {
      queue.push({ to: text.charAt(i), start: rand(18), end: rand(18) + 12, ch: null });
    }
    var frame = 0;
    function update() {
      var out = "", done = 0;
      for (var k = 0; k < queue.length; k++) {
        var q = queue[k];
        if (frame >= q.end) { done++; out += q.to; }
        else if (frame >= q.start) {
          if (!q.ch || Math.random() < 0.28) q.ch = SCRAMBLE_CHARS.charAt(rand(SCRAMBLE_CHARS.length));
          out += '<span class="scramble-char">' + q.ch + "</span>";
        }
      }
      el.innerHTML = out;
      if (done < queue.length) { frame++; window.requestAnimationFrame(update); }
      else { el.textContent = text; }
    }
    update();
  }

  /* ===================================================
     REVEAL ON SCROLL — directional + staggered
     =================================================== */
  function setStagger(el) {
    if (!el.hasAttribute("data-reveal") || !el.parentNode) return;
    var kids = el.parentNode.children, sibs = [];
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].hasAttribute && kids[i].hasAttribute("data-reveal")) sibs.push(kids[i]);
    }
    var idx = sibs.indexOf(el);
    el.style.setProperty("--rd", Math.min(idx < 0 ? 0 : idx, 8) * 75 + "ms");
  }

  function markRevealed(el) {
    el.classList.add("in-view", "is-revealed");
    if (el.hasAttribute("data-scramble") && !el.getAttribute("data-scrambled")) {
      el.setAttribute("data-scrambled", "1");
      scramble(el);
    }
  }

  var revealEls = function () { return document.querySelectorAll(".reveal, [data-reveal], [data-scramble]"); };

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls().forEach(function (el) { el.classList.add("in-view", "is-revealed"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { markRevealed(entry.target); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });

    var registerReveal = function (el) { setStagger(el); io.observe(el); };
    revealEls().forEach(registerReveal);
    // expose for dynamically-added repo cards
    window.__registerReveal = registerReveal;
  }

  /* ===================================================
     3D TILT + GLARE on cards
     =================================================== */
  function initTilt(scope) {
    if (!finePointer) return;
    (scope || document).querySelectorAll("[data-tilt]:not([data-tilt-ready])").forEach(function (el) {
      el.setAttribute("data-tilt-ready", "1");
      var glare = document.createElement("span");
      glare.className = "card-glare";
      el.appendChild(glare);
      var MAX = 8;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        el.classList.add("is-tilting");
        el.style.transform =
          "perspective(900px) rotateX(" + ((0.5 - py) * MAX * 2).toFixed(2) + "deg) rotateY(" +
          ((px - 0.5) * MAX * 2).toFixed(2) + "deg) translateY(-4px)";
        glare.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
        glare.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", function () {
        el.classList.remove("is-tilting");
        el.style.transform = "";
      });
    });
  }
  if (!reduceMotion) initTilt(document);

  /* ===================================================
     HERO — 3D particle globe that DECONSTRUCTS on scroll
     =================================================== */
  (function heroGlobe() {
    var canvas = document.getElementById("heroCanvas");
    if (!canvas) return;
    var ctx;
    try { ctx = canvas.getContext("2d"); } catch (e) { return; }
    if (!ctx) return;

    var isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var smallScreen = window.matchMedia("(max-width: 720px)").matches;
    var COUNT = smallScreen ? 280 : 640;

    var w = 0, h = 0, dpr = 1, cx = 0, cy = 0, R = 0;
    var pts = [];
    var GOLDEN = Math.PI * (1 + Math.sqrt(5));
    for (var i = 0; i < COUNT; i++) {
      var phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT);
      var theta = GOLDEN * i;
      pts.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi),
        m: i / COUNT,
        speed: 0.6 + Math.random() * 1.1,          // how far it flies when deconstructing
        jx: (Math.random() - 0.5),                  // irregular dispersal direction
        jy: (Math.random() - 0.5),
        jz: (Math.random() - 0.5)
      });
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w > 900 ? w * 0.7 : w * 0.5;
      cy = h * (w > 900 ? 0.5 : 0.42);
      R = Math.min(w, h) * (smallScreen ? 0.46 : 0.34);
    }

    function lerp(a, b, t) { return a + (b - a) * t; }
    function colorFor(depth, m, alpha) {
      var r, g, b;
      if (isDark) {
        r = Math.round(lerp(70, 130, m));
        g = Math.round(lerp(90, 211, depth));
        b = Math.round(lerp(200, 238, depth * m + 0.3));
      } else {
        r = Math.round(lerp(79, 6, m));
        g = Math.round(lerp(70, 130, depth));
        b = Math.round(lerp(229, 212, depth));
      }
      return "rgba(" + r + "," + g + "," + b + "," + alpha.toFixed(3) + ")";
    }

    var autoY = 0.0, curMX = 0, curMY = 0, tgtMX = 0, tgtMY = 0;
    var persp = 2.4;
    var order = pts.map(function (_, idx) { return idx; });

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = isDark ? "lighter" : "source-over";

      var prog = heroScrollProgress;
      var e = prog * prog;            // ease-in: stays whole, then bursts
      var burst = e * 3.2;
      var fade = 1 - prog * 0.82;

      var aY = autoY + curMX * 0.9 + prog * 1.3;   // twist as it deconstructs
      var aX = curMY * 0.6;
      var cosY = Math.cos(aY), sinY = Math.sin(aY);
      var cosX = Math.cos(aX), sinX = Math.sin(aX);

      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        var exp = 1 + burst * p.speed;
        var bx = p.x * exp + p.jx * e * 2.2;
        var by = p.y * exp + p.jy * e * 2.2;
        var bz = p.z * exp + p.jz * e * 2.2;
        var x1 = bx * cosY - bz * sinY;
        var z1 = bx * sinY + bz * cosY;
        p._z = by * sinX + z1 * cosX;
        p._x = x1;
        p._y = by * cosX - z1 * sinX;
      }
      order.sort(function (a, b) { return pts[a]._z - pts[b]._z; });

      for (var n = 0; n < order.length; n++) {
        var q = pts[order[n]];
        var scale = persp / (persp - Math.min(q._z, persp - 0.05));
        var sx = cx + q._x * R * scale;
        var sy = cy + q._y * R * scale;
        var depth = Math.max(0, Math.min(1, (q._z + 1) / 2));
        var size = (smallScreen ? 1.1 : 1.4) * scale * (0.45 + depth * 1.1);
        var alpha = (isDark ? (0.12 + depth * 0.6) : (0.18 + depth * 0.62)) * fade;
        if (alpha <= 0.01) continue;
        ctx.beginPath();
        ctx.fillStyle = colorFor(depth, q.m, alpha);
        ctx.arc(sx, sy, Math.max(0.4, size), 0, 6.2832);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    var running = false, rafId = 0;
    function frame() {
      if (!running) return;
      autoY += 0.0016;
      curMX += (tgtMX - curMX) * 0.05;
      curMY += (tgtMY - curMY) * 0.05;
      draw();
      rafId = window.requestAnimationFrame(frame);
    }
    function start() { if (running || reduceMotion) return; running = true; rafId = window.requestAnimationFrame(frame); }
    function stop() { running = false; if (rafId) window.cancelAnimationFrame(rafId); }

    if (heroEl && finePointer) {
      heroEl.addEventListener("pointermove", function (e) {
        tgtMX = e.clientX / window.innerWidth - 0.5;
        tgtMY = e.clientY / window.innerHeight - 0.5;
      }, { passive: true });
    }

    var resizeRaf = 0;
    window.addEventListener("resize", function () {
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      resizeRaf = window.requestAnimationFrame(function () {
        smallScreen = window.matchMedia("(max-width: 720px)").matches;
        resize();
        if (reduceMotion || !running) draw();
      });
    });

    resize();

    if (reduceMotion) { curMX = 0.5; curMY = -0.25; autoY = 0.6; draw(); return; }

    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.isIntersecting ? start() : stop(); });
      }, { threshold: 0.01 }).observe(canvas);
    } else { start(); }
  })();

  /* ===================================================
     REPOSITORIES (live fetch)
     =================================================== */
  var statusEl = document.getElementById("repos-status");
  var gridEl = document.getElementById("repos-grid");

  var LANG_COLORS = {
    Python: "#3572A5", "C++": "#f34b7d", C: "#555555", "C#": "#178600",
    JavaScript: "#f1e05a", TypeScript: "#3178c6", HTML: "#e34c26", CSS: "#563d7c",
    Java: "#b07219", Go: "#00ADD8", Rust: "#dea584", Ruby: "#701516",
    Shell: "#89e051", Kotlin: "#A97BFF", Swift: "#F05138", Dart: "#00B4AB",
    PHP: "#4F5D95", Vue: "#41b883"
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function showStatus(message, isError) {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.innerHTML = message;
    statusEl.classList.toggle("repos-status--error", !!isError);
  }

  function renderRepos(repos) {
    if (!gridEl) return;
    gridEl.innerHTML = repos.map(function (repo) {
      var name = escapeHtml(repo.name);
      var desc = repo.description ? escapeHtml(repo.description) : "No description provided.";
      var lang = repo.language;
      var color = (lang && LANG_COLORS[lang]) || "#8a92a6";
      var stars = repo.stargazers_count || 0;
      var langHtml = lang
        ? '<span class="lang"><span class="lang__dot" style="--lang:' + color + '"></span>' + escapeHtml(lang) + "</span>"
        : "";
      return (
        '<article class="repo-card" data-tilt data-reveal="assemble">' +
        '<h3 class="repo-card__title"><a href="' + escapeHtml(repo.html_url) +
        '" target="_blank" rel="noopener noreferrer">' + name + "</a></h3>" +
        '<p class="repo-card__desc">' + desc + "</p>" +
        '<div class="repo-card__meta">' + langHtml +
        '<span class="repo-card__stars" title="Stars">★ ' + stars + "</span></div>" +
        "</article>"
      );
    }).join("");
    gridEl.hidden = false;
    if (statusEl) statusEl.hidden = true;

    if (!reduceMotion) {
      initTilt(gridEl);
      if (window.__registerReveal) {
        gridEl.querySelectorAll("[data-reveal]").forEach(window.__registerReveal);
      } else {
        gridEl.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("is-revealed"); });
      }
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
          showStatus(
            "No public repositories to show yet — check back soon, or visit " +
            '<a href="https://github.com/' + GITHUB_USER + '" target="_blank" rel="noopener noreferrer">github.com/' +
            GITHUB_USER + "</a>.");
          return;
        }
        renderRepos(data);
      })
      .catch(function (err) {
        var msg = err && err.message === "rate-limited"
          ? "GitHub's API rate limit was hit. "
          : "Couldn't load repositories right now. ";
        showStatus(msg + 'You can browse them directly at <a href="https://github.com/' + GITHUB_USER +
          '" target="_blank" rel="noopener noreferrer">github.com/' + GITHUB_USER + "</a>.", true);
      });
  }

  loadRepos();
})();

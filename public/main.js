/* =========================================================
   maxton-site — vanilla JS (no dependencies, no build step)
   - Footer year
   - Mobile nav toggle
   - Scroll progress bar + sticky-header state (incl. over-hero)
   - Cursor spotlight + magnetic buttons (fine pointers only)
   - Reveal-on-scroll (IntersectionObserver)
   - 3D rotating particle globe in the hero (Canvas 2D, pseudo-3D)
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

  /* ---- Scroll progress + header state ---- */
  var header = document.querySelector(".site-header");
  var progress = document.getElementById("scrollProgress");
  var heroEl = document.getElementById("hero");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;

    if (progress) {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docH > 0 ? (y / docH) * 100 : 0;
      progress.style.width = pct + "%";
    }
    if (header) {
      header.classList.toggle("is-scrolled", y > 8);
      var heroH = heroEl ? heroEl.offsetHeight : 0;
      header.classList.toggle("over-hero", y < heroH - 80);
    }
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  /* ---- Cursor spotlight ---- */
  var glow = document.getElementById("cursorGlow");
  if (glow && finePointer && !reduceMotion) {
    window.addEventListener(
      "pointermove",
      function (e) {
        glow.style.transform =
          "translate3d(" + (e.clientX - 230) + "px," + (e.clientY - 230) + "px,0)";
        glow.classList.add("is-active");
      },
      { passive: true }
    );
    document.addEventListener("pointerleave", function () {
      glow.classList.remove("is-active");
    });
  }

  /* ---- Magnetic buttons ---- */
  if (finePointer && !reduceMotion) {
    var magnets = document.querySelectorAll(".magnetic");
    magnets.forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        el.style.transform =
          "translate(" + mx * 0.25 + "px," + (my * 0.25 - 2) + "px)";
      });
      el.addEventListener("pointerleave", function () {
        el.style.transform = "";
      });
    });
  }

  /* ---- Reveal on scroll ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ===================================================
     3D TILT + GLARE on cards
     =================================================== */
  function initTilt(scope) {
    if (!finePointer) return;
    var els = (scope || document).querySelectorAll("[data-tilt]:not([data-tilt-ready])");
    els.forEach(function (el) {
      el.setAttribute("data-tilt-ready", "1");

      var glare = document.createElement("span");
      glare.className = "card-glare";
      el.appendChild(glare);

      var MAX = 8; // degrees
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;  // 0..1
        var py = (e.clientY - r.top) / r.height;  // 0..1
        var rx = (0.5 - py) * (MAX * 2);
        var ry = (px - 0.5) * (MAX * 2);
        el.classList.add("is-tilting");
        el.style.transform =
          "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" +
          ry.toFixed(2) + "deg) translateY(-4px)";
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
     HERO — 3D rotating particle globe (Canvas 2D)
     Pseudo-3D: points on a sphere, rotated + perspective-projected.
     =================================================== */
  (function heroGlobe() {
    var canvas = document.getElementById("heroCanvas");
    if (!canvas) return;
    var ctx;
    try {
      ctx = canvas.getContext("2d");
    } catch (e) { return; }
    if (!ctx) return;

    var isDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var smallScreen = window.matchMedia("(max-width: 720px)").matches;
    var COUNT = smallScreen ? 280 : 640;

    var w = 0, h = 0, dpr = 1, cx = 0, cy = 0, R = 0;
    var pts = [];

    // Fibonacci sphere of unit vectors
    var GOLDEN = Math.PI * (1 + Math.sqrt(5));
    for (var i = 0; i < COUNT; i++) {
      var phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT);
      var theta = GOLDEN * i;
      pts.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi),
        // a per-point hue mix factor for color variety
        m: i / COUNT
      });
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Offset globe to the right on wide screens so it sits beside the text
      cx = w > 900 ? w * 0.7 : w * 0.5;
      cy = h * (w > 900 ? 0.5 : 0.42);
      R = Math.min(w, h) * (smallScreen ? 0.46 : 0.34);
    }

    // colour helpers
    function lerp(a, b, t) { return a + (b - a) * t; }
    function colorFor(depth, m, alpha) {
      // depth 0 (back) .. 1 (front); m 0..1 across points
      var r, g, b;
      if (isDark) {
        // indigo -> cyan, brighter toward the front
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

      var aY = autoY + curMX * 0.9;
      var aX = curMY * 0.6;
      var cosY = Math.cos(aY), sinY = Math.sin(aY);
      var cosX = Math.cos(aX), sinX = Math.sin(aX);

      // compute projected z for depth sorting
      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        var x1 = p.x * cosY - p.z * sinY;
        var z1 = p.x * sinY + p.z * cosY;
        var z2 = p.y * sinX + z1 * cosX;
        p._z = z2;
        p._x = x1;
        p._y = p.y * cosX - z1 * sinX;
      }
      order.sort(function (a, b) { return pts[a]._z - pts[b]._z; });

      for (var n = 0; n < order.length; n++) {
        var q = pts[order[n]];
        var scale = persp / (persp - q._z);
        var sx = cx + q._x * R * scale;
        var sy = cy + q._y * R * scale;
        var depth = (q._z + 1) / 2;           // 0..1
        var size = (smallScreen ? 1.1 : 1.4) * scale * (0.45 + depth * 1.1);
        var alpha = isDark ? (0.12 + depth * 0.6) : (0.18 + depth * 0.62);

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
    function start() {
      if (running || reduceMotion) return;
      running = true;
      rafId = window.requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (rafId) window.cancelAnimationFrame(rafId);
    }

    // Pointer parallax (listen on hero so it works under the text overlay)
    if (heroEl && finePointer) {
      heroEl.addEventListener(
        "pointermove",
        function (e) {
          tgtMX = e.clientX / window.innerWidth - 0.5;
          tgtMY = e.clientY / window.innerHeight - 0.5;
        },
        { passive: true }
      );
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

    if (reduceMotion) {
      // Single nicely-angled static frame
      curMX = 0.5; curMY = -0.25; autoY = 0.6;
      draw();
      return;
    }

    // Pause when tab hidden or hero scrolled out of view
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
    if ("IntersectionObserver" in window) {
      var vis = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) start(); else stop();
          });
        },
        { threshold: 0.01 }
      );
      vis.observe(canvas);
    } else {
      start();
    }
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
    var html = repos
      .map(function (repo) {
        var name = escapeHtml(repo.name);
        var desc = repo.description ? escapeHtml(repo.description) : "No description provided.";
        var lang = repo.language;
        var color = (lang && LANG_COLORS[lang]) || "#8a92a6";
        var stars = repo.stargazers_count || 0;
        var langHtml = lang
          ? '<span class="lang"><span class="lang__dot" style="--lang:' + color + '"></span>' + escapeHtml(lang) + "</span>"
          : "";
        var starsHtml = '<span class="repo-card__stars" title="Stars">★ ' + stars + "</span>";
        return (
          '<article class="repo-card" data-tilt>' +
          '<h3 class="repo-card__title"><a href="' + escapeHtml(repo.html_url) +
          '" target="_blank" rel="noopener noreferrer">' + name + "</a></h3>" +
          '<p class="repo-card__desc">' + desc + "</p>" +
          '<div class="repo-card__meta">' + langHtml + starsHtml + "</div>" +
          "</article>"
        );
      })
      .join("");
    gridEl.innerHTML = html;
    gridEl.hidden = false;
    if (statusEl) statusEl.hidden = true;
    if (!reduceMotion) initTilt(gridEl); // wire tilt on freshly-rendered cards
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
            GITHUB_USER + "</a>."
          );
          return;
        }
        renderRepos(data);
      })
      .catch(function (err) {
        var msg = err && err.message === "rate-limited"
          ? "GitHub's API rate limit was hit. "
          : "Couldn't load repositories right now. ";
        showStatus(
          msg + 'You can browse them directly at <a href="https://github.com/' + GITHUB_USER +
          '" target="_blank" rel="noopener noreferrer">github.com/' + GITHUB_USER + "</a>.",
          true
        );
      });
  }

  loadRepos();
})();

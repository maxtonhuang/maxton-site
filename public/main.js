/* =========================================================
   maxton-site — vanilla JS
   - Mobile nav toggle
   - Sticky-header shadow on scroll
   - Reveal-on-scroll (IntersectionObserver)
   - Live GitHub repositories fetch (#repos)
   ========================================================= */
(function () {
  "use strict";

  var GITHUB_USER = "maxtonhuang";
  var REPOS_URL =
    "https://api.github.com/users/" + GITHUB_USER + "/repos?sort=updated&per_page=12";

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
    // Close the menu after choosing a destination
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    });
  }

  /* ---- Sticky header shadow ---- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Reveal on scroll ---- */
  var revealEls = document.querySelectorAll(".reveal");
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) {
      el.classList.add("in-view");
    });
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
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---- Repositories ---- */
  var statusEl = document.getElementById("repos-status");
  var gridEl = document.getElementById("repos-grid");

  // A small set of language → color mappings (GitHub-like).
  var LANG_COLORS = {
    Python: "#3572A5",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Java: "#b07219",
    Go: "#00ADD8",
    Rust: "#dea584",
    Ruby: "#701516",
    Shell: "#89e051",
    Kotlin: "#A97BFF",
    Swift: "#F05138",
    Dart: "#00B4AB",
    PHP: "#4F5D95",
    Vue: "#41b883"
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
        var desc = repo.description
          ? escapeHtml(repo.description)
          : "No description provided.";
        var lang = repo.language;
        var color = (lang && LANG_COLORS[lang]) || "#8a92a6";
        var stars = repo.stargazers_count || 0;

        var langHtml = lang
          ? '<span class="lang"><span class="lang__dot" style="--lang:' +
            color +
            '"></span>' +
            escapeHtml(lang) +
            "</span>"
          : "";

        var starsHtml =
          '<span class="repo-card__stars" title="Stars">' +
          "★ " +
          stars +
          "</span>";

        return (
          '<article class="repo-card">' +
          '<h3 class="repo-card__title"><a href="' +
          escapeHtml(repo.html_url) +
          '" target="_blank" rel="noopener noreferrer">' +
          name +
          "</a></h3>" +
          '<p class="repo-card__desc">' +
          desc +
          "</p>" +
          '<div class="repo-card__meta">' +
          langHtml +
          starsHtml +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    gridEl.innerHTML = html;
    gridEl.hidden = false;
    if (statusEl) statusEl.hidden = true;
  }

  function loadRepos() {
    if (!statusEl || !gridEl) return;

    fetch(REPOS_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (res) {
        if (res.status === 403) {
          throw new Error("rate-limited");
        }
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || data.length === 0) {
          showStatus(
            "No public repositories to show yet — check back soon, or visit " +
              '<a href="https://github.com/' +
              GITHUB_USER +
              '" target="_blank" rel="noopener noreferrer">github.com/' +
              GITHUB_USER +
              "</a>."
          );
          return;
        }
        renderRepos(data);
      })
      .catch(function (err) {
        var msg =
          err && err.message === "rate-limited"
            ? "GitHub's API rate limit was hit. "
            : "Couldn't load repositories right now. ";
        showStatus(
          msg +
            'You can browse them directly at <a href="https://github.com/' +
            GITHUB_USER +
            '" target="_blank" rel="noopener noreferrer">github.com/' +
            GITHUB_USER +
            "</a>.",
          true
        );
      });
  }

  loadRepos();
})();

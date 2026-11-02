(() => {
  const THEME_KEY = "seclusa-theme";
  const docEl = document.documentElement;
  const safeGet = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  };
  const safeSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (_) { /* private / quota */ }
  };
  const resolveTheme = () => {
    const saved = safeGet(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    // No saved choice: follow the visitor's system setting, and keep following
    // it. theme-boot.js has already set data-theme from the same two sources,
    // so this re-applies the same answer rather than deciding anything new.
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  };
  const applyTheme = (theme) => {
    docEl.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f6fa" : "#070b12");
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      btn.textContent = theme === "dark" ? "Light" : "Dark";
      btn.title = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    });
  };
  applyTheme(resolveTheme());
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = docEl.getAttribute("data-theme") === "dark" ? "light" : "dark";
      safeSet(THEME_KEY, next);
      applyTheme(next);
    });
  });
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (!safeGet(THEME_KEY)) applyTheme(resolveTheme());
  });

  const normPath = (p) =>
    String(p || "/")
      .replace(/\/index\.html$/, "/")
      .replace(/\/$/, "/") || "/";
  const path = normPath(location.pathname);
  // Preview root is /p/ — never treat it as a prefix match for every subpage.
  const siteRoots = new Set(["/", "/p/"]);
  document.querySelectorAll(".site-nav .links a").forEach((a) => {
    try {
      const href = normPath(new URL(a.getAttribute("href"), location.href).pathname);
      const exact = href === path;
      const nested =
        !siteRoots.has(href) && href.endsWith("/") && path.startsWith(href);
      if (exact || nested) {
        a.setAttribute("aria-current", "page");
      } else {
        a.removeAttribute("aria-current");
      }
    } catch (_) { /* ignore */ }
  });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.setAttribute("data-reveal-i", String(i % 12));
    if (reduceMotion) el.classList.add("reveal--static");
  });

  // Store tiles get the fade-in lift. About and Privacy stay plain prose.
  const glassEls = document.querySelectorAll(".app-tile");
  if (glassEls.length) {
    const show = (el) => el.classList.add("is-in");
    glassEls.forEach((el, i) => el.setAttribute("data-in-i", String(i % 8)));
    if (reduceMotion || !("IntersectionObserver" in window)) {
      glassEls.forEach(show);
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            show(entry.target);
            io.unobserve(entry.target);
          });
        },
        { rootMargin: "80px 0px 80px 0px", threshold: 0.01 }
      );
      glassEls.forEach((el) => io.observe(el));
      // Never leave tiles invisible if IO misses (overflow/clip, odd viewport).
      window.setTimeout(() => glassEls.forEach(show), 600);
    }
  }

  if ("serviceWorker" in navigator) {
    // Derive the site root from this script's URL so GitHub Pages project
    // paths (/website/) and the /p/ preview root both register the right SW.
    let root = "/";
    const script = document.querySelector('script[src*="js/site.js"]');
    if (script) {
      try {
        root = new URL("../", new URL(script.getAttribute("src"), location.href)).pathname;
      } catch (_) { /* keep / */ }
    } else if (location.pathname.startsWith("/p/")) {
      root = "/p/";
    }
    navigator.serviceWorker.register(`${root}sw.js`).catch(() => {});
  }

  const nav = document.querySelector(".site-nav");
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle("is-compact", window.scrollY > 28);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

})();

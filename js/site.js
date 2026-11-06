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
  const safeRemove = (key) => {
    try {
      localStorage.removeItem(key);
    } catch (_) { /* private / quota */ }
  };
  const lightQuery = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: light)")
    : null;
  const storedMode = () => {
    const saved = safeGet(THEME_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    return "system";
  };
  const systemTheme = () => (lightQuery && lightQuery.matches ? "light" : "dark");
  const resolveTheme = (mode) => (mode === "light" || mode === "dark" ? mode : systemTheme());
  const paintChoice = (mode) => {
    document.querySelectorAll("[data-theme-opt]").forEach((btn) => {
      btn.setAttribute("aria-checked", btn.getAttribute("data-theme-opt") === mode ? "true" : "false");
    });
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.textContent = "Theme";
      btn.setAttribute("aria-pressed", mode === "system" ? "false" : "true");
      btn.title = mode === "system" ? "Theme, following system" : "Theme, " + mode;
    });
  };
  const applyTheme = (mode) => {
    const theme = resolveTheme(mode);
    docEl.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f6fa" : "#070b12");
    paintChoice(mode);
  };
  const setSheet = (open) => {
    document.querySelectorAll("[data-theme-sheet]").forEach((sheet) => {
      sheet.hidden = !open;
    });
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  };
  applyTheme(storedMode());
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const sheet = document.getElementById(btn.getAttribute("aria-controls"));
      setSheet(!!(sheet && sheet.hidden));
    });
  });
  document.querySelectorAll("[data-theme-opt]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const next = btn.getAttribute("data-theme-opt");
      if (next !== "system" && next !== "light" && next !== "dark") return;
      if (next === "system") safeRemove(THEME_KEY);
      else safeSet(THEME_KEY, next);
      applyTheme(next);
    });
  });
  document.addEventListener("click", () => setSheet(false));
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") setSheet(false);
  });
  if (lightQuery) {
    const onScheme = () => {
      if (storedMode() === "system") applyTheme("system");
    };
    if (lightQuery.addEventListener) lightQuery.addEventListener("change", onScheme);
    else if (lightQuery.addListener) lightQuery.addListener(onScheme);
  }

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

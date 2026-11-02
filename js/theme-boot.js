// Applies the saved or system theme before the page paints.
//
// Loaded synchronously in <head>, ahead of the stylesheet, so a visitor whose
// system is light never sees a flash of the dark default. Inline is not an
// option here: the site's CSP is script-src 'self' with no unsafe-inline, so
// this has to be a real file.
//
// Only the attribute and the theme-color meta are set. Labels, toggles and the
// rest of the behaviour live in site.js, which runs once the DOM is there.
(() => {
  const KEY = "seclusa-theme";
  let saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch (_) {
    /* private mode, or storage disabled: fall through to the system default */
  }
  const system = () =>
    window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  const theme = saved === "light" || saved === "dark" ? saved : system();

  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f4f6fa" : "#070b12");
})();
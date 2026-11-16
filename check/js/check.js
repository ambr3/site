/*
 * Seclusa Check — site page UI wiring. Tools make no network requests.
 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var TOOLS = ["apps", "policy", "headers", "urls", "about"];
  var appsCategory = "all";

  function toast(message) {
    var node = $("toast");
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function () { node.hidden = true; }, 2400);
  }

  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = String(text);
    return el;
  }

  function bandClass(band) {
    if (band === "danger") return "score-band score-danger";
    if (band === "warn") return "score-band score-warn";
    return "score-band score-ok";
  }

  function hitClass(severity) {
    if (severity === "danger") return "hit hit-danger";
    if (severity === "warn") return "hit hit-warn";
    if (severity === "ok") return "hit hit-ok";
    return "hit";
  }

  function bandLabel(band) {
    if (band === "danger") return "High concern";
    if (band === "warn") return "Review";
    return "Looks quieter";
  }

  function scoreStrip(band, value, unit, summary) {
    var strip = node("div", bandClass(band));
    var left = node("div", "score-main");
    left.appendChild(node("span", "score-value", String(value)));
    left.appendChild(node("span", "score-unit", unit));
    var right = node("div", "score-copy");
    right.appendChild(node("strong", "score-label", bandLabel(band)));
    right.appendChild(node("p", "score-summary", summary));
    strip.appendChild(left);
    strip.appendChild(right);
    return strip;
  }

  function revealResult(out) {
    out.hidden = false;
    out.classList.remove("result-enter");
    void out.offsetWidth;
    out.classList.add("result-enter");
  }

  function copyText(text) {
    var value = String(text || "");
    if (!value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () {
        toast("Copied scrubbed URL");
      }).catch(function () {
        toast("Could not copy");
      });
      return;
    }
    toast("Could not copy");
  }

  function hashFor(name) {
    return name === "apps" ? "" : "#" + name;
  }

  function toolFromLocation() {
    var raw = String(location.hash || "").replace(/^#/, "");
    return TOOLS.indexOf(raw) === -1 ? "apps" : raw;
  }

  function selectTool(name, fromHistory) {
    if (TOOLS.indexOf(name) === -1) name = "apps";
    TOOLS.forEach(function (tool) {
      var tab = $("tab-" + tool);
      var panel = $("panel-" + tool);
      var on = tool === name;
      if (tab) {
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.classList.toggle("active", on);
        tab.tabIndex = on ? 0 : -1;
      }
      if (panel) {
        panel.hidden = !on;
        panel.classList.toggle("hidden", !on);
      }
    });
    if (fromHistory) return;
    if ((location.hash || "") === hashFor(name)) return;
    history.pushState({ tool: name }, "", location.pathname + location.search + hashFor(name));
  }

  function wireTabs() {
    var row = $("tool-row");
    if (!row) return;
    row.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-tool]");
      if (!btn || !row.contains(btn)) return;
      selectTool(btn.getAttribute("data-tool"));
    });

    row.addEventListener("keydown", function (event) {
      var key = event.key;
      if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "Home" && key !== "End") return;
      var index = 0;
      TOOLS.forEach(function (tool, i) {
        var tab = $("tab-" + tool);
        if (tab && tab.getAttribute("aria-selected") === "true") index = i;
      });
      var next = index;
      if (key === "ArrowRight") next = (index + 1) % TOOLS.length;
      else if (key === "ArrowLeft") next = (index - 1 + TOOLS.length) % TOOLS.length;
      else if (key === "Home") next = 0;
      else next = TOOLS.length - 1;
      event.preventDefault();
      selectTool(TOOLS[next]);
      var tab = $("tab-" + TOOLS[next]);
      if (tab) tab.focus();
    });

    window.addEventListener("hashchange", function () {
      selectTool(toolFromLocation(), true);
    });
    window.addEventListener("popstate", function () {
      selectTool(toolFromLocation(), true);
    });

    document.querySelectorAll("[data-goto]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-goto");
        if (target) selectTool(target);
      });
    });
  }

  function clampControl(input, max, what) {
    if (!input) return "";
    var value = String(input.value || "");
    if (value.length > max) {
      value = value.slice(0, max);
      input.value = value;
      toast(what + " truncated to " + max + " characters");
    }
    return value;
  }

  function renderPolicy() {
    var input = $("policy-input");
    var out = $("policy-result");
    if (!input || !out) return;
    var max = window.PrivacyPolicy.MAX_INPUT || 200000;
    var result = window.PrivacyPolicy.analyse(clampControl(input, max, "Policy text"));
    var list = node("ul", "hit-list");
    result.hits.forEach(function (hit) {
      var item = node("li", hitClass(hit.severity));
      item.appendChild(node("strong", "", hit.label));
      item.appendChild(node("p", "", hit.explain));
      item.appendChild(node("p", "snippet", hit.snippet));
      list.appendChild(item);
    });
    out.replaceChildren(
      scoreStrip(result.band, result.score, "score", result.summary),
      node("p", "meta", result.wordCount + " words · " + result.hits.length + " pattern" + (result.hits.length === 1 ? "" : "s"))
    );
    if (result.hits.length) out.appendChild(list);
    revealResult(out);
  }

  function renderHeaders() {
    var input = $("headers-input");
    var out = $("headers-result");
    if (!input || !out) return;
    var max = window.PrivacyHeaders.MAX_INPUT || 200000;
    var result = window.PrivacyHeaders.analyse(clampControl(input, max, "Headers"));
    var hops = (result.received && result.received.length) || 0;
    var flagCount = (result.flags && result.flags.length) || 0;
    out.replaceChildren(scoreStrip(result.band, hops, hops === 1 ? "hop" : "hops", result.summary));
    if (result.auth) {
      out.appendChild(node("p", "meta", "SPF " + (result.auth.spf || "—") +
        " · DKIM " + (result.auth.dkim || "—") +
        " · DMARC " + (result.auth.dmarc || "—") +
        " · " + flagCount + " flag" + (flagCount === 1 ? "" : "s")));
    }
    if (result.flags && result.flags.length) {
      var list = node("ul", "hit-list");
      result.flags.forEach(function (flag) {
        var item = node("li", hitClass(flag.severity));
        item.appendChild(node("strong", "", flag.label));
        item.appendChild(node("p", "", flag.detail));
        list.appendChild(item);
      });
      out.appendChild(list);
    }
    revealResult(out);
  }

  function renderUrls() {
    var input = $("urls-input");
    var out = $("urls-result");
    if (!input || !out) return;
    var max = window.PrivacyUrls.MAX_CHARS || 100000;
    var result = window.PrivacyUrls.analyse(clampControl(input, max, "URLs"));
    var count = result.items.length;
    out.replaceChildren(scoreStrip(result.band, count, count === 1 ? "URL" : "URLs", result.summary));
    result.items.forEach(function (item) {
      var card = node("article", "url-card");
      var line = node("p", "url-line");
      line.appendChild(node("code", "", item.original));
      card.appendChild(line);
      if (item.ok && item.cleaned && item.cleaned !== item.href) {
        var scrubRow = node("div", "scrub-row");
        var meta = node("p", "meta scrub-meta", "Scrubbed: ");
        meta.appendChild(node("code", "", item.cleaned));
        scrubRow.appendChild(meta);
        var copyBtn = node("button", "btn btn-compact", "Copy");
        copyBtn.type = "button";
        copyBtn.addEventListener("click", function () { copyText(item.cleaned); });
        scrubRow.appendChild(copyBtn);
        card.appendChild(scrubRow);
      }
      var list = node("ul", "hit-list");
      (item.issues || []).forEach(function (issue) {
        list.appendChild(node("li", hitClass(issue.severity), issue.message));
      });
      card.appendChild(list);
      out.appendChild(card);
    });
    revealResult(out);
  }

  function loadSample(kind) {
    var samples = window.PrivacySamples || {};
    if (kind === "policy") {
      var policyInput = $("policy-input");
      if (!policyInput) return;
      policyInput.value = samples.policy || "";
      renderPolicy();
      toast("Sample policy loaded");
      return;
    }
    if (kind === "headers") {
      var headersInput = $("headers-input");
      if (!headersInput) return;
      headersInput.value = samples.headers || "";
      renderHeaders();
      toast("Sample headers loaded");
      return;
    }
    if (kind === "urls") {
      var urlsInput = $("urls-input");
      if (!urlsInput) return;
      urlsInput.value = samples.urls || "";
      renderUrls();
      toast("Sample URLs loaded");
    }
  }

  function scrubUrls() {
    var input = $("urls-input");
    if (!input) return;
    var max = window.PrivacyUrls.MAX_CHARS || 100000;
    var next = window.PrivacyUrls.scrub(clampControl(input, max, "URLs"));
    input.value = next;
    renderUrls();
    toast("Tracking params removed");
  }

  function externalLink(href, className, text) {
    var a = node("a", className, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }

  function citeLabel(href) {
    try {
      return new URL(href).hostname.replace(/^www\./, "");
    } catch (err) {
      return "source";
    }
  }

  function pointList(catalog, title, className, points) {
    var wrap = node("div", "app-points " + className);
    wrap.appendChild(node("h4", "app-points-title", title));
    var ul = node("ul", "app-point-list");
    (points || []).forEach(function (item) {
      var li = node("li");
      li.appendChild(document.createTextNode(item.text));
      if (item.href && catalog.isHttpsUrl(item.href)) {
        li.appendChild(document.createTextNode(" "));
        li.appendChild(externalLink(item.href, "app-cite", citeLabel(item.href)));
      }
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  function renderApps() {
    var catalog = window.PrivacyApps;
    var list = $("apps-list");
    var count = $("apps-count");
    var search = $("apps-search");
    if (!catalog || !list) return;
    var query = search ? String(search.value || "") : "";
    var apps = catalog.filterApps({ category: appsCategory, query: query });
    if (count) {
      count.textContent = apps.length + " tool" + (apps.length === 1 ? "" : "s") +
        (appsCategory === "all" && !query.trim() ? "" : " shown");
    }
    list.replaceChildren();
    if (!apps.length) {
      list.appendChild(node("p", "muted-note", "No matches. Try another category or clear the search."));
      return;
    }
    apps.forEach(function (app) {
      var card = node("article", "app-card");
      var head = node("div", "app-card-head");
      head.appendChild(node("h3", "app-name", app.name));
      var cat = catalog.CATEGORIES.find(function (c) { return c.id === app.category; });
      if (cat) head.appendChild(node("span", "app-cat", cat.label));
      if (app.pick) head.appendChild(node("span", "app-pick", app.pick));
      card.appendChild(head);
      card.appendChild(node("p", "app-blurb", app.why));
      if (app.platforms && app.platforms.length) {
        var plats = node("p", "app-platforms");
        app.platforms.forEach(function (p) {
          plats.appendChild(node("span", "app-chip", p));
        });
        card.appendChild(plats);
      }
      card.appendChild(pointList(catalog, "Good", "app-good", app.good));
      card.appendChild(pointList(catalog, "Caveats", "app-bad", app.bad));
      if (catalog.isHttpsUrl(app.url)) {
        var actions = node("div", "app-actions");
        actions.appendChild(externalLink(app.url, "btn btn-compact primary", "Visit"));
        card.appendChild(actions);
      }
      list.appendChild(card);
    });
  }

  function wireApps() {
    var catalog = window.PrivacyApps;
    var filters = $("apps-filters");
    var list = $("apps-list");
    var count = $("apps-count");
    if (!catalog || !filters) {
      if (count) count.textContent = "";
      if (list) {
        list.replaceChildren();
        list.appendChild(node("p", "muted-note", "App notes did not load. Refresh the page. If you are offline, reconnect once so this app can save them."));
      }
      return;
    }

    filters.replaceChildren();
    var allBtn = node("button", "filter-chip active", "All");
    allBtn.type = "button";
    allBtn.setAttribute("aria-pressed", "true");
    allBtn.setAttribute("data-apps-cat", "all");
    filters.appendChild(allBtn);
    var favBtn = node("button", "filter-chip", "Favorites");
    favBtn.type = "button";
    favBtn.setAttribute("aria-pressed", "false");
    favBtn.setAttribute("data-apps-cat", "favorites");
    filters.appendChild(favBtn);
    catalog.CATEGORIES.forEach(function (cat) {
      var btn = node("button", "filter-chip", cat.label);
      btn.type = "button";
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("data-apps-cat", cat.id);
      filters.appendChild(btn);
    });

    filters.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-apps-cat]");
      if (!btn || !filters.contains(btn)) return;
      appsCategory = btn.getAttribute("data-apps-cat") || "all";
      filters.querySelectorAll("[data-apps-cat]").forEach(function (chip) {
        var on = chip.getAttribute("data-apps-cat") === appsCategory;
        chip.classList.toggle("active", on);
        chip.setAttribute("aria-pressed", on ? "true" : "false");
      });
      renderApps();
    });

    var search = $("apps-search");
    if (search) {
      search.addEventListener("input", function () { renderApps(); });
    }
    renderApps();
  }

  function wireTools() {
    var scanPolicy = $("btn-policy-scan");
    if (scanPolicy) scanPolicy.addEventListener("click", renderPolicy);
    var samplePolicy = $("btn-policy-sample");
    if (samplePolicy) samplePolicy.addEventListener("click", function () { loadSample("policy"); });
    var clearPolicy = $("btn-policy-clear");
    if (clearPolicy) {
      clearPolicy.addEventListener("click", function () {
        var input = $("policy-input");
        var out = $("policy-result");
        if (input) input.value = "";
        if (out) { out.hidden = true; out.replaceChildren(); out.classList.remove("result-enter"); }
      });
    }
    var file = $("policy-file");
    if (file) {
      file.addEventListener("change", function () {
        var f = file.files && file.files[0];
        if (!f) return;
        var maxChars = window.PrivacyPolicy.MAX_INPUT || 200000;
        var maxBytes = maxChars * 4;
        var name = String(f.name || "file").replace(/[\r\n]/g, " ").slice(0, 80);
        if (typeof f.size === "number" && f.size > maxBytes) {
          toast("File is too large (limit " + maxChars + " characters)");
          file.value = "";
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          var input = $("policy-input");
          var text = String(reader.result || "");
          if (text.length > maxChars) text = text.slice(0, maxChars);
          if (input) input.value = text;
          renderPolicy();
          toast("Loaded " + name);
        };
        reader.onerror = function () {
          toast("Could not read " + name);
        };
        reader.readAsText(f.slice(0, maxBytes));
        file.value = "";
      });
    }

    var scanHeaders = $("btn-headers-scan");
    if (scanHeaders) scanHeaders.addEventListener("click", renderHeaders);
    var sampleHeaders = $("btn-headers-sample");
    if (sampleHeaders) sampleHeaders.addEventListener("click", function () { loadSample("headers"); });
    var clearHeaders = $("btn-headers-clear");
    if (clearHeaders) {
      clearHeaders.addEventListener("click", function () {
        var input = $("headers-input");
        var out = $("headers-result");
        if (input) input.value = "";
        if (out) { out.hidden = true; out.replaceChildren(); out.classList.remove("result-enter"); }
      });
    }

    var scanUrls = $("btn-urls-scan");
    if (scanUrls) scanUrls.addEventListener("click", renderUrls);
    var sampleUrls = $("btn-urls-sample");
    if (sampleUrls) sampleUrls.addEventListener("click", function () { loadSample("urls"); });
    var scrubBtn = $("btn-urls-scrub");
    if (scrubBtn) scrubBtn.addEventListener("click", scrubUrls);
    var clearUrls = $("btn-urls-clear");
    if (clearUrls) {
      clearUrls.addEventListener("click", function () {
        var input = $("urls-input");
        var out = $("urls-result");
        if (input) input.value = "";
        if (out) { out.hidden = true; out.replaceChildren(); out.classList.remove("result-enter"); }
      });
    }

  }

  function boot() {
    wireTabs();
    wireTools();
    wireApps();
    var tool = toolFromLocation();
    selectTool(tool, true);
    if ((location.hash || "") !== hashFor(tool)) {
      history.replaceState({ tool: tool }, "", location.pathname + location.search + hashFor(tool));
    }

    var status = $("status");
    if (status) {
      status.textContent = "Pasted text is not stored. Theme follows the site Theme control.";
    }

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

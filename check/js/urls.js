/*
 * Local URL / HTTPS checks and tracking-param scrubber.
 */
(function (root) {
  "use strict";

  var TRACKING_PARAMS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
    "fbclid", "gclid", "gclsrc", "dclid", "msclkid", "twclid", "li_fat_id",
    "mc_cid", "mc_eid", "igshid", "yclid", "_hsenc", "_hsmi", "vero_id",
    "spm", "scm"
  ];

  var TRACKING_SET = {};
  TRACKING_PARAMS.forEach(function (p) { TRACKING_SET[p] = true; });

  var SUSPICIOUS_TLD = /\.(?:zip|mov|tk|ml|ga|cf|gq|top|xyz|click|loan|work)$/i;
  var HOMOGLYPH = /[\u0400-\u04FF\u0370-\u03FF]/;
  var MAX_CHARS = 100000;
  var MAX_LINES = 200;
  var DANGER_SCHEME = { javascript: 1, data: 1, vbscript: 1, blob: 1, file: 1 };
  var IPV4_HOST = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

  function bandFromIssues(issues) {
    if ((issues || []).some(function (i) { return i.severity === "danger"; })) return "danger";
    if ((issues || []).some(function (i) { return i.severity === "warn"; })) return "warn";
    return "ok";
  }

  function isTrackingKey(key) {
    var lower = String(key || "").toLowerCase();
    return !!(TRACKING_SET[lower] || lower.indexOf("utm_") === 0);
  }

  function capText(raw) {
    var text = String(raw || "");
    if (text.length <= MAX_CHARS) return { text: text, truncated: false };
    return { text: text.slice(0, MAX_CHARS), truncated: true };
  }

  function isIpHost(hostname) {
    if (!hostname) return false;
    if (hostname.indexOf(":") !== -1) return true;
    return IPV4_HOST.test(hostname);
  }

  function authorityOf(raw) {
    var auth = String(raw || "");
    var schemeSep = auth.indexOf("://");
    if (schemeSep !== -1) auth = auth.slice(schemeSep + 3);
    var slash = auth.search(/[/?#]/);
    if (slash !== -1) auth = auth.slice(0, slash);
    var at = auth.lastIndexOf("@");
    if (at !== -1) auth = auth.slice(at + 1);
    return auth;
  }

  function looksLikeLookalike(raw, hostname) {
    var host = String(hostname || "");
    if (HOMOGLYPH.test(host) || HOMOGLYPH.test(authorityOf(raw))) return true;
    return host.split(".").some(function (label) {
      return label.toLowerCase().indexOf("xn--") === 0;
    });
  }

  function scrubHash(hash) {
    if (!hash || hash === "#") return hash || "";
    var body = hash.charAt(0) === "#" ? hash.slice(1) : hash;
    if (body.indexOf("=") === -1) return hash;
    try {
      var params = new URLSearchParams(body.charAt(0) === "?" ? body.slice(1) : body);
      var changed = false;
      var keys = [];
      params.forEach(function (_v, key) { keys.push(key); });
      keys.forEach(function (key) {
        if (isTrackingKey(key)) {
          params.delete(key);
          changed = true;
        }
      });
      if (!changed) return hash;
      var next = params.toString();
      return next ? "#" + next : "";
    } catch (err) {
      return hash;
    }
  }

  function parseOne(input) {
    var original = String(input || "").trim();
    var issues = [];
    var cleaned = original;
    var url = null;

    if (!original) {
      var emptyIssues = [{ severity: "warn", message: "Empty line." }];
      return {
        original: original,
        ok: false,
        issues: emptyIssues,
        cleaned: "",
        band: bandFromIssues(emptyIssues),
        tracking: []
      };
    }

    var candidate = original;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
      candidate = "https://" + candidate;
      issues.push({ severity: "warn", message: "No scheme — assumed https:// for parsing." });
    }

    try {
      url = new URL(candidate);
    } catch (err) {
      var badIssues = [{ severity: "danger", message: "Not a valid URL." }];
      return {
        original: original,
        ok: false,
        issues: badIssues,
        cleaned: original,
        band: bandFromIssues(badIssues),
        tracking: []
      };
    }

    var scheme = url.protocol.replace(/:$/, "").toLowerCase();
    if (DANGER_SCHEME[scheme]) {
      issues.push({ severity: "danger", message: "Dangerous scheme: " + scheme + ". Not safe to open." });
    } else if (scheme === "http") {
      issues.push({ severity: "danger", message: "Uses http (not https). Traffic can be read or altered." });
    } else if (scheme !== "https" && scheme !== "mailto" && scheme !== "about") {
      issues.push({ severity: "warn", message: "Unusual scheme: " + scheme });
    } else if (scheme === "https") {
      issues.push({ severity: "ok", message: "Uses https." });
    }

    if (url.username || url.password) {
      issues.push({ severity: "danger", message: "Credentials embedded in the URL." });
    }

    if (url.hostname && SUSPICIOUS_TLD.test(url.hostname)) {
      issues.push({ severity: "warn", message: "Hostname uses a frequently abused TLD: " + url.hostname });
    }

    if (isIpHost(url.hostname)) {
      issues.push({ severity: "warn", message: "Hostname is an IP address: " + url.hostname });
    }

    if (looksLikeLookalike(original, url.hostname)) {
      issues.push({ severity: "danger", message: "Hostname contains non-ASCII or punycode (possible lookalike)." });
    }

    var tracking = [];
    if (scheme === "http" || scheme === "https") {
      url.searchParams.forEach(function (_v, key) {
        if (isTrackingKey(key)) tracking.push(key);
      });
      if (tracking.length) {
        issues.push({
          severity: "warn",
          message: "Tracking query params: " + tracking.join(", ")
        });
      }

      var hashBefore = url.hash || "";
      var hashAfter = scrubHash(hashBefore);
      if (hashBefore && hashAfter !== hashBefore) {
        issues.push({
          severity: "warn",
          message: "Tracking params in URL hash were found."
        });
      }

      var scrubbed = new URL(url.href);
      tracking.forEach(function (key) { scrubbed.searchParams.delete(key); });
      scrubbed.username = "";
      scrubbed.password = "";
      scrubbed.hash = hashAfter;
      cleaned = scrubbed.href;
    }

    return {
      original: original,
      href: url.toString(),
      host: url.hostname,
      scheme: scheme,
      issues: issues,
      tracking: tracking,
      cleaned: cleaned,
      band: bandFromIssues(issues),
      ok: true
    };
  }

  function analyse(raw) {
    var capped = capText(raw);
    var lines = capped.text.split(/\r?\n/)
      .map(function (l) { return l.trim(); })
      .filter(Boolean);
    var lineCut = false;
    if (lines.length > MAX_LINES) {
      lines = lines.slice(0, MAX_LINES);
      lineCut = true;
    }
    var truncated = capped.truncated || lineCut;
    var limitNote = " Input truncated to " + MAX_LINES + " lines / " + MAX_CHARS + " characters.";
    if (!lines.length) {
      return {
        items: [],
        summary: "Paste one or more URLs (one per line)." + (truncated ? limitNote : ""),
        band: "ok",
        truncated: truncated
      };
    }
    var items = lines.map(parseOne);
    var danger = items.filter(function (i) { return i.band === "danger"; }).length;
    var warn = items.filter(function (i) { return i.band === "warn"; }).length;
    var band = danger ? "danger" : warn ? "warn" : "ok";
    var summary = "Checked " + items.length + " URL" + (items.length === 1 ? "" : "s") + ".";
    if (danger) summary += " " + danger + " with high-concern issues.";
    else if (warn) summary += " " + warn + " with warnings.";
    if (truncated) summary += limitNote;
    return { items: items, summary: summary, band: band, truncated: truncated };
  }

  function scrub(raw) {
    var capped = capText(raw);
    var lines = capped.text.split(/\r?\n/);
    if (lines.length > MAX_LINES) lines = lines.slice(0, MAX_LINES);
    return lines.map(function (line) {
      if (!line.trim()) return line;
      var r = parseOne(line);
      return r.ok ? r.cleaned : line;
    }).join("\n");
  }

  root.PrivacyUrls = {
    TRACKING_PARAMS: TRACKING_PARAMS,
    MAX_CHARS: MAX_CHARS,
    MAX_LINES: MAX_LINES,
    parseOne: parseOne,
    analyse: analyse,
    scrub: scrub
  };
})(typeof window !== "undefined" ? window : globalThis);

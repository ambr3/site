/*
 * Email header parser — offline string analysis only.
 */
(function (root) {
  "use strict";

  var TRACKING_HOST = /(?:open|click|track|pixel|email)\.?.*\.(?:mailchimp|sendgrid|exacttarget|hubspot|marketo|constantcontact|klaviyo)/i;
  var IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/;
  var PRIVATE_IP = /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|127\.|0\.|169\.254\.)/;
  var MAX_INPUT = 200000;
  var EMAIL_ADDR = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*/i;

  var AUTH_RANK = {
    fail: 5,
    permerror: 5,
    temperror: 5,
    softfail: 4,
    neutral: 3,
    none: 3,
    pass: 1
  };

  function unfold(raw) {
    return String(raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]+/g, " ");
  }

  function parseHeaders(raw) {
    var text = unfold(raw);
    var lines = text.split("\n");
    var headers = [];
    var current = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line === "") {
        if (current) headers.push(current);
        current = null;
        break;
      }
      var m = /^([A-Za-z0-9-]+)\s*:\s*(.*)$/.exec(line);
      if (m) {
        if (current) headers.push(current);
        current = { name: m[1], value: m[2].trim() };
      } else {
        // After unfold, folded continuations are gone. A non-header line is body.
        if (current) headers.push(current);
        current = null;
        break;
      }
    }
    if (current) headers.push(current);
    return headers;
  }

  function getAll(headers, name) {
    var lower = name.toLowerCase();
    return headers.filter(function (h) { return h.name.toLowerCase() === lower; }).map(function (h) { return h.value; });
  }

  function getOne(headers, name) {
    var all = getAll(headers, name);
    return all.length ? all[0] : "";
  }

  function authStatus(value, key) {
    var re = new RegExp("\\b" + key + "\\s*=\\s*([a-z0-9-]+)", "i");
    var m = re.exec(value || "");
    return m ? m[1].toLowerCase() : "";
  }

  function worstAuth(values, key) {
    var worst = "";
    var worstRank = 0;
    (values || []).forEach(function (value) {
      var status = authStatus(value, key);
      if (!status) return;
      var rank = AUTH_RANK[status] || 2;
      if (rank >= worstRank) {
        worstRank = rank;
        worst = status;
      }
    });
    return worst;
  }

  function extractEmail(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    var angle = /<([^>]+)>/.exec(raw);
    var candidate = angle ? angle[1].trim() : raw;
    var m = EMAIL_ADDR.exec(candidate);
    return m ? m[0].toLowerCase() : "";
  }

  function analyse(raw) {
    var source = typeof raw === "string" ? raw : "";
    var truncated = false;
    if (source.length > MAX_INPUT) {
      source = source.slice(0, MAX_INPUT);
      truncated = true;
    }
    var headers = parseHeaders(source);
    if (!headers.length) {
      var emptySummary = "Paste raw email headers to analyse.";
      if (truncated) emptySummary = "Input truncated to " + MAX_INPUT + " characters. " + emptySummary;
      return {
        band: "ok",
        flags: [],
        auth: {},
        received: [],
        truncated: truncated,
        summary: emptySummary
      };
    }

    var flags = [];
    var authHeaders = getAll(headers, "Authentication-Results")
      .concat(getAll(headers, "ARC-Authentication-Results"));
    var auth = {
      spf: worstAuth(authHeaders, "spf"),
      dkim: worstAuth(authHeaders, "dkim"),
      dmarc: worstAuth(authHeaders, "dmarc")
    };

    function noteAuth(kind, status) {
      if (!status) {
        flags.push({
          severity: "warn",
          label: "Missing " + kind.toUpperCase() + " result",
          detail: "No " + kind + "=… found in Authentication-Results."
        });
        return;
      }
      if (status === "fail" || status === "permerror" || status === "temperror") {
        flags.push({
          severity: "danger",
          label: kind.toUpperCase() + " " + status,
          detail: "Authentication-Results reports " + kind + "=" + status + "."
        });
      } else if (status === "softfail" || status === "neutral" || status === "none") {
        flags.push({
          severity: "warn",
          label: kind.toUpperCase() + " " + status,
          detail: "Weak or absent " + kind + " result (" + status + ")."
        });
      }
    }

    if (authHeaders.length) {
      noteAuth("spf", auth.spf);
      noteAuth("dkim", auth.dkim);
      noteAuth("dmarc", auth.dmarc);
    } else {
      flags.push({
        severity: "warn",
        label: "No Authentication-Results",
        detail: "Header set does not include Authentication-Results / ARC-Authentication-Results."
      });
    }

    var received = getAll(headers, "Received");
    var publicIps = [];
    received.forEach(function (line) {
      var ips = line.match(new RegExp(IPV4.source, "g")) || [];
      ips.forEach(function (ip) {
        if (!PRIVATE_IP.test(ip)) publicIps.push(ip);
      });
    });
    if (publicIps.length) {
      flags.push({
        severity: "warn",
        label: "Public IPs in Received chain",
        detail: "Found: " + publicIps.slice(0, 6).join(", ") + (publicIps.length > 6 ? "…" : "") + ". May reveal ISP or path."
      });
    }

    var xOrig = getOne(headers, "X-Originating-IP") || getOne(headers, "X-Sender-IP");
    if (xOrig) {
      flags.push({
        severity: "danger",
        label: "Originating IP header",
        detail: xOrig + " — often the sender’s real network address."
      });
    }

    var userAgent = getOne(headers, "User-Agent") || getOne(headers, "X-Mailer");
    if (userAgent) {
      flags.push({
        severity: "warn",
        label: "Client / MUA revealed",
        detail: userAgent
      });
    }

    var listUnsub = getOne(headers, "List-Unsubscribe");
    if (listUnsub) {
      flags.push({
        severity: "ok",
        label: "List-Unsubscribe present",
        detail: listUnsub.length > 160 ? listUnsub.slice(0, 160) + "…" : listUnsub
      });
    }

    var joined = headers.map(function (h) { return h.name + ": " + h.value; }).join("\n");
    if (TRACKING_HOST.test(joined) || /\/track(?:ing)?\//i.test(joined) || /open\.gif|pixel\.gif/i.test(joined)) {
      flags.push({
        severity: "warn",
        label: "Possible open / click tracking",
        detail: "Headers mention a common ESP tracker host or tracking path."
      });
    }

    var from = getOne(headers, "From");
    var returnPath = getOne(headers, "Return-Path");
    var fromAddr = extractEmail(from);
    var rpAddr = extractEmail(returnPath);
    if (fromAddr && rpAddr && fromAddr !== rpAddr) {
      flags.push({
        severity: "warn",
        label: "From ≠ Return-Path",
        detail: "From " + fromAddr + " vs Return-Path " + rpAddr + "."
      });
    }

    var danger = flags.some(function (f) { return f.severity === "danger"; });
    var warn = flags.some(function (f) { return f.severity === "warn"; });
    var band = danger ? "danger" : warn ? "warn" : "ok";

    var summary = "Parsed " + headers.length + " header fields, " + received.length + " Received hop(s).";
    if (danger) summary += " High-concern signals present.";
    else if (warn) summary += " Some warnings to review.";
    else summary += " No strong leak/auth failures flagged.";
    if (truncated) summary += " Input truncated to " + MAX_INPUT + " characters.";

    return {
      band: band,
      flags: flags,
      auth: auth,
      received: received,
      from: from,
      returnPath: returnPath,
      truncated: truncated,
      summary: summary
    };
  }

  root.PrivacyHeaders = {
    parseHeaders: parseHeaders,
    analyse: analyse,
    extractEmail: extractEmail,
    MAX_INPUT: MAX_INPUT
  };
})(typeof window !== "undefined" ? window : globalThis);

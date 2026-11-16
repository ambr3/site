/*
 * Privacy policy heuristics — pure string matching, no network.
 */
(function (root) {
  "use strict";

  var CLAUSES = [
    {
      id: "sale",
      severity: "danger",
      weight: 4,
      label: "Data sale or sharing for money",
      explain: "The text may allow selling personal data or sharing it for compensation.",
      patterns: [
        /sell(?:s|ing)?\s+(?:your\s+)?(?:personal\s+)?(?:data|information)/i,
        /sale\s+of\s+(?:personal\s+)?(?:data|information)/i,
        /moneti[sz]e\s+(?:your\s+)?(?:data|information)/i
      ]
    },
    {
      id: "partners",
      severity: "warn",
      weight: 2,
      label: "Broad partner / affiliate sharing",
      explain: "Data may be shared with affiliates, partners or a wide set of third parties.",
      patterns: [
        /share[sd]?\s+with\s+(?:our\s+)?(?:affiliates|partners|third[\s-]parties)/i,
        /business\s+partners/i,
        /marketing\s+partners/i
      ]
    },
    {
      id: "service-providers",
      severity: "warn",
      weight: 1,
      label: "Service providers / APIs",
      explain: "Mentions processors or APIs that receive data to run the service.",
      patterns: [
        /service\s+providers?/i,
        /third[\s-]party\s+(?:vendors?|processors?|apis?)/i,
        /cloud\s+(?:providers?|processors?)/i
      ]
    },
    {
      id: "ads-tracking",
      severity: "danger",
      weight: 3,
      label: "Advertising / tracking IDs",
      explain: "Advertising, behavioural targeting or tracking identifiers are mentioned.",
      patterns: [
        /advertising\s+id/i,
        /behavioural\s+advertising|behavioral\s+advertising/i,
        /interest[\s-]based\s+ads?/i,
        /targeted\s+advertising/i,
        /pixel\s+tags?|tracking\s+pixels?/i,
        /device\s+fingerprint/i,
        /fingerprinting/i
      ]
    },
    {
      id: "retention",
      severity: "warn",
      weight: 2,
      label: "Indefinite or vague retention",
      explain: "Retention may be open-ended or only “as long as needed” without a clear limit.",
      patterns: [
        /retain(?:s|ed|ing)?\s+(?:your\s+)?(?:data|information)\s+(?:indefinitely|as\s+long\s+as)/i,
        /keep(?:s|ing)?\s+(?:your\s+)?(?:data|information)\s+(?:indefinitely|for\s+as\s+long)/i,
        /no\s+(?:fixed|specific)\s+retention\s+period/i
      ]
    },
    {
      id: "arbitration",
      severity: "danger",
      weight: 3,
      label: "Arbitration / class-action waiver",
      explain: "Disputes may be forced into arbitration or class actions waived.",
      patterns: [
        /binding\s+arbitration/i,
        /class[\s-]action\s+waiver/i,
        /waive(?:s|r)?\s+(?:your\s+)?right\s+to\s+(?:a\s+)?(?:jury|class)/i
      ]
    },
    {
      id: "change-notice",
      severity: "warn",
      weight: 2,
      label: "Change without notice",
      explain: "The policy may change with little or no individual notice.",
      patterns: [
        /(?:may|can)\s+(?:update|change|modify)\s+(?:this\s+)?(?:policy|notice)\s+(?:at\s+any\s+time|without\s+(?:prior\s+)?notice)/i,
        /without\s+(?:prior\s+)?notice\s+to\s+you/i
      ]
    },
    {
      id: "children",
      severity: "warn",
      weight: 2,
      label: "Children’s data",
      explain: "Children’s or under-13/16 data is discussed — check age gates carefully.",
      patterns: [
        /children(?:'s)?\s+(?:under|personal\s+data|information)/i,
        /under\s+(?:the\s+age\s+of\s+)?(?:13|16)/i,
        /\bcoppa\b/i
      ]
    },
    {
      id: "biometrics",
      severity: "danger",
      weight: 3,
      label: "Biometrics",
      explain: "Biometric identifiers (face, voice, fingerprints) may be collected.",
      patterns: [
        /biometric/i,
        /facial\s+recognition/i,
        /voiceprint/i,
        /fingerprint\s+(?:data|template)/i
      ]
    },
    {
      id: "location",
      severity: "warn",
      weight: 2,
      label: "Precise location",
      explain: "Location or GPS data may be collected.",
      patterns: [
        /precise\s+location/i,
        /gps\s+(?:data|location|coordinates)/i,
        /geolocation/i,
        /location\s+(?:data|information|history)/i
      ]
    },
    {
      id: "sell-ccpa",
      severity: "warn",
      weight: 1,
      label: "“Do not sell” / CCPA framing",
      explain: "Mentions sale definitions under CCPA/CPRA — useful, but still verify opt-outs.",
      patterns: [
        /do\s+not\s+sell\s+(?:or\s+share\s+)?my\s+personal\s+information/i,
        /(?:ccpa|cpra)/i,
        /sell\s+or\s+share\s+personal\s+information/i
      ]
    },
    {
      id: "transfer",
      severity: "warn",
      weight: 2,
      label: "International / third-country transfer",
      explain: "Data may be transferred across borders.",
      patterns: [
        /transfer(?:s|red|ring)?\s+(?:your\s+)?(?:data|information)\s+(?:outside|to\s+(?:other|third)\s+countries)/i,
        /international\s+(?:data\s+)?transfers?/i
      ]
    }
  ];

  function snippetAround(text, index, len) {
    var start = Math.max(0, index - 40);
    var end = Math.min(text.length, index + len + 60);
    var slice = text.slice(start, end).replace(/\s+/g, " ").trim();
    if (start > 0) slice = "…" + slice;
    if (end < text.length) slice = slice + "…";
    return slice;
  }

  /** True when the match sits in a denial / “we do not …” phrase. */
  function isNegated(text, index) {
    var lead = text.slice(Math.max(0, index - 48), index).toLowerCase();
    return /(?:\b(?:do|does|did|will|would|shall|should|can|cannot|could|may|might|must)\s+not\b|\b(?:don't|doesn't|didn't|won't|wouldn't|can't|cannot|couldn't|mustn't|never|without)\b|\bno\s+longer\b)\s*[:\-]?\s*$/i.test(lead)
      || /\bnot\s+$/i.test(lead);
  }

  function findMatch(text, patterns) {
    for (var i = 0; i < patterns.length; i++) {
      var re = patterns[i];
      var flags = re.flags.indexOf("g") === -1 ? re.flags + "g" : re.flags;
      var global = new RegExp(re.source, flags);
      var m;
      while ((m = global.exec(text)) !== null) {
        if (!isNegated(text, m.index)) {
          return m;
        }
        if (m[0].length === 0) global.lastIndex += 1;
      }
    }
    return null;
  }

  var MAX_INPUT = 200000;

  function analyse(raw) {
    var text = typeof raw === "string" ? raw : "";
    var truncated = false;
    if (text.length > MAX_INPUT) {
      text = text.slice(0, MAX_INPUT);
      truncated = true;
    }
    var trimmed = text.trim();
    if (!trimmed) {
      return {
        band: "ok",
        score: 0,
        wordCount: 0,
        hits: [],
        truncated: truncated,
        summary: truncated
          ? "Input truncated to " + MAX_INPUT + " characters, and nothing was left to scan."
          : "Paste a privacy policy to scan."
      };
    }

    var words = trimmed.split(/\s+/).filter(Boolean);
    var wordCount = words.length;
    var hits = [];
    var weightSum = 0;

    CLAUSES.forEach(function (clause) {
      var m = findMatch(trimmed, clause.patterns);
      if (m) {
        hits.push({
          id: clause.id,
          severity: clause.severity,
          label: clause.label,
          explain: clause.explain,
          snippet: snippetAround(trimmed, m.index, m[0].length),
          match: m[0]
        });
        weightSum += clause.weight;
      }
    });

    var density = wordCount > 0 ? weightSum / Math.max(wordCount / 200, 1) : 0;
    var score = Math.min(100, Math.round(density * 12 + weightSum * 4));

    var band = "ok";
    if (score >= 45 || hits.some(function (h) { return h.severity === "danger"; })) band = "danger";
    else if (score >= 20 || hits.length > 0) band = "warn";

    var summaryParts = [];
    if (!hits.length) {
      summaryParts.push("No curated risk patterns matched. That does not mean the policy is fine — read it.");
    } else {
      summaryParts.push("Found " + hits.length + " risk pattern" + (hits.length === 1 ? "" : "s") + ".");
      var danger = hits.filter(function (h) { return h.severity === "danger"; });
      if (danger.length) {
        summaryParts.push("High concern: " + danger.map(function (h) { return h.label; }).join("; ") + ".");
      }
      var warn = hits.filter(function (h) { return h.severity === "warn"; });
      if (warn.length) {
        summaryParts.push("Also noted: " + warn.map(function (h) { return h.label; }).join("; ") + ".");
      }
    }
    if (truncated) summaryParts.push("Input truncated to " + MAX_INPUT + " characters.");

    return {
      band: band,
      score: score,
      wordCount: wordCount,
      hits: hits,
      truncated: truncated,
      summary: summaryParts.join(" ")
    };
  }

  root.PrivacyPolicy = {
    CLAUSES: CLAUSES,
    MAX_INPUT: MAX_INPUT,
    analyse: analyse
  };
})(typeof window !== "undefined" ? window : globalThis);

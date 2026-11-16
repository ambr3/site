/* Run with `node --test test/`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const jsDir = join(here, "..", "js");

function load(file, extra = {}) {
  const source = readFileSync(join(jsDir, file), "utf8");
  const win = { ...extra };
  new Function("window", source)(win);
  return win;
}

/* ------------------------------------------------------------------ policy */

const { PrivacyPolicy } = load("policy.js");

test("policy scan flags data sale language", () => {
  const r = PrivacyPolicy.analyse(
    "We may sell your personal information to third parties for marketing."
  );
  assert.equal(r.band, "danger");
  assert.ok(r.hits.some((h) => h.id === "sale"));
});

test("empty policy returns guidance", () => {
  const r = PrivacyPolicy.analyse("   ");
  assert.equal(r.hits.length, 0);
  assert.match(r.summary, /Paste/);
});

test("clean short text stays low risk when no patterns match", () => {
  const r = PrivacyPolicy.analyse(
    "We collect your email to reply to support tickets and delete it after thirty days."
  );
  assert.equal(r.hits.length, 0);
  assert.equal(r.band, "ok");
});

test("negated sale language is not flagged", () => {
  const r = PrivacyPolicy.analyse(
    "We do not sell your personal information to anyone under any circumstances."
  );
  assert.ok(!r.hits.some((h) => h.id === "sale"));
});

/* ------------------------------------------------------------------ headers */

const { PrivacyHeaders } = load("headers.js");

test("headers parse Authentication-Results failures", () => {
  const raw = [
    "From: alice@example.com",
    "Return-Path: <bounce@mailer.example>",
    "Authentication-Results: mx; spf=fail smtp.mailfrom=example.com; dkim=pass; dmarc=fail",
    "Received: from mail.example ([203.0.113.9]) by mx.example",
    "X-Originating-IP: [198.51.100.4]",
    "",
  ].join("\r\n");
  const r = PrivacyHeaders.analyse(raw);
  assert.equal(r.band, "danger");
  assert.equal(r.auth.spf, "fail");
  assert.ok(r.flags.some((f) => /Originating IP/i.test(f.label)));
});

test("missing auth results is a warning", () => {
  const r = PrivacyHeaders.analyse("From: a@b.test\nSubject: hi\n\n");
  assert.ok(r.flags.some((f) => /No Authentication-Results/i.test(f.label)));
});

test("body after headers without blank line is not folded in", () => {
  const headers = PrivacyHeaders.parseHeaders(
    "From: a@b.test\nSubject: hi\nThis is the body line\n"
  );
  assert.equal(headers.length, 2);
  assert.equal(headers[1].name, "Subject");
  assert.equal(headers[1].value, "hi");
});

test("From display name alone does not false-mismatch Return-Path", () => {
  const r = PrivacyHeaders.analyse(
    "From: Alice\nReturn-Path: <b@example.com>\n\n"
  );
  assert.ok(!r.flags.some((f) => /From ≠ Return-Path/i.test(f.label)));
});

test("worst Authentication-Results across multiple headers wins", () => {
  const raw = [
    "Authentication-Results: mx1; spf=pass; dkim=pass; dmarc=pass",
    "Authentication-Results: mx2; spf=fail; dkim=pass; dmarc=pass",
    "",
  ].join("\n");
  const r = PrivacyHeaders.analyse(raw);
  assert.equal(r.auth.spf, "fail");
  assert.ok(r.flags.some((f) => f.label === "SPF fail"));
});

/* ------------------------------------------------------------------ urls */

const { PrivacyUrls } = load("urls.js");

test("http URLs are flagged as danger", () => {
  const r = PrivacyUrls.analyse("http://example.com/path");
  assert.equal(r.items[0].band, "danger");
  assert.ok(r.items[0].issues.some((i) => /http \(not https\)/i.test(i.message)));
});

test("tracking params are detected and scrubbed", () => {
  const input = "https://example.com/a?utm_source=x&id=1&fbclid=abc";
  const r = PrivacyUrls.parseOne(input);
  assert.ok(r.tracking.includes("utm_source"));
  assert.ok(r.tracking.includes("fbclid"));
  assert.equal(PrivacyUrls.scrub(input), "https://example.com/a?id=1");
});

test("credentials in URL are danger", () => {
  const r = PrivacyUrls.parseOne("https://user:pass@example.com/");
  assert.equal(r.band, "danger");
});

test("invalid URL lowers aggregate band", () => {
  const r = PrivacyUrls.analyse("https://exa mple.com/bad");
  assert.equal(r.band, "danger");
  assert.equal(r.items[0].band, "danger");
  assert.ok(r.items[0].issues.some((i) => /Not a valid URL/i.test(i.message)));
});

test("scrub preserves blank lines", () => {
  const out = PrivacyUrls.scrub("https://a.com/?utm_source=x\n\nhttps://b.com/");
  assert.equal(out, "https://a.com/\n\nhttps://b.com/");
});

test("mailto is not rewritten with an opaque origin", () => {
  const r = PrivacyUrls.parseOne("mailto:a@example.com");
  assert.equal(r.cleaned, "mailto:a@example.com");
  assert.doesNotMatch(r.cleaned, /^null/);
});

test("javascript URLs are danger and are not rewritten", () => {
  const r = PrivacyUrls.parseOne("javascript:alert(1)");
  assert.equal(r.band, "danger");
  assert.equal(r.cleaned, "javascript:alert(1)");
  assert.ok(r.issues.some((i) => /Dangerous scheme: javascript/i.test(i.message)));
});

test("cleaned https URL drops embedded credentials", () => {
  const r = PrivacyUrls.parseOne("https://user:pass@example.com/a?utm_source=x");
  assert.equal(r.band, "danger");
  assert.equal(r.cleaned, "https://example.com/a");
  assert.doesNotMatch(r.cleaned, /pass/);
});

test("punycode and non-ASCII hosts are flagged", () => {
  const puny = PrivacyUrls.parseOne("https://xn--80ak6aa92e.com/");
  assert.equal(puny.band, "danger");
  assert.ok(puny.issues.some((i) => /punycode/i.test(i.message)));
  const host = String.fromCodePoint(0x0430, 0x0440, 0x0440);
  const raw = PrivacyUrls.parseOne("https://" + host + ".example/");
  assert.equal(raw.band, "danger");
});

test("IP hosts are a warning", () => {
  const r = PrivacyUrls.parseOne("https://203.0.113.5/login");
  assert.ok(r.issues.some((i) => /IP address/i.test(i.message)));
  assert.equal(r.band, "warn");
});

test("tracking params in the hash are removed from the cleaned URL", () => {
  const r = PrivacyUrls.parseOne("https://example.com/a#utm_source=x&id=1");
  assert.equal(r.cleaned, "https://example.com/a#id=1");
});

test("huge URL paste does not throw", () => {
  const raw = "https://example.com/?utm_source=x\n".repeat(10000);
  const out = PrivacyUrls.scrub(raw);
  assert.ok(out.length < raw.length);
  const report = PrivacyUrls.analyse(raw);
  assert.equal(report.truncated, true);
  assert.match(report.summary, /truncat/i);
});

test("oversized policy input is truncated", () => {
  const r = PrivacyPolicy.analyse("word ".repeat(PrivacyPolicy.MAX_INPUT));
  assert.match(r.summary, /truncat/i);
  assert.equal(r.truncated, true);
});

test("oversized header input is truncated", () => {
  const r = PrivacyHeaders.analyse("Subject: " + "a".repeat(PrivacyHeaders.MAX_INPUT));
  assert.match(r.summary, /truncat/i);
  assert.equal(r.truncated, true);
});

test("bare CR headers still parse", () => {
  const headers = PrivacyHeaders.parseHeaders("From: a@b.test\rSubject: hi\r\r");
  assert.equal(headers.length, 2);
  assert.equal(headers[0].name, "From");
  assert.equal(headers[1].value, "hi");
});

test("link-local addresses are not called public IPs", () => {
  const r = PrivacyHeaders.analyse("Received: from a ([169.254.1.1]) by b\n\n");
  assert.ok(!r.flags.some((f) => /Public IPs/i.test(f.label)));
});

/* ------------------------------------------------------------------ samples */

const { PrivacySamples } = load("samples.js");

test("try-me samples trip the expected bands", () => {
  const policy = PrivacyPolicy.analyse(PrivacySamples.policy);
  assert.equal(policy.band, "danger");
  assert.ok(policy.hits.some((h) => h.id === "sale"));

  const headers = PrivacyHeaders.analyse(PrivacySamples.headers);
  assert.equal(headers.band, "danger");
  assert.equal(headers.auth.spf, "fail");

  const urls = PrivacyUrls.analyse(PrivacySamples.urls);
  assert.equal(urls.band, "danger");
  assert.ok(urls.items.length >= 3);
});

/* ------------------------------------------------------------------ apps */

const { PrivacyApps } = load("apps.js");

test("apps catalog has https-only outbound links", () => {
  assert.deepEqual(PrivacyApps.validate(), []);
  assert.ok(PrivacyApps.APPS.length >= 20);
  assert.ok(PrivacyApps.APPS.every((a) => a.why && a.good.length && a.bad.length));
  assert.ok(PrivacyApps.APPS.every((a) => !a.sources && !a.more && !a.blurb));
});

test("apps filter by category and search", () => {
  const vpn = PrivacyApps.filterApps({ category: "vpn" });
  assert.ok(vpn.length >= 2);
  assert.ok(vpn.every((a) => a.category === "vpn"));
  const fav = PrivacyApps.filterApps({ query: "personal favorite" });
  ["brave", "ublock-origin", "duckduckgo", "quad9", "mullvad", "signal",
    "bitwarden", "posteo", "magic-earth", "bitwarden-auth", "grapheneos"
  ].forEach((id) => assert.ok(fav.some((a) => a.id === id), id));
  assert.ok(fav.every((a) => a.pick === "Personal favorite"));
  const stores = PrivacyApps.filterApps({ category: "stores" });
  assert.deepEqual(stores.map((a) => a.id), ["play-store", "obtainium", "fdroid"]);
  const byLabel = PrivacyApps.filterApps({ query: "app stores" });
  assert.ok(byLabel.some((a) => a.id === "obtainium"));
  const codes = PrivacyApps.filterApps({ query: "2fa" });
  assert.ok(codes.some((a) => a.id === "bitwarden-auth"));
  const signal = PrivacyApps.filterApps({ query: "signal" });
  assert.ok(signal.some((a) => a.id === "signal"));
  const imap = PrivacyApps.filterApps({ query: "imap" });
  assert.ok(imap.some((a) => a.id === "tuta"));
  assert.ok(imap.some((a) => a.id === "posteo"));
});

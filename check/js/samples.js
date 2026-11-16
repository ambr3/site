/*
 * Local try-me samples. Fake text only — never fetched.
 */
(function (root) {
  "use strict";

  var POLICY =
    "Acme Services Privacy Notice.\n\n" +
    "We may sell your personal information to marketing partners for compensation.\n" +
    "We do not sell your personal information to data brokers in some regions.\n" +
    "We use interest-based ads and may retain your information indefinitely.\n" +
    "Disputes are subject to binding arbitration and a class-action waiver.\n";

  var HEADERS = [
    "From: Alice <alice@example.com>",
    "Return-Path: <bounce@mailer.example>",
    "Authentication-Results: mx; spf=fail smtp.mailfrom=example.com; dkim=pass; dmarc=fail",
    "Received: from mail.example ([203.0.113.9]) by mx.example with ESMTPS",
    "X-Originating-IP: [198.51.100.4]",
    "User-Agent: ExampleMail/1.0",
    ""
  ].join("\r\n");

  var URLS = [
    "https://example.com/a?utm_source=newsletter&id=1&fbclid=abc",
    "http://shop.example/checkout",
    "https://example.com/share#utm_source=x&ref=1",
    "https://203.0.113.5/login"
  ].join("\n");

  root.PrivacySamples = {
    policy: POLICY,
    headers: HEADERS,
    urls: URLS
  };
})(typeof window !== "undefined" ? window : globalThis);

/*
 * Local app notes. Nothing is fetched. A link only backs the sentence beside it.
 */
(function (root) {
  "use strict";

  var CATEGORIES = [
    { id: "browsers", label: "Browsers" },
    { id: "extensions", label: "Extensions" },
    { id: "search", label: "Search" },
    { id: "dns", label: "DNS" },
    { id: "vpn", label: "VPN" },
    { id: "messengers", label: "Messengers" },
    { id: "passwords", label: "Passwords" },
    { id: "email", label: "Email" },
    { id: "maps", label: "Maps" },
    { id: "auth", label: "2FA" },
    { id: "mobile", label: "Mobile" },
    { id: "stores", label: "App stores" }
  ];

  function note(text, href) {
    var item = { text: text };
    if (href) item.href = href;
    return item;
  }

  var APPS = [
    {
      id: "brave",
      name: "Brave",
      category: "browsers",
      pick: "Personal favorite",
      why: "Chromium with tracker blocking turned on. Desktop Chromium isolates sites into separate processes. This is not Tor.",
      platforms: ["Desktop", "iOS", "Android"],
      url: "https://brave.com/",
      good: [
        note("On desktop, Chromium locks each site into its own sandboxed process and stops that process reading another site’s data. On Android, full site-per-process isolation is not the default.", "https://chromium.googlesource.com/chromium/src/+/main/docs/process_model_and_site_isolation.md"),
        note("Shields block trackers and third-party ads by default.", "https://brave.com/shields/")
      ],
      bad: [
        note("Brave’s own write-up says farbling is aimed at mass trackers who will not spend serious effort on one person. A targeted fingerprinter is a different problem.", "https://brave.com/privacy-updates/4-fingerprinting-defenses-2.0/"),
        note("A 2025 paper tested canvas fingerprint defences in the wild, including Brave’s randomisation, and reports successful attacks on those schemes.", "https://dl.acm.org/doi/10.1145/3696410.3714713")
      ]
    },
    {
      id: "firefox",
      name: "Firefox",
      category: "browsers",
      why: "A separate browser engine from Chromium, with cookie jars split by site on desktop. Check the Android isolation note before you treat the phone app as the same.",
      platforms: ["Desktop", "iOS", "Android"],
      url: "https://www.mozilla.org/firefox/",
      good: [
        note("Total Cookie Protection gives each website its own cookie jar, so a cookie set on one site is not shared with other sites. Mozilla’s post says this is the desktop default.", "https://blog.mozilla.org/en/products/firefox/firefox-rolls-out-total-cookie-protection-by-default-to-all-users-worldwide/"),
        note("Firefox’s own site says known trackers are blocked automatically, and that Mozilla does not sell your personal data.", "https://www.mozilla.org/firefox/")
      ],
      bad: [
        note("Chromium’s desktop default puts each site in its own sandboxed process. Firefox’s containment story is weaker than that model, which matters for exploit damage.", "https://chromium.googlesource.com/chromium/src/+/main/docs/process_model_and_site_isolation.md"),
        note("Mozilla’s April 2026 post says website isolation is off in Firefox for Android release, and that Nightly runs a partial version. A later comment on that page says the release experiment was removed in 159.", "https://connect.mozilla.org/t5/discussions/fission-goes-live-on-android-please-share-your-feedback/m-p/137446")
      ]
    },
    {
      id: "mullvad-browser",
      name: "Mullvad Browser",
      category: "browsers",
      why: "Tor Browser’s fingerprint resistance without Tor. Your IP stays visible, and the exploit sandbox is Firefox’s, not Chromium’s.",
      platforms: ["Desktop"],
      url: "https://mullvad.net/browser",
      good: [
        note("The Tor Project builds it from Tor Browser and then removes the Tor network, so the anti-fingerprinting patches stay.", "https://mullvad.net/browser"),
        note("Mullvad’s page says the browser is free and open source with or without the VPN, and that telemetry has been removed.", "https://mullvad.net/browser")
      ],
      bad: [
        note("The Tor network is removed, so this browser does not hide your IP by itself. Without a VPN, sites see your address.", "https://mullvad.net/browser"),
        note("The browser is built from Tor Browser’s Firefox base, not Chromium’s site-isolation model.")
      ]
    },
    {
      id: "tor-browser",
      name: "Tor Browser",
      category: "browsers",
      why: "Hides your IP and tries to make users look the same. That anonymity goal fights against having the most locked-down browser.",
      platforms: ["Desktop", "Android"],
      url: "https://www.torproject.org/download/",
      good: [
        note("Relays hide your home IP from the site, and hide the site name from your ISP. HTTPS is still required so the exit cannot read the page.", "https://support.torproject.org/about-tor/security/https-encryption-and-tor/"),
        note("Tor Browser tries to shrink how unique each user looks, including letterboxing window size. It does not claim every user is identical.", "https://support.torproject.org/tor-browser/features/fingerprinting-protections/")
      ],
      bad: [
        note("It is Firefox ESR plus patches, not Chromium. ESR’s normal updates cover high-impact fixes; Tor says they also backport other fixes they judge necessary, which is not the same as running current Firefox.", "https://forum.torproject.org/t/are-esrs-moderate-and-low-risk-vulnerabilities-fixed-in-tbb/13933"),
        note("Only this browser’s traffic enters Tor. Another app on the device still uses your normal connection.", "https://support.torproject.org/tor-browser/security/using-tb-safely/")
      ]
    },
    {
      id: "safari",
      name: "Safari",
      category: "browsers",
      why: "A strong default against cross-site cookies on Apple devices. For a targeted attacker, turn on Lockdown Mode rather than assuming everyday Safari is the hardest browser to exploit.",
      platforms: ["macOS", "iOS"],
      url: "https://www.apple.com/safari/",
      good: [
        note("This 2020 WebKit post says Intelligent Tracking Prevention blocks third-party cookies by default, and deletes a site’s script-writable storage after seven days without a visit.", "https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/"),
        note("Lockdown Mode is optional and off unless you turn it on. Apple describes it as extreme protection for people who may be personally targeted, and it limits complex web technologies.", "https://support.apple.com/en-us/105120")
      ],
      bad: [
        note("App Store rule 2.5.6 requires browsers to use WebKit. A developer can apply for an entitlement to ship another engine in the EU and Japan.", "https://developer.apple.com/app-store/review/guidelines/"),
        note("iCloud can sync history and tabs to Apple. That copy leaves the device.")
      ]
    },
    {
      id: "ublock-origin",
      name: "uBlock Origin",
      category: "extensions",
      pick: "Personal favorite",
      why: "The blocker to add on Firefox. On Chrome it had to become a weaker extension because of Manifest V3.",
      platforms: ["Extension"],
      url: "https://ublockorigin.com/",
      good: [
        note("It blocks ads and trackers with public lists, including EasyList and EasyPrivacy.", "https://github.com/gorhill/uBlock"),
        note("The project says it works best on Firefox and is still on Firefox Add-ons. The Chrome Web Store copy was removed on 31 August 2026.", "https://github.com/gorhill/uBlock")
      ],
      bad: [
        note("The Chrome Web Store copy of uBlock Origin was removed on 31 August 2026. Full uBlock Origin is aimed at Firefox.", "https://github.com/gorhill/uBlock"),
        note("On Chromium, uBlock Origin Lite is the Manifest V3 build. Its FAQ says filter lists update only when the extension updates, and that dynamic filtering and several other full-uBlock capabilities cannot be ported.", "https://github.com/uBlockOrigin/uBOL-home/wiki/Frequently-asked-questions-(FAQ)")
      ]
    },
    {
      id: "duckduckgo",
      name: "DuckDuckGo",
      category: "search",
      pick: "Personal favorite",
      why: "A simple switch off Google when you want searches that are not tied to a profile of you.",
      platforms: ["Web"],
      url: "https://duckduckgo.com/",
      good: [
        note("DuckDuckGo says it does not save or share your search history, including with Microsoft.", "https://duckduckgo.com/duckduckgo-help-pages/misconceptions/does-duckduckgo-share-my-search-history-with-microsoft"),
        note("No account is required to search.")
      ],
      bad: [
        note("In August 2022 TechCrunch reported that a Microsoft bat.bing.com script was allowed to load on an advertiser’s site after a DuckDuckGo ad click, and was blocked in other cases.", "https://techcrunch.com/2022/08/05/duckduckgo-microsoft-tracking-scripts/"),
        note("Search still goes through DuckDuckGo’s servers. You are trusting that company with the queries, even if it says it does not keep a history.")
      ]
    },
    {
      id: "brave-search",
      name: "Brave Search",
      category: "search",
      why: "Use it when you want a search index that is not Google’s or Bing’s.",
      platforms: ["Web"],
      url: "https://search.brave.com/",
      good: [
        note("Brave says search results come from an index it built itself.", "https://brave.com/search/"),
        note("You can search without turning on Brave Rewards.")
      ],
      bad: [
        note("Coverage is still thinner than Google on obscure queries, so you may fall back to another engine anyway."),
        note("Brave Search is run by the same company as the Brave browser. A Rewards upsell lives in that browser, not on the search page alone.", "https://brave.com/brave-rewards/")
      ]
    },
    {
      id: "quad9",
      name: "Quad9",
      category: "dns",
      pick: "Personal favorite",
      why: "Encrypted DNS with malware blocking when you do not want an account or a filter you have to tune.",
      platforms: ["Network"],
      url: "https://quad9.net/",
      good: [
        note("No signup. Quad9 says it does not record IP addresses or other identifiers that pick out a user.", "https://quad9.net/privacy/policy/"),
        note("The default resolver refuses domains they class as malware, which cuts off a lot of bad links.")
      ],
      bad: [
        note("Quad9 still sees every domain name you resolve. Encrypted DNS only hides those names from your network path, not from the resolver.", "https://support.mozilla.org/en-US/kb/firefox-dns-over-https"),
        note("DNS does not hide the servers you connect to afterwards. Your ISP still sees those IP addresses.")
      ]
    },
    {
      id: "nextdns",
      name: "NextDNS",
      category: "dns",
      why: "Pick this when you want your own blocklists on every device, and you will actually check the log setting.",
      platforms: ["Network"],
      url: "https://nextdns.io/",
      good: [
        note("Queries are discarded after the answer unless you turn logging on. You choose what is kept and for how long.", "https://nextdns.io/privacy"),
        note("Blocklists are per configuration, so a phone and a laptop can follow the same rules.")
      ],
      bad: [
        note("If you turn logging on, query history sits with NextDNS for the retention you set. That is optional, but it is still a log outside your device.", "https://nextdns.io/privacy"),
        note("The free plan stops filtering after a monthly query cap, so a busy home can silently lose the blocklists.")
      ]
    },
    {
      id: "adguard-dns",
      name: "AdGuard DNS",
      category: "dns",
      why: "A no-install way to block ads and trackers for a whole network.",
      platforms: ["Network"],
      url: "https://adguard-dns.io/",
      good: [
        note("The public resolvers do not require an account. AdGuard says that mode does not process personal data.", "https://adguard-dns.io/en/privacy.html"),
        note("Default servers block domains they class as ads, trackers, or malware.", "https://adguard-dns.io/en/privacy.html")
      ],
      bad: [
        note("They keep an anonymous database of domains requested in the last 24 hours, with nothing that links a name to a person, to spot new trackers and threats.", "https://adguard-dns.io/en/privacy.html"),
        note("Private AdGuard DNS stores query logs on your account unless you turn that off.", "https://adguard-dns.io/en/privacy.html")
      ]
    },
    {
      id: "proton-vpn",
      name: "Proton VPN",
      category: "vpn",
      why: "A usable VPN with a free tier and open-source apps, if you already accept a Proton account.",
      platforms: ["Desktop", "iOS", "Android"],
      url: "https://protonvpn.com/",
      good: [
        note("Proton says Swiss law treats the VPN differently from mail: the VPN cannot be compelled to log user data, while a binding order can make Mail collect account information such as an IP. Message contents stay encrypted.", "https://proton.me/blog/climate-activist-arrest"),
        note("There is a free tier, so you can try it without paying.")
      ],
      bad: [
        note("You need a Proton account. The provider still sees that your account connected, even when Swiss law cannot compel VPN traffic logs.", "https://proton.me/blog/climate-activist-arrest"),
        note("A VPN hides your IP from websites. It does not make you anonymous.")
      ]
    },
    {
      id: "mullvad",
      name: "Mullvad VPN",
      category: "vpn",
      pick: "Personal favorite",
      why: "The VPN to pick when you do not want an email address on the account at all.",
      platforms: ["Desktop", "iOS", "Android"],
      url: "https://mullvad.net/",
      good: [
        note("You get a number, not a name or email. Mullvad says it stores no traffic, DNS, connection, or IP logs.", "https://mullvad.net/en/help/no-logging-data-policy"),
        note("Cure53’s December 2020 infrastructure audit, published January 2021, found no personal data attached to end users.", "https://mullvad.net/en/blog/no-pii-or-privacy-leaks-found-cure53s-infrastructure-audit")
      ],
      bad: [
        note("That 2020 review also found six vulnerabilities, including high-severity ones. Mullvad said some fixes were already in place, others would follow testing, and one low-severity issue was deferred.", "https://mullvad.net/en/blog/no-pii-or-privacy-leaks-found-cure53s-infrastructure-audit"),
        note("A VPN still sees that your account connected. Paying by card can identify you; cash or other anonymous payment does not fix that for every payment method.")
      ]
    },
    {
      id: "ivpn",
      name: "IVPN",
      category: "vpn",
      why: "A small paid VPN in the same “no email, no traffic logs” camp as Mullvad.",
      platforms: ["Desktop", "iOS", "Android"],
      url: "https://www.ivpn.net/",
      good: [
        note("Signup asks for no name or email. The policy says they do not log traffic, DNS, bandwidth, IPs, or connection times.", "https://www.ivpn.net/en/privacy/"),
        note("IVPN says it is registered in Gibraltar, and that its GDPR regulator is the Gibraltar Regulatory Authority.", "https://www.ivpn.net/en/privacy/")
      ],
      bad: [
        note("No free tier. You are trusting a smaller staff and a smaller server list than the largest VPNs."),
        note("Same limit as any VPN: the provider sees that your account connected, and websites only see the VPN’s IP.")
      ]
    },
    {
      id: "signal",
      name: "Signal",
      category: "messengers",
      pick: "Personal favorite",
      why: "The default private messenger when the other person will actually install it.",
      platforms: ["Desktop", "iOS", "Android"],
      url: "https://signal.org/",
      good: [
        note("Message contents use the Signal protocol. Sealed sender encrypts the sender identity so the server is not given a normal from address.", "https://signal.org/blog/sealed-sender/"),
        note("Usernames let other people start a chat without you showing your number. That does not delete the number from the account.", "https://signal.org/blog/phone-number-privacy-usernames/")
      ],
      bad: [
        note("Registration still needs a phone number that can receive an SMS or a call.", "https://support.signal.org/hc/en-us/articles/360007318691-Register-a-phone-number"),
        note("Sealed sender hides the sender, not the destination. The server still receives the recipient’s delivery token, and still has to know where to deliver the message.", "https://signal.org/blog/sealed-sender/")
      ]
    },
    {
      id: "simplex",
      name: "SimpleX Chat",
      category: "messengers",
      why: "Use it when you do not want a phone number, username, or any other account id.",
      platforms: ["Desktop", "iOS", "Android"],
      url: "https://simplex.chat/",
      good: [
        note("There are no user IDs, not even random numbers that identify you. You connect by sharing a link or QR.", "https://simplex.chat/privacy/"),
        note("Relays cannot read messages. The app uses a double-ratchet, and relays do not host accounts.", "https://simplex.chat/privacy/")
      ],
      bad: [
        note("Trail of Bits’ July 2024 design review found no critical issues, three medium issues, and one low issue. SimpleX says three were improved in version 6.1 and the rest were accepted.", "https://simplex.chat/blog/20241014-simplex-network-v6-1-security-review-better-calls-user-experience.html"),
        note("SimpleX’s write-up of that review says the medium findings include traffic correlation, easier correlation if TLS is broken, and a case where a modified local database is a problem after the device is compromised.", "https://simplex.chat/blog/20241014-simplex-network-v6-1-security-review-better-calls-user-experience.html")
      ]
    },
    {
      id: "briar",
      name: "Briar",
      category: "messengers",
      why: "For people who may lose the internet and still need to message someone nearby, or over Tor.",
      platforms: ["Desktop", "Android"],
      url: "https://briarproject.org/",
      good: [
        note("Contacts sync over Tor, or directly by Wi‑Fi or Bluetooth when you are near each other. There is no home server.", "https://briarproject.org/how-it-works/"),
        note("Adding someone is a deliberate exchange, not a phone-number lookup.")
      ],
      bad: [
        note("Both people need Briar running. It will not reach contacts who stay on ordinary messengers.", "https://briarproject.org/how-it-works/"),
        note("Desktop builds lag the Android app, and the network of users is small.")
      ]
    },
    {
      id: "bitwarden",
      name: "Bitwarden",
      category: "passwords",
      pick: "Personal favorite",
      why: "A synced password manager when you want open-source apps and a vault you can open on every device.",
      platforms: ["Desktop", "iOS", "Android", "Web"],
      url: "https://bitwarden.com/",
      good: [
        note("The vault is encrypted on your device before it is stored. Bitwarden’s servers hold ciphertext.", "https://bitwarden.com/help/data-storage/"),
        note("Bitwarden regularly commissions third-party audits, including annual source-code reviews and penetration tests.", "https://bitwarden.com/help/is-bitwarden-audited/")
      ],
      bad: [
        note("A synced vault means an encrypted copy sits on Bitwarden’s hosted Azure storage. Bitwarden says it cannot read the vault, but that cloud copy still exists.", "https://bitwarden.com/help/data-storage/"),
        note("Cure53’s 2023 extension test found autofill could put a password on the wrong origin, including a high-severity public-suffix bug. The report says both were fixed after the test — autofill remains a high-value attack surface.", "https://assets.ctfassets.net/7rncvj1f8mw7/4X0rKCkFkWcPg86PUV3cRn/7277e4651464e0a8efd21d9fcf83d296/2023_Bitwarden_Browser_Extension_Security_Assessment_Report.pdf")
      ]
    },
    {
      id: "keepassxc",
      name: "KeePassXC",
      category: "passwords",
      why: "Use it when the password database should be a file you hold, not an account with a company.",
      platforms: ["Desktop"],
      url: "https://keepassxc.org/",
      good: [
        note("The 2023 review of KeePassXC 2.7.4 says a strong passphrase and the latest file format give solid confidentiality against an untrusted cloud provider, and that arbitrary edits fail the authenticity check.", "https://keepassxc.org/assets/pdf/KeePassXC-Review-V1-Molotnikov.pdf"),
        note("KeePassXC 2.7.9 on Windows 10 holds ANSSI certificate ANSSI-CSPN-2025/16, valid until 17 November 2028. The page says each review is bound to that version and platform.", "https://keepassxc.org/audits/")
      ],
      bad: [
        note("That 2023 review also says an older copy of the database can be put back without detection, and that the provider can still learn approximate sizes. Browser integration, auto-type, and TOTP were outside the review.", "https://keepassxc.org/assets/pdf/KeePassXC-Review-V1-Molotnikov.pdf"),
        note("The maintainer says a very weak password is the cloud-sync risk that matters, and that if you raise the password you should delete the provider’s old copies.", "https://github.com/keepassxreboot/keepassxc/issues/7396")
      ]
    },
    {
      id: "proton-pass",
      name: "Proton Pass",
      category: "passwords",
      why: "A synced vault from Proton, including hide-my-email aliases, if you already use their account.",
      platforms: ["Desktop", "iOS", "Android", "Web"],
      url: "https://proton.me/pass",
      good: [
        note("Usernames, passwords, and item metadata are end-to-end encrypted. Proton says it cannot read them.", "https://proton.me/pass/security"),
        note("Apps are open source, with a public audit of the clients.", "https://proton.me/business/blog/proton-pass-audit-2026")
      ],
      bad: [
        note("The vault sits on a Proton account, so mail and the password vault share one login identity.", "https://proton.me/pass/security"),
        note("It is younger than Bitwarden or KeePassXC, and recovery still depends on that Proton account.")
      ]
    },
    {
      id: "proton-mail",
      name: "Proton Mail",
      category: "email",
      why: "Encrypted mail that normal people will actually switch to, with apps and a free tier.",
      platforms: ["Web", "iOS", "Android"],
      url: "https://proton.me/mail",
      good: [
        note("Proton says its encryption could not be bypassed in that case, so emails, attachments, calendars, and files were not handed over.", "https://proton.me/blog/climate-activist-arrest"),
        note("There is an onion site if you want to reach the web app over Tor.", "https://proton.me/blog/climate-activist-arrest")
      ],
      bad: [
        note("In 2021 Proton received a binding Swiss order it says it could not appeal, and it says Swiss law can compel it to log an account’s IP. The same page’s October 2021 update says a later ruling exempted email from some of those handover duties.", "https://proton.me/blog/climate-activist-arrest"),
        note("Using a normal desktop mail app needs Proton Bridge, which is a paid feature.")
      ]
    },
    {
      id: "tuta",
      name: "Tuta",
      category: "email",
      why: "Pick Tuta when you want the subject line encrypted too, and you can live inside their apps.",
      platforms: ["Web", "iOS", "Android"],
      url: "https://tuta.com/",
      good: [
        note("Bodies, subjects, contacts, and calendars are encrypted. Tuta does not use PGP, so subjects are covered too.", "https://tuta.com/security"),
        note("They say they do not log IP addresses on login or send, and signup does not ask for a phone number.", "https://tuta.com/security")
      ],
      bad: [
        note("No IMAP. Tuta says a normal mail app would need the decrypted mail.", "https://tuta.com/security"),
        note("Tuta says it does not use PGP, and that forward secrecy is only planned.", "https://tuta.com/security")
      ]
    },
    {
      id: "posteo",
      name: "Posteo",
      category: "email",
      pick: "Personal favorite",
      why: "A paid German mailbox with no ads, anonymous signup, and real IMAP — not a zero-knowledge vault.",
      platforms: ["Web"],
      url: "https://posteo.de/en",
      good: [
        note("You can sign up without a name. Payment data is kept separate from the mailbox, and sent mail has your IP stripped.", "https://posteo.de/en/site/privacy"),
        note("IMAP and POP3 work with any mail app, over TLS.", "https://posteo.de/en/site/featurelist")
      ],
      bad: [
        note("End-to-end encryption is not the default. Optional storage encryption still happens after mail reaches Posteo, which they say is not a substitute. OpenPGP in the webmail uses Mailvelope.", "https://posteo.de/en/site/encryption"),
        note("It is paid only, about one euro a month, and there is no big mobile suite like Proton or Tuta.")
      ]
    },
    {
      id: "magic-earth",
      name: "Magic Earth",
      category: "maps",
      pick: "Personal favorite",
      why: "Turn-by-turn maps with offline navigation. This is the Magic Earth app.",
      platforms: ["iOS", "Android"],
      url: "https://www.magicearth.com/",
      good: [
        note("Magic Earth says it does not collect your personal data, does not track your movements, does not profile you, and does not sell your information.", "https://www.magicearth.com/"),
        note("Their data list says that when the device is offline, routing, search, and navigation run on the downloaded maps and no request is sent.", "https://www.magicearth.com/cms-uploads/Magic_Earth_User_Data_Privacy_20261022_79d022f834.pdf")
      ],
      bad: [
        note("That list says an online routing request can include the waypoint coordinates and, on a recalculation, the current GPS position. The request is held for 80 days.", "https://www.magicearth.com/cms-uploads/Magic_Earth_User_Data_Privacy_20261022_79d022f834.pdf"),
        note("The same list says live traffic can upload a GPS sample automatically while the device is mounted in a vehicle, at most once every 5 seconds. The server copy is kept about 60 seconds.", "https://www.magicearth.com/cms-uploads/Magic_Earth_User_Data_Privacy_20261022_79d022f834.pdf")
      ]
    },
    {
      id: "organic-maps",
      name: "Organic Maps",
      category: "maps",
      why: "Offline maps when you do not want a location history sitting with a maps company.",
      platforms: ["iOS", "Android"],
      url: "https://organicmaps.app/",
      good: [
        note("The project says it collects no location, statistics, or personal data, and ships no ads.", "https://organicmaps.app/privacy/"),
        note("Maps are downloaded and work with no account.")
      ],
      bad: [
        note("No live traffic, satellite, or street view. That is the trade for not phoning a data broker."),
        note("Search and routing quality depend on OpenStreetMap coverage where you are.")
      ]
    },
    {
      id: "osmand",
      name: "OsmAnd",
      category: "maps",
      why: "The fuller offline map app when Organic Maps is too bare and you will check its identifiers.",
      platforms: ["Android", "iOS"],
      url: "https://osmand.net/",
      good: [
        note("Turn-by-turn navigation works offline from OpenStreetMap data, with no Google account.", "https://osmand.net/"),
        note("On Android you can stop the app sending its install id with map downloads.")
      ],
      bad: [
        note("Each install gets an id that rotates every three months and is sent when you download maps, unless you turn that off on Android.", "https://www.privacyguides.org/en/maps/#osmand"),
        note("The iOS app has no switch for that id, and anonymous stats are on by default there.", "https://www.privacyguides.org/en/maps/#osmand")
      ]
    },
    {
      id: "bitwarden-auth",
      name: "Bitwarden codes",
      category: "auth",
      pick: "Personal favorite",
      why: "Verification codes inside the Bitwarden vault, so the second factor sits with the password.",
      platforms: ["Desktop", "iOS", "Android", "Web"],
      url: "https://bitwarden.com/help/integrated-authenticator/",
      good: [
        note("Bitwarden says Password Manager includes an authenticator that generates the six-digit codes in the vault. Storing the keys is available on every account.", "https://bitwarden.com/help/integrated-authenticator/"),
        note("The same page says those codes stay available while you are logged in, including when the device is offline.", "https://bitwarden.com/help/integrated-authenticator/")
      ],
      bad: [
        note("Generating the codes needs Premium or a paid organization membership. Storing the keys does not.", "https://bitwarden.com/help/integrated-authenticator/"),
        note("The password and the second factor are in the same vault. Unlocking it opens both.")
      ]
    },
    {
      id: "ente-auth",
      name: "Ente Auth",
      category: "auth",
      why: "A 2FA app with encrypted backup when losing a phone should not lock you out.",
      platforms: ["iOS", "Android", "Desktop"],
      url: "https://ente.io/auth",
      good: [
        note("Ente Auth can be used with no account and no backups, or with end-to-end encrypted backups that sync codes across devices.", "https://ente.io/auth"),
        note("The clients are open source, so the encryption is not a closed box.", "https://github.com/ente-io/ente")
      ],
      bad: [
        note("Cloud backup means an Ente account. That account is a new identity tied to your second factors."),
        note("A backup of every login code is a high-value target if the vault password is weak or reused.")
      ]
    },
    {
      id: "aegis",
      name: "Aegis Authenticator",
      category: "auth",
      why: "Android-only 2FA that never needs an account.",
      platforms: ["Android"],
      url: "https://getaegis.app/",
      good: [
        note("Aegis keeps codes in an AES-256-GCM vault on Android, unlocked with a password or biometrics.", "https://github.com/beemdevelopment/Aegis"),
        note("The vault can be exported as plaintext or as an encrypted file.", "https://github.com/beemdevelopment/Aegis")
      ],
      bad: [
        note("No iPhone or desktop app. If you lose the phone and the backup file, the codes are gone."),
        note("The backup file is the keys to every account. Store it like a password database, not in chat.")
      ]
    },
    {
      id: "grapheneos",
      name: "GrapheneOS",
      category: "mobile",
      pick: "Personal favorite",
      why: "The hardened Android OS for listed Pixels today, with official support coming for the Motorola Signature 27.",
      platforms: ["Pixel", "Moto Signature 27"],
      url: "https://grapheneos.org/",
      good: [
        note("It hardens Android itself: memory safety, exploit mitigations, and tighter app sandboxing.", "https://grapheneos.org/features"),
        note("Google Play is optional and, if you install it, runs as a normal sandboxed app rather than as the system.", "https://grapheneos.org/features#sandboxed-google-play"),
        note("GrapheneOS says the Play Store app is the most secure way to install and update apps from the Play Store.", "https://grapheneos.org/usage#sandboxed-google-play"),
        note("GrapheneOS says the Motorola Signature 27 will be its first Motorola phone, and that official support is still upcoming. They say the phone meets their security requirements.", "https://grapheneos.social/@GrapheneOS/117570913006181046")
      ],
      bad: [
        note("The FAQ’s current production list is Pixel phones and the Pixel Tablet. Other devices can be built from source, which the FAQ says is not the same as a secure official device.", "https://grapheneos.org/faq"),
        note("Apps can still talk to the network. This is not a switch that makes every app private, and some apps detect the OS.")
      ]
    },
    {
      id: "play-store",
      name: "Play Store",
      category: "stores",
      why: "On GrapheneOS, use the sandboxed Play Store for apps that come from Play.",
      platforms: ["Android"],
      url: "https://grapheneos.org/usage#sandboxed-google-play",
      good: [
        note("GrapheneOS says the Play Store app is the most secure way to install and update apps from the Play Store.", "https://grapheneos.org/usage#sandboxed-google-play"),
        note("GrapheneOS says you authorize Play as an app source and consent to each install. After that, Play can apply automatic updates for apps it installed.", "https://grapheneos.org/usage#sandboxed-google-play")
      ],
      bad: [
        note("The same guide says the Play Store requires a signed-in account before it will install apps.", "https://grapheneos.org/usage#sandboxed-google-play"),
        note("You are still installing from Google’s store and trusting Google’s packaging for those apps, even when Play is sandboxed on GrapheneOS.")
      ]
    },
    {
      id: "obtainium",
      name: "Obtainium",
      category: "stores",
      why: "The better install when the developer publishes the Android build themselves. You track their repo, not a store that signs a different copy.",
      platforms: ["Android"],
      url: "https://github.com/ImranR98/Obtainium",
      good: [
        note("Updates come from the upstream you choose, such as a GitHub release or a developer site, without a store login.", "https://github.com/ImranR98/Obtainium"),
        note("Obtainium installs and updates apps from release pages you choose, such as GitHub or a page that links to APKs.", "https://github.com/ImranR98/Obtainium")
      ],
      bad: [
        note("You have to confirm you are tracking the real project, not a lookalike repo."),
        note("Obtainium does not review the APK for you. A bad release page becomes a bad install.")
      ]
    },
    {
      id: "fdroid",
      name: "F-Droid",
      category: "stores",
      why: "A catalogue of free Android apps. When the developer publishes their own build, that release is the better install.",
      platforms: ["Android"],
      url: "https://f-droid.org/",
      good: [
        note("F-Droid says that after it verifies a reproducible build, it can publish the developer-signed APK in the official repository.", "https://f-droid.org/docs/FAQ_-_App_Developers/"),
        note("The security model says the official client uses the developer’s own signature as the default for a fresh install.", "https://f-droid.org/docs/Security_Model/")
      ],
      bad: [
        note("The developer FAQ says packages that are not set up for reproducible builds are signed with an F-Droid key. That signature does not match the developer’s own APK.", "https://f-droid.org/docs/FAQ_-_App_Developers/"),
        note("Android will not update one of those signatures over the other in place. Switching means uninstalling, which deletes the app’s private data.", "https://f-droid.org/docs/FAQ_-_App_Developers/")
      ]
    }
  ];

  function isHttpsUrl(value) {
    try {
      var u = new URL(String(value || ""));
      return u.protocol === "https:";
    } catch (err) {
      return false;
    }
  }

  function pointsOf(app) {
    return (app.good || []).concat(app.bad || []);
  }

  function filterApps(opts) {
    var category = opts && opts.category ? String(opts.category) : "all";
    var query = opts && opts.query ? String(opts.query).trim().toLowerCase() : "";
    return APPS.filter(function (app) {
      if (category !== "all" && app.category !== category) return false;
      if (!query) return true;
      var cat = CATEGORIES.find(function (c) { return c.id === app.category; });
      var bits = [app.name, app.why, app.pick, cat && cat.label].concat(app.platforms || []);
      pointsOf(app).forEach(function (item) { bits.push(item.text); });
      return bits.join(" ").toLowerCase().indexOf(query) !== -1;
    });
  }

  function validate() {
    var bad = [];
    var seen = {};
    var known = {};
    CATEGORIES.forEach(function (c) { known[c.id] = true; });
    APPS.forEach(function (app) {
      if (!app.id || seen[app.id]) bad.push((app.id || "app") + ":id");
      if (app.id) seen[app.id] = true;
      if (!known[app.category]) bad.push((app.id || "app") + ":category");
      if (!app.why || !(app.good && app.good.length) || !(app.bad && app.bad.length)) {
        bad.push(app.id + ":notes");
      }
      if (!isHttpsUrl(app.url)) bad.push(app.id + ":url");
      pointsOf(app).forEach(function (item, i) {
        if (item.href && !isHttpsUrl(item.href)) bad.push(app.id + ":href:" + i);
      });
    });
    return bad;
  }

  root.PrivacyApps = {
    CATEGORIES: CATEGORIES,
    APPS: APPS,
    filterApps: filterApps,
    isHttpsUrl: isHttpsUrl,
    validate: validate
  };
})(typeof window !== "undefined" ? window : globalThis);

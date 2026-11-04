# Changelog

All notable changes to **SeclusaSite**.

## 15.9 — 2026-11-04

### Changed
- Seclusa Privacy store tile is Coming soon (no Open / Source links while the app stays private)
- Asset and service-worker cache version 15.9

## 15.8 — 2026-11-04

### Added
- Seclusa Privacy store tile (Open → `ambr3.github.io/privacy-check/`, Source → `ambr3/privacy-check`)

### Changed
- Privacy notice covers the Privacy toolkit app
- Asset and service-worker cache version 15.8

## 15.7 — 2026-11-04

### Added
- Seclusa Convert store tile (Open → `ambr3.github.io/unit-convert/`, Source → `ambr3/unit-convert`)

### Changed
- Privacy notice lists Convert with the other local-only apps
- Asset and service-worker cache version 15.7

## 15.6 — 2026-11-02

### Changed
- Notes and Calendar store tiles use their new distinct app icons (document / calendar), replacing the shared mark
- Store tile versions synced: Notes 0.2.7, Calendar 0.3.4, Games 0.1.29, BP 0.1.6
- Asset and service-worker cache version 15.6

## 15.5 — 2026-11-02

### Fixed
- Service worker `cacheable()` now matches `?v=` stamps (`URL.search` includes the leading `?`)
- Store tile versions synced to current apps: Weather 0.7.9, Notes 0.2.5, Calendar 0.3.2, Games 0.1.28, BP 0.1.5
- Canonical, sitemap, robots, OG and feed URLs use `ambr3.github.io/site/` to match GitHub repo `ambr3/site`
- `apps/` redirect page now has the same CSP and referrer policy as other pages
- Removed unused global `a` / `s` keyboard shortcuts

### Changed
- Asset and service-worker cache version 15.5
- Removed Seclusa Shopping List from the site (app retired)
- Added `scripts/check.sh` for version, URL and SW consistency checks

## 15.2 — 2026-10-26

### Changed
- Seclusa BP 0.1.2: manifest `id`/`lang`/`categories`, stricter service worker install, update checks bypass the HTTP cache

## 15.1 — 2026-10-25

### Fixed
- Bump Seclusa BP cache version to 0.1.1 to invalidate stale mobile cache

## 15.0 — 2026-10-25

### Changed
- Bump asset version to 15.0

## 14.9 — 2026-10-25

### Fixed
- Sync mobile installability check artifacts for blood-pressure and shopping-list

## 14.8 — 2026-10-25

### Fixed
- Seclusa Games: restore launcher scrolling in mobile portrait (0.1.18)

## 14.7 — 2026-10-25

### Fixed
- Seclusa BP (blood-pressure): X-Frame-Options/SRI hardening and A+ HTTP Observatory score
- Added HTTP Observatory and Lighthouse reports for Seclusa BP to the privacy page

## 14.6 — 2026-10-25

### Fixed
- Seclusa Food List (shopping-list): add Subresource Integrity to scripts and stylesheets and a `connect-src 'self'` CSP override for `/sw.js`, matching the blood-pressure hardening so the app scores A+ on HTTP Observatory

## 14.5 — 2026-10-25

### Added
- Seclusa BP app published on the site (blood-pressure)

### Fixed
- `scripts/commit_gate.py` defined `mirrors_are_whole()` twice. The second
  definition won and the first was dead code, so the broader check it
  described — every mirror compared against `dist/`, not just the third-party
  ones — was never actually running and never would have
- `./scripts/sitectl commit` refreshed the pages but not the mirror. `oss/` is
  the tree the gate compares against `dist/`, and `dist/` is what gets
  uploaded, so a commit could publish a mirror that no longer matched the
  project sources and the gate would wave it through because both sides were
  stale in the same way. The commit command now syncs the mirror and the
  contribution graph before it packs, in the same order `sitectl sync` uses
- `scripts/sitectl status` printed every app as an external link. An app
  names its repo in `site.json` rather than repeating its path, and the status
  command never followed that link, so all three of this site's apps showed as
  `[link]` instead of `[ok]`
- `scripts/sync_apps.py` would have deleted an app it was copying if the
  source and the destination were the same path, which is the case for every
  app here. `copy_tree()` clears the destination before it copies, so the
  source would have been gone before it was read. The apps are published from
  where they already are, and the code now says so instead of quietly skipping
  them

### Changed
- `scripts/check_site.py` enforced `FORBIDDEN_IMAGE_HOSTS` nowhere. The rule
  it came from is in NO-GITHUB-RULE.md, and an image loaded from a third party
  makes a request on the visitor's behalf and hands them that visitor's IP to
  a host that never needed it. `github.com` is an allowed *link* host — the
  issue pill and the footer need it — but it was never an allowed image host,
  and now it is not
- The list of pages the link and privacy checks look at lived in
  `check_site.py` while a different list lived in `render_pages.py`, and a
  page added to one was invisible to the other. The renderer now owns the list
  and the checker imports it, so a new page is checked from the moment it
  exists
- `scripts/pack_site.py` kept an `ARCHIVED_KEEP` set listing the documents a
  slimmed archived mirror would have kept. The slimming was reverted — an
  archived mirror ships its whole source tree, because Apache-2.0 §4 requires
  the licence to travel with the work — and the set was left behind as
  decoration

### Fixed
- The site's own source mirror was a render behind the site it is the source
  of. `oss/website/files/` is a copy of this repository, so it carries a copy
  of the pages — and the mirror was synced *before* the pages were rendered,
  so it captured the previous version. At v14.1 the live `source/index.html`
  said 14.2 and the mirrored one said 14.1: a source tree published as the
  truth, disagreeing with the site. The pages are now rendered before the
  mirror is synced, in `sitectl sync`, `sitectl bump`, `sitectl commit` and
  the site manager
- The commit gate now checks that the site's own mirror carries the same
  version stamp as the live page, so the two cannot drift apart again

## 14.4 — 2026-10-24

### Added
- Monthly HTTP Observatory reports published under /reports/2026-10/

### Changed
- CORS restricted to the site origin instead of `*`
- Asset version bumped to 14.4

## 14.3 — 2026-10-24

### Added
- DuckDuckGo search bar in the site header (submits to duckduckgo.com in a new tab)
- Privacy notice section explaining the header search box and what DuckDuckGo may process

### Changed
- CSP `form-action` now allows `https://duckduckgo.com` for the search form
- Asset version bumped to 14.3

## 14.2 — 2026-10-18

### Changed
- The **Games** link is out of the primary nav and the footer map again. It
  went in during 14.1 on the reasoning that it is the app people arrive
  wanting, but a nav item per app does not scale and this one crowded out the
  three that describe the site rather than the apps. Games stays exactly as
  reachable as before: the tile on the home page under #apps, and /apps/

  Removed in the generators rather than the markup. All five pages are
  generated, so editing the HTML would have put the link back on the next
  `sync` or `pack` — which is exactly what happened to the first attempt at
  adding it

## 14.1 — 2026-10-18

### Added
- **Games** in the primary nav and in the footer map, sitting next to Apps
  rather than inside it. It is the app people arrive wanting, and making
  them open `/apps/` first to pick it out of a list is a step for no reason.
  Generated by `scripts/render_pages.py` and `scripts/lib_site.py`, so it
  survives the next `sitectl sync` or `sitectl pack`

### Fixed
- Those Games links were first hand-added to the five generated HTML pages,
  which meant the next `sync` or `pack` would have quietly removed them again
  — the pages are generated, nav and footer included
- `/apps/` — the directory URL people actually land on, as opposed to
  `/apps/index.html` — shipped with no `X-Frame-Options` and no
  `frame-ancestors`, making the one navigable page on the site framable by any
  origin. `_headers` matches on the request path, and no rule covered it.
  `/manage/*` had the same gap, and is not deployed
- The service worker cached every URL it saw, keyed on the whole request
  including the query string, and nothing evicts an entry until the cache
  *name* changes on a version bump. The origin answers `200` for any query, so
  ordinary links carrying junk parameters grew a visitor's Cache Storage
  without bound — caused entirely by someone else, on a site whose whole point
  is keeping data on the device. Only query-less URLs and the site's own `?v=`
  stamp are written down now
- Cache writes were fire-and-forget. Once `respondWith` resolves the worker may
  be terminated, so a page that loaded fine online could be missing from the
  offline copy
- The write path tested `res.ok`, which is also true for `206`; `Cache.put`
  rejects those, and nothing awaited the rejection
- `offline.html` loaded `css/site.css` and the brand icon without a `?v=` stamp
  while the worker precached both with one. Different cache keys, so on the
  first offline visit the fallback page rendered unstyled and with no logo

### Changed
- `sync_sw_cache` now stamps `offline.html` too. It is the only hand-written
  page here, so nothing else ever moved those stamps and they froze on whatever
  version they were last written at — which is the same drift the function
  exists to prevent
- NoCal README version 0.1.3 → 0.1.4, to match its manifest
- **The public source mirror was silently dropping code.** `sync_oss.py` skips
  build output by directory *name*, and `release` is on that list — but Android
  uses `app/src/release/` as a *source set*, the Kotlin that only compiles into
  a release build. Four files of the notes app were therefore left out of the
  published mirror while it went on presenting itself as the full source, with
  no diff, no count and no warning to say so. The decision is now made on the
  parent directory, so `app/src/release/` is kept and a genuine build-output
  `release/` is still skipped. Covered by `tests/test_sync_oss.py`

## 14.0 — 2026-10-18

### Added
- Home page: privacy guarantee chips under the hero (content in
  `site.json` under `home.guarantees`), and a latest-release strip that
  summarises `CHANGELOG.md` rather than repeating it
- `canonical`, Open Graph and Twitter card tags on every page; generated
  `robots.txt` and `sitemap.xml` (site address comes from `profile.website`,
  and nothing absolute is emitted when it is unset)
- Site version in the footer, beside the licence link

### Changed
- Repo READMEs moved to one template in `scripts/write_readmes.py`: title,
  description, **Forked From** (forks only), **Features**, **Usage** and
  **License**. Every README is regenerated from it, so the section order is
  the same across all five repos and an empty section is dropped rather than
  left as a placeholder
- READMEs rewritten in plain English for people who did not write them:
  jargon removed (`localStorage`, `CSP`, `PWA`, `connect-src`, shields.io
  badges), install steps spelled out, and each app's data handling said in
  words rather than storage-API names. Covers the NoCal `web/` folder and the
  Blocks, Word Puzzle and Munch game folders. Archived mirrors are untouched,
  and `pacman/fruit/` is left as upstream research notes
- The inline prose renderer understands `**strong**` and `` `code` `` as well
  as `*italic*`, in one pass so an emitted tag is never rescanned
- The orange glow behind the home logo is now its resting state; the hover
  rule that revealed it is gone, and the glow breathes with the logo
- The Latin gloss lights word by word as the home page loads, in CSS with
  staggered `nth-child` delays. The click-to-light easter egg is gone
- `pack_site.py` leaves the two Noto display faces out of `dist/`: nothing ever
  reached `--display` or `--body`, so ~1 MB rode along on every upload
- 401 tests over `lib_site`, `pack_site`, `render_pages`, `contributions`,
  `write_readmes`, the theme boot script, and the markdown and highlighting
  inside `oss/oss.js`

### Removed
- The site shell no longer presents itself as installable: no page links a
  manifest or sets `mobile-web-app-capable`, `manifest.json` is out of `dist/`,
  and the service worker no longer precaches it. The apps keep their own
  manifests, and the shell keeps its service worker for offline reading

### Fixed
- The nav brand mark was not inverted in dark mode. `filter: invert(1) none` is
  invalid CSS, so the whole declaration was dropped and the mark inherited
  nothing, leaving dark artwork on a dark header
- A visitor whose system is light saw a flash of dark on first load. A new
  `js/theme-boot.js` sets the theme before the stylesheet paints, so the page
  follows the system setting with no dark frame first
- `/oss/<repo>/` now loads `css/site.css` and layers its own stylesheet on top,
  instead of replacing the shell with a copy of the nav and footer. Same
  background, palette, type and footer as every other page, and a theme toggle
  that shares the `seclusa-theme` key with `js/site.js`
- Syntax colours on the source pages have a light-theme set, so a code view is
  readable in both
- The repo cards on `/source` no longer sit inside one large panel. Each card
  stands on its own; the container only added a second edge and a title bar
  repeating the heading above
- The Seclusa Games README no longer lists a game called Cards. `games/cards/`
  has no page of its own: it is the card-game engine Klondike is built on
- README `## Usage` sections cut to what you actually do. The privacy and
  storage details moved to `## Features`, where they were duplicated anyway
- The README renderer joined a hard-wrapped line into its paragraph and its list
  item. A wrapped sentence used to render as a stack of one-line paragraphs,
  which is most of what the plain-English READMEs contain
- The syntax highlighter no longer rewrites words inside spans it has already
  emitted. A shell comment produced nested spans (`<span <span class="tok-k">`)
  and swallowed the rest of the line

### Added
- `theme/seclusa-base.css`: one black-and-white palette for every Seclusa app,
  with `scripts/sync_theme.py` copying it into each app that has opted in and a
  `--check` mode that fails when a copy drifts. Apps carry a copy rather than
  linking a parent folder, because each has to work offline and from its own
  folder
- NoCal runs on that palette. Notes lost its blue theme and the Calendar's three
  copies of the same hex values, and the Calendar's own token names now map
  onto the shared ones. Event-type and status colours are kept: those carry
  meaning
- `/apps/` is a real page now, and linked from the nav. It said what each app
  does, its version, and where the source is. It was being generated and
  reachable from nowhere
- Version chip on every app tile, read from that app's own manifest
- `icons/social.png`, the wide card link previews use, built by
  `scripts/make_social.py`. Open Graph pointed at the square app icon, which
  renders as a small mark in the middle of a dark rectangle
- `feed.xml` over `CHANGELOG.md`, linked from every page head and advertised in
  `robots.txt`
- Weather's manifest gains `"version": "0.6.3"`, matching its changelog. The
  old README generator carried a hardcoded `0.6.9` that nothing verified

### Changed
- The nav "Apps" link points at `/apps/` on every page, never at the home
  page's `#apps` anchor
- About: one rounded outline around the whole page, transparent inside so the
  grid shows through. Section body text follows the theme token instead of a
  fixed dark blue-grey, which was invisible in light mode once the panel behind
  it went
- Source cards lost their window titlebar. The repo path moved into the card
  foot beside the status, and the cards now match the app tiles
- `theme/seclusa-base.css` is now synced into all three apps by
  `scripts/sync_theme.py`, and its copies are checked for drift by
  `sync_theme --check`
- A stress report and a full audit for 2026-10-18 under `report/`, now carried
  in the source mirror alongside the code they describe

### Fixed
- Weather's manifest advertised v0.6.3 for an app shipping v0.6.9. The manifest
  had no version field and one was filled in with an older release; a test
  asserting the site pages match the manifest then propagated the mistake to
  `/apps/` and the README chips. Corrected, and the stale
  `changelogs/weather.md` seed — which had fallen four releases behind — brought
  up to date so the two cannot drift again
- NoCal's service worker precached `?v=0.1.3` URLs while `index.html` requested
  `?v=0.1.4`, matched cache entries by exact URL, and never precached
  `seclusa-base.css` at all. Offline the app lost its entire palette. Its cache
  was also still named `v0.1.3`, so the old cache was never dropped on upgrade
- The Games service worker precached five launcher icons that the registry
  requested under a `?v=` the worker never stored, so every offline launcher
  tile was blank. Removed the `?v=` and its hand-maintained literal rather than
  syncing it a second time
- Games web fonts were not precached, and `@font-face` sources are only fetched
  once text in that face renders, so a cold install that went offline before the
  launcher settled had none

### Removed
- The Cryptomator vault integration in NoCal. It was not dead code: startup
  re-attached a persisted directory handle on every launch and three call sites
  still wrote `notes.json` into it, with no Connect or Disconnect control left
  to stop it. Startup now releases the stored grant

## 12.6 — 2026-10-17

### Added
- About page: Contura photos in a bordered pill, side by side on wide screens
  and stacked under 640px, click to enlarge in a native `<dialog>` viewer
- Personal note under the laptop photo; **QBASIC by Example** added to the
  books; testing tools moved into the PWA section; the dyslexia paragraph now
  records using AI to help write code
- `NO-GITHUB-RULE.md` plus `sitectl check-links` / `check-privacy`, which fail
  the build if a git remote is ever configured
- 238 tests over `lib_site`, `pack_site`, `render_pages`, `contributions`
- Playwright stress suite: 120 loads, 20 reloads, 5 history cycles, 20
  hostile-input rounds, all three apps offline. Zero external requests

### Changed
- Site **v12.6**. Brand logo and nav icon have transparent backgrounds and
  both themes read correctly
- Icons, CSS and JS carry the `asset_version` stamp, so a replaced asset
  reaches browsers instead of being pinned by the service worker
- Footer: `© 2026 Seclusa` with an enlarged copyright symbol and one GPL-3.0
  link into this site's own source mirror; `COPYING.txt` matches
- Long dashes removed throughout, including page titles and meta descriptions
- `projects_root` points at this working copy (mirrors read a stale directory)
- `sitectl bump` is now the full release step: graph, mirrors, pages, `dist/`
- All repo READMEs rewritten to a factual four-part template

### Fixed
- `safe_href` rejected an interior-control-character `javascript:` bypass
  (`java<TAB>script:`); `manage_server`'s strict traversal guard is unchanged
- Pack no longer publishes `pyproject.toml`, `tests/`, or full-resolution
  photo masters
- About closing lines reworded

### Audit
- `report/MASTER-AUDIT-2026-10-17.md` — no HIGH or MEDIUM findings

## 9.7 — 2026-10-16

### Fixed
- Cross-app SW cache bleed: Weather/NoCal scoped matches; Weather activate/erase and Games clear-all no longer wipe other apps’ caches/SWs
- Weather splash/header use sheet icon (removed old yellow sun SVG)
- OSS Issues tab → GitHub `pwa-issue-tracker`; CSP meta `frame-ancestors` noise removed where present

### Changed
- Site **v9.7** / SW `seclusa-site-v9.7`
- Weather **0.6.7**, NoCal **0.1.3**, Seclusa Games **0.1.15**
- White+black PWA icons from `app icons/` sheets across site + apps

### Fixed
- NoCal SW CSP on Cloudflare: `connect-src 'self'` for `/apps/nocal/web/sw.js` so the shell actually precaches (NoCal 0.1.2)

### Changed
- Site **v9.2** / SW `seclusa-site-v9.2` (was 9.1)
- Pack: slim archived AnotherNotesApp (drop `keep_files` full Android tree); omit `icons/brand/concepts` and mirrored `scripts/` to stay under Cloudflare’s 1000-file Direct Upload cap
- New B&W app icons/logos from `app icons/` → site PWA icons, Weather, NoCal, Seclusa Games hub + all games; pack skips `app icons/`
- Site uses full Seclusa lockup as favicon/nav/hero mark; duplicate “Seclusa” text removed from nav + hero

### Added
- **Seclusa NoCal** app (`apps/nocal/web/`) + ~/source/nocal; dual Apache-2.0 / GPL-3.0 licensing docs
- Archived upstream mirror **~/source/another-notes-app** (maltaisn, Apache-2.0, `keep_files`) for NoCal attribution
- Diagonal orange **Archived** stamp on archived source cards; GitHub-style **forked from** on AnotherNotesApp + Solitaire
- **~/source** as its own page (`/source/`) — GitHub-style profile for ambr3 + contribution board + repo cards
- Privacy notice at `/privacy/` (footer link)
- `/about/` page; catalog-style home (apps + source)
- Shell `offline.html` + SW offline fallback/precache
- Orange pixel-S brand mark + lockups under `icons/brand/`; site favicons refreshed
- **Seclusa Games** as a ~/apps tile and ~/source repo (`apps/seclusa-games/`)
- Site shell under ~/source as `website` / SeclusaSite
- ~/source **MasterPrompts** — mirrored AI audit/stress prompts
- Per-repo `skip_dirs` in OSS sync to avoid recursive self-mirrors
- Site Manager overhaul (apps/repos editors, preview `/p/`, localhost :8787)
- `MASTER-AUDIT-REPORT.md` — full site + apps master audit (2026-10-15)

### Changed
- Removed notes + calendar PWAs from apps/source; privacy copy updated for NoCal + Games + Weather
- Source note: mirrors hosted here (no GitHub required); `/oss/` catalog redirects to `/source/`
- Trust pills on home are plain text (not chip/button look)
- Pack skips `mirrors/`; archived OSS slim skipped when `keep_files` is set
- Local project srcs for weather / solitaire / master-prompts when external project folders are gone
- Footer site map: Apps · Source · About · Privacy · GPL
- Panel title bars: removed decorative min / max / close buttons
- Archived Seclusa Solitaire: MEGA APK download link on `~/source/solitaire` (GitHub repo removed)
- Pack prunes `dist/` under Cloudflare’s 1000-file Direct Upload limit (skip tests/audit reports; slim archived OSS trees; omit website manage/scripts mirrors)
- Home no longer embeds source cards / hero contrib graph — Source nav pill → `/source/`
- **weather** source hosted on this site (`~/source/weather`) instead of GitHub
- Archived source pages show **archived** and **read only** badges (solitaire)
- Site **v9.1** / SW `seclusa-site-v9.1` (was 9.0)
- Site Manager preview serves `Cache-Control: no-store` so `/p/` edits are not stuck in the browser cache
- README: privacy posture, security headers, audit pointer, deploy notes
- Hardening: HSTS + `X-DNS-Prefetch-Control` on shell and app `_headers`
- OSS viewer: DOM allowlist HTML sanitizer; 2 MB fetch cap
- Theme `localStorage` guarded in `js/site.js`
- Catalog-style home; About prose/panels; brand/orange polish through prior shell revs
- README “A note from me” links to about across apps; shortened app/OSS READMEs
- Version bumps are +0.1 only; SW cache name tracks `asset_version` (`seclusa-site-vX.Y`)
- Games app folder renamed `Soclusa Games` → `seclusa-games` (matches public URL; pack no longer renames)
- Apps deck copy: PWAs only (no APK / F-Droid claim while none are listed)
- About: “Through the years…” wording fix
- Contrib board: clearer day cell borders; mobile-safe flex (`min-width: 0`)
- Weather / Klondike / Pyramid CSP meta parity with `_headers` (master audit)

### Removed
- **seclusa-fdroid** from ~/source
- **seclusa-solitaire** from ~/apps (source kept under ~/source/solitaire, marked archived)
- **blockfall** and **word-puzzle** standalone ~/apps tiles and ~/source repos (live inside Seclusa Games)
- Blog from the public site + nav
- Source page “follows” strip / Solaire theme extras
- Dead blog pipeline (render helpers, manage `/api/blog*`, blog CSS, `site.json` blog key)
- ~/apps from primary nav (linked from source instead)
- Dead `/apps/solitaire/*` header rules

### Fixed
- Site Manager preview CSP allows `connect-src 'self'` so ~/source can load meta.json
- Mobile: nav no longer overflows / forces slight zoom; OSS repo tabs wrap
- Viewport meta uses `viewport-fit=cover` on rendered shells

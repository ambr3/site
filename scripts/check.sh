#!/usr/bin/env bash
# Lightweight consistency checks for the Seclusa marketing site.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APPS="$(cd "$ROOT/.." && pwd)"
fail=0

ok() { printf 'ok  %s\n' "$*"; }
bad() { printf 'FAIL %s\n' "$*"; fail=1; }

# Service worker must treat URL.search (which includes "?") as the stamp form.
if grep -qF 'url.search === "" || url.search === "?v=" + V' "$ROOT/sw.js"; then
  ok "sw.js cacheable() matches the exact ?v= stamp"
else
  bad "sw.js cacheable() must allow only an empty query or the exact ?v= stamp"
fi

# Site version stamps must agree.
site_v="$(sed -n 's/^const V = "\([^"]*\)";/\1/p' "$ROOT/sw.js" | head -1)"
if [[ -z "$site_v" ]]; then
  bad "could not read V from sw.js"
else
  for f in "$ROOT/index.html" "$ROOT/offline.html" "$ROOT/about/index.html" "$ROOT/privacy/index.html"; do
    if grep -q "?v=${site_v}" "$f" && grep -qE "data-site-v=\"${site_v}\"|foot-ver\">v${site_v}|theme-boot.js\\?v=${site_v}" "$f"; then
      ok "version ${site_v} in $(basename "$(dirname "$f")")/$(basename "$f")"
    elif grep -q "?v=${site_v}" "$f"; then
      ok "version ${site_v} assets in ${f#"$ROOT"/}"
    else
      bad "${f#"$ROOT"/} missing ?v=${site_v}"
    fi
  done
  if grep -q "seclusa-site-v${site_v}" "$ROOT/sw.js"; then
    ok "CACHE name matches V (${site_v})"
  else
    bad "CACHE name does not match V (${site_v})"
  fi
fi

# Public Pages base must match the GitHub repo name (ambr3/site → /site/).
if grep -R --include='*.html' --include='*.xml' --include='robots.txt' -n 'ambr3.github.io/website/' "$ROOT" >/dev/null; then
  bad "found ambr3.github.io/website/ — use /site/ to match repo ambr3/site"
else
  ok "no stale /website/ Pages URLs"
fi
if ! grep -R --include='*.html' --include='*.xml' --include='robots.txt' -n 'ambr3.github.io/site/' "$ROOT" >/dev/null; then
  bad "expected ambr3.github.io/site/ in canonicals / sitemap / robots / feed"
else
  ok "Pages URLs use /site/"
fi

html="$ROOT/index.html"

if grep -q 'id="cat-daily"' "$html" && grep -q '>Daily apps<' "$html" \
  && grep -q 'id="cat-games"' "$html" && grep -q '>Games<' "$html"; then
  ok "store has Daily apps and Games categories"
else
  bad "store missing Daily apps / Games category headings"
fi

# Store tile versions vs sibling app manifests (when present).
declare -A expect=(
  [weather]="0.7.23"
  [notes]="0.2.14"
  [calendar]="0.3.10"
  [games]="0.1.34"
  [bp]="0.1.12"
  [convert]="0.1.4"
  [lockdown]="0.1.3"
  [blocks]="0.1.1"
  [klondike]="0.1.3"
  [munch]="0.1.2"
  [pyramid]="0.1.2"
  [word]="0.1.1"
)
declare -A label=(
  [weather]="Seclusa Weather"
  [notes]="Seclusa Notes"
  [calendar]="Seclusa Calendar"
  [games]="Seclusa Games"
  [bp]="Seclusa BP"
  [convert]="Seclusa Convert"
  [lockdown]="Seclusa Lockdown"
  [blocks]="Seclusa Blocks"
  [klondike]="Seclusa Klondike"
  [munch]="Seclusa Munch"
  [pyramid]="Seclusa Pyramid"
  [word]="Word Puzzle"
)

for key in weather notes calendar bp convert games lockdown blocks klondike munch pyramid word; do
  ver="${expect[$key]}"
  name="${label[$key]}"
  if grep -A6 "<h2>${name}</h2>" "$html" | grep -q "v${ver}"; then
    ok "store tile ${name} shows v${ver}"
  else
    bad "store tile ${name} should show v${ver}"
  fi
done

if grep -A14 "<h2>Seclusa Games</h2>" "$html" | grep -q "Leaving soon" \
  && grep -A18 "<h2>Seclusa Games</h2>" "$html" | grep -q 'href="https://ambr3.github.io/games/"' \
  && grep -A18 "<h2>Seclusa Games</h2>" "$html" | grep -q 'href="https://github.com/ambr3/games"'; then
  ok "store tile Seclusa Games is Leaving soon (Open/Source kept)"
else
  bad "store tile Seclusa Games should be Leaving soon with Open/Source links"
fi

if grep -A12 "<h2>Seclusa Privacy</h2>" "$html" | grep -q "Coming soon" \
  && ! grep -A14 "<h2>Seclusa Privacy</h2>" "$html" | grep -qE 'href="https://(ambr3\.github\.io/privacy-check/|github\.com/ambr3/privacy-check)"'; then
  ok "store tile Seclusa Privacy is Coming soon (no live links)"
else
  bad "store tile Seclusa Privacy should be Coming soon without Open/Source links"
fi

read_manifest_version() {
  local file="$1"
  sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$file" | head -1
}

check_app() {
  local key="$1" dir="$2" manifest="$3"
  local path="$APPS/$dir/$manifest"
  local want="${expect[$key]}"
  if [[ ! -f "$path" ]]; then
    bad "missing app manifest $path"
    return
  fi
  local got
  got="$(read_manifest_version "$path")"
  if [[ "$got" == "$want" ]]; then
    ok "local ${dir} manifest is ${got}"
  else
    bad "local ${dir} manifest is '${got}', store expects ${want}"
  fi
}

check_app weather weather manifest.json
check_app notes notes manifest.webmanifest
check_app calendar calendar manifest.webmanifest
check_app games seclusa-games manifest.json
check_app bp blood-pressure manifest.json
check_app convert convert manifest.json
check_app lockdown seclusa-lockdown manifest.json
check_app blocks seclusa-blocks manifest.json
check_app klondike seclusa-klondike manifest.json
check_app munch seclusa-munch manifest.json
check_app pyramid seclusa-pyramid manifest.json
check_app word seclusa-word-puzzle manifest.json

# apps/ redirect should carry the same privacy/security meta posture.
if grep -q 'Content-Security-Policy' "$ROOT/apps/index.html" \
  && grep -q 'referrer" content="no-referrer"' "$ROOT/apps/index.html"; then
  ok "apps/ redirect has CSP and no-referrer"
else
  bad "apps/index.html missing CSP or referrer policy"
fi

# Accidental global letter shortcuts should stay gone. Escape only closes the theme sheet.
if grep -qE '"[as]"|'"'"'[as]'"'"'' "$ROOT/js/site.js"; then
  bad "js/site.js still binds a/s shortcuts"
else
  ok "no global a/s shortcuts in site.js"
fi

for f in "$ROOT/index.html" "$ROOT/offline.html" "$ROOT/about/index.html" "$ROOT/privacy/index.html"; do
  if grep -q 'data-theme-opt="system"' "$f" && grep -q 'data-theme-opt="light"' "$f" && grep -q 'data-theme-opt="dark"' "$f"; then
    ok "theme sheet in ${f#"$ROOT"/}"
  else
    bad "${f#"$ROOT"/} missing System / Light / Dark theme sheet"
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo
  echo "checks failed"
  exit 1
fi
echo
echo "all checks passed"

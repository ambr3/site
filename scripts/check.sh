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
  for f in "$ROOT/index.html" "$ROOT/offline.html" "$ROOT/about/index.html" "$ROOT/privacy/index.html" "$ROOT/check/index.html"; do
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

if grep -q 'href="check/"' "$html" && [[ -f "$ROOT/check/index.html" ]]; then
  ok "Check page and home nav/store link exist"
else
  bad "missing check/ page or home link"
fi

# Store tile versions vs sibling app manifests (when present).
declare -A expect=(
  [weather]="0.8.0"
  [notes]="0.2.14"
  [calendar]="0.3.11"
  [bp]="0.2.0"
  [convert]="0.1.4"
  [blocks]="0.1.1"
  [klondike]="0.2.1"
  [munch]="0.1.2"
  [pyramid]="0.2.0"
  [word]="0.3.0"
  [tds]="0.1.65"
)
declare -A label=(
  [weather]="Seclusa Weather"
  [notes]="Seclusa Notes"
  [calendar]="Seclusa Calendar"
  [bp]="Seclusa BP"
  [convert]="Seclusa Convert"
  [blocks]="Seclusa Blocks"
  [klondike]="Seclusa Klondike"
  [munch]="Seclusa Munch"
  [pyramid]="Seclusa Pyramid"
  [word]="Seclusa Word Puzzle"
  [tds]="Seclusa TDS"
)

for key in weather notes calendar bp convert blocks klondike munch pyramid word tds; do
  ver="${expect[$key]}"
  name="${label[$key]}"
  if grep -A6 "<h2>${name}</h2>" "$html" | grep -q "v${ver}"; then
    ok "store tile ${name} shows v${ver}"
  else
    bad "store tile ${name} should show v${ver}"
  fi
done

if ! grep -q "<h2>Seclusa Games</h2>" "$html"; then
  ok "store no longer lists Seclusa Games hub"
else
  bad "store should not list Seclusa Games hub"
fi

if grep -A12 "<h2>Seclusa Check</h2>" "$html" | grep -q 'href="check/"' \
  && ! grep -A14 "<h2>Seclusa Check</h2>" "$html" | grep -qE 'href="https://(ambr3\.github\.io/privacy-check/|github\.com/ambr3/privacy-check)"'; then
  ok "store tile Seclusa Check opens /check/ on this site"
else
  bad "store tile Seclusa Check should Open check/ without the old privacy-check repo links"
fi

if grep -A18 "<h2>Seclusa TDS</h2>" "$html" | grep -q 'href="https://ambr3.github.io/seclusa-tds/"' \
  && grep -A18 "<h2>Seclusa TDS</h2>" "$html" | grep -q 'href="https://github.com/ambr3/seclusa-tds"'; then
  ok "store tile Seclusa TDS has Open/Source links"
else
  bad "store tile Seclusa TDS should link to Pages and GitHub"
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
check_app bp blood-pressure manifest.json
check_app convert convert manifest.json
check_app blocks seclusa-blocks manifest.json
check_app klondike seclusa-klondike manifest.json
check_app munch seclusa-munch manifest.json
check_app pyramid seclusa-pyramid manifest.json
check_app word seclusa-word-puzzle manifest.json
check_app tds seclusa-tds manifest.json

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

for f in "$ROOT/index.html" "$ROOT/offline.html" "$ROOT/about/index.html" "$ROOT/privacy/index.html" "$ROOT/check/index.html"; do
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

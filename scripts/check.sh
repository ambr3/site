#!/usr/bin/env bash
# Lightweight consistency checks for the Seclusa marketing site.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APPS="$(cd "$ROOT/.." && pwd)"
fail=0

ok() { printf 'ok  %s\n' "$*"; }
bad() { printf 'FAIL %s\n' "$*"; fail=1; }

# Service worker must treat URL.search (which includes "?") as the stamp form.
if grep -qE 'url\.search === "" \|\| /\^\\\?v=' "$ROOT/sw.js"; then
  ok "sw.js cacheable() matches ?v= stamps"
else
  bad "sw.js cacheable() must use /^\\?v=…/ against url.search"
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

# Store tile versions vs sibling app manifests (when present).
declare -A expect=(
  [weather]="0.7.9"
  [notes]="0.2.7"
  [calendar]="0.3.4"
  [games]="0.1.29"
  [bp]="0.1.6"
)
declare -A label=(
  [weather]="Seclusa Weather"
  [notes]="Seclusa Notes"
  [calendar]="Seclusa Calendar"
  [games]="Seclusa Games"
  [bp]="Seclusa BP"
)

html="$ROOT/index.html"
for key in weather notes calendar games bp; do
  ver="${expect[$key]}"
  name="${label[$key]}"
  if grep -A6 "<h2>${name}</h2>" "$html" | grep -q "v${ver}"; then
    ok "store tile ${name} shows v${ver}"
  else
    bad "store tile ${name} should show v${ver}"
  fi
done

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

# apps/ redirect should carry the same privacy/security meta posture.
if grep -q 'Content-Security-Policy' "$ROOT/apps/index.html" \
  && grep -q 'referrer" content="no-referrer"' "$ROOT/apps/index.html"; then
  ok "apps/ redirect has CSP and no-referrer"
else
  bad "apps/index.html missing CSP or referrer policy"
fi

# Accidental global letter shortcuts should stay gone.
if grep -q 'keydown' "$ROOT/js/site.js"; then
  bad "js/site.js still binds keydown shortcuts"
else
  ok "no global keydown shortcuts in site.js"
fi

if [[ "$fail" -ne 0 ]]; then
  echo
  echo "checks failed"
  exit 1
fi
echo
echo "all checks passed"

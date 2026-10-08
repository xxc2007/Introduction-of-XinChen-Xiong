<sub>🌐 <a href="README.md">中文</a> · <b>English</b></sub>

<div align="center">

# Introduction of XinChen Xiong

> *"I haven't written code that changed the world yet."*

[![Live Site](https://img.shields.io/badge/🌐_Live-xxc2007.me-D97757)](https://xxc2007.me/)
[![Repository](https://img.shields.io/badge/GitHub_Repository-Introduction--of--XinChen--Xiong-1F1E1D)](https://github.com/xxc2007/Introduction-of-XinChen-Xiong)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Dependencies](https://img.shields.io/badge/Dependencies-Vanilla_JS-orange)](#iii--stack)
[![3D](https://img.shields.io/badge/Hero-Self--hosted_Three.js-blueviolet)](#1--field)
[![Build](https://img.shields.io/badge/Build-No_step-1F1E1D)](#iv--run-locally)
[![Languages](https://img.shields.io/badge/Languages-English_·_中文-D97757)](#2--pages)
[![External refs](https://img.shields.io/badge/Repo_external_refs-0-1F1E1D)](#3--state)
[![Douyin](https://img.shields.io/badge/Douyin-抖音-1F1E1D)](https://www.douyin.com/user/MS4wLjABAAAA-AYW1RCpFjwJmoMTnZy1vKmOQopmBOUjPLN9phlDpjI)
[![Xiaohongshu](https://img.shields.io/badge/Xiaohongshu-小红书-D97757)](https://www.xiaohongshu.com/user/profile/63bac6500000000026006c47)
[![Bilibili](https://img.shields.io/badge/Bilibili-哔哩哔哩-1F1E1D)](https://space.bilibili.com/31961476)
[![X](https://img.shields.io/badge/X-@xxc2007-1F1E1D)](https://x.com/xxc2007)
[![YouTube](https://img.shields.io/badge/YouTube-@xxc2007-D97757)](https://www.youtube.com/@xxc2007)

<br>

**Turn the things you have thought through, one by one, into addresses you can open.**

<br>

This is the personal introduction site of Xiong Xinchen (熊鑫晨): **two complete static pages** (Chinese and English), **five sections**, **two sites that are already live**, and one page of public contact details. The confetti field behind the hero is decoration, not content — its only input is how fast you scroll; without WebGL it falls back to two hairline rings and no text is lost.

Pure HTML / CSS / vanilla JS with structure, style and behavior separated (`index.html` + `assets/`), zero frameworks and **no build step**. Three.js and the serif font are self-hosted; **the two pages in the repository reference no external resource at all** (the live edge is a different story — see the note under "3 · STATE"). Clone it, run `node tools/serve.mjs`, open it.

[Live site](https://xxc2007.me/) · [I Highlights](#i--highlights) · [II Site map](#ii--site-map) · [III Stack](#iii--stack) · [IV Run locally](#iv--run-locally) · [V Deploy and sync](#v--deploy-and-sync) · [VI Content rules](#vi--content-rules) · [VII License](#vii--license) · [VIII Star history](#viii--star-history) · [Design notes](docs/design.md) · [Migration guide](docs/migration.md) · [Content sources](docs/content-sources.md)

<br>

<!-- This row of counters is an entry point, not a second source of truth: the arithmetic, the
     commands and which numbers belong to which moment all live in "3 · STATE" below.
     Change that table and you change this row at the same time. -->

<p><b>At a glance</b></p>

[![Site](https://img.shields.io/badge/🌐_Site-xxc2007.me-D97757)](https://xxc2007.me/)
[![Repository](https://img.shields.io/badge/Repository-145_tracked_files-1F1E1D)](https://github.com/xxc2007/Introduction-of-XinChen-Xiong)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Pages](https://img.shields.io/badge/Pages-2-1F1E1D)](#3--state)
[![Sections](https://img.shields.io/badge/Sections-5-1F1E1D)](#3--state)
[![Live work](https://img.shields.io/badge/Live_projects-2-D97757)](#2--pages)
[![Font slices](https://img.shields.io/badge/Self--hosted_font_slices-101-1F1E1D)](#iii--stack)
[![Hero JS](https://img.shields.io/badge/Hero_JS_gzip-189.3_KB-1F1E1D)](#3--state)
[![First paint](https://img.shields.io/badge/First_paint-1.46_MB-1F1E1D)](#3--state)

<sub>Measured locally 2026-10-07 10:25–10:36 (+0800) · the site is still being built, so file and byte counts move · xxc2007.me is the source of truth</sub>

</div>

---

<p align="center">
  <img src="assets/images/readme-hero-desktop.png" alt="Desktop hero, 1440x900: under a hairline top bar sit the square avatar, the serif name 熊鑫晨, the motto &quot;I haven't written code that changed the world yet.&quot; and one line about building his first site with AI, above a full-width outlined button; behind the type are contour rings and pale confetti" width="100%">
</p>
<p align="center"><sub>
  ▲ 1 · HERO — 1440×900 · cream paper + one terracotta line + serif display type, confetti strictly behind the text
</sub></p>

<p align="center">
  <img src="assets/images/readme-works-desktop.png" alt="Works section, 1440x900: the scrollspy has lit the second nav item in terracotta, the section eyebrow reads 贰 · WORKS, and the first project card shows the memorial site with its own screenshot" width="86%">
</p>
<p align="center"><sub>
  ▲ 2 · WORKS — 1440×900 · scrollspy highlight and the first project card (the shot inside it is one of this repository's own assets)
</sub></p>

<p align="center">
  <img src="assets/images/readme-hero-mobile.png" alt="Mobile hero, 390x844: the top bar wraps into two rows — brand and language pill on the first, five section links evenly spread on the second — then avatar, name, motto, sub-line, button and the scroll cue" width="42%">
</p>
<p align="center"><sub>
  ▲ 3 · MOBILE — 390×844 · the bar wraps into two rows, five nav entries share the width, particle cap drops to 400
</sub></p>

<details>
<summary><b>Figure log</b> · where these three shots come from (URL / viewport / date / tool / bytes)</summary>

| Figure | File | Source | Viewport | Pixels | Bytes |
|---|---|---|---|---|---|
| ▲ 1 | `readme-hero-desktop.png` | `http://localhost:8912/` (working tree, served by `node tools/serve.mjs`) | 1440×900 @2 | 2880×1800 | 321,551 B |
| ▲ 2 | `readme-works-desktop.png` | same, scrolled to `#works` | 1440×900 @2 | 2880×1800 | 434,385 B |
| ▲ 3 | `readme-hero-mobile.png` | same, mobile emulation (`mobile:true` + touch + iPhone UA) | 390×844 @3 | 1170×2532 | 243,352 B |

- **Captured**: 2026-10-07 10:28–10:32 (+0800).
- **Tool**: local Chrome 154 (`--headless=new`) driven over the DevTools Protocol (`Emulation.setDeviceMetricsOverride` + `Page.captureScreenshot`); the same run recorded the `Network` request list that the first-paint row of the "3 · STATE" table is computed from.
- **Why the local preview instead of the production URL**: a figure has to show the same bytes this README describes. The deployment at `xxc2007.me` lags behind the working tree (it is still the previous build), so a production frame would show interface parts that no longer exist in the repository.
- **Untouched**: all three are full-window originals — no stitching, no device mock-up, no re-rendering. What you see is what the browser painted.

</details>

---

## I · HIGHLIGHTS

### 1 · FIELD

- **One Three.js confetti field**: `Points` with a custom `ShaderMaterial`; particle caps of **1200 / 700 / 400** picked by pointer type and viewport width, device pixel ratio clamped to **1.75**, no textures (every mote is a soft disc computed from `gl_PointCoord` in the fragment shader)
- **Four colours only**: ink, paper, terracotta, hairline. About **8%** of the motes are terracotta; the rest sit at very low alpha — it is paper confetti, not fireworks
- **Deterministic**: seed `0x9e3779b9` (`scene.js`'s own default, `main.js` passes no override) and zero `Math.random` at render time, so a screenshot of the field never drifts between runs
- **Driven by scroll velocity**: `fieldDrive()` in `assets/js/main.js` maps `|Δy|/Δt` (px/ms) onto `scene.setEnergy(...)` — baseline **0.34**, **+0.62** per px/ms, capped at **1.0**, easing factor **0.12**; **90 ms** after the reader stops, the target falls back to the baseline. In the shader `uEnergy` drives both drift speed (`0.04 + 0.08·uEnergy`) and the alpha gain (`0.74 + 0.34·uEnergy`): **the faster you scroll the livelier the flecks get, and they settle back the moment you stop** — responsive, never attention-seeking
- **Two hard degradations**: the RAF loop is **stopped** (not throttled) when the hero leaves the viewport or the tab is hidden; if the 60-frame average exceeds **22 ms**, the particle count is halved once

The full effect → byte cost → fallback inventory lives in [docs/design.md](docs/design.md).

### 2 · PAGES

- **Two complete static pages**: `index.html` (zh-CN, default) and `en/index.html` (English). This is **not** a runtime dictionary switch — each page owns its semantics, `canonical` and SEO metadata
- Three `hreflang` alternates (`zh-Hans` / `en` / `x-default` → Chinese), **2** URLs in `sitemap.xml`, and `robots.txt` owned by this site for the whole domain root
- Alignment is enforced, not promised: `node scripts/check-parity.mjs` pins **16** structural counts and **5** sets (in-site assets, images, external links, in-page anchors, `id`s). Chinese and English disagreeing means the check **does not pass**

### 3 · STATE

| Item | Current value | How it was verified |
|---|---|---|
| Repository files | **150**, identical in the index and in the working tree | `git ls-files \| wc -l` = 150; `git ls-files --deleted \| wc -l` = 0; `git ls-files --others --exclude-standard \| wc -l` = 0 (all three must hold at once: if a file is deleted-but-still-in-the-index, or untracked-but-already-published, the first two numbers start telling different stories) |
| Pages | **3** HTML files (zh / en / 404) | `git ls-files '*.html' \| wc -l` = 3 |
| Sections | **5** (`.sec-head h2`), **6** `<section>` elements | `node scripts/check-parity.mjs` prints `h2=5 section=6` |
| Live projects | **2**: the memorial at `/nc15/`, GEOHOT at `/geohot/` | Both entry points are on the page; routing table in [II](#ii--site-map) |
| Contact entry points | **7** (site / GitHub / Douyin / Xiaohongshu / Bilibili / X / YouTube) | Same command, `social li=7` |
| HTML size | **20.1 KB / 20.6 KB** (`20,621` / `21,111` bytes) | `wc -c index.html en/index.html` |
| Site CSS | **36.8 KB** (`37,658` bytes) · gzip **14.1 KB** | `wc -c assets/css/style.css` · `node -e` with `zlib.gzipSync` |
| Hero JS | gzip **189.3 KB** against a 195.3 KB budget | `node scripts/check-bytes.mjs` (own JS gzip + `assets/vendor/` gzip) |
| Self-hosted Three.js | `three.module.min.js` **338,908** B → gzip **79,328** B; `three.core.min.js` **381,124** B → gzip **101,305** B | `wc -c assets/vendor/*.js` · `node -e` with `zlib.gzipSync` |
| Self-hosted serif | **101** woff2 slices, **6,027,992** B in total; **101** `@font-face` rules in `wght.css` | `find assets/fonts -name '*.woff2' \| wc -l` (the slices live in `…/noto-serif-sc/files/`, so `ls assets/fonts/noto-serif-sc/*.woff2` counts 0) · `grep -c '@font-face' assets/fonts/noto-serif-sc/wght.css` |
| Images (avatar + two project shots) | **85.8 KB** (`87,886` B) against an 87.9 KB limit → `BUDGET OK` | `wc -c assets/images/avatar.jpg assets/images/shot-nc15.webp assets/images/shot-geohot.webp` (`avatar.jpg` 26,762 + `shot-nc15.webp` 28,624 + `shot-geohot.webp` 32,500) |
| First-paint transfer | **1,493.6 KB ≈ 1.46 MB** over **27** requests: text gzip **251.2 KB** + the **17** woff2 slices actually fetched **1,214.1 KB** + images **28.3 KB** | One local Chrome headless run recording the full CDP `Network` event stream; text counted with `zlib.gzipSync`, woff2 and images at their raw bytes (the same run that produced the three figures in the figure log) |
| Social/share assets, not in the first paint | **78.7 KB** (`80,541` B) against a 195.3 KB limit | `wc -c assets/images/banner.svg assets/images/og-card.svg assets/images/og-card.png assets/images/favicon.ico assets/images/favicon-32.png` |
| Repo external resource refs | **0** | `grep -c 'src="https://' index.html en/index.html` → `0` on both pages; `grep -oE 'https?://[a-z0-9.-]+' index.html \| sort -u` only lists the canonical host, `schema.org` inside JSON-LD and outbound link targets — nothing the browser requests. **This counts the repository source; the live edge injects more, see the "external requests" note below** |
| Build steps | **0** (no manifest in the repository) | `git ls-files '*.json' \| wc -l` → `0` |
| Repository size | **7.93 MiB** working tree (excluding `.git/`) · `.git` **6.91 MiB** | `du -sb --exclude=.git .` = `8,314,693` · `du -sb .git` = `7,249,147` |
| Domain root | Target `/` = this site; **switched**: `/` = this site, `/nc15/` = the memorial | Repository record: `bash scripts/switch-routes.sh` ran at 2026-10-07 09:44:51 (+0800). Re-measured at 10:30 with `curl -o /dev/null -w '%{http_code}'`: `/` 200, `/en/` 200, `/nc15/` 200, `/geohot/` 200, `/comment/` 302 (Artalk redirects to its own `/comment/sidebar/`) |

<!-- Checked: every number above recomputed locally 2026-10-07 10:25–10:36 (+0800); the production status codes are from the 10:30 curl run. -->

These bytes and counts move with the build: this table is one snapshot taken **2026-10-07 10:25–10:36 (+0800)**, and whoever changes the code reruns it. The **single source of truth for the budget numbers is `node scripts/check-bytes.mjs`**; this table is only a snapshot, so change the thresholds in the script, not here.

> **The boundary of "zero external requests" (not optional)**: the cell above counts **the two pages in the repository** — `index.html` / `en/index.html` carry no third-party `src`/`link`, and Three.js and the serif font are all self-hosted. But the site runs behind Cloudflare, and **the edge injects things that are not in this source**: a public-internet `curl` of the homepage on 2026-10-08 returned `https://static.cloudflareinsights.com/beacon.min.js` (Cloudflare Web Analytics — visitor-side tracking) and `/cdn-cgi/scripts/*/email-decode.min.js` (email obfuscation). Neither is referenced by this repository nor controlled by it — **"no external requests / no tracking" is true of the repository, not of the live site.** Reaching true zero on the live site means turning Web Analytics and Email Obfuscation off at Cloudflare, which is edge configuration outside this repo.

Academic and study-related content does not enter this site, nor this README — the boundary is in [VI · Content rules](#vi--content-rules).

## II · SITE MAP

```text
Introduction-of-XinChen-Xiong/
├── index.html              # Simplified Chinese page (default); two inline blocks: noscript fallback styles + JSON-LD Person
├── en/index.html           # English page (a full translation, not runtime localisation; assets shared via ../)
├── 404.html                # Zero-script 404: shares the external stylesheet and font, plus one inline block covering only this page's two classes; four live entry points listed
├── assets/
│   ├── css/style.css       # Tokens, components, 6 @media blocks (4 breakpoints + no-script + reduced motion)
│   ├── js/main.js          # Reveal, progress, scrollspy, language menu, scroll-velocity energy for the confetti field, copy-mail, magnetic buttons and card tilt — one shared rAF chain
│   ├── js/scene.js         # Three.js confetti field, exports initField(canvas) and hands uEnergy to main.js; throws so main.js can cover for it
│   ├── vendor/             # Two self-hosted Three.js files, no CDN, license header intact
│   ├── fonts/noto-serif-sc/# Self-hosted variable serif: wght.css (101 @font-face) + 101 slices fetched by unicode-range
│   └── images/             # Avatar (jpg), two project shots (webp), banner.svg, og-card (svg + 1200×630 png), three favicons, the three figures used by this README (the measured manifest moved to `docs/image-provenance.md` and is no longer published with the site)
├── scripts/                # check-parity · check-links · check-bytes · deploy.sh · verify-sync.sh · switch-routes.sh
├── tools/                  # serve.mjs local preview (mounts the memorial at /nc15/) · gh-publish.mjs fallback publisher · normalize-cf.mjs Cloudflare rewriter normaliser
├── deploy/                 # nginx.conf.example (placeholders; the live file lives under /etc/nginx on the server)
├── docs/                   # build-contract · site-spec · design · migration · content-sources
├── README.md / README.en.md
├── robots.txt / sitemap.xml / LICENSE / .gitattributes / .gitignore
└── .deploy.env             # Deploy target (host / user / key path) — gitignored, never committed
```

Four path prefixes share this domain, and each has one owner:

| Path | Owner | Why it sits there |
|---|---|---|
| `/` and `/en/` | **This site** (Chinese default + English) | The introduction is the front door; `x-default` points at `/` |
| `/nc15/` | The memorial (physical directory `/var/www/nc15`) | Moved out of the root; its absolute paths already carry the `/nc15` prefix |
| `/geohot/` | GEOHOT, reverse-proxied to a local Node service | It has its own backend, so the prefix and the `^~` priority must stay |
| `/comment/` | The Artalk comment backend | **It has to stay at the domain root** — the memorial's `wall.js` calls it with a root-absolute path; moving it under `/nc15/comment/` breaks the whole message wall |

The nginx blocks are written out in [`deploy/nginx.conf.example`](deploy/nginx.conf.example); the move and the rollback are in [docs/migration.md](docs/migration.md).

## III · STACK

| Layer | Choice | Why |
|---|---|---|
| Frontend | Pure HTML / CSS / vanilla JS, separated concerns, no build | The page is barely two screens long; a framework's cost buys nothing here. With no build step the repository bytes are the served bytes, which is what makes byte-for-byte verification meaningful |
| 3D | Three.js **self-hosted** in `assets/vendor/` | Proxies, outages and CDN quirks cannot take the hero down; the license is auditable inside the repository |
| Fonts | Self-hosted variable Noto Serif SC (`font-weight: 200 900`) → Georgia → Song-family fallback | 101 slices, and the browser only fetches the `unicode-range` slices it needs (17 measured on the first screen); if a remote font host disappears the page falls back without collapsing |
| Bilingual | Two full static pages + `hreflang`, no runtime translation | Each page owns its semantics and SEO metadata; in-page translation plugins only pollute the text |
| Serving | nginx (`/` static + `/nc15/` alias + two reverse proxies) | Only the nginx config can state the precedence of those four prefixes |
| Deployment | `git archive HEAD` to the server · Cloudflare in front · Let's Encrypt certificates | Shipping repository blob bytes rather than working-tree bytes keeps line-ending noise out of the verification |

## IV · RUN LOCALLY

### 1 · NO BUILD

**There is no build step** — the files in the repository are the files the browser loads. No bundler, no transpiler, no dependency install. And do not copy the usual `python -m http.server` line: nothing here assumes Python exists, and on the machine these instructions were verified neither `python` nor `python3` resolves at all (both report "Python was not found"). The documented local server is Node:

```bash
git clone https://github.com/xxc2007/Introduction-of-XinChen-Xiong.git
cd Introduction-of-XinChen-Xiong
node tools/serve.mjs            # port 8899 by default, binds only to the loopback address
```

### 2 · FREE PORTS

If that port is taken, pick a free one instead of killing somebody else's process:

```bash
netstat -ano | grep LISTENING | grep -E ':8[89][0-9][0-9]'   # see what is listening (88xx and 89xx: 8890 / 8899 are in range)
node tools/serve.mjs 8907                                 # use a free port
```

Measured on 2026-10-07 with Node `v24.19.0`: `/`, `/en/`, `/assets/css/style.css`, `/assets/js/main.js`, `/assets/vendor/three.module.min.js` and `/assets/fonts/noto-serif-sc/wght.css` all returned **HTTP 200**; `/nc15/` returned **200** (the previewer mounts the memorial repository there, and answers 404 honestly when it is absent); a nonexistent `/nope.html` returned **404**; and the bytes fetched from `/` equalled `index.html` on disk. Afterwards the process was stopped with `taskkill //PID <pid> //F //T` and the port was confirmed FREE.

### 3 · FILE PROTOCOL

> Opening `index.html` directly over `file://` shows all content and styling, but `<script type="module">` is blocked by the local cross-origin rules: no motion, no language menu, and the confetti field falls back to static hairline rings. **That is not a broken site** — the content stays readable, and script is only an enhancement. The message wall lives at `/comment/`; this site never calls it, so an offline preview has nothing to wait for.

## V · DEPLOY AND SYNC

### 1 · FIVE STAGES

One command, five stages:

```bash
cp .deploy.env.example .deploy.env   # DEPLOY_HOST=<server-ip> / DEPLOY_USER=<ssh-user> / DEPLOY_KEY
bash scripts/deploy.sh "revised the hero motto"
```

1. **Quality gates** — `check-parity.mjs` (zh/en alignment), `check-links.mjs` (link reachability plus the host-information red line), `check-bytes.mjs` (byte budgets), then `bash -n` on every `scripts/*.sh` and `node --check` on every `tools/*.mjs`. Nothing is committed if a gate fails.
2. **Commit and push to GitHub** — when the tree is dirty the script does **not** run `git add -A`; it runs `git add -u` plus an explicit per-path allow-list (`index.html en 404.html robots.txt sitemap.xml assets docs deploy scripts tools LICENSE README.md README.en.md .gitignore .gitattributes`). Anything untracked outside that list is reported but never committed. The reason: `git add -A` once swept a verification agent's leftover `wall2.json` in the repo root straight into the public repository — transient artifacts stay out of the tree instead of riding along on a commit. A message without a conventional prefix is automatically prefixed with `update:`, then `git push` is retried three times.
3. **Ship to the server** — `git archive --format=tar HEAD` sends only `index.html en 404.html robots.txt sitemap.xml assets` as **repository blob bytes** into `~/deploy-intro`; each item is removed and recopied into `DEPLOY_ROOT`, then `chown -R www-data:www-data`. Blob bytes rather than working-tree bytes is what keeps line-ending differences out of the verification.
4. **Four-way byte verification** — `bash scripts/verify-sync.sh`.
5. **Reachability** — from the server itself, each prefix is curled over the loopback address with a `Host` header and the status codes are printed.

### 2 · PARITY

`verify-sync.sh` proves that **four sources agree on the same bytes** (it runs as **six** stages, A–F), which is more than "I saw the page load":

| Stage | Compares | Method |
|---|---|---|
| A | Local HEAD ↔ server files | `sha256` of every file in the deploy set on both sides, `sort -k2`, and the whole list must be identical; a diff of the first 20 lines otherwise. If the remote returns no hashes at all (usually a wrong `$DEPLOY_ROOT`) it fails rather than counting as "equal" |
| B | Local HEAD ↔ GitHub remote | **First compare `git rev-parse HEAD` against the remote HEAD sha from `gh api .../commits/HEAD`** (a single check); then compare each deploy-set file's git blob sha (git blob SHAs and GitHub blob SHAs come from the same source); README/docs and other non-deployed files are excluded. The old version compared tree hashes, but that endpoint returns the commit sha for `HEAD`, so it was permanently red — a permanently-red check is no check |
| C | Local ↔ **origin**, bypassing the CDN | On the server itself, curl the loopback address with a `Host` header, hash what comes back — **byte for byte**, no cache excuses |
| D | Local ↔ public internet through Cloudflare | Fetch `/` and `/en/`, normalize Cloudflare's email obfuscation first (`mailto:` is swapped for a protected link and `email-decode.min.js` is injected — a site-level feature, not a stale cache). **Normalization has exactly one implementation, `tools/normalize-cf.mjs`** (the old copy of `sed` rules drifted against it); it then self-checks — if the normalizer or node breaks, both sides hash to the same empty string and "both broken" reads as "both equal", so an empty normalizer output fails the stage instead of passing |
| E | Public internet, one resource URL at a time | Extract the exact URLs the browser would fetch (including `?v=`) from the three HTML files and re-fetch each from the origin, hashing with `sha256`, **up to 3 retries per URL** (after a `?v=` change every URL is a fresh cache key and the first hit can land mid-fill); `three.core.min.js`, which carries no fingerprint, is listed explicitly. An empty list fails |
| F | Neighbouring sites untouched | `/nc15/` and `/geohot/` must still be 200 |

Splitting C from D is deliberate: **C asks "did the deploy land", D asks "is the CDN serving an old copy"**; merging them produces false diffs because of Cloudflare's rewrite. Normalization is **only `tools/normalize-cf.mjs`** — stage D calls it directly and there is no second `sed` list to drift against.

### 3 · FALLBACK

**Fallback publisher**: `git push` over HTTPS on this machine fails now and then on proxy TLS jitter, so `deploy.sh` hands over to `node tools/gh-publish.mjs "message"`. It pushes the local HEAD tree as **one atomic commit** through the GitHub Git Data API (create each blob → create the tree → create the commit → `refs/heads/main` moved with `force: false`). A failed push can never leave half a commit behind.

### 4 · NO HOST INFO

**The repository never contains host information.** The origin IP, the SSH login name and the private key path exist only in the gitignored `.deploy.env` (line 10 of `.gitignore`); every example uses `<server-ip>` / `<ssh-user>` placeholders. This is not a matter of discipline — `check-links.mjs` scans every line of every tracked file and **fails the build** on a real IP, a private-key flag, a key filename or a login name (only loopback and wildcard bind addresses sit on its allow-list; they do not identify a machine).

### 5 · ROUTE SWITCH

Switching the domain root is a separate command, because it edits nginx rather than files:

```bash
bash scripts/switch-routes.sh --dry-run   # read-only: prints the diff, writes nothing
bash scripts/switch-routes.sh             # backup → nginx -t preflight → reload; reverts if the test fails
bash scripts/switch-routes.sh --rollback  # restore the most recent backup
```

`bash scripts/switch-routes.sh` was run at **2026-10-07 09:44:51 (+0800)**. Re-measured from the public internet at **10:30**: `/` 200 (this site), `/en/` 200, `/nc15/` 200 (the memorial), `/geohot/` 200, `/comment/` 302 (Artalk redirecting to its own `/comment/sidebar/`), `/robots.txt` 200, `/sitemap.xml` 200; the `<title>` of `/` and `/en/` reads 「熊鑫晨 · Introduction of XinChen Xiong」 and "Xiong Xinchen · Introduction of XinChen Xiong" respectively. The backup stays at `/etc/nginx/sites-available/xxc2007.me.bak-nc15-20261007-094451`, and the rollback is one command: `bash scripts/switch-routes.sh --rollback`.

## VI · CONTENT RULES

This site only lists things that are **already live and pointable**. Every sentence on the page may come from exactly three kinds of source: the GitHub profile README, the two live sites themselves, and the two repository READMEs. No inference, no filling-in, no embellishment.

- Location is written as `China` and nothing more (the profile's own wording); the coordinates of the school campus are not his home address and never enter the copy
- The email address comes from the public metadata of his GitHub profile; it is written here because it is public, not because it is free to change
- Academic and study details, follower and star counts are never presented as achievements
- The name of an upstream framework never becomes his byline

Every claim, its source and its verification date are tabulated in [docs/content-sources.md](docs/content-sources.md) — **read that table before editing any copy**. Design trade-offs are in [docs/design.md](docs/design.md); getting the site onto a new machine is [docs/migration.md](docs/migration.md).

## VII · LICENSE

[MIT](LICENSE) © 2026 Xiong Xinchen (熊鑫晨) · Avatar and the two project shots © Xiong Xinchen · Three.js is vendored under MIT in `assets/vendor/` with its license header intact

## VIII · STAR HISTORY

<p align="center">
  <img src="https://api.star-history.com/svg?repos=xxc2007/Introduction-of-XinChen-Xiong&type=Date" alt="Star history: the repository's GitHub Stars growing over time" width="100%">
</p>
<p align="center"><sub>
  ▲ The chart is generated live by <a href="https://star-history.com">star-history.com</a> and grows with every star (GitHub's image proxy caches it, so updates lag by a few hours); the repository is young, so this line starts at the very first star.
</sub></p>

---

<div align="center">
  <sub>Dedicated to everyone who turns a thought-through idea into an address that opens.<br>Editorial standards and code · Xiong Xinchen · <a href="https://xxc2007.me/">xxc2007.me</a> · 2026<br><a href="docs/design.md">docs/design.md</a> · <a href="docs/migration.md">docs/migration.md</a> · <a href="docs/content-sources.md">docs/content-sources.md</a></sub>
</div>

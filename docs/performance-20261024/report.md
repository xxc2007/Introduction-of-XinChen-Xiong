# Personal site runtime optimization, 2026-10-24

Scope: local source changes only, based on main 78eb070. No server, CDN, proxy, network configuration or other repository changes. No deployment or cross-region claim.

The current hero and deferred process scene use 24 Three.js exports. Their unchanged scene implementations now share one tree-shaken ESM runtime generated from the same pinned Three.js 0.180.0 package with esbuild 0.25.11. Original official module/core files remain in the repository and checksum inventory. The generated runtime is committed, so production remains static with no build dependency. Full WebGLRenderer, materials, shadow pipeline, imagery, film, keyboard controls and unrestricted quaternion drag rotation remain available.

## Measured local bytes

- Official runtime before: 720,032 raw bytes, 180,633 gzip bytes, two module requests.
- Generated runtime: 497,449 raw bytes, 125,990 gzip bytes. Runtime reduction: 222,583 raw bytes (30.9%) and 54,643 gzip bytes (30.3%). Total initial JS gzip: 200,465 → 145,823 bytes (195.8 → 142.4 KiB), down 27.3%.
- Request graph changes from scene -> three.module -> three.core to scene -> three.site.<content hash>.min.js. The early hint fetches this one shared runtime in parallel with scene and the appropriate earth texture. Process scene reuses the same module URL; no second engine fetch.
- Existing data-saving and slow-connection guards still precede resource hints and dynamic import.
- Active portfolio already uses system fonts and does not request legacy font CSS; no font optimization or font visual change was justified.

## Reproduction and cache safety

`npm ci && npm run build:three` regenerates the runtime, SHA-256 inventory and scene/hint references. `node scripts/build-three-subset.mjs --check` checks reproducibility. `node scripts/prepare-release.mjs` synchronizes immutable query strings for both languages and supporting HTML. The runtime filename itself contains a SHA-256 prefix, so new subsets never overwrite an immutable URL. Original vendor checks plus generated-runtime checksum validation run without installing build dependencies during deployment.

## Validation boundary

See validation.txt for the one local validation batch: source tests, parity/budget/vendor/fingerprint checks, resource-hint browser regression, full free-rotation browser check at one desktop Chinese viewport, and process-scene regression. Browser tests use local Chrome with software WebGL. This proves covered local behavior and generated-asset reuse; it is not a physical-device, China/international route, production caching, LCP, or complete visual-equivalence measurement. The parent task handles release and regional validation.

## Recorded results

- Initial source test run: 52 passed, one expected pre-commit sitemap-date mismatch (generated HTML dated October 24 while last committed HTML was October 23). After committing HTML, the sitemap-only test passed 1/1. This is 53 distinct passing checks across the two runs; the entire suite was not rerun.
- Generated runtime reproduction, three SHA-256 checks (two official originals plus generated runtime), bilingual parity, resource fingerprint and byte budgets passed.
- Resource-hint browser tests passed Chinese/English at 390/1440 px, low-speed/data-saving guards and language-intent URL boundaries.
- Free-rotation browser test passed Chinese at 1440 px: vertical/diagonal dragging, multiple pole crossings and reset.
- Process-scene browser test passed Chinese/English at 320/390/1440 px: four distinct WebGL pixel states, lazy load, localized textures, keyboard/pointer controls and overflow; short viewport/touch, reduced motion, no JS, no WebGL and texture-failure fallbacks also passed.

All results are local. No LCP value or China/international access improvement is claimed; the byte/request reductions above are exact local artifact measurements.

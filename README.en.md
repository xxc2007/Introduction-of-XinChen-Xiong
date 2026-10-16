<sub><a href="README.md">简体中文</a> · <b>English</b></sub>

<div align="center">

# Xiong Xinchen · Personal website

*“I haven’t written code that changes the world yet.”*

[![Website](https://img.shields.io/badge/Website-xxc2007.me-48583D)](https://xxc2007.me/)
[![Stack](https://img.shields.io/badge/Stack-HTML_CSS_JavaScript-24251E)](#implementation)
[![MIT](https://img.shields.io/badge/License-MIT-FF8B48)](LICENSE)

**Ideas become websites. The work tells the story.**

This is my personal introduction and the shared entrance to two live projects: a place for campus memories and a daily geography publication.
Through the projects, my working process and a few guiding beliefs, this bilingual site shows how I build with AI—from an initial idea to a website people can visit, explore and return to.

[Visit the site](https://xxc2007.me/en/) · [Watch the film](#-product-film) · [Two projects](#two-projects) · [Experience](#experience) · [Implementation](#implementation) · [Run locally](#run-locally) · [License](#-license) · [Star History](#-star-history)

</div>

![Desktop introduction with large typography and an interactive Earth](assets/images/readme-hero-desktop.png?v=4430820db066)

## 🎬 Product film

A 44-second introduction, from the name and rotating Earth to the campus memorial, GEOHOT and the process behind the projects. Real website footage, a soft score and gentle transitions bring the content and interactions into one short viewing sequence. The film uses Chinese on-screen text; the website has a full English edition.

Play it directly below.

https://github.com/user-attachments/assets/674f7e9e-a87c-4235-b784-5ac5c5f1c822

[▶ Watch in the 1080p player](https://xxc2007.me/assets/video/) · [Open MP4](https://xxc2007.me/assets/video/intro-promo.mp4) · [No-music edition](https://xxc2007.me/assets/video/intro-promo-nobgm.mp4)

## Two projects

**One preserves memories; the other makes information easier to follow.** Their content and technical choices differ, while both bring together my practice in design, frontend development, mapping and ongoing maintenance.

| Project | Content and implementation | Explore |
|---|---|---|
| **The Nanchang No. 15 memorial** | A record of the school through 25 campus photographs I took, an eight-viewpoint photo tour, a Chinese-labelled map and a guestbook. Built with vanilla frontend code and a self-hosted comment service, with ten language editions. | [Visit](https://xxc2007.me/nc15/) · [Source](https://github.com/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School) |
| **GEOHOT** | Public geography sources become selected stories and daily editions through pre-filtering, two scoring passes and event grouping. Built on AIHOT, with server rendering and background job processing. | [Read](https://xxc2007.me/geohot/) · [Source](https://github.com/xxc2007/GeoHot) |

![The project selector and a comparison of the memorial and GEOHOT](assets/images/readme-works-desktop.png?v=ddaf350d481d)

## Experience

Olive green, warm cream, generous typography and scroll-linked motion guide the reading sequence: an introduction, the projects, the working process, then beliefs and contact details.

- **An Earth you can turn:** NASA Blue Marble imagery on a globe with unrestricted dragging and tumbling, arrow-key control and a view reset.
- **Visible chapter navigation:** text links stay expanded on desktop and mobile, with a dotted current-section marker, natural wrapping on narrow screens and a Chinese/English switch.
- **A process to explore:** four steps and their visual scenes follow purpose, design and construction, mapping, and publication and maintenance.
- **Different ways to browse:** desktop and touch layouts, keyboard controls, a static Earth fallback and reduced-motion support. Video loads when activated.

### Mobile edition

<p align="center"><img src="assets/images/readme-hero-mobile.png?v=9c30c784e83b" width="390" alt="Mobile edition with expanded navigation, introduction, film entry and Earth"></p>

<sub>Screenshots were captured on 16 October 2026. The film preserves the website at production time; its news footage does not change with GEOHOT’s daily updates.</sub>

## Implementation

| Area | Approach |
|---|---|
| Structure | Static HTML with separate Chinese and English pages and SEO metadata; shared styles and behavior, with no application build step. |
| Styles and interactions | CSS handles responsive layout and visual states; vanilla JavaScript handles chapter tracking, project selection, language controls and scroll-linked scenes. |
| Earth | Self-hosted Three.js and textures, quaternion-based rotation for continuous tumbling, and WebGL context-loss and restoration handling. |
| Loading | Earth and process modules load on demand; video loads after activation. Key visual assets are served locally, with static fallback content. |
| Verification | Language parity, local links, asset budgets and static rules, alongside browser interaction regressions. Commands are listed below. |

## Run locally

```sh
node tools/serve.mjs 8901
```

Open http://127.0.0.1:8901/ or `/en/` for English. No application build is required. The main portfolio uses system sans-serif fonts; supporting pages retain local font assets.

Check content, structure and resource sizes:

```sh
node scripts/check-parity.mjs
node scripts/check-links.mjs
node scripts/check-bytes.mjs
node --test "tests/*.test.mjs"
```

## Measured source sizes

The values below are checked against the files by the quality suite. JS totals include the local Three.js modules; the later process scene is counted separately from initial JS. Images, Earth textures and video are not included in the JS total. These source measurements are not a Lighthouse score or a measurement of a visitor’s connection.

| Item | Current measurement | How to check |
|---|---|---|
| Repository files | **190** | `git ls-files \| wc -l` = 190 |
| HTML size | `24,111` / `24,542` B | index.html / en/index.html |
| Site CSS | **51.4 KB** (`52,612` B), gzip **11.7 KB** | assets/css/style.css |
| Hero JS | gzip **195.1 KB** | scripts/check-bytes.mjs |
| Images (avatar + two project shots) | **85.3 KB** (`87,382` B) | scripts/check-bytes.mjs |
| Social/share assets | **77.8 KB** (`79,646` B) | scripts/check-bytes.mjs |

## Publishing and verification

The existing deployment workflow pushes this repository to GitHub, publishes the tracked website files to the dedicated server directory and compares local files, GitHub blobs, server files and public responses. Deployment credentials stay in the ignored local configuration.

```sh
bash scripts/deploy.sh "feat: publish the redesigned portfolio and new film"
bash scripts/verify-sync.sh
```

The personal site owns `/` and `/en/`. `/nc15/`, `/geohot/` and the comment service have their own deployment boundaries. Each project is published separately.

## Content and credits

Personal text, project descriptions and links follow [content sources](docs/content-sources.md). [ORYZO](https://oryzo.ai/) is the design reference; the site uses its own content and locally implemented visuals. Earth imagery: NASA Earth Observatory / Blue Marble Next Generation, August 2004, a cloud-free composite rather than live weather. Details: [image provenance](docs/image-provenance.md).

The new film uses real website captures and an original synthesized soft score. Production notes and validation: [film release](docs/promo-release-20261016.md).

## 📄 License

[MIT](LICENSE) © 2026 Xiong Xinchen (熊鑫晨). Third-party assets retain their respective terms; see [image provenance](docs/image-provenance.md).

## 📈 Star History

<p align="center">
  <img src="https://api.star-history.com/svg?repos=xxc2007/Introduction-of-XinChen-Xiong&type=Date" alt="GitHub star history for the personal website repository" width="100%">
</p>
<p align="center"><sub>Chart generated by <a href="https://star-history.com">star-history.com</a>. GitHub’s image cache may delay updates.</sub></p>

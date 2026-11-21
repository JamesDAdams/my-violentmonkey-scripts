# AGENTS.md

Rules and conventions for this repository. Follow them whenever a script, the
website, a README or a screenshot is added or changed.

## 1. What this repository is

A collection of standalone userscripts for Violentmonkey / Tampermonkey, one
folder per script, plus a static website published on GitHub Pages at
<https://script.jamesserver.fr/>.

```
<userscript-id>/          one folder per script
  <name>.user.js          the userscript (metadata + code)
  icon.png                128×128 icon, the logo of the targeted website
  README.md               English
  README.fr.md            French
  screenshots/            PNG screenshots used by the READMEs
docs/                     the static website (GitHub Pages source)
  index.html, styles.css, app.js
  assets/                 every image the site needs (Pages serves /docs only)
  CNAME, .nojekyll, favicon.svg
README.md / README.fr.md  root listing (English default + French)
AGENTS.md                 this file
```

## 2. Icons — always the logo of the targeted website

- The **icon of a script is the logo of the website it acts on**: Steam logo
  for `store.steampowered.com`, Discord logo for `discord.com`.
- Same rule in the **left menu of the site**: the `.nav-icon` of an entry uses
  the SVG path of the targeted site logo (simple-icons, CC0), not a generic
  glyph.
- Paths come from <https://simple-icons.org>; keep `viewBox="0 0 24 24"` and a
  single `<path>`.
- `icon.png` is 128×128, rounded dark background, and referenced by `@icon`.

## 3. Page layout of the website

Every script gets one `<article class="panel" id="panel-<id>">` in
`docs/index.html`, in this order:

1. `.shots` — the screenshot **hero at the very top of the panel**, as a
   **direct child of `<article>`, before `.panel-body`** (`<article> <div
   class="shots">…</div> <div class="panel-body">…`). Same visual treatment for
   every script: dark card with 16 px padding, centred image, rounded corners,
   bottom border. `.shot` for landscape, `.shot.portrait` for tall captures,
   `.shot.wide` for very wide captures. It is never inside `.panel-body` and
   never after the title, the lead or the feature list — that is what makes a
   panel look different from the others;
2. `.panel-head` **inside `.panel-body`** — `<h2>` with the script name and the
   site `<span class="tag">`;
3. `.lead` — one sentence describing what the script does;
4. `.feats` — three bullets, factual (what it adds, where the data comes from,
   what stays local);
5. `.actions` — the orange `Install` button and a `Details` link to the folder;
6. `.meta` — a short prerequisite, then a `.version` chip with
   `data-version-src` pointing at the raw `.user.js` (the site reads `@version`
   from it at runtime).

The Install button text is **`Install` / `Installer`** — never
`Configure & install` — and it is a **plain link to the raw `.user.js`**, like
every other script. The site has **no configuration dialog**: a script that
needs settings configures itself, in its own settings panel (`⚙` badge on the
target site, opened automatically on first use).

The left menu lists every script; clicking an entry shows its panel on the
right (hash routing, e.g. `#steam-region-price`). The selected entry is
highlighted and the page must work from a direct link on that hash.

## 4. Bilingual, English first

- **English is the default** for the site and for the READMEs.
- The site has an `EN / FR` switch; the chosen language is stored in
  `localStorage["mv-scripts-lang"]`. Every visible string is translated through
  the `I18N` object in `docs/app.js` and `data-i18n` / `data-i18n-alt`
  attributes in the HTML (the attribute value is the English fallback).
- **Each script has two README files**: `README.md` (English, default) and
  `README.fr.md` (French), never a single mixed document. Each one starts with a
  language switcher line (`**English** · [Français](README.fr.md)` and the
  mirror).
- **Userscript UI** follows `navigator.language`: French strings when the
  browser is French, English otherwise.
- **Userscript metadata** (`@name`, `@description`) is written in English.

## 5. README rules

Root listing (`README.md` / `README.fr.md`):

- a table with **three columns**: `Script` · `What it does` · `Installation`;
- the script name is a link to its folder; the description cell also holds the
  screenshot; there is **no separate folder column**;
- **every row carries the screenshot** of its script in the description cell
  (`<br><br><img src="<script>/screenshots/…" width="180-260">`), next to the
  text — never a row without an image;
- the `Installation` cell holds the install button image
  (`assets/install-en.svg` or `assets/install-fr.svg`, 96×28) linked to the raw
  `.user.js`;
- no “install” / “update” section: the table is the entry point.

Per-script README:

- title, one-sentence pitch, then **the screenshot near the top**;
- an **`## Install` / `## Installation` section with the install button**
  (`assets/install-en.svg` / `install-fr.svg`, 96×28) linking to the raw
  `.user.js` — every script README has one, like the root table;
- what the badges/features do, in the order the user sees them;
- a `## Settings` / `## Réglages` section: how to open the in-script panel and a
  table of the fields with their accepted values (`fr`, `ar`, `us`…), plus the
  equivalent constants for a manual edit;
- the privacy statement: nothing is sent to a server, values stay on the
  machine (browser storage or the file itself);
- a link back to `https://script.jamesserver.fr/#<script-id>`.

## 6. Userscript conventions

- Metadata in English, one `@match` per targeted page, the strict `@grant` list
  actually used (`GM_xmlhttpRequest` and `GM_addStyle` for network and styles,
  `GM_getValue`/`GM_setValue` for persisted settings), `@connect` for every host
  contacted, `@icon` pointing at the `icon.png` of the folder.
- The code is wrapped in an IIFE with `'use strict'`, no external dependency.
- **Bump `@version`** on every change: the site reads it, the managers use it to
  update. The user must reinstall to get a new version.
- Configuration priority, when a script has settings:
  1. values saved with `GM_setValue` (the in-page settings panel),
  2. values carried by the install URL (`GM_info.script.downloadURL`),
  3. the constants of the file.
  Never require a server: the settings panel opens automatically when nothing
  is configured.
- The API key field of a settings panel is a **password field** with a show/hide
  toggle, and the key is required as soon as the feature that uses it is on.
- No `console.log` noise: only one `console.info` summarising the resolved
  configuration at startup.

## 7. Screenshots

- Capture on the real website, `deviceScaleFactor: 2`, cropped to the useful
  area; PNG.
- Store them in `<script>/screenshots/` for the READMEs **and** copy them into
  `docs/assets/` for the site: GitHub Pages only serves `docs/`, so a
  `../<script>/…` path would 404.
- Give them a descriptive English `alt`.

## 8. Verification before pushing

- `node --check` on every JS file touched (`docs/app.js` and the userscripts).
- Open the site with Playwright (`channel: 'chrome'`) and check: the panel of the
  script shows the screenshot at the top, the Install button links to the raw
  `.user.js`, no console error. The settings panel of a userscript is tested on
  the real target site (Playwright, `channel: 'chrome'`, GM stubs).
- After `git push`, wait for the Pages build
  (`gh api repos/JamesDAdams/my-violentmonkey-scripts/pages/builds/latest`)
  and for the raw CDN (`max-age=300`) before announcing a new version.

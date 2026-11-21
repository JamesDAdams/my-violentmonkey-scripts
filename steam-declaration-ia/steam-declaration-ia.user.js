// ==UserScript==
// @name         Steam — AI disclosure
// @namespace    https://store.steampowered.com/
// @version      4.1.0
// @description  Adds an "AI" row on Steam game pages and an "AI" badge on store thumbnails, based on the developer's generative-AI disclosure. Local cache, no third-party service.
// @icon         https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/steam-declaration-ia/icon.png
// @match        https://store.steampowered.com/*
// @run-at       document-idle
// @inject-into  content
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';
  const IS_APP_PAGE = /^\/app\/\d+/.test(location.pathname);
  const NODE_ID = 'centu-ia-glance';
  const STYLE_ID = 'centu-ia-style';
  const CACHE_KEY = 'centuIA/status/v2';
  const OLD_KEY = 'centuIA/status/v1';
  const PAUSE_KEY = 'centuIA/pause/v1';
  const TTL = 30 * 24 * 3600 * 1000;   // 30 jours
  const TTL_UNKNOWN = 3 * 24 * 3600 * 1000; // statut illisible (contrôle d'âge, 404)
  const RATE_MAX = 30;                  // requêtes max par minute
  const RATE_WINDOW = 60 * 1000;
  const MAX_PAGE = 80;                  // plafond par page vue
  const GAP = 800;                      // ms entre deux requêtes
  const PAUSE_MS = 10 * 60 * 1000;

  /* ---------- Langue de l'interface : navigateur, FR sinon EN ---------- */
  const LANG = (() => {
    const l = String(navigator.language || document.documentElement.lang || 'en').toLowerCase();
    return l.startsWith('fr') ? 'fr' : 'en';
  })();

  const STRINGS = {
    fr: {
      badge: 'IA',
      label: 'IA :',
      aria: 'Déclaration d’usage d’IA',
      ageGate: 'non consultable (contrôle d’âge)',
      ageGateTitle: 'La fiche est masquée par le contrôle d’âge de Steam.',
      none: 'aucune déclaration',
      noneTitle: 'Steam impose de déclarer l’usage d’IA générative ; cette fiche n’en comporte pas.',
      noUse: 'aucun usage déclaré',
      noUseTitle: 'Le développeur déclare ne pas recourir à l’IA, ou l’avoir retirée.',
      unclear: 'déclaration présente, sans usage reconnu',
      unclearTitle: 'Le texte de la déclaration ne correspond à aucune catégorie connue.',
      link: 'déclaration ↓',
      linkTitle: 'Rejoindre la déclaration complète sur cette fiche',
      badgeTip: 'Déclaration d’usage d’IA',
      badgeTipCats: 'Déclaration d’usage d’IA : ',
      sep: ' : ',
      states: { mentioned: 'Usage déclaré', denied: 'Déclaré absent', removed: 'Retiré', uncertain: 'À préciser', mixed: 'À vérifier', unmentioned: 'Non mentionné' }
    },
    en: {
      badge: 'AI',
      label: 'AI:',
      aria: 'AI usage disclosure',
      ageGate: 'unavailable (age check)',
      ageGateTitle: 'This page is hidden behind Steam’s age check.',
      none: 'no disclosure',
      noneTitle: 'Steam requires developers to disclose generative AI use; this page has none.',
      noUse: 'no declared use',
      noUseTitle: 'The developer states no AI is used, or that it was removed.',
      unclear: 'disclosure present, no recognized use',
      unclearTitle: 'The disclosure text does not match any known category.',
      link: 'disclosure ↓',
      linkTitle: 'Jump to the full disclosure on this page',
      badgeTip: 'AI usage disclosure',
      badgeTipCats: 'Declared AI usage: ',
      sep: ': ',
      states: { mentioned: 'Declared use', denied: 'Declared unused', removed: 'Removed', uncertain: 'Needs clarification', mixed: 'Mentions to check', unmentioned: 'Not mentioned' }
    }
  };
  const T = STRINGS[LANG];

  /* ============================================================
     1. LECTURE DE LA FICHE  (logique reprise de parser.js)
     ============================================================ */

  const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
  const norm = s => String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'").toLowerCase()
    .replace(/\b(does|do|did|is|are|was|were|has|have|can|could|would|should|must)n['’]t\b/g, '$1 not');

  const definitions = [
    ['visual', 'Graphismes', 'image', /\b(?:artworks?|art|illustrations?|images?|graphics?|graphismes?|graphiques?|textures?|materials?|materiaux|sprites?|portraits?|backgrounds?|arriere[- ]plans?|visuels?|visuals?|2d assets?|3d models?|modeles? 3d)\b/g],
    ['animation', 'Animation / vidéo', 'film', /\b(?:animations?|videos?|cinematics?|cinematiques?|cutscenes?|mocap|motion capture|lip[- ]?sync|synchronisation labiale)\b/g],
    ['sound', 'Musique / bruitages', 'music', /\b(?:music|musiques?|soundtracks?|bandes?[- ]son|compositions?|sound effects?|effets? sonores?|bruitages?|sfx|sound design|audio|sons?|sounds?|suno|udio)\b/g],
    ['voice', 'Voix', 'mic', /\b(?:voices?|voix|voice[- ]?(?:overs?|acting|cloning)|doublages?|narration|speech|text[- ]to[- ]speech|tts|synthese vocale|elevenlabs)\b/g],
    ['text', 'Textes / scénario', 'text', /\b(?:texts?|textes?|story|stories|storylines?|histoires?|scenarios?|dialogues?|dialogs?|writing|ecriture|narrative|narratif|descriptions?)\b/g],
    ['translation', 'Traduction', 'translate', /\b(?:translations?|traductions?|translat(?:e|ed|ing)|traduit(?:s|es)?|traduire|locali[sz](?:ations?|e|ed|ing)|deepl)\b/g],
    ['code', 'Code', 'code', /\b(?:code|coding|programming|programmation|scripts?|scripting|copilot|algorithmes?|algorithms?|debugging|debug|debogage|optimization|optimisation)\b/g],
    ['promotion', 'Contenu promotionnel', 'megaphone', /\b(?:promotional|promotionnels?|promotionnelles?|promotion|marketing|capsules?|capsule art|headers?|banners?|bannieres?|trailers?|key art|store(?:front)? (?:page|art|images?|assets?|description)|page (?:de la )?(?:boutique|steam)|visuels? (?:de |du )?(?:magasin|boutique)|press kit|communiques? de presse)\b/g],
    ['runtime', 'IA pendant la partie', 'gamepad', /\b(?:runtime|run[- ]time|real[- ]time|temps reel|live[- ]generated|live generation|on[- ]the[- ]fly|a la volee|while (?:the game is )?running|during gameplay|pendant (?:la partie|le jeu)|in[- ]game (?:ai|generation)|ia (?:en jeu|in[- ]game))\b/g],
    ['other', 'Autres usages', 'layers', /\b(?:concept art|concepts?|brainstorm(?:ing)?|ideation|prototyp(?:e|es|ing|age)|references?|moodboards?|research|recherche|inspiration|planning|planification|testing|tests?|assurance qualite|documentation|internal tools?|outils? internes?)\b/g]
  ];

  const EN_LABELS = {
    visual: 'Graphics', animation: 'Animation / video', sound: 'Music / sound effects',
    voice: 'Voices', text: 'Text / story', translation: 'Translation',
    code: 'Code', promotion: 'Promotional content', runtime: 'AI during gameplay',
    other: 'Other uses'
  };
  const FR_LABELS = Object.fromEntries(definitions.map(d => [d[0], d[1]]));
  const CAT_IDS = new Set(definitions.map(d => d[0]));
  const LABEL_TO_ID = {};
  for (const [id, fr] of Object.entries(FR_LABELS)) { LABEL_TO_ID[fr] = id; LABEL_TO_ID[EN_LABELS[id]] = id; }
  const catLabel = id => (LANG === 'fr' ? FR_LABELS[id] : EN_LABELS[id]) || id;

  const scopeRE = /\b(?:concept art|moodboards?|brainstorming|ideation|references?|inspiration|prototyp(?:e|es|ing|age))\b/;
  const promoRE = definitions.find(d => d[0] === 'promotion')[3];

  function stateFor(clause, start, end) {
    const s = norm(clause), left = s.slice(0, start), right = s.slice(end);
    const localLeft = left.slice(-150), localRight = right.slice(0, 100);
    if (/\bnot all\b|\bpas tous\b/.test(localLeft)) return 'uncertain';
    if (/\b(?:no|not|never|without|aucun[e]?|sans|pas|jamais)\b(?:[\s,:-]+[\w'-]+){0,20}[\s,:-]*$/.test(localLeft) && !/\bnot only\b|\bpas seulement\b/.test(localLeft)) return 'denied';
    if (/^\s*[:=(]?\s*(?:%\s*0(?:[.,]0+)?(?![\d.,])|0(?:[.,]0+)?\s*%)/.test(localRight) || /(?:^|\s)%\s*0\s*$/.test(localLeft)) return 'denied';
    if (/\b(?:is|are|was|were|n'est|ne sont|n'ont|n'a)\b.{0,12}\b(?:not|never|pas|jamais)\b/.test(localRight.slice(0, 45)) || /^(?:\W+\w+){0,3}\W+(?:hand[- ]?(?:made|drawn)|human[- ]made|faits? main|dessines? a la main)\b/.test(localRight)) return 'denied';
    if (/\b(?:may|might|could|possibly|potentially|peut-etre|pourrait|pourraient|envisage|will use|plan(?:s|ned)? to use|intend(?:s)? to use)\b/.test(localLeft)) return 'uncertain';
    if (/\b(?:have been|were|was|are|ont ete|a ete)\s+(?:fully |entierement )?(?:removed|replaced|retires?|remplaces?)\b/.test(s) && !/\b(?:will|plan|intend|seront|sera|prevu)\b/.test(s)) return 'removed';
    return 'mentioned';
  }

  function classifyAI(raw) {
    const text = String(raw || ''), hits = [];
    const sentences = text.replace(/\b(?:[A-Za-z]\.){2,}/g, m => m.replace(/\./g, '∯'))
      .split(/(?<=[.!?;])\s+|\n+/).map(s => s.replace(/∯/g, '.'));
    for (const rawSentence of sentences) {
      const chunks = rawSentence.split(/\b(?:but|however|whereas|mais|cependant|tandis que)\b/i);
      for (const rawClause of chunks) {
        const clause = clean(rawClause); if (!clause) continue;
        const s = norm(clause); let matched = false;
        for (const [id, label, , pattern] of definitions) {
          pattern.lastIndex = 0;
          for (const m of s.matchAll(pattern)) {
            const itemStart = s.lastIndexOf(',', m.index) + 1, comma = s.indexOf(',', m.index + m[0].length);
            const item = s.slice(itemStart, comma < 0 ? s.length : comma);
            const state = stateFor(s, m.index, m.index + m[0].length);
            promoRE.lastIndex = 0;
            const promoItem = promoRE.test(item); promoRE.lastIndex = 0;
            const prep = scopeRE.test(item) || (scopeRE.test(s) && /\b(?:only|solely|uniquement|seulement|not (?:included|used)|never (?:included|used)|absents?|non integres?|pas integres?)\b/.test(s));
            if (['visual', 'animation', 'sound', 'voice', 'text', 'translation'].includes(id) && prep) { matched = true; continue; }
            if (['visual', 'animation', 'sound', 'voice', 'text', 'translation'].includes(id) && promoItem) { matched = true; continue; }
            if (id === 'visual' && /background\s+(?:music|sound|audio)/.test(item)) continue;
            if (id === 'sound' && /^(?:audio|sound|sounds|son|sons)$/.test(m[0]) && /\b(?:voice|voices|voix|speech|tts|doublage)\b/.test(item)) continue;
            if (id === 'text' && /text[- ]to[- ]speech|writing\s+code/.test(item)) continue;
            if (id === 'text' && /\b(?:translat(?:ion|e|ed|ing)|traduction|localization|localisation)\b/.test(s) && /\b(?:only|solely|uniquement|seulement)\b/.test(s)) continue;
            hits.push({ id, state, excerpt: clause }); matched = true;
          }
        }
        if (!matched && !/^\W*(?:all|tout|tous|every|each|these|ces|the|le|la|les)?\s*(?:ai[- ]generated|generated|content|contenus?|assets?|outputs?|resultats?)\b.*\b(?:review|revu|refin|retravaill|edit|integrat|quality|qualite|direction)/.test(s) && !/\b(?:no ai|no generative ai|aucune ia|sans ia|not use ai|not used|no artificial intelligence)\b/.test(s)) {
          hits.push({ id: 'other', state: stateFor(s, Math.max(0, s.search(/ai|ia|chatgpt/)), s.length), excerpt: clause });
        }
      }
    }
    const categories = definitions.map(([id, , icon]) => {
      const found = hits.filter(h => h.id === id), states = new Set(found.map(h => h.state));
      let state = 'unmentioned';
      if (states.has('mentioned') && (states.has('denied') || states.has('removed'))) state = 'mixed';
      else if (states.has('mentioned')) state = 'mentioned';
      else if (states.has('uncertain')) state = 'uncertain';
      else if (states.has('removed')) state = 'removed';
      else if (states.has('denied')) state = 'denied';
      return { id, icon, state, evidence: [...new Set(found.map(h => h.excerpt))] };
    });
    return { text, hits, categories };
  }

  function extractAI(doc) {
    const headings = [...doc.querySelectorAll('h2,h3')];
    const heading = headings.find(h => /ai.generated content disclosure|contenu.*genere.*(?:ia|intelligence)|utilisation.*intelligence artificielle/i.test(norm(h.textContent)));
    if (!heading) return { found: false, target: null, ...classifyAI('') };
    const parent = heading.closest('.game_area_description') || heading.parentElement;
    const range = doc.createRange(); range.setStartAfter(heading);
    const next = [...parent.querySelectorAll('h2,h3')].find(h => h !== heading && (heading.compareDocumentPosition(h) & 4));
    if (next) range.setEndBefore(next); else range.setEnd(parent, parent.childNodes.length);
    const fragment = range.cloneContents();
    fragment.querySelectorAll('script,style').forEach(n => n.remove());
    fragment.querySelectorAll('br').forEach(n => n.replaceWith('\n'));
    fragment.querySelectorAll('p,li,div').forEach(n => n.append('\n'));
    let text = fragment.textContent.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    text = text.replace(/^(?:The developers? describe[^:\n]*:|L['’]équipe de développement décrit[^.\n]*[.:]|Les développeurs décrivent[^:\n]*:|Voici comment[^:\n]*:)\s*/i, '').trim();
    return { found: true, target: heading, ...classifyAI(text) };
  }

  const ACTIVE = ['mentioned', 'uncertain', 'mixed'];
  const activeIds = res => res.categories.filter(c => ACTIVE.includes(c.state)).map(c => c.id);

  /* ============================================================
     2. CACHE LOCAL
     ============================================================ */

  let cache = null;

  function readCache() {
    if (cache) return cache;
    cache = {};
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        cache = JSON.parse(raw) || {};
      } else {
        // migration v1 : les catégories y étaient stockées en libellés
        const old = JSON.parse(localStorage.getItem(OLD_KEY) || '{}');
        for (const [id, e] of Object.entries(old)) {
          cache[id] = { ...e, c: (Array.isArray(e.c) ? e.c : []).map(x => (CAT_IDS.has(x) ? x : LABEL_TO_ID[x])).filter(Boolean) };
        }
      }
    } catch { cache = {}; }
    return cache;
  }

  function writeCache() {
    try {
      const keys = Object.keys(cache);
      if (keys.length > 6000) {
        keys.sort((a, b) => (cache[a].t || 0) - (cache[b].t || 0)).slice(0, 1000).forEach(k => delete cache[k]);
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch { /* quota ou stockage bloqué */ }
  }

  function entry(id) {
    const e = readCache()[id];
    if (!e) return null;
    const ttl = e.u ? TTL_UNKNOWN : TTL;
    return Date.now() - (e.t || 0) > ttl ? null : e;
  }

  function remember(id, has, cats, unknown) {
    if (!id) return;
    const c = readCache();
    c[id] = { h: has ? 1 : 0, c: cats || [], t: Date.now() };
    if (unknown) c[id].u = 1;
    writeCache();
  }

  const paused = () => {
    try { return Date.now() - (+localStorage.getItem(PAUSE_KEY) || 0) < PAUSE_MS; } catch { return false; }
  };

  function pause() {
    try { localStorage.setItem(PAUSE_KEY, String(Date.now())); } catch { /* ignoré */ }
    queue.length = 0;
  }

  /* ============================================================
     3. STYLE COMMUN
     ============================================================ */

  const CSS = `
#${NODE_ID}{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;padding:0 0 8px;margin:0 0 2px}
#${NODE_ID} .ci-label{color:#8f98a0;font-size:11px;line-height:17px;letter-spacing:.35px;text-transform:uppercase;white-space:nowrap}
#${NODE_ID} .ci-tag{display:inline-block;padding:0 6px;border-radius:2px;font-size:11px;line-height:17px;text-decoration:none;border:1px solid rgba(255,145,60,.45);background:rgba(255,145,60,.14);color:#ffb06a}
#${NODE_ID} .ci-tag:hover{background:rgba(255,145,60,.28);text-decoration:none}
#${NODE_ID} .ci-tag.uncertain,#${NODE_ID} .ci-tag.mixed{border-style:dashed;border-color:rgba(201,163,74,.55);background:rgba(201,163,74,.14);color:#e6c884}
#${NODE_ID} .ci-muted{color:#8f98a0;font-size:11.5px}
#${NODE_ID} .ci-link{color:#67c1f5;font-size:11px;text-decoration:none;margin-left:2px;white-space:nowrap}
#${NODE_ID} .ci-link:hover{text-decoration:underline}
.centu-ia-badge{position:absolute;top:5px;left:5px;z-index:9;display:inline-block;margin:0;padding:0 7px;border:0;border-radius:3px;background:#ff913c;color:#14161a;font:800 11px/18px Arial,Helvetica,sans-serif;letter-spacing:.6px;text-transform:uppercase;box-shadow:0 1px 4px rgba(0,0,0,.6);cursor:help;pointer-events:auto}
.centu-ia-badge.lg{top:8px;left:8px;padding:0 11px;border-radius:4px;font-size:15px;line-height:24px;letter-spacing:.8px}
`;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).append(style);
  }

  function jump(node) {
    if (!node) return;
    const detail = node.closest('details');
    if (detail) detail.open = true;
    node.scrollMarginTop = '90px';
    node.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }

  const span = (cls, text) => {
    const n = document.createElement('span');
    n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* ============================================================
     4. MODE FICHE DE JEU : ligne « IA » dans le glance
     ============================================================ */

  function targetGlance() {
    return document.querySelector('#glanceMidCtn .glance_ctn_responsive_left')
      || document.querySelector('.glance_ctn_responsive_left')
      || document.querySelector('#glanceMidCtn');
  }

  function buildGlance(res, ready) {
    const box = document.createElement('div');
    box.id = NODE_ID;
    box.setAttribute('aria-label', T.aria);
    box.append(span('ci-label', T.label));

    if (!ready) {
      const m = span('ci-muted', T.ageGate);
      m.title = T.ageGateTitle;
      box.append(m);
      return box;
    }

    if (!res.found) {
      const m = span('ci-muted', T.none);
      m.title = T.noneTitle;
      box.append(m);
      return box;
    }

    const active = res.categories.filter(c => ACTIVE.includes(c.state));
    if (!active.length) {
      const none = res.categories.some(c => ['denied', 'removed'].includes(c.state));
      const m = span('ci-muted', none ? T.noUse : T.unclear);
      m.title = none ? T.noUseTitle : T.unclearTitle;
      box.append(m);
    }

    for (const c of active) {
      const tag = document.createElement('a');
      tag.className = 'ci-tag ' + c.state;
      tag.href = '#';
      tag.textContent = catLabel(c.id);
      const excerpt = clean(c.evidence[0] || '');
      tag.title = catLabel(c.id) + ' — ' + T.states[c.state] + (excerpt ? T.sep + (excerpt.length > 210 ? excerpt.slice(0, 207) + '…' : excerpt) : '');
      tag.setAttribute('aria-label', tag.title);
      tag.addEventListener('click', e => { e.preventDefault(); jump(res.target); });
      box.append(tag);
    }

    if (res.target) {
      const link = document.createElement('a');
      link.className = 'ci-link';
      link.href = '#';
      link.textContent = T.link;
      link.title = T.linkTitle;
      link.addEventListener('click', e => { e.preventDefault(); jump(res.target); });
      box.append(link);
    }

    return box;
  }

  function initAppPage() {
    let signature = '', timer = null;

    const scan = () => {
      timer = null;
      const ready = !document.querySelector('#agecheck_form, .agegate_birthday_selector');
      let res;
      try { res = extractAI(document); }
      catch { res = { found: false, target: null, text: '', categories: [] }; }

      const appid = (location.pathname.match(/^\/app\/(\d+)/) || [])[1];
      if (ready && appid) remember(appid, res.found, activeIds(res));

      const host = targetGlance();
      const existing = document.getElementById(NODE_ID);
      const sig = JSON.stringify([ready, res.found, res.text, res.categories.map(c => [c.id, c.state, c.evidence])]);
      if (!host) { if (existing) existing.remove(); return; }
      if (sig === signature && existing && host.contains(existing)) return;
      signature = sig;

      ensureStyle();
      const node = buildGlance(res, ready);
      if (existing && existing.parentNode) existing.replaceWith(node);
      else host.prepend(node);
    };

    const schedule = () => { clearTimeout(timer); timer = setTimeout(scan, 400); };

    const observer = new MutationObserver(ms => {
      const node = document.getElementById(NODE_ID);
      if (node && ms.every(m => m.target === node || node.contains(m.target))) return;
      schedule();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    addEventListener('popstate', schedule);
    scan();
  }

  /* ============================================================
     5. MODE LISTES : bandeau « IA » sur les vignettes
     ============================================================ */

  const known = new Map();     // appid -> [{ el, img }]
  const queued = new Set();
  const queue = [];
  let busy = false, total = 0, retry = null, stamps = [];

  const APP_SELECTOR = 'a[href*="/app/"], [data-ds-appid], [data-appid]';

  function appIdOf(el) {
    const href = (el.getAttribute && el.getAttribute('href')) || '';
    const m = href.match(/\/app\/(\d+)/);
    if (m) return m[1];
    const ds = el.getAttribute && (el.getAttribute('data-ds-appid') || el.getAttribute('data-appid'));
    return ds && /^\d{1,10}$/.test(ds) ? ds : null;
  }

  function pickImage(el) {
    let best = null, area = 0;
    for (const img of el.querySelectorAll('img')) {
      const r = img.getBoundingClientRect();
      const a = r.width * r.height;
      if (a > area) { area = a; best = img; }
    }
    if (!best || area < 3600) return null;   // < 60 × 60 : logo, icône
    return best;
  }

  function addBadge(img, e) {
    let holder = img.parentElement;
    if (!holder) return;
    if (holder.tagName === 'PICTURE' && holder.parentElement) holder = holder.parentElement;
    if (holder.querySelector(':scope > .centu-ia-badge')) return;
    if (getComputedStyle(holder).position === 'static') holder.style.position = 'relative';
    const badge = span('centu-ia-badge' + (img.getBoundingClientRect().width >= 240 ? ' lg' : ''), T.badge);
    badge.title = e.c && e.c.length
      ? T.badgeTipCats + e.c.map(catLabel).join(', ')
      : T.badgeTip;
    badge.setAttribute('aria-label', badge.title);
    holder.append(badge);
  }

  function apply(id) {
    const e = entry(id);
    if (!e || !e.h) return;
    for (const { img } of known.get(id) || []) addBadge(img, e);
  }

  // 30 requêtes / minute glissante, 80 par page : les bandeaux continuent d'arriver au défilement.
  function throttled() {
    const now = Date.now();
    stamps = stamps.filter(t => now - t < RATE_WINDOW);
    return stamps.length >= RATE_MAX;
  }

  function decorate(el) {
    if (!el || el.dataset.centuIa) return;
    const id = appIdOf(el);
    if (!id) return;
    const img = pickImage(el);
    if (!img) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < -400 || r.top > innerHeight * 1.6 || r.width < 40) return;   // revu au défilement

    el.dataset.centuIa = id;
    if (!known.has(id)) known.set(id, []);
    const list = known.get(id);
    if (!list.some(x => x.el === el)) list.push({ el, img });

    const e = entry(id);
    if (e) { if (e.h) addBadge(img, e); return; }
    enqueue(id, false);
  }

  function enqueue(id, front) {
    if (queued.has(id)) return;
    queued.add(id);
    if (front) queue.unshift(id); else queue.push(id);
    pump();
  }

  function pump() {
    if (busy || !queue.length || paused() || total >= MAX_PAGE) return;
    if (throttled()) { clearTimeout(retry); retry = setTimeout(pump, 1500); return; }

    busy = true; total++; stamps.push(Date.now());
    const id = queue.shift();

    fetch('/app/' + id + '/?l=french', { credentials: 'same-origin', cache: 'no-store' })
      .then(r => {
        if (r.status === 429 || r.status >= 500) throw new Error('http ' + r.status);
        if (r.status === 404) { remember(id, false, [], true); return null; }
        if (!r.ok) throw new Error('http ' + r.status);
        return r.text();
      })
      .then(html => {
        if (html == null) return;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (doc.querySelector('#agecheck_form, .agegate_birthday_selector')) { remember(id, false, [], true); return; }
        const res = extractAI(doc);
        remember(id, res.found, activeIds(res));
        apply(id);
      })
      .catch(() => { pause(); })
      .finally(() => {
        busy = false;
        if (queue.length) setTimeout(pump, GAP);
      });
  }

  function collect(root) {
    if (!root || root.nodeType !== 1) return;
    ensureStyle();
    if (root.matches && root.matches(APP_SELECTOR)) decorate(root);
    for (const el of root.querySelectorAll(APP_SELECTOR)) decorate(el);
  }

  function initBrowse() {
    collect(document.documentElement);

    // survol : le jeu sous le curseur passe en tête de file
    addEventListener('mouseover', ev => {
      const el = ev.target && ev.target.closest && ev.target.closest(APP_SELECTOR);
      if (!el) return;
      const id = appIdOf(el);
      if (!id || entry(id) || !pickImage(el)) return;
      enqueue(id, true);
    }, { passive: true });

    let pending = null, scanTimer = null;
    const added = new Set();
    const flush = () => {
      scanTimer = null;
      const nodes = [...added]; added.clear();
      for (const n of nodes) collect(n);
    };

    new MutationObserver(ms => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (n.nodeType !== 1 || n.classList?.contains('centu-ia-badge')) continue;
        added.add(n);
      }
      if (!added.size) return;
      clearTimeout(scanTimer);
      scanTimer = setTimeout(flush, 350);
    }).observe(document.documentElement, { childList: true, subtree: true });

    addEventListener('scroll', () => {
      clearTimeout(pending);
      pending = setTimeout(() => collect(document.documentElement), 250);
    }, { passive: true });
    addEventListener('resize', () => collect(document.documentElement), { passive: true });
    addEventListener('popstate', () => collect(document.documentElement));
  }

  /* ============================================================ */

  if (IS_APP_PAGE) initAppPage();
  else initBrowse();
})();

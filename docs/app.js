/* Page statique : menu latéral, bascule FR/EN, version lue dans le script. */
(() => {
  'use strict';

  const I18N = {
    en: {
      title: 'My Violentmonkey scripts',
      subtitle: 'Small userscripts for Steam and the web, installed in one click.',
      'steam.name': 'AI disclosure',
      'steam.navDesc': 'Steam store',
      'steam.desc': 'Steam requires developers to disclose generative-AI use. This script brings that disclosure where you actually look: on the game page, and on every thumbnail across the store.',
      'steam.f1': 'An “AI” row in the glance box of each game page, with one tag per declared use (graphics, voices, translation, code, in-game AI…).',
      'steam.f2': 'An “AI” badge on thumbnails in search, home, tags and sales; declared uses appear in the tooltip.',
      'steam.f3': 'Classification and 30-day cache run locally — no account, no third-party service.',
      install: 'Install',
      details: 'Details',
      'steam.meta': 'French / English interface',
      'discord.name': 'Invite → open tab',
      'discord.navDesc': 'Discord web',
      'discord.desc': 'On a Discord invite page, the usual flow loads Discord in the current tab — login screen included. This script adds a button that sends the invite straight to the Discord tab you already have open, already logged in.',
      'discord.f1': 'A “Send to my Discord tab” button under “Create Account”, on discord.com/invite/… and discord.gg/…',
      'discord.f2': 'The invite code travels through the userscript storage, then your Discord tab opens the invite and takes focus.',
      'discord.f3': 'No network request and no analytics: everything stays between your two tabs.',
      'discord.meta': 'Requires an open Discord tab',
      'help.title': 'No userscript manager yet?',
      'help.text': 'The Install button opens the script file. Violentmonkey or Tampermonkey catches it and offers to install — without one, the browser simply displays the code.',
      'help.btn': 'Get Violentmonkey',
      footer: 'Source code, changelog and detailed README on GitHub.'
    },
    fr: {
      title: 'Mes scripts Violentmonkey',
      subtitle: 'Petits userscripts pour Steam et le web, installés en un clic.',
      'steam.name': 'Déclaration IA',
      'steam.navDesc': 'Magasin Steam',
      'steam.desc': 'Steam impose aux développeurs de déclarer l’usage d’IA générative. Ce script ramène cette déclaration là où vous regardez vraiment : sur la fiche du jeu, et sur chaque vignette du magasin.',
      'steam.f1': 'Une ligne « IA » dans l’encart glance de chaque fiche, avec un tag par usage déclaré (graphismes, voix, traduction, code, IA en jeu…).',
      'steam.f2': 'Un bandeau « IA » sur les vignettes des recherches, de l’accueil, des tags et des promotions ; les usages s’affichent en infobulle.',
      'steam.f3': 'Classification et cache de 30 jours en local — pas de compte, pas de service tiers.',
      install: 'Installer',
      details: 'Détails',
      'steam.meta': 'Interface français / anglais',
      'discord.name': 'Invitation → onglet',
      'discord.navDesc': 'Discord web',
      'discord.desc': 'Sur une page d’invitation Discord, le parcours classique charge Discord dans l’onglet courant — écran de connexion compris. Ce script ajoute un bouton qui envoie l’invitation directement à l’onglet Discord déjà ouvert, déjà connecté.',
      'discord.f1': 'Un bouton « Envoyer vers mon onglet Discord » sous « Create Account », sur discord.com/invite/… et discord.gg/…',
      'discord.f2': 'Le code d’invitation transite par le stockage du gestionnaire de userscripts, puis l’onglet Discord ouvre l’invitation et reprend le focus.',
      'discord.f3': 'Aucune requête réseau, aucune analyse : tout reste entre vos deux onglets.',
      'discord.meta': 'Nécessite un onglet Discord ouvert',
      'help.title': 'Pas encore de gestionnaire de userscripts ?',
      'help.text': 'Le bouton Installer ouvre le fichier du script. Violentmonkey ou Tampermonkey l’intercepte et propose l’installation — sans gestionnaire, le navigateur affiche simplement le code.',
      'help.btn': 'Installer Violentmonkey',
      footer: 'Code source, changelog et README détaillé sur GitHub.'
    }
  };

  const HERO = {
    en: { src: 'assets/vignette-ia.png', alt: 'AI badge on a Steam game thumbnail' },
    fr: { src: 'assets/vignette-ia.png', alt: 'Bandeau IA sur une vignette de jeu Steam' }
  };

  const STORAGE_KEY = 'mv-scripts-lang';

  /* ---------- langue ---------- */

  const stored = (() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  })();
  let lang = stored === 'fr' || stored === 'en'
    ? stored
    : (String(navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en');

  const applyLang = next => {
    lang = I18N[next] ? next : 'en';
    document.documentElement.lang = lang;
    for (const el of document.querySelectorAll('[data-i18n]')) {
      const text = I18N[lang][el.dataset.i18n];
      if (text != null) el.textContent = text;
    }
    for (const btn of document.querySelectorAll('[data-lang]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    }
    document.title = I18N[lang].title;
    const hero = document.getElementById('hero');
    if (hero && HERO[lang]) { hero.src = HERO[lang].src; hero.alt = HERO[lang].alt; }
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* stockage bloqué */ }
  };

  for (const btn of document.querySelectorAll('[data-lang]')) {
    btn.addEventListener('click', () => applyLang(btn.dataset.lang));
  }

  applyLang(lang);

  /* ---------- sélection du script ---------- */

  const select = (id, updateHash) => {
    const panels = [...document.querySelectorAll('.panel')];
    if (!panels.length) return;
    if (!panels.some(p => p.id === 'panel-' + id)) id = panels[0].id.replace(/^panel-/, '');
    for (const p of panels) p.hidden = p.id !== 'panel-' + id;
    for (const b of document.querySelectorAll('.nav-item')) {
      const on = b.dataset.panel === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-current', on ? 'page' : 'false');
    }
    if (updateHash) {
      try { history.replaceState(null, '', '#' + id); } catch { /* file:// */ }
    }
  };

  // délégation : tout nouvel item ajouté dans .nav fonctionne
  document.querySelector('.nav')?.addEventListener('click', e => {
    const b = e.target.closest('.nav-item');
    if (!b) return;
    select(b.dataset.panel, true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

  addEventListener('hashchange', () => select((location.hash || '').slice(1), false));

  select((location.hash || '').slice(1) || document.querySelector('.nav-item')?.dataset.panel, false);

  /* ---------- version réelle du script ---------- */

  for (const el of document.querySelectorAll('[data-version-src]')) {
    fetch(el.dataset.versionSrc, { cache: 'no-store' })
      .then(r => (r.ok ? r.text() : null))
      .then(txt => {
        const m = txt && txt.match(/^\/\/\s*@version\s+(\S+)/m);
        if (m) el.textContent = 'v' + m[1];
      })
      .catch(() => { /* hors ligne : version statique */ });
  }
})();

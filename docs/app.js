/* Page statique : bascule FR/EN + version à jour du script. Aucune dépendance. */
(() => {
  'use strict';

  const I18N = {
    en: {
      title: 'My Violentmonkey scripts',
      subtitle: 'Userscripts for the Steam store, installed in one click.',
      'steam.name': 'AI disclosure',
      'steam.desc': 'Steam requires developers to disclose generative-AI use. This script brings that disclosure where you actually look: on the game page, and on every thumbnail across the store.',
      'steam.f1': 'An “AI” row in the glance box of each game page, with one tag per declared use (graphics, voices, translation, code, in-game AI…).',
      'steam.f2': 'An “AI” badge on thumbnails in search, home, tags and sales; declared uses appear in the tooltip.',
      'steam.f3': 'Classification and 30-day cache run locally — no account, no third-party service.',
      install: 'Install',
      details: 'Details',
      'steam.meta': 'French / English interface',
      'help.title': 'No userscript manager yet?',
      'help.text': 'The Install button opens the script file. Violentmonkey or Tampermonkey catches it and offers to install — without one, the browser simply displays the code.',
      'help.btn': 'Get Violentmonkey',
      footer: 'Source code, changelog and detailed README on GitHub.'
    },
    fr: {
      title: 'Mes scripts Violentmonkey',
      subtitle: 'Userscripts pour le magasin Steam, installés en un clic.',
      'steam.name': 'Déclaration IA',
      'steam.desc': 'Steam impose aux développeurs de déclarer l’usage d’IA générative. Ce script ramène cette déclaration là où vous regardez vraiment : sur la fiche du jeu, et sur chaque vignette du magasin.',
      'steam.f1': 'Une ligne « IA » dans l’encart glance de chaque fiche, avec un tag par usage déclaré (graphismes, voix, traduction, code, IA en jeu…).',
      'steam.f2': 'Un bandeau « IA » sur les vignettes des recherches, de l’accueil, des tags et des promotions ; les usages s’affichent en infobulle.',
      'steam.f3': 'Classification et cache de 30 jours en local — pas de compte, pas de service tiers.',
      install: 'Installer',
      details: 'Détails',
      'steam.meta': 'Interface français / anglais',
      'help.title': 'Pas encore de gestionnaire de userscripts ?',
      'help.text': 'Le bouton Installer ouvre le fichier du script. Violentmonkey ou Tampermonkey l’intercepte et propose l’installation — sans gestionnaire, le navigateur affiche simplement le code.',
      'help.btn': 'Installer Violentmonkey',
      footer: 'Code source, changelog et README détaillé sur GitHub.'
    }
  };

  const HERO = {
    en: { src: 'assets/preview-en.png', alt: 'Steam game page with the AI row listing the declared uses' },
    fr: { src: 'assets/preview-fr.png', alt: 'Fiche Steam avec la ligne « IA » listant les usages déclarés' }
  };

  const STORAGE_KEY = 'mv-scripts-lang';

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

  /* Version réelle du script, lue dans son en-tête (repli sur la valeur statique). */
  const versionEl = document.getElementById('steam-version');
  const installEl = document.getElementById('install-steam');
  if (versionEl && installEl) {
    fetch(installEl.href, { cache: 'no-store' })
      .then(r => (r.ok ? r.text() : null))
      .then(txt => {
        const m = txt && txt.match(/^\/\/\s*@version\s+(\S+)/m);
        if (m) versionEl.textContent = 'v' + m[1];
      })
      .catch(() => { /* hors ligne : on garde la version statique */ });
  }
})();

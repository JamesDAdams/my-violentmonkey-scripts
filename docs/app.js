/* Page statique : menu latéral, bascule FR/EN, version lue dans le script. */
(() => {
  'use strict';
  if (window.__mvReady) return;   // évite une double initialisation
  window.__mvReady = true;

  const I18N = {
    en: {
      title: 'My Violentmonkey scripts',
      subtitle: 'Userscripts for Steam, Discord and the web, installed in one click.',
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
      'discord.alt': 'Discord invite page with the green “Send to my Discord tab” button',
      'region.name': 'Region + key price',
      'region.navDesc': 'Steam store',
      'region.desc': 'Two badges on the purchase box: the Steam price of the country you pick, and the cheapest key price on GG.deals. DLC rows get them too.',
      'region.f1': 'Choose any country for the Steam price — Argentina, Turkey, the US… — and any region for key prices.',
      'region.f2': 'The key price comes from GG.deals with your own free API key; badges link straight to SteamDB and GG.deals.',
      'region.f3': 'Your key and your regions stay inside the script, on your computer.',
      'region.configure': 'Configure & install',
      'region.meta': 'GG.deals API key required for key prices',
      'cfg.onSteam': 'Steam price',
      'cfg.onKeys': 'GG.deals key price',
      'cfg.oneRequired': 'Keep at least one of the two sections enabled.',
      'cfg.title': 'Configure the script',
      'cfg.sub': 'Three values, then the script is generated for you.',
      'cfg.key': 'GG.deals API key',
      'cfg.keyHint': 'Required to show the key price.',
      'cfg.keyLink': 'Generate a free key on GG.deals',
      'cfg.keyRequired': 'Enter an API key: it is required to show the key price.',
      'cfg.keyOpt': 'optional, the key badge will ask for one',
      'cfg.region': 'GG.deals region (key prices)',
      'cfg.steam': 'Steam region (store price)',
      'cfg.privacy': 'Nothing is stored by this site: no server, no database, no cookie. The script is generated in your browser and downloaded to your computer — your key never leaves it.',
      'cfg.cancel': 'Cancel',
      'cfg.generate': 'Generate the script',
      'cfg.copy': 'Copy the code',
      'cfg.close': 'Close',
      'cfg.search': 'Search a country…',
      'cfg.installing': 'Opening the install page… After installing, open a Steam game page: the script reads the values from the install URL, and if they did not survive, a settings panel opens so you can paste your key once. Everything stays on your machine.',
      'cfg.installFallback': 'Values not applied? Click the ⚙ badge on a Steam game page to set them, open the install page manually, or download a copy:',
      'cfg.openInstall': 'Open the install page',
      'cfg.download': 'Download a copy',
      'cfg.copied': 'Code copied to the clipboard.',
      'cfg.copyFailed': 'Copy failed — select the code manually.',
      'cfg.error': 'Could not download the template. Check your connection and try again.',
      'cfg.selected': 'Selected',
      'help.title': 'No userscript manager yet?',
      'help.text': 'The Install button opens the script file. Violentmonkey or Tampermonkey catches it and offers to install — without one, the browser simply displays the code.',
      'help.btn': 'Get Violentmonkey',
      footer: 'Source code, changelog and detailed README on GitHub.'
    },
    fr: {
      title: 'Mes scripts Violentmonkey',
      subtitle: 'Userscripts pour Steam, Discord et le web, installés en un clic.',
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
      'discord.alt': 'Page d’invitation Discord avec le bouton vert « Envoyer vers mon onglet Discord »',
      'region.name': 'Prix région + clé',
      'region.navDesc': 'Boutique Steam',
      'region.desc': 'Deux badges sur l’encart d’achat : le prix Steam du pays choisi, et le prix clé le moins cher sur GG.deals. Les lignes de DLC en profitent aussi.',
      'region.f1': 'Choisissez n’importe quel pays pour le prix Steam — Argentine, Turquie, États-Unis… — et n’importe quelle région pour les prix des clés.',
      'region.f2': 'Le prix des clés vient de GG.deals avec votre propre clé API gratuite ; les badges renvoient vers SteamDB et GG.deals.',
      'region.f3': 'Votre clé et vos régions restent dans le script, sur votre ordinateur.',
      'region.configure': 'Configurer & installer',
      'region.meta': 'Clé API GG.deals requise pour les prix des clés',
      'cfg.onSteam': 'Prix Steam',
      'cfg.onKeys': 'Prix des clés GG.deals',
      'cfg.oneRequired': 'Gardez au moins une des deux parties active.',
      'cfg.title': 'Configurer le script',
      'cfg.sub': 'Trois valeurs, puis le script est généré pour vous.',
      'cfg.key': 'Clé API GG.deals',
      'cfg.keyHint': 'Obligatoire pour afficher le prix des clés.',
      'cfg.keyLink': 'Générer une clé gratuite sur GG.deals',
      'cfg.keyRequired': 'Renseignez une clé API : elle est obligatoire pour afficher le prix des clés.',
      'cfg.keyOpt': 'facultatif : le badge clé vous la demandera',
      'cfg.region': 'Région GG.deals (prix des clés)',
      'cfg.steam': 'Région Steam (prix boutique)',
      'cfg.privacy': 'Aucune valeur n’est enregistrée par ce site : pas de serveur, pas de base, pas de cookie. Le script est fabriqué dans votre navigateur et téléchargé sur votre ordinateur — votre clé ne le quitte jamais.',
      'cfg.cancel': 'Annuler',
      'cfg.generate': 'Générer le script',
      'cfg.copy': 'Copier le code',
      'cfg.close': 'Fermer',
      'cfg.search': 'Rechercher un pays…',
      'cfg.installing': 'Ouverture de la page d’installation… Après l’installation, ouvrez une fiche Steam : le script lit les valeurs dans l’URL d’installation et, si elles n’ont pas suivi, un panneau de réglages s’ouvre pour coller votre clé une fois. Tout reste sur votre machine.',
      'cfg.installFallback': 'Valeurs non appliquées ? Cliquez sur le badge ⚙ d’une fiche Steam pour les régler, ouvrez la page d’installation à la main, ou téléchargez une copie :',
      'cfg.openInstall': 'Ouvrir la page d’installation',
      'cfg.download': 'Télécharger une copie',
      'cfg.copied': 'Code copié dans le presse-papiers.',
      'cfg.copyFailed': 'Copie impossible — sélectionnez le code à la main.',
      'cfg.error': 'Téléchargement du modèle impossible. Vérifiez la connexion et réessayez.',
      'cfg.selected': 'Sélectionné',
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

  const langHooks = [];

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
    for (const el of document.querySelectorAll('[data-i18n-alt]')) {
      const text = I18N[lang][el.dataset.i18nAlt];
      if (text != null) el.alt = text;
    }
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* stockage bloqué */ }
    for (const fn of langHooks) fn();
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

  /* ---------- installeur configuré : prix région + clés ---------- */

  const REGION_TEMPLATE = 'https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/steam-region-price/steam-region-price.user.js';

  const CODES = (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
    'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
    'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
    'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
    'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
    'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
    'UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK'
  ).split(' ');

  const fold = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const flagSrc = code => 'https://flagcdn.com/w20/' + code.toLowerCase() + '.png';
  const countryName = code => {
    const up = String(code).toUpperCase();
    try { return new Intl.DisplayNames([lang], { type: 'region' }).of(up) || up; }
    catch { return up; }
  };
  const flagImg = code => {
    const img = document.createElement('img');
    img.className = 'flag';
    img.alt = '';
    img.loading = 'lazy';
    img.src = flagSrc(code);
    img.addEventListener('error', () => img.remove(), { once: true });
    return img;
  };

  let activePickerClose = null;

  function makePicker(root, initial, onChange) {
    if (!root) return { refresh() {} };
    let value = initial;
    let open = false;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');

    const panel = document.createElement('div');
    panel.className = 'picker-panel';
    panel.hidden = true;

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'picker-search';
    search.placeholder = I18N[lang]['cfg.search'];

    const list = document.createElement('ul');
    list.className = 'picker-list';
    list.setAttribute('role', 'listbox');

    const paintButton = () => {
      btn.textContent = '';
      btn.append(flagImg(value), document.createTextNode(countryName(value)));
      const code = document.createElement('span');
      code.className = 'code';
      code.textContent = value;
      btn.append(code);
    };

    const paintList = filter => {
      const q = fold(String(filter || '').trim());
      list.textContent = '';
      const frag = document.createDocumentFragment();
      let count = 0;
      for (const code of CODES) {
        const name = countryName(code);
        if (q && !fold(name).includes(q) && !code.toLowerCase().includes(q)) continue;
        const li = document.createElement('li');
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'picker-opt';
        opt.setAttribute('role', 'option');
        opt.setAttribute('aria-selected', String(code.toLowerCase() === value));
        const nm = document.createElement('span');
        nm.textContent = name;
        const cd = document.createElement('span');
        cd.className = 'code';
        cd.textContent = code;
        opt.append(flagImg(code), nm, cd);
        opt.addEventListener('click', () => {
          value = code.toLowerCase();
          paintButton();
          close();
          onChange && onChange(value);
        });
        li.append(opt);
        frag.append(li);
        count++;
      }
      if (!count) {
        const li = document.createElement('li');
        li.className = 'picker-empty';
        li.textContent = '—';
        frag.append(li);
      }
      list.append(frag);
    };

    function placePanel() {
      const r = btn.getBoundingClientRect();
      const below = innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const up = below < 200 && above > below;
      panel.style.position = 'fixed';
      panel.style.left = Math.round(Math.max(8, Math.min(r.left, innerWidth - r.width - 8))) + 'px';
      panel.style.width = Math.round(r.width) + 'px';
      panel.style.maxHeight = Math.round(Math.min(280, Math.max(150, (up ? above : below) - 8))) + 'px';
      if (up) {
        panel.style.top = 'auto';
        panel.style.bottom = Math.round(innerHeight - r.top + 6) + 'px';
      } else {
        panel.style.top = Math.round(r.bottom + 6) + 'px';
        panel.style.bottom = 'auto';
      }
    }

    function openPanel() {
      if (activePickerClose && activePickerClose !== close) activePickerClose();
      activePickerClose = close;
      open = true;
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      search.value = '';
      paintList('');
      placePanel();
      search.focus();
    }
    function close() {
      open = false;
      if (activePickerClose === close) activePickerClose = null;
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', () => (open ? close() : openPanel()));
    search.addEventListener('input', () => paintList(search.value));
    document.addEventListener('click', e => {
      if (open && !root.contains(e.target)) close();
    });
    addEventListener('scroll', e => { if (open && !panel.contains(e.target)) close(); }, true);
    addEventListener('resize', () => { if (open) placePanel(); });
    // Échap est géré au niveau de la modale (elle ferme d'abord la liste).

    panel.append(search, list);
    root.append(btn, panel);
    paintButton();

    langHooks.push(() => {
      search.placeholder = I18N[lang]['cfg.search'];
      paintButton();
      if (open) paintList(search.value);
    });

    return { refresh: paintButton };
  }

  const dlg = document.getElementById('config-dialog');
  if (dlg) {
    const form = document.getElementById('config-form');
    const keyInput = document.getElementById('cfg-key');
    const result = document.getElementById('cfg-result');
    const resultText = document.getElementById('cfg-result-text');
    const resultHint = document.getElementById('cfg-result-hint');
    const actions = document.getElementById('cfg-actions');
    let generated = '';
    let region = 'fr';
    let steam = 'ar';
    let openedAt = 0;

    makePicker(document.getElementById('picker-region'), region, v => { region = v; });
    makePicker(document.getElementById('picker-steam'), steam, v => { steam = v; });

    const openDialog = () => {
      if (dlg.open) return;
      openedAt = Date.now();
      result.hidden = true;
      actions.hidden = false;
      try {
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');          // repli si showModal manque
      } catch {
        dlg.setAttribute('open', '');
        document.documentElement.classList.add('dialog-fallback');
      }
      keyInput.focus();
    };
    const closeDialog = () => {
      try { if (dlg.open) dlg.close(); } catch { /* ignore */ }
      dlg.removeAttribute('open');
      document.documentElement.classList.remove('dialog-fallback');
    };

    const onSteam = document.getElementById('cfg-on-steam');
    const onKeys = document.getElementById('cfg-on-gg');
    const warn = document.getElementById('cfg-toggle-warn');
    const keyWarn = document.getElementById('cfg-key-warn');
    const genBtn = document.getElementById('cfg-generate');
    const fieldKey = document.getElementById('field-key');
    const fieldRegion = document.getElementById('field-region');
    const fieldSteam = document.getElementById('field-steam');

    const refreshToggles = () => {
      const bothOff = !onSteam.checked && !onKeys.checked;
      warn.hidden = !bothOff;
      genBtn.disabled = bothOff;
      fieldKey.classList.toggle('is-off', !onKeys.checked);
      fieldRegion.classList.toggle('is-off', !onKeys.checked);
      fieldSteam.classList.toggle('is-off', !onSteam.checked);
      keyInput.disabled = !onKeys.checked;
      if (!onKeys.checked) keyWarn.hidden = true;
      const b1 = fieldRegion.querySelector('.picker-btn');
      const b2 = fieldSteam.querySelector('.picker-btn');
      if (b1) b1.disabled = !onKeys.checked;
      if (b2) b2.disabled = !onSteam.checked;
    };
    onSteam.addEventListener('change', refreshToggles);
    onKeys.addEventListener('change', refreshToggles);
    refreshToggles();

    const installBtn = document.getElementById('install-region');
    installBtn && installBtn.addEventListener('click', openDialog);

    // Échap : ferme d'abord la liste de pays ouverte, sinon la modale
    dlg.addEventListener('cancel', e => {
      if (activePickerClose) { e.preventDefault(); activePickerClose(); }
    });

    dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeDialog));
    // fermeture par clic sur le fond, mais pas juste après l'ouverture (double-clic sur le bouton)
    dlg.addEventListener('click', e => { if (e.target === dlg && Date.now() - openedAt > 300) closeDialog(); });
    dlg.addEventListener('close', () => document.documentElement.classList.remove('dialog-fallback'));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!onSteam.checked && !onKeys.checked) { refreshToggles(); return; }

      if (onKeys.checked && !keyInput.value.trim()) {
        keyWarn.hidden = false;
        keyInput.focus();
        return;
      }
      keyWarn.hidden = true;
      const key = keyInput.value.trim().replace(/[^A-Za-z0-9_-]/g, '');
      result.hidden = false;
      resultText.textContent = '…';
      try {
        const tpl = await fetch(REGION_TEMPLATE, { cache: 'no-store' }).then(r => {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.text();
        });
        generated = tpl
          .replace(/(const GG_DEALS_API_KEY = )'[^']*';/, (_m, p1) => p1 + "'" + key + "';")
          .replace(/(const GG_DEALS_REGION = )'[^']*';/, (_m, p1) => p1 + "'" + region + "';")
          .replace(/(const STEAM_REGION = )'[^']*';/, (_m, p1) => p1 + "'" + steam + "';")
          .replace(/(const SHOW_STEAM_REGION = )(?:true|false);/, (_m, p1) => p1 + onSteam.checked + ';')
          .replace(/(const SHOW_GGDEALS = )(?:true|false);/, (_m, p1) => p1 + onKeys.checked + ';');

        // URL d'installation : le gestionnaire de userscripts intercepte les *.user.js
        // et le script lit ses valeurs dans cette URL (GM_info.script.downloadURL).
        const installUrl = new URL(REGION_TEMPLATE);
        if (key) installUrl.searchParams.set('k', key);
        installUrl.searchParams.set('gr', region);
        installUrl.searchParams.set('sr', steam);
        installUrl.searchParams.set('s', onSteam.checked ? '1' : '0');
        installUrl.searchParams.set('g', onKeys.checked ? '1' : '0');

        lastInstallUrl = installUrl.toString();
        resultText.textContent = I18N[lang]['cfg.installing'];
        resultHint.textContent = I18N[lang]['cfg.installFallback'];
        openLink.href = lastInstallUrl;
        openLink.textContent = I18N[lang]['cfg.openInstall'];
        dlLink.textContent = I18N[lang]['cfg.download'];
        dlLink.href = URL.createObjectURL(new Blob([generated], { type: 'text/javascript' }));
        dlLink.download = 'steam-region-price.user.js';
        result.hidden = false;
        actions.hidden = true;

        setTimeout(() => { window.location.assign(lastInstallUrl); }, 450);
      } catch (err) {
        resultText.textContent = I18N[lang]['cfg.error'];
      }
    });

    const openLink = document.getElementById('cfg-open-install');
    const dlLink = document.getElementById('cfg-download');
    let lastInstallUrl = '';

    const copyBtn = document.getElementById('cfg-copy');
    copyBtn && copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(generated);
        resultText.textContent = I18N[lang]['cfg.copied'];
      } catch {
        resultText.textContent = I18N[lang]['cfg.copyFailed'];
      }
    });
  }

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

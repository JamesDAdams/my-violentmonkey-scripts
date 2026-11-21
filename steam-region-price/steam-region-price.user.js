// ==UserScript==
// @name         Steam — Region price + key price (GG.deals)
// @namespace    http://tampermonkey.net/
// @version      4.7
// @description  Shows the Steam price of a game in a country of your choice, plus the cheapest key price from GG.deals, right on the store page.
// @icon         https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/steam-region-price/icon.png
// @match        https://store.steampowered.com/app/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      store.steampowered.com
// @connect      api.gg.deals
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================================
    // CONFIGURATION — à définir avant l'installation (ou via le site)
    // =========================================================================
    // 1) Clé API GG.deals, gratuite : https://gg.deals/api/
    const GG_DEALS_API_KEY = 'VOTRE_CLE_API_ICI';

    // 2) Région GG.deals : devise utilisée pour les prix des clés (code pays ISO, ex. 'fr')
    const GG_DEALS_REGION = 'fr';

    // 3) Région Steam : pays dont on veut afficher le prix boutique (code pays ISO, ex. 'ar', 'tr', 'us')
    const STEAM_REGION = 'ar';

    // 4) Parties affichées — on ne peut pas désactiver les deux
    const SHOW_STEAM_REGION = true;   // prix boutique Steam (pays choisi)
    const SHOW_GGDEALS = true;        // prix clé le moins cher (GG.deals)
    // =========================================================================


    // =========================================================================
    // Surcharge par l'installeur du site : l'URL d'installation peut porter
    // ?k=<clé>&gr=<région GG.deals>&sr=<région Steam>&s=1&g=1
    // (rien n'est stocké ailleurs que dans le gestionnaire de userscripts)
    // =========================================================================
    function installParams() {
        try {
            if (typeof GM_info === 'undefined' || !GM_info.script) return {};
            const raw = GM_info.script.downloadURL || GM_info.script.updateURL || '';
            if (!raw) return {};
            const q = new URL(raw).searchParams;
            const out = {};
            if (q.get('k')) out.key = q.get('k');
            if (q.get('gr')) out.gg = q.get('gr').toLowerCase();
            if (q.get('sr')) out.steam = q.get('sr').toLowerCase();
            if (q.has('s')) out.showSteam = q.get('s') !== '0';
            if (q.has('g')) out.showKeys = q.get('g') !== '0';
            return out;
        } catch (e) {
            return {};
        }
    }

    const STORED_KEY = 'steamRegionPrice/config';

    function storedConfig() {
        try {
            if (typeof GM_getValue !== 'function') return null;
            const v = GM_getValue(STORED_KEY, null);
            return (v && typeof v === 'object') ? v : null;
        } catch (e) {
            return null;
        }
    }

    const PARAMS = installParams();
    const STORED = storedConfig();

    function pick(name, fromParams, fromFile) {
        if (STORED && STORED[name] !== undefined && STORED[name] !== '') return STORED[name];
        if (fromParams !== undefined) return fromParams;
        return fromFile;
    }

    const CONF = {
        key: pick('key', PARAMS.key, GG_DEALS_API_KEY),
        ggRegion: pick('ggRegion', PARAMS.gg, GG_DEALS_REGION),
        steamRegion: pick('steamRegion', PARAMS.steam, STEAM_REGION),
        showSteam: pick('showSteam', PARAMS.showSteam, SHOW_STEAM_REGION),
        showKeys: pick('showKeys', PARAMS.showKeys, SHOW_GGDEALS)
    };

    try {
        let rawInstall = '';
        try { rawInstall = (GM_info && GM_info.script && (GM_info.script.downloadURL || GM_info.script.updateURL)) || ''; } catch (e) { rawInstall = ''; }
        console.info('[Steam region] install URL:', rawInstall || '(indisponible)');
        const source = STORED ? 'réglages enregistrés' : (PARAMS.key || PARAMS.gg || PARAMS.steam || PARAMS.s !== undefined ? 'paramètres d’installation' : 'valeurs du fichier');
        console.info('[Steam region] configuration (' + source + ') :', {
            cle: CONF.key ? 'définie' : 'absente',
            regionGG: CONF.ggRegion,
            regionSteam: CONF.steamRegion,
            prixSteam: CONF.showSteam,
            prixCles: CONF.showKeys
        });
    } catch (e) { /* console indisponible */ }
    // =========================================================================

    const LOCALE = String(navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
    const T = {
        fr: {
            keyRequired: 'Clé API requise',
            keyRequiredTitle: 'Cliquez pour obtenir votre clé API gratuite GG.deals et collez-la dans le script',
            apiError: 'Erreur API',
            noKey: 'Aucune clé',
            bestKey: 'Meilleur prix sur GG.deals',
            steamTitle: (country) => `Prix officiel Steam (${country}). Cliquer pour voir sur SteamDB.`,
            keyTitle: (ks, rt) => `Meilleur prix sur GG.deals (Keyshops : ${ks} / Officiel : ${rt})`
        },
        en: {
            keyRequired: 'API key required',
            keyRequiredTitle: 'Click to get your free GG.deals API key and paste it into the script',
            apiError: 'API error',
            noKey: 'No keys',
            bestKey: 'Best price on GG.deals',
            steamTitle: (country) => `Official Steam price (${country}). Click to open SteamDB.`,
            keyTitle: (ks, rt) => `Best price on GG.deals (Keyshops: ${ks} / Retail: ${rt})`
        }
    }[LOCALE];

    const SYMBOLS = { USD: '$', EUR: '€', GBP: '£', BRL: 'R$', ARS: 'ARS ', TRY: '₺', JPY: '¥', CNY: '¥', RUB: '₽', PLN: 'zł ', MXN: 'MX$' };

    // Drapeau emoji + nom localisé à partir du code pays ISO
    function flagOf(code) {
        if (!/^[a-z]{2}$/i.test(code || '')) return '';
        return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
    }
    function nameOf(code) {
        try { return new Intl.DisplayNames([LOCALE], { type: 'region' }).of(code.toUpperCase()) || code.toUpperCase(); }
        catch { return code.toUpperCase(); }
    }
    function money(amount, currency) {
        const sym = SYMBOLS[currency];
        return sym ? sym + Number(amount).toFixed(2) : Number(amount).toFixed(2) + ' ' + (currency || '');
    }

    GM_addStyle(`
        a.steam-custom-badge, span.steam-custom-badge {
            display: inline-flex;
            align-items: center;
            padding: 0 10px;
            height: 30px;
            margin-right: 6px;
            border-radius: 2px;
            font-size: 13px;
            font-weight: bold;
            vertical-align: middle;
            text-decoration: none !important;
            cursor: pointer;
            transition: background 0.2s, color 0.2s, border-color 0.2s;
        }
        a.badge-region {
            background: #1b2838;
            border: 1px solid #66c0f4;
            color: #66c0f4 !important;
        }
        a.badge-region:hover {
            background: #2a475e;
            color: #ffffff !important;
            border-color: #ffffff;
        }
        a.badge-key {
            background: #162925;
            border: 1px solid #00d285;
            color: #00d285 !important;
        }
        a.badge-key:hover {
            background: #1f3d37;
            color: #ffffff !important;
            border-color: #ffffff;
        }
        a.badge-key-warn {
            background: #2b2316;
            border: 1px solid #e5a93b;
            color: #e5a93b !important;
        }
        a.badge-conf {
            background: #1b2838;
            border: 1px solid #7f8f9f;
            color: #d6e4ef !important;
            padding: 0 8px;
        }
        .srp-overlay {
            position: fixed; inset: 0; z-index: 2147483000;
            background: rgba(5, 8, 11, .72);
            display: grid; place-items: center;
            font: 13px/1.5 Arial, Helvetica, sans-serif;
        }
        .srp-box {
            background: linear-gradient(165deg, #1c232d, #171d25); color: #dfe7ee;
            border: 1px solid #3d4a58; border-radius: 16px;
            padding: 22px 24px; width: min(560px, calc(100vw - 32px));
            box-shadow: 0 30px 80px rgba(0,0,0,.65);
            display: flex; flex-direction: column; gap: 14px;
            max-height: calc(100vh - 40px); overflow: auto;
        }
        .srp-box h3 { margin: 0; font-size: 18px; color: #fff; }
        .srp-intro { margin: -8px 0 0; font-size: 12.5px; color: #9fb0bf; }

        .srp-switches { display: flex; flex-wrap: wrap; gap: 10px; }
        .srp-switch {
            display: inline-flex; align-items: center; gap: 9px;
            padding: 8px 12px; border: 1px solid #3d4a58; border-radius: 9px;
            background: #0f151b; font-size: 13px; color: #dfe7ee; cursor: pointer;
            user-select: none; margin: 0;
        }
        .srp-switch:hover { border-color: #55636f; }
        .srp-switch input {
            appearance: none; -webkit-appearance: none;
            width: 34px; height: 19px; border-radius: 999px; margin: 0;
            background: #39434f; border: 1px solid #4a5663; position: relative; cursor: pointer; flex: 0 0 34px;
        }
        .srp-switch input::after {
            content: ""; position: absolute; top: 2px; left: 2px;
            width: 13px; height: 13px; border-radius: 50%; background: #e8ebef; transition: transform .12s ease;
        }
        .srp-switch input:checked { background: #ff913c; border-color: #ffa45f; }
        .srp-switch input:checked::after { transform: translateX(15px); background: #171108; }

        .srp-field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #c3d2de; }
        .srp-field.srp-off { opacity: .45; }
        .srp-field.srp-off > span { text-decoration: line-through; text-decoration-thickness: 1px; }
        .srp-field input[type=text] {
            background: #0f151b; border: 1px solid #3d4a58; border-radius: 9px;
            color: #e6edf3; padding: 9px 12px; font: inherit; font-size: 14px; width: 100%;
        }
        .srp-field input[type=text]:focus { outline: 2px solid rgba(255,145,60,.45); outline-offset: 1px; border-color: #ff913c; }
        .srp-hint { margin: -6px 0 0; font-size: 11.5px; color: #8fa2b1; }
        .srp-hint a { color: #ff913c; }

        .srp-row { display: flex; gap: 12px; }
        .srp-row > .srp-field { flex: 1; min-width: 0; }

        .srp-picker { position: relative; }
        .srp-picker-btn {
            display: flex; align-items: center; gap: 9px; width: 100%;
            background: #0f151b; border: 1px solid #3d4a58; border-radius: 9px;
            color: #e6edf3; padding: 9px 12px; font: inherit; font-size: 14px;
            cursor: pointer; text-align: left;
        }
        .srp-picker-btn:disabled { cursor: not-allowed; }
        .srp-picker-btn:hover:not(:disabled) { border-color: #55636f; }
        .srp-picker-btn .srp-code { margin-left: auto; color: #8fa2b1; font-size: 11px; letter-spacing: .5px; }

        .srp-picker-panel {
            position: absolute; z-index: 2147483100; left: 0; right: 0; top: calc(100% + 6px);
            background: #141a21; border: 1px solid #3d4a58; border-radius: 10px;
            box-shadow: 0 20px 50px rgba(0,0,0,.6); overflow: hidden;
            display: flex; flex-direction: column;
        }
        .srp-picker-panel[hidden] { display: none; }
        .srp-search {
            width: 100%; border: 0; border-bottom: 1px solid #2a333d; background: #0f151b;
            color: #e6edf3; padding: 9px 12px; font: inherit; font-size: 13.5px;
        }
        .srp-search:focus { outline: none; }
        .srp-list { list-style: none; margin: 0; padding: 4px; flex: 1 1 auto; min-height: 0; overflow: auto; }
        .srp-opt {
            display: flex; align-items: center; gap: 9px; width: 100%;
            background: none; border: 0; color: #dfe7ee; padding: 7px 9px; border-radius: 7px;
            font: inherit; font-size: 13px; cursor: pointer; text-align: left;
        }
        .srp-opt:hover, .srp-opt[aria-selected="true"] { background: rgba(255,255,255,.06); }
        .srp-opt .srp-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .srp-opt .srp-code { color: #8fa2b1; font-size: 10.5px; }
        .srp-flag { width: 20px; height: 15px; object-fit: cover; border-radius: 2px; box-shadow: 0 0 0 1px rgba(255,255,255,.15); flex: 0 0 20px; }
        .srp-empty { padding: 10px; color: #8fa2b1; font-size: 12px; }

        .srp-error { margin: 0; font-size: 12px; color: #e5a93b; }
        .srp-error[hidden] { display: none; }

        .srp-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 2px; }
        .srp-btn {
            border: 1px solid transparent; border-radius: 9px; padding: 8px 14px;
            background: #ff913c; color: #171108; font: inherit; font-weight: 700; cursor: pointer;
        }
        .srp-btn:disabled { opacity: .45; cursor: not-allowed; }
        .srp-btn.ghost { background: transparent; border-color: #3d4a58; color: #dfe7ee; font-weight: 500; }
    `);

    const appIdMatch = window.location.pathname.match(/\/app\/(\d+)/);
    const mainAppId = appIdMatch ? appIdMatch[1] : null;

    // 1. PRIX STEAM DE LA RÉGION CHOISIE (API STEAM, même origine)
    function fetchRegionPrice(id, isPackage, targetContainer) {
        const endpoint = isPackage
            ? `https://store.steampowered.com/api/packagedetails?packageids=${id}&cc=${CONF.steamRegion}`
            : `https://store.steampowered.com/api/appdetails?appids=${id}&cc=${CONF.steamRegion}&filters=price_overview`;

        const steamDbUrl = isPackage
            ? `https://steamdb.info/sub/${id}/`
            : `https://steamdb.info/app/${id}/`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: endpoint,
            onload: function (response) {
                try {
                    const json = JSON.parse(response.responseText);
                    const entry = json[id];

                    if (entry && entry.success && entry.data) {
                        const priceData = isPackage ? entry.data.price : entry.data.price_overview;
                        if (priceData) {
                            const discount = priceData.discount_percent > 0 ? ` (-${priceData.discount_percent}%)` : '';

                            const badge = document.createElement('a');
                            badge.className = 'steam-custom-badge badge-region';
                            badge.href = steamDbUrl;
                            badge.target = '_blank';
                            badge.rel = 'noopener noreferrer';
                            badge.title = T.steamTitle(nameOf(CONF.steamRegion));
                            badge.textContent = `${flagOf(CONF.steamRegion)} ${money(priceData.final / 100, priceData.currency)}${discount}`;

                            targetContainer.insertBefore(badge, targetContainer.firstChild);
                        }
                    }
                } catch (e) {
                    console.error('[Steam region] JSON error:', e);
                }
            }
        });
    }

    // 2. PRIX CLÉ LE MOINS CHER (API GG.DEALS)
    function fetchKeyshopPrice(appId, targetContainer) {
        if (!appId) return;

        if (!CONF.key || CONF.key === 'VOTRE_CLE_API_ICI') {
            const warnBadge = document.createElement('a');
            warnBadge.className = 'steam-custom-badge badge-key-warn';
            warnBadge.href = '#';
            warnBadge.title = 'Cliquer pour saisir votre clé API GG.deals (gratuite)';
            warnBadge.textContent = '🔑 ' + T.keyRequired;
            warnBadge.addEventListener('click', e => {
                e.preventDefault();
                openSettings();
            });
            targetContainer.insertBefore(warnBadge, targetContainer.firstChild);
            return;
        }

        const apiUrl = `https://api.gg.deals/v1/prices/by-steam-app-id/?ids=${appId}&key=${encodeURIComponent(CONF.key)}&region=${CONF.ggRegion}`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: apiUrl,
            onload: function (response) {
                try {
                    const json = JSON.parse(response.responseText);

                    if (!json.success) {
                        const errMsg = (json.data && json.data.message) ? json.data.message : 'error';
                        const errBadge = document.createElement('a');
                        errBadge.className = 'steam-custom-badge badge-key-warn';
                        errBadge.href = `https://gg.deals/steam/app/${appId}/`;
                        errBadge.target = '_blank';
                        errBadge.textContent = `🔑 ${T.apiError} (${errMsg})`;
                        targetContainer.insertBefore(errBadge, targetContainer.firstChild);
                        return;
                    }

                    const gameData = json.data ? json.data[appId] : null;
                    if (gameData && gameData.prices) {
                        const prices = gameData.prices;
                        const keyshopPrice = prices.currentKeyshops ? parseFloat(prices.currentKeyshops) : null;
                        const retailPrice = prices.currentRetail ? parseFloat(prices.currentRetail) : null;

                        let bestPrice = null;
                        if (keyshopPrice !== null && retailPrice !== null) {
                            bestPrice = Math.min(keyshopPrice, retailPrice);
                        } else if (keyshopPrice !== null) {
                            bestPrice = keyshopPrice;
                        } else if (retailPrice !== null) {
                            bestPrice = retailPrice;
                        }

                        if (bestPrice !== null) {
                            const sym = SYMBOLS[prices.currency] || (prices.currency ? prices.currency + ' ' : '');
                            const ksLabel = keyshopPrice !== null ? sym + keyshopPrice : 'N/A';
                            const rtLabel = retailPrice !== null ? sym + retailPrice : 'N/A';

                            const badge = document.createElement('a');
                            badge.className = 'steam-custom-badge badge-key';
                            badge.href = gameData.url || `https://gg.deals/steam/app/${appId}/`;
                            badge.target = '_blank';
                            badge.rel = 'noopener noreferrer';
                            badge.title = T.keyTitle(ksLabel, rtLabel);
                            badge.textContent = `🔑 ${bestPrice.toFixed(2).replace('.', ',')}${prices.currency === 'EUR' ? '€' : (prices.currency === 'USD' ? '$' : ' ' + (prices.currency || ''))}`;

                            targetContainer.insertBefore(badge, targetContainer.firstChild);
                        } else {
                            const noStockBadge = document.createElement('a');
                            noStockBadge.className = 'steam-custom-badge badge-key-warn';
                            noStockBadge.href = gameData.url || `https://gg.deals/steam/app/${appId}/`;
                            noStockBadge.target = '_blank';
                            noStockBadge.textContent = '🔑 ' + T.noKey;
                            targetContainer.insertBefore(noStockBadge, targetContainer.firstChild);
                        }
                    }
                } catch (e) {
                    console.error('[GG.deals] JSON parse error:', e);
                }
            },
            onerror: function (err) {
                console.error('[GG.deals] network error:', err);
            }
        });
    }

    // 3. RÉGLAGES EN PAGE (secours si les paramètres d'installation n'ont pas suivi)
    const NEEDS_SETUP = !STORED && !PARAMS.key && !PARAMS.gg && !PARAMS.steam
        && (!GG_DEALS_API_KEY || GG_DEALS_API_KEY === 'VOTRE_CLE_API_ICI');
    // --- pays (mêmes listes que la modale du site) ---
    const ISO_CODES = (
        'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
        'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
        'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
        'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
        'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
        'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
        'UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK'
    ).split(' ');

    const UI = LOCALE === 'fr' ? {
        title: 'Réglages — prix Steam & prix des clés',
        notice: 'Aucune configuration détectée : renseignez-la une fois, elle restera sur votre machine.',
        hint: 'Valeurs enregistrées par le gestionnaire de userscripts, sur votre machine.',
        keyLabel: 'Clé API GG.deals (gg.deals/api)',
        keyHint: 'Clé gratuite sur gg.deals/api · facultative : le badge 🔑 vous la redemandera',
        ggRegion: 'Région GG.deals (prix des clés)',
        steamRegion: 'Région Steam (prix boutique)',
        showSteam: 'Prix Steam',
        showKeys: 'Prix des clés',
        search: 'Rechercher un pays…',
        oneRequired: 'Gardez au moins une des deux parties active.',
        cancel: 'Annuler',
        save: 'Enregistrer'
    } : {
        title: 'Settings — Steam price & key price',
        notice: 'No configuration found: set it once, it stays on your machine.',
        hint: 'Stored by your userscript manager, on your machine.',
        keyLabel: 'GG.deals API key (gg.deals/api)',
        keyHint: 'Free key on gg.deals/api · optional: the 🔑 badge will ask again',
        ggRegion: 'GG.deals region (key prices)',
        steamRegion: 'Steam region (store price)',
        showSteam: 'Steam price',
        showKeys: 'Key price',
        search: 'Search a country…',
        oneRequired: 'Keep at least one of the two sections enabled.',
        cancel: 'Cancel',
        save: 'Save'
    };

    const foldText = v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const flagUrl = code => 'https://flagcdn.com/w20/' + String(code).toLowerCase() + '.png';

    function countryName(code) {
        const up = String(code || '').toUpperCase();
        try {
            return new Intl.DisplayNames([LOCALE === 'fr' ? 'fr' : 'en'], { type: 'region' }).of(up) || up;
        } catch (e) {
            return up;
        }
    }

    function flagIcon(code) {
        const img = document.createElement('img');
        img.className = 'srp-flag';
        img.alt = '';
        img.loading = 'lazy';
        img.src = flagUrl(code);
        img.addEventListener('error', () => img.remove(), { once: true });
        return img;
    }

    function makeCountryPicker(initial) {
        const wrap = document.createElement('div');
        wrap.className = 'srp-picker';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'srp-picker-btn';
        button.setAttribute('aria-haspopup', 'listbox');

        const panel = document.createElement('div');
        panel.className = 'srp-picker-panel';
        panel.hidden = true;

        const search = document.createElement('input');
        search.type = 'search';
        search.className = 'srp-search';
        search.placeholder = UI.search;

        const list = document.createElement('ul');
        list.className = 'srp-list';
        list.setAttribute('role', 'listbox');

        let value = String(initial || '').toLowerCase();

        const paintButton = () => {
            button.textContent = '';
            const code = document.createElement('span');
            code.className = 'srp-code';
            code.textContent = value.toUpperCase();
            button.append(flagIcon(value), document.createTextNode(countryName(value)), code);
        };

        const paintList = filter => {
            const q = foldText(String(filter || '').trim());
            list.textContent = '';
            const frag = document.createDocumentFragment();
            let found = 0;

            ISO_CODES.forEach(code => {
                const name = countryName(code);
                if (q && foldText(name).indexOf(q) < 0 && code.toLowerCase().indexOf(q) < 0) return;

                const li = document.createElement('li');
                const opt = document.createElement('button');
                opt.type = 'button';
                opt.className = 'srp-opt';
                opt.setAttribute('role', 'option');
                opt.setAttribute('aria-selected', String(code.toLowerCase() === value));

                const nameEl = document.createElement('span');
                nameEl.className = 'srp-name';
                nameEl.textContent = name;

                const codeEl = document.createElement('span');
                codeEl.className = 'srp-code';
                codeEl.textContent = code;

                opt.append(flagIcon(code), nameEl, codeEl);
                opt.addEventListener('click', () => {
                    value = code.toLowerCase();
                    paintButton();
                    panel.hidden = true;
                    button.focus();
                });

                li.append(opt);
                frag.append(li);
                found++;
            });

            if (!found) {
                const li = document.createElement('li');
                li.className = 'srp-empty';
                li.textContent = '—';
                frag.append(li);
            }
            list.append(frag);
        };

        const placePanel = () => {
            const r = button.getBoundingClientRect();
            const below = innerHeight - r.bottom - 12;
            const above = r.top - 12;
            const up = below < 200 && above > below;

            panel.style.position = 'fixed';
            panel.style.left = Math.max(8, Math.min(r.left, innerWidth - r.width - 8)) + 'px';
            panel.style.width = r.width + 'px';
            panel.style.maxHeight = Math.min(290, Math.max(150, (up ? above : below) - 8)) + 'px';

            if (up) {
                panel.style.top = 'auto';
                panel.style.bottom = (innerHeight - r.top + 6) + 'px';
            } else {
                panel.style.top = (r.bottom + 6) + 'px';
                panel.style.bottom = 'auto';
            }
        };

        button.addEventListener('click', () => {
            const willOpen = panel.hidden;
            document.querySelectorAll('.srp-picker-panel').forEach(p => { p.hidden = true; });
            panel.hidden = !willOpen;
            if (willOpen) {
                search.value = '';
                paintList('');
                placePanel();
                search.focus();
            }
        });

        addEventListener('resize', () => { if (!panel.hidden) placePanel(); });
        addEventListener('scroll', e => {
            if (!panel.hidden && !panel.contains(e.target)) panel.hidden = true;
        }, true);
        search.addEventListener('input', () => paintList(search.value));

        panel.append(search, list);
        wrap.append(button, panel);
        paintButton();

        return {
            el: wrap,
            button,
            get value() { return value; }
        };
    }

    function openSettings(notice) {
        if (document.querySelector('.srp-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'srp-overlay';

        const box = document.createElement('form');
        box.className = 'srp-box';

        const title = document.createElement('h3');
        title.textContent = UI.title;

        const intro = document.createElement('p');
        intro.className = 'srp-intro';
        intro.textContent = notice ? UI.notice : UI.hint;

        // --- interrupteurs ---
        const switches = document.createElement('div');
        switches.className = 'srp-switches';

        const mkSwitch = (labelText, checked) => {
            const label = document.createElement('label');
            label.className = 'srp-switch';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = checked;
            const span = document.createElement('span');
            span.textContent = labelText;
            label.append(input, span);
            return { label, input };
        };

        const swSteam = mkSwitch(UI.showSteam, !!CONF.showSteam);
        const swKeys = mkSwitch(UI.showKeys, !!CONF.showKeys);
        switches.append(swSteam.label, swKeys.label);

        // --- clé API ---
        const keyField = document.createElement('label');
        keyField.className = 'srp-field';
        const keyCaption = document.createElement('span');
        keyCaption.textContent = UI.keyLabel;
        keyField.append(keyCaption);
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.autocomplete = 'off';
        keyInput.spellcheck = false;
        keyInput.placeholder = 'AbCdEf123456';
        keyInput.value = CONF.key === 'VOTRE_CLE_API_ICI' ? '' : CONF.key;
        keyField.append(keyInput);

        const keyHint = document.createElement('p');
        keyHint.className = 'srp-hint';
        keyHint.textContent = UI.keyHint;

        // --- régions ---
        const row = document.createElement('div');
        row.className = 'srp-row';

        const fieldGG = document.createElement('div');
        fieldGG.className = 'srp-field';
        const capGG = document.createElement('span');
        capGG.textContent = UI.ggRegion;
        const pickerGG = makeCountryPicker(CONF.ggRegion);
        fieldGG.append(capGG, pickerGG.el);

        const fieldSteam = document.createElement('div');
        fieldSteam.className = 'srp-field';
        const capSteam = document.createElement('span');
        capSteam.textContent = UI.steamRegion;
        const pickerSteam = makeCountryPicker(CONF.steamRegion);
        fieldSteam.append(capSteam, pickerSteam.el);

        row.append(fieldGG, fieldSteam);

        const warning = document.createElement('p');
        warning.className = 'srp-error';
        warning.hidden = true;
        warning.textContent = UI.oneRequired;

        // --- actions ---
        const actions = document.createElement('div');
        actions.className = 'srp-actions';

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'srp-btn ghost';
        cancel.textContent = UI.cancel;

        const save = document.createElement('button');
        save.type = 'submit';
        save.className = 'srp-btn';
        save.textContent = UI.save;

        actions.append(cancel, save);

        const refreshToggles = () => {
            const steamOn = swSteam.input.checked;
            const keysOn = swKeys.input.checked;

            keyField.classList.toggle('srp-off', !keysOn);
            fieldGG.classList.toggle('srp-off', !keysOn);
            fieldSteam.classList.toggle('srp-off', !steamOn);

            keyInput.disabled = !keysOn;
            pickerGG.button.disabled = !keysOn;
            pickerSteam.button.disabled = !steamOn;

            warning.hidden = !!(steamOn || keysOn);
            warning.classList.toggle('srp-error-visible', !steamOn && !keysOn);
            save.disabled = !steamOn && !keysOn;
        };

        swSteam.input.addEventListener('change', refreshToggles);
        swKeys.input.addEventListener('change', refreshToggles);

        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        cancel.addEventListener('click', () => overlay.remove());
        document.addEventListener('keydown', function onEsc(e) {
            if (e.key !== 'Escape') return;
            document.removeEventListener('keydown', onEsc, true);
            overlay.remove();
        }, true);

        box.addEventListener('submit', e => {
            e.preventDefault();

            const showSteam = swSteam.input.checked;
            const showKeys = swKeys.input.checked;
            if (!showSteam && !showKeys) {
                warning.hidden = false;
                return;
            }

            if (typeof GM_setValue === 'function') {
                GM_setValue(STORED_KEY, {
                    key: keyInput.value.trim(),
                    ggRegion: pickerGG.value,
                    steamRegion: pickerSteam.value,
                    showSteam,
                    showKeys
                });
            }
            location.reload();
        });

        box.append(title, intro, switches, keyField, keyHint, row, warning, actions);
        overlay.append(box);
        document.body.append(overlay);
        refreshToggles();
        keyInput.focus();
    }

    function addSettingsBadge(container) {
        if (!container || container.querySelector('.badge-conf')) return;
        const badge = document.createElement('a');
        badge.className = 'steam-custom-badge badge-conf';
        badge.href = '#';
        badge.title = 'Configurer : clé GG.deals, régions, parties affichées';
        badge.textContent = '⚙';
        badge.addEventListener('click', e => { e.preventDefault(); openSettings(); });
        container.insertBefore(badge, container.firstChild);
    }

    // 4. INJECTION DANS LA PAGE
    const showRegion = CONF.showSteam || !CONF.showKeys;
    const showKeys = CONF.showKeys;
    if (!CONF.showSteam && !CONF.showKeys) {
        console.warn('[Steam region] Les deux parties sont désactivées : seul le prix Steam est affiché.');
    }

    let mainGameProcessed = false;

    document.querySelectorAll('.game_area_purchase_game_wrapper').forEach((wrapper) => {
        if (wrapper.closest('.demo_above_purchase')) return;

        const subInput = wrapper.querySelector('input[name="subid"]');
        const actionBg = wrapper.querySelector('.game_purchase_action_bg');

        if (subInput && actionBg) {
            addSettingsBadge(actionBg);
            if (NEEDS_SETUP) openSettings(true);
            if (showRegion) fetchRegionPrice(subInput.value, true, actionBg);

            if (showKeys && !mainGameProcessed && mainAppId) {
                mainGameProcessed = true;
                fetchKeyshopPrice(mainAppId, actionBg);
            }
        }
    });

    document.querySelectorAll('.game_area_dlc_row').forEach((row) => {
        const dlcAppId = row.getAttribute('data-ds-appid');
        const priceCol = row.querySelector('.game_area_dlc_price');

        if (dlcAppId && priceCol) {
            if (showRegion) fetchRegionPrice(dlcAppId, false, priceCol);
            if (showKeys) fetchKeyshopPrice(dlcAppId, priceCol);
        }
    });
})();

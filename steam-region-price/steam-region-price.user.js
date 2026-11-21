// ==UserScript==
// @name         Steam — Region price + key price (GG.deals)
// @namespace    http://tampermonkey.net/
// @version      4.4
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
            background: #1b2838; color: #dfe7ee;
            border: 1px solid #3d4a58; border-radius: 12px;
            padding: 18px 20px; width: min(430px, calc(100vw - 32px));
            box-shadow: 0 20px 60px rgba(0,0,0,.6);
        }
        .srp-box h3 { margin: 0 0 4px; font-size: 15px; }
        .srp-box p { margin: 0 0 12px; font-size: 11.5px; color: #9fb0bf; }
        .srp-box label { display: block; margin-bottom: 10px; font-size: 12px; color: #c3d2de; }
        .srp-box input[type=text] {
            display: block; width: 100%; margin-top: 4px;
            background: #0f151b; border: 1px solid #3d4a58; border-radius: 7px;
            color: #e6edf3; padding: 7px 9px; font: inherit; font-size: 13px;
        }
        .srp-row { display: flex; gap: 10px; }
        .srp-row label { flex: 1; }
        .srp-check { display: flex; align-items: center; gap: 7px; margin: 0; }
        .srp-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
        .srp-btn {
            border: 1px solid transparent; border-radius: 7px; padding: 7px 12px;
            background: #ff913c; color: #171108; font: inherit; font-weight: 700; cursor: pointer;
        }
        .srp-btn.ghost { background: transparent; border-color: #3d4a58; color: #dfe7ee; font-weight: 500; }
        .srp-error { color: #e5a93b; font-size: 11.5px; margin: 6px 0 0; }
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
            warnBadge.href = 'https://gg.deals/api/';
            warnBadge.target = '_blank';
            warnBadge.title = T.keyRequiredTitle;
            warnBadge.textContent = '🔑 ' + T.keyRequired;
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
    function openSettings(notice) {
        if (document.querySelector('.srp-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'srp-overlay';
        overlay.innerHTML = `
            <form class="srp-box">
                <h3>Réglages — prix Steam & prix des clés</h3>
                <p>${notice ? 'Aucune configuration détectée : renseignez-la une fois, elle restera sur votre machine.' : 'Valeurs enregistrées par le gestionnaire de userscripts, sur votre machine.'}</p>
                <label>Clé API GG.deals (gg.deals/api)
                    <input type="text" name="key" autocomplete="off" spellcheck="false" placeholder="AbCdEf123456">
                </label>
                <div class="srp-row">
                    <label>Région GG.deals
                        <input type="text" name="ggRegion" maxlength="2" placeholder="fr">
                    </label>
                    <label>Région Steam
                        <input type="text" name="steamRegion" maxlength="2" placeholder="ar">
                    </label>
                </div>
                <div class="srp-row">
                    <label class="srp-check"><input type="checkbox" name="showSteam"> Prix Steam</label>
                    <label class="srp-check"><input type="checkbox" name="showKeys"> Prix des clés</label>
                </div>
                <div class="srp-actions">
                    <button type="button" class="srp-btn ghost" data-act="cancel">Annuler</button>
                    <button type="submit" class="srp-btn">Enregistrer</button>
                </div>
            </form>
        `;

        const form = overlay.querySelector('form');
        form.key.value = CONF.key === 'VOTRE_CLE_API_ICI' ? '' : CONF.key;
        form.ggRegion.value = CONF.ggRegion;
        form.steamRegion.value = CONF.steamRegion;
        form.showSteam.checked = !!CONF.showSteam;
        form.showKeys.checked = !!CONF.showKeys;

        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        form.querySelector('[data-act="cancel"]').addEventListener('click', () => overlay.remove());

        form.addEventListener('submit', e => {
            e.preventDefault();
            const showSteam = form.showSteam.checked;
            const showKeys = form.showKeys.checked;
            const err = form.querySelector('.srp-error') || document.createElement('p');

            if (!showSteam && !showKeys) {
                err.className = 'srp-error';
                err.textContent = 'Gardez au moins une des deux parties active.';
                form.append(err);
                return;
            }

            const norm = v => String(v || '').trim().toLowerCase().slice(0, 2).replace(/[^a-z]/g, '');
            const ggRegion = norm(form.ggRegion.value) || 'fr';
            const steamRegion = norm(form.steamRegion.value) || 'ar';

            if (typeof GM_setValue === 'function') {
                GM_setValue(STORED_KEY, {
                    key: form.key.value.trim(),
                    ggRegion,
                    steamRegion,
                    showSteam,
                    showKeys
                });
            }
            location.reload();
        });

        document.body.append(overlay);
        form.key.focus();
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

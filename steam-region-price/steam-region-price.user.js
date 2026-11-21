// ==UserScript==
// @name         Steam — Region price + key price (GG.deals)
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Shows the Steam price of a game in a country of your choice, plus the cheapest key price from GG.deals, right on the store page.
// @icon         https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/steam-region-price/icon.png
// @match        https://store.steampowered.com/app/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
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
    `);

    const appIdMatch = window.location.pathname.match(/\/app\/(\d+)/);
    const mainAppId = appIdMatch ? appIdMatch[1] : null;

    // 1. PRIX STEAM DE LA RÉGION CHOISIE (API STEAM, même origine)
    function fetchRegionPrice(id, isPackage, targetContainer) {
        const endpoint = isPackage
            ? `https://store.steampowered.com/api/packagedetails?packageids=${id}&cc=${STEAM_REGION}`
            : `https://store.steampowered.com/api/appdetails?appids=${id}&cc=${STEAM_REGION}&filters=price_overview`;

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
                            badge.title = T.steamTitle(nameOf(STEAM_REGION));
                            badge.textContent = `${flagOf(STEAM_REGION)} ${money(priceData.final / 100, priceData.currency)}${discount}`;

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

        if (!GG_DEALS_API_KEY || GG_DEALS_API_KEY === 'VOTRE_CLE_API_ICI') {
            const warnBadge = document.createElement('a');
            warnBadge.className = 'steam-custom-badge badge-key-warn';
            warnBadge.href = 'https://gg.deals/api/';
            warnBadge.target = '_blank';
            warnBadge.title = T.keyRequiredTitle;
            warnBadge.textContent = '🔑 ' + T.keyRequired;
            targetContainer.insertBefore(warnBadge, targetContainer.firstChild);
            return;
        }

        const apiUrl = `https://api.gg.deals/v1/prices/by-steam-app-id/?ids=${appId}&key=${encodeURIComponent(GG_DEALS_API_KEY)}&region=${GG_DEALS_REGION}`;

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

    // 3. INJECTION DANS LA PAGE
    let mainGameProcessed = false;

    document.querySelectorAll('.game_area_purchase_game_wrapper').forEach((wrapper) => {
        if (wrapper.closest('.demo_above_purchase')) return;

        const subInput = wrapper.querySelector('input[name="subid"]');
        const actionBg = wrapper.querySelector('.game_purchase_action_bg');

        if (subInput && actionBg) {
            fetchRegionPrice(subInput.value, true, actionBg);

            if (!mainGameProcessed && mainAppId) {
                mainGameProcessed = true;
                fetchKeyshopPrice(mainAppId, actionBg);
            }
        }
    });

    document.querySelectorAll('.game_area_dlc_row').forEach((row) => {
        const dlcAppId = row.getAttribute('data-ds-appid');
        const priceCol = row.querySelector('.game_area_dlc_price');

        if (dlcAppId && priceCol) {
            fetchRegionPrice(dlcAppId, false, priceCol);
            fetchKeyshopPrice(dlcAppId, priceCol);
        }
    });
})();

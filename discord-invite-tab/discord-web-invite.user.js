// ==UserScript==
// @name         Discord Web Invite — Open in existing tab
// @namespace    http://tampermonkey.net/
// @version      4.3
// @description  Sends a Discord invite to your already-open Discord tab with one click, instead of loading Discord in the current page.
// @icon         https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/discord-invite-tab/icon.png
// @match        *://discord.com/*
// @match        *://discord.gg/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'vm_discord_pending_invite';
    const MAX_AGE = 3 * 60 * 1000;   // une invitation non consommée expire au bout de 3 minutes

    // Libellés selon la langue du navigateur (français, sinon anglais)
    const LANG = String(navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
    const TEXT = {
        fr: {
            send: 'Envoyer vers mon onglet Discord',
            sent: 'Envoyé ! Retourne sur ton onglet Discord',
            none: 'Ouvre d’abord Discord dans un onglet'
        },
        en: {
            send: 'Send to my Discord tab',
            sent: 'Sent! Go back to your Discord tab',
            none: 'Open Discord in a tab first'
        }
    }[LANG];

    const store = (key, value) => {
        try { GM_setValue(key, value); } catch (e) { /* stockage indisponible */ }
    };
    const read = (key, fallback) => {
        try { return GM_getValue(key, fallback); } catch (e) { return fallback; }
    };

    // =========================================================================
    // 1. PAGE D'INVITATION (/invite/… ou discord.gg/…)
    // =========================================================================
    if (location.pathname.startsWith('/invite/') || location.hostname === 'discord.gg') {
        const parts = location.pathname.split('/').filter(Boolean);
        const inviteCode = parts[parts.length - 1];
        if (!inviteCode) return;

        const createButton = () => {
            const btn = document.createElement('button');
            btn.id = 'vm-discord-open-tab-btn';
            btn.type = 'button';
            btn.innerText = TEXT.send;
            Object.assign(btn.style, {
                width: '100%',
                height: '40px',
                marginTop: '10px',
                backgroundColor: '#23A55A',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background-color 0.17s ease'
            });

            btn.onmouseover = () => {
                if (!btn.dataset.sent) btn.style.backgroundColor = '#1A7F42';
            };
            btn.onmouseout = () => {
                if (!btn.dataset.sent) btn.style.backgroundColor = '#23A55A';
            };

            btn.onclick = () => {
                // Le code est déposé dans le stockage du gestionnaire ; l'onglet
                // Discord déjà ouvert le lit et navigue vers l'invitation.
                store(STORAGE_KEY, { code: inviteCode, ts: Date.now() });

                btn.dataset.sent = 'true';
                btn.innerText = TEXT.sent;
                btn.style.backgroundColor = '#5865F2';
                btn.style.cursor = 'default';
            };

            return btn;
        };

        let tries = 0;
        const place = () => {
            if (document.getElementById('vm-discord-open-tab-btn')) return true;

            const submitBtn = document.querySelector('div[class*="authBlock_"] button[type="submit"]')
                || [...document.querySelectorAll('button[type="submit"]')].find(b => /creat|créer|inscri|register|sign/i.test(b.textContent || ''));

            if (submitBtn && submitBtn.parentElement) {
                submitBtn.parentElement.insertAdjacentElement('afterend', createButton());
                return true;
            }
            return false;
        };

        const observer = new MutationObserver(() => {
            if (place()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // filet de sécurité : certaines versions de la page mettent du temps
        const timer = setInterval(() => {
            tries += 1;
            if (place() || tries > 40) {
                clearInterval(timer);
                observer.disconnect();
            }
        }, 500);
    }

    // =========================================================================
    // 2. ONGLET DISCORD DÉJÀ OUVERT (/channels/… ou /app)
    // =========================================================================
    if (location.pathname.startsWith('/channels') || location.pathname.startsWith('/app')) {
        // on ignore une invitation déposée avant l'ouverture de cet onglet
        if (read(STORAGE_KEY, null)) store(STORAGE_KEY, null);

        setInterval(() => {
            const pending = read(STORAGE_KEY, null);
            if (!pending || !pending.code) return;

            store(STORAGE_KEY, null);

            if (Date.now() - (pending.ts || 0) > MAX_AGE) return;

            // Navigue l'onglet Discord existant vers l'invitation : Discord affiche
            // son écran « rejoindre le serveur », déjà connecté.
            location.assign('/invite/' + encodeURIComponent(pending.code));
        }, 1500);
    }
})();

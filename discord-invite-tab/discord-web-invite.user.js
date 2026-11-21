// ==UserScript==
// @name         Discord Web Invite — Open in existing tab
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Sends a Discord invite to your already-open Discord tab with one click, instead of loading Discord in the current page.
// @icon         https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/discord-invite-tab/icon.png
// @match        *://discord.com/*
// @match        *://discord.gg/*
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        window.focus
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'vm_discord_pending_invite';
    const path = window.location.pathname;

    // Libellés selon la langue du navigateur (français, sinon anglais)
    const LANG = String(navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
    const TEXT = {
        fr: {
            send: 'Envoyer vers mon onglet Discord',
            sent: 'Envoyé ! Retourne sur ton onglet Discord'
        },
        en: {
            send: 'Send to my Discord tab',
            sent: 'Sent! Go back to your Discord tab'
        }
    }[LANG];

    // =========================================================================
    // 1. SUR LA PAGE D'INVITATION (/invite/...)
    // =========================================================================
    if (path.startsWith('/invite/') || window.location.hostname === 'discord.gg') {
        const pathParts = path.split('/').filter(Boolean);
        const inviteCode = pathParts[pathParts.length - 1];
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
                GM_setValue(STORAGE_KEY, {
                    code: inviteCode,
                    timestamp: Date.now()
                });

                btn.dataset.sent = 'true';
                btn.innerText = TEXT.sent;
                btn.style.backgroundColor = '#5865F2';

                const existingTab = window.open('', 'discord_main_tab');
                if (existingTab && !existingTab.closed && existingTab.location.href.includes('discord.com/channels')) {
                    existingTab.focus();
                } else if (existingTab) {
                    existingTab.close();
                }
            };

            return btn;
        };

        // Surveille l'apparition du formulaire React pour placer le bouton sous "Create Account"
        const observer = new MutationObserver(() => {
            if (document.getElementById('vm-discord-open-tab-btn')) return;

            const submitBtn = document.querySelector('div[class*="authBlock_"] button[type="submit"]');
            if (submitBtn && submitBtn.parentElement) {
                const customBtn = createButton();
                submitBtn.parentElement.insertAdjacentElement('afterend', customBtn);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // =========================================================================
    // 2. SUR TON ONGLET DISCORD DÉJÀ OUVERT (/channels/... ou /app)
    // =========================================================================
    if (path.startsWith('/channels') || path.startsWith('/app')) {
        window.name = 'discord_main_tab';

        GM_addValueChangeListener(STORAGE_KEY, (name, oldValue, newValue, remote) => {
            if (remote && newValue && newValue.code) {
                window.history.pushState({}, '', `/invite/${newValue.code}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
                window.focus();
            }
        });
    }
})();

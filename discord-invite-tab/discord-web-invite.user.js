// ==UserScript==
// @name         Discord Web Invite — Open in existing tab
// @namespace    http://tampermonkey.net/
// @version      4.4
// @description  Sends a Discord invite to your already-open Discord tab with one click, instead of loading Discord in the current page.
// @icon         https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/discord-invite-tab/icon.png
// @match        *://discord.com/*
// @match        *://discord.gg/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    const KEY = 'vm_discord_pending_invite';
    const ACK = 'vm_discord_pending_ack';
    const MAX_AGE = 3 * 60 * 1000;      // une invitation non consommée expire au bout de 3 minutes
    const WAIT_ACK = 2500;              // temps laissé à l'onglet Discord pour répondre

    // Libellés selon la langue du navigateur (français, sinon anglais)
    const LANG = String(navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
    const TEXT = {
        fr: {
            send: 'Envoyer vers mon onglet Discord',
            sent: 'Envoyé ! Retourne sur ton onglet Discord',
            opened: 'Ouvert dans un nouvel onglet — ouvre Discord puis réessaie',
            waiting: 'Envoi vers ton onglet Discord…'
        },
        en: {
            send: 'Send to my Discord tab',
            sent: 'Sent! Go back to your Discord tab',
            opened: 'Opened in a new tab — open Discord and try again',
            waiting: 'Sending to your Discord tab…'
        }
    }[LANG];

    const store = (key, value) => {
        try { GM_setValue(key, value); } catch (e) { /* stockage indisponible */ }
    };
    const read = (key, fallback) => {
        try { return GM_getValue(key, fallback); } catch (e) { return fallback; }
    };
    const inviteUrl = code => 'https://discord.com/invite/' + encodeURIComponent(code);

    const onInvitePage = location.pathname.startsWith('/invite/') || location.hostname === 'discord.gg';

    // =========================================================================
    // 1. PAGE D'INVITATION (/invite/… ou discord.gg/…)
    // =========================================================================
    if (onInvitePage) {
        const parts = location.pathname.split('/').filter(Boolean);
        const inviteCode = parts[parts.length - 1];

        if (inviteCode) {
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
                    if (btn.dataset.sent) return;

                    const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
                    store(KEY, { id, code: inviteCode, ts: Date.now() });

                    btn.innerText = TEXT.waiting;
                    btn.style.backgroundColor = '#5865F2';

                    // L'onglet Discord déjà ouvert répond en déposant un accusé de réception.
                    // Sans réponse, on ouvre l'invitation dans un nouvel onglet pour que le
                    // clic fasse toujours quelque chose.
                    let done = false;
                    const started = Date.now();

                    const finish = (ok) => {
                        if (done) return;
                        done = true;
                        btn.dataset.sent = 'true';
                        btn.innerText = ok ? TEXT.sent : TEXT.opened;
                        btn.style.backgroundColor = ok ? '#5865F2' : '#B25E00';
                        btn.style.cursor = 'default';
                    };

                    const check = () => {
                        if (done) return;

                        const ack = read(ACK, null);
                        if (ack && ack.id === id) {
                            finish(true);
                            return;
                        }

                        if (Date.now() - started > WAIT_ACK) {
                            finish(false);
                            const url = inviteUrl(inviteCode);
                            const tab = window.open(url, '_blank');
                            if (!tab) location.assign(url);
                            return;
                        }
                        setTimeout(check, 250);
                    };

                    setTimeout(check, 250);
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

            const timer = setInterval(() => {
                tries += 1;
                if (place() || tries > 40) {
                    clearInterval(timer);
                    observer.disconnect();
                }
            }, 500);
        }
    }

    // =========================================================================
    // 2. ONGLET DISCORD DÉJÀ OUVERT (toutes les autres pages discord.com)
    // =========================================================================
    if (!onInvitePage && location.hostname === 'discord.com') {
        // une invitation déposée avant l'ouverture de cet onglet est ignorée
        if (read(KEY, null)) store(KEY, null);

        const consume = () => {
            const pending = read(KEY, null);
            if (!pending || !pending.code) return;

            store(KEY, null);
            store(ACK, { id: pending.id, ts: Date.now() });

            if (Date.now() - (pending.ts || 0) > MAX_AGE) return;

            // Navigue l'onglet Discord existant vers l'invitation : Discord affiche
            // son écran « rejoindre le serveur », déjà connecté.
            location.assign(inviteUrl(pending.code));
        };

        setInterval(consume, 1000);
        consume();
    }
})();

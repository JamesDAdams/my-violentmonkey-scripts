// ==UserScript==
// @name         Discord Web Invite — Open in existing tab
// @namespace    http://tampermonkey.net/
// @version      4.5
// @description  Sends a Discord invite to your already-open Discord tab with one click, instead of loading Discord in the current page.
// @icon         https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/discord-invite-tab/icon.png
// @match        *://discord.com/*
// @match        *://discord.gg/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    const KEY = 'vm_discord_pending_invite';        // stockage du gestionnaire (cross-origin)
    const ACK = 'vm_discord_pending_ack';
    const LS_KEY = 'vm-discord-pending';            // même origine discord.com
    const LS_ACK = 'vm-discord-ack';
    const CHANNEL = 'vm-discord-invite';            // BroadcastChannel, même origine

    const MAX_AGE = 3 * 60 * 1000;   // une invitation non consommée expire au bout de 3 minutes
    const WAIT_ACK = 5000;           // temps laissé à l'onglet Discord pour répondre

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

    // Même origine (discord.com) : les autres onglets sont prévenus instantanément, même
    // en arrière-plan. discord.gg est une autre origine : on ne garde que le stockage GM.
    const sameOrigin = location.hostname === 'discord.com';

    const writeLocal = (key, value) => {
        if (!sameOrigin) return;
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignoré */ }
    };
    const readLocal = key => {
        if (!sameOrigin) return null;
        try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
    };
    const broadcast = value => {
        try {
            const bc = new BroadcastChannel(CHANNEL);
            bc.postMessage(value);
            bc.close();
        } catch (e) { /* pas de BroadcastChannel */ }
    };

    const onInvitePage = location.pathname.startsWith('/invite/') || location.hostname === 'discord.gg';

    // =========================================================================
    // 1. PAGE D'INVITATION
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
                    if (btn.dataset.sent || btn.dataset.busy) return;
                    btn.dataset.busy = '1';

                    const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
                    const payload = { id, code: inviteCode, ts: Date.now() };

                    btn.innerText = TEXT.waiting;
                    btn.style.backgroundColor = '#5865F2';

                    // trois canaux en parallèle : le premier qui atteint l'onglet Discord gagne
                    writeLocal(LS_KEY, payload);
                    broadcast(payload);
                    store(KEY, payload);

                    let done = false;
                    const started = Date.now();

                    const finish = ok => {
                        if (done) return;
                        done = true;
                        delete btn.dataset.busy;
                        btn.dataset.sent = 'true';
                        btn.innerText = ok ? TEXT.sent : TEXT.opened;
                        btn.style.backgroundColor = ok ? '#5865F2' : '#B25E00';
                        btn.style.cursor = 'default';
                    };

                    const check = () => {
                        if (done) return;

                        const a = read(ACK, null);
                        const b = readLocal(LS_ACK);
                        if ((a && a.id === id) || (b && b.id === id)) {
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
                        setTimeout(check, 300);
                    };

                    setTimeout(check, 300);
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
    // 2. ONGLET DISCORD DÉJÀ OUVERT
    // =========================================================================
    if (!onInvitePage && sameOrigin) {
        const consume = pending => {
            if (!pending || !pending.code || !pending.id) return;
            if (Date.now() - (pending.ts || 0) > MAX_AGE) return;

            store(KEY, null);
            store(ACK, { id: pending.id, ts: Date.now() });
            writeLocal(LS_ACK, { id: pending.id, ts: Date.now() });

            location.assign(inviteUrl(pending.code));
        };

        // une invitation déposée avant l'ouverture de cet onglet est ignorée
        if (read(KEY, null)) store(KEY, null);

        // 1. message instantané entre onglets (fonctionne en arrière-plan)
        try {
            const bc = new BroadcastChannel(CHANNEL);
            bc.onmessage = event => {
                const data = event.data;
                if (data && data.code) consume(data);
            };
        } catch (e) { /* pas de BroadcastChannel */ }

        window.addEventListener('storage', event => {
            if (event.key !== LS_KEY || !event.newValue) return;
            try { consume(JSON.parse(event.newValue)); } catch (e) { /* ignoré */ }
        });

        // 2. filet de sécurité : relecture du stockage du gestionnaire
        setInterval(() => consume(read(KEY, null)), 1000);
        consume(read(KEY, null));
    }
})();

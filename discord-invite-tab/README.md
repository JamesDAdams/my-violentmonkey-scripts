**English** · [Français](README.fr.md)

# Discord Web Invite — Open in existing tab

Click the green button on a Discord invite page and the invite is sent to the Discord tab already open in your browser — no second Discord session, no login screen.

## Preview

<img src="screenshots/invite.png" width="320" alt="Discord invite page with the green “Send to my Discord tab” button under Create Account">

## Install

[<img src="https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/assets/install-en.svg" width="96" height="28" alt="Install Discord Web Invite">](https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/discord-invite-tab/discord-web-invite.user.js)

## What it adds

On `discord.com/invite/…` and `discord.gg/…`, a button **“Send to my Discord tab”** — or **« Envoyer vers mon onglet Discord »** depending on the browser language — appears right under the “Create Account” submit button.

Clicking it:

1. stores the invite code in the userscript storage (`GM_setValue`);
2. the Discord tab you already have open reads it (a lookup every 1.5 s with `GM_getValue`), clears the value, then navigates to `/invite/{code}` and takes focus.

Discord then shows its usual “join server” screen, logged in as you. No network request other than Discord itself, no second session, no login screen.

> If the button seems to do nothing, reload the tab where Discord is already open once: a tab loaded before the script was installed does not have the listener yet.

## Limits

- The script only works on `discord.com` and `discord.gg`.
- The invite is stored for 3 minutes: an invitation sent while no Discord tab is open is ignored.
- If the Discord page changes its account block, the button may need a page refresh to appear.

## Privacy

Everything stays in your browser: the invite code is written to the userscript storage (`GM_setValue`), read once by your Discord tab and cleared. No external server, no analytics.

---

Website: <https://script.jamesserver.fr/#discord-invite-tab>

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

1. stores the invite code in the userscript storage (`GM_setValue`) and shows **“Sending to your Discord tab…”**;
2. the Discord tab you already have open reads it (a lookup every second with `GM_getValue`), acknowledges it, clears the value and navigates to `/invite/{code}`;
3. the button then turns **“Sent! Go back to your Discord tab”**.

Discord shows its usual “join server” screen, logged in as you. No network request other than Discord itself, no second session, no login screen.

**If no Discord tab answers within 2.5 s** (none open, or a tab loaded before the script was installed), the invite is opened **in a new tab** instead and the button says so — the click always does something.

> After installing or updating the script, reload the tab where Discord is already open once: a tab loaded before the installation does not run the new version yet.

## Limits

- The script only works on `discord.com` and `discord.gg`.
- The invite is stored for 3 minutes: an invitation sent while no Discord tab is open is ignored.
- If the Discord page changes its account block, the button may need a page refresh to appear.

## Privacy

Everything stays in your browser: the invite code is written to the userscript storage (`GM_setValue`), read once by your Discord tab and cleared. No external server, no analytics.

---

Website: <https://script.jamesserver.fr/#discord-invite-tab>

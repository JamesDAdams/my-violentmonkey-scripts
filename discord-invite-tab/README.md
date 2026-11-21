**English** · [Français](README.fr.md)

# Discord Web Invite — Open in existing tab

Click the green button on a Discord invite page and the invite is sent to the Discord tab already open in your browser — no second Discord session, no login screen.

## What it adds

On `discord.com/invite/…` and `discord.gg/…`, a button **“Send to my Discord tab”** — or **« Envoyer vers mon onglet Discord »** depending on the browser language — appears right under the “Create Account” submit button.

Clicking it:

1. stores the invite code in the userscript storage (`GM_setValue`);
2. focuses the Discord tab you already have open (it names itself `discord_main_tab`).

That tab listens for the storage change (`GM_addValueChangeListener`), navigates to `/invite/{code}` and takes focus — Discord then shows its usual “join server” screen, logged in as you.

## Installation

[**Install the script**](https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/discord-invite-tab/discord-web-invite.user.js) — or copy [`discord-web-invite.user.js`](discord-web-invite.user.js) into Violentmonkey.

Header fields:

```js
// @match    *://discord.com/*
// @match    *://discord.gg/*
// @grant    GM_setValue
// @grant    GM_addValueChangeListener
// @grant    window.focus
```

## Requirements and limits

- A Discord tab must already be open **and logged in**, and opened *after* the script was installed — that is when it takes the `discord_main_tab` name.
- The two GM storage APIs are required: a `@grant none` fork cannot communicate between tabs.
- The invite page is a React app, so the button is inserted by a `MutationObserver` just below the submit button; it appears a moment after the page.
- If no Discord tab answers, the button simply switches to “Sent” — nothing breaks.
- The button label follows the browser language: French (“Envoyer vers mon onglet Discord”) or English (“Send to my Discord tab”).

## Privacy

No network request: the invite code travels from one tab to the other through the userscript manager’s storage. No analytics, no external service.

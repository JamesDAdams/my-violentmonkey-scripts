[English](README.md) · **Français**

# Discord Web Invite — Onglet existant

Un clic sur le bouton vert d'une page d'invitation Discord envoie l'invitation à l'onglet Discord déjà ouvert dans le navigateur — pas de seconde session, pas d'écran de connexion.

## Ce que ça ajoute

Sur `discord.com/invite/…` et `discord.gg/…`, un bouton **« Envoyer vers mon onglet Discord »** — ou **“Send to my Discord tab”** selon la langue du navigateur — apparaît juste sous le bouton d'envoi « Create Account ».

Au clic :

1. le code d'invitation est stocké dans le stockage du gestionnaire de userscripts (`GM_setValue`) ;
2. le focus passe à l'onglet Discord déjà ouvert (il s'est nommé `discord_main_tab`).

Cet onglet écoute la modification (`GM_addValueChangeListener`), ouvre `/invite/{code}` et reprend le focus — Discord affiche alors son écran habituel « rejoindre le serveur », avec votre session.

## Installation

[**Installer le script**](https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/discord-invite-tab/discord-web-invite.user.js) — ou copier [`discord-web-invite.user.js`](discord-web-invite.user.js) dans Violentmonkey.

Champs de l'en-tête :

```js
// @match    *://discord.com/*
// @match    *://discord.gg/*
// @grant    GM_setValue
// @grant    GM_addValueChangeListener
// @grant    window.focus
```

## Prérequis et limites

- Un onglet Discord doit déjà être ouvert **et connecté**, et ouvert *après* l'installation du script — c'est là qu'il prend le nom `discord_main_tab`.
- Les deux API de stockage GM sont indispensables : un fork en `@grant none` ne peut pas communiquer entre onglets.
- La page d'invitation est une application React : le bouton est inséré par un `MutationObserver` sous le bouton d'envoi, donc il apparaît un instant après le chargement.
- Si aucun onglet Discord ne répond, le bouton passe simplement à « Envoyé » — rien ne casse.

## Vie privée

Aucune requête réseau : le code d'invitation circule d'un onglet à l'autre via le stockage du gestionnaire de userscripts. Pas d'analyse, pas de service tiers.

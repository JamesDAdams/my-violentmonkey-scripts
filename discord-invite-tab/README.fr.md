**Français** · [English](README.md)

# Discord Web Invite — Ouvrir dans l'onglet existant

Cliquez sur le bouton vert d'une page d'invitation Discord : l'invitation part vers l'onglet Discord déjà ouvert dans votre navigateur — pas de seconde session, pas d'écran de connexion.

## Aperçu

<img src="screenshots/invite.png" width="320" alt="Page d'invitation Discord avec le bouton vert « Envoyer vers mon onglet Discord » sous Create Account">

## Installation

[<img src="https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/assets/install-fr.svg" width="96" height="28" alt="Installer Discord Web Invite">](https://raw.githubusercontent.com/JamesDAdams/my-violentmonkey-scripts/main/discord-invite-tab/discord-web-invite.user.js)

## Ce qu'il ajoute

Sur `discord.com/invite/…` et `discord.gg/…`, un bouton **« Envoyer vers mon onglet Discord »** — ou **“Send to my Discord tab”** selon la langue du navigateur — apparaît juste sous le bouton « Create Account ».

En cliquant dessus :

1. le code d'invitation est déposé dans le stockage du gestionnaire (`GM_setValue`) ;
2. l'onglet Discord déjà ouvert le lit (vérification toutes les 1,5 s avec `GM_getValue`), efface la valeur, puis navigue vers `/invite/{code}` et reprend le focus.

Discord affiche alors son écran « rejoindre le serveur », déjà connecté. Aucune requête réseau en dehors de Discord, pas de seconde session, pas d'écran de connexion.

> Si le bouton semble ne rien faire, rechargez une fois l'onglet où Discord est déjà ouvert : un onglet chargé avant l'installation du script n'a pas encore l'écouteur.

## Limites

- Le script ne fonctionne que sur `discord.com` et `discord.gg`.
- L'invitation est conservée 3 minutes : une invitation envoyée sans onglet Discord ouvert est ignorée.
- Si Discord change son bloc de connexion, un rafraîchissement de la page peut être nécessaire pour voir le bouton.

## Vie privée

Tout reste dans votre navigateur : le code d'invitation est écrit dans le stockage du gestionnaire (`GM_setValue`), lu une fois par votre onglet Discord puis effacé. Aucun serveur externe, aucune analyse.

---

Site : <https://script.jamesserver.fr/#discord-invite-tab>

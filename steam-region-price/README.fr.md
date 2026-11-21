[English](README.md) · **Français**

# Steam — Prix de la région + prix des clés (GG.deals)

Deux badges sur l'encart d'achat d'une fiche Steam :

- 🌍 le **prix Steam dans le pays de votre choix** (API de la boutique, `cc=<pays>`), avec un lien vers SteamDB ;
- 🔑 le **prix clé le moins cher** sur GG.deals, avec un lien vers la fiche du jeu sur GG.deals.

Les lignes de DLC reçoivent les deux mêmes badges.

## Configuration

Le script a besoin de trois valeurs, à définir en tête de fichier :

| Réglage | À quoi ça sert | Exemple |
| --- | --- | --- |
| `GG_DEALS_API_KEY` | votre clé API GG.deals, gratuite ([gg.deals/api](https://gg.deals/api/)) | `AbCdEf123456` |
| `GG_DEALS_REGION` | pays/région utilisés pour les prix des **clés** (devise) | `fr` |
| `STEAM_REGION` | pays dont on veut voir le **prix Steam** | `ar`, `tr`, `us`… |
| `SHOW_STEAM_REGION` | afficher le badge de prix Steam | `true` |
| `SHOW_GGDEALS` | afficher le badge de prix des clés | `true` |

Les deux parties se désactivent indépendamment, **mais pas les deux en même temps** : sans aucune des deux le script n'afficherait rien, donc l'installeur le bloque (et le script retombe sur le prix Steam).

**Recommandé : passez par l'installeur du site** — <https://script.jamesserver.fr/#steam-region-price> — une fenêtre demande les trois valeurs (listes de pays avec drapeaux et recherche), puis génère le fichier avec vos valeurs. Rien n'est envoyé : le fichier est fabriqué dans votre navigateur et téléchargé.

**Ou à la main :** ouvrez le script dans Violentmonkey et modifiez les trois constantes :

```js
const GG_DEALS_API_KEY = 'VOTRE_CLE_API_ICI';
const GG_DEALS_REGION = 'fr';
const STEAM_REGION = 'ar';
const SHOW_STEAM_REGION = true;
const SHOW_GGDEALS = true;
```

Sans clé API, le badge clé affiche « Clé API requise » et renvoie vers la page GG.deals ; le badge de prix Steam continue de fonctionner.

## Fonctionnement

- Prix Steam : requête `GM_xmlhttpRequest` vers `store.steampowered.com/api/{appdetails|packagedetails}?cc=<STEAM_REGION>` pour chaque option d'achat (`input[name=subid]`) et chaque ligne de DLC.
- Prix clé : `api.gg.deals/v1/prices/by-steam-app-id` avec votre clé et `region=<GG_DEALS_REGION>`, puis le plus bas des prix keyshop / officiel.
- Les badges sont insérés au début de `.game_purchase_action_bg` et `.game_area_dlc_price` ; les démos (`demo_above_purchase`) sont ignorées.
- Les libellés suivent la langue du navigateur (français ou anglais) ; le drapeau et le nom du pays sont déduits du code ISO.

## Limites

- L'API GG.deals est limitée en débit sur l'offre gratuite : il arrive qu'un prix affiche « Erreur API ».
- Un jeu sans clé disponible affiche « Aucune clé ».
- Le prix `cc=` est celui de la boutique pour ce pays ; il ne tient pas compte des restrictions de paiement régionales.

## Vie privée

Votre clé API reste dans le script, sur votre machine. Les seuls appels réseau vont à `store.steampowered.com` et `api.gg.deals` — aucun autre domaine, aucune analyse.

**English** · [Français](README.fr.md)

# Steam — Region price + key price (GG.deals)

Two badges on the purchase box of a Steam game page:

- 🌍 the **Steam price in the country you choose** (store API, `cc=<country>`), linking to SteamDB;
- 🔑 the **cheapest key price** on GG.deals, linking to the GG.deals page of the game.

DLC rows get the same two badges.

## Configure it

The script needs three values, set at the top of the file:

| Setting | What it is | Example |
| --- | --- | --- |
| `GG_DEALS_API_KEY` | your free GG.deals API key ([gg.deals/api](https://gg.deals/api/)) | `AbCdEf123456` |
| `GG_DEALS_REGION` | country/region used for **key** prices (currency) | `fr` |
| `STEAM_REGION` | country whose **Steam** price you want to see | `ar`, `tr`, `us`… |

**Recommended: use the installer on the site** — <https://script.jamesserver.fr/#steam-region-price> — a dialog asks for the three values (country lists with flags and search), then generates the file with your values in it. Nothing is sent anywhere: the file is built in your browser and downloaded.

**Or manually:** open the script in Violentmonkey and edit the three constants at the top:

```js
const GG_DEALS_API_KEY = 'VOTRE_CLE_API_ICI';
const GG_DEALS_REGION = 'fr';
const STEAM_REGION = 'ar';
```

Without an API key the key badge shows “Clé API requise” / “API key required” and links to the GG.deals API page; the Steam price badge keeps working.

## How it works

- Steam price: `GM_xmlhttpRequest` to `store.steampowered.com/api/{appdetails|packagedetails}?cc=<STEAM_REGION>` for each purchase option (`input[name=subid]`) and each DLC row.
- Key price: `api.gg.deals/v1/prices/by-steam-app-id` with your key and `region=<GG_DEALS_REGION>`, then the lower of keyshop / retail price.
- Badges are inserted at the start of `.game_purchase_action_bg` and `.game_area_dlc_price`; demos (`demo_above_purchase`) are skipped.
- UI strings follow the browser language (French or English); the flag and country name are derived from the ISO code.

## Limits

- The GG.deals API is rate-limited on the free plan: prices may occasionally show “API error”.
- A game with no key available shows “Aucune clé” / “No keys”.
- Steam's `cc=` price is the store price for that country; it does not include regional payment restrictions.

## Privacy

Your API key lives in the script, on your machine. The only network calls are to `store.steampowered.com` and `api.gg.deals` — no other domain, no analytics.

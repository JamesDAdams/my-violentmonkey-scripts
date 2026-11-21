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
| `SHOW_STEAM_REGION` | show the Steam price badge | `true` |
| `SHOW_GGDEALS` | show the GG.deals key badge | `true` |

Both sections can be turned off independently, **but not at the same time**: with both disabled the script would show nothing, so the installer blocks it (and the script falls back to the Steam price).

**Recommended: use the installer on the site** — <https://script.jamesserver.fr/#steam-region-price> — a dialog asks for the values (country lists with flags and search), then **installs the script directly**, exactly like the other install buttons: the manager intercepts a `*.user.js` URL that carries your values in its query string, and the script reads them at runtime from `GM_info.script.downloadURL`. Nothing is sent to a server; the values only live in the script's install URL, on your machine. A “Download a copy” link is also available.

### If the installer values did not apply

Some managers do not keep the install URL. On a game page, click the **⚙** badge next to the price badges: a panel opens with the key, the two regions and the two toggles, and stores them with `GM_setValue` (on your machine). The console prints the configuration in use at startup: `[Steam region] configuration (install parameters | stored settings | file values)`.

The **“Download a copy”** link of the installer does the opposite: it writes your values directly in the file's constants.

**Or manually:** open the script in Violentmonkey and edit the three constants at the top:

```js
const GG_DEALS_API_KEY = 'VOTRE_CLE_API_ICI';
const GG_DEALS_REGION = 'fr';
const STEAM_REGION = 'ar';
const SHOW_STEAM_REGION = true;
const SHOW_GGDEALS = true;
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

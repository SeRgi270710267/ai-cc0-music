# AI CC0 Music

Spotify-style static player for the public [Mureka](https://www.mureka.ai/profile?user_id=146903878795265) catalog of **AI CC0 Music**.

- **Repo:** https://github.com/SeRgi270710267/ai-cc0-music
- **Live:** https://sergi270710267.github.io/ai-cc0-music/
- **Branch:** `main` (HEAD at last save: mobile topbar + Events layout)

## Resume in Grok Build (other PC)

1. Open this repo in Grok Build: `SeRgi270710267/ai-cc0-music` on `main`.
2. Site is GitHub Pages, static, hash-routed SPA. Do not add a server.
3. After JS/CSS edits, bump the `?v=` query on **all** scripts/styles in `index.html` so Pages CDN does not serve stale files (current: `?v=events2`).
4. Hard-refresh the live site with Ctrl+F5 after a Pages deploy.
5. Anonymous account data lives in **this browser** (`localStorage` key `aicc0.vault`). It is not in git. Move devices with Download backup / Import backup.

## Constraints

- Only **published** Mureka songs. Do not expose private/unpublished data or the profile email.
- Audio streams from `https://static-cos.mureka.ai/`.
- GitHub Pages is static. No backend.
- Logged-in library is opt-in. Home can still suggest catalog items until the user hides them.

## What works now

- Spotify-like shell: sidebar, Home feed, Search, **Events**, Library, artist page, album/track pages, bottom player, lyrics, queue.
- **Events** (`#/events`): static schedule from `events.json` (album/single/show drops). Edit the JSON and push — no backend.
- Mobile: `mobile.css` overlay clamps shared topbar + Events hero/cards on narrow phones (~412px); no horizontal page scroll. Cache `?v=events2`.
- Catalog: artist **AI CC0 Music**; tracks **Un Ange en Danger**, **For America**; voices **Joanny**, **Sivle**; video **Le Rock Encore**; CC0.
- Home chips: All, Music, Playlists, Artists, Albums, Videos.
- **This Is Joanny / This Is Sivle** are playlists. **Joanny / Sivle** are artists. **AI CC0 Music** is the artist.
- Logged-in Home: **×** on a playlist, album, or artist card hides it from Home. Search still finds it; **Add back** restores it.
- Like / Liked Songs: track page uses a **Like / Liked** pill (same shape as Radio and Mureka). Liked tracks show in Your Library.
- Anonymous Mullvad-style 16-digit accounts: generate, login, logout, export/import JSON. No email.
- Player bar is opaque `#181818`.

## Script load order (`index.html`)

```
core.js → account.js → views.js → boot.js → home-boot.js → prefs.js → like-fix.js → events.js
```

| File | Role |
| --- | --- |
| `core.js` | Catalog, player core, `state`, `toggleLike` (base) |
| `account.js` | Vault `aicc0.vault`, anonymous accounts, follow |
| `views.js` | Track rows, album/artist/search templates |
| `boot.js` | Routing, `render`, player bar, click handlers |
| `home-boot.js` | Home filter chips |
| `prefs.js` | Logged-in Home/library, hide-from-Home, Search restore |
| `like-fix.js` | Like UI refresh, Liked Songs in library |
| `events.js` / `events.css` | Events page overlay (`#/events`), schedule UI |
| `events.json` | Public upcoming/released schedule (repo root) |
| `styles.css` / `fix.css` / `account.css` / `mobile.css` | Layout, spacing, opaque player, like pills, mobile clamp |
| `catalog.json` | Published snapshot |
| `scripts/sync_catalog.py` | Rebuild snapshot from Mureka |

Overlays in `prefs.js` and `like-fix.js` override functions from earlier files. Prefer editing those overlays (or the source they wrap) rather than duplicating logic.

## Hash routes

`#/` Home, `#/search`, `#/events`, `#/library`, `#/artist`, `#/liked`, `#/playlist/:id`, `#/album/:id`.

## Add an event

Edit `events.json` at the repo root (array of objects). Each item:

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Stable string id |
| `title` | yes | Display title |
| `type` | yes | `album` \| `single` \| `show` \| `other` |
| `date` | yes | ISO date (`YYYY-MM-DD`) or datetime |
| `time` | no | Free-text time / timezone note |
| `cover` | no | Image URL |
| `description` | no | Short blurb |
| `link` | no | Mureka / share URL |
| `status` | yes | `upcoming` \| `released` |

Commit and push to `main`. Pages deploys the updated schedule. Personal/private notes can later use vault `aicc0.vault`; the public schedule stays in the repo.

## Refresh the catalog snapshot

```bash
python scripts/sync_catalog.py
```

Or run the **Sync Mureka catalog** GitHub Action.

## Pages

Deploy is `.github/workflows/pages.yml` on push to `main`. Source: GitHub Actions. Site: https://sergi270710267.github.io/ai-cc0-music/

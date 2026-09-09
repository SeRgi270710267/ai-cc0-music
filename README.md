# AI CC0 Music

Spotify-style static player for the public [Mureka](https://www.mureka.ai/profile?user_id=146903878795265) catalog of **AI CC0 Music**.

- **Repo:** https://github.com/SeRgi270710267/ai-cc0-music
- **Live:** https://sergi270710267.github.io/ai-cc0-music/
- **Branch:** `main` (HEAD at last save: Home dismiss for playlists, albums, artists)

## Resume in Grok Build (other PC)

1. Open this repo in Grok Build: `SeRgi270710267/ai-cc0-music` on `main`.
2. Site is GitHub Pages, static, hash-routed SPA. Do not add a server.
3. After JS/CSS edits, bump the `?v=likeN` query on scripts/styles in `index.html` so Pages CDN does not serve stale files.
4. Hard-refresh the live site with Ctrl+F5 after a Pages deploy.
5. Anonymous account data lives in **this browser** (`localStorage` key `aicc0.vault`). It is not in git. Move devices with Download backup / Import backup.

## Constraints

- Only **published** Mureka songs. Do not expose private/unpublished data or the profile email.
- Audio streams from `https://static-cos.mureka.ai/`.
- GitHub Pages is static. No backend.
- Logged-in library is opt-in. Home can still suggest catalog items until the user hides them.

## What works now

- Spotify-like shell: sidebar, Home feed, Search, Library, artist page, album/track pages, bottom player, lyrics, queue.
- Catalog: artist **AI CC0 Music**; tracks **Un Ange en Danger**, **For America**; voices **Joanny**, **Sivle**; video **Le Rock Encore**; CC0.
- Home chips: All, Music, Playlists, Artists, Albums, Videos.
- **This Is Joanny / This Is Sivle** are playlists. **Joanny / Sivle** are artists. **AI CC0 Music** is the artist.
- Logged-in Home: **×** on a playlist, album, or artist card hides it from Home. Search still finds it; **Add back** restores it.
- Like / Liked Songs: track page uses a **Like / Liked** pill (same shape as Radio and Mureka). Liked tracks show in Your Library.
- Anonymous Mullvad-style 16-digit accounts: generate, login, logout, export/import JSON. No email.
- Player bar is opaque `#181818`.

## Script load order (`index.html`)

```
core.js → account.js → views.js → boot.js → home-boot.js → prefs.js → like-fix.js
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
| `styles.css` / `fix.css` / `account.css` | Layout, spacing, opaque player, like pills |
| `catalog.json` | Published snapshot |
| `scripts/sync_catalog.py` | Rebuild snapshot from Mureka |

Overlays in `prefs.js` and `like-fix.js` override functions from earlier files. Prefer editing those overlays (or the source they wrap) rather than duplicating logic.

## Hash routes

`#/` Home, `#/search`, `#/library`, `#/artist`, `#/liked`, `#/playlist/:id`, `#/album/:id`.

## Refresh the catalog snapshot

```bash
python scripts/sync_catalog.py
```

Or run the **Sync Mureka catalog** GitHub Action.

## Pages

Deploy is `.github/workflows/pages.yml` on push to `main`. Source: GitHub Actions. Site: https://sergi270710267.github.io/ai-cc0-music/

# AI CC0 Music

Spotify-style web player for the public [Mureka](https://www.mureka.ai/profile?user_id=146903878795265) catalog of **AI CC0 Music**.

Live site (after Pages is enabled): **https://sergi270710267.github.io/ai-cc0-music/**

## Turn the site on (one click)

GitHub needs you to enable Pages once:

1. Open [Settings → Pages](https://github.com/SeRgi270710267/ai-cc0-music/settings/pages).
2. Under **Build and deployment → Source**, pick **GitHub Actions**.
3. Open [Actions](https://github.com/SeRgi270710267/ai-cc0-music/actions) and re-run **Deploy GitHub Pages**.

Or pick **Deploy from a branch**, branch `main`, folder `/ (root)`. That publishes without waiting on Actions.

## What it does

- Looks like a Spotify client (sidebar, artist header, popular tracks, discography, bottom player, lyrics).
- Plays the **published** songs from the Mureka profile.
- Streams audio and covers from Mureka’s public CDN (`static-cos.mureka.ai`).
- Refreshes the catalog from Mureka’s public profile APIs in the browser. If that is blocked, it falls back to `catalog.json`.

It does **not** copy private/unpublished drafts, emails, or account data.

## Repo layout

| File | Role |
| --- | --- |
| `index.html` / `styles.css` / `app.js` | Player UI |
| `catalog.json` | Snapshot of published tracks, lyrics, videos, voices |
| `scripts/sync_catalog.py` | Rebuild the snapshot |
| `.github/workflows/pages.yml` | GitHub Pages deploy |

## Refresh the snapshot

```bash
python scripts/sync_catalog.py
```

Or run the **Sync Mureka catalog** GitHub Action.

## Notes

- GitHub Pages is static. Playback uses Mureka’s public MP3 URLs, not files stored in this repo.
- Only tracks you have **published** on Mureka appear here. Publish more on Mureka and they show up on the next load.
- This is an unofficial fan player, not affiliated with Spotify or Mureka.

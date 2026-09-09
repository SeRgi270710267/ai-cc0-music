#!/usr/bin/env python3
"""Rebuild catalog.json from the public Mureka profile APIs."""
import json
import os
import urllib.request
from datetime import datetime, timezone

USER = "146903878795265"
CDN = "https://static-cos.mureka.ai/"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def get(url):
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Referer": f"https://www.mureka.ai/profile?user_id={USER}",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def cdn(p):
    if not p:
        return ""
    if p.startswith("http"):
        return p.split("?")[0] if "x-oss-process" in p else p
    return CDN + p.lstrip("/")


def lyrics_flat(lyrics):
    out = []
    if not lyrics:
        return out
    for seg in lyrics:
        tag = seg.get("user_input_tag")
        if tag:
            out.append({"t": None, "text": tag, "section": True})
        for row in seg.get("rows") or []:
            out.append({"t": row.get("start"), "text": row.get("text") or "", "section": False})
    return out


def main():
    prof = get(f"https://www.mureka.ai/api/pgc/personal/profile?user_id={USER}")["data"]["user"]
    songs_raw = get(
        f"https://www.mureka.ai/api/pgc/user/published/songs?user_id={USER}&page_size=50"
    )["data"]
    videos_raw = get(f"https://www.mureka.ai/api/pgc/video/published/list?user_id={USER}")["data"]

    songs = []
    chars = {}
    for f in songs_raw.get("feeds") or []:
        s = f.get("song") or {}
        det = get(f"https://www.mureka.ai/api/pgc/song/detail?song_id={s['song_id']}")["data"]
        song = det.get("song") or s
        ch = song.get("character") or det.get("character") or {}
        if ch.get("id"):
            chars[str(ch["id"])] = {
                "id": ch.get("id"),
                "name": ch.get("name"),
                "tags": ch.get("tags") or [],
                "avatar": cdn(ch.get("avatar")),
            }
        songs.append(
            {
                "id": str(song.get("song_id")),
                "title": song.get("title"),
                "duration_ms": song.get("duration_milliseconds"),
                "mp3": cdn(song.get("mp3_url")),
                "cover": cdn(song.get("cover")),
                "share_key": song.get("share_key"),
                "mureka_url": f"https://www.mureka.ai/song-detail/{song.get('song_id')}",
                "genres": song.get("genres") or [],
                "moods": song.get("moods") or [],
                "description": song.get("description") or "",
                "model": song.get("model"),
                "published_at": song.get("publish_at"),
                "generated_at": song.get("generate_at"),
                "play_count": det.get("play_count") or 0,
                "share_count": det.get("share_count") or 0,
                "fav_count": det.get("fav_count") or 0,
                "character": ch.get("name"),
                "character_id": ch.get("id"),
                "lyrics": lyrics_flat(song.get("lyrics")),
            }
        )

    videos = []
    for v in videos_raw.get("list") or []:
        title = (v.get("title") or "").replace("_lyricsvideo_v_1", "").replace("_", " ")
        videos.append(
            {
                "id": str(v.get("video_id")),
                "title": title.strip(),
                "url": cdn(v.get("video_url")),
                "cover": cdn(v.get("video_cover_url")),
                "duration_ms": v.get("duration_milliseconds"),
                "share_key": v.get("share_key"),
                "song_id": str(v.get("song_id") or ""),
            }
        )

    name = prof.get("stage_name") or "AI CC0 Music"
    display = "AI CC0 Music" if name.startswith("AI CC0 Music") else name
    catalog = {
        "user_id": USER,
        "name": display,
        "stage_name": name,
        "avatar": cdn(prof.get("profile_image")),
        "likes": prof.get("liked_count") or 0,
        "country": prof.get("country_code"),
        "mureka_url": f"https://www.mureka.ai/profile?user_id={USER}",
        "license": "CC0",
        "songs": songs,
        "videos": videos,
        "characters": list(chars.values()),
        "synced_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    out = os.path.join(ROOT, "catalog.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(catalog, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(f"wrote {out} ({len(songs)} songs, {len(videos)} videos)")


if __name__ == "__main__":
    main()

function trackRows(list, extra) {
  extra = extra || "plays";
  return list.map((s, i) => {
    const on = current() && current().id === s.id;
    const idx = on && state.playing ? eq() : i + 1;
    return `<tr class="${on ? "playing" : ""}" data-song="${s.id}">
      <td class="idx">${idx}</td>
      <td><div class="t-cell"><img src="${s.cover}" alt=""><div><div>${escapeHtml(s.title)}</div><div class="t-sub">${escapeHtml(s.character || state.catalog.name)}</div></div></div></td>
      <td class="t-sub">${extra === "album" ? "Single" : (s.play_count || 0).toLocaleString()}</td>
      <td><button class="follow like-pill ${state.liked.has(s.id) ? "on" : ""}" data-like="${s.id}" type="button">${state.liked.has(s.id) ? "Liked" : "Like"}</button></td>
      <td class="dur">${fmt(s.duration_ms)}</td>
    </tr>`;
  }).join("");
}
function cardSong(s) {
  return `<article class="card" data-song="${s.id}" data-open="album/${s.id}">
    <img src="${s.cover}" alt="">
    <button class="hover-play" data-play="${s.id}" type="button">${PLAY}</button>
    <h3>${escapeHtml(s.title)}</h3>
    <p>${year(s.published_at)} · Single</p>
  </article>`;
}
function playlistHero(title, sub, ico, cover, ids, cls) {
  const art = cover ? `<img class="big-cover" src="${cover}" alt="">` : `<div class="${ico || "liked-ico"} big-cover" style="width:192px;height:192px;font-size:72px;border-radius:8px">${ico === "liked-ico" ? "♥" : "♪"}</div>`;
  return `<section class="hero ${cls || ""}">${art}<div>
    <div class="kicker">Playlist</div><h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(sub)} · ${ids.length} songs</div></div></section>
    <div class="actions">
      <button class="play-lg" data-play-list="${ids.join(",")}" type="button">${PLAY}</button>
      <button class="follow" data-shuffle-list="${ids.join(",")}" type="button">Shuffle</button>
    </div>
    <section class="section">${ids.length
      ? `<table class="tracks"><thead><tr><th>#</th><th>Title</th><th>Plays</th><th></th><th></th></tr></thead><tbody>${trackRows(ids.map(songById).filter(Boolean))}</tbody></table>`
      : `<p class="empty">Nothing here yet.</p>`}</section>`;
}
function coverArt(m) {
  if (m.cover) return `<img src="${m.cover}" alt="" class="${m.round ? "artist" : ""}">`;
  if (m.id === "liked") return `<div class="liked-ico card-art">♥</div>`;
  return `<div class="mix-ico ${m.ico || "green"} card-art">♪</div>`;
}
function mixCard(m) {
  return `<article class="card" data-go="playlist/${m.id}">
    ${coverArt(m)}
    <button class="hover-play" data-play-list="${(m.ids || []).join(",")}" type="button">${PLAY}</button>
    <h3>${escapeHtml(m.name)}</h3>
    <p>${escapeHtml(m.desc)}</p>
  </article>`;
}
function artistCard(name, sub, img, go, playIdsList, round) {
  return `<article class="card ${round ? "artist" : ""}" data-go="${go}">
    <img src="${img}" alt="">
    <button class="hover-play" data-play-list="${(playIdsList || []).join(",")}" type="button">${PLAY}</button>
    <h3>${escapeHtml(name)}</h3>
    <p>${escapeHtml(sub)}</p>
  </article>`;
}
function homeRow(title, inner, see) {
  if (!inner) return "";
  return `<section class="section">
    <div class="section-head"><h2>${title}</h2>${see || ""}</div>
    <div class="row-scroll">${inner}</div>
  </section>`;
}
function renderHome() {
  const c = state.catalog;
  const rec = state.recents.map(songById).filter(Boolean);
  const mx = mixes().filter((m) => m.id !== "liked");
  const liked = mixById("liked");
  const jump = rec.length ? rec : songs();
  const tiles = [
    { go: "liked", title: "Liked Songs", liked: true, play: (liked && liked.ids) || [] },
    ...jump.slice(0, 2).map((s) => ({ go: `album/${s.id}`, title: s.title, img: s.cover, play: [s.id] })),
    { go: "artist", title: c.name, img: c.avatar, play: songs().map((s) => s.id) },
    ...mx.slice(0, 4).map((m) => ({ go: `playlist/${m.id}`, title: m.name, img: m.cover, ico: m.ico, play: m.ids || [] })),
  ].slice(0, 8);
  const filter = state.homeFilter || "all";
  const music = filter !== "videos";
  const videosOn = filter !== "music";
  const genreMixes = mx.filter((m) => m.kind === "genre" || m.kind === "mood");
  const voiceMixes = mx.filter((m) => m.kind === "voice");
  viewEl.innerHTML = `<div class="home-wrap">
    <h1 class="greeting">${greeting()}</h1>
    <div class="home-filters">
      <button class="chip-btn ${filter === "all" ? "on" : ""}" data-homefilter="all" type="button">All</button>
      <button class="chip-btn ${filter === "music" ? "on" : ""}" data-homefilter="music" type="button">Music</button>
      <button class="chip-btn ${filter === "videos" ? "on" : ""}" data-homefilter="videos" type="button">Videos</button>
    </div>
    ${music ? `<div class="shortcuts">${tiles.map((t) => `<button class="shortcut" data-go="${t.go}" type="button">
      ${t.liked ? `<div class="liked-ico">♥</div>` : t.img ? `<img src="${t.img}" alt="">` : `<div class="mix-ico ${t.ico || "green"}">♪</div>`}
      <span>${escapeHtml(t.title)}</span>
      <span class="hover-play" data-play-list="${(t.play || []).join(",")}">${PLAY}</span>
    </button>`).join("")}</div>` : ""}
    ${music ? homeRow("Jump back in", jump.map(cardSong).join("")) : ""}
    ${music ? homeRow("Made for you", mx.slice(0, 8).map(mixCard).join(""), `<a class="see" data-go="library" href="#/library">Show all</a>`) : ""}
    ${music && genreMixes.length ? homeRow("Your top mixes", genreMixes.map(mixCard).join("")) : ""}
    ${music ? homeRow("Popular artists", artistCard(c.name, "Artist", c.avatar, "artist", songs().map((s) => s.id), true) + voiceMixes.map((m) => artistCard(m.name, m.desc, m.cover, `playlist/${m.id}`, m.ids, true)).join("")) : ""}
    ${music ? homeRow("New releases", songs().map(cardSong).join(""), `<a class="see" data-go="artist" href="#/artist">Show all</a>`) : ""}
    ${videosOn && (c.videos || []).length ? homeRow("Music videos", c.videos.map((v) => `<article class="card video-card">
      <video src="${v.url}" poster="${v.cover}" controls preload="metadata"></video>
      <h3>${escapeHtml(v.title)}</h3><p>Video · ${fmt(v.duration_ms)}</p></article>`).join("")) : ""}
  </div>`;
}
function renderSearch() {
  const q = state.query.trim().toLowerCase();
  if (!q) {
    const cats = [...new Set([...songs().flatMap((s) => s.genres || []), ...songs().flatMap((s) => s.moods || [])])];
    viewEl.innerHTML = `<section class="section"><h2>Browse all</h2>
      <div class="browse">${cats.map((c) => `<button class="browse-tile" data-go="${songs().some((s) => (s.genres || []).includes(c)) ? "playlist/genre-" + c : "playlist/mood-" + c}" style="background:${colorFor(c)}" type="button">${escapeHtml(c)}</button>`).join("")}</div></section>`;
    return;
  }
  const hit = songs().filter((s) => [s.title, s.character, ...(s.genres || []), ...(s.moods || []), s.description].join(" ").toLowerCase().includes(q));
  const pls = mixes().filter((m) => m.name.toLowerCase().includes(q));
  viewEl.innerHTML = `<section class="section"><h2>Songs</h2>${hit.length ? `<table class="tracks"><thead><tr><th>#</th><th>Title</th><th>Plays</th><th></th><th></th></tr></thead><tbody>${trackRows(hit)}</tbody></table>` : `<p class="empty">No songs matched.</p>`}</section>
    <section class="section"><h2>Playlists</h2><div class="cards">${pls.map((m) => `<article class="card" data-go="playlist/${m.id}"><div class="mix-ico ${m.ico}" style="width:100%;aspect-ratio:1;border-radius:8px;margin-bottom:10px">♪</div><h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.desc)}</p></article>`).join("") || `<p class="empty">No playlists.</p>`}</div></section>`;
}
function renderLibrary() {
  renderLib();
  viewEl.innerHTML = `<section class="section"><h2>Your Library</h2>
    <p class="t-sub">Playlists, artist, albums, and mixes built from the Mureka catalog.</p>
    <div class="cards">${libEntries().map((e) => `<article class="card ${e.round ? "artist" : ""}" data-go="${e.go}">
      ${e.img ? `<img src="${e.img}" alt="">` : `<div class="${e.cls}" style="width:100%;aspect-ratio:1;border-radius:8px;margin-bottom:10px">${e.glyph || "♪"}</div>`}
      <h3>${escapeHtml(e.name)}</h3><p>${escapeHtml(e.sub)}</p></article>`).join("")}</div></section>`;
}
function libEntries() {
  const c = state.catalog;
  const f = state.libFilter;
  const items = [];
  if (f === "all" || f === "playlists") {
    items.push({ go: "liked", name: "Liked Songs", sub: `Playlist · ${[...state.liked].length} songs`, cls: "liked-ico", glyph: "♥" });
    for (const m of mixes().filter((m) => m.id !== "liked")) items.push({ go: `playlist/${m.id}`, name: m.name, sub: m.desc, img: m.cover, cls: `mix-ico ${m.ico}` });
    for (const p of state.playlists) items.push({ go: `playlist/${p.id}`, name: p.name, sub: `Playlist · ${(p.ids || []).length} songs`, cls: "mix-ico blue" });
  }
  if (f === "all" || f === "artists") {
    items.push({ go: "artist", name: c.name, sub: "Artist", img: c.avatar, round: true });
    for (const ch of c.characters || []) items.push({ go: `playlist/voice-${ch.id}`, name: ch.name, sub: "Voice", img: ch.avatar, round: true });
  }
  if (f === "all" || f === "albums") {
    for (const s of songs()) items.push({ go: `album/${s.id}`, name: s.title, sub: "Single", img: s.cover });
  }
  return items;
}
function renderLib() {
  document.getElementById("lib-list").innerHTML = libEntries().slice(0, 20).map((e) => `<button class="lib-item ${e.round ? "round" : ""}" data-go="${e.go}" type="button">
    ${e.img ? `<img src="${e.img}" alt="">` : `<div class="${e.cls}">${e.glyph || "♪"}</div>`}
    <span><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(e.sub)}</small></span></button>`).join("");
}
function renderArtist() {
  const c = state.catalog;
  const popular = [...songs()].sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
  const genres = [...new Set(songs().flatMap((s) => s.genres || []))];
  const moods = [...new Set(songs().flatMap((s) => s.moods || []))];
  viewEl.innerHTML = `<section class="hero">
      <img class="avatar" src="${c.avatar}" alt="">
      <div><div class="kicker"><span class="verified">✓</span> Artist</div>
      <h1>${escapeHtml(c.name)}</h1>
      <div class="meta">${(c.likes || 0).toLocaleString()} likes · ${songs().length} tracks · ${c.license} · ${c.country || ""}</div></div></section>
    <div class="actions">
      <button class="play-lg" data-play-list="${songs().map((s) => s.id).join(",")}" type="button">${state.playing ? PAUSE : PLAY}</button>
      <button class="follow ${state.following ? "on" : ""}" id="follow-btn" type="button">${state.following ? "Following" : "Follow"}</button>
      <button class="follow" data-shuffle-list="${songs().map((s) => s.id).join(",")}" type="button">Shuffle</button>
      <a class="follow" href="${c.mureka_url}" target="_blank" rel="noopener">Open on Mureka</a>
    </div>
    <section class="section"><h2>Popular</h2>
      <table class="tracks"><thead><tr><th>#</th><th>Title</th><th>Plays</th><th></th><th></th></tr></thead><tbody>${trackRows(popular)}</tbody></table></section>
    <section class="section"><h2>Discography</h2><div class="cards">${songs().map(cardSong).join("")}</div></section>
    <section class="section"><h2>About</h2><div class="about">
      <p>Public catalog mirrored from Mureka. Audio streams from Mureka’s CDN. New published tracks appear automatically.</p>
      <p>${genres.concat(moods).map((g) => `<span class="chip">${escapeHtml(g)}</span>`).join("")}</p>
    </div></section>`;
}
function renderPlaylist() {
  const id = state.route.id || "liked";
  const mix = mixById(id);
  if (!mix) { viewEl.innerHTML = `<p class="empty">Playlist not found.</p>`; return; }
  const ids = mix.ids || [];
  const cover = mix.cover || (songById(ids[0]) || {}).cover;
  viewEl.innerHTML = playlistHero(mix.name, mix.desc || "Playlist", id === "liked" ? "liked-ico" : "mix-ico green", cover, ids, id === "liked" ? "purple" : "");
}
function renderAlbum() {
  const s = songById(state.route.id);
  if (!s) { viewEl.innerHTML = `<p class="empty">Release not found.</p>`; return; }
  viewEl.innerHTML = `<section class="hero">
      <img class="big-cover" src="${s.cover}" alt="">
      <div><div class="kicker">Single</div><h1>${escapeHtml(s.title)}</h1>
      <div class="meta">${escapeHtml(state.catalog.name)} · ${year(s.published_at)} · ${fmt(s.duration_ms)} · ${s.model || "Mureka"}</div></div></section>
    <div class="actions">
      <button class="play-lg" data-play="${s.id}" type="button">${PLAY}</button>
      <button class="follow like-pill ${state.liked.has(s.id) ? "on" : ""}" data-like="${s.id}" type="button">${state.liked.has(s.id) ? "Liked" : "Like"}</button>
      <button class="follow" data-radio="${s.id}" type="button">Radio</button>
      <a class="follow" href="${s.mureka_url}" target="_blank" rel="noopener">Mureka</a>
    </div>
    <section class="section"><table class="tracks"><thead><tr><th>#</th><th>Title</th><th></th><th></th><th></th></tr></thead><tbody>${trackRows([s], "album")}</tbody></table></section>
    <section class="section"><h2>About this track</h2><dl class="credits about">
      <dt>Voice</dt><dd>${escapeHtml(s.character || "—")}</dd>
      <dt>Genres</dt><dd>${escapeHtml((s.genres || []).join(", ") || "—")}</dd>
      <dt>Moods</dt><dd>${escapeHtml((s.moods || []).join(", ") || "—")}</dd>
      <dt>Prompt</dt><dd>${escapeHtml(s.description || "—")}</dd>
    </dl></section>
    ${s.lyrics && s.lyrics.length ? `<section class="section"><h2>Lyrics</h2><div class="about">${s.lyrics.map((l) => `<div class="lyric-line ${l.section ? "section" : ""}">${escapeHtml(l.text)}</div>`).join("")}</div></section>` : ""}`;
}

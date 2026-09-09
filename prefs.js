function isLoggedIn() {
  return typeof currentAccountId === "function" && !!currentAccountId();
}
function isHidden(id) {
  return !!(state.hidden && state.hidden.has(String(id)));
}
function homeOff(key) {
  return !!(state.homeOff && state.homeOff.has(key));
}
function ensurePrefs() {
  if (!state.hidden) state.hidden = new Set();
  if (!state.homeOff) state.homeOff = new Set();
  if (!state.follows) state.follows = new Set();
}

const _snapFromState = snapFromState;
snapFromState = function () {
  ensurePrefs();
  const s = _snapFromState();
  s.hidden = [...state.hidden];
  s.homeOff = [...state.homeOff];
  return s;
};
const _applySnap = applySnap;
applySnap = function (s) {
  _applySnap(s);
  ensurePrefs();
  state.hidden = new Set((s && s.hidden) || []);
  state.homeOff = new Set((s && s.homeOff) || []);
};
(function reloadPrefs() {
  ensurePrefs();
  const vault = loadVault();
  const snap = (vault.current && vault.accounts[vault.current]) || vault.guest || {};
  state.hidden = new Set(snap.hidden || []);
  state.homeOff = new Set(snap.homeOff || []);
})();

function removeFromLibrary(id) {
  ensurePrefs();
  id = String(id);
  const userPl = state.playlists.find((p) => p.id === id);
  if (userPl) {
    state.playlists = state.playlists.filter((p) => p.id !== id);
    toast("Playlist deleted");
  } else if (id === "liked") {
    if (state.hidden.has("liked")) state.hidden.delete("liked");
    else state.hidden.add("liked");
    toast(state.hidden.has("liked") ? "Liked Songs hidden" : "Liked Songs restored");
  } else {
    state.follows.delete(id);
    if (id === "artist") state.following = false;
    state.hidden.add(id);
    toast(isLoggedIn() ? "Removed from view. Search to find it again." : "Removed from Your Library");
  }
  save();
  if (typeof render === "function") render();
}

function libEntries() {
  ensurePrefs();
  const c = state.catalog;
  const f = state.libFilter;
  const logged = isLoggedIn();
  const items = [];
  if (f === "all" || f === "playlists") {
    if (!isHidden("liked")) {
      items.push({ go: "liked", name: "Liked Songs", sub: `Playlist \u00b7 ${[...state.liked].length} songs`, cls: "liked-ico", glyph: "\u2665", removeId: logged ? "liked" : null });
    }
    for (const m of mixes().filter((m) => m.id !== "liked")) {
      if (isHidden(m.id)) continue;
      if (logged && !state.follows.has(m.id)) continue;
      items.push({ go: `playlist/${m.id}`, name: m.name, sub: m.desc, img: m.cover, cls: `mix-ico ${m.ico}`, removeId: m.id });
    }
    for (const p of state.playlists) {
      items.push({ go: `playlist/${p.id}`, name: p.name, sub: `Playlist \u00b7 ${(p.ids || []).length} songs`, cls: "mix-ico blue", removeId: p.id });
    }
  }
  if (f === "all" || f === "artists") {
    if (!isHidden("artist") && (logged ? state.follows.has("artist") : true)) {
      items.push({ go: "artist", name: c.name, sub: "Artist", img: c.avatar, round: true, removeId: "artist" });
    }
    for (const ch of c.characters || []) {
      const vid = "voice-" + ch.id;
      if (isHidden(vid)) continue;
      if (logged && !state.follows.has(vid)) continue;
      items.push({ go: `playlist/${vid}`, name: ch.name, sub: "Voice", img: ch.avatar, round: true, removeId: vid });
    }
  }
  if (f === "all" || f === "albums") {
    for (const s of songs()) {
      const aid = "album-" + s.id;
      if (isHidden(aid)) continue;
      if (logged && !state.follows.has(aid) && !(typeof isLiked === "function" && isLiked(s.id))) continue;
      items.push({ go: `album/${s.id}`, name: s.title, sub: "Single", img: s.cover, round: false, removeId: logged ? aid : null });
    }
  }
  return items;
}

function libRow(e) {
  const x = e.removeId
    ? `<button class="lib-x" data-libremove="${escapeHtml(e.removeId)}" type="button" title="Remove from library">\u00d7</button>`
    : "";
  return `<div class="lib-row">
    <button class="lib-item ${e.round ? "round" : ""}" data-go="${e.go}" type="button">
      ${e.img ? `<img src="${e.img}" alt="">` : `<div class="${e.cls}">${e.glyph || "\u266a"}</div>`}
      <span><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(e.sub)}</small></span>
    </button>${x}
  </div>`;
}

function renderLib() {
  const list = document.getElementById("lib-list");
  const entries = libEntries();
  if (!entries.length) {
    list.innerHTML = `<p class="lib-empty">${isLoggedIn() ? "Follow artists or save playlists to fill Your Library." : "Nothing in Your Library."}</p>`;
    return;
  }
  list.innerHTML = entries.slice(0, 24).map(libRow).join("");
}

function renderLibrary() {
  renderLib();
  const entries = libEntries();
  viewEl.innerHTML = `<section class="section">
    <h2>Your Library</h2>
    <p class="t-sub">${isLoggedIn()
      ? "Only what you keep. Hide anything on Home with \u00d7. Search still finds it."
      : "Log in to choose which playlists and artists stay in Your Library."}</p>
    <div class="cards">${entries.map((e) => `<article class="card ${e.round ? "artist" : ""}" data-go="${e.go}">
      ${e.img ? `<img src="${e.img}" alt="">` : `<div class="${e.cls}" style="width:100%;aspect-ratio:1;border-radius:8px;margin-bottom:10px">${e.glyph || "\u266a"}</div>`}
      <h3>${escapeHtml(e.name)}</h3><p>${escapeHtml(e.sub)}</p>
    </article>`).join("") || `<p class="empty">Your Library is empty. Follow an artist or add a playlist.</p>`}</div>
  </section>`;
}

function homeDismissable(html, id) {
  if (!isLoggedIn() || !id) return html;
  return `<div class="mix-wrap">${html}<button class="card-x" data-libremove="${escapeHtml(id)}" type="button" title="Don't show this">\u00d7</button></div>`;
}
function mixCardDismissable(m) {
  m = Object.assign({}, m, { round: false });
  return homeDismissable(mixCard(m), m.id);
}

function renderHome() {
  ensurePrefs();
  const c = state.catalog;
  const rec = state.recents.map(songById).filter(Boolean);
  const mx = mixes().filter((m) => m.id !== "liked" && !isHidden(m.id));
  const liked = mixById("liked");
  const visibleSongs = songs().filter((s) => !isHidden("album-" + s.id));
  const jump = (rec.length ? rec : visibleSongs).filter((s) => !isHidden("album-" + s.id));
  const tiles = [
    !isHidden("liked") ? { go: "liked", title: "Liked Songs", liked: true, play: (liked && liked.ids) || [] } : null,
    ...jump.slice(0, 2).map((s) => ({ go: `album/${s.id}`, title: s.title, img: s.cover, play: [s.id] })),
    isHidden("artist") ? null : { go: "artist", title: c.name, img: c.avatar, play: songs().map((s) => s.id) },
    ...mx.filter((m) => !isLoggedIn() || state.follows.has(m.id)).slice(0, 4).map((m) => ({
      go: `playlist/${m.id}`, title: m.name, img: m.cover, ico: m.ico, play: m.ids || [],
    })),
  ].filter(Boolean).slice(0, 8);
  const filter = state.homeFilter || "all";
  const showMixFeed = filter === "all" || filter === "music";
  const showPlaylists = filter === "all" || filter === "music" || filter === "playlists";
  const showArtists = filter === "all" || filter === "music" || filter === "artists";
  const showAlbums = filter === "all" || filter === "music" || filter === "albums";
  const showVideos = filter === "all" || filter === "videos";
  const genreMixes = mx.filter((m) => m.kind === "genre" || m.kind === "mood");
  const playlistMixes = mx.filter((m) => m.kind === "playlist" || m.kind === "voice" || m.kind === "genre" || m.kind === "mood");
  const made = isLoggedIn() ? mx.filter((m) => !state.follows.has(m.id)).slice(0, 8) : mx.slice(0, 8);
  const savedMix = isLoggedIn() ? mx.filter((m) => state.follows.has(m.id)) : [];
  const playlistCards = playlistMixes.map(mixCardDismissable).join("")
    + state.playlists.map((p) => mixCard({ id: p.id, name: p.name, desc: "Playlist", ids: p.ids || [], ico: "blue" })).join("");
  const artistCards = [
    isHidden("artist") ? "" : homeDismissable(artistCard(c.name, "Artist", c.avatar, "artist", songs().map((s) => s.id), true), "artist"),
    ...(c.characters || []).filter((ch) => !isHidden("voice-" + ch.id)).map((ch) => homeDismissable(
      artistCard(ch.name, "Artist", ch.avatar, "playlist/voice-" + ch.id, songs().filter((s) => String(s.character_id) === String(ch.id)).map((s) => s.id), true),
      "voice-" + ch.id
    )),
  ].join("");
  viewEl.innerHTML = `<div class="home-wrap">
    <h1 class="greeting">${greeting()}</h1>
    <div class="home-filters">
      <button class="chip-btn ${filter === "all" ? "on" : ""}" data-homefilter="all" type="button">All</button>
      <button class="chip-btn ${filter === "music" ? "on" : ""}" data-homefilter="music" type="button">Music</button>
      <button class="chip-btn ${filter === "playlists" ? "on" : ""}" data-homefilter="playlists" type="button">Playlists</button>
      <button class="chip-btn ${filter === "artists" ? "on" : ""}" data-homefilter="artists" type="button">Artists</button>
      <button class="chip-btn ${filter === "albums" ? "on" : ""}" data-homefilter="albums" type="button">Albums</button>
      <button class="chip-btn ${filter === "videos" ? "on" : ""}" data-homefilter="videos" type="button">Videos</button>
    </div>
    ${showMixFeed ? `<div class="shortcuts">${tiles.map((t) => `<button class="shortcut" data-go="${t.go}" type="button">
      ${t.liked ? `<div class="liked-ico">\u2665</div>` : t.img ? `<img src="${t.img}" alt="">` : `<div class="mix-ico ${t.ico || "green"}">\u266a</div>`}
      <span>${escapeHtml(t.title)}</span>
      <span class="hover-play" data-play-list="${(t.play || []).join(",")}">${PLAY}</span>
    </button>`).join("")}</div>` : ""}
    ${showMixFeed ? homeRow("Jump back in", jump.map((s) => homeDismissable(cardSong(s), "album-" + s.id)).join("")) : ""}
    ${showMixFeed && savedMix.length ? homeRow("Your playlists", savedMix.map(mixCardDismissable).join("")) : ""}
    ${showPlaylists && (filter === "playlists" || !homeOff("made")) ? homeRow(filter === "playlists" ? "Playlists" : "Made for you", filter === "playlists" ? playlistCards : made.map(mixCardDismissable).join(""), filter === "playlists" ? "" : `<a class="see" data-go="library" href="#/library">Library</a>`) : ""}
    ${showMixFeed && !homeOff("mixes") && genreMixes.length ? homeRow("Your top mixes", genreMixes.map(mixCardDismissable).join("")) : ""}
    ${showArtists && (filter === "artists" || !homeOff("artists")) ? homeRow(filter === "artists" ? "Artists" : "Popular artists", artistCards) : ""}
    ${showAlbums && (filter === "albums" || !homeOff("releases")) ? homeRow(filter === "albums" ? "Albums" : "New releases", visibleSongs.map((s) => homeDismissable(cardSong(s), "album-" + s.id)).join(""), filter === "albums" ? "" : `<a class="see" data-go="artist" href="#/artist">Show all</a>`) : ""}
    ${showVideos && (filter === "videos" || !homeOff("videos")) && (c.videos || []).length ? homeRow("Music videos", c.videos.map((v) => `<article class="card video-card">
      <video src="${v.url}" poster="${v.cover}" controls preload="metadata"></video>
      <h3>${escapeHtml(v.title)}</h3><p>Video \u00b7 ${fmt(v.duration_ms)}</p></article>`).join("")) : ""}
  </div>`;
}

function paintPrefs() {
  const home = document.querySelector('[data-acct-panel="home"]');
  if (!home) return;
  let host = document.getElementById("acct-prefs");
  if (!host) {
    host = document.createElement("div");
    host.id = "acct-prefs";
    const actions = home.querySelector(".acct-actions");
    home.insertBefore(host, actions);
  }
  if (!isLoggedIn()) { host.innerHTML = ""; return; }
  const rows = [
    ["made", "Made for you on Home"],
    ["mixes", "Genre and mood mixes on Home"],
    ["artists", "Popular artists on Home"],
    ["releases", "New releases on Home"],
    ["videos", "Music videos on Home"],
  ];
  host.innerHTML = `<p class="acct-lead" style="margin-top:16px">Home content</p>
    ${rows.map(([id, label]) => `<label class="pref-row">
      <input type="checkbox" data-homeoff="${id}" ${homeOff(id) ? "" : "checked"}>
      <span>${label}</span>
    </label>`).join("")}
    <p class="acct-lead">Hide any playlist, album, or artist on Home with \u00d7. Search still finds it so you can add it back.</p>`;
}

const _openAcct = openAcct;
openAcct = function () { _openAcct(); paintPrefs(); };
const _paintAccount = paintAccount;
paintAccount = function () { _paintAccount(); paintPrefs(); };

document.body.addEventListener("click", (e) => {
  const rm = e.target.closest("[data-libremove]");
  if (rm) {
    e.preventDefault();
    e.stopPropagation();
    removeFromLibrary(rm.dataset.libremove);
  }
}, true);
document.body.addEventListener("change", (e) => {
  const t = e.target.closest("[data-homeoff]");
  if (!t) return;
  ensurePrefs();
  const id = t.dataset.homeoff;
  if (t.checked) state.homeOff.delete(id);
  else state.homeOff.add(id);
  save();
  if ((state.route.name || "home") === "home" && typeof renderHome === "function") renderHome();
});

toggleFollow = function (id) {
  ensurePrefs();
  id = String(id || "");
  if (!id || id === "liked") return;
  if (!state.follows) state.follows = new Set();
  if (!isLoggedIn()) {
    if (state.follows.has(id)) {
      state.follows.delete(id);
      if (id === "artist") state.following = false;
      toast("Unfollowed");
    } else {
      state.follows.add(id);
      if (id === "artist") state.following = true;
      toast("Following");
    }
    save();
    if (typeof render === "function") render();
    return;
  }
  if (isHidden(id)) {
    state.hidden.delete(id);
    state.follows.add(id);
    if (id === "artist") state.following = true;
    toast("Added back");
  } else {
    state.follows.delete(id);
    if (id === "artist") state.following = false;
    state.hidden.add(id);
    toast("Removed from view. Search to find it again.");
  }
  save();
  if (typeof render === "function") render();
};

const _injectFollowBtn = injectFollowBtn;
injectFollowBtn = function () {
  const actions = document.querySelector("#view .actions");
  const route = state.route || {};
  if (isLoggedIn() && actions && (route.name === "album" || route.name === "track") && !actions.querySelector("[data-follow]")) {
    const b = document.createElement("button");
    b.className = "follow";
    b.type = "button";
    b.dataset.follow = "album-" + route.id;
    actions.appendChild(b);
  }
  _injectFollowBtn();
  const b = document.querySelector("#view .actions [data-follow]");
  if (!b) return;
  const id = b.dataset.follow;
  const on = state.follows.has(id);
  const hidden = isHidden(id);
  if (isLoggedIn()) b.textContent = hidden ? "Add back" : "Don't show this";
  else b.textContent = on ? "Remove from library" : "Add to library";
};

const _renderSearchHome = renderSearch;
renderSearch = function () {
  const q = (state.query || "").trim().toLowerCase();
  if (!q) {
    _renderSearchHome();
    return;
  }
  const c = state.catalog;
  const hit = songs().filter((s) => [s.title, s.character, ...(s.genres || []), ...(s.moods || []), s.description].join(" ").toLowerCase().includes(q));
  const pls = mixes().filter((m) => m.name.toLowerCase().includes(q));
  const artistHits = [];
  if ((c.name || "").toLowerCase().includes(q)) artistHits.push({ id: "artist", name: c.name, sub: "Artist", img: c.avatar, go: "artist" });
  (c.characters || []).forEach((ch) => {
    if (ch.name.toLowerCase().includes(q) || ("this is " + ch.name).toLowerCase().includes(q)) {
      artistHits.push({ id: "voice-" + ch.id, name: ch.name, sub: "Artist", img: ch.avatar, go: "playlist/voice-" + ch.id });
    }
  });
  function restoreBtn(id) {
    if (!isLoggedIn()) return "";
    return `<button class="follow" data-follow="${id}" type="button" style="margin-top:8px">${isHidden(id) ? "Add back" : "Don't show this"}</button>`;
  }
  viewEl.innerHTML = `<section class="section"><h2>Songs</h2>${hit.length ? `<table class="tracks"><thead><tr><th>#</th><th>Title</th><th>Plays</th><th></th><th></th></tr></thead><tbody>${trackRows(hit)}</tbody></table>` : `<p class="empty">No songs matched.</p>`}</section>
    <section class="section"><h2>Artists</h2><div class="cards">${artistHits.map((a) => `<article class="card artist" data-go="${a.go}">
      <img src="${a.img}" alt=""><h3>${escapeHtml(a.name)}</h3><p>${escapeHtml(a.sub)}</p>${restoreBtn(a.id)}</article>`).join("") || `<p class="empty">No artists matched.</p>`}</div></section>
    <section class="section"><h2>Albums</h2><div class="cards">${hit.map((s) => `<article class="card" data-go="album/${s.id}">
      <img src="${s.cover}" alt=""><h3>${escapeHtml(s.title)}</h3><p>Single</p>${restoreBtn("album-" + s.id)}</article>`).join("") || `<p class="empty">No albums matched.</p>`}</div></section>
    <section class="section"><h2>Playlists</h2><div class="cards">${pls.map((m) => `<article class="card" data-go="playlist/${m.id}">
      ${m.cover ? `<img src="${m.cover}" alt="">` : `<div class="mix-ico ${m.ico || "green"}" style="width:100%;aspect-ratio:1;border-radius:8px;margin-bottom:10px">\u266a</div>`}
      <h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.desc)}</p>${restoreBtn(m.id)}</article>`).join("") || `<p class="empty">No playlists.</p>`}</div></section>`;
};

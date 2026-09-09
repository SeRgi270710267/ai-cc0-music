const USER_ID = "146903878795265";
const API = "https://www.mureka.ai";
const CDN = "https://static-cos.mureka.ai/";
const PAUSE_ICON = `<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>`;
const PLAY_ICON = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;

const audio = document.getElementById("audio");
const viewEl = document.getElementById("view");
const state = {
  catalog: null,
  view: "home",
  query: "",
  index: -1,
  playing: false,
  shuffle: false,
  repeat: "off",
  liked: new Set(JSON.parse(localStorage.getItem("liked") || "[]")),
  following: localStorage.getItem("following") === "1",
};

function cdn(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path.split("?")[0];
  return CDN + path.replace(/^\//, "");
}

function fmt(ms) {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtDate(unix) {
  if (!unix) return "";
  return new Date(unix * 1000).getFullYear();
}

function saveLiked() {
  localStorage.setItem("liked", JSON.stringify([...state.liked]));
}

function songs() {
  return (state.catalog && state.catalog.songs) || [];
}

function current() {
  return songs()[state.index] || null;
}

function flattenLyrics(raw) {
  const out = [];
  if (!raw) return out;
  if (Array.isArray(raw) && raw[0] && "text" in raw[0] && "section" in raw[0]) return raw;
  for (const seg of raw) {
    if (seg.user_input_tag) out.push({ t: null, text: seg.user_input_tag, section: true });
    for (const row of seg.rows || []) out.push({ t: row.start, text: row.text || "", section: false });
  }
  return out;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

async function liveCatalog() {
  const [profRes, songRes, vidRes] = await Promise.all([
    fetchJson(`${API}/api/pgc/personal/profile?user_id=${USER_ID}`),
    fetchJson(`${API}/api/pgc/user/published/songs?user_id=${USER_ID}&page_size=50`),
    fetchJson(`${API}/api/pgc/video/published/list?user_id=${USER_ID}`).catch(() => ({ data: { list: [] } })),
  ]);
  const user = (profRes.data && profRes.data.user) || {};
  const feeds = (songRes.data && songRes.data.feeds) || [];
  const liveSongs = [];
  const chars = {};
  for (const feed of feeds) {
    const s = feed.song || {};
    let lyrics = [];
    let playCount = 0, shareCount = 0, favCount = 0;
    try {
      const det = await fetchJson(`${API}/api/pgc/song/detail?song_id=${s.song_id}`);
      const song = (det.data && det.data.song) || s;
      lyrics = flattenLyrics(song.lyrics);
      playCount = det.data.play_count || 0;
      shareCount = det.data.share_count || 0;
      favCount = det.data.fav_count || 0;
    } catch {
      /* snapshot lyrics remain if merge happens later */
    }
    const ch = s.character || {};
    if (ch.id) {
      chars[String(ch.id)] = {
        id: ch.id,
        name: ch.name,
        tags: ch.tags || [],
        avatar: cdn(ch.avatar),
      };
    }
    liveSongs.push({
      id: String(s.song_id),
      title: s.title,
      duration_ms: s.duration_milliseconds,
      mp3: cdn(s.mp3_url),
      cover: cdn(s.cover),
      share_key: s.share_key,
      mureka_url: `https://www.mureka.ai/song-detail/${s.song_id}`,
      genres: s.genres || [],
      moods: s.moods || [],
      description: s.description || "",
      model: s.model,
      published_at: s.publish_at,
      generated_at: s.generate_at,
      play_count: playCount,
      share_count: shareCount,
      fav_count: favCount,
      character: ch.name,
      character_id: ch.id,
      lyrics,
    });
  }
  const videos = ((vidRes.data && vidRes.data.list) || []).map((v) => ({
    id: String(v.video_id),
    title: (v.title || "").replace("_lyricsvideo_v_1", "").replace(/_/g, " ").trim(),
    url: cdn(v.video_url),
    cover: cdn(v.video_cover_url),
    duration_ms: v.duration_milliseconds,
    share_key: v.share_key,
    song_id: String(v.song_id || ""),
  }));
  const name = user.stage_name || "AI CC0 Music";
  return {
    user_id: USER_ID,
    name: name.startsWith("AI CC0 Music") ? "AI CC0 Music" : name,
    stage_name: name,
    avatar: cdn(user.profile_image),
    likes: user.liked_count || 0,
    country: user.country_code,
    mureka_url: `https://www.mureka.ai/profile?user_id=${USER_ID}`,
    license: "CC0",
    songs: liveSongs,
    videos,
    characters: Object.values(chars),
    synced_at: new Date().toISOString(),
  };
}

async function loadCatalog() {
  let snap = null;
  try {
    snap = await fetchJson("./catalog.json");
  } catch {
    snap = { songs: [], videos: [], characters: [], name: "AI CC0 Music" };
  }
  try {
    const live = await liveCatalog();
    if (live.songs.length) {
      const snapMap = Object.fromEntries((snap.songs || []).map((s) => [s.id, s]));
      live.songs = live.songs.map((s) => {
        if ((!s.lyrics || !s.lyrics.length) && snapMap[s.id]) s.lyrics = snapMap[s.id].lyrics;
        return s;
      });
      state.catalog = live;
      return;
    }
  } catch (err) {
    console.warn("Live Mureka sync failed, using snapshot", err);
  }
  state.catalog = snap;
}

function setView(name) {
  state.view = name;
  document.querySelectorAll(".nav-link").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === name);
  });
  render();
}

function filtered() {
  const q = state.query.trim().toLowerCase();
  if (!q) return songs();
  return songs().filter((s) =>
    [s.title, s.character, ...(s.genres || []), ...(s.moods || []), s.description]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

function playAt(i) {
  const list = state.view === "search" ? filtered() : songs();
  const song = list[i] || songs()[i];
  if (!song) return;
  const real = songs().findIndex((s) => s.id === song.id);
  state.index = real;
  audio.src = song.mp3;
  audio.play().catch(() => {});
  state.playing = true;
  updatePlayer();
  renderLyrics();
  render();
}

function togglePlay() {
  if (state.index < 0) {
    playAt(0);
    return;
  }
  if (audio.paused) {
    audio.play();
    state.playing = true;
  } else {
    audio.pause();
    state.playing = false;
  }
  updatePlayer();
  render();
}

function next(delta = 1) {
  const n = songs().length;
  if (!n) return;
  let i = state.index;
  if (state.shuffle) i = Math.floor(Math.random() * n);
  else i = (i + delta + n) % n;
  playAt(i);
}

function updatePlayer() {
  const s = current();
  const playBtn = document.getElementById("play-btn");
  playBtn.innerHTML = state.playing && !audio.paused ? PAUSE_ICON : PLAY_ICON;
  if (!s) return;
  document.getElementById("p-title").textContent = s.title;
  document.getElementById("p-artist").textContent = `${state.catalog.name} · ${s.character || "Single"}`;
  document.getElementById("p-cover").src = s.cover;
  document.getElementById("now-cover").src = s.cover;
  document.getElementById("now-song").textContent = s.title;
  document.getElementById("now-artist").textContent = state.catalog.name;
  document.getElementById("now-title").textContent = s.title;
  document.getElementById("like-btn").textContent = state.liked.has(s.id) ? "♥" : "♡";
  document.getElementById("like-btn").classList.toggle("on", state.liked.has(s.id));
  document.getElementById("dur-time").textContent = fmt(s.duration_ms);
  document.title = `${s.title} · ${state.catalog.name}`;
}

function renderLyrics() {
  const s = current();
  const box = document.getElementById("lyrics");
  if (!s) {
    box.innerHTML = "";
    return;
  }
  const t = (audio.currentTime || 0) * 1000;
  const lines = s.lyrics || [];
  let active = -1;
  lines.forEach((line, i) => {
    if (!line.section && line.t != null && line.t <= t) active = i;
  });
  box.innerHTML = lines
    .map(
      (line, i) =>
        `<div class="lyric-line ${line.section ? "section" : ""} ${i === active ? "active" : ""}">${escapeHtml(line.text)}</div>`
    )
    .join("");
  const act = box.querySelector(".active");
  if (act) act.scrollIntoView({ block: "center", behavior: "smooth" });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

function eq() {
  return `<span class="eq"><i></i><i></i><i></i></span>`;
}

function trackRows(list) {
  return list
    .map((s, i) => {
      const playing = current() && current().id === s.id;
      const idx = playing && state.playing ? eq() : i + 1;
      return `<tr class="${playing ? "playing" : ""}" data-play="${songs().findIndex((x) => x.id === s.id)}">
        <td class="idx">${idx}</td>
        <td><div class="t-cell"><img src="${s.cover}" alt=""><div><div>${escapeHtml(s.title)}</div><div class="t-sub">${escapeHtml(s.character || "Single")}</div></div></div></td>
        <td class="t-sub">${(s.play_count || 0).toLocaleString()}</td>
        <td class="dur">${fmt(s.duration_ms)}</td>
      </tr>`;
    })
    .join("");
}

function renderHome() {
  const c = state.catalog;
  const popular = [...songs()].sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
  const genres = [...new Set(songs().flatMap((s) => s.genres || []))];
  const moods = [...new Set(songs().flatMap((s) => s.moods || []))];
  const cards = songs()
    .map(
      (s) => `<article class="card" data-play="${songs().findIndex((x) => x.id === s.id)}">
        <img src="${s.cover}" alt="">
        <button class="hover-play" type="button">${PLAY_ICON}</button>
        <h3>${escapeHtml(s.title)}</h3>
        <p>${fmtDate(s.published_at)} · ${escapeHtml((s.genres || []).join(", ") || "Single")}</p>
      </article>`
    )
    .join("");
  const voices = (c.characters || [])
    .map(
      (ch) => `<article class="card">
        <img src="${ch.avatar}" alt="" style="border-radius:50%">
        <h3>${escapeHtml(ch.name)}</h3>
        <p>${escapeHtml((ch.tags || []).join(" · "))}</p>
      </article>`
    )
    .join("");
  const videos = (c.videos || [])
    .map(
      (v) => `<article class="card video-card">
        <video src="${v.url}" poster="${v.cover}" controls preload="metadata"></video>
        <h3>${escapeHtml(v.title)}</h3>
        <p>Video · ${fmt(v.duration_ms)}</p>
      </article>`
    )
    .join("");
  viewEl.innerHTML = `
    <section class="hero">
      <img class="avatar" src="${c.avatar}" alt="${escapeHtml(c.name)}">
      <div>
        <div class="kicker"><span class="verified">✓</span> Artist</div>
        <h1>${escapeHtml(c.name)}</h1>
        <div class="meta">${(c.likes || 0).toLocaleString()} likes · ${songs().length} tracks · ${c.license} · ${c.country || ""}</div>
      </div>
    </section>
    <div class="actions">
      <button class="play-lg" id="hero-play" type="button">${state.playing ? PAUSE_ICON : PLAY_ICON}</button>
      <button class="follow ${state.following ? "on" : ""}" id="follow-btn" type="button">${state.following ? "Following" : "Follow"}</button>
      <a class="more" href="${c.mureka_url}" target="_blank" rel="noopener">Mureka</a>
    </div>
    <section class="section">
      <h2>Popular</h2>
      <table class="tracks">
        <thead><tr><th>#</th><th>Title</th><th>Plays</th><th></th></tr></thead>
        <tbody>${trackRows(popular)}</tbody>
      </table>
    </section>
    <section class="section">
      <h2>Discography</h2>
      <div class="cards">${cards}</div>
    </section>
    ${voices ? `<section class="section"><h2>Voices</h2><div class="cards">${voices}</div></section>` : ""}
    ${videos ? `<section class="section"><h2>Videos</h2><div class="cards">${videos}</div></section>` : ""}
    <section class="section">
      <h2>About</h2>
      <div class="about">
        <p>Public catalog mirrored from <a href="${c.mureka_url}" target="_blank" rel="noopener">Mureka</a>. Audio streams from Mureka’s CDN. New published tracks show up automatically.</p>
        <p>${genres.map((g) => `<span class="chip">${escapeHtml(g)}</span>`).join("")}${moods.map((m) => `<span class="chip">${escapeHtml(m)}</span>`).join("")}</p>
      </div>
    </section>`;
}

function renderSearch() {
  const list = filtered();
  viewEl.innerHTML = `
    <section class="section">
      <h2>${state.query ? `Results for “${escapeHtml(state.query)}”` : "Search the catalog"}</h2>
      ${
        list.length
          ? `<table class="tracks"><thead><tr><th>#</th><th>Title</th><th>Plays</th><th></th></tr></thead><tbody>${trackRows(list)}</tbody></table>`
          : `<p class="empty">No tracks matched.</p>`
      }
    </section>`;
}

function renderLibrary() {
  const liked = songs().filter((s) => state.liked.has(s.id));
  viewEl.innerHTML = `
    <section class="hero" style="background:linear-gradient(180deg,#5038a0,#121212)">
      <div class="liked-ico" style="width:192px;height:192px;font-size:72px;border-radius:8px">♥</div>
      <div>
        <div class="kicker">Playlist</div>
        <h1>Liked Songs</h1>
        <div class="meta">${liked.length} songs</div>
      </div>
    </section>
    <section class="section">
      ${
        liked.length
          ? `<table class="tracks"><thead><tr><th>#</th><th>Title</th><th>Plays</th><th></th></tr></thead><tbody>${trackRows(liked)}</tbody></table>`
          : `<p class="empty">Heart a track in the player to save it here. Likes stay in this browser.</p>`
      }
    </section>`;
}

function render() {
  if (!state.catalog) return;
  document.getElementById("lib-avatar").src = state.catalog.avatar;
  document.getElementById("lib-name").textContent = state.catalog.name;
  document.getElementById("mureka-link").href = state.catalog.mureka_url;
  if (state.view === "search") renderSearch();
  else if (state.view === "library") renderLibrary();
  else renderHome();
  updatePlayer();
}

function route() {
  const hash = location.hash.replace("#/", "") || "home";
  if (hash.startsWith("search")) setView("search");
  else if (hash.startsWith("library")) setView("library");
  else setView("home");
}

document.getElementById("play-btn").addEventListener("click", togglePlay);
document.getElementById("prev-btn").addEventListener("click", () => {
  if (audio.currentTime > 3) audio.currentTime = 0;
  else next(-1);
});
document.getElementById("next-btn").addEventListener("click", () => next(1));
document.getElementById("shuffle-btn").addEventListener("click", (e) => {
  state.shuffle = !state.shuffle;
  e.currentTarget.classList.toggle("on", state.shuffle);
});
document.getElementById("repeat-btn").addEventListener("click", (e) => {
  state.repeat = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
  e.currentTarget.classList.toggle("on", state.repeat !== "off");
});
document.getElementById("like-btn").addEventListener("click", () => {
  const s = current();
  if (!s) return;
  if (state.liked.has(s.id)) state.liked.delete(s.id);
  else state.liked.add(s.id);
  saveLiked();
  updatePlayer();
  if (state.view === "library") render();
});
document.getElementById("lyrics-btn").addEventListener("click", () => {
  const panel = document.getElementById("now-panel");
  panel.hidden = !panel.hidden;
});
document.getElementById("close-now").addEventListener("click", () => {
  document.getElementById("now-panel").hidden = true;
});
document.getElementById("vol").addEventListener("input", (e) => {
  audio.volume = Number(e.target.value);
});
document.getElementById("seek").addEventListener("input", (e) => {
  if (!audio.duration) return;
  audio.currentTime = (Number(e.target.value) / 1000) * audio.duration;
});
document.getElementById("search-form").addEventListener("submit", (e) => e.preventDefault());
document.getElementById("search-input").addEventListener("input", (e) => {
  state.query = e.target.value;
  location.hash = "#/search";
  setView("search");
});
document.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", (e) => {
    const v = el.dataset.view;
    if (!v) return;
    if (el.tagName === "BUTTON") {
      e.preventDefault();
      location.hash = v === "home" ? "#/" : `#/${v}`;
      setView(v);
    }
  });
});
viewEl.addEventListener("click", (e) => {
  const playEl = e.target.closest("[data-play]");
  if (playEl) playAt(Number(playEl.dataset.play));
  if (e.target.closest("#hero-play")) togglePlay();
  if (e.target.closest("#follow-btn")) {
    state.following = !state.following;
    localStorage.setItem("following", state.following ? "1" : "0");
    render();
  }
});
audio.volume = 0.9;
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  document.getElementById("seek").value = Math.round((audio.currentTime / audio.duration) * 1000);
  document.getElementById("cur-time").textContent = fmt(audio.currentTime * 1000);
  renderLyrics();
});
audio.addEventListener("ended", () => {
  if (state.repeat === "one") {
    audio.currentTime = 0;
    audio.play();
  } else if (state.repeat === "all" || state.index < songs().length - 1 || state.shuffle) next(1);
  else {
    state.playing = false;
    updatePlayer();
    render();
  }
});
audio.addEventListener("play", () => {
  state.playing = true;
  updatePlayer();
});
audio.addEventListener("pause", () => {
  state.playing = false;
  updatePlayer();
});
window.addEventListener("hashchange", route);
window.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea")) return;
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  } else if (e.code === "ArrowRight") audio.currentTime += 5;
  else if (e.code === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
});

loadCatalog().then(() => {
  route();
  if (songs()[0]) {
    document.getElementById("p-cover").src = songs()[0].cover;
    document.getElementById("p-title").textContent = songs()[0].title;
  }
});

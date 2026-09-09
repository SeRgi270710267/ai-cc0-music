const USER_ID = "146903878795265";
const API = "https://www.mureka.ai";
const CDN = "https://static-cos.mureka.ai/";
const PLAY = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
const PAUSE = `<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>`;
const COLORS = ["#1e3264", "#8c1932", "#e8115b", "#b85a14", "#0d6b3d", "#5038a0", "#148a08", "#ba5d07", "#dc148c", "#006450"];

const audio = document.getElementById("audio");
const viewEl = document.getElementById("view");
const loadJSON = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};

const state = {
  catalog: null,
  route: { name: "home", id: "" },
  query: "",
  queue: [],
  qIndex: -1,
  playing: false,
  shuffle: false,
  repeat: "off",
  liked: new Set(loadJSON("liked", [])),
  playlists: loadJSON("playlists", []),
  recents: loadJSON("recents", []),
  following: localStorage.getItem("following") === "1",
  panel: null,
  panelTab: "now",
  libFilter: "all",
  muted: false,
  volume: Number(localStorage.getItem("volume") || 0.85),
  history: ["#/"],
  histI: 0,
  modalSong: null,
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
function year(unix) { return unix ? new Date(unix * 1000).getFullYear() : ""; }
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 1800);
}
function save() {
  localStorage.setItem("liked", JSON.stringify([...state.liked]));
  localStorage.setItem("playlists", JSON.stringify(state.playlists));
  localStorage.setItem("recents", JSON.stringify(state.recents.slice(0, 20)));
  localStorage.setItem("following", state.following ? "1" : "0");
  localStorage.setItem("volume", String(state.volume));
}
function songs() { return (state.catalog && state.catalog.songs) || []; }
function songById(id) { return songs().find((s) => s.id === String(id)); }
function current() { return songById(state.queue[state.qIndex]); }
function eq() { return `<span class="eq"><i></i><i></i><i></i></span>`; }
function colorFor(key) {
  let n = 0;
  for (const ch of String(key)) n += ch.charCodeAt(0);
  return COLORS[n % COLORS.length];
}

function flattenLyrics(raw) {
  if (!raw) return [];
  if (Array.isArray(raw) && raw[0] && "section" in raw[0]) return raw;
  const out = [];
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
  const liveSongs = [];
  const chars = {};
  for (const feed of (songRes.data && songRes.data.feeds) || []) {
    const s = feed.song || {};
    let lyrics = [], playCount = 0, shareCount = 0, favCount = 0;
    try {
      const det = await fetchJson(`${API}/api/pgc/song/detail?song_id=${s.song_id}`);
      lyrics = flattenLyrics((det.data && det.data.song && det.data.song.lyrics) || s.lyrics);
      playCount = det.data.play_count || 0;
      shareCount = det.data.share_count || 0;
      favCount = det.data.fav_count || 0;
    } catch { /* snapshot later */ }
    const ch = s.character || {};
    if (ch.id) chars[String(ch.id)] = { id: ch.id, name: ch.name, tags: ch.tags || [], avatar: cdn(ch.avatar) };
    liveSongs.push({
      id: String(s.song_id), title: s.title, duration_ms: s.duration_milliseconds,
      mp3: cdn(s.mp3_url), cover: cdn(s.cover), share_key: s.share_key,
      mureka_url: `https://www.mureka.ai/song-detail/${s.song_id}`,
      genres: s.genres || [], moods: s.moods || [], description: s.description || "",
      model: s.model, published_at: s.publish_at, generated_at: s.generate_at,
      play_count: playCount, share_count: shareCount, fav_count: favCount,
      character: ch.name, character_id: ch.id, lyrics,
    });
  }
  const videos = ((vidRes.data && vidRes.data.list) || []).map((v) => ({
    id: String(v.video_id),
    title: (v.title || "").replace("_lyricsvideo_v_1", "").replace(/_/g, " ").trim(),
    url: cdn(v.video_url), cover: cdn(v.video_cover_url),
    duration_ms: v.duration_milliseconds, share_key: v.share_key, song_id: String(v.song_id || ""),
  }));
  const name = user.stage_name || "AI CC0 Music";
  return {
    user_id: USER_ID, name: name.startsWith("AI CC0 Music") ? "AI CC0 Music" : name, stage_name: name,
    avatar: cdn(user.profile_image), likes: user.liked_count || 0, country: user.country_code,
    mureka_url: `https://www.mureka.ai/profile?user_id=${USER_ID}`, license: "CC0",
    songs: liveSongs, videos, characters: Object.values(chars), synced_at: new Date().toISOString(),
  };
}
async function loadCatalog() {
  let snap = { songs: [], videos: [], characters: [], name: "AI CC0 Music" };
  try { snap = await fetchJson("./catalog.json"); } catch { /* empty */ }
  try {
    const live = await liveCatalog();
    if (live.songs.length) {
      const map = Object.fromEntries((snap.songs || []).map((s) => [s.id, s]));
      live.songs = live.songs.map((s) => {
        if ((!s.lyrics || !s.lyrics.length) && map[s.id]) s.lyrics = map[s.id].lyrics;
        return s;
      });
      state.catalog = live;
      return;
    }
  } catch (err) { console.warn("Live Mureka sync failed", err); }
  state.catalog = snap;
}

function mixes() {
  const c = state.catalog;
  const all = songs().map((s) => s.id);
  const out = [
    { id: "liked", name: "Liked Songs", kind: "playlist", ico: "liked", desc: "Playlist", ids: songs().filter((s) => state.liked.has(s.id)).map((s) => s.id) },
    { id: "this-is", name: `This Is ${c.name}`, kind: "playlist", ico: "green", desc: "Playlist · Mureka", ids: all, cover: c.avatar },
    { id: "on-repeat", name: "On Repeat", kind: "playlist", ico: "blue", desc: "Your most played", ids: [...songs()].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).map((s) => s.id) },
    { id: "discover", name: "Discover Weekly", kind: "playlist", ico: "orange", desc: "Made for you", ids: [...all].reverse() },
  ];
  for (const g of [...new Set(songs().flatMap((s) => s.genres || []))]) {
    out.push({ id: `genre-${g}`, name: `${g[0].toUpperCase() + g.slice(1)} Mix`, kind: "genre", ico: "green", desc: "Genre mix", ids: songs().filter((s) => (s.genres || []).includes(g)).map((s) => s.id) });
  }
  for (const m of [...new Set(songs().flatMap((s) => s.moods || []))]) {
    out.push({ id: `mood-${m}`, name: `${m[0].toUpperCase() + m.slice(1)} Mix`, kind: "mood", ico: "red", desc: "Mood mix", ids: songs().filter((s) => (s.moods || []).includes(m)).map((s) => s.id) });
  }
  for (const ch of c.characters || []) {
    out.push({ id: `voice-${ch.id}`, name: `This Is ${ch.name}`, kind: "voice", ico: "blue", desc: "Voice radio", ids: songs().filter((s) => String(s.character_id) === String(ch.id)).map((s) => s.id), cover: ch.avatar, round: true });
  }
  return out;
}
function mixById(id) {
  if (id === "liked") return { id, name: "Liked Songs", ids: songs().filter((s) => state.liked.has(s.id)).map((s) => s.id), desc: "Playlist" };
  const user = state.playlists.find((p) => p.id === id);
  if (user) return { ...user, desc: "Playlist" };
  return mixes().find((m) => m.id === id);
}

function go(hash, fromHist) {
  if (!hash.startsWith("#")) hash = "#/" + hash.replace(/^\//, "");
  if (!fromHist) {
    state.history = state.history.slice(0, state.histI + 1);
    if (state.history[state.histI] !== hash) {
      state.history.push(hash);
      state.histI++;
    }
  }
  if (location.hash !== hash) location.hash = hash;
  route();
}
function parseRoute() {
  const raw = (location.hash.replace(/^#\/?/, "") || "home").split("/");
  const name = raw[0] || "home";
  const id = decodeURIComponent(raw.slice(1).join("/") || "");
  state.route = { name, id };
  if (name === "search") state.query = document.getElementById("search-input").value;
}
function navActive() {
  const n = state.route.name;
  document.querySelectorAll(".nav-link").forEach((el) => {
    const g = el.getAttribute("data-go");
    el.classList.toggle("active", g === n || (g === "home" && n === "artist"));
  });
}

function remember(id) {
  state.recents = [id, ...state.recents.filter((x) => x !== id)].slice(0, 20);
  save();
}
function playIds(ids, startId) {
  const list = (ids || []).map(String).filter(songById);
  if (!list.length) return;
  let q = list.slice();
  let i = Math.max(0, q.indexOf(String(startId || q[0])));
  if (state.shuffle && q.length > 1) {
    const cur = q.splice(i, 1)[0];
    q = [cur, ...q.sort(() => Math.random() - 0.5)];
    i = 0;
  }
  state.queue = q;
  state.qIndex = i;
  startCurrent();
}
function startCurrent() {
  const s = current();
  if (!s) return;
  audio.src = s.mp3;
  audio.play().catch(() => {});
  state.playing = true;
  remember(s.id);
  updatePlayer();
  renderRight();
  render();
  mediaSession(s);
}
function togglePlay() {
  if (!current()) {
    playIds(songs().map((s) => s.id));
    return;
  }
  if (audio.paused) audio.play();
  else audio.pause();
}
function next(delta = 1) {
  if (!state.queue.length) return;
  if (delta < 0 && audio.currentTime > 3) { audio.currentTime = 0; return; }
  let i = state.qIndex + delta;
  if (state.repeat === "one" && delta > 0) { audio.currentTime = 0; audio.play(); return; }
  if (i >= state.queue.length) {
    if (state.repeat === "all") i = 0;
    else { state.playing = false; audio.pause(); updatePlayer(); return; }
  }
  if (i < 0) i = state.repeat === "all" ? state.queue.length - 1 : 0;
  state.qIndex = i;
  startCurrent();
}
function queueAdd(id, nextUp) {
  id = String(id);
  if (!songById(id)) return;
  if (!state.queue.length) { playIds([id]); return; }
  if (nextUp) state.queue.splice(state.qIndex + 1, 0, id);
  else state.queue.push(id);
  toast(nextUp ? "Queued next" : "Added to queue");
  renderRight();
}
function toggleLike(id) {
  id = String(id);
  if (state.liked.has(id)) { state.liked.delete(id); toast("Removed from Liked Songs"); }
  else { state.liked.add(id); toast("Added to Liked Songs"); }
  save();
  updatePlayer();
  renderLib();
  if (["liked", "library"].includes(state.route.name) || state.route.id === "liked") render();
}
function radioFrom(id) {
  const s = songById(id);
  if (!s) return;
  const pool = songs().filter((x) => x.id === s.id || (s.genres || []).some((g) => (x.genres || []).includes(g)) || (s.moods || []).some((m) => (x.moods || []).includes(m)));
  playIds(pool.map((x) => x.id), s.id);
  toast("Playing radio");
}
function mediaSession(s) {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: s.title, artist: state.catalog.name, album: s.character || "Singles",
    artwork: s.cover ? [{ src: s.cover, sizes: "512x512", type: "image/jpeg" }] : [],
  });
  navigator.mediaSession.setActionHandler("play", () => audio.play());
  navigator.mediaSession.setActionHandler("pause", () => audio.pause());
  navigator.mediaSession.setActionHandler("previoustrack", () => next(-1));
  navigator.mediaSession.setActionHandler("nexttrack", () => next(1));
}

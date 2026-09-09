function render() {
  if (!state.catalog) return;
  document.getElementById("mureka-link").href = state.catalog.mureka_url;
  navActive();
  renderLib();
  const n = state.route.name;
  if (n === "search") renderSearch();
  else if (n === "library") renderLibrary();
  else if (n === "artist") renderArtist();
  else if (n === "liked") { state.route.id = "liked"; renderPlaylist(); }
  else if (n === "playlist") renderPlaylist();
  else if (n === "album" || n === "track") renderAlbum();
  else renderHome();
  updatePlayer();
}
function route() {
  parseRoute();
  render();
  renderRight();
}

function updatePlayer() {
  const s = current();
  document.getElementById("play-btn").innerHTML = state.playing && !audio.paused ? PAUSE : PLAY;
  document.getElementById("shuffle-btn").classList.toggle("on", state.shuffle);
  document.getElementById("repeat-btn").classList.toggle("on", state.repeat !== "off");
  document.getElementById("repeat-badge").hidden = state.repeat !== "one";
  document.getElementById("mute-btn").classList.toggle("on", state.muted);
  if (!s) return;
  document.getElementById("p-title").textContent = s.title;
  document.getElementById("p-artist").textContent = `${state.catalog.name} · ${s.character || "Single"}`;
  document.getElementById("p-cover").src = s.cover;
  document.getElementById("like-btn").textContent = state.liked.has(s.id) ? "♥" : "♡";
  document.getElementById("like-btn").classList.toggle("on", state.liked.has(s.id));
  document.getElementById("dur-time").textContent = fmt((audio.duration || 0) * 1000 || s.duration_ms);
  document.title = `${s.title} · ${state.catalog.name}`;
}
function lyricsHtml(s) {
  if (!s || !s.lyrics) return `<p class="empty">No lyrics.</p>`;
  const t = (audio.currentTime || 0) * 1000;
  let active = -1;
  s.lyrics.forEach((line, i) => { if (!line.section && line.t != null && line.t <= t) active = i; });
  return s.lyrics.map((line, i) => `<div class="lyric-line ${line.section ? "section" : ""} ${i === active ? "active" : ""}">${escapeHtml(line.text)}</div>`).join("");
}
function renderRight() {
  const panel = document.getElementById("right-panel");
  const body = document.getElementById("right-body");
  panel.hidden = !state.panel;
  document.querySelectorAll("[data-panel]").forEach((b) => b.classList.toggle("on", b.dataset.panel === state.panelTab));
  if (!state.panel) return;
  const s = current();
  if (state.panelTab === "queue") {
    const upNext = state.queue.slice(state.qIndex + 1);
    body.innerHTML = `<p class="t-sub">Now playing</p>${s ? queueRow(s, true) : ""}
      <p class="t-sub" style="margin-top:12px">Next</p>${upNext.map((id) => queueRow(songById(id))).join("") || `<p class="empty">Queue is empty.</p>`}
      <button class="ghost" id="clear-queue" type="button" style="margin-top:12px">Clear queue</button>`;
    return;
  }
  if (state.panelTab === "lyrics") {
    body.innerHTML = lyricsHtml(s);
    const act = body.querySelector(".active");
    if (act) act.scrollIntoView({ block: "center" });
    return;
  }
  if (!s) { body.innerHTML = `<p class="empty">Nothing playing.</p>`; return; }
  body.innerHTML = `<img class="np-cover" src="${s.cover}" alt="">
    <h3>${escapeHtml(s.title)}</h3>
    <p class="t-sub">${escapeHtml(state.catalog.name)} · ${escapeHtml(s.character || "Single")}</p>
    <div class="actions" style="padding:8px 0">
      <button class="heart ${state.liked.has(s.id) ? "on" : ""}" data-like="${s.id}" type="button">${state.liked.has(s.id) ? "♥" : "♡"}</button>
      <button class="follow" data-radio="${s.id}" type="button">Radio</button>
    </div>
    <dl class="credits">
      <dt>Genres</dt><dd>${escapeHtml((s.genres || []).join(", ") || "—")}</dd>
      <dt>Moods</dt><dd>${escapeHtml((s.moods || []).join(", ") || "—")}</dd>
    </dl>
    <div class="lyrics">${lyricsHtml(s)}</div>`;
}
function queueRow(s, on) {
  if (!s) return "";
  return `<button class="q-item ${on ? "on" : ""}" data-play="${s.id}" type="button"><img src="${s.cover}" alt=""><span><strong>${escapeHtml(s.title)}</strong><small class="t-sub" style="display:block">${escapeHtml(s.character || "")}</small></span></button>`;
}
function openPanel(tab) {
  state.panel = "open";
  state.panelTab = tab;
  renderRight();
}

function showCtx(x, y, songId) {
  const s = songById(songId);
  if (!s) return;
  const el = document.getElementById("ctx");
  const pls = state.playlists.map((p) => `<button data-addpl="${p.id}" data-song="${s.id}" type="button">Add to ${escapeHtml(p.name)}</button>`).join("");
  el.innerHTML = `
    <button data-play="${s.id}" type="button">Play</button>
    <button data-next="${s.id}" type="button">Play next</button>
    <button data-queue="${s.id}" type="button">Add to queue</button>
    <hr>
    <button data-like="${s.id}" type="button">${state.liked.has(s.id) ? "Remove from Liked Songs" : "Add to Liked Songs"}</button>
    <button data-newpl="${s.id}" type="button">Add to new playlist</button>
    ${pls}
    <hr>
    <button data-radio="${s.id}" type="button">Go to radio</button>
    <button data-go="album/${s.id}" type="button">Go to album</button>
    <button data-copy="${s.mureka_url}" type="button">Copy Mureka link</button>
    <a href="${s.mureka_url}" target="_blank" rel="noopener"><button type="button">Open on Mureka</button></a>`;
  el.hidden = false;
  el.style.left = Math.min(x, innerWidth - 240) + "px";
  el.style.top = Math.min(y, innerHeight - 360) + "px";
}
function openModal(songId) {
  state.modalSong = songId || null;
  document.getElementById("modal").hidden = false;
  document.getElementById("modal-input").value = "";
  document.getElementById("modal-input").focus();
}
function createPlaylist() {
  const name = document.getElementById("modal-input").value.trim() || "My playlist";
  const p = { id: "pl-" + Date.now(), name, ids: state.modalSong ? [String(state.modalSong)] : [] };
  state.playlists.push(p);
  save();
  document.getElementById("modal").hidden = true;
  toast("Playlist created");
  go(`#/playlist/${p.id}`);
}

function handleAction(e) {
  const t = e.target.closest("[data-go],[data-play],[data-play-list],[data-shuffle-list],[data-like],[data-next],[data-queue],[data-radio],[data-copy],[data-newpl],[data-addpl],[data-libfilter],[data-panel],[data-open]");
  if (!t) return;
  if (t.dataset.go) { e.preventDefault(); go("#/" + t.dataset.go); }
  else if (t.dataset.open) { e.preventDefault(); go("#/" + t.dataset.open); }
  else if (t.dataset.playList) playIds(t.dataset.playList.split(",").filter(Boolean));
  else if (t.dataset.shuffleList) { state.shuffle = true; playIds(t.dataset.shuffleList.split(",").filter(Boolean)); }
  else if (t.dataset.play) {
    const id = String(t.dataset.play);
    if (state.queue.includes(id)) { state.qIndex = state.queue.indexOf(id); startCurrent(); }
    else playIds(songs().map((s) => s.id), id);
  }
  else if (t.dataset.like) { e.preventDefault(); e.stopPropagation(); toggleLike(t.dataset.like); }
  else if (t.dataset.next) queueAdd(t.dataset.next, true);
  else if (t.dataset.queue) queueAdd(t.dataset.queue, false);
  else if (t.dataset.radio) radioFrom(t.dataset.radio);
  else if (t.dataset.copy) { navigator.clipboard.writeText(t.dataset.copy); toast("Link copied"); }
  else if (t.dataset.newpl) openModal(t.dataset.newpl);
  else if (t.dataset.addpl) {
    const p = state.playlists.find((x) => x.id === t.dataset.addpl);
    if (p && !p.ids.includes(t.dataset.song)) p.ids.push(t.dataset.song);
    save(); toast("Added to playlist");
  } else if (t.dataset.libfilter) {
    state.libFilter = t.dataset.libfilter;
    document.querySelectorAll("[data-libfilter]").forEach((b) => b.classList.toggle("on", b.dataset.libfilter === state.libFilter));
    renderLib();
    if (state.route.name === "library") render();
  } else if (t.dataset.panel) { state.panelTab = t.dataset.panel; state.panel = "open"; renderRight(); }
  document.getElementById("ctx").hidden = true;
}

document.getElementById("play-btn").onclick = togglePlay;
document.getElementById("prev-btn").onclick = () => next(-1);
document.getElementById("next-btn").onclick = () => next(1);
document.getElementById("shuffle-btn").onclick = () => { state.shuffle = !state.shuffle; updatePlayer(); };
document.getElementById("repeat-btn").onclick = () => {
  state.repeat = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
  updatePlayer();
};
document.getElementById("like-btn").onclick = () => current() && toggleLike(current().id);
document.getElementById("lyrics-btn").onclick = () => openPanel("lyrics");
document.getElementById("queue-btn").onclick = () => openPanel("queue");
document.getElementById("open-now").onclick = () => openPanel("now");
document.getElementById("p-title").onclick = () => current() && go("#/album/" + current().id);
document.getElementById("close-now").onclick = () => { state.panel = null; renderRight(); };
document.getElementById("new-playlist").onclick = () => openModal(null);
document.getElementById("modal-cancel").onclick = () => { document.getElementById("modal").hidden = true; };
document.getElementById("modal-ok").onclick = createPlaylist;
document.getElementById("back-btn").onclick = () => {
  if (state.histI > 0) { state.histI--; go(state.history[state.histI], true); }
};
document.getElementById("fwd-btn").onclick = () => {
  if (state.histI < state.history.length - 1) { state.histI++; go(state.history[state.histI], true); }
};
document.getElementById("mute-btn").onclick = () => {
  state.muted = !state.muted;
  audio.muted = state.muted;
  updatePlayer();
};
document.getElementById("vol").oninput = (e) => {
  state.volume = Number(e.target.value);
  audio.volume = state.volume;
  state.muted = false; audio.muted = false;
  save();
};
document.getElementById("seek").oninput = (e) => {
  if (!audio.duration) return;
  audio.currentTime = (Number(e.target.value) / 1000) * audio.duration;
};
document.getElementById("search-form").onsubmit = (e) => e.preventDefault();
document.getElementById("search-input").addEventListener("focus", () => go("#/search"));
document.getElementById("search-input").addEventListener("input", (e) => {
  state.query = e.target.value;
  if (state.route.name !== "search") go("#/search");
  else renderSearch();
});
document.body.addEventListener("click", (e) => {
  if (e.target.id === "follow-btn") {
    state.following = !state.following; save(); render(); return;
  }
  if (e.target.id === "clear-queue") { state.queue = current() ? [current().id] : []; state.qIndex = 0; renderRight(); return; }
  if (e.target.closest("tr[data-song]") && !e.target.closest("[data-like]")) {
    const id = e.target.closest("tr[data-song]").dataset.song;
    const ids = [...viewEl.querySelectorAll("tr[data-song]")].map((r) => r.dataset.song);
    playIds(ids, id);
    return;
  }
  handleAction(e);
});
document.body.addEventListener("contextmenu", (e) => {
  const row = e.target.closest("[data-song], [data-play]");
  const id = row && (row.dataset.song || row.dataset.play);
  if (!id) return;
  e.preventDefault();
  showCtx(e.clientX, e.clientY, id);
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#ctx")) document.getElementById("ctx").hidden = true;
});
audio.volume = state.volume;
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  document.getElementById("seek").value = Math.round((audio.currentTime / audio.duration) * 1000);
  document.getElementById("cur-time").textContent = fmt(audio.currentTime * 1000);
  if (state.panel && (state.panelTab === "lyrics" || state.panelTab === "now")) {
    const html = lyricsHtml(current());
    if (state.panelTab === "lyrics") {
      document.getElementById("right-body").innerHTML = html;
      const act = document.querySelector("#right-body .active");
      if (act) act.scrollIntoView({ block: "center" });
    } else {
      const lyr = document.querySelector("#right-body .lyrics");
      if (lyr) lyr.innerHTML = html;
    }
  }
});
audio.addEventListener("ended", () => next(1));
audio.addEventListener("play", () => { state.playing = true; updatePlayer(); });
audio.addEventListener("pause", () => { state.playing = false; updatePlayer(); });
window.addEventListener("hashchange", route);
window.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea")) return;
  if (e.code === "Space") { e.preventDefault(); togglePlay(); }
  else if (e.code === "ArrowRight") audio.currentTime += e.shiftKey ? 15 : 5;
  else if (e.code === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - (e.shiftKey ? 15 : 5));
  else if (e.key === "n" || e.key === "N") next(1);
  else if (e.key === "p" || e.key === "P") next(-1);
  else if (e.key === "l" || e.key === "L") openPanel("lyrics");
  else if (e.key === "q" || e.key === "Q") openPanel("queue");
  else if (e.key === "m" || e.key === "M") document.getElementById("mute-btn").click();
  else if (e.key === "s" || e.key === "S") document.getElementById("shuffle-btn").click();
  else if (e.key === "r" || e.key === "R") document.getElementById("repeat-btn").click();
});

loadCatalog().then(() => {
  route();
  const first = songs()[0];
  if (first) {
    document.getElementById("p-cover").src = first.cover;
    document.getElementById("p-title").textContent = first.title;
  }
});

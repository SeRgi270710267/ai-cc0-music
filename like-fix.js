function likeTargetId() {
  if (typeof current === "function" && current()) return String(current().id);
  const n = state.route && state.route.name;
  if (n === "album" || n === "track") return String(state.route.id || "");
  return "";
}
function ensureLiked() {
  const src = state.liked instanceof Set ? [...state.liked] : (Array.isArray(state.liked) ? state.liked : []);
  state.liked = new Set(src.map(String).filter(Boolean));
  return state.liked;
}
function isLiked(id) {
  return ensureLiked().has(String(id || ""));
}
function likedSongIds() {
  return songs().filter(function (s) { return isLiked(s.id); }).map(function (s) { return s.id; });
}
function heartSvg() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
}
function paintLikeEl(el, on) {
  el.classList.toggle("on", on);
  el.setAttribute("aria-pressed", on ? "true" : "false");
  if (el.id === "like-btn") {
    el.innerHTML = heartSvg();
    el.setAttribute("aria-label", on ? "Liked" : "Like");
    return;
  }
  if (el.closest("#ctx")) {
    el.textContent = on ? "Remove from Liked Songs" : "Add to Liked Songs";
    return;
  }
  el.textContent = on ? "Liked" : "Like";
}
function paintHearts(id) {
  ensureLiked();
  const focus = id != null && id !== "" ? String(id) : "";
  document.querySelectorAll("#like-btn, [data-like]").forEach(function (el) {
    const target = el.id === "like-btn" ? (likeTargetId() || focus) : String(el.dataset.like || "");
    if (!target) {
      if (el.id === "like-btn") {
        el.innerHTML = heartSvg();
        el.classList.remove("on");
        el.setAttribute("aria-pressed", "false");
        el.setAttribute("aria-label", "Like");
      }
      return;
    }
    paintLikeEl(el, isLiked(target));
  });
}

toggleLike = function (id) {
  ensureLiked();
  if (typeof ensurePrefs === "function") ensurePrefs();
  id = String(id || likeTargetId() || "");
  if (!id) {
    toast("Open or play a track first");
    return;
  }
  if (state.liked.has(id)) {
    state.liked.delete(id);
    toast("Removed from Liked Songs");
  } else {
    state.liked.add(id);
    if (state.hidden) state.hidden.delete("liked");
    toast("Added to Liked Songs");
  }
  save();
  paintHearts(id);
  if (typeof render === "function") render();
  else {
    if (typeof updatePlayer === "function") updatePlayer();
    if (typeof renderLib === "function") renderLib();
  }
};

const _updatePlayerLike = updatePlayer;
updatePlayer = function () {
  _updatePlayerLike();
  paintHearts();
};

document.getElementById("like-btn").onclick = function () {
  const id = likeTargetId();
  if (!id) toast("Open or play a track first");
  else toggleLike(id);
};

const _toastLike = toast;
toast = function (msg) {
  _toastLike(msg);
  const el = document.getElementById("toast");
  if (!el) return;
  el.hidden = false;
  el.style.zIndex = "80";
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { el.hidden = true; }, 2800);
};

const _mixByIdLike = mixById;
mixById = function (id) {
  ensureLiked();
  if (id === "liked") {
    return { id: "liked", name: "Liked Songs", ids: likedSongIds(), desc: "Playlist" };
  }
  return _mixByIdLike(id);
};

if (typeof libEntries === "function") {
  const _libEntriesLike = libEntries;
  libEntries = function () {
    ensureLiked();
    if (state.hidden && state.liked.size) state.hidden.delete("liked");
    const items = _libEntriesLike();
    const f = state.libFilter || "all";
    if (f !== "all" && f !== "albums") return items;
    const seen = {};
    items.forEach(function (e) { seen[e.go] = true; });
    songs().forEach(function (s) {
      if (!isLiked(s.id)) return;
      const go = "album/" + s.id;
      if (seen[go]) return;
      items.push({
        go: go,
        name: s.title,
        sub: "Liked \u00b7 Single",
        img: s.cover,
        round: false,
        removeId: "album-" + s.id,
      });
    });
    return items;
  };
}

if (typeof removeFromLibrary === "function") {
  const _removeFromLibraryLike = removeFromLibrary;
  removeFromLibrary = function (id) {
    id = String(id || "");
    if (id.indexOf("album-") === 0) {
      const songId = id.slice(6);
      ensureLiked();
      if (state.liked.has(songId)) state.liked.delete(songId);
      if (state.follows) state.follows.delete(id);
      save();
      toast("Removed from Your Library");
      if (typeof render === "function") render();
      return;
    }
    _removeFromLibraryLike(id);
  };
}

if (typeof applySnap === "function") {
  const _applySnapLike = applySnap;
  applySnap = function (s) {
    _applySnapLike(s);
    ensureLiked();
  };
}

if (typeof renderSearch === "function") {
  const _renderSearchHide = renderSearch;
  renderSearch = function () {
    _renderSearchHide();
    if (typeof isLoggedIn !== "function" || !isLoggedIn()) return;
    document.querySelectorAll("#view .card[data-go^=\"playlist/\"]").forEach(function (card) {
      const href = card.getAttribute("data-go") || "";
      const id = href.replace(/^playlist\//, "");
      if (!id || id === "liked") return;
      if (card.querySelector("[data-follow]")) return;
      const inLib = state.follows && state.follows.has(id);
      const hidden = typeof isHidden === "function" && isHidden(id);
      if (inLib && !hidden) return;
      const b = document.createElement("button");
      b.className = "follow";
      b.type = "button";
      b.setAttribute("data-follow", id);
      b.textContent = hidden ? "Add back" : "Add to library";
      b.style.marginTop = "8px";
      card.appendChild(b);
    });
  };
}

ensureLiked();

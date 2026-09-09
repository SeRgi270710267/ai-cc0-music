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
function paintHearts(id) {
  ensureLiked();
  const focus = id != null && id !== "" ? String(id) : "";
  document.querySelectorAll("#like-btn, [data-like]").forEach(function (el) {
    const target = el.id === "like-btn" ? (likeTargetId() || focus) : String(el.dataset.like || "");
    if (!target) {
      if (el.id === "like-btn") {
        el.textContent = "♡";
        el.classList.remove("on");
        el.setAttribute("aria-pressed", "false");
      }
      return;
    }
    const on = isLiked(target);
    el.textContent = on ? "♥" : "♡";
    el.classList.toggle("on", on);
    if (el.id === "like-btn") el.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

toggleLike = function (id) {
  ensureLiked();
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

function likeTargetId() {
  if (current()) return String(current().id);
  const n = state.route && state.route.name;
  if (n === "album" || n === "track") return String(state.route.id || "");
  return "";
}

toggleLike = function (id) {
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
  document.querySelectorAll("#like-btn, [data-like]").forEach((el) => {
    const target = el.id === "like-btn" ? id : String(el.dataset.like || "");
    if (target !== id) return;
    const on = state.liked.has(id);
    el.textContent = on ? "♥" : "♡";
    el.classList.toggle("on", on);
  });
  if (typeof render === "function") render();
  else {
    updatePlayer();
    if (typeof renderLib === "function") renderLib();
  }
};

const _updatePlayerLike = updatePlayer;
updatePlayer = function () {
  _updatePlayerLike();
  const id = likeTargetId();
  const btn = document.getElementById("like-btn");
  if (!btn) return;
  const on = !!(id && state.liked.has(id));
  btn.textContent = on ? "♥" : "♡";
  btn.classList.toggle("on", on);
};

document.getElementById("like-btn").onclick = function () {
  const id = likeTargetId();
  if (!id) toast("Open or play a track first");
  else toggleLike(id);
};

const _toast = toast;
toast = function (msg) {
  _toast(msg);
  const el = document.getElementById("toast");
  if (!el) return;
  el.hidden = false;
  el.style.zIndex = "80";
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { el.hidden = true; }, 2800);
};

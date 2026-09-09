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

document.getElementById("like-btn").onclick = function () {
  const id = likeTargetId();
  if (!id) toast("Open or play a track first");
  else toggleLike(id);
};

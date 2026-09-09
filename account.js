const VAULT_KEY = "aicc0.vault";

function emptySnap() {
  return { liked: [], playlists: [], recents: [], following: false, follows: [], volume: 0.85 };
}
function loadVault() {
  const v = loadJSON(VAULT_KEY, null);
  if (v && typeof v === "object") {
    v.accounts = v.accounts || {};
    v.guest = v.guest || emptySnap();
    return v;
  }
  return {
    current: null,
    guest: {
      liked: loadJSON("liked", []),
      playlists: loadJSON("playlists", []),
      recents: loadJSON("recents", []),
      following: localStorage.getItem("following") === "1",
      follows: localStorage.getItem("following") === "1" ? ["artist"] : [],
      volume: Number(localStorage.getItem("volume") || 0.85),
    },
    accounts: {},
  };
}
function writeVault(v) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(v));
}
function snapFromState() {
  if (!state.follows) state.follows = new Set();
  if (state.following) state.follows.add("artist");
  else state.follows.delete("artist");
  return {
    liked: [...state.liked],
    playlists: state.playlists,
    recents: state.recents.slice(0, 20),
    following: state.following,
    follows: [...state.follows],
    volume: state.volume,
  };
}
function applySnap(s) {
  s = s || emptySnap();
  state.liked = new Set(s.liked || []);
  state.playlists = s.playlists || [];
  state.recents = s.recents || [];
  state.follows = new Set(s.follows || (s.following ? ["artist"] : []));
  state.following = state.follows.has("artist");
  if (s.volume != null) {
    state.volume = Number(s.volume);
    if (audio) audio.volume = state.volume;
    const vol = document.getElementById("vol");
    if (vol) vol.value = String(state.volume);
  }
}
function persistAccount() {
  const vault = loadVault();
  const snap = snapFromState();
  if (vault.current && vault.accounts[vault.current]) {
    Object.assign(vault.accounts[vault.current], snap, { updated: Date.now() });
  } else {
    vault.guest = snap;
  }
  writeVault(vault);
  localStorage.setItem("liked", JSON.stringify(snap.liked));
  localStorage.setItem("playlists", JSON.stringify(snap.playlists));
  localStorage.setItem("recents", JSON.stringify(snap.recents));
  localStorage.setItem("following", snap.following ? "1" : "0");
  localStorage.setItem("volume", String(snap.volume));
}
save = function saveAccountAware() {
  persistAccount();
};

function genAccountId() {
  const vault = loadVault();
  let id = "";
  do {
    const a = new Uint32Array(4);
    crypto.getRandomValues(a);
    id = Array.from(a, (n) => String(n % 10000).padStart(4, "0")).join("");
  } while (vault.accounts[id]);
  return id;
}
function fmtAccount(id) {
  return String(id || "").replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
}
function normAccount(s) {
  return String(s || "").replace(/\D/g, "").slice(0, 16);
}
function currentAccountId() {
  return loadVault().current || null;
}
function hydrateAccount() {
  state.follows = state.follows || new Set();
  const vault = loadVault();
  if (vault.current && vault.accounts[vault.current]) applySnap(vault.accounts[vault.current]);
  else applySnap(vault.guest);
}
function createAnonymousAccount() {
  persistAccount();
  const vault = loadVault();
  const id = genAccountId();
  vault.accounts[id] = { created: Date.now(), ...(vault.guest || snapFromState()) };
  vault.current = id;
  vault.guest = emptySnap();
  writeVault(vault);
  applySnap(vault.accounts[id]);
  showAcctPanel("created");
  paintAccount();
  if (typeof render === "function") render();
  toast("Anonymous account created");
}
function loginAccount(raw) {
  const id = normAccount(raw);
  if (id.length !== 16) { toast("Account numbers are 16 digits"); return; }
  persistAccount();
  const vault = loadVault();
  if (!vault.accounts[id]) {
    state._pendingLogin = id;
    showAcctPanel("missing");
    document.getElementById("acct-missing-num").textContent = fmtAccount(id);
    return;
  }
  vault.current = id;
  writeVault(vault);
  applySnap(vault.accounts[id]);
  closeAcct();
  paintAccount();
  if (typeof render === "function") render();
  toast("Logged in");
}
function adoptEmptyAccount() {
  const id = state._pendingLogin;
  if (!id) return;
  const vault = loadVault();
  vault.accounts[id] = { created: Date.now(), ...emptySnap() };
  vault.current = id;
  writeVault(vault);
  applySnap(vault.accounts[id]);
  closeAcct();
  paintAccount();
  if (typeof render === "function") render();
  toast("Empty account opened on this device");
}
function logoutAccount() {
  persistAccount();
  const vault = loadVault();
  vault.current = null;
  writeVault(vault);
  applySnap(vault.guest);
  closeAcct();
  paintAccount();
  if (typeof render === "function") render();
  toast("Logged out");
}
function deleteAccountHere() {
  const id = currentAccountId();
  if (!id) return;
  const vault = loadVault();
  delete vault.accounts[id];
  vault.current = null;
  writeVault(vault);
  applySnap(vault.guest);
  closeAcct();
  paintAccount();
  if (typeof render === "function") render();
  toast("Removed from this browser");
}
function exportAccount() {
  const id = currentAccountId();
  if (!id) { toast("Create an account first"); return; }
  persistAccount();
  const vault = loadVault();
  const blob = new Blob([JSON.stringify({ v: 1, id, account: vault.accounts[id] }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "aicc0-account-" + id + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Backup downloaded");
}
function importAccountFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const id = normAccount(data.id);
      if (id.length !== 16 || !data.account) throw new Error("bad");
      const vault = loadVault();
      vault.accounts[id] = data.account;
      vault.current = id;
      writeVault(vault);
      applySnap(data.account);
      closeAcct();
      paintAccount();
      if (typeof render === "function") render();
      toast("Account imported");
    } catch {
      toast("Could not read that backup");
    }
  };
  reader.readAsText(file);
}
function toggleFollow(id) {
  id = String(id);
  if (!state.follows) state.follows = new Set();
  if (state.follows.has(id)) { state.follows.delete(id); toast("Unfollowed"); }
  else { state.follows.add(id); toast("Following"); }
  state.following = state.follows.has("artist");
  save();
  if (typeof render === "function") render();
}
function paintAccount() {
  const btn = document.getElementById("acct-btn");
  if (!btn) return;
  const id = currentAccountId();
  if (id) {
    btn.textContent = "•••• " + id.slice(-4);
    btn.classList.add("on");
    btn.title = "Account " + fmtAccount(id);
  } else {
    btn.textContent = "Get account";
    btn.classList.remove("on");
    btn.title = "Create an anonymous account";
  }
  const created = document.getElementById("acct-created-num");
  if (created && id) created.textContent = fmtAccount(id);
  const homeNum = document.getElementById("acct-home-num");
  if (homeNum) homeNum.textContent = id ? fmtAccount(id) : "";
}
function showAcctPanel(name) {
  document.querySelectorAll("[data-acct-panel]").forEach((p) => {
    p.hidden = p.dataset.acctPanel !== name;
  });
}
function openAcct() {
  document.getElementById("acct-modal").hidden = false;
  showAcctPanel(currentAccountId() ? "home" : "welcome");
  paintAccount();
  const input = document.getElementById("acct-login-input");
  if (input) input.value = "";
}
function closeAcct() {
  document.getElementById("acct-modal").hidden = true;
}
function injectFollowBtn() {
  const actions = document.querySelector("#view .actions");
  if (!actions) return;
  const route = state.route || {};
  if (route.name === "artist") {
    const b = document.getElementById("follow-btn");
    if (b) {
      b.dataset.follow = "artist";
      b.classList.toggle("on", state.follows.has("artist"));
      b.textContent = state.follows.has("artist") ? "Following" : "Follow";
    }
    return;
  }
  if (route.name !== "playlist" && route.name !== "liked") return;
  if (actions.querySelector("[data-follow]")) return;
  const id = route.id || "liked";
  const b = document.createElement("button");
  b.className = "follow" + (state.follows.has(id) ? " on" : "");
  b.dataset.follow = id;
  b.type = "button";
  b.textContent = state.follows.has(id) ? "Following" : "Follow";
  actions.appendChild(b);
}

hydrateAccount();
paintAccount();
const wrapRender = setInterval(() => {
  if (typeof render !== "function") return;
  clearInterval(wrapRender);
  const orig = render;
  render = function () {
    orig();
    paintAccount();
    injectFollowBtn();
  };
  paintAccount();
}, 30);

document.getElementById("acct-btn").onclick = openAcct;
document.getElementById("acct-close").onclick = closeAcct;
document.getElementById("acct-create").onclick = createAnonymousAccount;
document.getElementById("acct-goto-login").onclick = () => showAcctPanel("login");
document.getElementById("acct-back-welcome").onclick = () => showAcctPanel("welcome");
document.getElementById("acct-login-go").onclick = () => loginAccount(document.getElementById("acct-login-input").value);
document.getElementById("acct-login-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginAccount(e.target.value);
});
document.getElementById("acct-copy").onclick = () => {
  const id = currentAccountId();
  if (!id) return;
  navigator.clipboard.writeText(fmtAccount(id));
  toast("Account number copied");
};
document.getElementById("acct-saved").onclick = closeAcct;
document.getElementById("acct-export").onclick = exportAccount;
document.getElementById("acct-logout").onclick = logoutAccount;
document.getElementById("acct-delete").onclick = deleteAccountHere;
document.getElementById("acct-adopt").onclick = adoptEmptyAccount;
document.getElementById("acct-import-btn").onclick = () => document.getElementById("acct-import").click();
document.getElementById("acct-import-missing").onclick = () => document.getElementById("acct-import").click();
document.getElementById("acct-import").addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) importAccountFile(f);
  e.target.value = "";
});
document.body.addEventListener("click", (e) => {
  const t = e.target.closest("[data-follow]");
  if (!t) return;
  e.preventDefault();
  e.stopPropagation();
  toggleFollow(t.dataset.follow);
}, true);

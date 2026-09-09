function navActive() {
  const n = state.route.name;
  document.querySelectorAll(".nav-link").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-go") === n);
  });
}
document.body.addEventListener("click", (e) => {
  const t = e.target.closest("[data-homefilter]");
  if (!t) return;
  e.preventDefault();
  e.stopPropagation();
  state.homeFilter = t.dataset.homefilter;
  if ((state.route.name || "home") === "home") renderHome();
}, true);
document.getElementById("acct-modal").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b && /Download backup/.test(b.textContent || "")) {
    e.preventDefault();
    exportAccount();
  }
});

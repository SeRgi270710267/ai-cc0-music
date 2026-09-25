/* Events overlay — #/events schedule from events.json (static Pages). */
(function () {
  const TYPE_LABEL = { album: "Album", single: "Single", show: "Show", other: "Other" };
  const FILTERS = ["all", "upcoming", "released", "album", "single", "show"];

  state.events = state.events || null;
  state.eventsFilter = state.eventsFilter || "all";
  state.eventsError = null;

  function eventsIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2zm13 8H4v10h16V10zM7 6H4v2h16V6h-3v1h-2V6H9v1H7V6z"/></svg>`;
  }

  function loadEvents() {
    if (state.events) return Promise.resolve(state.events);
    return fetch("./events.json?v=events1")
      .then(function (r) {
        if (!r.ok) throw new Error("events.json " + r.status);
        return r.json();
      })
      .then(function (data) {
        state.events = Array.isArray(data) ? data : [];
        state.eventsError = null;
        return state.events;
      })
      .catch(function (err) {
        state.events = [];
        state.eventsError = String(err && err.message || err);
        return state.events;
      });
  }

  function parseEventDate(ev) {
    const raw = (ev && ev.date) || "";
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return null;
  }

  function monthShort(d) {
    return d.toLocaleString(undefined, { month: "short" });
  }

  function escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function eventMatchesFilter(ev, f) {
    if (!f || f === "all") return true;
    if (f === "upcoming" || f === "released") return (ev.status || "upcoming") === f;
    return (ev.type || "other") === f;
  }

  function sortEvents(list) {
    return list.slice().sort(function (a, b) {
      const da = parseEventDate(a);
      const db = parseEventDate(b);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return ta - tb;
    });
  }

  function coverHtml(ev) {
    if (ev.cover) {
      return `<img class="event-cover" src="${escapeAttr(ev.cover)}" alt="">`;
    }
    const letter = (ev.title || "?").trim().charAt(0).toUpperCase() || "?";
    return `<div class="event-cover ph" aria-hidden="true">${escapeHtml(letter)}</div>`;
  }

  function eventCard(ev) {
    const d = parseEventDate(ev);
    const type = TYPE_LABEL[ev.type] ? ev.type : "other";
    const status = ev.status === "released" ? "released" : "upcoming";
    const mon = d ? monthShort(d) : "—";
    const day = d ? String(d.getDate()) : "·";
    const yr = d ? String(d.getFullYear()) : "";
    const timeNote = ev.time || "";
    const link = ev.link
      ? `<a class="event-link" href="${escapeAttr(ev.link)}" target="_blank" rel="noopener">Open</a>`
      : "";
    return `<article class="event-card" data-event-id="${escapeAttr(ev.id || "")}">
      <div class="event-date" aria-label="${escapeAttr(d ? d.toDateString() : "Date TBA")}">
        <span class="mon">${escapeHtml(mon)}</span>
        <span class="day">${escapeHtml(day)}</span>
        <span class="yr">${escapeHtml(yr)}</span>
      </div>
      ${coverHtml(ev)}
      <div class="event-body">
        <h3>${escapeHtml(ev.title || "Untitled")}</h3>
        <p>${escapeHtml(ev.description || "")}</p>
        <div class="event-chips">
          <span class="event-chip type-${type}">${escapeHtml(TYPE_LABEL[type] || "Other")}</span>
          <span class="event-chip status-${status}">${escapeHtml(status)}</span>
        </div>
      </div>
      <div class="event-aside">
        ${timeNote ? `<div class="event-time">${escapeHtml(timeNote)}</div>` : `<div class="event-time"></div>`}
        ${link}
      </div>
    </article>`;
  }

  function renderEvents() {
    const all = state.events || [];
    const f = state.eventsFilter || "all";
    const filtered = sortEvents(all.filter(function (ev) { return eventMatchesFilter(ev, f); }));
    const upcomingCount = all.filter(function (ev) { return (ev.status || "upcoming") === "upcoming"; }).length;
    const chips = FILTERS.map(function (key) {
      const label = key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1);
      return `<button class="chip-btn ${f === key ? "on" : ""}" data-eventsfilter="${key}" type="button">${label}</button>`;
    }).join("");

    let body;
    if (state.eventsError && !all.length) {
      body = `<div class="events-empty"><strong>Could not load events</strong>${escapeHtml(state.eventsError)}</div>`;
    } else if (!filtered.length) {
      body = `<div class="events-empty"><strong>No events here</strong>Nothing matches this filter yet. Add items in <code>events.json</code> at the repo root.</div>`;
    } else {
      body = `<div class="events-list">${filtered.map(eventCard).join("")}</div>`;
    }

    viewEl.innerHTML = `<div class="events-wrap">
      <section class="events-hero">
        <div class="events-hero-art">${eventsIconSvg()}</div>
        <div>
          <div class="kicker">Schedule</div>
          <h1>Events</h1>
          <div class="meta">${upcomingCount} upcoming · album drops, singles &amp; listening rooms · edit <code>events.json</code></div>
        </div>
      </section>
      <div class="events-toolbar">${chips}</div>
      ${body}
      <p class="events-note">Sample placeholders stay until you replace them. Public schedule only — no backend.</p>
    </div>`;
  }

  const _renderEvents = render;
  render = function () {
    if (!state.catalog) return;
    if (state.route && state.route.name === "events") {
      document.getElementById("mureka-link").href = state.catalog.mureka_url;
      navActive();
      renderLib();
      loadEvents().then(function () {
        if (state.route.name !== "events") return;
        renderEvents();
        updatePlayer();
      });
      updatePlayer();
      return;
    }
    _renderEvents();
  };

  const _navActiveEvents = navActive;
  navActive = function () {
    _navActiveEvents();
    const n = state.route && state.route.name;
    document.querySelectorAll('.nav-link[data-go="events"], .mobile-nav a[data-go="events"]').forEach(function (el) {
      el.classList.toggle("active", n === "events");
    });
  };

  document.body.addEventListener("click", function (e) {
    const t = e.target.closest("[data-eventsfilter]");
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    state.eventsFilter = t.dataset.eventsfilter || "all";
    if (state.route && state.route.name === "events") renderEvents();
  }, true);

  if (state.route && state.route.name === "events") {
    loadEvents().then(function () {
      if (state.route.name === "events") render();
    });
  }
})();

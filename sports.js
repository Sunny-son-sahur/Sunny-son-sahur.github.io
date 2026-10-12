(() => {
  const API = "https://site.api.espn.com/apis/site/v2/sports/";
  const REFRESH_MS = 60000;
  const TIMEOUT_MS = 12000;
  const STORE_KEY = "sg-sports-view";

  // ESPN scoreboard slugs. Display names come back on the payload
  // (leagues[0].name) so they stay correct without being hardcoded here.
  const LEAGUES = [
    { slug: "soccer/eng.1", label: "Premier League" },
    { slug: "soccer/esp.1", label: "LaLiga" },
    { slug: "soccer/ita.1", label: "Serie A" },
    { slug: "soccer/ger.1", label: "Bundesliga" },
    { slug: "soccer/fra.1", label: "Ligue 1" },
    { slug: "soccer/uefa.champions", label: "Champions League" },
    { slug: "basketball/nba", label: "NBA" },
    { slug: "football/nfl", label: "NFL" },
    { slug: "baseball/mlb", label: "MLB" },
    { slug: "hockey/nhl", label: "NHL" }
  ];

  const style = document.createElement("style");
  style.textContent = `
.sports-panel{position:fixed;inset:0;background:var(--background,#0b0b0d);color:var(--text,#fff);z-index:550;display:flex;flex-direction:column}
.sports-panel[hidden]{display:none}
.sports-bar{display:flex;align-items:center;gap:14px;padding:12px 18px;border-bottom:1px solid #222;flex-shrink:0}
.sports-bar strong{flex:1}
.sports-stamp{font-size:12px;color:#8a8a92;font-variant-numeric:tabular-nums}
.sports-refresh{background:#17171b;border:1px solid #2e2e36;color:#e8e8ee;border-radius:8px;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer}
.sports-refresh:hover{background:#1f1f25;border-color:#3d3d47}
.sports-refresh[disabled]{opacity:.5;cursor:default}
.sports-refresh.is-spinning{animation:sg-spin .9s linear infinite}
@keyframes sg-spin{to{transform:rotate(360deg)}}
.sports-tabs{display:flex;gap:8px;overflow-x:auto;padding:12px 18px;border-bottom:1px solid #1c1c22;flex-shrink:0;scrollbar-width:thin}
.sports-tab{background:#141419;border:1px solid #2a2a32;color:#c9c9d3;border-radius:999px;padding:7px 14px;font:inherit;font-size:13px;white-space:nowrap;cursor:pointer}
.sports-tab:hover{border-color:#3d3d47;color:#fff}
.sports-tab[aria-selected="true"]{background:#fff;border-color:#fff;color:#000;font-weight:700}
.sports-dates{display:flex;gap:8px;padding:12px 18px 0;flex-shrink:0}
.sports-date{background:transparent;border:1px solid #2a2a32;color:#9a9aa4;border-radius:8px;padding:6px 13px;font:inherit;font-size:13px;cursor:pointer}
.sports-date:hover{color:#fff;border-color:#3d3d47}
.sports-date[aria-pressed="true"]{background:#1b1b22;border-color:#4a4a56;color:#fff}
.sports-body{flex:1;overflow-y:auto;padding:16px 18px 40px}
.sports-status{display:grid;place-content:center;text-align:center;padding:56px 24px;color:#9a9aa4}
.sports-status h1{font-size:20px;margin:0 0 10px;color:#fff}
.sports-status p{max-width:420px;line-height:1.6;margin:0 auto}
.sports-status button{margin-top:18px}
.sports-group{margin-bottom:26px}
.sports-group h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7f7f8a;margin:0 0 10px;display:flex;align-items:center;gap:8px}
.sports-group h2::after{content:"";flex:1;height:1px;background:#1f1f26}
.sports-dot{width:7px;height:7px;border-radius:50%;background:#ff4d4d;box-shadow:0 0 0 0 rgba(255,77,77,.6);animation:sg-pulse 1.6s ease-out infinite}
@keyframes sg-pulse{70%{box-shadow:0 0 0 7px rgba(255,77,77,0)}100%{box-shadow:0 0 0 0 rgba(255,77,77,0)}}
.match{background:#131318;border:1px solid #23232b;border-radius:12px;padding:12px 14px;margin-bottom:8px}
.match--live{border-color:#4a1f1f;background:#171316}
.match__meta{font-size:11.5px;color:#83838e;margin-bottom:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.match__league{color:#a8a8b4;text-transform:uppercase;letter-spacing:.06em}
.match__side{display:flex;align-items:center;gap:10px;padding:3px 0}
.match__team{flex:1;font-size:15px;color:#b9b9c4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.match__team.is-winner{color:#fff;font-weight:700}
.match__score{min-width:34px;text-align:right;font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;color:#e9e9f1}
.match__score.is-empty{color:#55555f;font-weight:400}
.match__score.is-tbd{font-size:13px;font-weight:400;color:#55555f}
.sports-legend{font-size:12px;color:#6e6e78;text-align:center;padding:6px 0 0}
`;
  document.head.append(style);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function dateKey(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  }

  function dateLabel(offset) {
    if (offset === 0) return "Today";
    if (offset === -1) return "Yesterday";
    if (offset === 1) return "Tomorrow";
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function kickoffLabel(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
  }

  // Remote payload is untrusted: only ever read into textContent, never markup.
  function parse(data) {
    const leagueName = (data && data.leagues && data.leagues[0] && data.leagues[0].name) || "";
    const events = ((data && data.events) || []).map((ev) => {
      const comp = (ev.competitions && ev.competitions[0]) || {};
      const type = (ev.status && ev.status.type) || {};
      const sides = {};
      for (const c of comp.competitors || []) {
        sides[c.homeAway] = {
          name:
            (c.team && (c.team.displayName || c.team.shortDisplayName)) ||
            (c.team && c.team.name) ||
            "TBD",
          score: c.score == null || c.score === "" ? null : String(c.score),
          winner: !!c.winner
        };
      }
      return {
        id: ev.id,
        date: ev.date,
        state: type.state || "pre",
        completed: !!type.completed,
        detail: type.shortDetail || type.detail || type.description || "",
        home: sides.home || { name: "TBD", score: null, winner: false },
        away: sides.away || { name: "TBD", score: null, winner: false }
      };
    });
    return { leagueName, events };
  }

  function group(events) {
    const live = [];
    const upcoming = [];
    const results = [];
    for (const e of events) {
      if (e.state === "in") live.push(e);
      else if (e.state === "post" || e.completed) results.push(e);
      else upcoming.push(e);
    }
    upcoming.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    results.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return [
      { title: "Live now", items: live, live: true },
      { title: "Upcoming", items: upcoming },
      { title: "Results", items: results }
    ].filter((g) => g.items.length);
  }

  function matchRow(ev, leagueLabel) {
    const row = el("article", "match" + (ev.state === "in" ? " match--live" : ""));

    const meta = el("div", "match__meta");
    meta.append(el("span", "match__league", leagueLabel));
    if (ev.state === "pre") {
      meta.append(el("span", null, kickoffLabel(ev.date) || "Time TBA"));
    } else if (ev.detail) {
      meta.append(el("span", null, ev.detail));
    }
    row.append(meta);

    for (const key of ["home", "away"]) {
      const side = ev[key];
      const line = el("div", "match__side");
      const team = el("span", "match__team" + (side.winner && ev.completed ? " is-winner" : ""), side.name);
      let score;
      if (ev.state === "pre" || side.score == null) {
        score = el("span", "match__score is-tbd", ev.state === "pre" ? "vs" : "–");
      } else {
        score = el("span", "match__score", side.score);
      }
      line.append(team, score);
      row.append(line);
    }
    return row;
  }

  // ---- panel --------------------------------------------------------------
  const panel = document.createElement("section");
  panel.className = "sports-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Live Sports");

  const bar = el("div", "sports-bar");
  const home = el("button", "secondary-button", "← Home");
  home.type = "button";
  const barTitle = el("strong", null, "Live Sports");
  const stamp = el("span", "sports-stamp", "");
  const refresh = el("button", "sports-refresh", "↻ Refresh");
  refresh.type = "button";
  refresh.setAttribute("aria-label", "Refresh scores");
  bar.append(home, barTitle, stamp, refresh);

  const tabs = el("div", "sports-tabs");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Competitions");

  const dates = el("div", "sports-dates");

  const body = el("div", "sports-body");
  body.setAttribute("aria-live", "polite");

  panel.append(bar, tabs, dates, body);
  document.body.append(panel);

  const saved = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {};
    } catch {
      return {};
    }
  })();
  let leagueSlug = LEAGUES.some((l) => l.slug === saved.league) ? saved.league : LEAGUES[0].slug;
  let dayOffset = Number.isInteger(saved.offset) && Math.abs(saved.offset) <= 7 ? saved.offset : 0;
  let controller = null;
  let timer = null;
  let previousOverflow = "";
  let firstPaint = true;

  const leagueLabel = (slug) => (LEAGUES.find((l) => l.slug === slug) || {}).label || slug;

  function save() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ league: leagueSlug, offset: dayOffset }));
    } catch {
      /* private mode: view just will not persist */
    }
  }

  function renderTabs() {
    tabs.replaceChildren();
    for (const l of LEAGUES) {
      const b = el("button", "sports-tab", l.label);
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(l.slug === leagueSlug));
      b.onclick = () => {
        if (leagueSlug === l.slug) return;
        leagueSlug = l.slug;
        save();
        renderTabs();
        load();
      };
      tabs.append(b);
    }
  }

  function renderDates() {
    dates.replaceChildren();
    for (const offset of [-1, 0, 1]) {
      const b = el("button", "sports-date", dateLabel(offset));
      b.type = "button";
      b.setAttribute("aria-pressed", String(offset === dayOffset));
      b.onclick = () => {
        if (dayOffset === offset) return;
        dayOffset = offset;
        save();
        renderDates();
        load();
      };
      dates.append(b);
    }
  }

  function statusScreen(heading, note, actionLabel, action) {
    const box = el("div", "sports-status");
    box.append(el("h1", null, heading), el("p", null, note));
    if (actionLabel) {
      const btn = el("button", "submit-button", actionLabel);
      btn.type = "button";
      btn.onclick = action;
      box.append(btn);
    }
    body.replaceChildren(box);
  }

  function render(data) {
    const groups = group(data.events);
    if (!groups.length) {
      statusScreen(
        "No matches here",
        `${data.leagueName || leagueLabel(leagueSlug)} has nothing scheduled for ${dateLabel(dayOffset).toLowerCase()}.`
      );
      return;
    }
    const frag = document.createDocumentFragment();
    for (const g of groups) {
      const section = el("section", "sports-group");
      const h = el("h2");
      if (g.live) h.append(el("span", "sports-dot"));
      h.append(document.createTextNode(g.title));
      section.append(h);
      for (const ev of g.items) section.append(matchRow(ev, data.leagueName || leagueLabel(leagueSlug)));
      frag.append(section);
    }
    frag.append(
      el("p", "sports-legend", `Scores provided by ESPN · times shown in your local timezone`)
    );
    body.replaceChildren(frag);
    stamp.textContent = `Updated ${new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }

  const viewKey = () => `${leagueSlug}|${dayOffset}`;

  async function load(manual) {
    if (controller) controller.abort();
    const own = new AbortController();
    controller = own;
    const requested = viewKey();
    const stale = body.dataset.view !== requested;

    if (manual) {
      refresh.disabled = true;
      refresh.classList.add("is-spinning");
    }
    if (firstPaint || stale) statusScreen("Loading…", "Fetching the latest scores.");

    try {
      const url = `${API}${leagueSlug}/scoreboard?dates=${dateKey(dayOffset)}`;
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      if (!response.ok) throw new Error(`Scoreboard HTTP ${response.status}`);
      const payload = await response.json();
      // A slower response for a league the user already left must not
      // overwrite the view they are looking at.
      if (requested !== viewKey()) return;
      render(parse(payload));
      body.dataset.view = requested;
      firstPaint = false;
    } catch (error) {
      if (own.signal.aborted || requested !== viewKey()) return;
      if (body.dataset.view === requested) {
        // Same view, refresh failed: keep what is on screen and say so.
        stamp.textContent = "Refresh failed";
        stamp.title = (error && error.message) || "";
      } else {
        statusScreen(
          "Could not load scores",
          (error && error.message) || "The scoreboard did not respond.",
          "Try again",
          () => load(true)
        );
        firstPaint = false;
      }
    } finally {
      // Only the request that still owns the panel may reset its chrome.
      if (controller === own) {
        controller = null;
        refresh.disabled = false;
        refresh.classList.remove("is-spinning");
        schedule();
      }
    }
  }

  function schedule() {
    clearTimeout(timer);
    if (panel.hidden) return;
    if (document.visibilityState !== "visible") return;
    timer = setTimeout(() => load(), REFRESH_MS);
  }

  function close() {
    clearTimeout(timer);
    if (controller) controller.abort();
    panel.hidden = true;
    document.body.style.overflow = previousOverflow;
    document.querySelector("#sports-home-open")?.focus({ preventScroll: true });
  }

  function open() {
    if (!panel.hidden) return;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.hidden = false;
    firstPaint = true;
    renderTabs();
    renderDates();
    load();
    refresh.focus({ preventScroll: true });
  }

  home.onclick = close;
  refresh.onclick = () => load(true);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !panel.hidden) load();
    else clearTimeout(timer);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) close();
  });
  for (const selector of ["#sports-open", "#sports-home-open"]) {
    const button = document.querySelector(selector);
    if (button) button.onclick = open;
  }
  const subtitle = document.querySelector("#sports-home-open small");
  if (subtitle) subtitle.textContent = "Live matches";
})();

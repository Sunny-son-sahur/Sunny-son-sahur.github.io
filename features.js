(() => {
const storage = {
  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

const root = document.documentElement;
const cards = [...document.querySelectorAll(".game-card")];
const search = document.querySelector("#game-search");
const favoritesFilter = document.querySelector("#favorites-filter");
const gameSort = document.querySelector("#game-sort");
const resultCount = document.querySelector("#result-count");
const libraryIntro = document.querySelector(".intro[aria-labelledby='featured-title']");
const libraryTitle = document.querySelector("#featured-title");
const infoOverlay = document.querySelector("#info-overlay");
const infoTitle = document.querySelector("#info-title");
const infoContent = document.querySelector("#info-content");
const settingsPanel = document.querySelector("#settings-panel");
const themeSelect = document.querySelector("#theme-select");
const cardSize = document.querySelector("#card-size");
const timezoneSelect = document.querySelector("#timezone-select");
const detectedTimezone = document.querySelector("#detected-timezone");
const accentColor = document.querySelector("#accent-color");
const backgroundColor = document.querySelector("#background-color");
const backgroundImageFile = document.querySelector("#background-image-file");
const backgroundImageStatus = document.querySelector("#background-image-status");
const backgroundStyle = document.querySelector("#background-style");
const displaySettings = {
  "show-menu-time": ".menu-time",
  "show-game-time": ".game-time"
};
const loader = document.querySelector("#game-loader");
const player = document.querySelector("#game-player");

let favorites = new Set(storage.read("sg-favorites", []));
let favoritesOnly = false;
let communityRatings = {};
let communityPlays = {};
const gameGrid = document.querySelector(".game-grid");
const originalOrder = new Map(cards.map((card, index) => [card, index]));
const categories = {
  "/crossy-road/": "arcade",
  "/how-to-fish/": "simulation",
  "/happy-wheels/": "action",
  "/table-tennis-world-tour/": "sports",
  "/skate-3/": "sports",
  "/snow-rider-3d/": "racing",
  "/mountain-bike-racer/": "racing",
  "/stickman-golf/": "sports",
  "/cookie-clicker/": "simulation",
  "/1v1-lol/": "multiplayer",
  "/dune/": "arcade",
  "/doge-miner/": "simulation",
  "/rooftop-snipers/": "action",
  "/house-painter/": "puzzle",
  "/tap-tap-shots/": "sports",
  "/blocky-puzzle/": "puzzle",
  "/backrooms/": "action",
  "/drift-king/": "racing",
  "/granny/": "action",
  "/president-simulator/": "simulation",
  "/pac-man/": "arcade",
  "/8-ball-pool-billiard/": "sports",
  "/flappy-bird/": "arcade",
  "/stickman-parkour/": "action",
  "/mini-golf/": "sports",
  "/plants-vs-zombies/": "action",
  "/fast-food-rush/": "simulation",
  "/football-legends/": "sports",
  "/minecraft-1-20-6/": "simulation",
  "/gun-spin/": "arcade",
  "/golf-orbit/": "sports",
  "/snek-io/": "arcade",
  "/super-liquid-soccer/": "sports",
  "/moto-x3m/": "racing",
  "/drift-hunters-pro/": "racing",
  "/uno/": "puzzle",
  "/wheelie-bike/": "arcade",
  "/ragdoll-archers/": "action",
  "/basket-bros/": "sports",
  "/thorns-and-ballons/": "puzzle",
  "/2d-fortnite/": "action",
  "/worldguessr/": "puzzle",
  "/among-us/": "multiplayer",
  "/funny-shooter-2/": "action",
  "/baseball-bros/": "sports",
  "/bouncy-basketball/": "sports", "/basketball-stars/": "sports", "/basket-random/": "sports",
  "/polytrack/": "driving", "/drift-boss/": "driving", "/escape-road/": "driving", "/drift-hunters/": "driving",
  "/subway-surfers/": "action", "/slope/": "action",
  "/project-sand/": "simulation", "/monkey-mart/": "simulation", "/bitlife/": "simulation", "/retro-bowl/": "sports", "/clash-of-vikings/": "strategy", "/geometry-dash/": "platformer"
};

const newGames = new Set(window.simpleGamesRelease?.newGames || []);

// Games from games-catalog.js carry their own category; without this merge
// every one of them would fall through to the "action" default below.
Object.assign(categories, window.__catalogCategories || {});

cards.forEach((card) => {
  const link = card.querySelector("a[href]");
  const path = sitePath(link.href);
  const name = card.querySelector("h2")?.textContent.trim() || "Game";
  card.dataset.path = path;
  card.dataset.name = name.toLowerCase();
  card.dataset.category = categories[path] || "action";

  const favorite = document.createElement("button");
  favorite.className = "favorite-button";
  favorite.type = "button";
  favorite.setAttribute("aria-label", `Favorite ${name}`);
  favorite.setAttribute("aria-pressed", favorites.has(path) ? "true" : "false");
  favorite.textContent = favorites.has(path) ? "★" : "☆";
  favorite.addEventListener("click", () => {
    favorites.has(path) ? favorites.delete(path) : favorites.add(path);
    storage.write("sg-favorites", [...favorites]);
    favorite.setAttribute("aria-pressed", favorites.has(path) ? "true" : "false");
    favorite.textContent = favorites.has(path) ? "★" : "☆";
    filterGames();
  });
  card.prepend(favorite);

});

function filterGames() {
  const query = search.value.trim().toLowerCase();
  const category = gameSort.value.startsWith("category:") ? gameSort.value.split(":")[1] : "";
  let visible = 0;
  cards.forEach((card) => {
    const show = card.dataset.name.includes(query) && (!favoritesOnly || favorites.has(card.dataset.path)) && (!category || card.dataset.category === category);
    card.hidden = !show;
    if (show) visible += 1;
  });
  resultCount.textContent = `${visible} game${visible === 1 ? "" : "s"}`;
}

function sortGames() {
  const mode = gameSort.value;
  const sorted = [...cards].sort((a, b) => {
    if (mode === "az") return a.dataset.name.localeCompare(b.dataset.name);
    if (mode === "za") return b.dataset.name.localeCompare(a.dataset.name);
    if (mode === "newest") return Number(newGames.has(b.dataset.path)) - Number(newGames.has(a.dataset.path)) || originalOrder.get(a) - originalOrder.get(b);
    if (mode === "most-played") return (communityPlays[b.dataset.path] || 0) - (communityPlays[a.dataset.path] || 0) || a.dataset.name.localeCompare(b.dataset.name);
    if (mode === "top-rated") return (communityRatings[b.dataset.path] || 0) - (communityRatings[a.dataset.path] || 0) || a.dataset.name.localeCompare(b.dataset.name);
    return originalOrder.get(a) - originalOrder.get(b);
  });
  sorted.forEach((card) => gameGrid.append(card));
  filterGames();
}

search?.addEventListener("input", filterGames);
gameSort?.addEventListener("change", sortGames);
window.addEventListener("simplegames:community-data", (event) => {
  communityRatings = event.detail.ratings || {};
  communityPlays = event.detail.plays || {};
  if (["most-played", "top-rated"].includes(gameSort.value)) sortGames();
});
favoritesFilter?.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  favoritesFilter.setAttribute("aria-pressed", String(favoritesOnly));
  favoritesFilter.textContent = favoritesOnly ? "← Back to games" : "☆ Favorites";
  libraryTitle.textContent = favoritesOnly ? "Favorites" : "Games";
  libraryIntro.classList.toggle("favorites-view", favoritesOnly);
  filterGames();
});
document.querySelector(".dashboard-shortcuts")?.addEventListener("click",(event)=>{
  const action=event.target.closest("[data-dashboard-action]")?.dataset.dashboardAction;
  if(!action)return;
  if(action==="games")openLibrary();
  if(action==="favorites"){if(!favoritesOnly)favoritesFilter.click();openLibrary()}
  if(action==="account"){document.querySelector("#account-open")?.click();document.querySelector('[data-social-view="friends"]')?.click()}
  if(action==="ai")document.querySelector("#ai-panel").hidden=false;
  if(action==="servers")document.querySelector("#servers-open")?.click();
  if(action==="leaderboard"){document.querySelector("#account-open")?.click();setTimeout(()=>document.querySelector('[data-social-view="leaderboard"]')?.click(),0)}
  if(action==="settings")document.querySelector("#settings-open")?.click();
});

const heroSearch=document.querySelector("#hero-game-search");
const librarySections=[document.querySelector("#game-library"),document.querySelector(".library-tools"),document.querySelector(".game-grid")];
function openLibrary(){librarySections.forEach(section=>{if(section)section.hidden=false});document.querySelector("#game-library")?.scrollIntoView({behavior:"smooth"})}
document.querySelector("#games-open")?.addEventListener("click",event=>{event.preventDefault();openLibrary()});
heroSearch?.addEventListener("input",()=>{search.value=heroSearch.value;search.dispatchEvent(new Event("input"));if(heroSearch.value.trim())openLibrary()});
search?.addEventListener("input",()=>{if(heroSearch)heroSearch.value=search.value});
heroSearch?.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();openLibrary()}});

function goHome(event) {
  event.preventDefault();
  librarySections.forEach(section=>{if(section)section.hidden=true});
  search.value="";
  if(heroSearch)heroSearch.value="";
  filterGames();
  document.querySelectorAll("#info-overlay,#ai-panel,#server-panel,#settings-panel,#social-panel,#support-panel").forEach(panel=>panel.hidden=true);
  document.querySelectorAll(".server-dialog").forEach(panel=>panel.hidden=true);
  if(!document.querySelector("#game-overlay").hidden)document.querySelector("#game-close")?.click();
  document.body.classList.remove("game-is-open");
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelector("#home-link")?.addEventListener("click",goHome);
document.querySelector(".brand")?.addEventListener("click",goHome);
const infoHome=document.querySelector("#info-close");
if(infoHome){infoHome.textContent="← Home";infoHome.addEventListener("click",goHome)}
for(const selector of ["#ai-panel .settings-heading","#server-panel .server-topbar","#settings-panel .settings-heading","#social-panel .settings-heading"]){
  const heading=document.querySelector(selector);
  if(!heading)continue;
  const home=document.createElement("button");
  home.type="button";
  home.className="panel-home-button";
  home.textContent="← Home";
  home.addEventListener("click",goHome);
  heading.prepend(home);
}
filterGames();

function applyTheme(choice) {
  const effective = choice === "system"
    ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : choice;
  root.dataset.theme = effective;
  const themeIcon = document.querySelector("#theme-toggle .rail-icon");
  if (themeIcon) themeIcon.textContent = effective === "dark" ? "☀" : "☾";
}

const savedTheme = storage.read("sg-theme", "dark");
themeSelect.value = savedTheme;
applyTheme(savedTheme);
document.querySelector("#theme-toggle")?.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  themeSelect.value = next;
  storage.write("sg-theme", next);
  applyTheme(next);
});
themeSelect?.addEventListener("change", () => {
  storage.write("sg-theme", themeSelect.value);
  applyTheme(themeSelect.value);
});

const savedSize = storage.read("sg-card-size", "normal");
cardSize.value = savedSize;
root.dataset.cardSize = savedSize;
cardSize?.addEventListener("change", () => {
  root.dataset.cardSize = cardSize.value;
  storage.write("sg-card-size", cardSize.value);
});

const automaticTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local timezone";
detectedTimezone.textContent = `Detected automatically: ${automaticTimezone}`;
const timezoneChoices = typeof Intl.supportedValuesOf === "function"
  ? Intl.supportedValuesOf("timeZone")
  : ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "UTC"];
timezoneSelect.add(new Option(`Automatic (${automaticTimezone})`, "auto"));
timezoneChoices.forEach((zone) => timezoneSelect.add(new Option(zone.replaceAll("_", " "), zone)));
timezoneSelect.value = storage.read("sg-timezone", "auto");
timezoneSelect.addEventListener("change", () => {
  storage.write("sg-timezone", timezoneSelect.value);
  dispatchEvent(new Event("simplegames:timezone"));
});

function applyDisplaySettings() {
  Object.entries(displaySettings).forEach(([id, selector]) => {
    const control = document.querySelector(`#${id}`);
    const visible = storage.read(`sg-${id}`, true);
    control.checked = visible;
    document.querySelectorAll(selector).forEach((element) => element.classList.toggle("user-hidden", !visible));
  });
}
Object.keys(displaySettings).forEach((id) => {
  document.querySelector(`#${id}`)?.addEventListener("change", (event) => {
    storage.write(`sg-${id}`, event.target.checked);
    applyDisplaySettings();
  });
});
applyDisplaySettings();

function applyAppearance() {
  let accent = storage.read("sg-accent", "#153a63");
  let background = storage.read("sg-background", "#050608");
  if (background === "#202225") { background = "#050608"; storage.write("sg-background", background); }
  const image = storage.read("sg-background-image", "");
  const style = storage.read("sg-background-style", "cover");
  accentColor.value = accent;
  backgroundColor.value = background;
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--background", background);
  root.style.setProperty("--custom-background-image", image ? `url("${image.replaceAll('"', '%22')}")` : "none");
  root.style.setProperty("--custom-background-size", style === "repeat" ? "auto" : style);
  root.style.setProperty("--custom-background-repeat", style === "repeat" ? "repeat" : "no-repeat");
}

accentColor.addEventListener("input", () => { storage.write("sg-accent", accentColor.value); applyAppearance(); });
accentColor.addEventListener("change", () => { storage.write("sg-accent", accentColor.value); applyAppearance(); });
backgroundColor.addEventListener("input", () => { storage.write("sg-background", backgroundColor.value); applyAppearance(); });
backgroundImageFile?.addEventListener("change", () => {
  const file = backgroundImageFile.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const picture = new Image();
    picture.addEventListener("load", () => {
      const maxWidth = 1920;
      const maxHeight = 1080;
      const scale = Math.min(1, maxWidth / picture.width, maxHeight / picture.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(picture.width * scale));
      canvas.height = Math.max(1, Math.round(picture.height * scale));
      canvas.getContext("2d").drawImage(picture, 0, 0, canvas.width, canvas.height);
      try {
        localStorage.setItem("sg-background-image", JSON.stringify(canvas.toDataURL("image/webp", 0.82)));
        applyAppearance();
      } catch {
        backgroundImageStatus.textContent = "That image is too large. Try a smaller one.";
      }
    });
    picture.src = reader.result;
  });
  reader.readAsDataURL(file);
});
document.querySelector("#remove-background")?.addEventListener("click", () => {
  localStorage.removeItem("sg-background-image");
  backgroundImageFile.value = "";
  applyAppearance();
});
backgroundStyle?.addEventListener("change", () => { storage.write("sg-background-style", backgroundStyle.value); applyAppearance(); });
applyAppearance();

function openSettings() {
  settingsPanel.hidden = false;
  document.querySelector("#settings-close").focus();
}
function closeSettings() { settingsPanel.hidden = true; }
document.querySelector("#settings-open")?.addEventListener("click", openSettings);
document.querySelector("#settings-close")?.addEventListener("click", closeSettings);
settingsPanel?.addEventListener("click", (event) => { if (event.target === settingsPanel) closeSettings(); });
document.querySelector("#reset-settings")?.addEventListener("click", () => {
  ["sg-theme", "sg-card-size", "sg-favorites", "sg-timezone", "sg-accent", "sg-background", "sg-background-image", "sg-background-style", "sg-show-menu-time", "sg-show-game-time"].forEach((key) => localStorage.removeItem(key));
  const defaults={"sg-theme":"dark","sg-card-size":"normal","sg-timezone":"auto","sg-accent":"#153a63","sg-background":"#000000","sg-background-image":"","sg-background-style":"cover","sg-show-menu-time":true,"sg-show-game-time":true,"sg-click-sound":"soft","sg-message-popups":true,"sg-server-notifications":"pings","sg-sidebar-closed":false};
  Object.entries(defaults).forEach(([key,value])=>storage.write(key,value));
  applyAppearance();applyTheme("dark");themeSelect.value="dark";cardSize.value="normal";root.dataset.cardSize="normal";timezoneSelect.value="auto";applyDisplaySettings();dispatchEvent(new Event("simplegames:timezone"));
  document.dispatchEvent(new Event("simplegames:settings-reset"));
});

window.addEventListener("simplegames:play", () => {
  loader.hidden = false;
});
player?.addEventListener("load", () => { loader.hidden = true; });

const updateVersion = window.simpleGamesRelease?.version || "2026-10-06-community-invites";
const updateDot = document.querySelector("#update-dot");
document.addEventListener('click',event=>{if(event.target.closest('[data-page="updates"]')){storage.write('sg-seen-update',updateVersion);updateDot.hidden=true;updateDot.style.display='none'}},true);
updateDot.hidden = storage.read("sg-seen-update", "") === updateVersion;
document.querySelector("[data-page='updates']")?.addEventListener("click", () => {
  storage.write("sg-seen-update", updateVersion);
  updateDot.hidden = true;
});

function formMarkup(type) {
  const isRequest = type === "request";
  return `<section class="intro"><h1>${isRequest ? "Request a game" : "Report a bug"}</h1></section>
    <form class="form-card" id="site-form" data-kind="${type}">
      <label class="form-field">Game name<input name="subject" required maxlength="100"></label>
      <label class="form-field">${isRequest ? "Why do you want this game?" : "What is wrong?"}<textarea name="details" required maxlength="1500"></textarea></label>
      <button class="submit-button" type="submit">Open GitHub request</button>
      <p class="result-count">This opens a pre-filled GitHub Issue so the site owner can see it.</p>
    </form>`;
}

document.querySelector(".header-right")?.addEventListener("click", (event) => {
  const link = event.target.closest("[data-form]");
  if (!link) return;
  event.preventDefault();
  const kind = link.dataset.form;
  infoTitle.textContent = kind === "request" ? "Game Request" : "Bug Report";
  infoContent.innerHTML = formMarkup(kind);
  infoOverlay.hidden = false;
  document.body.classList.add("game-is-open");
  infoContent.querySelector("input")?.focus();
});

infoContent?.addEventListener("submit", (event) => {
  const form = event.target.closest("#site-form");
  if (!form) return;
  event.preventDefault();
  const data = new FormData(form);
  const kind = form.dataset.kind;
  const subject = data.get("subject");
  const details = data.get("details");
  const title = kind === "request" ? `Game request: ${subject}` : `Bug report: ${subject}`;
  const body = `${kind === "request" ? "Why this game" : "What is wrong"}:\n${details}`;
  window.open(`https://github.com/vjaxxon/vjaxxon.github.io/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, "_blank", "noopener");
});

const menu = document.querySelector(".header-right");
const menuToggle = document.querySelector("#menu-toggle");
menuToggle?.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) {
    event.preventDefault();
    search.focus();
  }
  if (event.key.toLowerCase() === "f" && !/input|textarea|select/i.test(document.activeElement.tagName)) {
    favoritesFilter.click();
  }
  if (event.key === "Escape") closeSettings();
});
})();

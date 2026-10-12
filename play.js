(() => {
const games = {
  "/crossy-road/": "https://brainworxedu.github.io/games/crossy-road.html",
  "/how-to-fish/": "https://brainworxedu.github.io/games/how-to-fish.html",
  "/happy-wheels/": "https://brainworxedu.github.io/games/happy-wheels.html",
  "/table-tennis-world-tour/": "https://brainworxedu.github.io/games/table-tennis-world-tour.html",
  "/skate-3/": "https://brainworxedu.github.io/games/skate-3.html",
  "/tiny-fishing/": "/tiny-fishing/player.html",
  "/stickman-hook/": "/stickman-hook/player.html",
  "/soundboard/": "/soundboard/player.html",
  "/raft/": "/raft/player.html",
  "/jelly-drift/": "/jelly-drift/player.html",
  "/speed-stars/": "/speed-stars/player.html",
  "/rise-higher/": "/rise-higher/player.html",
  "/fluid-simulation/": "/fluid-simulation/player.html",
  "/stack/": "/stack/player.html",
  "/candy-crush/": "/candy-crush/player.html",
  "/boxing-physics-2/": "/boxing-physics-2/player.html",
  "/fortzone-battle-royale/": "/fortzone-battle-royale/player.html",
  "/chess-classic/": "/chess-classic/player.html",
  "/buildnow-gg/": "/buildnow-gg/player.html",
  "/blade-ball/": "/blade-ball/player.html",
  "/blocky-snakes/": "/blocky-snakes/player.html",
  "/super-star-car/": "/super-star-car/player.html",
  "/hammer-2/": "/hammer-2/player.html",
  "/schoolboy-runaway/": "/schoolboy-runaway/player.html",
  "/lethal-ape/": "/lethal-ape/player.html",
  "/brawl-simulator-3d/": "/brawl-simulator-3d/player.html",
  "/wordle/": "/wordle/player.html",
  "/tung-sahur-horror/": "/tung-sahur-horror/player.html",
  "/elastic-man/": "/elastic-man/player.html",
  "/stickman-golf/": "/stickman-golf/player.html",
  "/mountain-bike-racer/": "/mountain-bike-racer/player.html",
  "/gorilla-tag/": "/gorilla-tag/player.html",
  "/geometry-dash/": "https://brainworxedu.github.io/games/geometry-dash.html",
  "/five-nights-at-epsteins/": "/five-nights-at-epsteins/player.html",
  "/clash-of-vikings/": "/clash-of-vikings/player.html",
  "/snow-rider-3d/": "https://classroomlesson.github.io/basic-ruffle-player/html/snow_rider_3d/index.html",
  "/cookie-clicker/": "https://classroomlesson.github.io/basic-ruffle-player/html/cookie_clicker/index.html",
  "/1v1-lol/": "https://classroomlesson.github.io/basic-ruffle-player/html/1v1lol/index.html",
  "/dune/": "https://classroomlesson.github.io/basic-ruffle-player/html/dune/index.html",
  "/doge-miner/": "https://classroomlesson.github.io/basic-ruffle-player/html/doge_miner/index.html",
  "/rooftop-snipers/": "https://classroomlesson.github.io/basic-ruffle-player/html/rooftop_snipers/index.html",
  "/house-painter/": "https://db2.duckmath.org/2023/construct/238/house-painter/index.html",
  "/tap-tap-shots/": "https://db2.duckmath.org/2023/q/1/tap-tap-shots/index.html",
  "/blocky-puzzle/": "https://classroomlesson.github.io/basic-ruffle-player/html/blocky_puzzle/index.html",
  "/backrooms/": "https://classroomlesson.github.io/basic-ruffle-player/html/backroomsv1.5/index.html",
  "/drift-king/": "https://a.luminsdk.com/g/1791423119-SkwqEfn_A2P2NEAzBMsZJhgpM15P6uTi4KoA1RpnlF0/selenite/king/",
  "/granny/": "https://classroomlesson.github.io/basic-ruffle-player/html/granny/index.html",
  "/president-simulator/": "https://classroomlesson.github.io/basic-ruffle-player/html/president_simulator/index.html",
  "/pac-man/": "https://classroomlesson.github.io/basic-ruffle-player/html/pac_man/index.html",
  "/8-ball-pool-billiard/": "https://db2.duckmath.org/2022/unity3/8-ball-pool-billiard/index.html",
  "/flappy-bird/": "https://classroomlesson.github.io/basic-ruffle-player/html/flappy_bird/index.html",
  "/stickman-parkour/": "https://classroomlesson.github.io/basic-ruffle-player/html/stickman_parkour/index.html",
  "/mini-golf/": "https://classroomlesson.github.io/basic-ruffle-player/html/mini_golf/index.html",
  "/plants-vs-zombies/": "https://classroomlesson.github.io/basic-ruffle-player/html/pvz/index.html",
  "/fast-food-rush/": "https://db2.duckmath.org/2025/unity/fast-food-rush/index.html",
  "/football-legends/": "https://ubg005.gitlab.io/football-legends/",
  "/snek-io/": "https://db2.duckmath.org/2026/more/snek-io/pre.html",
  "/super-liquid-soccer/": "https://classroomlesson.github.io/basic-ruffle-player/html/super_liquid_soccer/index.html",
  "/moto-x3m/": "https://db2.duckmath.org/2024/gm/moto-x3m/index.html",
  "/drift-hunters-pro/": "https://db2.duckmath.org/2023/unity/drift-hunters-pro/pre.html",
  "/uno/": "https://classroomlesson.github.io/basic-ruffle-player/html/uno/index.html",
  "/wheelie-bike/": "https://classroomlesson.github.io/basic-ruffle-player/html/wheelie_bike/index.html",
  "/ragdoll-archers/": "https://classroomlesson.github.io/basic-ruffle-player/html/ragdoll_archers/index.html",
  "/basket-bros/": "https://classroomlesson.github.io/basic-ruffle-player/html/basket_bros/index.html",
  "/thorns-and-ballons/": "https://classroomlesson.github.io/basic-ruffle-player/html/thorns_and_ballons/index.html",
  "/2d-fortnite/": "https://db2.duckmath.org/2025/more/fort-battle-royale/pre.html",
  "/worldguessr/": "https://db2.duckmath.org/2026/more/worldguessr/pre.html",
  "/among-us/": "https://brainworxedu.github.io/games/among-us.html",
  "/funny-shooter-2/": "https://classroomlesson.github.io/basic-ruffle-player/html/funny_shooter_2/index.html",
  "/baseball-bros/": "https://classroomlesson.github.io/basic-ruffle-player/html/baseball_bros/index.html",
  "/golf-orbit/": "https://classroomlesson.github.io/basic-ruffle-player/html/golf_orbit/index.html",
  "/gun-spin/": "https://classroomlesson.github.io/basic-ruffle-player/html/gun_spin/index.html",
  "/minecraft-1-20-6/": "https://brainworxedu.github.io/games/minecraft-1-20-6.html",
  "/bouncy-basketball/": "https://trueedu20.github.io/g177/class-282",
  "/polytrack/": "https://poly-track-online.github.io/polytrack/",
  "/drift-boss/": "https://driftbossonline.github.io/file/",
  "/escape-road/": "https://escape-road.global.ssl.fastly.net/",
  "/monkey-mart/": "https://gaming-escape.github.io/public/assets/games/monkey-mart/",
  "/basketball-stars/": "https://gaming-escape.github.io/public/assets/games/basketball-stars/",
  "/drift-hunters/": "https://unblokedgames.github.io/projects/drift-hunters/index.html",
  "/basket-random/": "https://2048taylorswift.github.io/basketrandom/",
  "/subway-surfers/": "https://unblokedgames.github.io/subway-surfers.html",
  "/bitlife/": "https://unblokedgames.github.io/projects/bitlife/index.html",
  "/project-sand/": "https://unblokedgames.github.io/projects/project-sand/index.html",
  "/slope/": "https://unblokedgames.github.io/projects/slope/index.html",
  "/retro-bowl/": "https://unblokedgames.github.io/projects/retro-bowl/index.html"
};

const overlay = document.querySelector("#game-overlay");
const player = document.querySelector("#game-player");
document.querySelector('#game-fullscreen')?.addEventListener('click', async () => {
  try { if(document.fullscreenElement)await document.exitFullscreen();else await overlay.requestFullscreen(); }
  catch { loaderStatus.textContent='Fullscreen is unavailable in this browser.'; }
});
const title = document.querySelector("#game-title");
const closeButton = document.querySelector("#game-close");
const infoOverlay = document.querySelector("#info-overlay");
const infoTitle = document.querySelector("#info-title");
const infoContent = document.querySelector("#info-content");
const infoClose = document.querySelector("#info-close");
const loader = document.querySelector("#game-loader");
const loaderStatus = document.querySelector("#game-loader-status");
const loaderSpinner = document.querySelector("#game-loader-spinner");
const loaderActions = document.querySelector("#loader-actions");
const loaderSound = document.querySelector("#loader-sound");
let loadTimer = 0;
let currentGameUrl = "";
let geometryAcknowledged = false;
const geometryNotice = document.createElement('div');
geometryNotice.id = 'geometry-loading-notice';
geometryNotice.hidden = true;
geometryNotice.setAttribute('role','dialog');
geometryNotice.setAttribute('aria-modal','true');
geometryNotice.setAttribute('aria-labelledby','geometry-loading-message');
geometryNotice.innerHTML = '<div><p id="geometry-loading-message">When you load in please click the loading button on the black screen, this is how the game loads idk why.</p><button type="button">OK</button></div>';
overlay.append(geometryNotice);
const geometryNoticeStyle=document.createElement('style');
geometryNoticeStyle.textContent='#geometry-loading-notice{position:absolute;inset:0;z-index:20;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}#geometry-loading-notice[hidden]{display:none}#geometry-loading-notice>div{max-width:520px;text-align:center;font:inherit;line-height:1.7}#geometry-loading-notice button{margin-top:18px;background:#000;color:#fff;border:1px solid #343943;border-radius:8px;padding:12px 36px;font:inherit;cursor:pointer}#geometry-loading-notice button:hover{background:#151515}';
document.head.append(geometryNoticeStyle);
let soundOn = true, soundTimer = 0, audioContext;
function loadingTone(frequency=360){if(!soundOn)return;try{audioContext??=new AudioContext();const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.035,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.12);oscillator.connect(gain).connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+.13)}catch{}}
function startLoadingSound(){clearInterval(soundTimer);loadingTone(330);soundTimer=setInterval(()=>loadingTone(430),1100)}
function stopLoadingSound(done=false){clearInterval(soundTimer);soundTimer=0;if(done)loadingTone(620)}
loaderSound?.addEventListener("click",()=>{soundOn=!soundOn;loaderSound.setAttribute("aria-pressed",String(soundOn));loaderSound.textContent=soundOn?"🔊":"🔇";loaderSound.setAttribute("aria-label",soundOn?"Mute loading sound":"Turn on loading sound");if(soundOn)startLoadingSound();else stopLoadingSound()});

if (window.location.pathname.endsWith("/index.html")) {
  history.replaceState(null, "", window.SITE_BASE_PATH || "/");
}

document.querySelector(".game-grid")?.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;

  const path = sitePath(link.href);
  const gameUrl = games[path];
  if (!gameUrl) return;

  event.preventDefault();
  const cardTitle = link.closest(".game-card")?.querySelector("h2")?.textContent?.trim() || "Game";
  title.textContent = cardTitle;
  player.title = cardTitle;
  if(path==='/geometry-dash/'&&!geometryAcknowledged){
    clearTimeout(loadTimer);stopLoadingSound();player.src='about:blank';loader.hidden=true;
    overlay.hidden=false;document.body.classList.add('game-is-open');geometryNotice.hidden=false;
    geometryNotice.querySelector('button').onclick=()=>{geometryAcknowledged=true;geometryNotice.hidden=true;link.click()};
    geometryNotice.querySelector('button').focus();return;
  }
  geometryAcknowledged=false;geometryNotice.hidden=true;
  currentGameUrl = gameUrl;
  player.src = gameUrl;
  loaderStatus.textContent = "Loading game…";
  loaderSpinner.hidden = false;
  loaderActions.hidden = true;
  loader.hidden = false;
  startLoadingSound();
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => {
    stopLoadingSound();
    loader.hidden = false;
    loaderSpinner.hidden = true;
    loaderStatus.textContent = "This game is taking too long to load. It may be blocked or temporarily unavailable.";
    loaderActions.hidden = false;
  }, 15000);
  overlay.hidden = false;
  document.body.classList.add("game-is-open");
  window.dispatchEvent(new CustomEvent("simplegames:play", { detail: { path, title: cardTitle } }));
  closeButton.focus();
});

function closeGame() {
  geometryAcknowledged=false;geometryNotice.hidden=true;geometryNotice.querySelector('button').onclick=null;
  if(document.fullscreenElement===overlay)document.exitFullscreen().catch(()=>{});
  clearTimeout(loadTimer);
  stopLoadingSound();
  overlay.hidden = true;
  player.src = "about:blank";
  document.querySelector("#game-loader").hidden = true;
  document.body.classList.remove("game-is-open");
  window.dispatchEvent(new CustomEvent("simplegames:stop-playing"));
}

player.addEventListener("load", () => { if(player.getAttribute("src")==="about:blank")return;clearTimeout(loadTimer); loader.hidden = true; stopLoadingSound(true); });
player.addEventListener("error",()=>{clearTimeout(loadTimer);stopLoadingSound();loader.hidden=false;loaderSpinner.hidden=true;loaderStatus.textContent="This game couldn’t load. Try again or return home.";loaderActions.hidden=false});
document.querySelector("#game-retry")?.addEventListener("click", () => {
  loaderStatus.textContent = "Trying again…";
  startLoadingSound();
  loaderSpinner.hidden = false;
  loaderActions.hidden = true;
  player.src = "about:blank";
  setTimeout(() => { loader.hidden = false; player.src = currentGameUrl; loadTimer = setTimeout(() => { loader.hidden = false; loaderSpinner.hidden = true; loaderStatus.textContent = "The game still could not load. Try again later."; loaderActions.hidden = false; }, 15000); }, 100);
});
document.querySelector("#game-error-close")?.addEventListener("click",()=>{closeGame();document.querySelector("#home-link")?.click()});

const pages = {
  updates: {
    title: "Update Log",
    content: window.simpleGamesRelease.content
  },
  announcements: {
    title: "Announcements",
    content: '<div class="update-entry"><h2>Latest announcements are below!</h2><p>I hope you guys are enjoying the website, much more is to come!</p></div>'
  }
};

document.querySelector(".header-right")?.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;
  const page = pages[link.dataset.page];
  if (!page) return;

  event.preventDefault();
  infoTitle.textContent = page.title;
  infoContent.innerHTML = page.content;
  infoOverlay.hidden = false;
  document.body.classList.add("game-is-open");
  infoClose.focus();
});

function closeInfo() {
  infoOverlay.hidden = true;
  document.body.classList.remove("game-is-open");
}

infoClose?.addEventListener("click", closeInfo);

closeButton?.addEventListener("click", closeGame);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!overlay.hidden) closeGame();
  if (!infoOverlay.hidden) closeInfo();
});
})();

(() => {
const clocks = document.querySelectorAll('.local-time');

let favicon = document.querySelector('link[rel="icon"]');
if (!favicon) {
  favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.type = 'image/svg+xml';
  favicon.href = 'assets/favicon.svg';
  document.head.appendChild(favicon);
}

function updateClocks() {
  const now = new Date();
  let savedZone = "auto";
  try { savedZone = JSON.parse(localStorage.getItem("sg-timezone")) || "auto"; } catch {}
  const options = { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };
  if (savedZone !== "auto") options.timeZone = savedZone;
  const time = now.toLocaleTimeString([], options);
  clocks.forEach((clock) => {
    clock.textContent = time;
    clock.dateTime = now.toISOString();
  });
}

updateClocks();
setInterval(updateClocks, 1000);
addEventListener("simplegames:timezone", updateClocks);
})();

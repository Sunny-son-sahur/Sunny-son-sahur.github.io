(() => {
  const loader = document.querySelector("#startup-loader");
  const bar = document.querySelector("#startup-progress-bar");
  const status = document.querySelector("#startup-status");
  const enter = document.querySelector("#startup-enter");
  if (!loader) return;

  document.body.classList.add("startup-is-open");
  let progress = 0;
  const timer = setInterval(() => {
    progress = Math.min(100, progress + Math.ceil(Math.random() * 16));
    bar.style.width = `${progress}%`;
    status.textContent = progress < 100 ? "Loading" : "Ready";
    if (progress === 100) {
      clearInterval(timer);
      status.textContent = "Ready";
      enter.disabled = false;
      enter.textContent = "Enter";
      enter.focus();
    }
  }, 70);

  function tone(frequency, start, duration) {
    try {
      const context = tone.context ||= new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.055, context.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + duration);
    } catch {}
  }

  function enterSite() {
    if (enter.disabled) return;
    tone(420, 0, .14);
    tone(630, .1, .18);
    loader.classList.add("leaving");
    setTimeout(() => {
      loader.remove();
      document.body.classList.remove("startup-is-open");
    }, 320);
  }

  enter.addEventListener("click", enterSite);
  document.addEventListener("keydown", event => {
    if (event.key === "Enter" && !enter.disabled) enterSite();
  });
})();

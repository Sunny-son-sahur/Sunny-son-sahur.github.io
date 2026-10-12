(() => {
  const panel = document.createElement('section');
  panel.className = 'movies-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Movies');
  const style = document.createElement('style');
  style.textContent = '.movies-panel{position:fixed;inset:0;background:#000;z-index:550;display:flex;flex-direction:column}.movies-panel[hidden]{display:none}.movies-bar{display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid #222;background:#000;color:#fff}.movies-bar strong{margin-right:auto}.movies-note{margin:0;padding:8px 18px;color:#aaa;font-size:12px;background:#000}.movies-frame{width:100%;flex:1;min-height:0;border:0;background:#000}';
  document.head.append(style);
  const bar = document.createElement('div');
  bar.className = 'movies-bar';
  const home = document.createElement('button');
  home.className = 'secondary-button';
  home.textContent = '← Home';
  const title = document.createElement('strong');
  title.textContent = 'Movies';
  const retry = document.createElement('button');
  retry.className = 'secondary-button';
  retry.textContent = 'Reload';
  const note = document.createElement('p');
  note.className = 'movies-note';
  const frame = document.createElement('iframe');
  frame.className = 'movies-frame';
  frame.title = 'External movie website';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');
  frame.setAttribute('allow', 'fullscreen; encrypted-media');
  frame.allowFullscreen = true;
  const url = 'https://cinera.cc/';
  let timer, sessionOpen=false;
  function load() {
    clearTimeout(timer);
    note.textContent = 'Loading external movie website…';
    frame.src = url;
    window.dispatchEvent(new CustomEvent('simplegames:media-start',{detail:{title:'Watching a movie'}}));
    timer = setTimeout(() => {
      note.textContent = 'Taking a while? The provider may block embedded playback. Try Reload.';
    }, 15000);
  }
  frame.onload = () => {
    clearTimeout(timer);
    note.textContent = 'External provider · Playback depends on their site. Pop-up windows are blocked.';
  };
  frame.onerror = () => {
    clearTimeout(timer);
    note.textContent = 'The external website could not load. Try Reload.';
  };
  function close() {
    clearTimeout(timer);
    panel.hidden = true;
    sessionOpen=false;window.dispatchEvent(new Event('simplegames:media-stop'));
    frame.src = 'about:blank';
    document.querySelector('#home-link')?.click();
  }
  function open() { if(sessionOpen)return;sessionOpen=true;panel.hidden=false;load();home.focus(); }
  home.onclick = close;
  retry.onclick = load;
  document.querySelector('#movies-open').onclick = open;
  document.querySelector('#movies-home-open').onclick = open;
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) close();
  });
  bar.append(home, title, retry);
  panel.append(bar, note, frame);
  document.body.append(panel);
})();

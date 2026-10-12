(() => {
  const panel=document.createElement('section');
  panel.className='sports-panel';panel.hidden=true;panel.setAttribute('aria-label','Live Sports');
  const style=document.createElement('style');
  style.textContent='.sports-panel{position:fixed;inset:0;background:var(--background,#000);color:var(--text,#fff);z-index:550;display:flex;flex-direction:column}.sports-panel[hidden]{display:none}.sports-bar{display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid #222;flex-shrink:0}.sports-maintenance{flex:1;display:grid;place-content:center;text-align:center;padding:24px}.sports-maintenance h1{font-size:24px;margin:0 0 12px}.sports-maintenance p{color:#aaa;max-width:420px;line-height:1.6;margin:0}';
  document.head.append(style);
  const bar=document.createElement('div');bar.className='sports-bar';
  const home=document.createElement('button');home.type='button';home.className='secondary-button';home.textContent='← Home';
  const title=document.createElement('strong');title.textContent='Live Sports';
  const content=document.createElement('div');content.className='sports-maintenance';
  const heading=document.createElement('h1');heading.textContent='Under maintenance';
  const note=document.createElement('p');note.textContent='Live Sports is temporarily unavailable while we make improvements. Check back soon!';
  content.append(heading,note);bar.append(home,title);panel.append(bar,content);document.body.append(panel);
  let previousOverflow='';
  function close(){panel.hidden=true;document.body.style.overflow=previousOverflow;document.querySelector('#sports-home-open')?.focus({preventScroll:true})}
  function open(){if(!panel.hidden)return;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';panel.hidden=false;home.focus({preventScroll:true})}
  home.onclick=close;
  for(const selector of ['#sports-open','#sports-home-open']){const button=document.querySelector(selector);if(button)button.onclick=open}
  const subtitle=document.querySelector('#sports-home-open small');if(subtitle)subtitle.textContent='Under maintenance';
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)close()});
})();

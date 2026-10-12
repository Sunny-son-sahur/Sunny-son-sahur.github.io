(() => {
 const card=document.querySelector('.site-stats');if(!card)return;
 const status=document.querySelector('#site-stats-status'),dateLabel=document.querySelector('#site-stats-date');
 const values={online:document.querySelector('#stats-online'),peak:document.querySelector('#stats-peak'),total:document.querySelector('#stats-total')};
 const endpoint=window.simpleGamesStatsEndpoint,live=location.origin==='https://simplegames-lol.github.io';
 // A rejected origin never becomes valid by asking again. The previous build
 // retried forever, logging a failed fetch on every cycle while the card sat
 // on "Connecting…". One attempt decides it; then we stop calling out.
 const MAX_ATTEMPTS=1;
 let timer,inFlight=false,failures=0,stopped=false,id;
 try{id=localStorage.getItem('sg-stats-browser');if(!id){id=crypto.randomUUID();localStorage.setItem('sg-stats-browser',id)}}catch{id=crypto.randomUUID()}
 if(!endpoint){status.textContent='Setup needed';dateLabel.textContent='Connect the Cloudflare counter to enable live stats';return}
 function unavailable(message){
   stopped=true;clearTimeout(timer);
   card.classList.remove('is-live');
   Object.values(values).forEach(el=>el.textContent='—');
   status.textContent='Setup needed';status.title=message||'';
   dateLabel.textContent='Connect a stats endpoint allowed for this origin';
 }
 function schedule(){clearTimeout(timer);if(!stopped&&document.visibilityState==='visible')timer=setTimeout(sync,Math.min(300000,60000*2**failures))}
 // force: the first attempt runs even in a background tab. The old guard bailed
 // before the try/finally, so nothing rescheduled and the card never left
 // "Connecting…". One GET at load is cheap; refreshes still wait for visibility.
 async function sync(force){
  if(stopped||inFlight||(!force&&document.visibilityState!=='visible'))return;inFlight=true;
  try{
   const response=await fetch(endpoint,{method:live?'POST':'GET',...(live?{headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}:{}),cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Stats service HTTP '+response.status);
   const data=await response.json();
   if(!/^\d{4}-\d{2}-\d{2}$/.test(data.day)||!Object.keys(values).every(k=>Number.isSafeInteger(data[k])&&data[k]>=0)||data.peak<data.online||data.total<data.peak)throw Error('Invalid stats response');
   for(const [key,el]of Object.entries(values))el.textContent=data[key].toLocaleString();
   const date=new Date(data.day+'T12:00:00Z');
   const pretty=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(date);
   const abbreviation=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'short'}).formatToParts(date).find(p=>p.type==='timeZoneName').value;
   dateLabel.textContent='Today · '+pretty+' · Resets at midnight '+abbreviation;
   status.textContent=live?'Live global stats':'Preview · read only';status.title='';card.classList.toggle('is-live',live);failures=0;
  }catch(error){
   failures++;
   if(failures>=MAX_ATTEMPTS)unavailable(error.message);
   else{card.classList.remove('is-live');status.textContent='Stats unavailable';status.title=error.message;dateLabel.textContent='Stats unavailable · retrying automatically';Object.values(values).forEach(el=>el.textContent='—')}
  }
  finally{inFlight=false;schedule()}
 }
 document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(document.visibilityState==='visible')sync()});
 sync(true);
})();

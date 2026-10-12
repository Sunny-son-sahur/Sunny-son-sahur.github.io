(() => {
 const card=document.querySelector('.site-stats');if(!card)return;
 const status=document.querySelector('#site-stats-status'),dateLabel=document.querySelector('#site-stats-date');
 const values={online:document.querySelector('#stats-online'),peak:document.querySelector('#stats-peak'),total:document.querySelector('#stats-total')};
 const endpoint=window.simpleGamesStatsEndpoint,live=location.origin==='https://simplegames-lol.github.io';
 let timer,inFlight=false,failures=0,id;
 try{id=localStorage.getItem('sg-stats-browser');if(!id){id=crypto.randomUUID();localStorage.setItem('sg-stats-browser',id)}}catch{id=crypto.randomUUID()}
 if(!endpoint){status.textContent='Setup needed';dateLabel.textContent='Connect the Cloudflare counter to enable live stats';return}
 function schedule(){clearTimeout(timer);if(document.visibilityState==='visible')timer=setTimeout(sync,Math.min(300000,60000*2**failures))}
 async function sync(){
  if(inFlight||document.visibilityState!=='visible')return;inFlight=true;
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
  }catch(error){failures++;card.classList.remove('is-live');status.textContent='Stats unavailable';status.title=error.message;dateLabel.textContent='Stats unavailable · retrying automatically';Object.values(values).forEach(el=>el.textContent='—')}
  finally{inFlight=false;schedule()}
 }
 document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(document.visibilityState==='visible')sync()});
 sync();
})();

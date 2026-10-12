// Playtime tracking is separate from saving a game's own progress.
export function createPlaytimeTracker({now=()=>performance.now(),send,status=()=>{},maxGap=30000}) {
  let uid=null,session=null,active=true;
  const pending=new Map(),busy=new Set();
  function queue(id){if(!pending.has(id))pending.set(id,{milliseconds:0,opened:0,games:{}});return pending.get(id)}
  function settle(){
    if(!session)return;
    const end=now();
    const elapsed=Math.max(0,end-session.at);
    // A suspended browser must not turn sleep time into a giant catch-up.
    if(active&&session.uid&&elapsed<=maxGap)queue(session.uid).milliseconds+=elapsed;
    session.at=end;
  }
  function setUser(next){settle();uid=next;if(session){session.uid=next;session.at=now()}}
  function setActive(next){settle();active=!!next}
  function start(path){settle();session={uid,at:now()};if(uid){const q=queue(uid);q.opened++;q.games[path]=(q.games[path]||0)+1}}
  function stop(){settle();session=null;return flush()}
  async function flush(){
    settle();const id=uid;if(!id||busy.has(id))return;
    const q=queue(id),seconds=Math.floor(q.milliseconds/1000),opened=q.opened,games={...q.games};
    if(!seconds&&!opened)return;
    busy.add(id);status('syncing');
    try {
      await send(id,{seconds,opened,games});
      q.milliseconds-=seconds*1000;q.opened-=opened;
      for(const [key,count]of Object.entries(games)){q.games[key]-=count;if(!q.games[key])delete q.games[key]}
      status('saved');
    } catch(error){status('error',error)}
    finally {busy.delete(id)}
  }
  return {setUser,start,stop,flush,setActive,tick:settle};
}

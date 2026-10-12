// Web Locks are origin-wide, including separate windows of the same browser.
// Do not fall back to a racy localStorage lease: fail closed if unavailable.
export function createPlaytimeGate({locks,onActive}){
 let key=null,eligible=false,pending=false,release=null,generation=0;
 onActive(false);
 function unlock(){onActive(false);if(release){const finish=release;release=null;finish()}}
 async function attempt(){
  if(!locks||!key||!eligible||pending||release)return;
  const wanted=key,version=generation;pending=true;
  try{await locks.request('simplegames-playtime:'+wanted,{mode:'exclusive',ifAvailable:true},async lock=>{
   if(!lock||version!==generation||!eligible)return;
   await new Promise(resolve=>{release=resolve;onActive(true)});
  })}catch{onActive(false)}finally{pending=false}
 }
 function update(nextKey,nextEligible){
  nextEligible=!!nextEligible;
  if(key!==nextKey||eligible!==nextEligible){generation++;unlock();key=nextKey;eligible=nextEligible}
  void attempt();
 }
 return{update,dispose:()=>update(null,false),supported:!!locks};
}

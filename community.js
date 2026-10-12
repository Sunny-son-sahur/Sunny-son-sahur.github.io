import{getApp}from"https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import{collection,doc,getDoc,getFirestore,increment,onSnapshot,serverTimestamp,setDoc,updateDoc}from"https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import{createPlaytimeTracker}from'./playtime.js?v=2';
import{createPlaytimeGate}from'./playtime-gate.js?v=1';
import{eligiblePlaytime}from'./playtime-activity.js?v=2';

const auth=getAuth(getApp()),db=getFirestore(getApp()),$=s=>document.querySelector(s);
let currentUser=null,currentProfile=null,syncTimer=0,ratings=[];
const preferenceKeys=["sg-theme","sg-card-size","sg-timezone","sg-accent","sg-background","sg-background-image","sg-background-style","sg-show-menu-time","sg-show-game-time","sg-click-sound","sg-message-popups","sg-server-notifications","sg-sidebar-closed"];
const ratingPanel=document.createElement("section");
ratingPanel.className="settings-panel";ratingPanel.hidden=true;ratingPanel.innerHTML='<div class="settings-card"><div class="settings-heading"><h2 id="rating-title">Rate game</h2><button id="rating-close" type="button" aria-label="Close ratings">×</button></div><div class="rating-picker" id="rating-picker"></div><p class="social-status" id="rating-status"></p></div>';
document.body.append(ratingPanel);
$("#rating-close").onclick=()=>ratingPanel.hidden=true;
ratingPanel.onclick=e=>{if(e.target===ratingPanel)ratingPanel.hidden=true};

const gameCards=[...document.querySelectorAll(".game-card")];
let voterRequest=0;
async function openVoters(path,title){
  const request=++voterRequest;$("#rating-title").textContent=title+' ratings';$("#rating-picker").replaceChildren();const list=document.createElement('div');list.className='rating-voters';$("#rating-picker").append(list);ratingPanel.hidden=false;
  if(!currentUser){$("#rating-status").textContent='Log in to see who rated this game.';return}
  $("#rating-status").textContent='Loading voters…';const uid=currentUser.uid;
  const votes=ratings.filter(vote=>vote.gamePath===path);
  await Promise.all(votes.map(async vote=>{let person;try{const snap=await getDoc(doc(db,'users',vote.userId));person=snap.exists()?snap.data():null}catch{}if(request!==voterRequest||currentUser?.uid!==uid)return;const row=document.createElement('div');row.className='rating-voter';const name=document.createElement('strong'),stars=document.createElement('span');name.textContent=person?.displayName||person?.username||'Unavailable profile';stars.textContent='★'.repeat(vote.rating)+'☆'.repeat(5-vote.rating);stars.setAttribute('aria-label',vote.rating+' out of 5 stars');row.append(name,stars);list.append(row)}));
  if(request===voterRequest)$("#rating-status").textContent=votes.length?votes.length+' ratings':'No ratings yet.';
}
function pathKey(path){return path.replace(/^\/+|\/+$/g,"").replace(/[^a-z0-9-]/gi,"-")}
function ratingStats(path){const votes=ratings.filter(r=>r.gamePath===path);return{count:votes.length,average:votes.length?votes.reduce((n,r)=>n+r.rating,0)/votes.length:0}}
function sendCommunityData(){const ratingMap={},playMap={};gameCards.forEach(card=>{const path=card.dataset.path||sitePath(card.querySelector("a[href]").href);ratingMap[path]=ratingStats(path).average;playMap[path]=currentProfile?.stats?.games?.[pathKey(path)]||0});window.dispatchEvent(new CustomEvent("simplegames:community-data",{detail:{ratings:ratingMap,plays:playMap}}))}
function renderRatings(){gameCards.forEach(card=>{const path=card.dataset.path||sitePath(card.querySelector("a[href]").href),title=card.querySelector("h2").textContent.trim(),stats=ratingStats(path);let row=card.querySelector(".rating-row");if(!row){row=document.createElement("div");row.className="rating-row";row.innerHTML='<button class="rating-button" type="button"></button><button class="rating-count" type="button"></button>';card.querySelector(".game-card__body").append(row);row.querySelector(".rating-button").onclick=()=>openRating(path,title);row.querySelector(".rating-count").onclick=()=>openVoters(path,title)}row.querySelector("button").textContent=stats.count?`★ ${stats.average.toFixed(1)}`:"☆ Rate";row.querySelector(".rating-count").textContent=`${stats.count} rating${stats.count===1?"":"s"}`});sendCommunityData()}
function openRating(path,title){$("#rating-title").textContent=`Rate ${title}`;$("#rating-status").textContent=currentUser?"Choose 1–5 stars":"Log in to rate games.";const picker=$("#rating-picker");picker.replaceChildren();for(let value=1;value<=5;value++){const b=document.createElement("button");b.type="button";b.textContent="★";b.title=`${value} star${value===1?"":"s"}`;b.disabled=!currentUser;b.onclick=async()=>{try{await setDoc(doc(db,"ratings",`${pathKey(path)}_${currentUser.uid}`),{gamePath:path,userId:currentUser.uid,rating:value,updatedAt:serverTimestamp()});$("#rating-status").textContent=`You rated ${title} ${value}/5.`}catch(e){$("#rating-status").textContent=e.message}};picker.append(b)}ratingPanel.hidden=false}
onSnapshot(collection(db,"ratings"),snap=>{ratings=snap.docs.map(x=>x.data());renderRatings()},()=>renderRatings());

const achievements=[
  {icon:"🎮",name:"First Game",test:s=>(s.gamesOpened||0)>=1},
  {icon:"🧭",name:"Explorer",test:s=>(s.gamesOpened||0)>=5},
  {icon:"🏆",name:"Game Fan",test:s=>(s.gamesOpened||0)>=20},
  {icon:"⏱️",name:"One Hour Club",test:s=>(s.playSeconds||0)>=3600}
];
function renderAchievements(profile={}){const stats=profile.stats||{},total=$("#playtime-total");if(total)total.textContent=`${Math.floor((stats.playSeconds||0)/60)} minutes played`}
const syncStatus=document.createElement('p');syncStatus.className='result-count';syncStatus.setAttribute('aria-live','polite');document.querySelector('#leaderboard-view')?.append(syncStatus);
const tracker=createPlaytimeTracker({
  send:async(uid,delta)=>{const changes={};if(delta.seconds)changes['stats.playSeconds']=increment(delta.seconds);if(delta.opened)changes['stats.gamesOpened']=increment(delta.opened);for(const [path,count]of Object.entries(delta.games))changes[`stats.games.${path}`]=increment(count);await updateDoc(doc(db,'users',uid),changes)},
  status:(state,error)=>{syncStatus.textContent=state==='saved'?'Playtime saved · updates about every 15 seconds.':state==='syncing'?'Syncing playtime…':error?.code==='permission-denied'?'Playtime save blocked. Publish the latest Firestore rules.':'Playtime could not sync. Keep this page open; it will retry when connected.';if(error)console.error('Playtime sync:',error)}
});
let playing=false,pageActive=true;
const gameOverlay=$('#game-overlay'),gamePlayer=$('#game-player');
const playtimeGate=createPlaytimeGate({locks:navigator.locks,onActive:active=>tracker.setActive(active)});
function updatePlaytimeGate(){const open=!!gameOverlay&&!gameOverlay.hidden;const eligible=eligiblePlaytime({playing,pageActive,visible:document.visibilityState==='visible',overlayOpen:open,loaded:!!gamePlayer?.getAttribute('src')&&gamePlayer.getAttribute('src')!=='about:blank'&&!!$('#game-loader')?.hidden});playtimeGate.update(currentUser?.uid||null,eligible)}
window.addEventListener('simplegames:play',event=>{playing=true;tracker.start(pathKey(event.detail.path));updatePlaytimeGate();void tracker.flush()});
window.addEventListener('simplegames:stop-playing',()=>{playing=false;updatePlaytimeGate();void tracker.stop()});
setInterval(()=>{updatePlaytimeGate();tracker.tick()},1000);
setInterval(()=>void tracker.flush(),15000);
document.addEventListener('visibilitychange',()=>{updatePlaytimeGate();void tracker.flush()});
window.addEventListener('pagehide',()=>{pageActive=false;updatePlaytimeGate();void tracker.flush()});
window.addEventListener('pageshow',()=>{pageActive=true;updatePlaytimeGate()});
window.addEventListener('online',()=>void tracker.flush());

function localPreferences(){return Object.fromEntries(preferenceKeys.map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!==null&&v.length<650000))}
const preferenceStatus=document.createElement('p');preferenceStatus.className='result-count';preferenceStatus.setAttribute('aria-live','polite');$("#settings-panel .settings-card")?.append(preferenceStatus);
function savePreferences(){
  preferenceStatus.textContent='Saved on this browser.';if(!currentUser)return;
  const uid=currentUser.uid,snapshot=localPreferences();localStorage.setItem(`sg-local-preferences-${uid}`,JSON.stringify(snapshot));
  preferenceStatus.textContent='Saved locally · syncing account…';clearTimeout(syncTimer);
  syncTimer=setTimeout(async()=>{try{await updateDoc(doc(db,'users',uid),{preferences:snapshot});preferenceStatus.textContent='Settings saved to your account.'}catch(error){preferenceStatus.textContent='Saved on this browser. Account sync failed—check your connection or Firebase rules.';console.error('Settings sync:',error)}},300);
}
$("#settings-panel")?.addEventListener("change",savePreferences);$("#settings-panel")?.addEventListener("input",savePreferences);$("#background-image-file")?.addEventListener("change",()=>setTimeout(savePreferences,2000));$("#theme-toggle")?.addEventListener("click",savePreferences);
document.addEventListener('simplegames:settings-reset',savePreferences);
function loadCloudPreferences(profile){
  if(!currentUser)return;const uid=currentUser.uid,marker=`sg-cloud-loaded-${uid}`;if(sessionStorage.getItem(marker))return;
  let local;try{local=JSON.parse(localStorage.getItem(`sg-local-preferences-${uid}`))}catch{}
  const source=local||profile.preferences;sessionStorage.setItem(marker,'1');
  if(!source){savePreferences();return}
  let changed=false;for(const[key,value]of Object.entries(source)){if(preferenceKeys.includes(key)&&typeof value==='string'&&localStorage.getItem(key)!==value){localStorage.setItem(key,value);changed=true}}
  if(local){updateDoc(doc(db,'users',uid),{preferences:local}).catch(error=>console.error('Settings sync:',error))}
  if(changed)location.reload();
}
document.addEventListener("simplegames:profile",e=>{currentProfile=e.detail.profile;renderAchievements(currentProfile);sendCommunityData();loadCloudPreferences(currentProfile)});
onAuthStateChanged(auth,user=>{playtimeGate.dispose();tracker.setUser(user?.uid||null);currentUser=user;updatePlaytimeGate();if(user){if(playtimeGate.supported)void tracker.flush();else syncStatus.textContent='Playtime paused: this browser does not support safe multi-tab counting. Please update your browser.'}else{currentProfile=null;syncStatus.textContent='Sign in to save playtime to the leaderboard.';renderAchievements({})}});
renderRatings();renderAchievements({});

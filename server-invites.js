import {collection,doc,getDoc,onSnapshot,query,where,setDoc,updateDoc,writeBatch,arrayUnion,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
let stop=()=>{};
let notificationProfile={};
document.addEventListener('simplegames:profile',event=>notificationProfile=event.detail.profile||{});
export async function sendServerInvite(db,server,from,to) {
  if(to===from.uid)throw Error('You cannot invite yourself.');
  if(server.members.includes(to))throw Error('This person is already a member.');
  if(server.banned?.includes(to))throw Error('Unban this person before inviting them.');
  const ref=doc(db,'serverInvites',server.id+'_'+to);
  await setDoc(ref,{serverId:server.id,serverName:server.name,fromUid:from.uid,fromName:from.displayName||from.username||'Server owner',toUid:to,status:'pending',createdAt:serverTimestamp()},{merge:true});
}
export function listenServerInvites(db,user) {
  stop();notificationProfile={};document.querySelector('#server-invite-inbox')?.remove();if(!user)return;
  const inbox=document.createElement('section');inbox.id='server-invite-inbox';document.querySelector('#friend-list').before(inbox);
  let ready=false,seen=new Set();
  stop=onSnapshot(query(collection(db,'serverInvites'),where('toUid','==',user.uid)),snapshot=>{
    inbox.replaceChildren();const pending=snapshot.docs.filter(entry=>entry.data().status==='pending');
    if(pending.length){const title=document.createElement('h3');title.textContent='Server invites · '+pending.length;inbox.append(title);}
    for(const entry of pending){const data=entry.data(),card=document.createElement('article');card.className='message';const text=document.createElement('p');text.textContent=`${data.fromName} invited you to ${data.serverName}. Want to join?`;const feedback=document.createElement('p');feedback.setAttribute('aria-live','polite');const accept=document.createElement('button'),decline=document.createElement('button');accept.type=decline.type='button';accept.className=decline.className='secondary-button';accept.textContent='Accept';decline.textContent='Decline';
      async function respond(join){accept.disabled=decline.disabled=true;try{
        if(join){const serverRef=doc(db,'servers',data.serverId),server=await getDoc(serverRef);if(!server.exists())throw Error('This server no longer exists.');if(server.data().banned?.includes(user.uid))throw Error('You cannot join this server.');const batch=writeBatch(db);batch.update(serverRef,{members:arrayUnion(user.uid),[`memberRoles.${user.uid}`]:'member',updatedAt:serverTimestamp()});batch.update(entry.ref,{status:'accepted',respondedAt:serverTimestamp()});await batch.commit();}
        else await updateDoc(entry.ref,{status:'declined',respondedAt:serverTimestamp()});
      }catch(error){feedback.textContent=error.message;accept.disabled=decline.disabled=false;}}
      accept.onclick=()=>respond(true);decline.onclick=()=>respond(false);card.append(text,accept,decline,feedback);inbox.append(card);
      const stamp=data.createdAt?.seconds+':'+data.createdAt?.nanoseconds;
      if(ready&&!seen.has(entry.id+stamp))document.dispatchEvent(new CustomEvent('simplegames:notification',{detail:{name:data.fromName,text:`Server invite: ${data.serverName}. Open Friends to accept or decline.`,muted:notificationProfile.doNotDisturb,sound:notificationProfile.messageSound!==false}}));
    }
    seen=new Set(pending.map(entry=>entry.id+(entry.data().createdAt?.seconds+':'+entry.data().createdAt?.nanoseconds)));ready=true;
  },error=>{inbox.textContent='Server invites could not load. '+error.message;});
}

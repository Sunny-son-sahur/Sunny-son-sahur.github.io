import{timedOut,commandEditor}from'./server-commands.js?v=2';
export function canReadChannel(server, channel, uid) {
  if (!uid || !server?.members?.includes(uid) || server.banned?.includes(uid) || !server.channels?.includes(channel)) return false;
  if (server.ownerUid === uid) return true;
  const config=server.channelSettings?.[channel]||{}, role=server.memberRoles?.[uid]||'member';
  const restricted=config.private ?? !!config.roles?.length;
  return !restricted || (config.roles||[]).includes(role) || (config.members||[]).includes(uid);
}
export function canSendChannel(server,channel,uid) {
  if(!canReadChannel(server,channel,uid))return false;
  if(server.ownerUid===uid)return true;
  if(timedOut(server,uid))return false;
  const config=server.channelSettings?.[channel]||{},role=server.memberRoles?.[uid]||'member',permissions=server.rolePermissions?.[role]||{};
  if(config.locked && permissions.manageMessages!==true)return false;
  if(permissions.sendMessages===false)return false;
  return !config.restrictSend || (config.sendRoles||[]).includes(role) || (config.sendMembers||[]).includes(uid);
}
export function channelEditor(server,name,card,profiles) {
 const config=server.channelSettings?.[name]||{},controls={},selections={roles:[],members:[],sendRoles:[],sendMembers:[]};
 const section=(title)=>{const box=document.createElement('section'),heading=document.createElement('h4');box.className='editor-section';heading.textContent=title;box.append(heading);card.append(box);return box};
 const basics=section('Channel type'),typeLabel=document.createElement('label'),type=document.createElement('select');typeLabel.textContent='Type';type.setAttribute('aria-label','Channel type');
 for(const [value,text]of [['text','Text channel'],['voice','Voice channel']]){const option=document.createElement('option');option.value=value;option.textContent=text;type.append(option)}type.value=config.type||'text';typeLabel.append(type);basics.append(typeLabel);
 const access=section('Visibility'),sending=section('Messages');
 const makeCheck=(parent,key,text,checked)=>{const label=document.createElement('label'),input=document.createElement('input');label.className='editor-check';input.type='checkbox';input.checked=checked;label.append(input,text);parent.append(label);controls[key]=input;return input};
 const privateControl=makeCheck(access,'private','Private channel',config.private??!!config.roles?.length);
 const sendControl=makeCheck(sending,'restrictSend','Limit who can send messages',!!config.restrictSend);
 const hint=(parent,text)=>{const p=document.createElement('p');p.className='editor-hint';p.textContent=text;parent.append(p)};
 hint(access,'Public channels are visible to everyone. Private channels are visible only to the owner and selected roles or people.');
 hint(sending,'Members still need access to the channel. Locking pauses messages except for the owner and moderators.');
 const viewOptions=document.createElement('div'),sendOptions=document.createElement('div');access.append(viewOptions);sending.append(sendOptions);
 const update=()=>{viewOptions.hidden=!privateControl.checked;sendOptions.hidden=!sendControl.checked};privateControl.onchange=sendControl.onchange=update;update();
 for(const [key,title,entries,parent]of [
  ['roles','Roles that can view',(server.roles||[]).filter(r=>r.id!=='owner').map(r=>[r.id,r.name]),viewOptions],
  ['members','People that can view',[...new Set(server.members||[])].filter(uid=>uid!==server.ownerUid).map(uid=>[uid,profiles.get(uid)?.displayName||profiles.get(uid)?.username||'Profile unavailable · '+uid.slice(0,8)]),viewOptions],
  ['sendRoles','Roles that can send',(server.roles||[]).filter(r=>r.id!=='owner').map(r=>[r.id,r.name]),sendOptions],
  ['sendMembers','People that can send',[...new Set(server.members||[])].filter(uid=>uid!==server.ownerUid).map(uid=>[uid,profiles.get(uid)?.displayName||profiles.get(uid)?.username||'Profile unavailable · '+uid.slice(0,8)]),sendOptions]
 ]){
  const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('div');summary.textContent=title;list.className='editor-options';details.append(summary,list);parent.append(details);
  for(const [id,text]of entries){const label=document.createElement('label'),input=document.createElement('input');label.className='editor-check';input.type='checkbox';input.checked=(config[key]||[]).includes(id);label.append(input,text);list.append(label);selections[key].push({id,input})}
  if(!entries.length)list.textContent='No entries yet.';
 }
 const advanced=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Command permissions';advanced.append(summary);card.append(advanced);
 const commands=commandEditor(server,name,advanced);
 return ()=>Object.fromEntries([['type',type.value],['commandRoles',commands()],...Object.entries(controls).map(([key,input])=>[key,input.checked]),...Object.entries(selections).map(([key,items])=>[key,items.filter(item=>item.input.checked).map(item=>item.id)])]);
}

export const COMMANDS=[
 {name:'timeout',usage:'/timeout @username 10m',description:'Stop server messages temporarily'},
 {name:'untimeout',usage:'/untimeout @username',description:'Remove a timeout'},
 {name:'kick',usage:'/kick @username',description:'Remove a member; they can rejoin'},
 {name:'ban',usage:'/ban @username',description:'Remove a member and block rejoining'},
 {name:'unban',usage:'/unban @username',description:'Allow a banned member to rejoin'},
 {name:'lock',usage:'/lock',description:'Make this channel read-only'},
 {name:'unlock',usage:'/unlock',description:'Remove this channel’s lockdown'}
];
const millis=value=>value?.toMillis?.()??value??0;
export function timedOut(server,uid,now=Date.now()){return uid!==server?.ownerUid&&millis(server?.timeouts?.[uid])>now}
export function roleRank(server,uid){const role=server?.memberRoles?.[uid]||'member';return Number(server?.rolePermissions?.[role]?.rank)||0}
export function canUseCommand(server,channel,uid,name,now=Date.now()){
 if(!uid||!server?.members?.includes(uid)||server.banned?.includes(uid)||!server.channels?.includes(channel))return false;
 if(!COMMANDS.some(command=>command.name===name)&&name!=='help')return false;
 if(uid===server.ownerUid)return true;
 if(timedOut(server,uid,now))return false;
 const config=server.channelSettings?.[channel]||{},role=server.memberRoles?.[uid]||'member';
 if((config.private??!!config.roles?.length)&&!config.roles?.includes(role)&&!config.members?.includes(uid))return false;
 return name==='help'||config.commandRoles?.[name]?.includes(role)===true;
}
export function canTarget(server,actor,target){return !!target&&target!==actor&&target!==server.ownerUid&&(actor===server.ownerUid||roleRank(server,actor)>roleRank(server,target))}
export function parseTimeout(value='10m'){
 const match=/^(\d+)(s|m|h|d)$/i.exec(value);if(!match)throw Error('Use a duration like 30s, 10m, 1h, or 1d.');
 const seconds=Number(match[1])*({s:1,m:60,h:3600,d:86400}[match[2].toLowerCase()]);
 if(seconds<1||seconds>604800)throw Error('Timeouts must be between 1 second and 7 days.');return seconds*1000;
}
export function commandChanges(server,channel,actor,name,target,duration,now=Date.now()){
 if(!canUseCommand(server,channel,actor,name,now))throw Error('Your role cannot use /'+name+' in this channel.');
 if(name==='lock'||name==='unlock')return{[`channelSettings.${channel}.locked`]:name==='lock'};
 if(!canTarget(server,actor,target))throw Error('You cannot target yourself, the owner, or an equal/higher role.');
 if(name==='unban'){if(!server.banned?.includes(target))throw Error('That person is not banned.');return{banned:server.banned.filter(uid=>uid!==target)}}
 if(!server.members.includes(target))throw Error('That person is not in this server.');
 if(name==='timeout')return{[`timeouts.${target}`]:now+parseTimeout(duration)};
 if(name==='untimeout')return{[`timeouts.${target}`]:0};
 const changes={members:server.members.filter(uid=>uid!==target)};
 if(name==='ban')changes.banned=[...new Set([...(server.banned||[]),target])];return changes;
}
export function commandEditor(server,channel,card){
 const box=document.createElement('div');box.className='channel-command-settings';
 const help=document.createElement('p');help.className='editor-hint';help.textContent='Choose which roles can use each command. The owner always has access; members cannot moderate equal or higher roles.';box.append(help);
 const controls={};for(const command of COMMANDS){const details=document.createElement('details'),summary=document.createElement('summary'),title=document.createElement('span'),description=document.createElement('small');title.textContent='/'+command.name;description.textContent=command.description;summary.append(title,description);details.append(summary);controls[command.name]=[];
 for(const role of (server.roles||[]).filter(role=>role.id!=='owner')){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=server.channelSettings?.[channel]?.commandRoles?.[command.name]?.includes(role.id)||false;input.setAttribute('aria-label','Allow '+role.name+' to use /'+command.name);label.append(input,role.name);details.append(label);controls[command.name].push({id:role.id,input})}box.append(details)}
 card.append(box);return()=>Object.fromEntries(Object.entries(controls).map(([name,roles])=>[name,roles.filter(role=>role.input.checked).map(role=>role.id)]));
}

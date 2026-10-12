// Shared notification filtering used by chats and servers.
export function groupNotificationText(data,person={}){
  const sender=person.displayName||person.username||'Member';
  return `${sender}: ${data.lastMessage||'New message'}`;
}
export function timestampMillis(value){return value?.toMillis?.()??((value?.seconds||0)*1000+(value?.nanoseconds||0)/1e6)}
export function freshNotification(value,since){return timestampMillis(value)>since}
export function incomingSummary(before,after,uid,since=0){
  if(!after?.lastSenderId||after.lastSenderId===uid)return false;
  if(since&&!freshNotification(after.updatedAt,since))return false;
  const stamp=t=>t?`${t.seconds??t.toMillis?.()??0}:${t.nanoseconds??0}`:'';
  return stamp(after.updatedAt)!==stamp(before?.updatedAt)
    || after.lastSenderId!==before?.lastSenderId
    || (after.unreadCounts?.[uid]||0)>(before?.unreadCounts?.[uid]||0);
}
export function serverNotificationAllowed(mode,text,profile={}){
  if(mode==='off')return false;if(mode==='all')return true;
  const names=[profile.username,'everyone'].filter(Boolean).map(name=>String(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  return new RegExp(`(^|\\s)@(${names.join('|')})(?=$|\\s|[.,!?:;])`,'i').test(String(text||''));
}

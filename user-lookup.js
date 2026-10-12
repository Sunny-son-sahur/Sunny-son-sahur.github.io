import{collection,doc,getDoc,getDocs,limit,query,where}from'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
export function normalizeUsername(value){return String(value??'').normalize('NFKC').trim().replace(/^@+/,'').toLowerCase()}
// Exact account names only; never guess between duplicate display names.
export async function findUser(db,value){
 const username=normalizeUsername(value);if(!/^[a-z0-9_]{3,20}$/.test(username))throw Error('Enter their @username (3–20 letters, numbers, or underscores), not their display name.');
 const index=await getDoc(doc(db,'usernames',username));
 if(index.exists()){const account=await getDoc(doc(db,'users',index.data().uid));if(account.exists())return{uid:account.id,...account.data()}}
 for(const [field,name]of [['usernameLower',username],['username',String(value).trim().replace(/^@+/, '')],['username',username]]){
  const matches=await getDocs(query(collection(db,'users'),where(field,'==',name),limit(2)));
  if(matches.size===1){const account=matches.docs[0];return{uid:account.id,...account.data()}}
  if(matches.size>1)throw Error('More than one account matches. Ask your friend for their exact @username.');
 }
 return null;
}

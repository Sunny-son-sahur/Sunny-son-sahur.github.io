import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-ai.js";
import {plainAnswer} from './ai-text.js?v=1';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';

const config={apiKey:"AIzaSyDzJu7zyLTZWwffbS5wcxAGym5orePvNKg",authDomain:"simplegames-23c2c.firebaseapp.com",projectId:"simplegames-23c2c",storageBucket:"simplegames-23c2c.firebasestorage.app",messagingSenderId:"993873419513",appId:"1:993873419513:web:14e22dfff6d7f0c7051628",measurementId:"G-NC81W7MYG0"};
const app=getApps().length?getApp():initializeApp(config);
initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider("6Lfg4-AtAAAAAH8SOPbduPU0Rio5eUbDhoBq2PQn"),isTokenAutoRefreshEnabled:true});
const panel=document.querySelector("#ai-panel"),messages=document.querySelector("#ai-messages"),form=document.querySelector("#ai-form"),field=form?.elements.message,send=document.querySelector('#ai-send');
let chat,conversations=[],active=null,storageKey='sg-ai-chats-guest',attachment=null,generation=0;
const history=document.querySelector('#ai-history'),welcome=document.querySelector('#ai-welcome'),stage=document.querySelector('.ai-stage'),newChat=document.querySelector('#ai-new');
function save(){try{localStorage.setItem(storageKey,JSON.stringify(conversations.slice(0,20)))}catch{}}
function renderHistory(){history.replaceChildren();if(!conversations.length){const empty=document.createElement('p');empty.className='ai-history-empty';empty.textContent='No conversations yet.';history.append(empty);}for(const item of conversations){const row=document.createElement('div'),open=document.createElement('button'),remove=document.createElement('button');row.className='ai-history-row';row.classList.toggle('active',item===active);open.type=remove.type='button';open.textContent=item.title;open.disabled=remove.disabled=send.disabled;open.onclick=()=>select(item);remove.textContent='×';remove.setAttribute('aria-label','Delete '+item.title);remove.onclick=()=>{if(!confirm('Delete this chat from this browser?'))return;conversations=conversations.filter(c=>c!==item);if(active===item)select(null);save();renderHistory();};row.append(open,remove);history.append(row);}}
function select(item){if(send.disabled)return;active=item;chat=null;messages.replaceChildren();for(const message of item?.messages||[])addMessage(message.text,message.kind);layout();renderHistory();field.focus();}
function layout(){const has=!!messages.children.length;welcome.hidden=has;messages.hidden=!has;stage.classList.toggle('has-chat',has);}
function greeting(profile={}){let hour=new Date().getHours();try{const zone=JSON.parse(localStorage.getItem('sg-timezone')||'"auto"');if(zone!=='auto')hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',hourCycle:'h23'}).format(new Date()))}catch{}document.querySelector('#ai-greeting').textContent=(hour<12?'Good morning':hour<17?'Good afternoon':'Good evening')+(profile.displayName||profile.username?', '+(profile.displayName||profile.username):'')+'.';}
newChat.onclick=()=>{select(null);detach();field.value='';};document.querySelector('#ai-sidebar-toggle').onclick=event=>{const closed=document.querySelector('.ai-card').classList.toggle('ai-sidebar-hidden');event.currentTarget.setAttribute('aria-expanded',String(!closed));};if(matchMedia('(max-width:700px)').matches)document.querySelector('#ai-sidebar-toggle').click();
function detach(){attachment=null;document.querySelector('#ai-attachment').textContent='';document.querySelector('#ai-detach').hidden=true;document.querySelector('#ai-file').value='';}
document.querySelector('#ai-attach').onclick=()=>document.querySelector('#ai-file').click();document.querySelector('#ai-detach').onclick=detach;
document.querySelector('#ai-file').onchange=async event=>{const file=event.target.files?.[0],owner=generation;if(!file)return;detach();if(!/\.(txt|md)$/i.test(file.name)||file.size>24000){document.querySelector('#ai-attachment').textContent='Choose a .txt or .md file under 24 KB.';return;}const text=await file.text();if(owner!==generation)return;if(text.length>8000){document.querySelector('#ai-attachment').textContent='File is too long (8,000 characters max).';return;}attachment={name:file.name,text};document.querySelector('#ai-attachment').textContent=file.name;document.querySelector('#ai-detach').hidden=false;};
document.addEventListener('simplegames:profile',event=>greeting(event.detail.profile||{}));
onAuthStateChanged(getAuth(app),user=>{generation++;chat=null;active=null;attachment=null;storageKey='sg-ai-chats-'+(user?.uid||'guest');try{conversations=JSON.parse(localStorage.getItem(storageKey)||'[]').filter(c=>typeof c.title==='string'&&Array.isArray(c.messages)).slice(0,20)}catch{conversations=[];}send.disabled=field.disabled=newChat.disabled=false;messages.replaceChildren();detach();layout();renderHistory();greeting();});

function addMessage(text,kind){const message=document.createElement("p");message.className=`ai-message ${kind}`;message.textContent=text;messages.append(message);messages.scrollTop=messages.scrollHeight;return message}
function setupMessage(error){
  const detail=String(error?.message||error),code=String(error?.code||"unknown");
  if(code==="ai/timeout")return "AI took too long to respond. Please try again. [ai/timeout]";
  if(/app.?check|recaptcha|attestation/i.test(detail+code))return "AI security verification failed. Try the live website; local previews need an authorized App Check debug setup. ["+code+"]";
  if(/429|quota|resource.exhausted/i.test(detail+code))return "AI has reached its usage limit. Try again later. ["+code+"]";
  if(/403|permission|API.*blocked|API.*enabled/i.test(detail+code))return "AI access is blocked by the project setup. Check Firebase AI Logic, API restrictions, and App Check. ["+code+"]";
  if(/404|not.found|model/i.test(detail+code))return "The configured AI model could not be reached. ["+code+"]";
  return "AI couldn't respond. Please try again. ["+code+"]";
}
async function ask(question){
  if(!send||send.disabled)return;
  const requestGeneration=generation;if(!active){active={id:crypto.randomUUID(),title:question.slice(0,42),messages:[]};conversations.unshift(active);conversations=conversations.slice(0,20);}const saved=active,previous=[];for(let i=0;i<saved.messages.length-1;i++){const user=saved.messages[i],answer=saved.messages[i+1];if(user.kind==='user'&&answer.kind==='assistant'&&!answer.error&&typeof user.text==='string'&&typeof answer.text==='string'){previous.push(user,answer);i++;}}previous.splice(0,Math.max(0,previous.length-20));saved.messages.push({text:question,kind:'user'});save();addMessage(question,'user');const waiting=addMessage('','assistant');layout();
  waiting.classList.add("ai-thinking");waiting.setAttribute("aria-label","AI is responding");waiting.innerHTML="<span></span><span></span><span></span>";
  send.disabled=true;field.disabled=true;newChat.disabled=true;renderHistory();let timer;
  try{
    if(!chat){const ai=getAI(app,{backend:new GoogleAIBackend()});const model=getGenerativeModel(ai,{model:"gemini-3.8-flash",systemInstruction:"You are Simple AI, a friendly general-purpose assistant inside Simple Games. Answer clearly and safely about any subject. Use plain text, no Markdown asterisks or heading syntax. Keep normal answers short unless asked for detail."});chat=model.startChat({history:previous.map(m=>({role:m.kind==='user'?'user':'model',parts:[{text:m.text}]})),generationConfig:{maxOutputTokens:1536}})}
    let expired=false,answer='';
    const request=(async()=>{const result=await chat.sendMessageStream(question);for await(const chunk of result.stream){if(expired||requestGeneration!==generation)return;answer+=chunk.text();waiting.classList.remove('ai-thinking');waiting.textContent=plainAnswer(answer);messages.scrollTop=messages.scrollHeight}if(!answer)waiting.textContent="I couldn't generate an answer."})();
    await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Object.assign(new Error("AI response timed out"),{code:"ai/timeout"}))},45000)})]);
  }catch(error){if(requestGeneration!==generation)return;chat=null;console.error("Simple AI:",error);waiting.dataset.error='true';waiting.textContent=setupMessage(error)}
  finally{clearTimeout(timer);if(requestGeneration!==generation)return;saved.messages.push({text:waiting.textContent,kind:'assistant',error:waiting.dataset.error==='true'});saved.messages=saved.messages.slice(-60);save();newChat.disabled=false;waiting.classList.remove("ai-thinking");waiting.removeAttribute("aria-label");send.disabled=false;field.disabled=false;renderHistory();field.focus();messages.scrollTop=messages.scrollHeight}
}

document.querySelector("#ai-close")?.addEventListener("click",()=>panel.hidden=true);
panel?.addEventListener("click",event=>{if(event.target===panel)panel.hidden=true});
document.querySelectorAll(".ai-suggestions button").forEach(button=>button.addEventListener("click",()=>ask(button.textContent)));
form?.addEventListener('submit',event=>{event.preventDefault();if(send.disabled)return;let question=field.value.trim();if(!question)return;if(attachment)question+='\n\nAttached text file: '+attachment.name+'\n'+attachment.text;field.value='';detach();ask(question)});field.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit();}});

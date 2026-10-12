(() => {
 let context;const select=document.querySelector('#click-sound');try{select.value=JSON.parse(localStorage.getItem('sg-click-sound')||'"soft"')}catch{select.value='soft'}
 function play(choice,notification=false){if(choice==='off')return;try{context ||= new AudioContext();context.resume();const o=context.createOscillator(),g=context.createGain(),t=context.currentTime;const [type,a,b,d]=({soft:['sine',720,380,.06],pop:['sine',480,160,.1],tap:['triangle',1100,600,.035],arcade:['square',540,880,.07]})[choice]||['sine',720,380,.06];o.type=type;o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(b,t+d);g.gain.setValueAtTime(notification ? .04 : .02,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(context.destination);o.start();o.stop(t+d+.01)}catch{}}
 document.addEventListener('simplegames:settings-reset',()=>select.value='soft');
 document.addEventListener('pointerdown',()=>{try{context ||= new AudioContext();void context.resume()}catch{}},{passive:true});
 document.addEventListener('simplegames:notification',event=>{if(!event.detail.muted&&event.detail.sound!==false)play(select.value,true)});
 select.onchange=()=>localStorage.setItem('sg-click-sound',JSON.stringify(select.value));document.querySelector('#click-sound-preview').onclick=()=>play(select.value);
 document.addEventListener('click',e=>{const c=e.target.closest('button,a,select');if(c&&!c.disabled&&!['startup-enter','click-sound-preview'].includes(c.id))play(select.value)});
})();

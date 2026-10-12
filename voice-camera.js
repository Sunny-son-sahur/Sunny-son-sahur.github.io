// Camera tiles are separate from shared screens; local preview never plays audio.
export function cameraTiles(container,resolveName,documentRef=document){
  const tiles=new Map();
  function remove(track){const item=tiles.get(track);if(!item)return;track.detach(item.video);item.card.remove();tiles.delete(track)}
  function add(track,participant,local=false){
    if(!track||track.isMuted||tiles.has(track))return;
    const card=documentRef.createElement('figure'),label=documentRef.createElement('figcaption'),video=track.attach();
    card.className='voice-camera-tile';video.autoplay=true;video.playsInline=true;video.muted=local;video.className=local?'voice-camera-local':'';
    label.textContent=local?'You':'Member';card.append(video,label);container.append(card);tiles.set(track,{card,video});
    if(!local)Promise.resolve(resolveName(participant.identity)).then(name=>{if(tiles.has(track))label.textContent=name||'Member'}).catch(()=>{});
  }
  function clear(){for(const track of [...tiles.keys()])remove(track)}
  return{add,remove,clear};
}

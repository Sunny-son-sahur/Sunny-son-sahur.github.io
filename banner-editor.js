let pending = null, source = null, generation = 0;
const file = document.querySelector('#banner-file'), editor = document.querySelector('#banner-editor'), canvas = document.querySelector('#banner-preview');
const zoom = document.querySelector('#banner-zoom'), x = document.querySelector('#banner-x'), y = document.querySelector('#banner-y');
function draw() {
  if (!source) return;
  const scale = Math.max(canvas.width / source.width, canvas.height / source.height) * Number(zoom.value);
  const width = canvas.width / scale, height = canvas.height / scale;
  canvas.getContext('2d').drawImage(source, (source.width-width)*Number(x.value)/100, (source.height-height)*Number(y.value)/100, width, height, 0, 0, canvas.width, canvas.height);
  pending = canvas.toDataURL('image/webp', .75);
  for (const quality of [.6,.45,.3]) { if (pending.length <= 180000) break; pending = canvas.toDataURL('image/webp',quality); }
  if (pending.length > 180000) pending = null;
}
for (const control of [zoom,x,y]) control.addEventListener('input',draw);
file.addEventListener('change',() => {
  const selected = file.files?.[0], version = ++generation;
  if (!selected) return;
  if (!['image/png','image/jpeg','image/webp'].includes(selected.type) || selected.size > 5*1024*1024) { file.value=''; alert('Choose a PNG, JPEG, or WebP under 5 MB.'); return; }
  const reader = new FileReader();
  reader.onerror = () => alert('Could not open this image.');
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => alert('Could not read this image.');
    image.onload = () => { if(version!==generation)return; source=image; zoom.value=1; x.value=y.value=50; editor.hidden=false; draw(); };
    image.src=reader.result;
  };
  reader.readAsDataURL(selected);
});
document.querySelector('#banner-remove').onclick = () => { generation++; source=null; pending=''; file.value=''; editor.hidden=true; };
document.addEventListener('simplegames:auth',resetBanner);
function resetBanner() { generation++; pending=null; source=null; file.value=''; editor.hidden=true; }
export function bannerChanges() { return pending===null ? {} : {bannerImage:pending}; }
export function bannerSaved() { resetBanner(); }
export function profileBanner(data) {
  const banner=document.createElement('div'); banner.className='profile-popover-banner'; banner.style.margin='0'; banner.style.height='auto'; banner.style.aspectRatio='3 / 1'; banner.style.borderRadius='12px';
  if(data.bannerImage) { const image=document.createElement('img'); image.src=data.bannerImage; image.alt='Profile banner'; banner.append(image); }
  return banner;
}
document.addEventListener('simplegames:profile',event => {
  const summary=document.querySelector('.profile-summary');
  document.querySelector('#own-profile-banner')?.remove();
  if(summary && event.detail.profile.bannerImage) { const banner=profileBanner(event.detail.profile); banner.id='own-profile-banner'; summary.before(banner); }
});

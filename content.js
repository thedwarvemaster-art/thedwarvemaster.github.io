(() => {
  const kind = location.pathname.endsWith('mechanics.html') ? 'mechanics' : 'factions';
  const $ = id => document.getElementById(id);
  const status = $('content-status'), adminStatus = $('admin-status'), form = $('item-form');
  let data, credentials, editingId = null, imageData = null;
  const groups = {major:'Major Factions',minor:'Minor Factions',merchant:'Merchant Factions'};
  const el = (tag, text, className) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n; };
  function render() {
    const target = $('content-groups'); target.replaceChildren();
    const categories = kind === 'factions' ? Object.keys(groups) : ['mechanics'];
    for (const category of categories) {
      const section = el('section', null, 'faction-group');
      const heading = el('div', null, 'group-heading'); heading.append(el('h2', kind === 'factions' ? groups[category] : 'Gameplay Mechanics')); section.append(heading);
      const list = el('div', null, 'faction-list');
      const entries = data[kind].filter(x => x.visible && (kind !== 'factions' || x.category === category));
      for (const item of entries) {
        const card = el('article', null, 'faction-card' + (kind === 'mechanics' ? ' mechanic-card' : ''));
        if (kind === 'factions') { const logo = el('div', null, 'faction-logo'); if(item.image) { const img = document.createElement('img'); img.src = item.image; img.alt = ''; logo.append(img); } else logo.textContent = '—'; card.append(logo); }
        const details = el('div', null, 'faction-details'); details.append(el('h3',item.name),el('p',item.description)); card.append(details); list.append(card);
      }
      if (!entries.length) section.append(el('p','No entries are currently available.','empty-state')); else section.append(list);
      target.append(section);
    }
    status.textContent = '';
  }
  function renderAdmin() {
    const list = $('admin-list'); list.replaceChildren();
    for (const item of data[kind]) {
      const row = el('div',null,'admin-row');
      const title = el('span', item.name + (item.visible ? '' : ' · Hidden')); row.append(title);
      const actions = el('div',null,'editor-actions');
      for (const [label, handler] of [['Edit',()=>edit(item)], [item.visible?'Hide':'Show',()=>mutate(item.id, x => {x.visible=!x.visible; return x;})], ['Remove',()=>{if(confirm(`Remove ${item.name}? This cannot be undone here.`)) mutate(item.id,()=>null);} ]]) { const b=el('button',label); b.type='button'; b.addEventListener('click',handler); actions.append(b); }
      row.append(actions); list.append(row);
    }
  }
  const api = () => `https://api.github.com/repos/${encodeURIComponent(credentials.owner)}/${encodeURIComponent(credentials.repo)}/contents/${credentials.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(credentials.branch)}`;
  async function github(options={}) {
    const response = await fetch(api(), {...options, headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${credentials.token}`,'X-GitHub-Api-Version':'2022-11-28',...(options.headers||{})}});
    const result = await response.json().catch(()=>({})); if (!response.ok) throw new Error(result.message || `GitHub returned ${response.status}`); return result;
  }
  function decode(content) { const bytes=Uint8Array.from(atob(content.replace(/\s/g,'')),c=>c.charCodeAt(0)); return JSON.parse(new TextDecoder().decode(bytes)); }
  function encode(content) { const bytes=new TextEncoder().encode(content); let binary=''; for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192)); return btoa(binary); }
  async function mutate(id, change) {
    adminStatus.textContent='Saving to GitHub…';
    try {
      const current=await github(); const latest=decode(current.content); const index=latest[kind].findIndex(x=>x.id===id);
      if (id && index<0) throw new Error('This entry no longer exists. Reload and try again.');
      const replacement=change(index<0 ? null : {...latest[kind][index]});
      if(index<0) latest[kind].push(replacement); else if(replacement===null) latest[kind].splice(index,1); else latest[kind][index]=replacement;
      await github({method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`Update ${kind}`,content:encode(JSON.stringify(latest,null,2)+'\n'),sha:current.sha,branch:credentials.branch})});
      data=latest; render(); renderAdmin(); form.hidden=true; adminStatus.textContent='Saved to GitHub. The public site will update after GitHub Pages deploys.';
    } catch(e) { adminStatus.textContent=`Could not save: ${e.message}`; }
  }
  function edit(item) {
    editingId=item?.id || null; imageData=null; form.reset(); form.elements.name.value=item?.name || ''; form.elements.description.value=item?.description || ''; form.elements.category.value=item?.category || 'major'; form.elements.visible.checked=item ? item.visible : true;
    $('form-title').textContent=item?'Edit entry':'Add new'; $('logo-preview').hidden=!item?.image; if(item?.image) $('logo-preview').src=item.image;
    form.hidden=false; form.elements.name.focus();
  }
  $('manage-button').onclick=()=>$('admin-dialog').showModal(); $('close-admin').onclick=()=>$('admin-dialog').close();
  $('new-item').onclick=()=>edit(null); $('cancel-edit').onclick=()=>form.hidden=true;
  $('logout').onclick=()=>{credentials=null; $('login-form').reset(); $('login-form').hidden=false; $('editor').hidden=true; form.hidden=true; adminStatus.textContent='Signed out.';};
  $('category-label').hidden=kind!=='factions'; $('image-label').hidden=kind!=='factions'; $('image-help').hidden=kind!=='factions';
  const pathParts=location.pathname.split('/').filter(Boolean); const parts=location.hostname.endsWith('.github.io') ? [location.hostname.split('.')[0],pathParts[0] && !pathParts[0].includes('.') ? pathParts[0] : ''] : [];
  if(parts.length) { $('login-form').elements.owner.value=parts[0]; $('login-form').elements.repo.value=parts[1] || `${parts[0]}.github.io`; }
  $('login-form').onsubmit=async event=>{event.preventDefault(); const loginForm=event.currentTarget; const fields=loginForm.elements; credentials={owner:fields.owner.value.trim(),repo:fields.repo.value.trim(),branch:fields.branch.value.trim(),token:fields.token.value.trim(),path:fields.path.value.trim() || 'site-content.json'}; adminStatus.textContent='Connecting…'; try {const current=await github(); data=decode(current.content); if(!Array.isArray(data.factions)||!Array.isArray(data.mechanics)) throw new Error('Content file has an unexpected format.'); fields.token.value=''; loginForm.hidden=true; $('editor').hidden=false; render(); renderAdmin(); adminStatus.textContent='Connected.';} catch(e) {credentials=null; adminStatus.textContent=`Could not connect: ${e.message}`;} };
  form.elements.image.onchange=async event=>{const file=event.target.files[0]; if(!file)return; if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){adminStatus.textContent='Choose a PNG, JPEG, or WebP image under 10 MB.'; event.target.value='';return;} try {const bitmap=await createImageBitmap(file); const canvas=document.createElement('canvas'); canvas.width=256;canvas.height=256; const size=Math.min(bitmap.width,bitmap.height); canvas.getContext('2d').drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,256,256); bitmap.close(); imageData=canvas.toDataURL('image/webp',0.85); $('logo-preview').src=imageData; $('logo-preview').hidden=false; adminStatus.textContent='';}catch {adminStatus.textContent='Could not read that image.';event.target.value='';}};
  form.onsubmit=event=>{event.preventDefault(); const fields=form.elements; const name=fields.name.value.trim(), description=fields.description.value.trim(); if(!name||!description){adminStatus.textContent='Enter a name and description.';return;} const id=editingId; mutate(id,old=>({...(old||{id:crypto.randomUUID()}),name,description,visible:fields.visible.checked,...(kind==='factions'?{category:fields.category.value,image:imageData || old?.image || ''}:{})}));};
  fetch('site-content.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(result=>{data=result;render();}).catch(()=>{status.textContent='Content could not be loaded. Please try again later.';});
})();



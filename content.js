(() => {
  const kind = location.pathname.endsWith('mechanics.html') ? 'mechanics' : 'factions';
  const $ = id => document.getElementById(id);
  const status = $('content-status'), adminStatus = $('admin-status'), form = $('item-form');
  let data, credentials, editingId = null, imageData = null, saving = false;
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
      for (const [label, handler] of [['Edit',()=>edit(item)], [item.visible?'Hide':'Show',()=>mutate(item.id, x => ({...x, visible: !item.visible}))], ['Remove',()=>{if(confirm(`Remove ${item.name}? This cannot be undone here.`)) mutate(item.id,()=>null);} ]]) { const b=el('button',label); b.type='button'; b.addEventListener('click',handler); actions.append(b); }
      row.append(actions); list.append(row);
    }
  }
  const projectUrl = 'https://lausdkwgwiquefneyqib.supabase.co';
  const publishableKey = 'sb_publishable_kNDnoUDPgdRo1cMfpIhRog_JDsHU4hN';
  const adminId = '8a9a6b91-a3d3-4d6a-822c-82eae13b8cc9';

  async function request(path, {method = 'GET', token, body} = {}) {
    const headers = {apikey: publishableKey};
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body) headers['Content-Type'] = 'application/json';
    if (['PATCH', 'DELETE', 'POST'].includes(method) && path.startsWith('/rest/')) {
      headers.Prefer = 'return=representation';
    }
    const response = await fetch(projectUrl + path, {
      method, headers, cache: 'no-store', body: body && JSON.stringify(body)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw Error(result?.message || result?.msg || 'Request failed (' + response.status + ')');
    return result;
  }

  const table = '/rest/v1/site_entries';

  async function load(token) {
    const entries = await request(table + '?kind=eq.' + kind + '&order=position.asc,id.asc', {token});
    return {[kind]: entries};
  }

  async function mutate(id, change) {
    if (saving || !credentials) return;
    saving = true;
    const token = credentials;
    adminStatus.textContent = 'Saving…';
    try {
      const old = id ? data[kind].find(item => item.id === id) : null;
      if (id && !old) throw Error('This entry is no longer available.');
      const updated = change(old);
      const path = id ? table + '?kind=eq.' + kind + '&id=eq.' + encodeURIComponent(id) : table;
      const method = updated === null ? 'DELETE' : id ? 'PATCH' : 'POST';
      let body;
      if (updated) {
        const {name, description, visible, category, image} = updated;
        body = {name, description, visible, category, image};
        if (!id) Object.assign(body, {id: updated.id, kind});
        if (id && image === old.image) delete body.image;
      }
      const [saved] = await request(path, {method, token, body});
      if (!saved) throw Error('The entry was not changed. Refresh and sign in again.');
      if (credentials !== token) return;
      const entries = data[kind];
      const index = entries.findIndex(item => item.id === id);
      if (method === 'DELETE') entries.splice(index, 1);
      else if (id) entries[index] = saved;
      else entries.push(saved);
      render();
      renderAdmin();
      form.hidden = true;
      adminStatus.textContent = 'Saved. Visitors will see the change on their next page load.';
    } catch (error) {
      if (credentials === token) adminStatus.textContent = 'Could not save: ' + error.message;
    } finally {
      saving = false;
    }
  }
  function edit(item) {
    editingId=item?.id || null; imageData=null; form.reset(); form.elements.name.value=item?.name || ''; form.elements.description.value=item?.description || ''; form.elements.category.value=item?.category || 'major'; form.elements.visible.checked=item ? item.visible : true;
    $('form-title').textContent=item?'Edit entry':'Add new'; $('logo-preview').hidden=!item?.image; if(item?.image) $('logo-preview').src=item.image;
    form.hidden=false; form.elements.name.focus();
  }
  $('manage-button').onclick=()=>$('admin-dialog').showModal(); $('close-admin').onclick=()=>$('admin-dialog').close();
  $('new-item').onclick=()=>edit(null); $('cancel-edit').onclick=()=>form.hidden=true;
  const loginForm = $('login-form');
  $('logout').onclick = async () => {
    const token = credentials;
    credentials = null;
    loginForm.reset();
    loginForm.hidden = false;
    $('editor').hidden = true;
    $('admin-list').replaceChildren();
    form.hidden = true;
    data = {[kind]: data[kind].filter(item => item.visible)};
    render();
    adminStatus.textContent = 'Signed out.';
    if (token) await request('/auth/v1/logout?scope=local', {method: 'POST', token}).catch(() => {});
  };
  $('category-label').hidden = kind !== 'factions';
  $('image-label').hidden = kind !== 'factions';
  $('image-help').hidden = kind !== 'factions';
  loginForm.onsubmit = async event => {
    event.preventDefault();
    const button = loginForm.querySelector('button');
    button.disabled = true;
    const {email, password} = loginForm.elements;
    adminStatus.textContent = 'Signing in…';
    try {
      const session = await request('/auth/v1/token?grant_type=password', {
        method: 'POST', body: {email: email.value.trim(), password: password.value}
      });
      if (session.user?.id !== adminId) throw Error('This account does not have editor access.');
      data = await load(session.access_token);
      credentials = session.access_token;
      password.value = '';
      loginForm.hidden = true;
      $('editor').hidden = false;
      render();
      renderAdmin();
      adminStatus.textContent = 'Signed in.';
    } catch (error) {
      adminStatus.textContent = 'Could not sign in: ' + error.message;
    } finally {
      button.disabled = false;
    }
  };
  form.elements.image.onchange=async event=>{const file=event.target.files[0]; if(!file)return; if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){adminStatus.textContent='Choose a PNG, JPEG, or WebP image under 10 MB.'; event.target.value='';return;} try {const bitmap=await createImageBitmap(file); const canvas=document.createElement('canvas'); canvas.width=256;canvas.height=256; const size=Math.min(bitmap.width,bitmap.height); canvas.getContext('2d').drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,256,256); bitmap.close(); imageData=canvas.toDataURL('image/webp',0.85); $('logo-preview').src=imageData; $('logo-preview').hidden=false; adminStatus.textContent='';}catch {adminStatus.textContent='Could not read that image.';event.target.value='';}};
  form.onsubmit=event=>{event.preventDefault(); const fields=form.elements; const name=fields.name.value.trim(), description=fields.description.value.trim(); if(!name||!description){adminStatus.textContent='Enter a name and description.';return;} const id=editingId, visible=fields.visible.checked, category=fields.category.value, image=imageData; mutate(id,old=>({...(old||{id:crypto.randomUUID()}),name,description,visible,...(kind==='factions'?{category,image:image || old?.image || ''}:{})}));};
  load().then(result => {
    if (!credentials) { data = result; render(); }
  }).catch(() => {
    if (!credentials) status.textContent = 'Content could not be loaded. Please try again later.';
  });
})();



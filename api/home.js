import fs from 'node:fs';
import path from 'node:path';

export default function handler(req, res) {
  try {
    const file = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(file, 'utf8');

    const injection = `
<style>
.providerActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
</style>
<script>
(function(){
  let editingProviderId=null;
  const originalSaveProvider=window.saveProvider;
  const originalCloseProvider=window.closeProvider;

  function resetProviderForm(){
    editingProviderId=null;
    const title=document.querySelector('#providerModal .box h2');
    const saveBtn=document.querySelector('#providerModal .modalActions .primary');
    if(title)title.textContent='Add AI Provider';
    if(saveBtn)saveBtn.textContent='Save Provider';
  }

  window.editProvider=function(id){
    const p=(window.providers||[]).find(x=>x.id===id);
    if(!p)return;
    editingProviderId=id;
    document.getElementById('pName').value=p.name||'';
    document.getElementById('pType').value=p.type||'text';
    document.getElementById('pBase').value=p.baseUrl||'';
    document.getElementById('pModel').value=p.model||'';
    document.getElementById('pUser').value=p.apiUser||'';
    document.getElementById('pKey').value='';
    document.getElementById('pKey').placeholder=p.apiKey?'Leave blank to keep current API key':'API key';
    document.getElementById('pSize').value=p.size||'1024x1024';
    const title=document.querySelector('#providerModal .box h2');
    const saveBtn=document.querySelector('#providerModal .modalActions .primary');
    if(title)title.textContent='Edit AI Provider';
    if(saveBtn)saveBtn.textContent='Save Changes';
    if(typeof window.toggleImageFields==='function')window.toggleImageFields();
    document.getElementById('providerStatus').textContent='Editing '+(p.name||'provider');
    document.getElementById('providerModal').classList.add('show');
  };

  window.closeProvider=function(){
    if(typeof originalCloseProvider==='function')originalCloseProvider();
    resetProviderForm();
  };

  window.saveProvider=function(){
    if(!editingProviderId){
      return originalSaveProvider();
    }
    const p=(window.providers||[]).find(x=>x.id===editingProviderId);
    const status=document.getElementById('providerStatus');
    if(!p){status.textContent='Provider no longer exists.';resetProviderForm();return;}
    const name=document.getElementById('pName').value.trim();
    const type=document.getElementById('pType').value;
    const baseUrl=document.getElementById('pBase').value.trim().replace(/\\/$/,'');
    const model=document.getElementById('pModel').value.trim();
    const apiUser=document.getElementById('pUser').value.trim();
    const apiKey=document.getElementById('pKey').value.trim();
    const size=document.getElementById('pSize').value;
    if(!name||!baseUrl||!model){status.textContent='Name, Base URL and Model are required.';return;}
    const oldType=p.type;
    p.name=name;p.type=type;p.baseUrl=baseUrl;p.model=model;p.apiUser=apiUser;p.size=size;
    if(apiKey)p.apiKey=apiKey;
    if(oldType!==type){
      const sameType=(window.providers||[]).filter(x=>x.type===type);
      p.active=sameType.length===0;
      if(p.active)(window.providers||[]).filter(x=>x!==p&&x.type===type).forEach(x=>x.active=false);
    }
    if(typeof window.save==='function')window.save();
    if(typeof window.renderProviders==='function')window.renderProviders();
    status.textContent='Provider updated successfully.';
    setTimeout(function(){
      const modal=document.getElementById('providerModal');
      if(modal)modal.classList.remove('show');
      resetProviderForm();
    },400);
  };

  const originalProviderHtml=window.providerHtml;
  window.providerHtml=function(type){
    const arr=(window.providers||[]).filter(p=>p.type===type);
    if(!arr.length)return '<div class="empty">No '+type+' provider configured.</div>';
    return arr.map(function(p){
      const safeId=String(p.id).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      const name=typeof window.esc==='function'?window.esc(p.name):String(p.name||'');
      const model=typeof window.esc==='function'?window.esc(p.model):String(p.model||'');
      const base=typeof window.esc==='function'?window.esc(p.baseUrl):String(p.baseUrl||'');
      return '<div class="provider"><div class="providerHead"><b>'+name+'</b><span class="muted">'+(p.active?'ACTIVE':'')+'</span></div><div class="muted">Default model: '+model+' · '+base+'</div><div class="providerActions"><button class="btn" onclick="setActive(\\''+safeId+'\\')">Use This</button><button class="btn" onclick="editProvider(\\''+safeId+'\\')">Edit</button><button class="btn" onclick="removeProvider(\\''+safeId+'\\')">Remove</button></div></div>';
    }).join('');
  };
})();
</script>`;

    html = html.replace('</body>', injection + '</body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send('Unable to load the vocabulary app. ' + error.message);
  }
}

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
  const getProviders=function(){return window.eval('providers')};
  const persist=function(){window.eval('save()')};
  const render=function(){window.eval('renderProviders()')};

  function resetProviderForm(){
    editingProviderId=null;
    const title=document.querySelector('#providerModal .box h2');
    const saveBtn=document.querySelector('#providerModal .modalActions .primary');
    if(title)title.textContent='Add AI Provider';
    if(saveBtn)saveBtn.textContent='Save Provider';
    const key=document.getElementById('pKey');
    if(key)key.placeholder='API key';
  }

  window.editProvider=function(id){
    const p=getProviders().find(function(x){return x.id===id});
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
    if(!editingProviderId)return originalSaveProvider();
    const list=getProviders();
    const p=list.find(function(x){return x.id===editingProviderId});
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
      const sameType=list.filter(function(x){return x.type===type&&x!==p});
      p.active=sameType.length===0;
      if(p.active)list.filter(function(x){return x!==p&&x.type===type}).forEach(function(x){x.active=false});
    }
    persist();
    render();
    status.textContent='Provider updated successfully.';
    setTimeout(function(){
      const modal=document.getElementById('providerModal');
      if(modal)modal.classList.remove('show');
      resetProviderForm();
    },400);
  };

  function addEditButtons(){
    const containers=[
      {el:document.getElementById('textProviders'),type:'text'},
      {el:document.getElementById('imageProviders'),type:'image'}
    ];
    containers.forEach(function(group){
      if(!group.el)return;
      const providers=getProviders().filter(function(p){return p.type===group.type});
      group.el.querySelectorAll('.provider').forEach(function(card,index){
        if(card.querySelector('.editProviderBtn'))return;
        const p=providers[index];
        if(!p)return;
        const actions=card.querySelector('div[style*="margin-top:10px"]');
        if(!actions)return;
        const btn=document.createElement('button');
        btn.className='btn editProviderBtn';
        btn.type='button';
        btn.textContent='Edit';
        btn.addEventListener('click',function(){window.editProvider(p.id)});
        actions.appendChild(document.createTextNode(' '));
        actions.appendChild(btn);
      });
    });
  }

  function observeProviders(){
    const text=document.getElementById('textProviders');
    const image=document.getElementById('imageProviders');
    if(!text&&!image)return;
    [text,image].filter(Boolean).forEach(function(el){
      new MutationObserver(addEditButtons).observe(el,{childList:true,subtree:true});
    });
    addEditButtons();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeProviders);else observeProviders();
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

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
  const originalApi=window.api;

  function splitModels(value){
    return String(value||'').split(/[\\n,]+/).map(function(x){return x.trim()}).filter(Boolean);
  }
  function uniqueModels(list){
    const seen=new Set();
    return list.filter(function(x){const k=String(x).trim();if(!k||seen.has(k))return false;seen.add(k);return true;});
  }
  function resetProviderForm(){
    editingProviderId=null;
    const title=document.querySelector('#providerModal .box h2');
    const saveBtn=document.querySelector('#providerModal .modalActions .primary');
    if(title)title.textContent='Add AI Provider';
    if(saveBtn)saveBtn.textContent='Save Provider';
    const key=document.getElementById('pKey');
    if(key)key.placeholder='API key';
  }

  // Keep the existing Add/Edit/Remove provider behavior, but make the model field
  // a real list: comma/newline-separated saved models are displayed individually.
  window.editProvider=function(id){
    const p=getProviders().find(function(x){return x.id===id});
    if(!p)return;
    editingProviderId=id;
    document.getElementById('pName').value=p.name||'';
    document.getElementById('pType').value=p.type||'text';
    document.getElementById('pBase').value=p.baseUrl||'';
    document.getElementById('pModel').value=splitModels(p.model).join(', ');
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
    const model=splitModels(document.getElementById('pModel').value).join(', ');
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

  function providerHtml(type){
    const arr=getProviders().filter(function(p){return p.type===type});
    if(!arr.length)return '<div class="empty">No '+type+' provider configured.</div>';
    const esc=window.esc||function(v){return String(v==null?'':v)};
    return arr.map(function(p){
      const models=splitModels(p.model);
      const modelText=models.length>1?models.length+' models: '+models.join(', '):(models[0]||'No model');
      const id=String(p.id).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return '<div class="provider"><div class="providerHead"><b>'+esc(p.name)+'</b><span class="muted">'+(p.active?'ACTIVE':'')+'</span></div><div class="muted">Models: '+esc(modelText)+' · '+esc(p.baseUrl)+'</div><div class="providerActions"><button class="btn" onclick="setActive(\\''+id+'\\')">Use This</button><button class="btn" onclick="editProvider(\\''+id+'\\')">Edit</button><button class="btn" onclick="removeProvider(\\''+id+'\\')">Remove</button></div></div>';
    }).join('');
  }

  // Replace the app's provider renderer so the settings page also shows every
  // saved model rather than treating a comma-separated string as one model.
  window.renderProviders=function(){
    document.getElementById('textProviders').innerHTML=providerHtml('text');
    document.getElementById('imageProviders').innerHTML=providerHtml('image');
  };

  // The original app calls /api/ai for model discovery. Pass the provider type so
  // the server can return Pollinations' image-only registry for Image AI.
  window.api=async function(action,p,extra){
    extra=extra||{};
    const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({baseUrl:p.baseUrl,apiKey:p.apiKey,apiUser:p.apiUser,action:action},extra))});
    const j=await r.json();
    if(!r.ok)throw Error(j.error||j.message||j.detail||'AI request failed');
    return j;
  };

  window.listModels=async function(p){
    const j=await window.api('models',p,{type:p.type});
    const raw=Array.isArray(j)?j:(j.data||j.models||[]);
    return raw.map(function(x){
      if(typeof x==='string')return x;
      return x&& (x.id||x.name||x.model);
    }).filter(Boolean);
  };

  window.fillModels=async function(type,providerId,selectId,statusId){
    const p=getProviders().find(function(x){return x.id===providerId})||window.eval('active(type)');
    const sel=document.getElementById(selectId),st=statusId?document.getElementById(statusId):null;
    if(!p){sel.innerHTML='<option value="">No provider</option>';return;}
    if(st)st.textContent='Loading models...';
    sel.innerHTML='<option>Loading...</option>';
    try{
      const saved=splitModels(p.model);
      const remote=await window.listModels(p);
      const models=uniqueModels(saved.concat(remote));
      sel.innerHTML=models.length?models.map(function(m){return '<option value="'+esc(m)+'">'+esc(m)+'</option>'}).join(''):'<option value="">No models returned</option>';
      if(st)st.textContent=models.length+' model'+(models.length===1?'':'s')+' available.';
    }catch(e){
      const saved=splitModels(p.model);
      sel.innerHTML=saved.length?saved.map(function(m){return '<option value="'+esc(m)+'">'+esc(m)+'</option>'}).join(''):'<option value="">No models</option>';
      if(st)st.textContent=saved.length?'Saved model list loaded. Live refresh failed: '+e.message:'Could not load model list: '+e.message;
    }
  };

  function patchAddProviderSelect(){
    const add=document.getElementById('addProvider');
    if(!add)return;
    const old=add.value;
    const ps=getProviders().filter(function(p){return p.type==='text'});
    add.innerHTML=ps.length?ps.map(function(p){
      const ms=splitModels(p.model); const label=ms.length>1?ms.length+' models':(ms[0]||'No model');
      return '<option value="'+esc(p.id)+'">'+esc(p.name)+' — '+esc(label)+'</option>';
    }).join(''):'<option value="">No text provider configured</option>';
    if(ps.some(function(p){return p.id===old}))add.value=old;
  }

  const oldOpenAdd=window.openAdd;
  window.openAdd=function(){
    if(typeof oldOpenAdd==='function')oldOpenAdd();
    patchAddProviderSelect();
    if(typeof window.onAddProviderChange==='function')window.onAddProviderChange();
  };

  function patchImageProviderSelect(){
    const el=document.getElementById('imageProvider');
    if(!el)return;
    const old=el.value;
    const ps=getProviders().filter(function(p){return p.type==='image'});
    el.innerHTML=ps.length?ps.map(function(p){
      const ms=splitModels(p.model); const label=ms.length>1?ms.length+' models':(ms[0]||'No model');
      return '<option value="'+esc(p.id)+'">'+esc(p.name)+' — '+esc(label)+'</option>';
    }).join(''):'<option value="">No image provider configured</option>';
    if(ps.some(function(p){return p.id===old}))el.value=old;
  }
  const oldOpenImagePicker=window.openImagePicker;
  window.openImagePicker=function(){
    if(typeof oldOpenImagePicker==='function')oldOpenImagePicker();
    patchImageProviderSelect();
    if(typeof window.onImageProviderChange==='function')window.onImageProviderChange();
  };

  function refreshSettings(){
    try{window.renderProviders();}catch(e){}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshSettings);else refreshSettings();
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

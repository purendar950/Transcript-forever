import fs from 'node:fs';
import path from 'node:path';

export default function handler(req, res) {
  try {
    const file = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    const injection = `
<style>
.providerActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.modelListNote{font-size:11px;color:#687080;margin-top:5px}
</style>
<script>
(function(){
  function app(name){return window.eval(name)}
  function providers(){return app('providers')}
  function splitModels(v){return String(v||'').split(/[\\n,]+/).map(function(x){return x.trim()}).filter(Boolean)}
  function esc(v){return String(v==null?'':v).replace(/[&<>\"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m})}
  function savedModels(p){return splitModels(p&&p.model)}
  function active(type){return app('active')(type)}
  function save(){app('save')()}

  window.renderProviders=function(){
    function html(type){
      var arr=providers().filter(function(p){return p.type===type});
      if(!arr.length)return '<div class="empty">No '+type+' provider configured.</div>';
      return arr.map(function(p){
        var ms=savedModels(p);
        var label=ms.length?ms.length+' saved model'+(ms.length===1?'':'s')+': '+ms.join(', '):'No saved model';
        var id=String(p.id).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        return '<div class="provider"><div class="providerHead"><b>'+esc(p.name)+'</b><span class="muted">'+(p.active?'ACTIVE':'')+'</span></div><div class="muted">Models: '+esc(label)+' · '+esc(p.baseUrl)+'</div><div class="providerActions"><button class="btn" onclick="setActive(\\''+id+'\\')">Use This</button><button class="btn" onclick="editProvider(\\''+id+'\\')">Edit</button><button class="btn" onclick="removeProvider(\\''+id+'\\')">Remove</button></div></div>';
      }).join('');
    }
    document.getElementById('textProviders').innerHTML=html('text');
    document.getElementById('imageProviders').innerHTML=html('image');
  };

  function fillSaved(type,providerId,selectId,statusId){
    var p=providers().find(function(x){return x.id===providerId})||active(type);
    var sel=document.getElementById(selectId),st=statusId?document.getElementById(statusId):null;
    if(!p){sel.innerHTML='<option value="">No provider</option>';if(st)st.textContent='';return}
    var models=savedModels(p);
    sel.innerHTML=models.length?models.map(function(m){return '<option value="'+esc(m)+'">'+esc(m)+'</option>'}).join(''):'<option value="">No saved model</option>';
    if(st)st.textContent=models.length?models.length+' saved model'+(models.length===1?'':'s')+' available.':'No saved model. Add models in AI Settings.';
  }
  window.fillModels=fillSaved;
  window.listModels=async function(){return[]};

  function patchProviderSelect(id,type){
    var el=document.getElementById(id);if(!el)return;
    var old=el.value,ps=providers().filter(function(p){return p.type===type});
    el.innerHTML=ps.length?ps.map(function(p){var ms=savedModels(p);var label=ms.length?ms.length+' saved model'+(ms.length===1?'':'s'):'No model';return '<option value="'+esc(p.id)+'">'+esc(p.name)+' — '+esc(label)+'</option>'}).join(''):'<option value="">No '+type+' provider configured</option>';
    if(ps.some(function(p){return p.id===old}))el.value=old;
  }

  window.editProvider=function(id){
    var p=providers().find(function(x){return x.id===id});if(!p)return;
    window._editingProviderId=id;
    document.getElementById('pName').value=p.name||'';
    document.getElementById('pType').value=p.type||'text';
    document.getElementById('pBase').value=p.baseUrl||'';
    document.getElementById('pModel').value=savedModels(p).join(', ');
    document.getElementById('pUser').value=p.apiUser||'';
    document.getElementById('pKey').value='';
    document.getElementById('pKey').placeholder=p.apiKey?'Leave blank to keep current API key':'API key';
    document.getElementById('pSize').value=p.size||'1024x1024';
    document.querySelector('#providerModal .box h2').textContent='Edit AI Provider';
    document.querySelector('#providerModal .modalActions .primary').textContent='Save Changes';
    app('toggleImageFields')();
    document.getElementById('providerStatus').textContent='Editing '+(p.name||'provider');
    document.getElementById('providerModal').classList.add('show');
  };

  var originalSave=window.saveProvider,originalClose=window.closeProvider;
  window.saveProvider=function(){
    var id=window._editingProviderId;
    if(!id)return originalSave();
    var p=providers().find(function(x){return x.id===id}),status=document.getElementById('providerStatus');
    if(!p){status.textContent='Provider no longer exists.';return}
    var name=document.getElementById('pName').value.trim(),type=document.getElementById('pType').value,base=document.getElementById('pBase').value.trim().replace(/\\/$/,''),models=splitModels(document.getElementById('pModel').value),user=document.getElementById('pUser').value.trim(),key=document.getElementById('pKey').value.trim(),size=document.getElementById('pSize').value;
    if(!name||!base||!models.length){status.textContent='Name, Base URL and at least one Model are required.';return}
    var oldType=p.type;p.name=name;p.type=type;p.baseUrl=base;p.model=models.join(', ');p.apiUser=user;p.size=size;if(key)p.apiKey=key;
    if(oldType!==type){var same=providers().filter(function(x){return x!==p&&x.type===type});p.active=same.length===0;if(p.active)same.forEach(function(x){x.active=false})}
    save();window.renderProviders();status.textContent='Provider updated successfully.';
    setTimeout(function(){document.getElementById('providerModal').classList.remove('show');window._editingProviderId=null;document.querySelector('#providerModal .box h2').textContent='Add AI Provider';document.querySelector('#providerModal .modalActions .primary').textContent='Save Provider';},350);
  };
  window.closeProvider=function(){if(originalClose)originalClose();window._editingProviderId=null;document.querySelector('#providerModal .box h2').textContent='Add AI Provider';document.querySelector('#providerModal .modalActions .primary').textContent='Save Provider'};

  var oldOpenAdd=window.openAdd;
  window.openAdd=function(){if(oldOpenAdd)oldOpenAdd();patchProviderSelect('addProvider','text');fillSaved('text',document.getElementById('addProvider').value,'addModel','addStatus')};
  window.onAddProviderChange=function(){fillSaved('text',document.getElementById('addProvider').value,'addModel','addStatus')};
  window.refreshAddModels=function(){fillSaved('text',document.getElementById('addProvider').value,'addModel','addStatus')};

  var oldOpenImage=window.openImagePicker;
  window.openImagePicker=function(){if(oldOpenImage)oldOpenImage();patchProviderSelect('imageProvider','image');fillSaved('image',document.getElementById('imageProvider').value,'imageModel','imagePickerStatus')};
  window.onImageProviderChange=function(){fillSaved('image',document.getElementById('imageProvider').value,'imageModel','imagePickerStatus')};
  window.refreshImageModels=function(){fillSaved('image',document.getElementById('imageProvider').value,'imageModel','imagePickerStatus')};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){window.renderProviders()});else window.renderProviders();
})();
</script>`;
    html=html.replace('</body>',injection+'</body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    return res.status(200).send(html);
  } catch(error) {
    return res.status(500).send('Unable to load the vocabulary app. '+error.message);
  }
}

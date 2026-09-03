import fs from 'node:fs';
import path from 'node:path';

export default function handler(req, res) {
  try {
    let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const injection = `
<style>
.providerActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.wordStatus{display:inline-flex!important;align-items:center;padding:5px 11px;border-radius:14px;font-size:11px;font-weight:800;margin-left:8px;vertical-align:middle;visibility:visible!important;opacity:1!important}
.wordStatus.learned{background:#e8f8ee;color:#14894a;border:1px solid #b8e1c4}
.wordStatus.weak{background:#fff1f3;color:#d84662;border:1px solid #efb4c0}
.wordStatus.unseen{background:#edf5ff;color:#3471cb;border:1px solid #bfd8f5}
.deleteWordBtn{border-color:#e6859a!important;color:#d84662!important;background:#fff!important}
.deleteWordBtn:disabled{opacity:.55;cursor:not-allowed}
.deleteAllWordsBtn{border-color:#e6859a!important;color:#d84662!important;background:#fff!important}
.wordItem{position:relative}
.wordItem .wordStatus{margin:7px 0 0}
</style>
<script>
(function(){
  function app(name){return window.eval(name)}
  function providers(){return app('providers')}
  function active(type){return app('active')(type)}
  function save(){return app('save')()}
  function words(){return app('words')}
  function stateFor(word){return app('stateFor')(word)}
  function progress(){return app('progress')}
  function esc(v){return String(v==null?'':v).replace(/[&<>\\"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;'}[m]||m})}
  function splitModels(v){return String(v||'').split(/[\\n,]+/).map(function(x){return x.trim()}).filter(Boolean)}
  function savedModels(p){return splitModels(p&&p.model)}

  function statusInfo(word){
    var s=stateFor(word),status=s&&s.status?String(s.status):'unseen';
    if(status==='learned')return {label:'LEARNED',cls:'learned'};
    if(status==='weak')return {label:'WEAK',cls:'weak'};
    return {label:'NOT READY',cls:'unseen'};
  }

  function currentWord(){
    var el=document.getElementById('word');
    return el?String(el.textContent||'').trim():'';
  }

  function updateCurrentStatus(){
    var word=currentWord(),el=document.getElementById('wordStatus');
    if(!word||!el)return;
    var info=statusInfo(word);
    el.textContent=info.label;
    el.className='wordStatus '+info.cls;
    el.style.display='inline-flex';
  }

  function ensureWordControls(){
    var actions=document.querySelector('#flash .titlebar .actions');
    if(actions&&!document.getElementById('deleteCurrentWord')){
      var add=actions.querySelector('button[onclick*="openAdd"]');
      var b=document.createElement('button');
      b.id='deleteCurrentWord';b.className='btn deleteWordBtn';b.type='button';b.textContent='Delete Word';b.onclick=window.deleteCurrentWord;
      if(add)actions.insertBefore(b,add);else actions.prepend(b);
    }
    var addButton=actions&&actions.querySelector('button[onclick*="openAdd"]');
    if(actions&&!document.getElementById('deleteAllWords')){
      var b2=document.createElement('button');
      b2.id='deleteAllWords';b2.className='btn deleteAllWordsBtn';b2.type='button';b2.textContent='Delete All Words';b2.onclick=window.deleteAllWords;
      if(addButton)actions.insertBefore(b2,addButton);else actions.appendChild(b2);
    }
    var wordEl=document.getElementById('word');
    if(wordEl&&!document.getElementById('wordStatus')){
      var s=document.createElement('span');
      s.id='wordStatus';s.className='wordStatus unseen';s.textContent='NOT READY';
      wordEl.insertAdjacentElement('afterend',s);
    }
    updateCurrentStatus();
  }

  window.deleteCurrentWord=function(){
    var ws=words(),idx=app('idx'),seed=app('seed'),d=ws[idx];
    if(!d||idx<seed.length){alert('Built-in SSC words cannot be deleted.');return}
    if(!window.confirm('Delete “'+d.word+'” from My Vocabulary?'))return;
    ws.splice(idx,1);
    if(idx>=ws.length)app('idx = Math.max(0, words.length - 1)');
    save();
    app('render')();
    if(document.getElementById('vocab')?.classList.contains('active'))app('renderList')();
    ensureWordControls();
    var t=document.getElementById('toast');if(t){t.textContent='Word deleted';t.style.display='block';setTimeout(function(){t.style.display='none'},1800)}
  };

  window.deleteAllWords=function(){
    var ws=words(),seed=app('seed');
    var count=Math.max(0,ws.length-seed.length);
    if(!count){alert('There are no user-added words to delete.');return}
    if(!window.confirm('Delete all '+count+' user-added words? Built-in SSC words will remain.'))return;
    ws.splice(seed.length);
    var p=progress();
    Object.keys(p).forEach(function(k){if(!seed.some(function(d){return d.word===k}))delete p[k]});
    app('idx = Math.min(idx, words.length - 1)');
    save();
    app('render')();
    app('renderList')();
    ensureWordControls();
    var t=document.getElementById('toast');if(t){t.textContent='All user-added words deleted';t.style.display='block';setTimeout(function(){t.style.display='none'},1800)}
  };

  window.editProvider=function(id){
    var p=providers().find(function(x){return x.id===id}); if(!p)return;
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

  var originalSave=window.saveProvider, originalClose=window.closeProvider;
  window.saveProvider=function(){
    var id=window._editingProviderId;
    if(!id)return originalSave();
    var p=providers().find(function(x){return x.id===id}),status=document.getElementById('providerStatus');
    if(!p){status.textContent='Provider no longer exists.';return}
    var name=document.getElementById('pName').value.trim();
    var type=document.getElementById('pType').value;
    var base=document.getElementById('pBase').value.trim().replace(/\\/$/,'');
    var models=splitModels(document.getElementById('pModel').value);
    var user=document.getElementById('pUser').value.trim();
    var key=document.getElementById('pKey').value.trim();
    var size=document.getElementById('pSize').value;
    if(!name||!base||!models.length){status.textContent='Name, Base URL and at least one Model are required.';return}
    var oldType=p.type;
    p.name=name;p.type=type;p.baseUrl=base;p.model=models.join(', ');p.apiUser=user;p.size=size;
    if(key)p.apiKey=key;
    if(oldType!==type){
      var same=providers().filter(function(x){return x!==p&&x.type===type});
      p.active=same.length===0;if(p.active)same.forEach(function(x){x.active=false});
    }
    save(); status.textContent='Provider updated successfully.'; ensureEditButtons();
    setTimeout(function(){
      document.getElementById('providerModal').classList.remove('show');
      window._editingProviderId=null;
      document.querySelector('#providerModal .box h2').textContent='Add AI Provider';
      document.querySelector('#providerModal .modalActions .primary').textContent='Save Provider';
    },350);
  };
  window.closeProvider=function(){
    if(originalClose)originalClose();
    window._editingProviderId=null;
    var h=document.querySelector('#providerModal .box h2'),b=document.querySelector('#providerModal .modalActions .primary');
    if(h)h.textContent='Add AI Provider'; if(b)b.textContent='Save Provider';
  };

  function addEditButton(box,p){
    if(!box||!p||box.querySelector('[data-edit-provider]'))return;
    var actions=box.querySelector('.providerActions')||box.querySelector('div[style*="margin-top"]');
    if(!actions)return;
    var b=document.createElement('button');
    b.className='btn'; b.type='button'; b.textContent='Edit'; b.setAttribute('data-edit-provider','1');
    b.onclick=function(){window.editProvider(p.id)};
    actions.appendChild(b);
  }

  function ensureEditButtons(){
    ['textProviders','imageProviders'].forEach(function(cid){
      var root=document.getElementById(cid); if(!root)return;
      root.querySelectorAll('.provider').forEach(function(box){
        var nameEl=box.querySelector('.providerHead b');
        if(!nameEl)return;
        var p=providers().find(function(x){return x.name===nameEl.textContent.trim()});
        if(p)addEditButton(box,p);
      });
    });
  }

  function fillSaved(type,providerId,selectId,statusId){
    var p=providers().find(function(x){return x.id===providerId})||active(type);
    var sel=document.getElementById(selectId),st=statusId?document.getElementById(statusId):null;
    if(!sel)return;
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

  var oldRender=window.renderProviders;
  window.renderProviders=function(){if(oldRender)oldRender();setTimeout(ensureEditButtons,0)};
  var oldRenderFlash=window.render;
  window.render=function(){if(oldRenderFlash)oldRenderFlash();setTimeout(function(){ensureWordControls();ensureEditButtons()},0)};
  var oldOpenAdd=window.openAdd;
  window.openAdd=function(){if(oldOpenAdd)oldOpenAdd();patchProviderSelect('addProvider','text');fillSaved('text',document.getElementById('addProvider').value,'addModel','addStatus')};
  window.onAddProviderChange=function(){fillSaved('text',document.getElementById('addProvider').value,'addModel','addStatus')};
  window.refreshAddModels=function(){fillSaved('text',document.getElementById('addProvider').value,'addModel','addStatus')};

  var oldOpenImage=window.openImagePicker;
  window.openImagePicker=function(){if(oldOpenImage)oldOpenImage();patchProviderSelect('imageProvider','image');fillSaved('image',document.getElementById('imageProvider').value,'imageModel','imagePickerStatus')};
  window.onImageProviderChange=function(){fillSaved('image',document.getElementById('imageProvider').value,'imageModel','imagePickerStatus')};
  window.refreshImageModels=function(){fillSaved('image',document.getElementById('imageProvider').value,'imageModel','imagePickerStatus')};

  var oldRenderList=window.renderList;
  window.renderList=function(){
    if(oldRenderList)oldRenderList();
    setTimeout(function(){
      var ws=words(),seed=app('seed');
      document.querySelectorAll('#wordList .wordItem').forEach(function(box,i){
        var d=ws[seed.length+i];if(!d)return;
        var info=statusInfo(d.word),badge=box.querySelector('.wordStatus');
        if(!badge){badge=document.createElement('span');box.appendChild(badge)}
        badge.className='wordStatus '+info.cls;badge.textContent=info.label;badge.style.display='inline-flex';
      });
      ensureWordControls();
    },0);
  };

  function start(){
    ensureWordControls();
    ensureEditButtons();
    var word=document.getElementById('word');
    if(word)new MutationObserver(function(){ensureWordControls()}).observe(word,{childList:true,characterData:true,subtree:true});
    ['textProviders','imageProviders'].forEach(function(cid){
      var root=document.getElementById(cid);if(!root)return;
      new MutationObserver(function(){ensureEditButtons()}).observe(root,{childList:true,subtree:true});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
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

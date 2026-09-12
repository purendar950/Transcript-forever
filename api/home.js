import fs from 'node:fs';
import path from 'node:path';

export default function handler(req, res) {
  try {
    let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const injection = `
<link rel="stylesheet" href="/css/architecture.css">
<link rel="stylesheet" href="/css/mobile-android.css">
<link rel="stylesheet" href="/css/mobile-controls.css">
<script type="module" src="/js/app-shell.js"></script>
<script type="module" src="/js/dashboard.js"></script>
<script type="module" src="/js/flashcards.js"></script>
<script type="module" src="/js/vocabulary.js"></script>
<script type="module" src="/js/practice.js"></script>
<script type="module" src="/js/quiz.js"></script>
<script type="module" src="/js/progress.js"></script>
<script type="module" src="/js/settings.js"></script>
<script type="module" src="/js/model-selector.js"></script>
<script type="module" src="/js/mobile-controls.js"></script>
<script type="module" src="/js/ai-response-safety.js"></script>
<script type="module" src="/js/ai-card-recovery.js"></script>
<link rel="stylesheet" href="/css/model-source-mobile.css">
<style>
.providerActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.providerActions .editProviderBtn{border-color:#6724e8;color:#6724e8;background:#fff}
/* Multi-model editor: one model field + a clear + button and removable model chips. */
.pmModelRow{display:flex;gap:8px;align-items:stretch;margin-top:6px}
.pmModelRow #pModel{flex:1;min-width:0;margin-top:0}
.pmAddModelBtn{width:46px;min-width:46px;height:42px;border:1px solid #6724e8;border-radius:7px;background:#6724e8;color:#fff;font-size:25px;font-weight:800;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0}
.pmAddModelBtn:hover{background:#5a1fd1}
.pmAddModelBtn:active{transform:scale(.98)}
.pmModelChips{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}
.pmModelChip{display:inline-flex;align-items:center;gap:7px;max-width:100%;padding:5px 7px 5px 10px;border:1px solid #d9ccfb;border-radius:999px;background:#f1ecfe;color:#3d2470;font-size:12px;font-weight:700}
.pmModelChipName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pmRemoveModel{width:20px;height:20px;border:0;border-radius:50%;background:transparent;color:#6b21a8;display:grid;place-items:center;padding:0;cursor:pointer;font-weight:900;line-height:1}
.pmRemoveModel:hover{background:#e2d6fd}
.pmModelHint{font-size:11px;color:#687080;margin-top:5px}
@media(max-width:700px){.pmAddModelBtn{width:50px;min-width:50px;height:46px;font-size:27px}.pmModelChips{gap:6px}.pmModelChip{font-size:12px}}
</style>
<script>
(function(){
  function models(v){return String(v||'').split(/[\\n,]+/).map(function(x){return x.trim()}).filter(Boolean)}
  function getProviders(){try{return JSON.parse(localStorage.getItem('sscAIProviders')||'[]')}catch(e){return[]}}
  function putProviders(p){localStorage.setItem('sscAIProviders',JSON.stringify(p))}
  function getId(box){var b=box.querySelector('button[onclick*=\"setActive\"]');var m=b&&b.getAttribute('onclick').match(/setActive\\(['\"]([^'\"]+)/);return m?m[1]:null}
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])})}

  function initModelEditor(){
    var input=document.getElementById('pModel');
    if(!input||input.dataset.multiModelReady)return;
    input.dataset.multiModelReady='1';
    var row=document.createElement('div');row.className='pmModelRow';
    input.parentNode.insertBefore(row,input);row.appendChild(input);
    var add=document.createElement('button');add.type='button';add.className='pmAddModelBtn';add.textContent='+';add.title='Add another model';add.setAttribute('aria-label','Add another model');row.appendChild(add);
    var chips=document.createElement('div');chips.className='pmModelChips';chips.setAttribute('aria-label','Selected models');row.parentNode.insertBefore(chips,row.nextSibling);
    var hint=document.createElement('div');hint.className='pmModelHint';hint.textContent='Add multiple model IDs with +. The models will be tried in the order shown.';row.parentNode.insertBefore(hint,chips.nextSibling);

    function render(){
      var list=models(input.dataset.modelList||'');
      chips.innerHTML=list.map(function(m){return '<span class="pmModelChip" title="'+esc(m)+'"><span class="pmModelChipName">'+esc(m)+'</span><button type="button" class="pmRemoveModel" data-model="'+esc(m)+'" aria-label="Remove '+esc(m)+'">×</button></span>';}).join('');
    }
    function commitDraft(){
      var draft=input.value.trim();
      if(!draft)return;
      var list=models(input.dataset.modelList||'');
      draft.split(/[\\n,]+/).map(function(x){return x.trim()}).filter(Boolean).forEach(function(m){if(!list.some(function(x){return x.toLowerCase()===m.toLowerCase()}))list.push(m);});
      input.dataset.modelList=list.join(', ');input.value='';render();
    }
    function load(){input.dataset.modelList=models(input.value).join(', ');input.value='';render();}
    add.addEventListener('click',function(){commitDraft();input.focus()});
    input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();commitDraft()}});
    chips.addEventListener('click',function(e){
      var b=e.target.closest('.pmRemoveModel');if(!b)return;
      var name=b.getAttribute('data-model');
      input.dataset.modelList=models(input.dataset.modelList||'').filter(function(m){return m!==name}).join(', ');render();
    });
    window._syncModelEditor=function(){load()};
    window._commitModelEditor=function(){commitDraft()};
    window._getModelEditorValue=function(){return input.dataset.modelList||''};
    load();
  }

  function ensureProgressNav(){
    var nav=document.querySelector('.sidebar .nav');if(!nav)return;
    var b=nav.querySelector('[data-progress-nav]');
    if(!b){
      b=document.createElement('button');b.type='button';b.setAttribute('data-progress-nav','1');b.className='sidebarProgressBtn';b.title='View Progress';b.innerHTML='<span class="nico">◔</span> <span class="nlabel">View Progress</span>';
      b.onclick=function(){if(typeof window.go==='function')window.go('progress',b);};
      var settings=Array.from(nav.querySelectorAll('button')).find(function(x){return /AI Settings/.test(x.textContent||'')});
      if(settings)nav.insertBefore(b,settings);else nav.appendChild(b);
    }
    var goal=document.querySelector('.sidebar .goal'),auth=document.querySelector('.sidebar .authPanel');
    if(goal&&auth&&goal.parentNode===auth.parentNode&&goal.nextElementSibling!==auth)auth.parentNode.insertBefore(goal,auth);
    var goalBtn=document.querySelector('.goal .outline');if(goalBtn)goalBtn.remove();
  }
  function scan(){
    ensureProgressNav();initModelEditor();
    ['textProviders','imageProviders'].forEach(function(cid){
      var root=document.getElementById(cid);if(!root)return;
      root.querySelectorAll('.provider').forEach(function(box){
        if(box.querySelector('.editProviderBtn'))return;
        var id=getId(box);if(!id)return;
        var actions=box.querySelector('div[style*=\"margin-top\"]');if(!actions)return;
        actions.classList.add('providerActions');
        var b=document.createElement('button');b.type='button';b.className='btn editProviderBtn';b.textContent='Edit';b.onclick=function(){openEdit(id)};actions.appendChild(b);
      });
    });
  }
  function resetModal(){var save=document.querySelector('#providerModal .modalActions .primary');if(save)save.onclick=null;var h=document.querySelector('#providerModal .box h2');if(h)h.textContent='Add AI Provider';if(save)save.textContent='Save Provider';window._editingProviderId=null}
  function openEdit(id){
    var p=getProviders().find(function(x){return x.id===id});if(!p)return;
    window._editingProviderId=id;
    var set=function(id,v){var e=document.getElementById(id);if(e)e.value=v==null?'':v};
    set('pName',p.name);set('pType',p.type||'text');set('pBase',p.baseUrl);set('pModel',models(p.model).join(', '));set('pUser',p.apiUser);set('pKey','');set('pSize',p.size||'1024x1024');
    if(typeof window._syncModelEditor==='function')window._syncModelEditor();
    var h=document.querySelector('#providerModal .box h2');if(h)h.textContent='Edit AI Provider';
    var save=document.querySelector('#providerModal .modalActions .primary');if(save){save.textContent='Save Changes';save.onclick=function(){window._saveEditedProvider()};}
    if(typeof window.toggleImageFields==='function')window.toggleImageFields();
    var st=document.getElementById('providerStatus');if(st)st.textContent='Editing '+(p.name||'provider');
    var modal=document.getElementById('providerModal');if(modal)modal.classList.add('show');
  }
  window._saveEditedProvider=function(){
    var id=window._editingProviderId;if(!id)return;
    if(typeof window._commitModelEditor==='function')window._commitModelEditor();
    var ps=getProviders(),p=ps.find(function(x){return x.id===id});if(!p)return;
    var val=function(id){var e=document.getElementById(id);return e?e.value.trim():''};
    var name=val('pName'),type=document.getElementById('pType').value,base=val('pBase'),model=typeof window._getModelEditorValue==='function'?window._getModelEditorValue():val('pModel'),user=val('pUser'),key=val('pKey'),size=document.getElementById('pSize').value;
    var st=document.getElementById('providerStatus');if(!name||!base||!model){if(st)st.textContent='Name, Base URL and at least one Model are required.';return}
    var oldType=p.type||'text';p.name=name;p.type=type;p.baseUrl=base.replace(/\\/$/,'');p.model=models(model).join(', ');p.apiUser=user;p.size=size;if(key)p.apiKey=key;
    if(oldType!==type){var same=ps.filter(function(x){return x!==p&&(x.type||'text')===type});p.active=same.length===0;if(p.active)same.forEach(function(x){x.active=false})}
    putProviders(ps);if(st)st.textContent='Provider updated successfully.';
    var modal=document.getElementById('providerModal');setTimeout(function(){if(modal)modal.classList.remove('show');resetModal();location.reload()},250);
  };
  function start(){
    scan();
    ['textProviders','imageProviders'].forEach(function(cid){var root=document.getElementById(cid);if(root)new MutationObserver(scan).observe(root,{childList:true,subtree:true})});
    var nav=document.querySelector('.sidebar .nav');if(nav)new MutationObserver(ensureProgressNav).observe(nav,{childList:true,subtree:true});
    setInterval(scan,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>`;
    html = html.replace('</body>', injection + '</body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(html);
  } catch(error) {
    return res.status(500).send('Unable to load the vocabulary app. ' + error.message);
  }
}

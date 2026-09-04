import fs from 'node:fs';
import path from 'node:path';

export default function handler(req, res) {
  try {
    let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const injection = `
<style>
.providerActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.providerActions .editProviderBtn{border-color:#6724e8;color:#6724e8;background:#fff}
.sidebar{display:flex!important;flex-direction:column!important}
.sidebarProgressBtn{display:block!important;width:100%;margin-top:5px!important;background:transparent!important;color:#e7eaf2!important;border:0!important;border-radius:8px!important;text-align:left!important;padding:12px 13px!important;font-weight:600!important;cursor:pointer!important}
.sidebarProgressBtn:hover,.sidebarProgressBtn.active{background:linear-gradient(90deg,#6b20ef,#7d29f0)!important;color:#fff!important}
.sidebar .goal{display:block!important;position:static!important;left:auto!important;right:auto!important;bottom:auto!important;margin:10px 0 8px!important;padding:9px 10px!important;border-radius:11px!important;flex-shrink:0!important;order:2!important}
.sidebar .goal h4{text-align:left!important;margin:0 0 6px!important;font-size:12px!important}
.sidebar .goalrow{gap:8px!important}
.sidebar .goal .ring{width:42px!important;height:42px!important;flex:0 0 42px!important}
.sidebar .goal .ring:after{inset:4px!important}
.sidebar .goal .outline{display:none!important}
.sidebar .goal .goalrow>div:last-child{font-size:11px!important;line-height:1.3!important}
.sidebar .goal .goalrow>div:last-child b{font-size:12px!important}
.sidebar .authPanel{display:block!important;position:static!important;left:auto!important;right:auto!important;bottom:auto!important;margin:0 0 0!important;order:3!important;flex-shrink:0!important}
.sidebar .nav{order:1!important}
@media(max-width:1000px){
  .sidebar{display:flex!important;position:relative!important;width:100%!important;height:auto!important}
  .sidebar .goal{display:block!important;position:static!important;margin:10px 0 8px!important}
  .sidebar .authPanel{display:block!important;position:static!important;margin:0!important}
}
</style>
<script>
(function(){
  function models(v){return String(v||'').split(/[\\n,]+/).map(function(x){return x.trim()}).filter(Boolean)}
  function getProviders(){try{return JSON.parse(localStorage.getItem('sscAIProviders')||'[]')}catch(e){return[]}}
  function putProviders(p){localStorage.setItem('sscAIProviders',JSON.stringify(p))}
  function getId(box){var b=box.querySelector('button[onclick*=\"setActive\"]');var m=b&&b.getAttribute('onclick').match(/setActive\\(['\"]([^'\"]+)/);return m?m[1]:null}
  function ensureProgressNav(){
    var nav=document.querySelector('.sidebar .nav');if(!nav)return;
    var b=nav.querySelector('[data-progress-nav]');
    if(!b){
      b=document.createElement('button');b.type='button';b.setAttribute('data-progress-nav','1');b.className='sidebarProgressBtn';b.textContent='◔ View Progress';
      b.onclick=function(){if(typeof window.go==='function')window.go('progress',b);};
      var settings=Array.from(nav.querySelectorAll('button')).find(function(x){return /AI Settings/.test(x.textContent||'')});
      if(settings)nav.insertBefore(b,settings);else nav.appendChild(b);
    }
    var goal=document.querySelector('.sidebar .goal'),auth=document.querySelector('.sidebar .authPanel');
    if(goal&&auth&&goal.parentNode===auth.parentNode&&goal.nextElementSibling!==auth)auth.parentNode.insertBefore(goal,auth);
    var goalBtn=document.querySelector('.goal .outline');if(goalBtn)goalBtn.remove();
  }
  function scan(){
    ensureProgressNav();
    ['textProviders','imageProviders'].forEach(function(cid){
      var root=document.getElementById(cid);if(!root)return;
      root.querySelectorAll('.provider').forEach(function(box){
        if(box.querySelector('.editProviderBtn'))return;
        var id=getId(box);if(!id)return;
        var actions=box.querySelector('div[style*=\"margin-top\"]');if(!actions)return;
        actions.classList.add('providerActions');
        var b=document.createElement('button');b.type='button';b.className='btn editProviderBtn';b.textContent='Edit';
        b.onclick=function(){openEdit(id)};actions.appendChild(b);
      });
    });
  }
  function resetModal(){
    var save=document.querySelector('#providerModal .modalActions .primary');
    if(save)save.onclick=null;
    var h=document.querySelector('#providerModal .box h2');if(h)h.textContent='Add AI Provider';
    if(save)save.textContent='Save Provider';
    window._editingProviderId=null;
  }
  function openEdit(id){
    var p=getProviders().find(function(x){return x.id===id});if(!p)return;
    window._editingProviderId=id;
    var set=function(id,v){var e=document.getElementById(id);if(e)e.value=v==null?'':v};
    set('pName',p.name);set('pType',p.type||'text');set('pBase',p.baseUrl);set('pModel',models(p.model).join(', '));set('pUser',p.apiUser);set('pKey','');set('pSize',p.size||'1024x1024');
    var h=document.querySelector('#providerModal .box h2');if(h)h.textContent='Edit AI Provider';
    var save=document.querySelector('#providerModal .modalActions .primary');
    if(save){save.textContent='Save Changes';save.onclick=function(){window._saveEditedProvider()};}
    if(typeof window.toggleImageFields==='function')window.toggleImageFields();
    var st=document.getElementById('providerStatus');if(st)st.textContent='Editing '+(p.name||'provider');
    var modal=document.getElementById('providerModal');if(modal)modal.classList.add('show');
  }
  window._saveEditedProvider=function(){
    var id=window._editingProviderId;if(!id)return;
    var ps=getProviders(),p=ps.find(function(x){return x.id===id});if(!p)return;
    var val=function(id){var e=document.getElementById(id);return e?e.value.trim():''};
    var name=val('pName'),type=document.getElementById('pType').value,base=val('pBase'),model=val('pModel'),user=val('pUser'),key=val('pKey'),size=document.getElementById('pSize').value;
    var st=document.getElementById('providerStatus');
    if(!name||!base||!model){if(st)st.textContent='Name, Base URL and at least one Model are required.';return}
    var oldType=p.type||'text';p.name=name;p.type=type;p.baseUrl=base.replace(/\\/$/,'');p.model=models(model).join(', ');p.apiUser=user;p.size=size;if(key)p.apiKey=key;
    if(oldType!==type){var same=ps.filter(function(x){return x!==p&&(x.type||'text')===type});p.active=same.length===0;if(p.active)same.forEach(function(x){x.active=false})}
    putProviders(ps);
    if(st)st.textContent='Provider updated successfully.';
    var modal=document.getElementById('providerModal');
    setTimeout(function(){if(modal)modal.classList.remove('show');resetModal();location.reload()},250);
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

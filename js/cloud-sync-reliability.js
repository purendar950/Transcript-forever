/* Cloud sync reliability layer — RPC-based vocabulary sync. */
(() => {
  const WAIT = 800;
  const PERIOD = 5000;
  const TIMEOUT = 12000;
  let lastFingerprint = '';
  let busy = false;
  let bootedForUser = '';

  window.cloudSyncStatus = window.cloudSyncStatus || {state:'idle',localWords:0,cloudWords:0,lastSync:0,error:''};
  const setStatus = (state, extra={}) => { window.cloudSyncStatus={...window.cloudSyncStatus,state,...extra}; };
  const clientNow = () => { try { return typeof sbClient !== 'undefined' ? sbClient : null; } catch (_) { return null; } };
  const listNow = () => { try { return typeof words !== 'undefined' && Array.isArray(words) ? words : null; } catch (_) { return null; } };
  const seedNow = () => { try { return typeof seed !== 'undefined' && Array.isArray(seed) ? seed : []; } catch (_) { return []; } };
  const normaliseWord = value => String(value || '').trim();
  const wordKey = value => normaliseWord(value).toLowerCase();
  function hiddenSeedSafe(){ try{return typeof hiddenSeed!=='undefined'&&hiddenSeed instanceof Set?hiddenSeed:new Set();}catch(_){return new Set();} }
  function localUserWords(){ const list=listNow(); if(!list)return[]; const seedKeys=new Set(seedNow().map(x=>wordKey(x.word))); const hidden=hiddenSeedSafe(); return list.filter(d=>{const k=wordKey(d&&d.word);return k&&!seedKeys.has(k)&&!hidden.has(k);}); }
  function updateLocalStatus(){ try{window.cloudSyncStatus.localWords=localUserWords().length;}catch(_){} }
  async function withTimeout(promise,label){let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timed out')),TIMEOUT);});try{return await Promise.race([promise,timeout]);}finally{clearTimeout(timer);}}
  async function currentUser(){const client=clientNow();if(!client)return null;try{const s=await withTimeout(client.auth.getSession(),'Authentication');const u=s&&s.data&&s.data.session?s.data.session.user:null;if(u&&u.id)return u;const r=await withTimeout(client.auth.getUser(),'Authentication');if(r.error)throw r.error;return r.data&&r.data.user?r.data.user:null;}catch(error){setStatus('auth-error',{error:error&&error.message?error.message:'Authentication failed'});console.warn('[Cloud Sync] auth failed:',error);return null;}}
  function applyVocabulary(userWords){const list=listNow(),seeds=seedNow();if(!list||typeof words==='undefined')return false;const hidden=hiddenSeedSafe(),seedWords=seeds.filter(x=>!hidden.has(wordKey(x.word))),byKey=new Map();(userWords||[]).forEach(d=>{if(!d||!normaliseWord(d.word))return;const copy={...d,word:normaliseWord(d.word)};byKey.set(wordKey(copy.word),copy);});localUserWords().forEach(d=>{const k=wordKey(d.word);if(!byKey.has(k))byKey.set(k,d);});const merged=[...byKey.values()].filter(d=>!hidden.has(wordKey(d.word)));words=[...seedWords,...merged];try{baseCount=seedWords.length;}catch(_){}try{localStorage.setItem('sscAIWords',JSON.stringify(merged));}catch(_){}try{window.cloudSyncStatus.localWords=merged.length;}catch(_){}try{if(typeof render==='function')render();}catch(_){}try{if(typeof renderList==='function')renderList();}catch(_){}try{if(typeof renderFlashGrid==='function')renderFlashGrid();}catch(_){}try{if(typeof updateProgress==='function')updateProgress();}catch(_){}try{if(typeof renderAuthPanel==='function')renderAuthPanel();}catch(_){}return true;}

  async function pullVocabulary(user){const client=clientNow();user=user||await currentUser();if(!client)throw new Error('Supabase client is not ready');if(!user||!user.id)throw new Error('No active signed-in session');const result=await withTimeout(client.rpc('get_my_sb_words'),'Cloud download');if(result.error)throw result.error;const remote=(result.data||[]).map(row=>{const d=row&&row.json_data;if(!d||typeof d!=='object')return null;return {...d,word:normaliseWord(d.word||row.word)};}).filter(d=>d&&d.word);applyVocabulary(remote);setStatus('downloaded',{cloudWords:remote.length,error:''});console.info('[Cloud Sync] pulled vocabulary via RPC:',remote.length);return{ok:true,count:remote.length};}

  async function uploadAddedWords(user,force=false){const client=clientNow();user=user||await currentUser();if(!client)throw new Error('Supabase client is not ready');if(!user||!user.id)throw new Error('No active signed-in session');if(busy)return{ok:false,skipped:true};const rows=localUserWords().map(d=>({word:normaliseWord(d.word),json_data:{...d,generatedImage:undefined}})).filter(r=>r.word);if(!rows.length)return{ok:true,count:0};const fingerprint=rows.map(r=>wordKey(r.word)+'|'+JSON.stringify(r.json_data)).sort().join('||');if(!force&&fingerprint===lastFingerprint)return{ok:true,count:rows.length,skipped:true};busy=true;try{const result=await withTimeout(client.rpc('sync_my_sb_words',{p_words:rows}),'Cloud upload');if(result.error)throw result.error;lastFingerprint=fingerprint;try{sbLastSync=Date.now();}catch(_){}console.info('[Cloud Sync] uploaded vocabulary via RPC:',rows.length);return{ok:true,count:rows.length};}catch(error){const message=error&&error.message?error.message:'Cloud upload failed';console.error('[Cloud Sync] vocabulary upload failed:',error);setStatus('upload-error',{error:message});return{ok:false,count:0,error:message};}finally{busy=false;}}

  async function refreshFromCloud(){updateLocalStatus();const client=clientNow();if(!client){setStatus('client-error',{error:'Supabase client is not ready'});return false;}const user=await currentUser();if(!user)return false;setStatus('syncing',{error:''});try{await pullVocabulary(user);return true;}catch(error){const message=error&&error.message?error.message:'Cloud download failed';setStatus('download-error',{error:message});console.error('[Cloud Sync] refresh failed:',error);return false;}}
  async function boot(){await new Promise(r=>setTimeout(r,WAIT));for(let i=0;i<15;i++){const user=await currentUser();if(user&&user.id){if(bootedForUser!==user.id){bootedForUser=user.id;await refreshFromCloud();const uploaded=await uploadAddedWords(user,true).catch(error=>({ok:false,error:error.message}));if(uploaded&&uploaded.ok)await pullVocabulary(user).catch(()=>{});}return;}await new Promise(r=>setTimeout(r,1000));}}
  window.cloudSyncNow=async function(){if(busy)return false;setStatus('syncing',{error:''});const user=await currentUser();if(!user)return false;try{await pullVocabulary(user);const uploaded=await uploadAddedWords(user,true);if(!uploaded.ok)return false;await pullVocabulary(user);setStatus('synced',{lastSync:Date.now(),error:''});updateLocalStatus();return true;}catch(error){const message=error&&error.message?error.message:'Sync failed';setStatus('error',{error:message});console.error('[Cloud Sync] manual sync failed:',error);return false;}};
  setInterval(async()=>{if(busy)return;const user=await currentUser();if(user){const result=await uploadAddedWords(user,false).catch(error=>({ok:false,error:error.message}));if(result&&result.ok)updateLocalStatus();}},PERIOD);
  window.addEventListener('focus',()=>{refreshFromCloud();});window.addEventListener('pageshow',()=>{refreshFromCloud();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFromCloud();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* Compatibility bridge: the original app.js defines syncToCloud()/syncFromCloud()
   and save() still calls them. Route those legacy calls through the secure RPC
   functions and derive the user from the live Supabase session, never from the
   stale sbSession localStorage value. */
(() => {
  const clientNow = () => { try { return typeof sbClient !== 'undefined' ? sbClient : null; } catch (_) { return null; } };
  const liveUser = async () => {
    const client = clientNow();
    if (!client) throw new Error('Supabase client is not ready');
    const {data, error} = await client.auth.getUser();
    if (error) throw error;
    const user = data && data.user;
    if (!user || !user.id) throw new Error('No active signed-in Supabase user');
    try { sbUser = {id:user.id,email:user.email}; } catch (_) {}
    return user;
  };
  const userWords = () => {
    try {
      if (typeof words === 'undefined' || !Array.isArray(words)) return [];
      const seeds = typeof seed !== 'undefined' && Array.isArray(seed) ? seed : [];
      const hidden = typeof hiddenSeed !== 'undefined' && hiddenSeed instanceof Set ? hiddenSeed : new Set();
      const seedKeys = new Set(seeds.map(x => String(x && x.word || '').trim().toLowerCase()));
      return words.filter(d => {
        const k = String(d && d.word || '').trim().toLowerCase();
        return k && !seedKeys.has(k) && !hidden.has(k);
      });
    } catch (_) { return []; }
  };
  window.syncToCloud = async function(){
    const client = clientNow();
    if (!client) return;
    const user = await liveUser();
    const rows = userWords().map(d => ({word:String(d.word||'').trim(),json_data:{...d,generatedImage:undefined}})).filter(r=>r.word);
    if (rows.length) {
      const result = await client.rpc('sync_my_sb_words',{p_words:rows});
      if (result.error) throw result.error;
    }
    try { if (typeof sbLastSync !== 'undefined') sbLastSync=Date.now(); } catch (_) {}
  };
  window.syncFromCloud = async function(){
    const client = clientNow();
    if (!client) return;
    const user = await liveUser();
    const result = await client.rpc('get_my_sb_words');
    if (result.error) throw result.error;
    const remote = (result.data||[]).map(row => {
      const d=row&&row.json_data;
      return d&&typeof d==='object' ? {...d,word:String(d.word||row.word||'').trim()} : null;
    }).filter(Boolean);
    const seeds = typeof seed !== 'undefined' && Array.isArray(seed) ? seed : [];
    const hidden = typeof hiddenSeed !== 'undefined' && hiddenSeed instanceof Set ? hiddenSeed : new Set();
    const existing = typeof words !== 'undefined' && Array.isArray(words) ? words : [];
    const seedKeys = new Set(seeds.map(x=>String(x&&x.word||'').trim().toLowerCase()));
    const map = new Map();
    remote.forEach(d=>map.set(String(d.word).toLowerCase(),d));
    existing.filter(d=>{const k=String(d&&d.word||'').trim().toLowerCase();return k&&!seedKeys.has(k)&&!hidden.has(k);}).forEach(d=>{const k=String(d.word).toLowerCase();if(!map.has(k))map.set(k,d);});
    const userList=[...map.values()];
    try { words=[...seeds.filter(s=>!hidden.has(String(s.word||'').toLowerCase())),...userList]; baseCount=seeds.filter(s=>!hidden.has(String(s.word||'').toLowerCase())).length; } catch (_) {}
    try { localStorage.setItem('sscAIWords',JSON.stringify(userList)); } catch (_) {}
    try { sbLastSync=Date.now(); } catch (_) {}
    try { if(typeof render==='function')render(); } catch (_) {}
    try { if(typeof renderList==='function')renderList(); } catch (_) {}
    try { if(typeof renderFlashGrid==='function')renderFlashGrid(); } catch (_) {}
    console.info('[Cloud Sync] legacy syncFromCloud bridged via RPC for user:',user.id);
  };
})();

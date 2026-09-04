import flashHome from './flash-home.js';

export default async function handler(req, res) {
  let captured = '';
  const fake = {
    setHeader() {},
    status(code) { this.code = code; return this; },
    send(body) { captured = String(body || ''); return this; }
  };

  await flashHome(req, fake);
  if (!captured) return res.status(500).send('Unable to load the vocabulary app.');

  const fix = `
<style>
/* Navigation: purple means ACTIVE only, never hover. */
.sidebar .nav button:hover:not(.active),
.sidebar .nav button:focus:not(.active) {
  background: transparent !important;
  color: #e7eaf2 !important;
}
.sidebar .nav button.active,
.sidebar .nav button.active:hover,
.sidebar .nav button.active:focus {
  background: linear-gradient(90deg,#6b20ef,#7d29f0) !important;
  color: #fff !important;
}
</style>
<script>
(function(){
  function nav(){ return document.querySelector('.sidebar .nav'); }
  function setActive(btn){
    var n=nav(); if(!n||!btn)return;
    n.querySelectorAll('button').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
  }
  function bind(){
    var n=nav(); if(!n||n.dataset.activeFix)return;
    n.dataset.activeFix='1';
    n.addEventListener('click',function(e){
      var b=e.target.closest('button');
      if(b && n.contains(b)) setActive(b);
    },true);
  }
  function start(){
    bind();
    var n=nav();
    if(n)new MutationObserver(function(){
      if(!n.dataset.activeFix)bind();
    }).observe(n,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>`;

  captured = captured.replace('</body>', fix + '</body>');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(captured);
}

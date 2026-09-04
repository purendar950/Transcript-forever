import flashHome from './flash-home.js';

export default async function handler(req, res) {
  let page = '';
  const capture = {
    setHeader() {},
    status(code) { this.code = code; return this; },
    send(value) { page = String(value || ''); return this; }
  };
  await flashHome(req, capture);
  if (!page) return res.status(502).send('Unable to load the vocabulary app.');

  const injection = `
<style>
/* Final navigation rule: exactly one sidebar item is highlighted. */
.sidebar .nav button.sp-selected{background:linear-gradient(90deg,#6b20ef,#7d29f0)!important;color:#fff!important}
.sidebar .nav button.active:not(.sp-selected){background:transparent!important;color:#e7eaf2!important}
</style>
<script>
(function(){
  var selected=null;
  function buttons(){var nav=document.querySelector('.sidebar .nav');return nav?Array.from(nav.querySelectorAll('button')):[]}
  function paint(btn){
    var bs=buttons();
    bs.forEach(function(b){b.classList.remove('active','sp-selected')});
    if(btn&&bs.indexOf(btn)!==-1){btn.classList.add('active','sp-selected');selected=btn}
  }
  function initial(){
    var bs=buttons();if(!bs.length)return;
    var current=bs.find(function(b){return b.classList.contains('active')});
    if(current)paint(current);else{
      var title=((document.querySelector('.titlebar h1')||{}).textContent||'').toLowerCase();
      var wanted=title.indexOf('flashcard')>=0?bs.find(function(b){return /Flashcards/i.test(b.textContent||'')}):title.indexOf('dashboard')>=0?bs.find(function(b){return /Dashboard/i.test(b.textContent||'')}):title.indexOf('vocabulary')>=0?bs.find(function(b){return /My Vocabulary/i.test(b.textContent||'')}):title.indexOf('progress')>=0?bs.find(function(b){return /View Progress/i.test(b.textContent||'')}):title.indexOf('quiz')>=0?bs.find(function(b){return /AI Quiz/i.test(b.textContent||'')}):title.indexOf('settings')>=0?bs.find(function(b){return /AI Settings/i.test(b.textContent||'')}):null;
      paint(wanted||bs[0]);
    }
  }
  function start(){
    initial();
    var nav=document.querySelector('.sidebar .nav');if(!nav)return;
    nav.addEventListener('click',function(e){
      var b=e.target.closest('button');if(!b)return;
      /* Remember exactly what the user clicked; do not let page title override it. */
      setTimeout(function(){paint(b)},10);
      setTimeout(function(){paint(b)},120);
      setTimeout(function(){paint(b)},350);
    },true);
    new MutationObserver(function(){
      var bs=buttons();
      if(selected&&bs.indexOf(selected)!==-1){paint(selected)}
      else initial();
    }).observe(nav,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>`;
  page=page.replace('</body>',injection+'</body>');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  return res.status(200).send(page);
}

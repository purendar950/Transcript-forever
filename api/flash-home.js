import home from './home.js';

export default async function handler(req, res) {
  let page = '';
  const capture = {
    setHeader() {},
    status(code) { this.code = code; return this; },
    send(value) { page = String(value || ''); return this; }
  };
  await home(req, capture);
  if (!page) return res.status(502).send('Unable to build vocabulary app.');

  const injection = `
<style>
.realFlashViewport{perspective:1400px;min-height:620px}
.realFlashCard{position:relative;width:100%;min-height:620px;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.2,.7,.2,1);cursor:pointer}
.realFlashCard.isBack{transform:rotateY(180deg)}
.realFlashFace{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#fff;border:1px solid #e1e4eb;border-radius:16px;box-shadow:0 8px 28px #1112;overflow:auto}
.realFlashFront{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center}
.realFlashFront .rfLabel{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#7023ec;margin-bottom:28px}
.realFlashFront .rfWord{font-size:clamp(44px,7vw,76px);font-weight:850;color:#171b27;line-height:1.05}
.realFlashFront .rfPron{margin-top:20px;font-size:22px;color:#5c24d5;font-weight:750}
.realFlashFront .rfPos{margin-top:12px;display:inline-flex;padding:6px 14px;border-radius:18px;background:#e8f8ee;color:#13994e;font-weight:800}
.realFlashFront .rfHint{margin-top:42px;color:#687080;font-size:14px}
.realFlashBack{transform:rotateY(180deg);padding:24px;cursor:default}
.realFlashBack .flashBackTitle{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.realFlashBack .flashBackTitle b{font-size:22px;color:#2b215f}
.realFlashBack .flashBackTitle span{font-size:12px;color:#687080}
.realFlashBack .oldFlashContent{font-size:14px}
.realFlashBack .oldFlashContent .wordline,.realFlashBack .oldFlashContent .pronline{display:none!important}
.realFlashBack .oldFlashContent .flash{box-shadow:none!important;border:0!important;padding:0!important}
.realFlashBack .sscRelevance{margin-top:16px;padding:12px 14px;border:1px solid #e5dafd;background:#fbf7ff;border-radius:10px;color:#5c24d5;font-weight:700}
.rfFlipBtn{display:block;width:100%;margin-top:12px;padding:10px;border:1px solid #d8dbe3;border-radius:8px;background:#fff;color:#7023ec;font-weight:800;cursor:pointer}
@media(max-width:700px){.realFlashCard,.realFlashViewport{min-height:560px}.realFlashFront{padding:25px}.realFlashBack{padding:16px}}
</style>
<script>
(function(){
  function devanagari(ipa,word){
    var s=String(ipa||'').replace(/^\\/+|\\/+$/g,'').toLowerCase();
    if(!s)return word||'—';
    var exact={'gaɪl':'गाइल','gaɪt':'गाइट','kæt':'कैट','həʊm':'होम','pleɪn':'प्लेन','flaʊə':'फ्लावर','brʌðər':'ब्रदर'};
    if(exact[s])return exact[s];
    var r=s.replace(/dʒ/g,'ज').replace(/tʃ/g,'च').replace(/aɪ/g,'आइ').replace(/eɪ/g,'ए').replace(/əʊ/g,'ओ').replace(/aʊ/g,'आउ').replace(/ɔɪ/g,'ऑइ').replace(/ʃ/g,'श').replace(/ʒ/g,'झ').replace(/θ/g,'थ').replace(/ð/g,'द').replace(/ŋ/g,'ङ').replace(/ɪ/g,'ि').replace(/iː/g,'ई').replace(/i/g,'इ').replace(/uː/g,'ऊ').replace(/u/g,'उ').replace(/ɑː/g,'आ').replace(/ɑ/g,'आ').replace(/ɔː/g,'ऑ').replace(/ɔ/g,'ऑ').replace(/æ/g,'ऐ').replace(/ʌ/g,'अ').replace(/ɜː/g,'अर').replace(/ə/g,'अ').replace(/ɛ/g,'ए').replace(/e/g,'ए').replace(/oʊ/g,'ओ').replace(/p/g,'प').replace(/b/g,'ब').replace(/t/g,'ट').replace(/d/g,'ड').replace(/k/g,'क').replace(/g/g,'ग').replace(/f/g,'फ').replace(/v/g,'व').replace(/s/g,'स').replace(/z/g,'ज़').replace(/h/g,'ह').replace(/m/g,'म').replace(/n/g,'न').replace(/l/g,'ल').replace(/r/g,'र').replace(/w/g,'व').replace(/j/g,'य').replace(/ /g,'');
    return r||word||'—';
  }
  function upgrade(){
    var flash=document.querySelector('.flash');
    if(!flash||flash.dataset.realFlash)return;
    var word=(flash.querySelector('.word')||{}).textContent||'Vocabulary';
    var ipa=(flash.querySelector('.pronline')||{}).textContent||'';
    var posEl=flash.querySelector('.tag');
    var pos=posEl?posEl.textContent.trim():'';
    var original=flash.innerHTML;
    flash.dataset.realFlash='1';
    flash.classList.add('realFlashViewport');
    flash.innerHTML='';
    var card=document.createElement('div');card.className='realFlashCard';
    var front=document.createElement('div');front.className='realFlashFace realFlashFront';
    front.innerHTML='<div class="rfLabel">Active Recall · Front</div><div class="rfWord"></div><div class="rfPron"></div><div class="rfPos"></div><div class="rfHint">Tap the card to reveal meaning, synonyms, antonyms & memory trick</div>';
    front.querySelector('.rfWord').textContent=word.trim();
    front.querySelector('.rfPron').textContent=devanagari(ipa,word.trim());
    front.querySelector('.rfPos').textContent=pos||'Vocabulary';
    var back=document.createElement('div');back.className='realFlashFace realFlashBack';
    back.innerHTML='<div class="flashBackTitle"><b>'+word.trim().replace(/[&<>]/g,'')+'</b><span>Back · Learning Card</span></div><div class="oldFlashContent"></div><div class="sscRelevance">SSC Relevance: High-yield vocabulary practice · Check the question/date shown in the card before treating it as a verified PYQ.</div><button type="button" class="rfFlipBtn">↩ Tap to flip back</button>';
    back.querySelector('.oldFlashContent').innerHTML=original;
    card.append(front,back);flash.appendChild(card);
    card.addEventListener('click',function(e){if(e.target.closest('.rfFlipBtn')){card.classList.remove('isBack');return}if(e.target.closest('.realFlashBack'))return;card.classList.toggle('isBack')});
    back.querySelector('.rfFlipBtn').addEventListener('click',function(e){e.stopPropagation();card.classList.remove('isBack')});
  }
  function watch(){upgrade();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
  new MutationObserver(function(){setTimeout(upgrade,50)}).observe(document.body,{childList:true,subtree:true});
  setInterval(upgrade,1200);
})();
</script>`;
  page = page.replace('</body>', injection + '</body>');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(page);
}

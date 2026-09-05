(() => {
  function init(){
    const page=document.getElementById('vocab');
    if(!page)return;
    page.dataset.module='vocabulary';
    const search=page.querySelector('#vocabSearch');
    if(search)search.setAttribute('aria-label','Search vocabulary');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

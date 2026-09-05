(() => {
  function init(){const page=document.getElementById('progress');if(page)page.dataset.module='progress';}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

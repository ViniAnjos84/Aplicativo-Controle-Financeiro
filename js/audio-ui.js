/* Dica de primeiro acesso: aparece somente após abrir o painel autenticado. */
(()=>{
 const painel=document.getElementById('dashboard');
 const dica=document.getElementById('audio-fab-tip');
 const chave='controle-financeiro-audio-tip-v1';
 let exibida=false;
 const observar=()=>{
  if(painel.hidden||exibida)return;
  exibida=true;
  try{
   if(localStorage.getItem(chave))return;
   localStorage.setItem(chave,'1');
  }catch(_){}
  dica.hidden=false;
  setTimeout(()=>{dica.hidden=true},5500);
 };
 new MutationObserver(observar).observe(painel,{attributes:true,attributeFilter:['hidden']});
 observar();
})();

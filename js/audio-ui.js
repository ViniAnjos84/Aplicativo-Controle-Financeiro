/* Gravação local temporária: nenhuma transmissão ou persistência. */
(()=>{
 const painel=document.getElementById('dashboard');
 const dica=document.getElementById('audio-fab-tip');
 const botao=document.getElementById('audio-fab');
 const caixa=document.getElementById('audio-record-panel');
 const status=document.getElementById('audio-record-status');
 const player=document.getElementById('audio-record-player');
 const descartar=document.getElementById('audio-record-discard');
 const chave='controle-financeiro-audio-tip-v1';
 let exibida=false,gravador=null,stream=null,partes=[],url=null,gravando=false,iniciando=false;
 function limparAudio(){
  player.pause();player.removeAttribute('src');player.load();
  if(url)URL.revokeObjectURL(url);
  url=null;player.hidden=true;descartar.hidden=true;
 }
 function pararCaptura(){
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
 }
 function encerrar(){
  if(gravador&&gravador.state==='recording')gravador.stop();
  else pararCaptura();
  gravando=false;botao.classList.remove('gravando');
  botao.setAttribute('aria-label','Iniciar gravação de áudio');
  botao.title='Gravar áudio';
 }
 botao.addEventListener('click',async()=>{
  if(iniciando)return;
  if(gravando){encerrar();return}
  limparAudio();caixa.hidden=false;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
   status.textContent='Este navegador não oferece suporte à gravação de áudio.';return;
  }
  iniciando=true;botao.disabled=true;
  status.textContent='Solicitando acesso ao microfone...';
  try{
   const captura=await navigator.mediaDevices.getUserMedia({audio:true});
   if(painel.hidden){captura.getTracks().forEach(t=>t.stop());return}
   stream=captura;partes=[];
   const tipos=['audio/webm;codecs=opus','audio/mp4','audio/webm'];
   const tipo=tipos.find(t=>MediaRecorder.isTypeSupported(t));
   gravador=new MediaRecorder(stream,tipo?{mimeType:tipo}:undefined);
   gravador.ondataavailable=e=>{if(e.data.size)partes.push(e.data)};
   gravador.onstop=()=>{
    pararCaptura();
    if(!partes.length){status.textContent='Nenhum áudio foi capturado.';return}
    url=URL.createObjectURL(new Blob(partes,{type:gravador.mimeType||partes[0].type}));
    player.src=url;player.hidden=false;descartar.hidden=false;
    status.textContent='Gravação concluída. Ouça abaixo ou descarte. Nada foi enviado.';
    partes=[];
   };
   gravador.onerror=()=>{pararCaptura();gravando=false;botao.classList.remove('gravando');status.textContent='Erro ao gravar o áudio.'};
   gravador.start();gravando=true;botao.classList.add('gravando');
   botao.setAttribute('aria-label','Parar gravação de áudio');botao.title='Parar gravação';
   status.textContent='Gravando... toque no botão vermelho para parar.';
  }catch(e){
   pararCaptura();
   status.textContent=e.name==='NotAllowedError'?'Permita o acesso ao microfone para gravar.':'Não foi possível iniciar a gravação.';
  }finally{iniciando=false;botao.disabled=false}
 });
 descartar.addEventListener('click',()=>{limparAudio();caixa.hidden=true;status.textContent='Pronto para gravar'});
 const observar=()=>{
  if(painel.hidden){
   if(gravando)encerrar();
   limparAudio();caixa.hidden=true;
   return;
  }
  if(exibida)return;
  exibida=true;
  try{if(localStorage.getItem(chave))return;localStorage.setItem(chave,'1')}catch(_){}
  dica.hidden=false;
  setTimeout(()=>{dica.hidden=true},5500);
 };
 new MutationObserver(observar).observe(painel,{attributes:true,attributeFilter:['hidden']});
 observar();
})();

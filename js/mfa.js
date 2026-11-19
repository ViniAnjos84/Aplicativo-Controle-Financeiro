// Fluxo de segundo fator TOTP. O banco deve exigir aal2 via RLS antes da produção.
let mfaPendente=null;
const mfaScreen=document.getElementById('mfa-screen');
const mfaTitulo=document.getElementById('mfa-title');
const mfaDescricao=document.getElementById('mfa-description');
const mfaQr=document.getElementById('mfa-qr');
const mfaSegredo=document.getElementById('mfa-secret');
const mfaErro=document.getElementById('mfa-error');
const mfaCodigo=document.getElementById('mfa-code');
const mfaBotao=document.getElementById('mfa-submit');

function exibirMfa(modo){
  loginScreen.hidden=true;dashboard.hidden=true;mfaScreen.hidden=false;
  mfaErro.textContent='';mfaCodigo.value='';
  const cadastro=modo==='enroll';
  mfaTitulo.textContent=cadastro?'Proteja sua conta':'Verificação em duas etapas';
  mfaDescricao.textContent=cadastro
    ?'Abra o Google Authenticator, leia o QR Code e informe o código de 6 dígitos para concluir a configuração obrigatória.'
    :'Informe o código de 6 dígitos exibido no Google Authenticator.';
  document.getElementById('mfa-enroll-details').hidden=!cadastro;
  document.getElementById('mfa-factor-choice').hidden=true;
  mfaBotao.textContent=cadastro?'Ativar autenticação':'Verificar código';
  mfaCodigo.focus();
}
function ocultarMfa(){mfaScreen.hidden=true;mfaPendente=null;mfaQr.removeAttribute('src');mfaSegredo.textContent='';mfaCodigo.value='';}
async function exigirMfa(usuario){
  // Sempre consultar o nível da sessão: restaurar a página não pode pular o MFA.
  const {data:nivel,error:erroNivel}=await cliente.auth.mfa.getAuthenticatorAssuranceLevel();
  if(erroNivel)throw erroNivel;
  if(nivel.currentLevel==='aal2'){ocultarMfa();await prosseguirAposMfa(usuario);return;}
  const {data:fatores,error:erroFatores}=await cliente.auth.mfa.listFactors();
  if(erroFatores)throw erroFatores;
  const verificados=(fatores.totp||[]).filter(f=>f.status==='verified');
  if(verificados.length){
    mfaPendente={modo:'challenge',factorId:verificados[0].id,usuario};
    exibirMfa('challenge');
    const escolha=document.getElementById('mfa-factor-choice');
    const select=document.getElementById('mfa-factor-select');
    escolha.hidden=verificados.length<2;
    select.replaceChildren(...verificados.map((f,i)=>new Option(f.friendly_name||('Autenticador '+(i+1)),f.id)));
    select.onchange=()=>{if(mfaPendente)mfaPendente.factorId=select.value;};
    return;
  }
  // Um cadastro interrompido deixa um fator não verificado no Supabase.
  // Não é possível recuperar o segredo/QR Code anterior: descartamos apenas
  // fatores TOTP pendentes antes de gerar um novo.
  const pendentes=(fatores.all||fatores.totp||[]).filter(f=>
    (f.factor_type==='totp'||f.factorType==='totp'||fatores.totp?.some(t=>t.id===f.id)) &&
    f.status==='unverified'
  );
  for(const fator of pendentes){
    const {error:erroRemocao}=await cliente.auth.mfa.unenroll({factorId:fator.id});
    if(erroRemocao)throw new Error('Não foi possível reiniciar o cadastro do autenticador: '+erroRemocao.message);
  }
  const {data:novo,error:erroCadastro}=await cliente.auth.mfa.enroll({
    factorType:'totp',friendlyName:'Google Authenticator'
  });
  if(erroCadastro)throw erroCadastro;
  mfaPendente={modo:'enroll',factorId:novo.id,usuario};
  exibirMfa('enroll');
  // SVG retornado pelo Supabase: não utilizar geradores externos de QR Code.
  mfaQr.src=novo.totp.qr_code;
  mfaSegredo.textContent=novo.totp.secret;
}
document.getElementById('mfa-form').addEventListener('submit',async evento=>{
  evento.preventDefault();
  if(!mfaPendente||!cliente)return;
  const codigo=mfaCodigo.value.trim();
  if(!/^\d{6}$/.test(codigo)){mfaErro.textContent='Digite os 6 números do aplicativo autenticador.';return;}
  mfaBotao.disabled=true;mfaErro.textContent='';
  try{
    const {data,error}=await cliente.auth.mfa.challengeAndVerify({
      factorId:mfaPendente.factorId,code:codigo
    });
    if(error)throw error;
    const {data:nivel,error:erroNivel}=await cliente.auth.mfa.getAuthenticatorAssuranceLevel();
    if(erroNivel)throw erroNivel;
    if(nivel.currentLevel!=='aal2')throw new Error('A verificação não elevou a sessão para aal2.');
    const usuario=mfaPendente.usuario;
    ocultarMfa();
    await prosseguirAposMfa(usuario);
  }catch(erro){mfaErro.textContent=erro.message||'Não foi possível validar o código.';}
  finally{mfaBotao.disabled=false;}
});
document.getElementById('mfa-cancel').addEventListener('click',async()=>{
  await cliente.auth.signOut();dados=[];ocultarMfa();mostrarLogin();
});

let backupMfaPendente=null;
function mensagemBackup(texto,erro=false){
 const el=document.getElementById('backup-mfa-message');
 el.textContent=texto;el.style.color=erro?'var(--red)':'var(--green)';
}
async function atualizarBackupMfa(){
 const {data,error}=await cliente.auth.mfa.listFactors();
 if(error)throw error;
 const ativos=(data.totp||[]).filter(f=>f.status==='verified');
 const status=document.getElementById('backup-mfa-status');
 const lista=document.getElementById('backup-mfa-list');
 const contador=document.getElementById('backup-mfa-count');
 status.textContent=ativos.length===0?'Nenhum autenticador verificado.': '';
 contador.textContent=ativos.length+' de 2 cadastrados';
 lista.replaceChildren();
 ativos.forEach((f,i)=>{
  const item=document.createElement('div');item.className='security-factor';
  const icone=document.createElement('span');icone.className='security-factor-icon';icone.textContent='⌑';icone.setAttribute('aria-hidden','true');
  const info=document.createElement('div');info.className='security-factor-info';
  const nome=document.createElement('strong');nome.textContent=f.friendly_name||('Autenticador '+(i+1));
  const descricao=document.createElement('small');descricao.textContent=i===0?'Autenticador cadastrado':'Dispositivo adicional';
  info.append(nome,descricao);
  const tag=document.createElement('span');tag.className='security-factor-tag';tag.textContent='Ativo';
  item.append(icone,info,tag);
  const remover=document.createElement('button');
  remover.type='button';remover.className='security-remove';
  remover.textContent='Remover';remover.disabled=ativos.length<=1;
  remover.title=ativos.length<=1?'Mantenha pelo menos um autenticador ativo.':'Remover este autenticador';
  remover.addEventListener('click',()=>removerAutenticador(f.id,nome.textContent,remover));
  item.append(remover);lista.append(item);
 });
 const botao=document.getElementById('backup-mfa-start');
 botao.disabled=ativos.length>=2;
 botao.textContent=ativos.length>=2?'Limite atingido':'Adicionar reserva';
 document.querySelector('.security-add-copy p').textContent=ativos.length>=2
  ?'Dois autenticadores estão ativos. Você pode usar qualquer um deles para entrar.'
  :'Cadastre um segundo aplicativo ou dispositivo para manter o acesso caso perca o principal.';
}
async function removerAutenticador(factorId,nome,botao){
 if(backupMfaPendente){mensagemBackup('Conclua ou cancele o cadastro em andamento antes de remover um autenticador.',true);return;}
 const {data:nivel,error:erroNivel}=await cliente.auth.mfa.getAuthenticatorAssuranceLevel();
 if(erroNivel){mensagemBackup(erroNivel.message,true);return;}
 if(nivel.currentLevel!=='aal2'){mensagemBackup('Faça login novamente com um autenticador para gerenciar seus dispositivos.',true);return;}
 const {data:fatores,error:erroFatores}=await cliente.auth.mfa.listFactors();
 if(erroFatores){mensagemBackup(erroFatores.message,true);return;}
 const ativos=(fatores.totp||[]).filter(f=>f.status==='verified');
 if(ativos.length<=1){mensagemBackup('O último autenticador não pode ser removido.',true);await atualizarBackupMfa();return;}
 if(!ativos.some(f=>f.id===factorId)){mensagemBackup('Este autenticador não está mais ativo. Atualizando lista.',true);await atualizarBackupMfa();return;}
 if(!window.confirm('Tem certeza que deseja remover "'+nome+'"? Você não poderá mais usar seus códigos para entrar na conta.'))return;
 botao.disabled=true;mensagemBackup('');
 try{
  const {data:atual,error:erroAtual}=await cliente.auth.mfa.listFactors();
  if(erroAtual)throw erroAtual;
  const restantes=(atual.totp||[]).filter(f=>f.status==='verified');
  if(restantes.length<=1||!restantes.some(f=>f.id===factorId))
   throw new Error('Não é possível remover o último autenticador ativo.');
  const {error}=await cliente.auth.mfa.unenroll({factorId});
  if(error)throw error;
  await atualizarBackupMfa();
  mensagemBackup('Autenticador removido com sucesso. Você pode cadastrar outro dispositivo.');
 }catch(e){mensagemBackup(e.message||'Não foi possível remover o autenticador.',true);botao.disabled=false;}
}
async function cancelarBackupMfa(){
 const fator=backupMfaPendente;backupMfaPendente=null;
 document.getElementById('backup-mfa-enroll').hidden=true;
 document.getElementById('backup-mfa-qr').removeAttribute('src');
 document.getElementById('backup-mfa-secret').textContent='';
 document.getElementById('backup-mfa-form').reset();
 if(fator){const {error}=await cliente.auth.mfa.unenroll({factorId:fator});if(error)throw error;}
}
document.getElementById('backup-mfa-start').addEventListener('click',async()=>{
 const botao=document.getElementById('backup-mfa-start');botao.disabled=true;mensagemBackup('');
 try{
  const {data:nivel,error:erroNivel}=await cliente.auth.mfa.getAuthenticatorAssuranceLevel();
  if(erroNivel)throw erroNivel;
  if(nivel.currentLevel!=='aal2')throw new Error('Entre novamente e confirme seu autenticador antes de cadastrar outro.');
  const {data:fatores,error:erroFatores}=await cliente.auth.mfa.listFactors();
  if(erroFatores)throw erroFatores;
  if((fatores.totp||[]).filter(f=>f.status==='verified').length!==1)
   throw new Error('O cadastro reserva exige exatamente um autenticador ativo.');
  const {data,error}=await cliente.auth.mfa.enroll({factorType:'totp',friendlyName:'Autenticador reserva'});
  if(error)throw error;
  backupMfaPendente=data.id;
  document.getElementById('backup-mfa-qr').src=data.totp.qr_code;
  document.getElementById('backup-mfa-secret').textContent=data.totp.secret;
  document.getElementById('backup-mfa-enroll').hidden=false;
 }catch(e){mensagemBackup(e.message||'Falha ao cadastrar autenticador.',true);}
 finally{if(!backupMfaPendente)botao.disabled=false;}
});
document.getElementById('backup-mfa-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!backupMfaPendente)return;
 const botao=document.getElementById('backup-mfa-verify');
 const codigo=document.getElementById('backup-mfa-code').value.trim();
 if(!/^\d{6}$/.test(codigo)){mensagemBackup('Digite os seis números.',true);return;}
 botao.disabled=true;mensagemBackup('');
 try{
  const {error}=await cliente.auth.mfa.challengeAndVerify({factorId:backupMfaPendente,code:codigo});
  if(error)throw error;
  backupMfaPendente=null;
  document.getElementById('backup-mfa-enroll').hidden=true;
  document.getElementById('backup-mfa-qr').removeAttribute('src');
  document.getElementById('backup-mfa-secret').textContent='';
  document.getElementById('backup-mfa-form').reset();
  await atualizarBackupMfa();
  mensagemBackup('Autenticador de reserva ativado. Guarde-o em outro dispositivo.');
 }catch(e){mensagemBackup(e.message||'Não foi possível confirmar o código.',true);}
 finally{botao.disabled=false;}
});
document.getElementById('backup-mfa-cancel').addEventListener('click',async()=>{
 try{await cancelarBackupMfa();await atualizarBackupMfa();mensagemBackup('Cadastro cancelado.');}
 catch(e){mensagemBackup(e.message||'Não foi possível cancelar.',true);}
});

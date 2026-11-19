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
  const verificado=fatores.totp?.find(f=>f.status==='verified');
  if(verificado){
    mfaPendente={modo:'challenge',factorId:verificado.id,usuario};
    exibirMfa('challenge');
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

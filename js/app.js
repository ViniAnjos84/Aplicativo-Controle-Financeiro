const escapar=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const loginScreen=document.getElementById('login-screen'), dashboard=document.getElementById('dashboard');
const form=document.getElementById('login-form'), aviso=document.getElementById('login-error');
const anoEl=document.getElementById('ano'),categoriaEl=document.getElementById('categoria');
let dados=[], cliente=null;
function mostrarLogin(){loginScreen.hidden=false;dashboard.hidden=true;document.getElementById('mfa-screen').hidden=true;document.getElementById('recover-screen').hidden=true;document.getElementById('reset-screen').hidden=true;document.getElementById('first-password-screen').hidden=true;document.getElementById('login-password').value=''}
async function prosseguirAposMfa(usuario){
 const {data,error}=await cliente.auth.getUser();
 if(error)throw error;
 if(!data.user)throw new Error('Sessão inválida.');
 if(data.user.app_metadata?.must_change_password===true){
  loginScreen.hidden=true;dashboard.hidden=true;document.getElementById('mfa-screen').hidden=true;
  document.getElementById('first-password-screen').hidden=false;
  document.getElementById('first-password-form').reset();
  document.getElementById('first-password-error').textContent='';
  document.getElementById('first-password').focus();
  return;
 }
 await carregarPainel(data.user);
}
document.getElementById('first-password-form').addEventListener('submit',async evento=>{
 evento.preventDefault();
 const senha=document.getElementById('first-password').value;
 const confirmar=document.getElementById('first-password-confirm').value;
 const aviso=document.getElementById('first-password-error');
 const botao=document.getElementById('first-password-submit');
 aviso.textContent='';
 if(senha!==confirmar){aviso.textContent='As senhas não coincidem.';return;}
 botao.disabled=true;
 try{
  const {data:nivel,error:erroNivel}=await cliente.auth.mfa.getAuthenticatorAssuranceLevel();
  if(erroNivel)throw erroNivel;
  if(nivel.currentLevel!=='aal2')throw new Error('Confirme seu Google Authenticator antes de trocar a senha.');
  const {error}=await cliente.auth.updateUser({password:senha});
  if(error)throw error;
  const {data,error:erroUsuario}=await cliente.auth.getUser();
  if(erroUsuario)throw erroUsuario;
  if(data.user?.app_metadata?.must_change_password===true)throw new Error('A alteração não foi confirmada pelo servidor. Tente novamente.');
  document.getElementById('first-password-screen').hidden=true;
  document.getElementById('first-password-form').reset();
  await carregarPainel(data.user);
 }catch(erro){aviso.textContent=erro.message||'Não foi possível trocar a senha.'}
 finally{botao.disabled=false}
});
document.getElementById('first-password-logout').addEventListener('click',async()=>{
 await cliente.auth.signOut();dados=[];mostrarLogin();
});
function mostrarPainel(){loginScreen.hidden=true;dashboard.hidden=false}
function configurarAnos(){const anos=[...new Set([...dados.map(m=>Number(m.data.slice(0,4))),new Date().getFullYear()])].sort((a,b)=>b-a);anoEl.innerHTML=anos.map(a=>`<option value="${a}">${a}</option>`).join('');anoEl.value=String(new Date().getFullYear());iniciarDatas('');configurarCredito(dados);configurarInvestimentos(dados);configurarCategorias();configurarFiltrosExtras()}
function configurarCategorias(){
 const categorias=[...new Map(dados.map(m=>[normalizar(m.categoria||'Sem categoria'),m.categoria||'Sem categoria'])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
 for(const id of ['categoria','credito-categoria']){
  const el=document.getElementById(id),selecionadas=valoresSelecionados(id);
  el.innerHTML='<option value="todas">Todas as categorias</option>'+categorias.map(([k,v])=>'<option value="'+escapar(k)+'">'+escapar(v)+'</option>').join('');
  for(const o of el.options)o.selected=selecionadas.includes(o.value);
  montarMultiFiltro(id);
 }
}
let historicoPorPagina=20;
let historicoResumo=[],paginaHistorico=1;
function renderizarHistoricoResumo(){
 const aberto=document.getElementById('historico-toggle').getAttribute('aria-expanded')==='true';
 const corpo=document.getElementById('movimentacoes'),mais=document.getElementById('historico-mais');
 if(!aberto){corpo.replaceChildren();mais.hidden=true;return}
 const visiveis=historicoResumo.slice(0,paginaHistorico*historicoPorPagina);
 corpo.innerHTML=visiveis.length?visiveis.map(m=>{const tipo=normalizar(m.tipo_movimentacao)==='entrada'?'entrada':'saida';return `<tr><td data-label="Descrição">${escapar(m.descricao||"Sem descrição")} ${avisoRegistro(m)}</td><td data-label="Categoria">${escapar(m.categoria)}</td><td data-label="Pagamento">${escapar(m.forma_pagamento||'—')}</td><td data-label="Fonte">${escapar(m.fonte_pagamento||'—')}</td><td data-label="Data">${dataBR(m.data)}</td><td data-label="Tipo"><span class="type ${tipo}">${tipo==='entrada'?'Entrada':'Saída'}</span></td><td data-label="Valor" class="right"><span class="money ${tipo}">${tipo==='entrada'?'+':'−'} ${moeda(m.valor)}</span></td><td data-label="Ações">${acoesRegistro(m)}</td></tr>`}).join(''):'<tr><td colspan="8" class="empty">Nenhuma movimentação encontrada para o período selecionado.</td></tr>';
 mais.hidden=visiveis.length>=historicoResumo.length;
 const restantes=historicoResumo.length-visiveis.length;
 mais.textContent='Carregar mais '+Math.min(historicoPorPagina,restantes);
}
document.getElementById('historico-toggle').addEventListener('click',()=>{
 const botao=document.getElementById('historico-toggle'),aberto=botao.getAttribute('aria-expanded')!=='true';
 botao.setAttribute('aria-expanded',String(aberto));
 botao.querySelector('span').textContent=aberto?'Ocultar histórico':'Mostrar histórico';
 document.getElementById('historico-conteudo').hidden=!aberto;
 renderizarHistoricoResumo();
});
document.getElementById('historico-mais').addEventListener('click',()=>{paginaHistorico++;renderizarHistoricoResumo()});
document.getElementById('historico-quantidade').addEventListener('change',e=>{historicoPorPagina=Number(e.target.value);paginaHistorico=1;renderizarHistoricoResumo()});
function atualizar(){const filtrados=filtrarIntervalo(dados,anoEl.value,document.getElementById('inicio').value,document.getElementById('fim').value).filter(m=>(opcaoSelecionada('categoria',normalizar(m.categoria||'Sem categoria')))&&filtrarExtras(m,'')),resumo=calcularResumo(filtrados);
 for(const chave of ['entradas','saidas','credito','investimentos'])document.getElementById(chave).textContent=moeda(resumo[chave]);
 const historico=filtrarPendentes(filtrados,'');document.getElementById('contagem').textContent=`${historico.length} ${historico.length===1?'registro':'registros'}`;
 historicoResumo=historico;paginaHistorico=1;renderizarHistoricoResumo();
 renderizarGrafico(filtrados);renderizarFluxoMensal(dados.filter(m=>opcaoSelecionada('categoria',normalizar(m.categoria||'Sem categoria'))&&filtrarExtras(m,'')),anoEl.value,document.getElementById('inicio').value,document.getElementById('fim').value);renderizarPagamentos(filtrados);atualizarCredito(dados);atualizarInvestimentos(dados)}
async function carregarPainel(usuario){document.getElementById('user-email').textContent=usuario.email||'';document.getElementById('credit-user-email').textContent=usuario.email||'';document.getElementById('invest-user-email').textContent=usuario.email||'';dados=await buscarMovimentacoes(cliente);await carregarPagamentos();await carregarFontes();await atualizarBackupMfa();configurarAnos();atualizar();mostrarPainel()}
// A sessão criada pelo link de recuperação não deve abrir o painel nem iniciar o MFA.
let recuperandoSenha=/(?:[?#&])type=recovery(?:[&#]|$)/.test(location.href);
const recoverScreen=document.getElementById('recover-screen'),resetScreen=document.getElementById('reset-screen');
function exibirTelaAuth(tela){loginScreen.hidden=true;dashboard.hidden=true;document.getElementById('first-password-screen').hidden=true;document.getElementById('mfa-screen').hidden=true;recoverScreen.hidden=tela!=='recover';resetScreen.hidden=tela!=='reset'}
let resetMfaVerificado=false,resetMfaFator=null;
async function prepararRecuperacao(){
 recuperandoSenha=true;exibirTelaAuth('reset');
 const formMfa=document.getElementById('reset-mfa-form'),formSenha=document.getElementById('reset-form');
 const msg=document.getElementById('reset-mfa-message');
 msg.textContent='';formSenha.hidden=true;formMfa.hidden=true;document.getElementById('reset-factor-choice').hidden=true;resetMfaVerificado=false;resetMfaFator=null;
 try{
  const {data:nivel,error:erroNivel}=await cliente.auth.mfa.getAuthenticatorAssuranceLevel();
  if(erroNivel)throw erroNivel;
  if(nivel.currentLevel==='aal2'){resetMfaVerificado=true;formSenha.hidden=false;return}
  const {data:fatores,error:erroFatores}=await cliente.auth.mfa.listFactors();
  if(erroFatores)throw erroFatores;
  const verificados=(fatores.totp||[]).filter(f=>f.status==='verified');
  if(!verificados.length)throw new Error('Nenhum autenticador verificado encontrado. Contate o administrador para recuperar o acesso.');
  resetMfaFator=verificados[0].id;
  const escolha=document.getElementById('reset-factor-choice');
  const select=document.getElementById('reset-factor-select');
  escolha.hidden=verificados.length<2;
  select.replaceChildren(...verificados.map((f,i)=>new Option(f.friendly_name||('Autenticador '+(i+1)),f.id)));
  select.onchange=()=>{resetMfaFator=select.value;};
  formMfa.hidden=false;document.getElementById('reset-mfa-code').focus();
 }catch(err){msg.textContent=err.message||'Não foi possível preparar a recuperação.';formMfa.hidden=false;document.getElementById('reset-mfa-submit').disabled=true}
}
document.getElementById('reset-mfa-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!cliente||!recuperandoSenha||!resetMfaFator)return;
 const codigo=document.getElementById('reset-mfa-code').value.trim(),msg=document.getElementById('reset-mfa-message'),botao=document.getElementById('reset-mfa-submit');
 if(!/^\d{6}$/.test(codigo)){msg.textContent='Digite os 6 números do autenticador.';return}
 botao.disabled=true;msg.textContent='';
 try{
  const {error}=await cliente.auth.mfa.challengeAndVerify({factorId:resetMfaFator,code:codigo});
  if(error)throw error;
  const {data:nivel,error:erroNivel}=await cliente.auth.mfa.getAuthenticatorAssuranceLevel();
  if(erroNivel)throw erroNivel;
  if(nivel.currentLevel!=='aal2')throw new Error('Não foi possível confirmar a sessão MFA.');
  resetMfaVerificado=true;document.getElementById('reset-mfa-form').hidden=true;document.getElementById('reset-form').hidden=false;
  document.getElementById('reset-password').focus();
 }catch(err){msg.textContent=err.message||'Código inválido.'}
 finally{botao.disabled=false}
});
function limparUrlRecuperacao(){history.replaceState(null,'',location.pathname+location.search.replace(/([?&])type=recovery(&|$)/,'$1').replace(/[?&]$/,''))}
document.getElementById('toggle-login-password').addEventListener('click',()=>{
 const campo=document.getElementById('login-password'),botao=document.getElementById('toggle-login-password');
 const visivel=campo.type==='password';campo.type=visivel?'text':'password';
 botao.setAttribute('aria-pressed',String(visivel));botao.setAttribute('aria-label',visivel?'Ocultar senha':'Mostrar senha');botao.title=visivel?'Ocultar senha':'Mostrar senha';
});
document.getElementById('forgot-password').addEventListener('click',()=>{
 document.getElementById('recover-email').value=document.getElementById('login-email').value.trim();
 document.getElementById('recover-message').textContent='';document.getElementById('recover-message').classList.remove('success');
 exibirTelaAuth('recover');
});
document.getElementById('recover-back').addEventListener('click',mostrarLogin);
document.getElementById('reset-back').addEventListener('click',async()=>{
 if(cliente)await cliente.auth.signOut();
 recuperandoSenha=false;resetMfaVerificado=false;limparUrlRecuperacao();mostrarLogin();
});
document.getElementById('recover-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!cliente)return;
 const email=document.getElementById('recover-email').value.trim(),botao=document.getElementById('recover-submit'),msg=document.getElementById('recover-message');
 botao.disabled=true;msg.textContent='';msg.classList.remove('success');
 try{
  const redirectTo=location.origin+location.pathname;
  const {error}=await cliente.auth.resetPasswordForEmail(email,{redirectTo});
  if(error)throw error;
  msg.textContent='Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também o spam.';
  msg.classList.add('success');
 }catch(err){msg.textContent='Não foi possível enviar o link. Tente novamente em instantes.'}
 finally{botao.disabled=false}
});
document.getElementById('reset-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!cliente||!recuperandoSenha||!resetMfaVerificado)return;
 const senha=document.getElementById('reset-password').value,confirmacao=document.getElementById('reset-confirm').value;
 const msg=document.getElementById('reset-message'),botao=document.getElementById('reset-submit');
 msg.textContent='';msg.classList.remove('success');
 if(senha!==confirmacao){msg.textContent='As senhas não coincidem.';return}
 botao.disabled=true;
 try{
  const {error}=await cliente.auth.updateUser({password:senha});
  if(error)throw error;
  await cliente.auth.signOut();
  recuperandoSenha=false;limparUrlRecuperacao();mostrarLogin();
  aviso.textContent='Senha alterada com sucesso. Entre novamente e confirme seu Google Authenticator.';
  document.getElementById('reset-form').reset();
 }catch(err){msg.textContent=err.message||'Não foi possível atualizar a senha.'}
 finally{botao.disabled=false}
});
async function iniciar(){if(!window.supabase || SUPABASE_PUBLISHABLE_KEY==='COLE_AQUI_SUA_CHAVE_PUBLICAVEL'){aviso.textContent='Configure a chave publicável em js/config.js.';return}
 cliente=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
 cliente.auth.onAuthStateChange((evento)=>{
  if(evento==='PASSWORD_RECOVERY'){queueMicrotask(()=>{void prepararRecuperacao()})}
  if(evento==='SIGNED_OUT'&&!recuperandoSenha){ocultarMfa();mostrarLogin()}
 });
 const {data:{session},error}=await cliente.auth.getSession();
 if(error){aviso.textContent=error.message;return}
 if(recuperandoSenha){await prepararRecuperacao();return}
 if(session?.user){try{await exigirMfa(session.user)}catch(e){aviso.textContent='Não foi possível verificar a autenticação: '+e.message;mostrarLogin()}}
}
form.addEventListener('submit',async e=>{e.preventDefault();if(!cliente)return;aviso.textContent='';const botao=document.getElementById('login-button');botao.disabled=true;botao.textContent='Entrando...';try{const {data,error}=await cliente.auth.signInWithPassword({email:document.getElementById('login-email').value.trim(),password:document.getElementById('login-password').value});if(error)throw error;await exigirMfa(data.user)}catch(e){aviso.textContent=e.message==='Invalid login credentials'?'E-mail ou senha incorretos.':e.message}finally{botao.disabled=false;botao.textContent='Entrar'}});
document.getElementById('logout-button').addEventListener('click',async()=>{if(cliente)await cliente.auth.signOut();dados=[];ocultarMfa();mostrarLogin()});
anoEl.addEventListener('change',()=>{ajustarAno('');atualizar()});for(const id of ['inicio','fim'])document.getElementById(id).addEventListener('change',()=>{sincronizarAno('',id);atualizar()});categoriaEl.addEventListener('change',atualizar);
iniciar();

function navegar(pagina){if(!['resumo','credito','investimentos','configuracoes'].includes(pagina))pagina='resumo';if(pagina!=='configuracoes'){for(const id of ['fonte-feedback','pagamento-feedback']){const aviso=document.getElementById(id);if(aviso){aviso.textContent='';aviso.style.color='';}}}document.querySelectorAll('[data-view]').forEach(el=>{el.hidden=el.dataset.view!==pagina});document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===pagina));if(pagina==='credito')atualizarCredito(dados);if(pagina==='investimentos')atualizarInvestimentos(dados);window.scrollTo(0,0)}
document.querySelectorAll('[data-page]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();const pagina=link.dataset.page;navegar(pagina);history.replaceState(null,'','#'+pagina)}));
document.querySelectorAll('[data-mobile-settings]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();navegar('configuracoes');history.replaceState(null,'','#configuracoes')}));
document.querySelector('.credit-logout').addEventListener('click',()=>document.getElementById('logout-button').click());
document.querySelector('.invest-logout').addEventListener('click',()=>document.getElementById('logout-button').click());
window.addEventListener('hashchange',()=>navegar(location.hash.slice(1)));
navegar(location.hash.slice(1));
document.querySelector('[data-go-settings]').addEventListener('click', e => { e.preventDefault(); modal.close(); navegar('configuracoes'); history.replaceState(null,'','#configuracoes'); });

function montarSeletorMes(id){
 const el=document.getElementById(id),caixa=document.querySelector('[data-mes="'+id+'"]');if(!el||!caixa)return;
 caixa.querySelector('summary').textContent=el.selectedOptions[0]?.textContent||'Selecione o mês';
 caixa.querySelector('.month-options').innerHTML=[...el.options].map(o=>'<button type="button" class="month-option" data-month-value="'+escapar(o.value)+'" aria-pressed="'+(o.value===el.value)+'">'+escapar(o.textContent)+'</button>').join('');
}
for(const prefix of ['','credito-','invest-'])for(const campo of ['inicio','fim']){
 const id=prefix+campo,el=document.getElementById(id),caixa=document.querySelector('[data-mes="'+id+'"]');
 montarSeletorMes(id);el.addEventListener('change',()=>montarSeletorMes(id));
 caixa.addEventListener('click',e=>{const b=e.target.closest('[data-month-value]');if(!b)return;el.value=b.dataset.monthValue;el.dispatchEvent(new Event('change',{bubbles:true}));for(const outro of ['inicio','fim'])montarSeletorMes(prefix+outro);caixa.open=false});
}
function iniciarDatas(prefix){const mes=String(new Date().getMonth()+1).padStart(2,'0');document.getElementById(prefix+'inicio').value=mes;document.getElementById(prefix+'fim').value=mes;for(const campo of ['inicio','fim'])montarSeletorMes(prefix+campo)}
function ajustarAno(prefix){const ano=Number(document.getElementById(prefix+'ano').value),hoje=new Date(),mes=ano===hoje.getFullYear()?hoje.getMonth()+1:12;document.getElementById(prefix+'inicio').value=String(mes).padStart(2,'0');document.getElementById(prefix+'fim').value=String(mes).padStart(2,'0');for(const campo of ['inicio','fim'])montarSeletorMes(prefix+campo)}
function sincronizarAno(prefix,id){const ini=document.getElementById(prefix+'inicio'),fim=document.getElementById(prefix+'fim');if(ini.value>fim.value){if(id==='inicio')fim.value=ini.value;else ini.value=fim.value}for(const campo of ['inicio','fim'])montarSeletorMes(prefix+campo)}
const modal=document.getElementById('entry-dialog'),formEntry=document.getElementById('entry-form');let editingId=null,deletingId=null;
function abrirFormulario(id=null){editingId=id;formEntry.reset();document.getElementById('entry-error').textContent='';document.getElementById('entry-title').textContent=id?'Editar movimentação':'Nova movimentação';const m=dados.find(r=>String(r.id)===String(id));formEntry.elements.tipo_movimentacao.value=m?.tipo_movimentacao||'saida';for(const k of ['descricao','valor'])formEntry.elements[k].value=m?.[k]??'';configurarCategoriaFormulario(m?.categoria||'');formEntry.elements.data.value=m?.data||new Date().toLocaleDateString('en-CA');configurarPagamentosFormulario(m?.forma_pagamento||'');configurarFontesFormulario(m?.fonte_pagamento||'');modal.showModal()}
document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>abrirFormulario()));
document.getElementById('entry-close').onclick=()=>modal.close();document.getElementById('entry-cancel').onclick=()=>modal.close();
document.addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit)abrirFormulario(edit.dataset.edit);if(del){deletingId=del.dataset.delete;document.getElementById('delete-description').textContent=dados.find(m=>String(m.id)===String(deletingId))?.descricao||'';document.getElementById('delete-error').textContent='';document.getElementById('delete-dialog').showModal()}});
document.getElementById('delete-cancel').onclick=()=>document.getElementById('delete-dialog').close();
async function recarregar(){dados=await buscarMovimentacoes(cliente);configurarCategorias();configurarFiltrosExtras();atualizar();atualizarCredito(dados);atualizarInvestimentos(dados)}
formEntry.addEventListener('submit',async e=>{e.preventDefault();const save=document.getElementById('entry-save');save.disabled=true;document.getElementById('entry-error').textContent='';try{const {data:{user},error:authError}=await cliente.auth.getUser();if(authError||!user)throw new Error('Sessão expirada. Entre novamente.');const payload={};for(const k of ['tipo_movimentacao','descricao','valor','categoria','forma_pagamento','fonte_pagamento','data'])payload[k]=formEntry.elements[k].value.trim();payload.categoria=document.getElementById('categoria-nova').hidden?formEntry.elements.categoria.value.trim():document.getElementById('categoria-nova').value.trim();if(!payload.categoria||payload.categoria.length>100)throw new Error('Informe uma categoria com até 100 caracteres.');payload.fonte_pagamento=payload.fonte_pagamento||null;payload.valor=Number(payload.valor);if(!Number.isFinite(payload.valor)||payload.valor<0)throw new Error('Valor inválido.');let query;if(editingId){query=cliente.from('movimentacoes').update(payload).eq('id',editingId).eq('user_id',user.id).select('id')}else{query=cliente.from('movimentacoes').insert({...payload,user_id:user.id}).select('id')}const {data:salvos,error}=await query;if(error)throw error;if(!salvos?.length)throw new Error('Registro não encontrado ou sem permissão.');await recarregar();modal.close()}catch(err){document.getElementById('entry-error').textContent=err.message}finally{save.disabled=false}});
document.getElementById('delete-confirm').onclick=async()=>{const b=document.getElementById('delete-confirm');b.disabled=true;try{const {data:{user},error:authError}=await cliente.auth.getUser();if(authError||!user)throw new Error('Sessão expirada.');const {data:removidos,error}=await cliente.from('movimentacoes').delete().eq('id',deletingId).eq('user_id',user.id).select('id');if(error)throw error;if(!removidos?.length)throw new Error('Registro não encontrado ou sem permissão.');await recarregar();document.getElementById('delete-dialog').close()}catch(e){document.getElementById('delete-error').textContent=e.message}finally{b.disabled=false}};

function configurarFiltrosExtras(){
 for(const prefix of ['','credito-','invest-']){
  for(const [campo,atributo] of [['pagamento','forma_pagamento'],['fonte','fonte_pagamento']]){
   const el=document.getElementById(prefix+campo),anteriores=valoresSelecionados(prefix+campo);
   const valores=new Map();
   for(const m of dados){
    const valor=(m[atributo]||'').trim(),chave=normalizar(valor);
    if(valor&&!valores.has(chave))valores.set(chave,valor);
   }
   if(campo==='fonte')valores.set('__sem_fonte__','Sem fonte informada');
   const opcoes=[...valores.entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
   el.innerHTML='<option value="todos">Todas as '+(campo==='fonte'?'fontes':'formas')+'</option>'+opcoes.map(([k,v])=>'<option value="'+escapar(k)+'">'+escapar(v)+'</option>').join('');
   for(const o of el.options)o.selected=anteriores.includes(o.value);
   montarMultiFiltro(prefix+campo);
  }
 }
}
function filtrarExtras(m,prefix){
 return opcaoSelecionada(prefix+'tipo',normalizar(m.tipo_movimentacao))
  &&opcaoSelecionada(prefix+'pagamento',normalizar(m.forma_pagamento))
  &&opcaoSelecionada(prefix+'fonte',normalizar(m.fonte_pagamento||'')||'__sem_fonte__');
}
for(const prefix of ['','credito-','invest-']){const controls=document.getElementById(prefix+'filter-controls'),botao=document.querySelector('[aria-controls="'+controls.id+'"]');botao.addEventListener('click',()=>{const aberto=botao.getAttribute('aria-expanded')==='true';botao.setAttribute('aria-expanded',String(!aberto));botao.setAttribute('aria-label',aberto?'Mostrar filtros':'Ocultar filtros');botao.title=aberto?'Mostrar filtros':'Ocultar filtros';controls.hidden=aberto});for(const campo of ['tipo','pagamento','fonte'])montarMultiFiltro(prefix+campo)}

function configurarCategoriaFormulario(atual=''){
 const select=formEntry.elements.categoria,nomes=new Map();
 for(const m of dados){const v=(m.categoria||'').trim();if(v)nomes.set(normalizar(v),v)}
 if(atual&&!nomes.has(normalizar(atual)))nomes.set(normalizar(atual),atual);
 select.innerHTML='<option value="">Selecione uma categoria</option>'+ [...nomes.values()].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(v=>'<option value="'+escapar(v)+'">'+escapar(v)+'</option>').join('');
 select.value=nomes.get(normalizar(atual))||'';
 document.getElementById('categoria-nova').hidden=true;document.getElementById('categoria-nova').value='';
 select.hidden=false;select.required=true;document.getElementById('categoria-nova').required=false;const botao=document.getElementById('categoria-alternar');botao.textContent='+';botao.setAttribute('aria-label','Criar nova categoria');
}
document.getElementById('categoria-alternar').addEventListener('click',()=>{
 const select=formEntry.elements.categoria,input=document.getElementById('categoria-nova'),novo=input.hidden;
 input.hidden=!novo;select.hidden=novo;select.required=!novo;input.required=novo;
 if(novo){input.value='';input.focus()}else input.value='';
 const b=document.getElementById('categoria-alternar');b.textContent=novo?'↩':'+';b.setAttribute('aria-label',novo?'Selecionar categoria existente':'Criar nova categoria');
});
function configurarPagamentosFormulario(atual='') {
 const el=formEntry.elements.forma_pagamento;
 const valores=new Map();
 for(const nome of nomesPagamentos()) valores.set(normalizar(nome),nome);
 // Preserva o valor de movimentações antigas mesmo após a exclusão da opção.
 if(atual&&!valores.has(normalizar(atual))) valores.set(normalizar(atual),atual);
 const opcoes=[...valores.values()];
 el.innerHTML='<option value="">Selecione a forma de pagamento</option>'+opcoes.map(v=>'<option value="'+escapar(v)+'">'+escapar(v)+'</option>').join('');
 el.value=valores.get(normalizar(atual))||'';
}

function configurarFontesFormulario(atual=''){
 const el=formEntry.elements.fonte_pagamento;
 const valores=new Map(fontesPersonalizadas.map(f=>[normalizar(f.nome),f.nome]));
 if(atual&&!valores.has(normalizar(atual)))valores.set(normalizar(atual),atual);
 el.innerHTML='<option value="">Sem fonte informada</option>'+[...valores.values()].map(v=>'<option value="'+escapar(v)+'">'+escapar(v)+'</option>').join('');
 el.value=atual||'';
}
for(const [prefix,view] of [['','resumo'],['credito-','credito'],['invest-','investimentos']]){const botao=document.querySelector('[data-view="'+view+'"] [data-warning]');botao.dataset.prefix=prefix;botao.addEventListener('click',()=>{const ativo=botao.getAttribute('aria-pressed')==='true';botao.setAttribute('aria-pressed',String(!ativo));if(prefix==='credito-')atualizarCredito(dados);else if(prefix==='invest-')atualizarInvestimentos(dados);else atualizar()})}
function renderizarPagamentos(registros){const cores=['#8489ff','#48d7ad','#ffb45d','#ff8195','#7bc2ff','#c69eff','#d5cf76'],grupos=new Map();for(const m of registros){if(normalizar(m.tipo_movimentacao)!=='saida')continue;const nome=(m.forma_pagamento||'').trim()||'Não informado',chave=normalizar(nome);if(!grupos.has(chave))grupos.set(chave,{nome,valor:0});grupos.get(chave).valor+=Number(m.valor)||0}const itens=[...grupos.values()].sort((a,b)=>b.valor-a.valor),total=itens.reduce((s,g)=>s+g.valor,0);let p=0;const faixas=itens.map((g,i)=>{const inicio=p;p+=total?g.valor/total*100:0;return cores[i%cores.length]+' '+inicio+'% '+p+'%'});document.getElementById('payment-donut').style.background=total?'conic-gradient('+faixas.join(',')+')':'#303b4c';document.getElementById('payment-total').textContent=moeda(total);document.getElementById('payment-legend').innerHTML=itens.length?itens.map((g,i)=>'<div class="legend-item"><span class="legend-swatch" style="background:'+cores[i%cores.length]+'"></span><span class="legend-name">'+escapar(g.nome)+'</span><span class="legend-value">'+moeda(g.valor)+'</span><span class="legend-pct">'+(total?Math.round(g.valor/total*100):0)+'%</span></div>').join(''):'<span style="color:var(--muted)">Nenhuma saída no período.</span>'}

// Limpar filtros da seção ativa e restaurar o mês atual.
for(const prefix of ['','credito-','invest-']){
 const limpar=document.querySelector('[data-view="'+(prefix==='credito-'?'credito':prefix==='invest-'?'investimentos':'resumo')+'"] [data-clear-filters]');
 limpar.addEventListener('click',()=>{
  document.getElementById(prefix+'ano').value=String(new Date().getFullYear());
  iniciarDatas(prefix);
  for(const campo of ['categoria','tipo','pagamento','fonte']){const el=document.getElementById(prefix+campo);if(el){Array.from(el.options).forEach(o=>o.selected=false);montarMultiFiltro(prefix+campo)}}
  if(prefix==='credito-')atualizarCredito(dados);
  else if(prefix==='invest-')atualizarInvestimentos(dados);
  else atualizar();
 });
}

function valoresSelecionados(id){const el=document.getElementById(id);return el?[...el.selectedOptions].map(o=>o.value).filter(v=>v!=='todos'&&v!=='todas'):[]}
function opcaoSelecionada(id,valor){const selecionados=valoresSelecionados(id);return !selecionados.length||selecionados.includes(valor)}
function atualizarFiltroPorId(id){if(id.startsWith('credito-'))atualizarCredito(dados);else if(id.startsWith('invest-'))atualizarInvestimentos(dados);else atualizar()}
function montarMultiFiltro(id){
 const el=document.getElementById(id),caixa=document.querySelector('[data-multi="'+id+'"]');if(!el||!caixa)return;
 const atuais=valoresSelecionados(id),opcoes=[...el.options].filter(o=>o.value!=='todos'&&o.value!=='todas'),todos=opcoes.length>0&&atuais.length===opcoes.length;
 caixa.querySelector('.multi-options').innerHTML='<label class="multi-all"><input type="checkbox" data-select-all '+(todos?'checked':'')+'><span>Marcar/desmarcar todos</span></label>'+opcoes.map(o=>'<label><input type="checkbox" value="'+escapar(o.value)+'" '+(atuais.includes(o.value)?'checked':'')+'><span>'+escapar(o.textContent)+'</span></label>').join('');
 caixa.querySelector('summary').textContent=atuais.length?(todos?'Todas as opções':atuais.length===1?(opcoes.find(o=>o.value===atuais[0])?.textContent||'1 selecionado'):atuais.length+' selecionados'):'Todas as opções';
}
for(const caixa of document.querySelectorAll('[data-multi]')){
 caixa.addEventListener('change',e=>{
  if(!e.target.matches('input[type="checkbox"]'))return;
  const id=caixa.dataset.multi,el=document.getElementById(id);
  if(e.target.matches('[data-select-all]')){for(const o of el.options)o.selected=o.value!=='todos'&&o.value!=='todas'&&e.target.checked}
  else{const valores=[...caixa.querySelectorAll('input:checked:not([data-select-all])')].map(i=>i.value);for(const o of el.options)o.selected=valores.includes(o.value)}
  montarMultiFiltro(id);atualizarFiltroPorId(id);
 });
}
document.addEventListener('click',e=>{for(const caixa of document.querySelectorAll('[data-multi][open]'))if(!caixa.contains(e.target))caixa.open=false});

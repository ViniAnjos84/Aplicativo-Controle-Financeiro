const escapar=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const loginScreen=document.getElementById('login-screen'), dashboard=document.getElementById('dashboard');
const form=document.getElementById('login-form'), aviso=document.getElementById('login-error');
const anoEl=document.getElementById('ano'),categoriaEl=document.getElementById('categoria');
let dados=[], cliente=null;
function mostrarLogin(){loginScreen.hidden=false;dashboard.hidden=true;document.getElementById('mfa-screen').hidden=true;document.getElementById('first-password-screen').hidden=true;document.getElementById('login-password').value='';document.getElementById('login-password').type='password';document.getElementById('toggle-login-password').setAttribute('aria-pressed','false');document.getElementById('toggle-login-password').setAttribute('aria-label','Mostrar senha');document.getElementById('toggle-login-password').title='Mostrar senha'}
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
function configurarCategorias(){const categorias=[...new Map(dados.map(m=>[normalizar(m.categoria||'Sem categoria'),m.categoria||'Sem categoria'])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));for(const id of ['categoria','credito-categoria']){const el=document.getElementById(id),anterior=el.value;el.innerHTML='<option value="todas">Todas as categorias</option>'+categorias.map(([chave,nome])=>`<option value="${escapar(chave)}">${escapar(nome)}</option>`).join('');el.value=categorias.some(([chave])=>chave===anterior)?anterior:'todas';montarMultiFiltro(id)}}
function atualizar(){const filtrados=filtrarIntervalo(dados,anoEl.value,document.getElementById('inicio').value,document.getElementById('fim').value).filter(m=>(opcaoSelecionada('categoria',normalizar(m.categoria||'Sem categoria')))&&filtrarExtras(m,'')),resumo=calcularResumo(filtrados);
 for(const chave of ['entradas','saidas','credito','investimentos'])document.getElementById(chave).textContent=moeda(resumo[chave]);
 const historico=filtrarPendentes(filtrados,'');document.getElementById('contagem').textContent=`${historico.length} ${historico.length===1?'registro':'registros'}`;
 document.getElementById('movimentacoes').innerHTML=historico.length?historico.map(m=>{const tipo=normalizar(m.tipo_movimentacao)==='entrada'?'entrada':'saida';return `<tr><td data-label="Descrição">${escapar(m.descricao||"Sem descrição")} ${avisoRegistro(m)}</td><td data-label="Categoria">${escapar(m.categoria)}</td><td data-label="Pagamento">${escapar(m.forma_pagamento||'—')}</td><td data-label="Data">${dataBR(m.data)}</td><td data-label="Tipo"><span class="type ${tipo}">${tipo==='entrada'?'Entrada':'Saída'}</span></td><td data-label="Valor" class="right"><span class="money ${tipo}">${tipo==='entrada'?'+':'−'} ${moeda(m.valor)}</span></td><td data-label="Ações">${acoesRegistro(m)}</td></tr>`}).join(''):'<tr><td colspan="7" class="empty">Nenhuma movimentação encontrada para o período selecionado.</td></tr>';
 renderizarGrafico(filtrados);renderizarFluxoMensal(dados.filter(m=>opcaoSelecionada('categoria',normalizar(m.categoria||'Sem categoria'))&&filtrarExtras(m,'')),anoEl.value,document.getElementById('inicio').value,document.getElementById('fim').value);renderizarPagamentos(filtrados);atualizarCredito(dados);atualizarInvestimentos(dados)}
async function carregarPainel(usuario){const {data:nivel,error}=await cliente.auth.mfa.getAuthenticatorAssuranceLevel();if(error)throw error;if(nivel.currentLevel!=='aal2')throw new Error('Confirme o segundo fator antes de acessar os dados.');document.getElementById('user-email').textContent=usuario.email||'';document.getElementById('credit-user-email').textContent=usuario.email||'';document.getElementById('invest-user-email').textContent=usuario.email||'';dados=await buscarMovimentacoes(cliente);await carregarPagamentos();configurarAnos();atualizar();mostrarPainel()}
document.getElementById('toggle-login-password').addEventListener('click',()=>{
 const campo=document.getElementById('login-password'),botao=document.getElementById('toggle-login-password');
 const visivel=campo.type==='password';campo.type=visivel?'text':'password';
 botao.setAttribute('aria-pressed',String(visivel));botao.setAttribute('aria-label',visivel?'Ocultar senha':'Mostrar senha');botao.title=visivel?'Ocultar senha':'Mostrar senha';
});
let recuperacaoBloqueada=/(?:[?#&])type=recovery(?:[&#]|$)/.test(location.href);
async function iniciar(){if(!window.supabase || SUPABASE_PUBLISHABLE_KEY==='COLE_AQUI_SUA_CHAVE_PUBLICAVEL'){aviso.textContent='Configure a chave publicável em js/config.js.';return}
 cliente=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
 cliente.auth.onAuthStateChange((evento)=>{
  if(evento==='PASSWORD_RECOVERY'){recuperacaoBloqueada=true;setTimeout(async()=>{await cliente.auth.signOut();mostrarLogin();aviso.textContent='Use a versão principal para recuperar sua senha.'},0)}
  if(evento==='SIGNED_OUT'){dados=[];pagamentosPersonalizados=[];ocultarMfa();mostrarLogin()}
 });
 const {data:{session},error}=await cliente.auth.getSession();
 if(error){aviso.textContent=error.message;return}
 if(recuperacaoBloqueada){await cliente.auth.signOut();mostrarLogin();aviso.textContent='Use a versão principal para recuperar sua senha.';return}
 if(session?.user){try{await exigirMfa(session.user)}catch(e){aviso.textContent='Não foi possível verificar a autenticação: '+e.message;mostrarLogin()}}
}
form.addEventListener('submit',async e=>{e.preventDefault();if(!cliente)return;aviso.textContent='';const botao=document.getElementById('login-button');botao.disabled=true;botao.textContent='Entrando...';try{const {data,error}=await cliente.auth.signInWithPassword({email:document.getElementById('login-email').value.trim(),password:document.getElementById('login-password').value});if(error)throw error;await exigirMfa(data.user)}catch(e){aviso.textContent=e.message==='Invalid login credentials'?'E-mail ou senha incorretos.':e.message}finally{botao.disabled=false;botao.textContent='Entrar'}});
document.getElementById('logout-button').addEventListener('click',async()=>{if(cliente)await cliente.auth.signOut();dados=[];ocultarMfa();mostrarLogin()});
anoEl.addEventListener('change',()=>{ajustarAno('');atualizar()});for(const id of ['inicio','fim'])document.getElementById(id).addEventListener('change',()=>{sincronizarAno('',id);atualizar()});categoriaEl.addEventListener('change',atualizar);
iniciar();

function navegar(pagina){if(!['resumo','credito','investimentos','configuracoes'].includes(pagina))pagina='resumo';document.querySelectorAll('[data-view]').forEach(el=>{el.hidden=el.dataset.view!==pagina});document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===pagina));if(pagina==='credito')atualizarCredito(dados);if(pagina==='investimentos')atualizarInvestimentos(dados);window.scrollTo(0,0)}
document.querySelectorAll('[data-page]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();const pagina=link.dataset.page;navegar(pagina);history.replaceState(null,'','#'+pagina)}));
document.querySelector('.credit-logout').addEventListener('click',()=>document.getElementById('logout-button').click());
document.querySelector('.invest-logout').addEventListener('click',()=>document.getElementById('logout-button').click());
window.addEventListener('hashchange',()=>navegar(location.hash.slice(1)));
navegar(location.hash.slice(1));
document.querySelector('[data-go-settings]').addEventListener('click', e => { e.preventDefault(); modal.close(); navegar('configuracoes'); history.replaceState(null,'','#configuracoes'); });

function iniciarDatas(prefix){const mes=String(new Date().getMonth()+1).padStart(2,'0');document.getElementById(prefix+'inicio').value=mes;document.getElementById(prefix+'fim').value=mes}
function ajustarAno(prefix){const ano=Number(document.getElementById(prefix+'ano').value),hoje=new Date(),mes=ano===hoje.getFullYear()?hoje.getMonth()+1:12;document.getElementById(prefix+'inicio').value=String(mes).padStart(2,'0');document.getElementById(prefix+'fim').value=String(mes).padStart(2,'0')}
function sincronizarAno(prefix,id){const ini=document.getElementById(prefix+'inicio'),fim=document.getElementById(prefix+'fim');if(ini.value>fim.value){if(id==='inicio')fim.value=ini.value;else ini.value=fim.value}}
const modal=document.getElementById('entry-dialog'),formEntry=document.getElementById('entry-form');let editingId=null,deletingId=null;
function abrirFormulario(id=null){editingId=id;formEntry.reset();document.getElementById('entry-error').textContent='';document.getElementById('entry-title').textContent=id?'Editar movimentação':'Nova movimentação';const m=dados.find(r=>String(r.id)===String(id));formEntry.elements.tipo_movimentacao.value=m?.tipo_movimentacao||'saida';for(const k of ['descricao','valor','categoria'])formEntry.elements[k].value=m?.[k]??'';formEntry.elements.data.value=m?.data||new Date().toLocaleDateString('en-CA');configurarPagamentosFormulario(m?.forma_pagamento||'');modal.showModal()}
document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>abrirFormulario()));
document.getElementById('entry-close').onclick=()=>modal.close();document.getElementById('entry-cancel').onclick=()=>modal.close();
document.addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit)abrirFormulario(edit.dataset.edit);if(del){deletingId=del.dataset.delete;document.getElementById('delete-description').textContent=dados.find(m=>String(m.id)===String(deletingId))?.descricao||'';document.getElementById('delete-error').textContent='';document.getElementById('delete-dialog').showModal()}});
document.getElementById('delete-cancel').onclick=()=>document.getElementById('delete-dialog').close();
async function recarregar(){dados=await buscarMovimentacoes(cliente);configurarCategorias();configurarFiltrosExtras();atualizar()}
formEntry.addEventListener('submit',async e=>{e.preventDefault();const save=document.getElementById('entry-save');save.disabled=true;document.getElementById('entry-error').textContent='';try{const {data:{user},error:authError}=await cliente.auth.getUser();if(authError||!user)throw new Error('Sessão expirada. Entre novamente.');const payload={};for(const k of ['tipo_movimentacao','descricao','valor','categoria','forma_pagamento','data'])payload[k]=formEntry.elements[k].value.trim();payload.valor=Number(payload.valor);if(!Number.isFinite(payload.valor)||payload.valor<0)throw new Error('Valor inválido.');let query;if(editingId){query=cliente.from('movimentacoes_academicas').update(payload).eq('id',editingId).eq('user_id',user.id).select('id')}else{query=cliente.from('movimentacoes_academicas').insert({...payload,user_id:user.id}).select('id')}const {data:salvos,error}=await query;if(error)throw error;if(!salvos?.length)throw new Error('Registro não encontrado ou sem permissão.');await recarregar();modal.close()}catch(err){document.getElementById('entry-error').textContent=err.message}finally{save.disabled=false}});
document.getElementById('delete-confirm').onclick=async()=>{const b=document.getElementById('delete-confirm');b.disabled=true;try{const {data:{user},error:authError}=await cliente.auth.getUser();if(authError||!user)throw new Error('Sessão expirada.');const {data:removidos,error}=await cliente.from('movimentacoes_academicas').delete().eq('id',deletingId).eq('user_id',user.id).select('id');if(error)throw error;if(!removidos?.length)throw new Error('Registro não encontrado ou sem permissão.');await recarregar();document.getElementById('delete-dialog').close()}catch(e){document.getElementById('delete-error').textContent=e.message}finally{b.disabled=false}};

function configurarFiltrosExtras(){for(const prefix of ['','credito-','invest-']){const el=document.getElementById(prefix+'pagamento'),anterior=el.value;const valores=new Map();for(const m of dados){const valor=(m.forma_pagamento||'').trim();if(valor&&!valores.has(normalizar(valor)))valores.set(normalizar(valor),valor)}const opcoes=[...valores.entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));el.innerHTML='<option value="todos">Todas as formas</option>'+opcoes.map(([k,v])=>'<option value="'+escapar(k)+'">'+escapar(v)+'</option>').join('');el.value=opcoes.some(([k])=>k===anterior)?anterior:'todos';montarMultiFiltro(prefix+'pagamento')}}
function filtrarExtras(m,prefix){return opcaoSelecionada(prefix+'tipo',normalizar(m.tipo_movimentacao))&&opcaoSelecionada(prefix+'pagamento',normalizar(m.forma_pagamento))}
for(const prefix of ['','credito-','invest-']){const controls=document.getElementById(prefix+'filter-controls'),botao=document.querySelector('[aria-controls="'+controls.id+'"]');botao.addEventListener('click',()=>{const aberto=botao.getAttribute('aria-expanded')==='true';botao.setAttribute('aria-expanded',String(!aberto));botao.setAttribute('aria-label',aberto?'Mostrar filtros':'Ocultar filtros');botao.title=aberto?'Mostrar filtros':'Ocultar filtros';controls.hidden=aberto});for(const campo of ['tipo','pagamento'])montarMultiFiltro(prefix+campo)}

function configurarPagamentosFormulario(atual='') {
 const el=formEntry.elements.forma_pagamento;
 const valores=new Map();
 for(const nome of nomesPagamentos()) valores.set(normalizar(nome),nome);
 // Preserva o valor de movimentações antigas mesmo após a exclusão da opção.
 if(atual&&!valores.has(normalizar(atual))) valores.set(normalizar(atual),atual);
 const opcoes=[...valores.values()];
 el.innerHTML='<option value="">Selecione a forma de pagamento</option>'+opcoes.map(v=>'<option value="'+escapar(v)+'">'+escapar(v)+'</option>').join('');
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
  for(const campo of ['categoria','tipo','pagamento']){const el=document.getElementById(prefix+campo);if(el){Array.from(el.options).forEach(o=>o.selected=false);montarMultiFiltro(prefix+campo)}}
  if(prefix==='credito-')atualizarCredito(dados);
  else if(prefix==='invest-')atualizarInvestimentos(dados);
  else atualizar();
 });
}

function valoresSelecionados(id){const el=document.getElementById(id);return el?[...el.selectedOptions].map(o=>o.value).filter(v=>v!=='todos'&&v!=='todas'):[]}
function opcaoSelecionada(id,valor){const selecionados=valoresSelecionados(id);return !selecionados.length||selecionados.includes(valor)}
function montarMultiFiltro(id){
 const el=document.getElementById(id),caixa=document.querySelector('[data-multi="'+id+'"]');if(!el||!caixa)return;
 const atuais=valoresSelecionados(id),opcoes=[...el.options].filter(o=>o.value!=='todos'&&o.value!=='todas');
 for(const o of el.options)o.selected=atuais.includes(o.value);
 caixa.querySelector('.multi-options').innerHTML=opcoes.map(o=>'<label><input type="checkbox" value="'+escapar(o.value)+'" '+(atuais.includes(o.value)?'checked':'')+'><span>'+escapar(o.textContent)+'</span></label>').join('');
 caixa.querySelector('summary').textContent=atuais.length?atuais.length===1?(opcoes.find(o=>o.value===atuais[0])?.textContent||'1 selecionado'):atuais.length+' selecionados':'Todas as opções';
}
for(const caixa of document.querySelectorAll('[data-multi]')){
 caixa.addEventListener('change',e=>{
  if(!e.target.matches('input[type="checkbox"]'))return;
  const id=caixa.dataset.multi,el=document.getElementById(id),valores=[...caixa.querySelectorAll('input:checked')].map(i=>i.value);
  for(const o of el.options)o.selected=valores.includes(o.value);
  montarMultiFiltro(id);
  if(id.startsWith('credito-'))atualizarCredito(dados);
  else if(id.startsWith('invest-'))atualizarInvestimentos(dados);
  else atualizar();
 });
}
document.addEventListener('click',e=>{for(const caixa of document.querySelectorAll('[data-multi][open]'))if(!caixa.contains(e.target))caixa.open=false});

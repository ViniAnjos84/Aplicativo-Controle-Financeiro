const escapar=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const loginScreen=document.getElementById('login-screen'), dashboard=document.getElementById('dashboard');
const form=document.getElementById('login-form'), aviso=document.getElementById('login-error');
const anoEl=document.getElementById('ano'),mesEl=document.getElementById('mes'),categoriaEl=document.getElementById('categoria');
let dados=[], cliente=null;
function mostrarLogin(){loginScreen.hidden=false;dashboard.hidden=true;document.getElementById('login-password').value=''}
function mostrarPainel(){loginScreen.hidden=true;dashboard.hidden=false}
function configurarAnos(){const anos=[...new Set([...dados.map(m=>Number(m.data.slice(0,4))),new Date().getFullYear()])].sort((a,b)=>b-a);anoEl.innerHTML=anos.map(a=>`<option value="${a}">${a}</option>`).join('');anoEl.value=String(new Date().getFullYear());mesEl.value=String(new Date().getMonth());configurarCredito(dados);configurarInvestimentos(dados);configurarCategorias()}
function configurarCategorias(){const categorias=[...new Map(dados.map(m=>[normalizar(m.categoria||'Sem categoria'),m.categoria||'Sem categoria'])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));for(const id of ['categoria','credito-categoria']){const el=document.getElementById(id),anterior=el.value;el.innerHTML='<option value="todas">Todas as categorias</option>'+categorias.map(([chave,nome])=>`<option value="${escapar(chave)}">${escapar(nome)}</option>`).join('');el.value=categorias.some(([chave])=>chave===anterior)?anterior:'todas'}}
function atualizar(){const filtrados=filtrarMovimentacoes(dados,anoEl.value,mesEl.value).filter(m=>categoriaEl.value==='todas'||normalizar(m.categoria||'Sem categoria')===categoriaEl.value),resumo=calcularResumo(filtrados);
 for(const chave of ['entradas','saidas','credito','investimentos'])document.getElementById(chave).textContent=moeda(resumo[chave]);
 document.getElementById('contagem').textContent=`${filtrados.length} ${filtrados.length===1?'registro':'registros'}`;
 document.getElementById('movimentacoes').innerHTML=filtrados.length?filtrados.map(m=>{const tipo=normalizar(m.tipo_movimentacao)==='entrada'?'entrada':'saida';return `<tr><td data-label="Descrição">${escapar(m.descricao)}</td><td data-label="Categoria">${escapar(m.categoria)}</td><td data-label="Pagamento">${escapar(m.forma_pagamento||'—')}</td><td data-label="Data">${dataBR(m.data)}</td><td data-label="Tipo"><span class="type ${tipo}">${tipo==='entrada'?'Entrada':'Saída'}</span></td><td data-label="Valor" class="right"><span class="money ${tipo}">${tipo==='entrada'?'+':'−'} ${moeda(m.valor)}</span></td></tr>`}).join(''):'<tr><td colspan="6" class="empty">Nenhuma movimentação encontrada para o período selecionado.</td></tr>';
 renderizarGrafico(filtrados);atualizarCredito(dados);atualizarInvestimentos(dados)}
async function carregarPainel(usuario){document.getElementById('user-email').textContent=usuario.email||'';document.getElementById('credit-user-email').textContent=usuario.email||'';document.getElementById('invest-user-email').textContent=usuario.email||'';dados=await buscarMovimentacoes(cliente);configurarAnos();atualizar();mostrarPainel()}
async function iniciar(){if(!window.supabase || SUPABASE_PUBLISHABLE_KEY==='COLE_AQUI_SUA_CHAVE_PUBLICAVEL'){aviso.textContent='Configure a chave publicável em js/config.js.';return}
 cliente=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
 const {data:{session},error}=await cliente.auth.getSession();if(error){aviso.textContent=error.message;return}
 if(session?.user){try{await carregarPainel(session.user)}catch(e){aviso.textContent='Não foi possível carregar os dados: '+e.message;mostrarLogin()}}
 cliente.auth.onAuthStateChange((evento)=>{if(evento==='SIGNED_OUT')mostrarLogin()});
}
form.addEventListener('submit',async e=>{e.preventDefault();if(!cliente)return;aviso.textContent='';const botao=document.getElementById('login-button');botao.disabled=true;botao.textContent='Entrando...';try{const {data,error}=await cliente.auth.signInWithPassword({email:document.getElementById('login-email').value.trim(),password:document.getElementById('login-password').value});if(error)throw error;await carregarPainel(data.user)}catch(e){aviso.textContent=e.message==='Invalid login credentials'?'E-mail ou senha incorretos.':e.message}finally{botao.disabled=false;botao.textContent='Entrar'}});
document.getElementById('logout-button').addEventListener('click',async()=>{if(cliente)await cliente.auth.signOut();dados=[];mostrarLogin()});
anoEl.addEventListener('change',atualizar);mesEl.addEventListener('change',atualizar);categoriaEl.addEventListener('change',atualizar);
iniciar();

function navegar(pagina){if(!['resumo','credito','investimentos'].includes(pagina))pagina='resumo';document.querySelectorAll('[data-view]').forEach(el=>{el.hidden=el.dataset.view!==pagina});document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===pagina));if(pagina==='credito')atualizarCredito(dados);if(pagina==='investimentos')atualizarInvestimentos(dados);window.scrollTo(0,0)}
document.querySelectorAll('[data-page]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();const pagina=link.dataset.page;navegar(pagina);history.replaceState(null,'','#'+pagina)}));
document.querySelector('.credit-logout').addEventListener('click',()=>document.getElementById('logout-button').click());
document.querySelector('.invest-logout').addEventListener('click',()=>document.getElementById('logout-button').click());
window.addEventListener('hashchange',()=>navegar(location.hash.slice(1)));
navegar(location.hash.slice(1));

const PAGAMENTO_AMBIENTE = 'principal';
const PAGAMENTOS_PADRAO = ['Pix', 'Dinheiro', 'Débito', 'Crédito'];
let pagamentosPersonalizados = [];

function nomesPagamentos() {
  return [...PAGAMENTOS_PADRAO, ...pagamentosPersonalizados.map(p => p.nome)];
}
async function carregarPagamentos() {
  const {data, error} = await cliente.from('formas_pagamento').select('id,nome')
    .eq('ambiente', PAGAMENTO_AMBIENTE).order('nome');
  if (error) throw error;
  pagamentosPersonalizados = data || [];
  renderizarConfiguracoes();
}
function renderizarConfiguracoes() {
  const lista = document.getElementById('lista-pagamentos');
  if (!lista) return;
  const padroes = PAGAMENTOS_PADRAO.map(nome =>
    '<li><span>' + escapar(nome) + '</span><small>Padrão</small></li>');
  const pessoais = pagamentosPersonalizados.map(p =>
    '<li><span>' + escapar(p.nome) + '</span><div class="payment-actions"><button type="button" data-renomear-pagamento="' + p.id + '">Renomear</button><button type="button" data-excluir-pagamento="' + p.id + '">Excluir</button></div></li>');
  lista.innerHTML = [...padroes, ...pessoais].join('');
}
function avisoPagamento(mensagem, erro=false) {
  const el = document.getElementById('pagamento-feedback');
  el.textContent = mensagem;
  el.style.color = erro ? 'var(--red)' : 'var(--green)';
}
function validarNomePagamento(nome, ignorarId=null) {
  const valor = nome.trim().replace(/\s+/g, ' ');
  if (!valor || valor.length > 100) throw new Error('Informe um nome com até 100 caracteres.');
  if (PAGAMENTOS_PADRAO.some(p => normalizar(p) === normalizar(valor)) ||
      pagamentosPersonalizados.some(p => p.id !== ignorarId && normalizar(p.nome) === normalizar(valor)))
    throw new Error('Essa forma de pagamento já existe.');
  return valor;
}
async function salvarPagamento(nome, id=null) {
  const valor = validarNomePagamento(nome, id);
  const {data:{user}, error:authError} = await cliente.auth.getUser();
  if (authError || !user) throw new Error('Faça login novamente.');
  const consulta = id === null
    ? cliente.from('formas_pagamento').insert({nome:valor,ambiente:PAGAMENTO_AMBIENTE,user_id:user.id})
    : cliente.from('formas_pagamento').update({nome:valor}).eq('id',id).eq('ambiente',PAGAMENTO_AMBIENTE).eq('user_id',user.id);
  const {error} = await consulta;
  if (error) throw error;
  await carregarPagamentos();
}
document.getElementById('form-pagamento').addEventListener('submit', async e => {
  e.preventDefault();
  const input = document.getElementById('novo-pagamento');
  const botao = e.currentTarget.querySelector('button[type="submit"]');
  botao.disabled = true;
  try {
    await salvarPagamento(input.value);
    input.value = '';
    avisoPagamento('Forma de pagamento adicionada.');
  } catch (erro) { avisoPagamento(erro.message, true); }
  finally { botao.disabled = false; }
});
document.getElementById('lista-pagamentos').addEventListener('click', async e => {
  const renomear = e.target.closest('[data-renomear-pagamento]');
  const excluir = e.target.closest('[data-excluir-pagamento]');
  if (!renomear && !excluir) return;
  const id = Number((renomear || excluir).dataset[renomear ? 'renomearPagamento' : 'excluirPagamento']);
  const pagamento = pagamentosPersonalizados.find(p => p.id === id);
  if (!pagamento) return;
  if (renomear) {
    const nome = prompt('Novo nome da forma de pagamento:', pagamento.nome);
    if (nome === null) return;
    try { await salvarPagamento(nome, id); avisoPagamento('Forma de pagamento renomeada.'); }
    catch (erro) { avisoPagamento(erro.message, true); }
  } else {
    if (!confirm('Excluir "' + pagamento.nome + '" das opções? Movimentações antigas serão mantidas.')) return;
    const {data:{user},error:authError} = await cliente.auth.getUser();
    if (authError || !user) { avisoPagamento('Faça login novamente.',true); return; }
    const {error} = await cliente.from('formas_pagamento').delete()
      .eq('id',id).eq('ambiente',PAGAMENTO_AMBIENTE).eq('user_id',user.id);
    if (error) avisoPagamento(error.message,true);
    else { await carregarPagamentos(); avisoPagamento('Forma de pagamento excluída.'); }
  }
});


// Cadastro de fontes: opções personalizadas por usuário.
let fontesPersonalizadas=[];
async function carregarFontes(){
 const {data,error}=await cliente.from('fontes_pagamento').select('id,nome').order('nome');
 if(error)throw error;
 fontesPersonalizadas=data||[];
 renderizarFontes();
}
function renderizarFontes(){
 const lista=document.getElementById('lista-fontes');
 lista.innerHTML=fontesPersonalizadas.length?fontesPersonalizadas.map(f=>
  '<li><span>'+escapar(f.nome)+'</span><div class="payment-actions"><button type="button" data-renomear-fonte="'+f.id+'">Renomear</button><button type="button" data-excluir-fonte="'+f.id+'">Excluir</button></div></li>'
 ).join(''):'<li><small>Nenhuma fonte cadastrada. Adicione uma acima.</small></li>';
}
function avisoFonte(mensagem,erro=false){
 const el=document.getElementById('fonte-feedback');
 el.textContent=mensagem;el.style.color=erro?'var(--red)':'var(--green)';
}
function validarFonte(nome,ignorarId=null){
 const valor=nome.trim().replace(/\s+/g,' ');
 if(!valor||valor.length>100)throw new Error('Informe um nome com até 100 caracteres.');
 if(fontesPersonalizadas.some(f=>f.id!==ignorarId&&normalizar(f.nome)===normalizar(valor)))
  throw new Error('Essa fonte já está cadastrada.');
 return valor;
}
async function salvarFonte(nome,id=null){
 const valor=validarFonte(nome,id);
 const {data:{user},error:erroAuth}=await cliente.auth.getUser();
 if(erroAuth||!user)throw new Error('Faça login novamente.');
 const consulta=id===null
  ?cliente.from('fontes_pagamento').insert({nome:valor,user_id:user.id})
  :cliente.from('fontes_pagamento').update({nome:valor}).eq('id',id).eq('user_id',user.id);
 const {error}=await consulta;
 if(error)throw error;
 await carregarFontes();
}
document.getElementById('form-fonte').addEventListener('submit',async e=>{
 e.preventDefault();
 const input=document.getElementById('nova-fonte'),botao=e.currentTarget.querySelector('button[type="submit"]');
 botao.disabled=true;
 try{await salvarFonte(input.value);input.value='';avisoFonte('Fonte adicionada.');}
 catch(erro){avisoFonte(erro.message,true);}
 finally{botao.disabled=false;}
});
document.getElementById('lista-fontes').addEventListener('click',async e=>{
 const renomear=e.target.closest('[data-renomear-fonte]');
 const excluir=e.target.closest('[data-excluir-fonte]');
 if(!renomear&&!excluir)return;
 const botao=renomear||excluir,id=Number(renomear?botao.dataset.renomearFonte:botao.dataset.excluirFonte);
 const fonte=fontesPersonalizadas.find(f=>f.id===id);
 if(!fonte)return;
 if(renomear){
  const nome=prompt('Novo nome da fonte:',fonte.nome);
  if(nome===null)return;
  botao.disabled=true;
  try{await salvarFonte(nome,id);avisoFonte('Fonte renomeada.');}
  catch(erro){avisoFonte(erro.message,true);}
  finally{botao.disabled=false;}
 }else{
  if(!confirm('Excluir "'+fonte.nome+'" das opções? Movimentações antigas serão mantidas.'))return;
  botao.disabled=true;
  try{
   const {data:{user},error:erroAuth}=await cliente.auth.getUser();
   if(erroAuth||!user)throw new Error('Faça login novamente.');
   const {error}=await cliente.from('fontes_pagamento').delete().eq('id',id).eq('user_id',user.id);
   if(error)throw error;
   await carregarFontes();avisoFonte('Fonte excluída.');
  }catch(erro){avisoFonte(erro.message,true);}
  finally{botao.disabled=false;}
 }
});

const moeda = n => Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dataBR = s => {const [a,m,d]=s.slice(0,10).split('-');return `${d}/${m}/${a}`};
function filtrarMovimentacoes(dados,ano,mes){return dados.filter(m=>{const [a,mth]=m.data.slice(0,10).split('-');return Number(a)===Number(ano)&&(mes==='todos'||Number(mth)===Number(mes)+1)}).sort((a,b)=>b.data.localeCompare(a.data)||b.id-a.id)}
function calcularResumo(dados){const saidas=dados.filter(m=>normalizar(m.tipo_movimentacao)==='saida');return {
 entradas:dados.filter(m=>normalizar(m.tipo_movimentacao)==='entrada').reduce((s,m)=>s+Number(m.valor),0),
 saidas:saidas.filter(m=>normalizar(m.forma_pagamento)!=='credito').reduce((s,m)=>s+Number(m.valor),0),
 credito:saidas.filter(m=>normalizar(m.forma_pagamento)==='credito').reduce((s,m)=>s+Number(m.valor),0),
 investimentos:saidas.filter(m=>normalizar(m.categoria)==='investimentos').reduce((s,m)=>s+Number(m.valor),0)
}}
function agruparCategorias(dados){const grupo={};dados.filter(m=>normalizar(m.tipo_movimentacao)==='saida').forEach(m=>{const k=m.categoria||'Sem categoria';grupo[k]=(grupo[k]||0)+Number(m.valor)});return Object.entries(grupo).sort((a,b)=>b[1]-a[1])}

function filtrarIntervalo(registros,ano,inicio,fim){return registros.filter(m=>m.data.slice(0,4)===String(ano)&&m.data.slice(5,7)>=inicio&&m.data.slice(5,7)<=fim).sort((a,b)=>b.data.localeCompare(a.data)||b.id-a.id)}
function intervaloDiario(inicio,fim){return inicio===fim}
function pontosPeriodo(inicio,fim,ano){const diario=intervaloDiario(inicio,fim),datas=[];if(!inicio||!fim||inicio>fim)return {diario,datas};if(diario){const dias=new Date(Number(ano),Number(inicio),0).getDate();for(let d=1;d<=dias;d++)datas.push(ano+'-'+inicio+'-'+String(d).padStart(2,'0'))}else{for(let m=Number(inicio);m<=Number(fim);m++)datas.push(ano+'-'+String(m).padStart(2,'0'))}return {diario,datas}}
function acoesRegistro(m){return '<div class="row-actions"><button type="button" class="icon-action" data-edit="'+m.id+'" aria-label="Editar movimentação" title="Editar">✎</button><button type="button" class="icon-action delete" data-delete="'+m.id+'" aria-label="Excluir movimentação" title="Excluir">✕</button></div>'}

function camposPendentes(m){const pendentes=[];for(const [chave,nome] of [['descricao','Descrição'],['categoria','Categoria'],['forma_pagamento','Forma de pagamento'],['tipo_movimentacao','Tipo'],['data','Data']])if(!String(m[chave]??'').trim())pendentes.push(nome);if(m.valor===null||m.valor===undefined||m.valor===''||!Number.isFinite(Number(m.valor)))pendentes.push('Valor');return pendentes}
function avisoRegistro(m){const faltando=camposPendentes(m);return faltando.length?'<span class="missing-warning" role="img" aria-label="Informações faltando: '+escapar(faltando.join(', '))+'" title="Informações faltando: '+escapar(faltando.join(', '))+'">⚠️</span>':''}
function filtrarPendentes(registros,prefix){return document.querySelector('[data-warning][data-prefix="'+prefix+'"]')?.getAttribute('aria-pressed')==='true'?registros.filter(m=>camposPendentes(m).length):registros}

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

function filtrarIntervalo(registros,ano,inicio,fim){return registros.filter(m=>m.data>=inicio&&m.data<=fim&&m.data.slice(0,4)===String(ano)).sort((a,b)=>b.data.localeCompare(a.data)||b.id-a.id)}
function intervaloDiario(inicio,fim){return inicio.slice(0,7)===fim.slice(0,7)}
function pontosPeriodo(inicio,fim){const diario=intervaloDiario(inicio,fim),datas=[];if(!inicio||!fim||inicio>fim)return {diario,datas};if(diario){let d=new Date(inicio+'T12:00:00'),ultimo=new Date(fim+'T12:00:00');while(d<=ultimo){datas.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1)}}else{let [a,m]=inicio.slice(0,7).split('-').map(Number);const fimMes=fim.slice(0,7);while(String(a)+'-'+String(m).padStart(2,'0')<=fimMes){datas.push(String(a)+'-'+String(m).padStart(2,'0'));m++;if(m>12){m=1;a++}}}return {diario,datas}}
function acoesRegistro(m){return '<div class="row-actions"><button type="button" class="icon-action" data-edit="'+m.id+'" aria-label="Editar movimentação" title="Editar">✎</button><button type="button" class="icon-action delete" data-delete="'+m.id+'" aria-label="Excluir movimentação" title="Excluir">✕</button></div>'}

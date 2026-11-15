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

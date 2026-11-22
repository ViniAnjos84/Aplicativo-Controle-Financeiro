function renderizarGrafico(dados){const grupos=agruparCategorias(dados),total=grupos.reduce((s,[,v])=>s+v,0),cores=['#8489ff','#48d7ad','#ffb45d','#ff8195','#7bc2ff','#c69eff','#d5cf76'];document.getElementById('total-gastos').textContent=moeda(total);let pos=0;const faixas=grupos.map(([,v],i)=>{const ini=pos;pos+=v/total*100;return `${cores[i%cores.length]} ${ini}% ${pos}%`});document.getElementById('donut').style.background=faixas.length?`conic-gradient(${faixas.join(',')})`:'#303b4c';document.getElementById('legenda').innerHTML=grupos.length?grupos.map(([nome,valor],i)=>`<div class="legend-item"><span class="legend-swatch" style="background:${cores[i%cores.length]}"></span><span class="legend-name">${escapar(nome)}</span><span class="legend-value">${moeda(valor)}</span><span class="legend-pct">${Math.round(valor/total*100)}%</span></div>`).join(''):'<span style="color:var(--muted)">Nenhuma saída neste período.</span>'}

function renderizarFluxoMensal(registros,anoSelecionado,inicio,fim){
 const ano=Number(anoSelecionado),agora=new Date(),ultimo=ano===agora.getFullYear()?agora.getMonth()+1:12,primeiro=Math.max(1,ultimo-4);
 const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],dadosMes=[];
 for(let mes=primeiro;mes<=ultimo;mes++){const chave=ano+'-'+String(mes).padStart(2,'0'),itens=mes>=Number(inicio)&&mes<=Number(fim)?registros.filter(r=>r.data?.slice(0,7)===chave):[],entradas=itens.filter(r=>normalizar(r.tipo_movimentacao)==='entrada').reduce((s,r)=>s+Number(r.valor||0),0),saidas=itens.filter(r=>normalizar(r.tipo_movimentacao)==='saida'&&normalizar(r.forma_pagamento)!=='credito').reduce((s,r)=>s+Number(r.valor||0),0);dadosMes.push({mes:meses[mes-1],entradas,saidas})}
 const w=760,h=275,left=70,right=18,top=20,bottom=43,areaW=w-left-right,areaH=h-top-bottom,max=Math.max(1,...dadosMes.flatMap(d=>[d.entradas,d.saidas])),teto=max*1.12,grupo=areaW/dadosMes.length,bar=Math.min(34,grupo*.28),gap=Math.min(9,grupo*.07),y=v=>top+areaH-v/teto*areaH;
 const grade=[0,.25,.5,.75,1].map(t=>{const py=y(teto*t);return '<line x1="'+left+'" y1="'+py+'" x2="'+(w-right)+'" y2="'+py+'" stroke="#303b4c" stroke-dasharray="3 5"/><text x="'+(left-9)+'" y="'+(py+4)+'" text-anchor="end" fill="#8d9aaa" font-size="11">'+(teto*t).toLocaleString('pt-BR',{maximumFractionDigits:0})+'</text>'}).join('');
 const barras=dadosMes.map((d,i)=>{const centro=left+grupo*(i+.5),valores=[{v:d.entradas,c:'#45d6a1',x:centro-gap/2-bar},{v:d.saidas,c:'#ff7384',x:centro+gap/2}];return valores.map(o=>'<rect x="'+o.x+'" y="'+y(o.v)+'" width="'+bar+'" height="'+Math.max(0,top+areaH-y(o.v))+'" rx="4" fill="'+o.c+'"><title>'+d.mes+' — '+(o.c==='#45d6a1'?'Entradas: ':'Saídas: ')+moeda(o.v)+'</title></rect>').join('')+'<text x="'+centro+'" y="'+(h-13)+'" text-anchor="middle" fill="#aeb9c9" font-size="12">'+d.mes+'</text>'}).join('');
 document.getElementById('fluxo-grafico').innerHTML='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'+grade+barras+'</svg>';
 document.getElementById('fluxo-subtitulo').textContent='Comparativo de '+meses[primeiro-1]+' a '+meses[ultimo-1]+' de '+ano+' · conforme filtros selecionados';
}

function graficoBarrasTemporal(id,datas,series,diario){
 const el=document.getElementById(id);if(!el)return;
 const W=Math.max(760,70+datas.length*(diario?40:76)),H=260,L=65,R=16,T=18,B=44,iw=W-L-R,ih=H-T-B,passo=iw/Math.max(1,datas.length),n=Math.max(1,series.length);
 const max=Math.max(1,...series.flatMap(s=>s.valores)),teto=max*1.1,y=v=>T+ih-v/teto*ih;
 const linhas=[0,.25,.5,.75,1].map(t=>'<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(teto*t)+'" y2="'+y(teto*t)+'" stroke="#303b4c" stroke-dasharray="3 5"/><text x="'+(L-8)+'" y="'+(y(teto*t)+4)+'" text-anchor="end" fill="#8d9aaa" font-size="11">'+Math.round(teto*t).toLocaleString('pt-BR')+'</text>').join('');
 const largura=Math.min(diario?26:38,(passo-8)/n),grupo=largura*n;
 const barras=datas.map((k,j)=>{const centro=L+(j+.5)*passo,rotulo=diario?k.slice(8):k.slice(5)+'/'+k.slice(2,4);
 return series.map((serie,z)=>{const v=Number(serie.valores[j]||0),altura=v/teto*ih,x=centro-grupo/2+z*largura;return '<rect x="'+x+'" y="'+y(v)+'" width="'+Math.max(2,largura-2)+'" height="'+Math.max(0,altura)+'" rx="3" fill="'+serie.cor+'"><title>'+escapar(serie.nome)+' · '+k+': '+moeda(v)+'</title></rect>'}).join('')+'<text x="'+centro+'" y="'+(H-13)+'" text-anchor="middle" fill="#aeb9c9" font-size="11">'+rotulo+'</text>'}).join('');
 el.innerHTML='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Gráfico de barras por período">'+linhas+barras+'</svg>';
}
function serieTemporal(registros,datas,diario){const mapa=new Map();for(const m of registros){const k=String(m.data||'').slice(0,diario?10:7);mapa.set(k,(mapa.get(k)||0)+Number(m.valor||0))}return datas.map(k=>mapa.get(k)||0)}
function renderizarBarrasResumo(registros){
 const {diario,datas}=pontosPeriodo(document.getElementById('inicio').value,document.getElementById('fim').value,document.getElementById('ano').value);
 const saidas=registros.filter(m=>normalizar(m.tipo_movimentacao)==='saida');
 graficoBarrasTemporal('resumo-gastos-barras',datas,[{nome:'Gastos',cor:'#ff7384',valores:serieTemporal(saidas,datas,diario)}],diario);
 document.getElementById('resumo-gastos-tag').textContent=diario?'Diário':'Mensal';
 const grupos=new Map();for(const m of saidas){const nome=m.forma_pagamento||'Não informado',k=normalizar(nome);if(!grupos.has(k))grupos.set(k,{nome,registros:[]});grupos.get(k).registros.push(m)}
 const cores=['#8489ff','#48d7ad','#ffb45d','#ff8195','#7bc2ff','#c69eff','#d5cf76'];
 const series=[...grupos.values()].map((grupo,j)=>({nome:grupo.nome,cor:cores[j%cores.length],valores:serieTemporal(grupo.registros,datas,diario)}));
 graficoBarrasTemporal('resumo-pagamentos-barras',datas,series,diario);
 document.getElementById('resumo-pagamentos-tag').textContent=diario?'Diário':'Mensal';
 document.getElementById('resumo-pagamentos-legenda').innerHTML=series.map(serie=>'<span class="time-legend-item"><i style="background:'+serie.cor+'"></i>'+escapar(serie.nome)+'</span>').join('');
}

function renderizarGrafico(dados){const grupos=agruparCategorias(dados),total=grupos.reduce((s,[,v])=>s+v,0),cores=['#8489ff','#48d7ad','#ffb45d','#ff8195','#7bc2ff','#c69eff','#d5cf76'];document.getElementById('total-gastos').textContent=moeda(total);let pos=0;const faixas=grupos.map(([,v],i)=>{const ini=pos;pos+=v/total*100;return `${cores[i%cores.length]} ${ini}% ${pos}%`});document.getElementById('donut').style.background=faixas.length?`conic-gradient(${faixas.join(',')})`:'#303b4c';document.getElementById('legenda').innerHTML=grupos.length?grupos.map(([nome,valor],i)=>`<div class="legend-item"><span class="legend-swatch" style="background:${cores[i%cores.length]}"></span><span class="legend-name">${escapar(nome)}</span><span class="legend-value">${moeda(valor)}</span><span class="legend-pct">${Math.round(valor/total*100)}%</span></div>`).join(''):'<span style="color:var(--muted)">Nenhuma saída neste período.</span>'}

function renderizarFluxoMensal(registros,anoSelecionado,inicio,fim){
 const ano=Number(anoSelecionado),agora=new Date(),ultimo=ano===agora.getFullYear()?agora.getMonth()+1:12,primeiro=Math.max(1,ultimo-4);
 const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
 const datas=[],entradas=[],saidas=[];
 for(let mes=primeiro;mes<=ultimo;mes++){
  const chave=ano+'-'+String(mes).padStart(2,'0');
  const itens=mes>=Number(inicio)&&mes<=Number(fim)?registros.filter(r=>r.data?.slice(0,7)===chave):[];
  datas.push(chave);
  entradas.push(itens.filter(r=>normalizar(r.tipo_movimentacao)==='entrada').reduce((v,r)=>v+Number(r.valor||0),0));
  saidas.push(itens.filter(r=>normalizar(r.tipo_movimentacao)==='saida'&&normalizar(r.forma_pagamento)!=='credito').reduce((v,r)=>v+Number(r.valor||0),0));
 }
 desenharGraficoInterativo('fluxo-grafico',datas,[{nome:'Entradas',cor:'#45d6a1',valores:entradas},{nome:'Saídas',cor:'#ff7384',valores:saidas}],false,meses);
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
 const datasGastos=limitarDatasGrafico(datas,diario);
 desenharGraficoInterativo('resumo-gastos-barras',datasGastos,[{nome:'Gastos',cor:'#ff7384',valores:serieTemporal(saidas,datasGastos,diario)}],diario);
 document.getElementById('resumo-gastos-tag').textContent=diario?'Diário':'Mensal';
 const grupos=new Map();for(const m of saidas){const nome=m.forma_pagamento||'Não informado',k=normalizar(nome);if(!grupos.has(k))grupos.set(k,{nome,registros:[]});grupos.get(k).registros.push(m)}
 const cores=['#8489ff','#48d7ad','#ffb45d','#ff8195','#7bc2ff','#c69eff','#d5cf76'];
 const datasPagamentos=limitarDatasGrafico(datas,diario);
 const series=[...grupos.values()].map((grupo,j)=>({nome:grupo.nome,cor:cores[j%cores.length],valores:serieTemporal(grupo.registros,datasPagamentos,diario)}));
 desenharGraficoInterativo('resumo-pagamentos-barras',datasPagamentos,series,diario);
 document.getElementById('resumo-pagamentos-tag').textContent=diario?'Diário':'Mensal';
 document.getElementById('resumo-pagamentos-legenda').innerHTML=series.map(serie=>'<span class="time-legend-item"><i style="background:'+serie.cor+'"></i>'+escapar(serie.nome)+'</span>').join('');
}


/* Gráficos SVG interativos: zoom, escala arredondada e popup responsivo. */
const zoomGraficos=new Map();
function limitarDatasGrafico(datas,diario){
 if(!diario||!datas.length)return datas;
 const hoje=new Date(),mes=hoje.getFullYear()+'-'+String(hoje.getMonth()+1).padStart(2,'0');
 return datas[0].slice(0,7)===mes?datas.slice(0,Math.max(10,hoje.getDate())):datas;
}
function desenharGraficoInterativo(id,datas,series,diario,nomesMeses){
 const host=document.getElementById(id),W=760,H=260,L=74,R=18,T=18,B=44,iw=W-L-R,ih=H-T-B;
 const passo=iw/Math.max(1,datas.length),quant=Math.max(1,series.length);
 const valores=series.flatMap(s=>s.valores.map(Number)),max=Math.max(0,...valores);
 const ordem=Math.pow(10,Math.floor(Math.log10(Math.max(1,max/4))));
 const intervalo=[1,2,2.5,5,10].map(n=>n*ordem).find(n=>n>=max/4)||10*ordem;
 const teto=Math.max(intervalo,Math.ceil(max/intervalo)*intervalo),y=v=>T+ih-v/teto*ih;
 const linhas=Array.from({length:Math.round(teto/intervalo)+1},(_,j)=>{const v=j*intervalo;return '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#303b4c" stroke-dasharray="3 5"/><text x="'+(L-9)+'" y="'+(y(v)+4)+'" text-anchor="end" fill="#aeb9c9" font-size="12">'+v.toLocaleString('pt-BR',{maximumFractionDigits:2})+'</text>'}).join('');
 const largura=Math.min(quant===1?30:24,passo*.76/quant),grupo=largura*quant;
 const barras=datas.map((k,j)=>{
  const centro=L+(j+.5)*passo,rotulo=nomesMeses?nomesMeses[Number(k.slice(5,7))-1]:diario?k.slice(8):k.slice(5)+'/'+k.slice(2,4);
  return series.map((serie,z)=>{
   const v=Number(serie.valores[j]||0),x=centro-grupo/2+z*largura;
   return '<rect class="grafico-interativo-barra" data-data="'+k+'" data-valor="'+v+'" data-serie="'+escapar(serie.nome)+'" tabindex="0" role="button" aria-label="'+escapar(serie.nome)+' '+k+': '+moeda(v)+'" x="'+x+'" y="'+y(v)+'" width="'+Math.max(2,largura-1)+'" height="'+Math.max(0,v/teto*ih)+'" rx="3" fill="'+serie.cor+'"></rect>';
  }).join('')+'<text x="'+centro+'" y="'+(H-13)+'" text-anchor="middle" fill="#aeb9c9" font-size="11">'+rotulo+'</text>';
 }).join('');
 host.innerHTML='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Gráfico de barras por período">'+linhas+barras+'</svg>';
 const popup=host.parentElement.querySelector('.grafico-interativo-popup');if(popup)popup.hidden=true;
 zoomGraficos.set(id,zoomGraficos.get(id)||1);
 aplicarZoomGrafico(id);
}
function aplicarZoomGrafico(id){
 const host=document.getElementById(id),svg=host.querySelector('svg');if(!svg)return;
 const zoom=zoomGraficos.get(id)||1;
 svg.style.width=zoom*100+'%';svg.style.height='auto';
 const controles=host.closest('.panel').querySelector('[data-zoom-id="'+id+'"]');
 if(controles){
  controles.querySelector('[data-zoom-valor]').textContent=Math.round(zoom*100)+'%';
  controles.querySelector('[data-zoom-menos]').disabled=zoom<=1;
  controles.querySelector('[data-zoom-mais]').disabled=zoom>=2.5;
 }
}
function mudarZoomGrafico(id,delta){
 zoomGraficos.set(id,Math.min(2.5,Math.max(1,Math.round(((zoomGraficos.get(id)||1)+delta)*4)/4)));
 aplicarZoomGrafico(id);
 if(delta===0)document.getElementById(id).scrollLeft=0;
}
function ocultarPopupGrafico(host){
 const popup=host.parentElement.querySelector('.grafico-interativo-popup');if(popup)popup.hidden=true;
}
function mostrarPopupGrafico(host,barra){
 if(!barra)return;
 const popup=host.parentElement.querySelector('.grafico-interativo-popup'),chave=barra.dataset.data;
 const data=chave.length===10?dataBR(chave):chave.slice(5,7)+'/'+chave.slice(0,4);
 popup.textContent=barra.dataset.serie+' · '+data+' · '+moeda(Number(barra.dataset.valor));
 popup.hidden=false;
 const area=host.parentElement.getBoundingClientRect(),rect=barra.getBoundingClientRect();
 const centro=rect.left+rect.width/2-area.left,limite=Math.max(70,area.width-70);
 popup.style.left=Math.min(limite,Math.max(70,centro))+'px';
 popup.style.top=Math.max(2,rect.top-area.top-42)+'px';
}
for(const host of document.querySelectorAll('[data-grafico-interativo]')){
 host.addEventListener('pointerover',e=>{
  if(e.pointerType!=='mouse')return;
  const barra=e.target.closest('.grafico-interativo-barra');
  if(barra)mostrarPopupGrafico(host,barra);
 });
 host.addEventListener('pointerout',e=>{
  if(e.pointerType!=='mouse')return;
  const barra=e.target.closest('.grafico-interativo-barra');
  if(barra&&!barra.contains(e.relatedTarget))ocultarPopupGrafico(host);
 });
 host.addEventListener('click',e=>{
  const barra=e.target.closest('.grafico-interativo-barra');
  if(!barra||e.detail===0||window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;
  const selecionada=barra.classList.contains('selecionada');
  host.querySelectorAll('.grafico-interativo-barra').forEach(b=>b.classList.remove('selecionada'));
  if(selecionada){ocultarPopupGrafico(host)}
  else{barra.classList.add('selecionada');mostrarPopupGrafico(host,barra)}
 });
 host.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const barra=e.target.closest('.grafico-interativo-barra');if(!barra)return;
  e.preventDefault();
  const selecionada=barra.classList.contains('selecionada');
  host.querySelectorAll('.grafico-interativo-barra').forEach(b=>b.classList.remove('selecionada'));
  if(selecionada)ocultarPopupGrafico(host);
  else{barra.classList.add('selecionada');mostrarPopupGrafico(host,barra)}
 });
 host.addEventListener('scroll',()=>ocultarPopupGrafico(host));
}
document.querySelectorAll('[data-zoom-id]').forEach(controles=>{
 const id=controles.dataset.zoomId;
 controles.querySelector('[data-zoom-menos]').addEventListener('click',()=>mudarZoomGrafico(id,-.25));
 controles.querySelector('[data-zoom-mais]').addEventListener('click',()=>mudarZoomGrafico(id,.25));
 controles.querySelector('[data-zoom-reset]').addEventListener('click',()=>{zoomGraficos.set(id,1);mudarZoomGrafico(id,0)});
});

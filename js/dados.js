const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const titulo = valor => String(valor ?? '').toLocaleLowerCase('pt-BR').replace(/(^|[\s-])\p{L}/gu, t => t.toLocaleUpperCase('pt-BR'));
async function buscarMovimentacoes(cliente) {
  const registros = [];
  const tamanho = 1000;
  for (let inicio = 0; ; inicio += tamanho) {
    const {data, error} = await cliente.from('movimentacoes')
      .select('id,tipo_movimentacao,descricao,valor,categoria,forma_pagamento,fonte_pagamento,data')
      .order('data', {ascending:false}).order('id', {ascending:false})
      .range(inicio, inicio + tamanho - 1);
    if (error) throw error;
    registros.push(...data);
    if (data.length < tamanho) break;
  }
  return registros.map(m => ({...m, descricao:titulo(m.descricao),categoria:titulo(m.categoria),forma_pagamento:titulo(m.forma_pagamento),fonte_pagamento:m.fonte_pagamento?titulo(m.fonte_pagamento):null}));
}

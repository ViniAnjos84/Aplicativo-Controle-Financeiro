const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const titulo = valor => String(valor ?? '').toLocaleLowerCase('pt-BR').replace(/(^|[\s-])\p{L}/gu, t => t.toLocaleUpperCase('pt-BR'));
async function buscarMovimentacoes(cliente) {
  const registros = new VetorMovimentacoes();
  const tamanho = 1000;
  for (let inicio = 0; ; inicio += tamanho) {
    const {data, error} = await cliente.from('movimentacoes_academicas')
      .select('id,tipo_movimentacao,descricao,valor,categoria,forma_pagamento,data')
      .order('data', {ascending:false}).order('id', {ascending:false})
      .range(inicio, inicio + tamanho - 1);
    if (error) throw error;
    for (const m of data) {
      registros.adicionar({...m, descricao:titulo(m.descricao), categoria:titulo(m.categoria), forma_pagamento:titulo(m.forma_pagamento)});
    }
    if (data.length < tamanho) break;
  }
  return registros;
}

const VetorMovimentacoes = require('../js/estruturas/VetorMovimentacoes.js');
const vetor = new VetorMovimentacoes();

// Adicione ou altere as movimentações para a apresentação.
vetor.adicionar({ id: 1, descricao: 'Salário', valor: 3000, tipo_movimentacao: 'entrada' });
vetor.adicionar({ id: 2, descricao: 'Gasolina', valor: 200, tipo_movimentacao: 'saida' });
vetor.adicionar({ id: 3, descricao: 'Mercado', valor: 150, tipo_movimentacao: 'saida' });

console.log('Vetor inicial:');
console.table(vetor.paraArray());
console.log('Quantidade:', vetor.tamanho());

// Descomente as operações que deseja demonstrar.
// console.log(vetor.buscarPorIndice(1));
// console.log(vetor.buscarPorId(2));
// vetor.atualizar(2, { valor: 250 });
// vetor.remover(2);
// console.table(vetor.filtrar(m => m.tipo_movimentacao === 'saida').paraArray());
// vetor.limpar();

console.log('Vetor final:');
console.table(vetor.paraArray());

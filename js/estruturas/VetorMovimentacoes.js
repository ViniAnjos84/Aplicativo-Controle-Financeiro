class VetorMovimentacoes {
    // Inicializa o vetor vazio.
    constructor() {
        this.elementos = [];
        this.quantidade = 0;
    }

    // Insere uma movimentação no final.
    adicionar(movimentacao) {
        this.elementos[this.quantidade] = movimentacao;
        this.quantidade++;
    }

    // Retorna a quantidade de elementos.
    tamanho() {
        return this.quantidade;
    }

    // Acessa um elemento pelo índice.
    buscarPorIndice(indice) {
        if (!Number.isInteger(indice) ||
            indice < 0 || indice >= this.quantidade) {
            return null;
        }

        return this.elementos[indice];
    }

    // Busca uma movimentação pelo ID.
    buscarPorId(id) {
        for (let i = 0; i < this.quantidade; i++) {
            if (String(this.elementos[i].id) === String(id)) {
                return this.elementos[i];
            }
        }

        return null;
    }

    // Atualiza os campos sem alterar o ID.
    atualizar(id, movimentacao) {
        for (let i = 0; i < this.quantidade; i++) {
            if (String(this.elementos[i].id) === String(id)) {
                this.elementos[i] = {
                    ...this.elementos[i],
                    ...movimentacao,
                    id: this.elementos[i].id
                };

                return true;
            }
        }

        return false;
    }

    // Remove pelo ID e desloca os elementos seguintes.
    remover(id) {
        for (let i = 0; i < this.quantidade; i++) {
            if (String(this.elementos[i].id) === String(id)) {
                for (let j = i; j < this.quantidade - 1; j++) {
                    this.elementos[j] = this.elementos[j + 1];
                }

                this.quantidade--;
                this.elementos.length = this.quantidade;

                return true;
            }
        }

        return false;
    }

    // Cria um vetor com os elementos que atendem à condição.
    filtrar(condicao) {
        const resultado = new VetorMovimentacoes();

        for (let i = 0; i < this.quantidade; i++) {
            if (condicao(this.elementos[i])) {
                resultado.adicionar(this.elementos[i]);
            }
        }

        return resultado;
    }

    // Esvazia o vetor.
    limpar() {
        this.elementos = [];
        this.quantidade = 0;
    }

    // Retorna uma cópia do array de elementos.
    paraArray() {
        const resultado = [];

        for (let i = 0; i < this.quantidade; i++) {
            resultado[i] = this.elementos[i];
        }

        return resultado;
    }
}

// Permite importar a classe no Node.js sem afetar o navegador.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VetorMovimentacoes;
}

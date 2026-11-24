class VetorMovimentacoes {
    constructor() {
        this.elementos = [];
        this.quantidade = 0;
    }

    adicionar(movimentacao) {
        this.elementos[this.quantidade] = movimentacao;
        this.quantidade++;
    }

    tamanho() {
        return this.quantidade;
    }

    buscarPorIndice(indice) {
        if (!Number.isInteger(indice) ||
            indice < 0 || indice >= this.quantidade) {
            return null;
        }

        return this.elementos[indice];
    }

    buscarPorId(id) {
        for (let i = 0; i < this.quantidade; i++) {
            if (String(this.elementos[i].id) === String(id)) {
                return this.elementos[i];
            }
        }

        return null;
    }

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

    filtrar(condicao) {
        const resultado = new VetorMovimentacoes();

        for (let i = 0; i < this.quantidade; i++) {
            if (condicao(this.elementos[i])) {
                resultado.adicionar(this.elementos[i]);
            }
        }

        return resultado;
    }

    limpar() {
        this.elementos = [];
        this.quantidade = 0;
    }

    paraArray() {
        const resultado = [];

        for (let i = 0; i < this.quantidade; i++) {
            resultado[i] = this.elementos[i];
        }

        return resultado;
    }
}

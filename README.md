# Aplicativo de Controle Financeiro

Dashboard financeiro pessoal desenvolvido em HTML, CSS e JavaScript, para uso local no navegador. Os lançamentos permanecem em uma planilha privada do Google Sheets, alimentada pela automação no Make/Telegram.

## Estrutura

```text
Aplicativo-Controle-Financeiro/
├── index.html
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── dados.js
│   ├── calculos.js
│   └── graficos.js
└── assets/
    └── icons/
        └── .gitkeep
```

## Responsabilidades

- `index.html`: estrutura semântica da interface e ponto de entrada.
- `css/style.css`: estilos, identidade visual e responsividade.
- `js/app.js`: inicialização e coordenação da interface.
- `js/dados.js`: camada de leitura dos dados da planilha privada (integração a definir; não armazenar credenciais no frontend).
- `js/calculos.js`: indicadores, agregações e cálculos financeiros.
- `js/graficos.js`: criação e atualização dos gráficos (biblioteca a definir, provavelmente Chart.js).
- `assets/icons/`: ícones e recursos visuais locais.

## Fluxo previsto

Telegram → Make → Google Sheets privado → camada autorizada de leitura → dashboard local no navegador.

A conexão com a planilha, os indicadores, os gráficos e a interface serão implementados em etapas. Nenhuma credencial ou dado financeiro real deve ser commitado neste repositório.
# Controle Financeiro — Resumo + Login

## Configuração
1. Abra `js/config.js` e substitua `COLE_AQUI_SUA_CHAVE_PUBLICAVEL` pela chave **sb_publishable_...** em Supabase → Settings → API Keys. Nunca utilize `sb_secret_...` ou `service_role` no navegador.
2. Sirva a pasta por HTTP local (ex.: `python -m http.server 8000`) e abra `http://localhost:8000`.
3. Entre com o usuário e a senha criados no Supabase Auth.
4. O dashboard carrega os registros reais da tabela `movimentacoes`, respeitando as políticas RLS.

A URL e a chave publicável podem estar no frontend: a proteção dos dados depende de Auth e RLS. Um `.env` não protege segredos usados no navegador. Não compartilhe sua senha.

## Funcionalidades
Login e logout, sessão persistente, resumo, filtros por ano e mês, gráfico de categorias e tabela responsiva. Abas Crédito e Investimentos ainda não foram implementadas.

Investimentos contabiliza somente saídas da categoria `investimentos`, podendo se sobrepor às outras saídas. Crédito reconhece `credito` e `crédito`.


## Aba Crédito
A nova aba Crédito usa somente as movimentações do Supabase com `tipo_movimentacao = saida` e `forma_pagamento = credito` (acentos e maiúsculas são normalizados). Contém filtros de mês/ano, cards de total, categoria mais gasta, ticket médio e quantidade, evolução diária/mensal, categorias e histórico. Não calcula faturas nem limites. Os pagamentos de fatura devem ser registrados separadamente como saídas da conta; evite interpretá-los como novas compras.

**Atualização de versão:** se você já configurou sua chave publishable em `js/config.js`, mantenha esse arquivo ao copiar a nova versão. Nunca use a chave secret/service_role no frontend.

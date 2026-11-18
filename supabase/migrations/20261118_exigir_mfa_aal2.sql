-- MFA obrigatório para dados financeiros.
-- Executar SOMENTE após publicar o fluxo MFA para todos os clientes que usam este banco.
-- Políticas restritivas são combinadas com as políticas permissivas de propriedade existentes.
-- Reexecutável: não duplica políticas.
begin;
do $$
declare nome_tabela text;
begin
  foreach nome_tabela in array array['movimentacoes','movimentacoes_academicas','formas_pagamento']
  loop
    if to_regclass(format('public.%I',nome_tabela)) is null then
      raise exception 'Tabela public.% não encontrada. Nenhuma política aplicada.', nome_tabela;
    end if;
    if not (select c.relrowsecurity from pg_class c where c.oid=to_regclass(format('public.%I',nome_tabela))) then
      raise exception 'RLS não habilitado em public.%',nome_tabela;
    end if;
    execute format('drop policy if exists "exigir_mfa_aal2" on public.%I',nome_tabela);
    execute format(
      'create policy "exigir_mfa_aal2" on public.%I as restrictive for all to authenticated using ((select auth.jwt()->>''aal'') = ''aal2'') with check ((select auth.jwt()->>''aal'') = ''aal2'')',
      nome_tabela
    );
  end loop;
end $$;
commit;

-- Conferência após aplicar:
-- select tablename, policyname, permissive, cmd, qual, with_check
-- from pg_policies where schemaname='public'
-- and policyname='exigir_mfa_aal2' order by tablename;

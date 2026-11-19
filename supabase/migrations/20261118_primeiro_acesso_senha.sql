-- Primeiro acesso: novos usuários recebem marcação protegida em app_metadata.
-- Contas existentes ficam isentas (flag ausente).
create schema if not exists security_internal;
revoke all on schema security_internal from public, anon;
grant usage on schema security_internal to authenticated;

create or replace function security_internal.senha_inicial_pendente()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select (u.raw_app_meta_data->>'must_change_password') = 'true'
     from auth.users u where u.id = (select auth.uid())), true
  );
$$;
revoke all on function security_internal.senha_inicial_pendente() from public, anon;
grant execute on function security_internal.senha_inicial_pendente() to authenticated;

create or replace function security_internal.marcar_senha_inicial()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || '{"must_change_password":true}'::jsonb;
  elsif tg_op = 'UPDATE' then
    if new.encrypted_password is distinct from old.encrypted_password
       and new.encrypted_password is not null then
      new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
        || '{"must_change_password":false}'::jsonb;
    elsif coalesce(old.raw_app_meta_data->>'must_change_password','false') = 'true' then
      -- Não liberar por simples edição de metadados.
      new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
        || '{"must_change_password":true}'::jsonb;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function security_internal.marcar_senha_inicial() from public, anon, authenticated;

create trigger controle_senha_inicial_insert
before insert on auth.users for each row
execute function security_internal.marcar_senha_inicial();
create trigger controle_senha_inicial_update
before update of encrypted_password, raw_app_meta_data on auth.users for each row
execute function security_internal.marcar_senha_inicial();

create policy exigir_troca_senha_inicial on public.movimentacoes
as restrictive for all to authenticated
using (not (select security_internal.senha_inicial_pendente()))
with check (not (select security_internal.senha_inicial_pendente()));
create policy exigir_troca_senha_inicial on public.movimentacoes_academicas
as restrictive for all to authenticated
using (not (select security_internal.senha_inicial_pendente()))
with check (not (select security_internal.senha_inicial_pendente()));
create policy exigir_troca_senha_inicial on public.formas_pagamento
as restrictive for all to authenticated
using (not (select security_internal.senha_inicial_pendente()))
with check (not (select security_internal.senha_inicial_pendente()));

-- NishiOS na nuvem: os dados do app ficam numa tabela só, uma linha por chave
-- (as mesmas chaves "nishios:..." que o app já usa no navegador e no backup).
-- Só os e-mails de public.allowed_users conseguem criar conta e ler ou gravar dados.

-- 1. Quem pode entrar. Sem policies: nenhum cliente lê ou altera esta tabela.
create table if not exists public.allowed_users (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.allowed_users enable row level security;

create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_allowed_user() from public, anon;
grant execute on function public.is_allowed_user() to authenticated;

-- 2. Bloqueia contas novas de quem não está na lista (Google, e-mail ou qualquer outro login).
create or replace function public.guard_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.allowed_users where email = lower(coalesce(new.email, ''))
  ) then
    raise exception 'NishiOS é pessoal: este e-mail não tem acesso.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_new_user() from public, anon, authenticated;

drop trigger if exists nishios_guard_new_user on auth.users;
create trigger nishios_guard_new_user
  before insert on auth.users
  for each row execute function public.guard_new_user();

-- 3. Os dados do app.
create table if not exists public.app_state (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null check (key like 'nishios:%'),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- O horário vem sempre do servidor: é ele que diz qual aparelho gravou por último.
create or replace function public.touch_app_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch
  before insert or update on public.app_state
  for each row execute function public.touch_app_state();

alter table public.app_state enable row level security;

drop policy if exists "dono lê" on public.app_state;
create policy "dono lê" on public.app_state
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_user()));

drop policy if exists "dono cria" on public.app_state;
create policy "dono cria" on public.app_state
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_allowed_user()));

drop policy if exists "dono altera" on public.app_state;
create policy "dono altera" on public.app_state
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select public.is_allowed_user()));

drop policy if exists "dono apaga" on public.app_state;
create policy "dono apaga" on public.app_state
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_user()));

revoke all on public.app_state from anon;
grant select, insert, update, delete on public.app_state to authenticated;

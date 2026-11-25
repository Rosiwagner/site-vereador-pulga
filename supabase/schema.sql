-- =====================================================================
-- Banco de dados do site "Agenda do Vereador Pulga"
-- Cole TODO este arquivo no Supabase em: SQL Editor > New query > Run
-- =====================================================================

-- 1) Quem pode administrar o site (cadastrar/editar).
--    Coloque aqui o e-mail de cada pessoa da equipe.
create table if not exists public.admins (
  email text primary key,
  criado_em timestamptz not null default now()
);

-- Função que diz se o usuário logado é um administrador.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 2) Eventos / ações do vereador
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  local text,
  categoria text default 'Ação',
  inicio timestamptz not null,
  fim timestamptz,
  publicado boolean not null default true,
  criado_em timestamptz not null default now()
);

-- 3) Colaboradores (equipe que organiza)
create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  funcao text,
  telefone text,
  email text,
  criado_em timestamptz not null default now()
);

-- 4) Participantes (pessoas que vão participar)
create table if not exists public.participantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  bairro text,
  criado_em timestamptz not null default now()
);

-- 5) Ligações: quais colaboradores e participantes estão em cada evento
create table if not exists public.evento_colaboradores (
  evento_id uuid references public.eventos(id) on delete cascade,
  colaborador_id uuid references public.colaboradores(id) on delete cascade,
  primary key (evento_id, colaborador_id)
);

create table if not exists public.evento_participantes (
  evento_id uuid references public.eventos(id) on delete cascade,
  participante_id uuid references public.participantes(id) on delete cascade,
  primary key (evento_id, participante_id)
);

-- =====================================================================
-- Segurança (RLS): o público só VÊ eventos publicados.
-- Dados pessoais (colaboradores e participantes) só os admins veem.
-- =====================================================================
alter table public.admins               enable row level security;
alter table public.eventos              enable row level security;
alter table public.colaboradores        enable row level security;
alter table public.participantes        enable row level security;
alter table public.evento_colaboradores enable row level security;
alter table public.evento_participantes enable row level security;

drop policy if exists "admins leem admins" on public.admins;
create policy "admins leem admins" on public.admins
  for select using (public.is_admin());

drop policy if exists "publico ve eventos publicados" on public.eventos;
create policy "publico ve eventos publicados" on public.eventos
  for select using (publicado or public.is_admin());

drop policy if exists "admins gerenciam eventos" on public.eventos;
create policy "admins gerenciam eventos" on public.eventos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins gerenciam colaboradores" on public.colaboradores;
create policy "admins gerenciam colaboradores" on public.colaboradores
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins gerenciam participantes" on public.participantes;
create policy "admins gerenciam participantes" on public.participantes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins gerenciam evento_colaboradores" on public.evento_colaboradores;
create policy "admins gerenciam evento_colaboradores" on public.evento_colaboradores
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins gerenciam evento_participantes" on public.evento_participantes;
create policy "admins gerenciam evento_participantes" on public.evento_participantes
  for all using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 6) ÁLBUNS DE PROJETOS (fotos e vídeos das ações realizadas)
-- =====================================================================
create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  data date,
  capa_url text,
  publicado boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.midias (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  tipo text not null default 'foto',      -- 'foto' ou 'video'
  url text not null,
  legenda text,
  caminho text,                           -- caminho no Storage (para apagar o arquivo)
  criado_em timestamptz not null default now()
);

-- Cada evento pode fazer parte de um projeto/álbum
alter table public.eventos add column if not exists projeto_id uuid references public.projetos(id) on delete set null;

alter table public.projetos enable row level security;
alter table public.midias   enable row level security;

drop policy if exists "publico ve projetos" on public.projetos;
create policy "publico ve projetos" on public.projetos
  for select using (publicado or public.is_admin());
drop policy if exists "admins gerenciam projetos" on public.projetos;
create policy "admins gerenciam projetos" on public.projetos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "publico ve midias" on public.midias;
create policy "publico ve midias" on public.midias
  for select using (exists (select 1 from public.projetos p where p.id = projeto_id and (p.publicado or public.is_admin())));
drop policy if exists "admins gerenciam midias" on public.midias;
create policy "admins gerenciam midias" on public.midias
  for all using (public.is_admin()) with check (public.is_admin());

-- Pasta pública de arquivos (fotos e vídeos) no Supabase Storage
insert into storage.buckets (id, name, public) values ('midias', 'midias', true)
on conflict (id) do nothing;

drop policy if exists "admins enviam midias" on storage.objects;
create policy "admins enviam midias" on storage.objects
  for insert with check (bucket_id = 'midias' and public.is_admin());
drop policy if exists "admins alteram midias" on storage.objects;
create policy "admins alteram midias" on storage.objects
  for update using (bucket_id = 'midias' and public.is_admin());
drop policy if exists "admins apagam midias" on storage.objects;
create policy "admins apagam midias" on storage.objects
  for delete using (bucket_id = 'midias' and public.is_admin());

-- Primeiro álbum: apoio ao Novos Bambas 2026 (capoeira)
insert into public.projetos (id, titulo, descricao, data, capa_url)
values ('7b3f1c2e-0000-4000-8000-000000000001',
        'Novos Bambas 2026 – Associação Xangô Capoeira',
        'Apoio ao evento de capoeira Novos Bambas 2026, com presença confirmada do Mestre Duda (Associação Xangô Capoeira) e organização do Mestre Maior.',
        '2026-11-20', 'assets/capoeira-novos-bambas.jpg')
on conflict (id) do nothing;

insert into public.midias (projeto_id, tipo, url, legenda)
select '7b3f1c2e-0000-4000-8000-000000000001', 'foto', 'assets/capoeira-novos-bambas.jpg', 'Cartaz do evento'
where not exists (select 1 from public.midias where url = 'assets/capoeira-novos-bambas.jpg');

-- =====================================================================
-- 7) VÁRIOS ADMINISTRADORES E PÁGINA DA EQUIPE
-- =====================================================================
alter table public.admins add column if not exists nome text;

-- Admins podem ver, adicionar e remover outros admins pelo site
drop policy if exists "admins leem admins" on public.admins;
drop policy if exists "admins gerenciam admins" on public.admins;
create policy "admins gerenciam admins" on public.admins
  for all using (public.is_admin()) with check (public.is_admin());

-- Só quem foi adicionado como administrador consegue criar senha ("Primeiro acesso")
create or replace function public.bloquear_cadastro_nao_autorizado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where lower(email) = lower(new.email)) then
    raise exception 'Este e-mail não está autorizado. Peça a um administrador para incluí-lo.';
  end if;
  return new;
end;
$$;

drop trigger if exists so_admins_podem_se_cadastrar on auth.users;
create trigger so_admins_podem_se_cadastrar
  before insert on auth.users
  for each row execute function public.bloquear_cadastro_nao_autorizado();

-- Equipe: os colaboradores ganham foto e a opção de aparecer na página "Equipe"
alter table public.colaboradores add column if not exists foto_url text;
alter table public.colaboradores add column if not exists foto_caminho text;
alter table public.colaboradores add column if not exists mostrar_no_site boolean not null default true;
alter table public.colaboradores add column if not exists ordem int not null default 0;

-- O público vê só nome, função e foto (telefone e e-mail continuam privados)
create or replace view public.equipe_publica as
  select id, nome, funcao, foto_url, ordem
  from public.colaboradores
  where mostrar_no_site;
grant select on public.equipe_publica to anon, authenticated;

-- =====================================================================
-- 8) ADMINISTRADOR GERAL x ADMINISTRADORES
--    'geral' = pode tudo e é o ÚNICO que autoriza/remove administradores.
--    'admin' = cadastra eventos, álbuns, fotos, vídeos, equipe e participantes.
-- =====================================================================
alter table public.admins add column if not exists nivel text not null default 'admin';
alter table public.admins drop constraint if exists admins_nivel_valido;
alter table public.admins add constraint admins_nivel_valido check (nivel in ('geral', 'admin'));

create or replace function public.is_admin_geral()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and nivel = 'geral'
  );
$$;

drop policy if exists "admins gerenciam admins" on public.admins;
drop policy if exists "admins leem admins" on public.admins;
drop policy if exists "admins veem admins" on public.admins;
drop policy if exists "geral autoriza admins" on public.admins;
drop policy if exists "geral altera admins" on public.admins;
drop policy if exists "geral remove admins" on public.admins;
create policy "admins veem admins" on public.admins
  for select using (public.is_admin());
-- Só o administrador geral autoriza, e só cria administradores comuns
create policy "geral autoriza admins" on public.admins
  for insert with check (public.is_admin_geral() and nivel = 'admin');
create policy "geral altera admins" on public.admins
  for update using (public.is_admin_geral() and nivel = 'admin') with check (public.is_admin_geral() and nivel = 'admin');
-- O administrador geral nunca pode ser removido pelo site
create policy "geral remove admins" on public.admins
  for delete using (public.is_admin_geral() and nivel = 'admin');

-- =====================================================================
-- 9) REGISTRO DE ATIVIDADES (log): quem criou, editou ou apagou o quê
--    É preenchido automaticamente pelo banco. Ninguém consegue editar.
--    Só o administrador geral pode ver.
-- =====================================================================
create table if not exists public.log_atividades (
  id bigint generated always as identity primary key,
  quando timestamptz not null default now(),
  email text,
  acao text not null,          -- 'criou', 'editou', 'apagou'
  tabela text not null,
  registro_id text,
  resumo text
);
alter table public.log_atividades enable row level security;
drop policy if exists "geral ve log" on public.log_atividades;
create policy "geral ve log" on public.log_atividades
  for select using (public.is_admin_geral());

create or replace function public.registrar_atividade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linha jsonb := to_jsonb(coalesce(new, old));
  acao text := case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'editou' else 'apagou' end;
begin
  insert into public.log_atividades (email, acao, tabela, registro_id, resumo)
  values (
    coalesce(auth.jwt() ->> 'email', 'sistema'),
    acao,
    tg_table_name,
    coalesce(linha ->> 'id', linha ->> 'email'),
    coalesce(linha ->> 'titulo', linha ->> 'nome', linha ->> 'legenda', linha ->> 'email', linha ->> 'url')
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['eventos','projetos','midias','colaboradores','participantes','admins'] loop
    execute format('drop trigger if exists log_%1$s on public.%1$s', t);
    execute format('create trigger log_%1$s after insert or update or delete on public.%1$s
                    for each row execute function public.registrar_atividade()', t);
  end loop;
end $$;

-- =====================================================================
-- 9b) ÁLBUNS SEPARADOS DOS PROJETOS
--     Um álbum pode ser de um projeto ou independente (ex.: fotos de um evento).
-- =====================================================================
create table if not exists public.albuns (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  data date,
  capa_url text,
  projeto_id uuid references public.projetos(id) on delete set null,
  publicado boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.albuns enable row level security;
drop policy if exists "publico ve albuns" on public.albuns;
create policy "publico ve albuns" on public.albuns
  for select using (publicado or public.is_admin());
drop policy if exists "admins gerenciam albuns" on public.albuns;
create policy "admins gerenciam albuns" on public.albuns
  for all using (public.is_admin()) with check (public.is_admin());

-- As fotos/vídeos passam a pertencer a um álbum
alter table public.midias add column if not exists album_id uuid references public.albuns(id) on delete cascade;
alter table public.midias alter column projeto_id drop not null;

-- Leva as fotos que já existiam para um álbum com o mesmo nome do projeto
insert into public.albuns (id, titulo, descricao, data, capa_url, projeto_id, publicado)
select p.id, p.titulo, p.descricao, p.data, p.capa_url, p.id, p.publicado
from public.projetos p
where exists (select 1 from public.midias m where m.projeto_id = p.id and m.album_id is null)
on conflict (id) do nothing;
update public.midias set album_id = projeto_id where album_id is null and projeto_id is not null;

drop policy if exists "publico ve midias" on public.midias;
create policy "publico ve midias" on public.midias
  for select using (exists (select 1 from public.albuns a where a.id = album_id and (a.publicado or public.is_admin())));

drop trigger if exists log_albuns on public.albuns;
create trigger log_albuns after insert or update or delete on public.albuns
  for each row execute function public.registrar_atividade();

-- =====================================================================
-- 9c) CARROSSEL DA PÁGINA INICIAL (fotos que ficam passando)
-- =====================================================================
create table if not exists public.carrossel (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caminho text,                 -- caminho no Storage (para apagar o arquivo)
  legenda text,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
alter table public.carrossel enable row level security;
drop policy if exists "publico ve carrossel" on public.carrossel;
create policy "publico ve carrossel" on public.carrossel for select using (true);
drop policy if exists "admins gerenciam carrossel" on public.carrossel;
create policy "admins gerenciam carrossel" on public.carrossel
  for all using (public.is_admin()) with check (public.is_admin());

-- A primeira foto do carrossel é o cartaz oficial (só entra se o carrossel estiver vazio)
insert into public.carrossel (url, legenda, ordem)
select 'assets/cartaz-pulga.jpg', null, 0
where not exists (select 1 from public.carrossel);

drop trigger if exists log_carrossel on public.carrossel;
create trigger log_carrossel after insert or update or delete on public.carrossel
  for each row execute function public.registrar_atividade();

-- =====================================================================
-- 10) ADMINISTRADOR GERAL do site.
--     A SENHA NÃO FICA AQUI: ela é criada no site, em "Primeiro acesso".
-- =====================================================================
delete from public.admins where lower(email) = 'seu-email@exemplo.com';
insert into public.admins (email, nome, nivel) values ('wcfarias.wf@gmail.com', 'Wagner', 'geral')
on conflict (email) do update set nivel = 'geral';

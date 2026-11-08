-- =========================================================
-- Kiroku: preparazione del database Supabase
-- Da eseguire UNA volta nell'editor SQL del progetto.
-- =========================================================

-- 1) Tabella dei titoli: ogni riga è un titolo, i dati stanno nel campo JSON "data".
create table if not exists public.items (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists items_user_idx on public.items (user_id);

-- 2) Sicurezza: ognuno vede e modifica solo i propri titoli.
alter table public.items enable row level security;
drop policy if exists "items_select" on public.items;
drop policy if exists "items_insert" on public.items;
drop policy if exists "items_update" on public.items;
drop policy if exists "items_delete" on public.items;
create policy "items_select" on public.items for select to authenticated using (user_id = auth.uid());
create policy "items_insert" on public.items for insert to authenticated with check (user_id = auth.uid());
create policy "items_update" on public.items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "items_delete" on public.items for delete to authenticated using (user_id = auth.uid());

-- 3) Aggiornamenti in tempo reale (telefono <-> PC).
do $$ begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null; end $$;

-- 4) Spazio per i file.
--    covers = copertine caricate (pubbliche, con nomi impossibili da indovinare)
--    files  = fan art, EPUB e altri file (privati: si aprono con link temporanei)
insert into storage.buckets (id, name, public, file_size_limit)
values ('covers', 'covers', true, 5242880)
on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 52428800)
on conflict (id) do update set public = false;

drop policy if exists "kiroku_covers_select" on storage.objects;
drop policy if exists "kiroku_covers_insert" on storage.objects;
drop policy if exists "kiroku_covers_delete" on storage.objects;
drop policy if exists "kiroku_files_select" on storage.objects;
drop policy if exists "kiroku_files_insert" on storage.objects;
drop policy if exists "kiroku_files_delete" on storage.objects;
create policy "kiroku_covers_select" on storage.objects for select to authenticated using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kiroku_covers_insert" on storage.objects for insert to authenticated with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kiroku_covers_delete" on storage.objects for delete to authenticated using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kiroku_files_select" on storage.objects for select to authenticated using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kiroku_files_insert" on storage.objects for insert to authenticated with check (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kiroku_files_delete" on storage.objects for delete to authenticated using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);

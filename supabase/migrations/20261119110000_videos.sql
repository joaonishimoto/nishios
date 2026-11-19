-- Vídeos enviados do aparelho (passos de dança). Bucket privado: cada arquivo fica numa
-- pasta com o id do dono ("<user_id>/<arquivo>") e só ele lê, envia ou apaga.
-- Até 50 MB por arquivo, só vídeo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nishios-videos', 'nishios-videos', false, 52428800, array['video/*'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "nishios videos: dono lê" on storage.objects;
create policy "nishios videos: dono lê" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'nishios-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_allowed_user())
  );

drop policy if exists "nishios videos: dono envia" on storage.objects;
create policy "nishios videos: dono envia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'nishios-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_allowed_user())
  );

drop policy if exists "nishios videos: dono apaga" on storage.objects;
create policy "nishios videos: dono apaga" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'nishios-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_allowed_user())
  );

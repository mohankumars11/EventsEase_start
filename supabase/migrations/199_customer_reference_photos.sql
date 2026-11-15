-- 199 — Customers attach their own reference photos (Mohan, 2026-11-02:
-- "provide Other — type or upload — wherever our options don't cover it").
--
-- A customer choosing décor, a cake, a menu… can add up to three photos
-- of what they want. The app uploads to <their user id>/<random>.jpg in
-- this bucket and writes the public link into the brief, which the master
-- sees as a picture (components/vendor/BriefNote.jsx).
--
-- Public read: the master who receives the brief must be able to open the
-- photo without an account on the customer's side; the path is a random
-- id under the customer's folder, never listed. Writes and deletes are
-- the customer's own folder only. 5 MB, images only. Safe to re-run.

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('customer-references', 'customer-references', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Customers upload their own reference photos" on storage.objects;
create policy "Customers upload their own reference photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'customer-references' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Customers delete their own reference photos" on storage.objects;
create policy "Customers delete their own reference photos" on storage.objects for delete to authenticated
  using (bucket_id = 'customer-references' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Reference photos are readable" on storage.objects;
create policy "Reference photos are readable" on storage.objects for select to anon, authenticated
  using (bucket_id = 'customer-references');

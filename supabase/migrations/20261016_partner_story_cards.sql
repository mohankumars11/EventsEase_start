-- Partner story studio: ordered media cards within each of four story slots.
create table if not exists public.partner_story_cards (
 id uuid primary key default gen_random_uuid(),
 story_key text not null check(story_key in ('instant-booking','jobs','start-trip','event-done')),
 title text not null, media_url text not null,
 media_type text not null check(media_type in ('image','video')),
 storage_path text, position integer not null default 0,
 is_published boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists partner_story_cards_live_order_idx on public.partner_story_cards(story_key,is_published,position);
alter table public.partner_story_cards enable row level security;
drop policy if exists "Published partner stories are readable" on public.partner_story_cards;
create policy "Published partner stories are readable" on public.partner_story_cards for select using(is_published=true);
drop policy if exists "Admins manage partner stories" on public.partner_story_cards;
create policy "Admins manage partner stories" on public.partner_story_cards for all using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('partner-story-media','partner-story-media',true,104857600,array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']) on conflict(id) do update set public=true,file_size_limit=104857600,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Published story media is public" on storage.objects;
create policy "Published story media is public" on storage.objects for select using(bucket_id='partner-story-media');
drop policy if exists "Admins upload story media" on storage.objects;
create policy "Admins upload story media" on storage.objects for insert with check(bucket_id='partner-story-media' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists "Admins update story media" on storage.objects;
create policy "Admins update story media" on storage.objects for update using(bucket_id='partner-story-media' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists "Admins delete story media" on storage.objects;
create policy "Admins delete story media" on storage.objects for delete using(bucket_id='partner-story-media' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- Partner portfolio audio support.
-- Adds audio samples to the existing partner_work review lifecycle and permits
-- common browser/mobile audio formats in the private partner-uploads bucket.
-- Apply this migration before enabling audio uploads in the partner app.

begin;

alter table public.partner_work
  drop constraint if exists partner_work_kind_check;

alter table public.partner_work
  add constraint partner_work_kind_check
  check (kind = any (array['photo'::text, 'video'::text, 'document'::text, 'audio'::text, 'testimonial'::text]));

update storage.buckets
set allowed_mime_types = (
  select array_agg(mime_type order by mime_type)
  from (
    select distinct unnest(
      coalesce(allowed_mime_types, array[]::text[]) ||
      array[
        'audio/mpeg',
        'audio/mp4',
        'audio/aac',
        'audio/wav',
        'audio/x-wav',
        'audio/ogg',
        'audio/webm',
        'audio/flac',
        'audio/x-m4a'
      ]::text[]
    ) as mime_type
  ) allowed_types
)
where id = 'partner-uploads'
  and allowed_mime_types is not null;

commit;

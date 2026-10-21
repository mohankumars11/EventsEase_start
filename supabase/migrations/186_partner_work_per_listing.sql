-- ════════════════════════════════════════════════════════════════════════
-- 186 — A photograph can belong to one listing
-- ════════════════════════════════════════════════════════════════════════
--
-- Reported from the app: the customer preview shows the same photos on
-- every listing, so a partner who lists Photography, Videography and
-- Decoration sees one body of work presented three times as though each
-- trade had its own.
--
-- partner_work is keyed on the vendor and nothing else. That was a
-- deliberate choice — "one body of work, however many services they
-- list", and the comment saying so is still in VendorServiceList — and
-- it is right for a partner with one trade and wrong the moment they
-- have two. A mandap photograph is not a videography showreel.
--
-- ── NULL still means "all of it" ──────────────────────────────────────
--
-- service_id is nullable and nullable means what it says: this is the
-- business's work, show it anywhere. Only uploads made from inside a
-- listing are stamped with that listing.
--
-- The 11 rows that exist today stay NULL. We cannot know which listing
-- they were taken for, and guessing would put a decorator's flowers on
-- their photography card with no way for anybody to notice.
--
-- ON DELETE SET NULL, not CASCADE: deleting a listing must not delete
-- the photographs a partner uploaded. They lose their scope and become
-- general work again, which is recoverable; deleting them is not.

alter table public.partner_work
  add column if not exists service_id uuid
    references public.vendor_services(id) on delete set null;

create index if not exists partner_work_service_idx
  on public.partner_work (service_id)
  where service_id is not null;

comment on column public.partner_work.service_id is
  'The listing this work belongs to. NULL = the whole business, shown on every listing. Only ever set by an upload made from inside a listing.';

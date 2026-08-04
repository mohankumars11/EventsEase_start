-- ============================================================
-- Migration 014: Real quote fields on service_enquiries. Upfront
-- prices are being removed from every event/service/festival menu
-- package browsing page — pricing now happens after a customer
-- submits requirements, Sambramo reviews and sources vendors off
-- platform, and admin enters one final quoted price here.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS quoted_price NUMERIC;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS quote_notes  TEXT;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS quoted_at    TIMESTAMPTZ;

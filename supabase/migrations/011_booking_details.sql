-- ============================================================
-- Migration 011: Per-item booking details (date/time/guest count/
-- location) on the service cart + enquiries, so individual-service
-- bookings can capture real details instead of a single event-wide date.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE cart_items    ADD COLUMN IF NOT EXISTS booking_date DATE;
ALTER TABLE cart_items    ADD COLUMN IF NOT EXISTS booking_time TIME;
ALTER TABLE cart_items    ADD COLUMN IF NOT EXISTS guest_count  INTEGER;
ALTER TABLE cart_items    ADD COLUMN IF NOT EXISTS location     JSONB;

ALTER TABLE cart_packages ADD COLUMN IF NOT EXISTS booking_date DATE;
ALTER TABLE cart_packages ADD COLUMN IF NOT EXISTS booking_time TIME;
ALTER TABLE cart_packages ADD COLUMN IF NOT EXISTS guest_count  INTEGER;
ALTER TABLE cart_packages ADD COLUMN IF NOT EXISTS location     JSONB;

ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS start_time  TIME;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS guest_count INTEGER;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS location    JSONB;

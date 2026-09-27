-- Migration: 20261122000000_expand_status_constraints_lifecycle.sql
-- Description: Expand check constraints across core entities (classifieds, products, booking_services, events)
-- to reliably support full lifecycle states: active, paused, draft, reserved, completed, archived.

-- 1. classifieds
ALTER TABLE public.classifieds DROP CONSTRAINT IF EXISTS classifieds_status_check;
ALTER TABLE public.classifieds ADD CONSTRAINT classifieds_status_check 
  CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'draft'::text, 'reserved'::text, 'completed'::text, 'resolved'::text, 'archived'::text, 'expired'::text, 'banned'::text]));

-- 2. booking_services
ALTER TABLE public.booking_services DROP CONSTRAINT IF EXISTS booking_services_status_check;
ALTER TABLE public.booking_services ADD CONSTRAINT booking_services_status_check 
  CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'archived'::text]));

-- 3. events
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check 
  CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]));

-- 4. products
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_status_check 
  CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'active'::text, 'paused'::text, 'archived'::text]));

-- ==============================================================================
-- MIGRATION: 20261121000000_schema_integrity_and_relationship_hardening.sql
-- DESCRIPTION: Relational Integrity & Schema Hardening (BigTech Executive Board)
-- Hardens foreign keys, indexes, and eliminates PostgREST relationship gaps across:
-- 1. crm_clinical_records (author_id, customer_id -> profiles)
-- 2. store_followers (customer_id -> profiles)
-- 3. orders (courier_profile_id -> courier_profiles)
-- 4. ticket_messages (sender_id -> profiles)
-- 5. event_checkins (event_id -> events)
-- 6. deals (classified_id -> classifieds)
-- 7. booking_appointments (customer_id -> profiles)
-- ==============================================================================

-- 1. crm_clinical_records -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'crm_clinical_records_author_id_fkey' AND table_name = 'crm_clinical_records'
  ) THEN
    ALTER TABLE public.crm_clinical_records 
      ADD CONSTRAINT crm_clinical_records_author_id_fkey 
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'crm_clinical_records_customer_id_fkey' AND table_name = 'crm_clinical_records'
  ) THEN
    ALTER TABLE public.crm_clinical_records 
      ADD CONSTRAINT crm_clinical_records_customer_id_fkey 
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_clinical_records_author_id ON public.crm_clinical_records(author_id);
CREATE INDEX IF NOT EXISTS idx_crm_clinical_records_customer_id ON public.crm_clinical_records(customer_id);

-- 2. store_followers -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'store_followers_customer_id_fkey' AND table_name = 'store_followers'
  ) THEN
    ALTER TABLE public.store_followers 
      ADD CONSTRAINT store_followers_customer_id_fkey 
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_store_followers_customer_id ON public.store_followers(customer_id);

-- 3. orders -> courier_profiles
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS courier_profile_id UUID REFERENCES public.courier_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_courier_profile_id ON public.orders(courier_profile_id);

-- 4. ticket_messages -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ticket_messages_sender_id_fkey' AND table_name = 'ticket_messages'
  ) THEN
    ALTER TABLE public.ticket_messages 
      ADD CONSTRAINT ticket_messages_sender_id_fkey 
      FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON public.ticket_messages(sender_id);

-- 5. event_checkins -> events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_checkins_event_id_fkey' AND table_name = 'event_checkins'
  ) THEN
    ALTER TABLE public.event_checkins 
      ADD CONSTRAINT event_checkins_event_id_fkey 
      FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id);

-- 6. deals -> classifieds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deals_classified_id_fkey' AND table_name = 'deals'
  ) THEN
    ALTER TABLE public.deals 
      ADD CONSTRAINT deals_classified_id_fkey 
      FOREIGN KEY (classified_id) REFERENCES public.classifieds(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deals_classified_id ON public.deals(classified_id);

-- 7. booking_appointments -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'booking_appointments_customer_id_fkey' AND table_name = 'booking_appointments'
  ) THEN
    ALTER TABLE public.booking_appointments 
      ADD CONSTRAINT booking_appointments_customer_id_fkey 
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_appointments_customer_id ON public.booking_appointments(customer_id);

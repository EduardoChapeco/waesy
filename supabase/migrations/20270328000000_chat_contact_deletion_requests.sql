-- Migration: chat_contact_deletion_requests
-- Governança estrita de exclusão de contatos e conversas por supervisores/gerentes (Invariante B.33 / DEC-489)

CREATE TABLE IF NOT EXISTS public.chat_contact_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers_crm(id) ON DELETE SET NULL,
    requested_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewed_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reason TEXT,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_deletion_req_store_status ON public.chat_contact_deletion_requests(store_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_deletion_req_thread ON public.chat_contact_deletion_requests(thread_id);

ALTER TABLE public.chat_contact_deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chat_contact_deletion_requests' 
        AND policyname = 'chat_deletion_requests_store_isolation'
    ) THEN
        CREATE POLICY chat_deletion_requests_store_isolation ON public.chat_contact_deletion_requests
            FOR ALL
            USING (
                store_id IN (
                    SELECT store_id FROM public.store_members WHERE profile_id = auth.uid()
                )
            );
    END IF;
END $$;

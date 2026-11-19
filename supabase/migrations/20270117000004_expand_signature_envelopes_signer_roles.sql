-- Waesy: Expand signature_envelopes.signer_role CHECK constraint to support full multi-vertical role catalog
-- Preserves all historical roles ('party', 'witness', 'guarantor', 'client') and allows any canonical slug [a-z0-9_]{2,48}

ALTER TABLE public.signature_envelopes
  DROP CONSTRAINT IF EXISTS signature_envelopes_signer_role_check;

ALTER TABLE public.signature_envelopes
  ADD CONSTRAINT signature_envelopes_signer_role_check
  CHECK (signer_role ~ '^[a-z0-9_]{2,48}$');

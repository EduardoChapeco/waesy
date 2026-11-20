alter table public.events add constraint events_raw_extraction_id_fkey FOREIGN KEY (raw_extraction_id) REFERENCES mined_raw_extractions(id) ON DELETE SET NULL;

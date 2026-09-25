const fs = require('fs');
const file = 'supabase/migrations/20261110000000_mining_and_crawlers_infrastructure.sql';
let content = fs.readFileSync(file, 'utf8');

const regex = /ALTER TABLE public\.mining_schedules[\s\S]*?INSERT INTO public\.mining_schedules/m;

const replacement = `ALTER TABLE public.mining_schedules
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS cron_expression TEXT,
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

ALTER TABLE public.mining_schedules ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.mining_schedules ALTER COLUMN name SET DEFAULT '';

INSERT INTO public.mining_schedules`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully replaced with clean DDL without DO block');
} else {
  console.error('Regex match failed');
}

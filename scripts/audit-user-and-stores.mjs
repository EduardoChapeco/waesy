import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const lines = fs.readFileSync('.env.secrets', 'utf8').split(/\r?\n/);
const secrets = {};
for (const l of lines) {
  const line = l.trim();
  if (!line || line.startsWith('#')) continue;
  const eqIdx = line.indexOf('=');
  if (eqIdx !== -1) {
    const k = line.substring(0, eqIdx).trim();
    let v = line.substring(eqIdx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    secrets[k] = v;
  }
}

const supabaseUrl = secrets.VITE_SUPABASE_URL || 'https://jfuebqmltksyznovhlwa.supabase.co';
const serviceRoleKey = secrets.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('--- BUSCANDO USUÁRIOS ---');
  const { data: usersData, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) {
    console.error('Erro listando usuários:', userErr);
    return;
  }
  
  const users = usersData.users || [];
  console.log(`Total de usuários no auth: ${users.length}`);
  for (const u of users) {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Nome: ${u.user_metadata?.full_name || u.user_metadata?.name || 'N/A'}`);
  }

  console.log('\n--- BUSCANDO TODAS AS LOJAS (STORES) ---');
  const { data: { user: targetUser } } = await supabase.auth.admin.getUserById('2ea9f0aa-8b04-4086-9e1d-e23105560302');
  console.log('\n--- METADADOS DE EDUARDO RAMOS ---');
  console.log('user_metadata:', JSON.stringify(targetUser?.user_metadata, null, 2));
  console.log('app_metadata:', JSON.stringify(targetUser?.app_metadata, null, 2));

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', '2ea9f0aa-8b04-4086-9e1d-e23105560302')
    .maybeSingle();
  console.log('profile row:', profile);

  const { data: stores, error: storeErr } = await supabase
    .from('stores')
    .select('id, name, slug, is_platform_root, is_active, created_at')
    .order('created_at', { ascending: false });

  if (storeErr) {
    console.error('Erro buscando lojas:', storeErr);
    return;
  }

  console.log(`Total de lojas no banco: ${stores.length}`);
  for (const s of stores) {
    console.log(`- ${s.id} | ${s.name} (${s.slug}) | root: ${s.is_platform_root} | active: ${s.is_active}`);
  }

  console.log('\n--- BUSCANDO MEMBROS (STORE_MEMBERSHIPS) ---');
  const { data: memberships, error: memberErr } = await supabase
    .from('store_memberships')
    .select('id, store_id, user_id, role, stores(name, slug)');

  if (memberErr) {
    console.error('Erro buscando membros:', memberErr);
  } else {
    for (const m of (memberships || [])) {
      console.log(`- MemberID: ${m.id} | Loja: ${m.stores?.name} (${m.store_id}) | User: ${m.user_id} | Role: ${m.role}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

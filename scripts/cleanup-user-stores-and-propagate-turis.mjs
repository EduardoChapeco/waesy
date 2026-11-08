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

const EDUARDO_USER_ID = '2ea9f0aa-8b04-4086-9e1d-e23105560302';
const WAESY_STORE_ID = '5108ce27-2df1-4ce2-89f2-681fea6dba95';
const EXCELENCIA_TOUR_STORE_ID = 'c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7';

async function main() {
  console.log('=== HIGIENIZAÇÃO DE CADASTROS DO USUÁRIO EDUARDO ANTÔNIO RAMOS ===\n');

  // 1. Verificar memberships atuais
  const { data: currentMemberships, error: memErr } = await supabase
    .from('store_memberships')
    .select('id, store_id, stores(name, slug)')
    .eq('user_id', EDUARDO_USER_ID);

  if (memErr) {
    console.error('Erro ao consultar store_memberships:', memErr);
    process.exit(1);
  }

  console.log('Memberships atuais de Eduardo:');
  for (const m of currentMemberships) {
    console.log(`- ID: ${m.id} | Loja: ${m.stores?.name} (${m.store_id})`);
  }

  // 2. Remover lojas que não sejam Waesy nem Excelência Tour
  const toDelete = currentMemberships.filter(
    m => m.store_id !== WAESY_STORE_ID && m.store_id !== EXCELENCIA_TOUR_STORE_ID
  );

  if (toDelete.length > 0) {
    console.log(`\nRemovendo ${toDelete.length} associação(ões) extra(s)...`);
    for (const item of toDelete) {
      console.log(`- Removendo vínculo com ${item.stores?.name} (${item.store_id})...`);
      const { error: delErr } = await supabase
        .from('store_memberships')
        .delete()
        .eq('id', item.id);
      if (delErr) {
        console.error(`Erro ao remover vínculo ${item.id}:`, delErr);
      } else {
        console.log(`✓ Vínculo removido com sucesso.`);
      }
    }
  } else {
    console.log('\nNenhum vínculo excedente encontrado.');
  }

  // 3. Garantir que os vínculos com Waesy e Excelência Tour existam
  const remainingStoreIds = (
    await supabase
      .from('store_memberships')
      .select('store_id')
      .eq('user_id', EDUARDO_USER_ID)
  ).data?.map(m => m.store_id) || [];

  if (!remainingStoreIds.includes(WAESY_STORE_ID)) {
    console.log('\nCriando vínculo com Workspace Waesy (Principal)...');
    await supabase.from('store_memberships').insert({
      user_id: EDUARDO_USER_ID,
      store_id: WAESY_STORE_ID,
      role: 'owner',
    });
    console.log('✓ Vínculo com Waesy estabelecido.');
  }

  if (!remainingStoreIds.includes(EXCELENCIA_TOUR_STORE_ID)) {
    console.log('\nCriando vínculo com Excelência Tour (Agência Parceira Padrão)...');
    await supabase.from('store_memberships').insert({
      user_id: EDUARDO_USER_ID,
      store_id: EXCELENCIA_TOUR_STORE_ID,
      role: 'owner',
    });
    console.log('✓ Vínculo com Excelência Tour estabelecido.');
  }

  // 4. Atualizar metadata do usuário para ter store_id = Waesy por padrão
  console.log('\nAtualizando user_metadata de Eduardo Antônio Ramos com loja ativa padrão...');
  const { data: targetUser } = await supabase.auth.admin.getUserById(EDUARDO_USER_ID);
  const updatedUserMeta = {
    ...(targetUser?.user?.user_metadata || {}),
    store_id: WAESY_STORE_ID,
    primary_store_id: WAESY_STORE_ID,
    tourism_partner_store_id: EXCELENCIA_TOUR_STORE_ID,
  };

  const { error: userUpdateErr } = await supabase.auth.admin.updateUserById(EDUARDO_USER_ID, {
    user_metadata: updatedUserMeta,
  });

  if (userUpdateErr) {
    console.error('Erro ao atualizar user_metadata:', userUpdateErr);
  } else {
    console.log('✓ user_metadata atualizado com sucesso. Loja padrão: Workspace Waesy.');
  }

  // 5. Atualizar nome e metadados de Excelência Tour
  console.log('\nVerificando loja Excelência Tour...');
  const { data: tourStore } = await supabase
    .from('stores')
    .select('id, name, settings, description')
    .eq('id', EXCELENCIA_TOUR_STORE_ID)
    .single();

  if (tourStore) {
    const existingSettings = tourStore.settings || {};
    const updatedSettings = {
      ...existingSettings,
      partner_type: 'default_partner_agency',
      partner_label: 'Agência Parceira Padrão',
      module_brand_name: 'Turis',
    };

    const { error: storeUpdateErr } = await supabase
      .from('stores')
      .update({
        settings: updatedSettings,
        description: tourStore.description || 'Agência parceira oficial do módulo Turis para pacotes, aéreos, hotéis e turismo receptivo.',
      })
      .eq('id', EXCELENCIA_TOUR_STORE_ID);

    if (storeUpdateErr) {
      console.error('Erro ao atualizar configurações da loja Excelência Tour:', storeUpdateErr);
    } else {
      console.log('✓ Loja Excelência Tour atualizada com selo de Agência Parceira Padrão do Turis.');
    }
  }

  // 6. Verificação final
  const { data: finalMemberships } = await supabase
    .from('store_memberships')
    .select('id, store_id, role, stores(name, slug)')
    .eq('user_id', EDUARDO_USER_ID);

  console.log('\n=== STATUS FINAL DE EDUARDO ANTÔNIO RAMOS ===');
  for (const m of finalMemberships || []) {
    console.log(`- Loja: ${m.stores?.name} (${m.stores?.slug}) | Role: ${m.role}`);
  }
}

main().catch(err => {
  console.error('Erro fatal na higienização:', err);
  process.exit(1);
});

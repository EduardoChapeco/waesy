import pg from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })();
const pool = new pg.Pool({ connectionString });

async function main() {
  console.log('1. Atualizando perfil do Eduardo para platform_admin...');
  await pool.query(`
    UPDATE public.profiles 
    SET role = 'platform_admin' 
    WHERE id = '2ea9f0aa-8b04-4086-9e1d-e23105560302';
  `);

  console.log('2. Atualizando raw_user_meta_data do Eduardo no auth.users...');
  await pool.query(`
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{role}',
          '"platform_admin"'
        ),
        '{is_admin_master}',
        'true'
      ),
      '{is_superadmin}',
      'true'
    )
    WHERE id = '2ea9f0aa-8b04-4086-9e1d-e23105560302';
  `);

  console.log('3. Atualizando platform_brand_settings...');
  await pool.query(`
    UPDATE public.platform_brand_settings
    SET support_email = 'contato@usewaesy.com',
        social_instagram = '@usewaesy'
    WHERE id = 'f8e65381-13e9-4c84-aea9-1b93c602ea13';
  `);

  console.log('4. Verificando se existe root store e criando se necessário...');
  const rootStoreCheck = await pool.query(`SELECT id, name, slug FROM public.stores WHERE is_platform_root = true LIMIT 1`);
  if (rootStoreCheck.rows.length === 0) {
    console.log('Nenhuma loja raiz encontrada. Marcando ou inserindo loja matriz Waesy...');
    // Verificar se existe store com slug 'waesy'
    const waesyStore = await pool.query(`SELECT id FROM public.stores WHERE slug = 'waesy' LIMIT 1`);
    if (waesyStore.rows.length > 0) {
      await pool.query(`UPDATE public.stores SET is_platform_root = true, is_active = true WHERE id = $1`, [waesyStore.rows[0].id]);
      console.log('Loja waesy promovida a platform root!');
    } else {
      // Buscar primeira org ou criar
      let orgId = (await pool.query(`SELECT id FROM public.organizations LIMIT 1`)).rows[0]?.id;
      if (!orgId) {
        const newOrg = await pool.query(`INSERT INTO public.organizations (name, slug) VALUES ('Waesy Global', 'waesy-global') RETURNING id`);
        orgId = newOrg.rows[0].id;
      }
      await pool.query(`
        INSERT INTO public.stores (
          name, slug, organization_id, is_platform_root, is_active, plan_tier, access_type
        ) VALUES (
          'Waesy Matriz', 'waesy-matriz', $1, true, true, 'enterprise', 'public'
        ) ON CONFLICT DO NOTHING
      `, [orgId]);
      console.log('Loja Waesy Matriz criada como platform root com sucesso!');
    }
  } else {
    console.log('Loja root já configurada:', rootStoreCheck.rows[0]);
  }

  console.log('✅ Auditoria e correções no banco aplicadas com sucesso!');
  await pool.end();
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});

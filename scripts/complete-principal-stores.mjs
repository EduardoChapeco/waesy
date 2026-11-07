import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const secretsPath = path.join(process.cwd(), '.env.secrets');
const secrets = {};
if (fs.existsSync(secretsPath)) {
  const lines = fs.readFileSync(secretsPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      let v = trimmed.substring(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      secrets[trimmed.substring(0, eq).trim()] = v;
    }
  }
}

const env = {
  ...process.env,
  ...secrets,
  SUPABASE_ACCESS_TOKEN: secrets.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN,
  SUPABASE_DB_PASSWORD: secrets.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD,
};

const projectRef = secrets.SUPABASE_PROJECT_REF || secrets.PROJECT_REF || 'jfuebqmltksyznovhlwa';

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: `postgres.${projectRef}`,
  password: env.SUPABASE_DB_PASSWORD,
  ssl: 'require',
  connect_timeout: 15,
  max: 1,
});

async function main() {
  console.log('=== ATUALIZANDO DADOS COMPLETOS DE LOJAS E EMPRESAS PRINCIPAIS ===\n');

  const WAESY_LOGO = 'https://jfuebqmltksyznovhlwa.supabase.co/storage/v1/object/public/post-media/2ea9f0aa-8b04-4086-9e1d-e23105560302/1788396237896-792c76f.png';
  const EXCELENCIA_LOGO = 'https://jfuebqmltksyznovhlwa.supabase.co/storage/v1/object/public/cms-media/00000000-0000-0000-0000-000000000002/1788397185786-9jh44h6fiq.png';

  // 1. Atualizar Waesy em stores
  await sql`
    UPDATE stores
    SET 
      name = 'Waesy',
      logo_url = ${WAESY_LOGO},
      avatar_url = ${WAESY_LOGO},
      description = 'Ecossistema operacional integrado de comércio, serviços e gestão local para cidades e comunidades.',
      city = 'São Miguel do Oeste',
      state = 'SC',
      address = 'Centro',
      is_active = true
    WHERE id = '5108ce27-2df1-4ce2-89f2-681fea6dba95'
  `;
  console.log('✓ Loja Waesy atualizada na tabela stores.');

  // 2. Atualizar Waesy em companies
  await sql`
    UPDATE companies
    SET 
      name = 'Waesy',
      logo_url = ${WAESY_LOGO},
      description = 'Ecossistema operacional integrado de comércio, serviços e gestão local para cidades e comunidades.',
      city = 'São Miguel do Oeste',
      state = 'SC',
      address = 'Centro'
    WHERE id = '5108ce27-2df1-4ce2-89f2-681fea6dba95'
  `;
  console.log('✓ Empresa Waesy atualizada na tabela companies.');

  // 3. Atualizar Excelência Tour em stores
  await sql`
    UPDATE stores
    SET 
      name = 'Excelência Tour São Miguel do Oeste',
      logo_url = ${EXCELENCIA_LOGO},
      avatar_url = ${EXCELENCIA_LOGO},
      cnpj = '66.819.671/0001-97',
      description = 'Agência parceira oficial do módulo Turis para pacotes, aéreos, hotéis e turismo receptivo.',
      city = 'São Miguel do Oeste',
      state = 'SC',
      address = 'Rua Duque de Caxias, 780 - Centro',
      is_active = true
    WHERE id = 'c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7'
  `;
  console.log('✓ Loja Excelência Tour atualizada na tabela stores.');

  // 4. Atualizar Excelência Tour em companies
  await sql`
    UPDATE companies
    SET 
      name = 'Excelência Tour São Miguel do Oeste',
      logo_url = ${EXCELENCIA_LOGO},
      cnpj = '66.819.671/0001-97',
      description = 'Agência parceira oficial do módulo Turis para pacotes, aéreos, hotéis e turismo receptivo.',
      city = 'São Miguel do Oeste',
      state = 'SC',
      address = 'Rua Duque de Caxias, 780 - Centro'
    WHERE id = 'c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7'
  `;
  console.log('✓ Empresa Excelência Tour atualizada na tabela companies.');

  // 5. Verificar resultado
  const verifiedStores = await sql`SELECT id, name, logo_url, city, cnpj FROM stores WHERE id IN ('5108ce27-2df1-4ce2-89f2-681fea6dba95', 'c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7')`;
  console.log('\nStatus verificado das lojas:');
  for (const s of verifiedStores) {
    console.log(`- ${s.name} | Cidade: ${s.city} | CNPJ: ${s.cnpj || 'N/A'} | Logo: ${Boolean(s.logo_url)}`);
  }

  await sql.end();
}

main().catch(async err => {
  console.error(err);
  await sql.end();
  process.exit(1);
});

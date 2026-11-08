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
  console.log('=== AUDITORIA COMPLETA DE EMPRESAS, MINERADORES & NOTÍCIAS ===\n');

  // 1. Tabela companies
  const [compCount] = await sql`SELECT count(*)::int as count FROM companies`;
  console.log(`1. Total de Empresas em 'companies': ${compCount.count}`);
  const companies = await sql`
    SELECT id, name, cnpj, phone, email, address, city, state, logo_url, description
    FROM companies
  `;
  for (const c of companies) {
    console.log(`- ID: ${c.id} | Nome: ${c.name} | CNPJ: ${c.cnpj || 'ausente'} | Endereço: ${c.address || 'ausente'} | Logo: ${c.logo_url || 'ausente'}`);
  }

  // 2. Tabela news_articles
  const [newsCount] = await sql`SELECT count(*)::int as count FROM news_articles`;
  console.log(`\n2. Total de Notícias em 'news_articles': ${newsCount.count}`);
  const newsCols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'news_articles'
  `;
  console.log('   Colunas de news_articles:', newsCols.map(c => c.column_name));

  const news = await sql`
    SELECT *
    FROM news_articles
    ORDER BY created_at DESC
    LIMIT 10
  `;
  console.log('   Exemplo de notícia:', {
    id: news[0]?.id,
    title: news[0]?.title,
    image_url: news[0]?.image_url,
    source: news[0]?.source_name || news[0]?.source_url,
  });

  const [noCoverCount] = await sql`
    SELECT count(*)::int as count 
    FROM news_articles 
    WHERE cover_media_url IS NULL OR cover_media_url = ''
  `;
  console.log(`   - Notícias sem cover_media_url: ${noCoverCount.count} de ${newsCount.count}`);

  // 3. Tabela crawler_sources
  const [crawlerCount] = await sql`SELECT count(*)::int as count FROM crawler_sources`;
  console.log(`\n3. Total de Fontes de Crawler ('crawler_sources'): ${crawlerCount.count}`);
  const crawlerCols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'crawler_sources'
  `;
  console.log('   Colunas de crawler_sources:', crawlerCols.map(c => c.column_name));

  const crawlers = await sql`
    SELECT *
    FROM crawler_sources
    LIMIT 5
  `;
  console.log('   Exemplos de fontes:', crawlers.map(c => ({ id: c.id, name: c.name || c.title, url: c.feed_url || c.url, is_active: c.is_active })));

  // 4. Mined extractions and leads
  const [waesyStore] = await sql`
    SELECT id, name, logo_url, avatar_url, description, address, city, state 
    FROM stores 
    WHERE id = '5108ce27-2df1-4ce2-89f2-681fea6dba95'
  `;
  console.log('Loja Waesy na tabela stores:', waesyStore);
  const [minedProd] = await sql`SELECT count(*)::int as count FROM mined_products`;
  const [crmLeads] = await sql`SELECT count(*)::int as count FROM crm_leads`;
  const [leadsCrm] = await sql`SELECT count(*)::int as count FROM leads_crm`;
  const [masterCatalog] = await sql`SELECT count(*)::int as count FROM global_master_catalog`;
  console.log(`\n4. Dados Minerados Globais:`);
  console.log(`   - mined_raw_extractions: ${minedRaw.count}`);
  console.log(`   - mined_products: ${minedProd.count}`);
  console.log(`   - crm_leads: ${crmLeads.count}`);
  console.log(`   - leads_crm: ${leadsCrm.count}`);
  console.log(`   - global_master_catalog: ${masterCatalog.count}`);

  // 5. System Error Logs
  const [errCount] = await sql`SELECT count(*)::int as count FROM system_error_logs`;
  console.log(`\n5. Total de Erros em 'system_error_logs': ${errCount.count}`);
  const errCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'system_error_logs'`;
  console.log('   Colunas de system_error_logs:', errCols.map(c => c.column_name));
  const recentErrors = await sql`SELECT * FROM system_error_logs ORDER BY created_at DESC LIMIT 5`;
  for (const re of recentErrors) {
    console.log(`   - [${re.created_at}] [${re.component || re.source || 'core'}] ${re.message?.slice(0, 100)}`);
  }

  await sql.end();
}

main().catch(async (err) => {
  console.error('Erro:', err);
  await sql.end();
  process.exit(1);
});

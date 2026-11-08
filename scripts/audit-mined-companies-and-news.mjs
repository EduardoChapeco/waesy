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
  console.log('=== AUDITORIA DE EMPRESAS MINERADAS & NOTÍCIAS ===\n');

  // 1. Verificar tabela 'places'
  const { data: places, error: placesErr } = await supabase
    .from('places')
    .select('id, name, slug, address, phone, cnpj, website, logo_url, rating, created_at')
    .limit(100);

  if (placesErr) {
    console.log('Tabela places erro/inexistente:', placesErr.message);
  } else {
    console.log(`Tabela 'places': ${places.length} registros amostrados.`);
    let missingLogo = 0;
    let missingCnpj = 0;
    let missingAddress = 0;
    for (const p of places) {
      if (!p.logo_url) missingLogo++;
      if (!p.cnpj) missingCnpj++;
      if (!p.address) missingAddress++;
    }
    console.log(`- Sem logo: ${missingLogo}/${places.length}`);
    console.log(`- Sem CNPJ: ${missingCnpj}/${places.length}`);
    console.log(`- Sem endereço: ${missingAddress}/${places.length}`);
  }

  // 2. Verificar 'directory_businesses' se existir
  const { data: dirBiz, error: dirErr } = await supabase
    .from('directory_businesses')
    .select('id, name, address, phone, cnpj, logo_url')
    .limit(50);
  if (dirErr) {
    console.log("Tabela 'directory_businesses':", dirErr.message);
  } else {
    console.log(`Tabela 'directory_businesses': ${dirBiz.length} registros.`);
  }

  // 3. Verificar 'mined_leads' se existir
  const { data: minedLeads, error: leadsErr } = await supabase
    .from('mined_leads')
    .select('id, business_name, cnpj, phone, address, status, enrichment_status')
    .limit(50);
  if (leadsErr) {
    console.log("Tabela 'mined_leads':", leadsErr.message);
  } else {
    console.log(`Tabela 'mined_leads': ${minedLeads.length} leads minerados.`);
    const enriched = minedLeads.filter(l => l.enrichment_status === 'enriched' || l.cnpj);
    console.log(`- Enriquecidos com CNPJ: ${enriched.length}/${minedLeads.length}`);
  }

  // 4. Verificar Notícias ('press_articles' ou 'noticias' ou 'news_articles')
  const { data: articles, error: artErr } = await supabase
    .from('press_articles')
    .select('id, title, cover_url, published_at, is_published')
    .limit(100);

  if (artErr) {
    console.log("Tabela 'press_articles':", artErr.message);
  } else {
    console.log(`\nTabela 'press_articles': ${articles.length} notícias cadastradas.`);
    const missingCover = articles.filter(a => !a.cover_url || a.cover_url.trim() === '');
    console.log(`- Notícias sem capa: ${missingCover.length}/${articles.length}`);
    if (missingCover.length > 0) {
      console.log('Exemplos sem capa:', missingCover.slice(0, 5).map(a => ({ id: a.id, title: a.title })));
    }
  }

  // 5. Verificar logs de erros recentes em 'system_logs' ou 'system_error_logs'
  const { data: errorLogs, error: logErr } = await supabase
    .from('system_logs')
    .select('id, level, message, context, created_at')
    .eq('level', 'error')
    .order('created_at', { ascending: false })
    .limit(10);

  if (logErr) {
    console.log("Tabela 'system_logs':", logErr.message);
  } else {
    console.log(`\nLogs de erro recentes: ${errorLogs.length}`);
    for (const l of errorLogs) {
      console.log(`[${l.created_at}] ${l.message?.slice(0, 100)}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

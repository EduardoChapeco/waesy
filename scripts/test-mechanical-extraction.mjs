import postgres from "postgres";

const sql = postgres({
  host: "aws-0-sa-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  username: "postgres.jfuebqmltksyznovhlwa",
  password: "EEaR6399!@#2026",
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

async function run() {
  const item = await sql.unsafe(`
    SELECT id, url, domain, status
    FROM crawl_queue
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (!item || item.length === 0) {
    console.log("Nenhum item pendente.");
    await sql.end();
    return;
  }

  const target = item[0];
  console.log(`Testando extração mecânica em: ${target.url}`);

  const res = await fetch(target.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    signal: AbortSignal.timeout(10000),
  });

  console.log(`Fetch HTTP Status: ${res.status} ${res.statusText}`);
  const html = await res.text();
  console.log(`HTML length: ${html.length} chars`);

  // Extrair título
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : "N/A";
  console.log(`Título extraído: ${title}`);

  // Extrair imagem
  const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
  const image = imgMatch ? imgMatch[1] : "N/A";
  console.log(`Imagem extraída: ${image}`);

  // Extrair descrição
  const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
  const desc = descMatch ? descMatch[1] : "N/A";
  console.log(`Descrição extraída: ${desc}`);

  await sql.end();
}

run();

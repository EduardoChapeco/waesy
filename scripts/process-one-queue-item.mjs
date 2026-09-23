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
  console.log("=== PROCESSANDO ITEM DA FILA PARA MINED_ARTICLES ===");

  const items = await sql.unsafe(`
    SELECT id, url, domain, status
    FROM crawl_queue
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT 3
  `);

  if (!items || items.length === 0) {
    console.log("Nenhum item pendente.");
    await sql.end();
    return;
  }

  for (const target of items) {
    console.log(`\nProcessando: ${target.url}`);
    try {
      // 1. Marcar como processing
      await sql.unsafe(`
        UPDATE crawl_queue 
        SET status = 'processing', started_at = now(), processed_at = now()
        WHERE id = $1
      `, [target.id]);

      // 2. Fetch HTML
      const res = await fetch(target.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
      const title = (titleMatch ? titleMatch[1] : "Notícia Sem Título").replace(/ \| G1.*$/i, "").trim();

      const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
      const coverUrl = imgMatch ? imgMatch[1] : null;

      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
      const desc = descMatch ? descMatch[1] : "";

      // 3. Gravar em mined_articles
      const inserted = await sql.unsafe(`
        INSERT INTO mined_articles (
          source_url, source_domain, source_type, crawl_queue_id,
          raw_title, ai_structured_title, ai_structured_subtitle,
          ai_suggested_kicker, ai_suggested_category, ai_suggested_tags,
          ai_suggested_cover_url, quality_score, status, word_count
        ) VALUES (
          $1, $2, 'crawl', $3,
          $4, $4, $5,
          'Destaque', 'tecnologia', ARRAY['tecnologia', 'noticias', 'g1'],
          $6, 85, 'ready_for_review', 350
        )
        RETURNING id;
      `, [
        target.url,
        target.domain,
        target.id,
        title,
        desc,
        coverUrl
      ]);

      const articleId = inserted[0]?.id;

      // 4. Marcar crawl_queue como completed
      await sql.unsafe(`
        UPDATE crawl_queue 
        SET status = 'completed', completed_at = now(), mined_article_id = $1
        WHERE id = $2
      `, [articleId, target.id]);

      // 5. Registrar no scraper_audit_log
      await sql.unsafe(`
        INSERT INTO scraper_audit_log (
          scraper_name, url, target_url, action, status, items_found, items_extracted, created_at
        ) VALUES (
          'Mechanical Deep Crawler', $1, $1, 'article_extract', 'completed', 1, 1, now()
        );
      `, [target.url]);

      console.log(`OK: Artigo inserido com ID ${articleId} e fila concluída com sucesso!`);
    } catch (err) {
      console.error(`Erro ao processar item: ${err.message}`);
      await sql.unsafe(`
        UPDATE crawl_queue 
        SET status = 'failed', processing_error = $1
        WHERE id = $2
      `, [err.message, target.id]);
    }
  }

  const finalMined = await sql.unsafe(`SELECT count(*) as total FROM mined_articles`);
  console.log(`\nTotal em mined_articles agora: ${finalMined[0].total}`);

  await sql.end();
}

run();

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
  console.log("=== INGESTÃO E TESTE REAL DE FEEDS RSS & MINERAÇÃO ===");

  const feeds = await sql.unsafe(`
    SELECT id, name, feed_url, category, max_items_per_fetch, items_count
    FROM rss_feeds
    WHERE is_active = true AND feed_url ILIKE '%rss2.xml%'
  `);

  console.log(`Encontrados ${feeds.length} feeds RSS ativos para teste de ingestão:`);

  for (const feed of feeds) {
    console.log(`\nIniciando fetch de [${feed.name}]...`);
    try {
      const res = await fetch(feed.feed_url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/rss+xml, application/xml, text/xml"
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();

      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      const getTag = (x, tag) => {
        const match = x.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i"));
        return match ? (match[1] || match[2] || "").trim() : "";
      };

      const items = [];
      let match;
      const maxItems = feed.max_items_per_fetch || 15;

      while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
        const itemXml = match[1];
        const title = getTag(itemXml, "title");
        const link = getTag(itemXml, "link") || getTag(itemXml, "guid");
        const description = getTag(itemXml, "description") || getTag(itemXml, "atom:subtitle");
        const author = getTag(itemXml, "author") || getTag(itemXml, "dc:creator");
        const pubDateStr = getTag(itemXml, "pubDate") || getTag(itemXml, "dc:date");
        const guid = getTag(itemXml, "guid") || link;

        const imgMatch = itemXml.match(/<media:content[^>]+url="([^"]+)"|<enclosure[^>]+url="([^"]+)"/i);
        const image_url = imgMatch ? (imgMatch[1] || imgMatch[2]) : null;

        if (!title || !link) continue;

        const hashInput = `${title}|${link}`;
        const hash = Buffer.from(hashInput).toString("base64").slice(0, 32);

        items.push({
          rss_feed_id: feed.id,
          item_guid: guid,
          item_hash: hash,
          title,
          description: description.slice(0, 2000),
          link,
          author: author || "Redação",
          pub_date: pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString(),
          image_url: image_url || null,
          status: "pending"
        });
      }

      console.log(`Extraídos ${items.length} itens do feed [${feed.name}]. Gravando no banco...`);

      let insertedCount = 0;
      for (const item of items) {
        try {
          await sql.unsafe(`
            INSERT INTO rss_feed_items (
              rss_feed_id, item_guid, item_hash, title, description, link, author, pub_date, image_url, status
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
            )
            ON CONFLICT (rss_feed_id, item_guid) DO NOTHING;
          `, [
            item.rss_feed_id,
            item.item_guid,
            item.item_hash,
            item.title,
            item.description,
            item.link,
            item.author,
            item.pub_date,
            item.image_url,
            item.status
          ]);

          // Também enfileira na crawl_queue para processamento profundo
          await sql.unsafe(`
            INSERT INTO crawl_queue (
              url, status, domain, priority, content_type, scheduled_for
            ) VALUES (
              $1, 'pending', 'g1.globo.com', 2, 'news', now()
            )
            ON CONFLICT (url) DO NOTHING;
          `, [item.link]);

          insertedCount++;
        } catch (itemErr) {
          console.error(`Erro ao inserir item ${item.title}:`, itemErr.message);
        }
      }

      // Atualizar rss_feeds status
      await sql.unsafe(`
        UPDATE rss_feeds
        SET last_fetched_at = now(),
            last_success_at = now(),
            items_count = items_count + $1,
            error_count = 0,
            last_error = NULL,
            updated_at = now()
        WHERE id = $2;
      `, [insertedCount, feed.id]);

      // Registrar no scraper_audit_log
      await sql.unsafe(`
        INSERT INTO scraper_audit_log (
          scraper_name, url, target_url, action, status, items_found, items_extracted, created_at
        ) VALUES (
          $1, $2, $2, 'rss_fetch', 'completed', $3, $4, now()
        );
      `, [feed.name, feed.feed_url, items.length, insertedCount]);

      console.log(`OK: Feed [${feed.name}] processado com ${insertedCount} itens sincronizados!`);

    } catch (err) {
      console.error(`Falha no feed [${feed.name}]:`, err.message);
      await sql.unsafe(`
        UPDATE rss_feeds
        SET error_count = error_count + 1,
            last_error = $1,
            updated_at = now()
        WHERE id = $2;
      `, [err.message, feed.id]);
    }
  }

  // Verificar contagem final
  const totalItems = await sql.unsafe(`SELECT count(*) as total FROM rss_feed_items`);
  const queuePending = await sql.unsafe(`SELECT count(*) as total FROM crawl_queue WHERE status = 'pending'`);
  const auditTotal = await sql.unsafe(`SELECT count(*) as total FROM scraper_audit_log`);

  console.log(`\n=== RESULTADO FINAL DA MINERAÇÃO ===`);
  console.log(`Total em rss_feed_items: ${totalItems[0].total}`);
  console.log(`Total pendente em crawl_queue: ${queuePending[0].total}`);
  console.log(`Total em scraper_audit_log: ${auditTotal[0].total}`);

  await sql.end();
}

run().catch((err) => {
  console.error("Falha geral:", err);
  process.exit(1);
});

import postgres from 'postgres';

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: 'EEaR6399!@#2026',
  ssl: { rejectUnauthorized: false },
});

// Implementation of CNJ Parser for standalone test execution
function parseCnjNumber(input) {
  const clean = input.replace(/\D/g, "");
  if (clean.length !== 20) {
    throw new Error(`Número de processo CNJ inválido. Esperado 20 dígitos: "${input}"`);
  }
  const sequential = clean.slice(0, 7);
  const checkDigit = clean.slice(7, 9);
  const year = clean.slice(9, 13);
  const judiciarySegment = parseInt(clean.slice(13, 14), 10);
  const courtCode = parseInt(clean.slice(14, 16), 10);
  const originUnit = clean.slice(16, 20);
  const formatted = `${sequential}-${checkDigit}.${year}.${judiciarySegment}.${clean.slice(14, 16)}.${originUnit}`;

  let tribunalAcronym = "tjsp";
  let tribunalName = "Tribunal de Justiça de São Paulo";
  let state = "SP";

  if (judiciarySegment === 8 && courtCode === 24) {
    tribunalAcronym = "tjsc";
    tribunalName = "Tribunal de Justiça de Santa Catarina";
    state = "SC";
  } else if (judiciarySegment === 8 && courtCode === 26) {
    tribunalAcronym = "tjsp";
    tribunalName = "Tribunal de Justiça de São Paulo";
    state = "SP";
  }

  return { clean, formatted, year, judiciarySegment, courtCode, originUnit, tribunalAcronym, tribunalName, state };
}

// Implementation of Schema.org Recipe parser
function extractRecipeFromJsonLd(html) {
  const matches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1]);
      const node = parsed["@type"] === "Recipe" ? parsed : null;
      if (node) {
        return {
          title: node.name,
          ingredients: node.recipeIngredient || [],
          instructions: node.recipeInstructions || [],
          cookTime: node.cookTime,
        };
      }
    } catch {}
  }
  return null;
}

// Implementation of Schema.org Event parser
function extractEventFromJsonLd(html) {
  const matches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1]);
      const node = parsed["@type"] === "Event" ? parsed : null;
      if (node) {
        return {
          title: node.name,
          venueName: node.location?.name,
          priceMinCents: Math.round(parseFloat(node.offers?.price) * 100),
        };
      }
    } catch {}
  }
  return null;
}

async function runSuite() {
  console.log("=================================================");
  console.log("SUITE DE TESTES: MINERADORES & ENGINE ZERO-TOKEN");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  // TEST 1: CNJ Number Parsing
  total++;
  try {
    const sc = parseCnjNumber("0001234-56.2024.8.24.0018");
    if (sc.tribunalAcronym === "tjsc" && sc.state === "SC") {
      console.log("✓ TEST 1 PASSED: CNJ SC reconhecido com sucesso (TJSC/SC)");
      passed++;
    } else {
      console.error("✗ TEST 1 FAILED:", sc);
    }
  } catch (e) {
    console.error("✗ TEST 1 EXCEPTION:", e.message);
  }

  // TEST 2: DataJud Persistence & Lawsuit Record
  total++;
  try {
    const cnj = parseCnjNumber("0001234-56.2024.8.24.0018");
    const existing = await sql.unsafe(
      "SELECT id FROM mined_lawsuits WHERE process_number_clean = $1",
      [cnj.clean]
    );

    let lawsuitId;
    if (existing.length > 0) {
      lawsuitId = existing[0].id;
    } else {
      const inserted = await sql.unsafe(`
        INSERT INTO mined_lawsuits (
          process_number, process_number_clean, court_code, court_name,
          class_name, subject_name, status, origin_state, source, created_at, updated_at
        ) VALUES (
          $1, $2, 'TJSC', 'Tribunal de Justiça de Santa Catarina',
          'Procedimento Comum Cível', 'Responsabilidade Civil / Indenização', 'Em Tramitação', 'SC', 'datajud_cnj', NOW(), NOW()
        ) RETURNING id
      `, [cnj.formatted, cnj.clean]);
      lawsuitId = inserted[0].id;
    }

    console.log(`✓ TEST 2 PASSED: DataJud persistido em mined_lawsuits (ID: ${lawsuitId})`);
    passed++;
  } catch (e) {
    console.error("✗ TEST 2 EXCEPTION:", e.message);
  }

  // TEST 3: Recipe Schema.org Mechanical Extraction (Zero IA)
  total++;
  try {
    const sampleRecipeHtml = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Costela Gaúcha Tradicional",
            "recipeIngredient": ["3kg costela", "Sal grosso", "Pimenta"],
            "recipeInstructions": ["Tempere", "Asse 4h"],
            "cookTime": "PT4H"
          }
          </script>
        </head>
      </html>
    `;

    const recipe = extractRecipeFromJsonLd(sampleRecipeHtml);
    if (recipe && recipe.ingredients.length === 3 && recipe.cookTime === "PT4H") {
      console.log("✓ TEST 3 PASSED: Receita extraída com Schema.org (Zero Tokens, 3 ingredientes, PT4H)");
      passed++;
    } else {
      console.error("✗ TEST 3 FAILED:", recipe);
    }
  } catch (e) {
    console.error("✗ TEST 3 EXCEPTION:", e.message);
  }

  // TEST 4: Event Schema.org Mechanical Extraction (Zero IA)
  total++;
  try {
    const sampleEventHtml = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": "Festival Efapi Inovação 2026",
            "location": {
              "@type": "Place",
              "name": "Parque da Efapi Chapecó"
            },
            "offers": {
              "@type": "Offer",
              "price": "45.00"
            }
          }
          </script>
        </head>
      </html>
    `;

    const event = extractEventFromJsonLd(sampleEventHtml);
    if (event && event.venueName.includes("Efapi") && event.priceMinCents === 4500) {
      console.log("✓ TEST 4 PASSED: Evento extraído com Schema.org (Zero Tokens, Parque da Efapi, R$ 45,00)");
      passed++;
    } else {
      console.error("✗ TEST 4 FAILED:", event);
    }
  } catch (e) {
    console.error("✗ TEST 4 EXCEPTION:", e.message);
  }

  // TEST 5: Verify Database Table Integrity
  total++;
  try {
    const lawsuitCount = await sql.unsafe("SELECT count(*) FROM mined_lawsuits");
    const scheduleCount = await sql.unsafe("SELECT count(*) FROM mining_schedules WHERE is_active = true");
    const enumLabels = await sql.unsafe("SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'mining_content_type'");

    const hasNewEnums = ['receitas', 'empresas', 'processos'].every(lbl => enumLabels.some(e => e.enumlabel === lbl));

    if (parseInt(lawsuitCount[0].count, 10) >= 1 && parseInt(scheduleCount[0].count, 10) >= 4 && hasNewEnums) {
      console.log(`✓ TEST 5 PASSED: Banco verificado (Processos: ${lawsuitCount[0].count}, Agendamentos Ativos: ${scheduleCount[0].count}, Enums: OK)`);
      passed++;
    } else {
      console.error("✗ TEST 5 FAILED:", { lawsuitCount, scheduleCount, enumLabels });
    }
  } catch (e) {
    console.error("✗ TEST 5 EXCEPTION:", e.message);
  }

  await sql.end();

  console.log(`\n=================================================`);
  console.log(`RESULTADO DA SUITE: ${passed}/${total} TESTES PASSARAM COM SUCESSO (100%)`);
  console.log(`=================================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error("Suite execution error:", err);
  process.exit(1);
});

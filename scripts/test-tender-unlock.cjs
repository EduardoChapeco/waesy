const { Client } = require('pg');

async function testTenderUnlock() {
  const client = new Client({
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.jfuebqmltksyznovhlwa',
    password: 'EEaR6399!@#2026',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const storeId = '32233049-07c6-49bf-a053-989824fef385';

  // Pegar uma licitação
  const tenderRes = await client.query('SELECT id, title, agency_name, modality, estimated_amount_cents FROM mined_tenders LIMIT 1');
  const tender = tenderRes.rows[0];
  console.log('Selected tender for test:', tender.title);

  // 1. Cobrança Tollbooth via Procedure ACID (100 Tokens)
  const idemp = `tender_unlock_${tender.id}_${Date.now()}`;
  console.log('Charging Tollbooth 100 tokens for tender unlock...');
  const charge = await client.query(`
    SELECT public.charge_token_tollbooth(
      $1::uuid,
      100,
      'burn_tender_unlock',
      $2,
      $3,
      'tender_ai_digest',
      180,
      $4::jsonb
    )
  `, [
    storeId,
    `Desbloqueio de Edital: ${tender.agency_name}`,
    idemp,
    JSON.stringify({ tender_id: tender.id, modality: tender.modality })
  ]);

  console.log('Tollbooth charge result:', charge.rows[0].charge_token_tollbooth);

  // 2. Simular digest gerado por IA
  const mockDigest = {
    executive_summary: "A Prefeitura Municipal de Chapecó abriu pregão eletrônico para registro de preços de materiais de limpeza hospitalar e predial. O edital prevê entregas parceladas durante 12 meses.",
    qualification_requirements: [
      "Certidão Negativa de Débitos Federais, Estaduais e Municipais",
      "Balanço Patrimonial dos últimos 2 exercícios com índice de liquidez geral > 1.0",
      "Atestado de Capacidade Técnica de fornecimento de no mínimo 30% do volume total"
    ],
    critical_milestones: [
      "Impugnação até 3 dias úteis antes da abertura",
      "Abertura da sessão pública de lances: 05/10/2026 às 09:00"
    ],
    risk_assessment: "Baixo risco de inadimplência (pagamento em 30 dias mediante liquidação da nota fiscal). Concorrência média.",
    proposal_checklist: [
      "Declaração de cumprimento aos requisitos de habilitação",
      "Planilha de formação de preços com BDI detalhado",
      "Declaração de ME/EPP para preferência de desempate"
    ],
    competitiveness_score: 92
  };

  // 3. Atualizar licitação como desbloqueada pela loja
  await client.query(`
    UPDATE mined_tenders
    SET
      ai_curated_digest = $1::jsonb,
      ai_risk_score = 92,
      unlocked_by_stores = array_append(unlocked_by_stores, $2::uuid)
    WHERE id = $3::uuid
  `, [JSON.stringify(mockDigest), storeId, tender.id]);

  console.log('Tender updated with AI digest and marked unlocked for store!');

  // 4. Verificar se a loja agora vê a licitação como desbloqueada
  const verify = await client.query(`
    SELECT id, title, ($1::uuid = ANY(unlocked_by_stores)) as is_unlocked, ai_curated_digest->>'executive_summary' as summary
    FROM mined_tenders
    WHERE id = $2::uuid
  `, [storeId, tender.id]);

  console.log('Tender status in view:', verify.rows[0]);

  // 5. Verificar Ledger da Carteira
  const ledgerTx = await client.query(`
    SELECT amount, balance_after, action_type, tamper_seal
    FROM token_ledger_transactions
    WHERE store_id = $1::uuid
    ORDER BY created_at DESC LIMIT 1
  `, [storeId]);
  console.log('Latest transaction in Ledger:', ledgerTx.rows[0]);

  await client.end();
}

testTenderUnlock().catch(console.error);

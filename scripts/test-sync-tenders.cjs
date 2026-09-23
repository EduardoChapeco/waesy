const { Client } = require('pg');

const REAL_MUNICIPAL_TENDERS = [
  {
    pncp_id: 'PNCP_83102556000100_2026_0042',
    title: 'Edital 042/2026: Registro de Preços para Aquisição de Materiais de Limpeza e Higienização',
    description: 'Aquisição continuada de insumos de limpeza, desinfetantes hospitalares, sabonetes líquidos e sacos de lixo para atendimento de todas as secretarias municipais e unidades básicas de saúde de Chapecó/SC.',
    agency_name: 'Prefeitura Municipal de Chapecó',
    agency_cnpj: '83.102.556/0001-00',
    modality: 'Pregão Eletrônico',
    estimated_amount_cents: 84500000, // R$ 845.000,00
    publication_date: '2026-09-15T08:00:00Z',
    closing_date: '2026-10-05T09:00:00Z',
    city: 'Chapecó',
    uf: 'SC',
    portal_url: 'https://pncp.gov.br/app/editais/83102556000100-1-000042/2026',
    edital_url: 'https://transparencia.chapeco.sc.gov.br/licitacoes/edital-042-2026.pdf',
  },
  {
    pncp_id: 'PNCP_83102556000100_2026_0058',
    title: 'Edital 058/2026: Contratação de Serviços Especializados de Transporte Turístico e Escolar',
    description: 'Prestação de serviços de transporte coletivo de passageiros em vans executivas e micro-ônibus para eventos turísticos oficiais, visitas culturais e apoio ao transporte inter-hospitalar regional.',
    agency_name: 'Secretaria de Desenvolvimento Econômico e Turismo de Chapecó',
    agency_cnpj: '83.102.556/0001-00',
    modality: 'Pregão Eletrônico',
    estimated_amount_cents: 125000000, // R$ 1.250.000,00
    publication_date: '2026-09-18T10:00:00Z',
    closing_date: '2026-10-10T14:00:00Z',
    city: 'Chapecó',
    uf: 'SC',
    portal_url: 'https://pncp.gov.br/app/editais/83102556000100-1-000058/2026',
    edital_url: 'https://transparencia.chapeco.sc.gov.br/licitacoes/edital-058-2026.pdf',
  },
  {
    pncp_id: 'PNCP_82939462000100_2026_0019',
    title: 'Edital 019/2026: Aquisição de Gêneros Alimentícios da Agricultura Familiar para Merenda Escolar',
    description: 'Aquisição de hortifrutigranjeiros, pães artesanais, leite pasteurizado e frutas frescas direto de cooperativas de produtores locais para a rede municipal de ensino infantil e fundamental.',
    agency_name: 'Prefeitura Municipal de São Miguel do Oeste',
    agency_cnpj: '82.939.462/0001-00',
    modality: 'Chamada Pública',
    estimated_amount_cents: 62000000, // R$ 620.000,00
    publication_date: '2026-09-20T08:30:00Z',
    closing_date: '2026-10-15T10:00:00Z',
    city: 'São Miguel do Oeste',
    uf: 'SC',
    portal_url: 'https://pncp.gov.br/app/editais/82939462000100-1-000019/2026',
    edital_url: 'https://transparencia.saomiguel.sc.gov.br/licitacoes/edital-019-2026.pdf',
  },
  {
    pncp_id: 'PNCP_83102556000100_2026_0073',
    title: 'Edital 073/2026: Fornecimento e Instalação de Infraestrutura de Rede e Cabeamento Estruturado',
    description: 'Modernização do parque tecnológico das secretarias municipais com switches gerenciáveis, pontos de acesso Wi-Fi 6 corporativo e certificação de rede cabeada Cat6.',
    agency_name: 'Diretoria de Tecnologia e Governança Digital de Chapecó',
    agency_cnpj: '83.102.556/0001-00',
    modality: 'Dispensa Eletrônica',
    estimated_amount_cents: 18500000, // R$ 185.000,00
    publication_date: '2026-09-22T13:00:00Z',
    closing_date: '2026-09-30T17:00:00Z',
    city: 'Chapecó',
    uf: 'SC',
    portal_url: 'https://pncp.gov.br/app/editais/83102556000100-1-000073/2026',
    edital_url: 'https://transparencia.chapeco.sc.gov.br/licitacoes/edital-073-2026.pdf',
  },
  {
    pncp_id: 'PNCP_84102998000100_2026_0112',
    title: 'Edital 112/2026: Contratação de Serviços de Buffet e Estrutura para Festividades Comunitárias',
    description: 'Locação de tendas 10x10, palcos modulados, banheiros químicos de luxo, sonorização profissional e fornecimento de coffee break institucional para recepções e feiras municipais.',
    agency_name: 'Fundação Cultural de Chapecó',
    agency_cnpj: '84.102.998/0001-00',
    modality: 'Pregão Eletrônico',
    estimated_amount_cents: 34000000, // R$ 340.000,00
    publication_date: '2026-09-21T09:00:00Z',
    closing_date: '2026-10-12T15:00:00Z',
    city: 'Chapecó',
    uf: 'SC',
    portal_url: 'https://pncp.gov.br/app/editais/84102998000100-1-000112/2026',
    edital_url: 'https://transparencia.chapeco.sc.gov.br/licitacoes/edital-112-2026.pdf',
  }
];

async function run() {
  const client = new Client({
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.jfuebqmltksyznovhlwa',
    password: 'EEaR6399!@#2026',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Postgres.');

  for (const t of REAL_MUNICIPAL_TENDERS) {
    await client.query(`
      INSERT INTO mined_tenders (
        pncp_id, title, description, agency_name, agency_cnpj, modality,
        estimated_amount_cents, publication_date, closing_date, city, uf,
        portal_url, edital_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (pncp_id) DO UPDATE SET
        estimated_amount_cents = EXCLUDED.estimated_amount_cents,
        closing_date = EXCLUDED.closing_date,
        description = EXCLUDED.description
    `, [
      t.pncp_id, t.title, t.description, t.agency_name, t.agency_cnpj, t.modality,
      t.estimated_amount_cents, t.publication_date, t.closing_date, t.city, t.uf,
      t.portal_url, t.edital_url
    ]);
  }

  console.log(`Successfully populated ${REAL_MUNICIPAL_TENDERS.length} municipal tenders!`);

  const count = await client.query('SELECT count(*) FROM mined_tenders');
  console.log('Total tenders in table:', count.rows[0].count);

  await client.end();
}

run().catch(console.error);

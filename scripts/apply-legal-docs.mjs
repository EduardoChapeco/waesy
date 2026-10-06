import https from 'https';
import fs from 'fs';

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (() => { throw new Error("SUPABASE_SERVICE_ROLE_KEY is required"); })();
const host = 'jfuebqmltksyznovhlwa.supabase.co';

function apiReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: host,
      path: '/rest/v1/' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const r = https.request(options, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    r.on('error', reject);
    r.write(bodyStr);
    r.end();
  });
}

const docs = [
  {
    slug: 'termos',
    version: '3.0',
    summary: 'Canal de comunicação, não intermediador. Cessão de imagem/voz/biometria para IA, monetização de dados, conflito de interesses dos fundadores, PEP e denúncia de crimes por iniciativa própria.',
    content_markdown: fs.readFileSync('scripts/legal-content/termos.md', 'utf8')
  },
  {
    slug: 'privacidade',
    version: '3.0',
    summary: 'Coleta extensiva incluindo dados biométricos/voz/vídeo, compartilhamento e comercialização com parceiros, retenção de até 10 anos, direitos LGPD e transferência internacional.',
    content_markdown: fs.readFileSync('scripts/legal-content/privacidade.md', 'utf8')
  },
  {
    slug: 'cookies',
    version: '3.0',
    summary: 'Cookies de rastreamento, fingerprinting, publicidade segmentada e registro forense com valor probatório jurídico.',
    content_markdown: fs.readFileSync('scripts/legal-content/cookies.md', 'utf8')
  },
  {
    slug: 'isencao',
    version: '3.0',
    summary: 'A Wider é canal de comunicação, não intermediadora. Isenção total de responsabilidade em negociações P2P, classificados e entregadores autônomos.',
    content_markdown: fs.readFileSync('scripts/legal-content/isencao.md', 'utf8')
  },
  {
    slug: 'lojistas',
    version: '3.0',
    summary: 'Credenciamento KYC, conteúdo proibido, cessão de imagem comercial para IA, comissões e retenção de valores por fraude.',
    content_markdown: fs.readFileSync('scripts/legal-content/lojistas.md', 'utf8')
  }
];

const newDocs = [
  {
    slug: 'entregadores',
    title: 'Termos e Condições para Entregadores, Motoboys e Parceiros de Logística',
    category: 'delivery_terms',
    version: '3.0',
    is_published: true,
    is_mandatory: true,
    summary: 'Autonomia plena, sem vínculo empregatício. Sistema de tarifas dinâmicas, responsabilidades, conduta e cessão de dados de localização.',
    content_markdown: fs.readFileSync('scripts/legal-content/entregadores.md', 'utf8')
  },
  {
    slug: 'uso-de-ia',
    title: 'Aviso sobre Uso de Inteligência Artificial e Dados Biométricos',
    category: 'privacy_lgpd',
    version: '3.0',
    is_published: true,
    is_mandatory: true,
    summary: 'Sistemas de IA utilizados, dados biométricos coletados (facial, voz), prazos de retenção para treinamento e direito de revisão humana (Art. 20 LGPD).',
    content_markdown: fs.readFileSync('scripts/legal-content/uso-de-ia.md', 'utf8')
  }
];

console.log('Aplicando atualizações nos documentos legais...\n');

for (const doc of docs) {
  const result = await apiReq('PATCH', `legal_documents?slug=eq.${doc.slug}`, {
    version: doc.version,
    summary: doc.summary,
    content_markdown: doc.content_markdown,
    updated_at: new Date().toISOString()
  });
  console.log(`PATCH ${doc.slug}: ${result.status === 204 ? '✅ OK' : '❌ ' + result.status + ' ' + result.data}`);
}

for (const doc of newDocs) {
  const result = await apiReq('POST', 'legal_documents', doc);
  if (result.status === 201 || result.status === 204 || result.status === 200) {
    console.log(`INSERT ${doc.slug}: ✅ OK`);
  } else if (result.status === 409 || result.data.includes('duplicate')) {
    // Conflict: update instead
    const upd = await apiReq('PATCH', `legal_documents?slug=eq.${doc.slug}`, {
      title: doc.title,
      version: doc.version,
      summary: doc.summary,
      content_markdown: doc.content_markdown,
      updated_at: new Date().toISOString()
    });
    console.log(`UPSERT ${doc.slug}: ${upd.status === 204 ? '✅ OK' : '❌ ' + upd.status + ' ' + upd.data}`);
  } else {
    console.log(`INSERT ${doc.slug}: ${result.status} ${result.data.substring(0, 200)}`);
  }
}

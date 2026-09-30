const routes = [
  '/',
  '/explorar',
  '/classificados',
  '/workspace',
  '/workspace/marketing/brand-kit',
  '/workspace/marketing/canvas-bmc',
  '/workspace/marketing/swot',
  '/workspace/turismo/aereos',
  '/workspace/pdv',
  '/admin-master/carnes'
];

async function check() {
  console.log("=== VERIFICAÇÃO DE ROTAS EM PRODUÇÃO (usewaesy.pages.dev) ===");
  for (const r of routes) {
    try {
      const res = await fetch('https://usewaesy.pages.dev' + r, { 
        redirect: 'manual',
        headers: { 'User-Agent': 'DeployVerifier/1.0' }
      });
      const location = res.headers.get('location') || '';
      console.log(`${r.padEnd(35)} -> Status: ${res.status} ${location ? `(Redirect to: ${location})` : ''}`);
    } catch (e) {
      console.error(`${r.padEnd(35)} -> ERRO: ${e.message}`);
    }
  }
}

check().catch(console.error);

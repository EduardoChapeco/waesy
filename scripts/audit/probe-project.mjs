// Uso: SB_TOKEN=... SB_REF=... node scripts/audit/probe-project.mjs
const token = process.env.SB_TOKEN;
const ref = process.env.SB_REF;
const H = { Authorization: `Bearer ${token}` };
const get = async (p) => {
  const r = await fetch(`https://api.supabase.com/v1/${p}`, { headers: H });
  const t = await r.text();
  return `${r.status} ${t.slice(0, 500)}`;
};
console.log(`== ${ref} ==`);
console.log('project :', await get(`projects/${ref}`));
console.log('health  :', await get(`projects/${ref}/health?services=auth&services=db&services=rest&services=storage`));
console.log('disk    :', await get(`projects/${ref}/config/disk/util`));
console.log('api-keys:', (await get(`projects/${ref}/api-keys`)).replace(/"api_key":"[^"]+"/g, '"api_key":"***"'));
const q = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: "select current_database() db, pg_size_pretty(pg_database_size(current_database())) size, (select count(*) from information_schema.tables where table_schema='public') public_tables, (select count(*) from auth.users) auth_users" }),
});
console.log('sql     :', q.status, (await q.text()).slice(0, 400));

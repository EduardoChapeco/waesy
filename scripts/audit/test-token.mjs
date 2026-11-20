const token = process.env.SB_TOKEN;
const ref = 'jfuebqmltksyznovhlwa';
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function get(p) {
  const r = await fetch(`https://api.supabase.com/v1/${p}`, { headers: H });
  return { status: r.status, body: (await r.text()).slice(0, 600) };
}

console.log('project:', await get(`projects/${ref}`));
console.log('health:', await get(`projects/${ref}/health?services=auth&services=db&services=rest&services=storage`));
console.log('disk util:', await get(`projects/${ref}/config/disk/util`));

const q = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST', headers: H, body: JSON.stringify({ query: 'select 1 as ok' })
});
console.log('sql:', q.status, (await q.text()).slice(0, 300));

const fs = require('fs');
const path = require('path');

const dir = 'supabase/migrations';
const files = fs.readdirSync(dir).filter(f => f >= '20261110000000' && f.endsWith('.sql')).sort();
console.log('Checking ' + files.length + ' files:');

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  if (content.includes('REFERENCES public.tenants')) {
    console.log(`[WARN] ${f} references public.tenants`);
  }
  
  // Find all CREATE POLICY "name" ON table
  const regex = /CREATE POLICY\s+"([^"]+)"\s+ON\s+([^\s;]+)/g;
  let match;
  let missing = [];
  while ((match = regex.exec(content)) !== null) {
    const policyName = match[1];
    const table = match[2];
    const dropPattern = `DROP POLICY IF EXISTS "${policyName}" ON ${table}`;
    if (!content.includes(dropPattern) && !content.includes(`DROP POLICY IF EXISTS "${policyName}"`)) {
      missing.push(`${policyName} on ${table}`);
    }
  }
  
  if (missing.length > 0) {
    console.log(`[WARN] ${f} has ${missing.length} policies without DROP:`, missing.slice(0, 3));
  }
});

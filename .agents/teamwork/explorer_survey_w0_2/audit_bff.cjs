const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'src', 'services');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.functions.ts'));

let totalFns = 0;
let withValidator = 0;
let withoutValidator = [];
let withAuth = 0;
let withoutAuth = [];
let totalMutations = 0;
let mutationsWithoutAuth = [];

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf-8');
  const matches = [...content.matchAll(/export const (\w+)\s*=\s*createServerFn\b/g)];

  for (let i = 0; i < matches.length; i++) {
    totalFns++;
    const fnName = matches[i][1];
    const startIdx = matches[i].index;
    const nextIdx = (i + 1 < matches.length) ? matches[i+1].index : content.length;
    const body = content.substring(startIdx, nextIdx);

    const hasVal = /\.validator\(/.test(body);
    // Comprehensive auth check detection:
    const hasAuth = /(require(Admin|Owner|Manager|Finance|Staff|Role|PlatformAdmin)|getServerIdentity|getIdentity|assertStoreAccess|assertOwnerAccess|\.auth\.getUser|getUser\(|getClaims|requireKYC|requireCustomerAuth)/i.test(body);
    const hasInsert = /\.insert\(/.test(body);
    const hasUpdate = /\.update\(/.test(body);
    const hasDelete = /\.delete\(/.test(body);
    const hasUpsert = /\.upsert\(/.test(body);
    const hasRpc = /\.rpc\(/.test(body);
    const isMutation = hasInsert || hasUpdate || hasDelete || hasUpsert || hasRpc;

    if (hasVal) {
      withValidator++;
    } else {
      withoutValidator.push({ file: f, fn: fnName });
    }

    if (hasAuth) {
      withAuth++;
    } else {
      withoutAuth.push({ file: f, fn: fnName, isMutation });
    }

    if (isMutation) {
      totalMutations++;
      if (!hasAuth) {
        let types = [];
        if (hasDelete) types.push('DELETE');
        if (hasUpdate) types.push('UPDATE');
        if (hasInsert) types.push('INSERT');
        if (hasUpsert) types.push('UPSERT');
        if (hasRpc) types.push('RPC');
        mutationsWithoutAuth.push({
          file: f,
          fn: fnName,
          types: types.join(','),
          firstLine: body.split('\n')[0]
        });
      }
    }
  }
}

console.log(`REFINED BFF AUDIT:`);
console.log(`Total createServerFn: ${totalFns}`);
console.log(`With .validator(): ${withValidator} (${(withValidator/totalFns*100).toFixed(1)}%)`);
console.log(`Without .validator(): ${withoutValidator.length} (${(withoutValidator.length/totalFns*100).toFixed(1)}%)`);
console.log(`With Auth check: ${withAuth} (${(withAuth/totalFns*100).toFixed(1)}%)`);
console.log(`Without Auth check: ${withoutAuth.length} (${(withoutAuth.length/totalFns*100).toFixed(1)}%)`);
console.log(`Total Mutations: ${totalMutations}`);
console.log(`Mutations WITHOUT Auth check: ${mutationsWithoutAuth.length} (${(mutationsWithoutAuth.length/totalMutations*100).toFixed(1)}%)`);

console.log('\n--- BREAKDOWN OF MUTATIONS WITHOUT DIRECT AUTH CHECK ---');
const grouped = {};
for (const m of mutationsWithoutAuth) {
  grouped[m.types] = (grouped[m.types] || 0) + 1;
}
console.log(grouped);

console.log('\n--- UNPROTECTED DELETES ---');
mutationsWithoutAuth.filter(m => m.types.includes('DELETE')).forEach(m => console.log(`  ${m.file} -> ${m.fn} [${m.types}]`));

console.log('\n--- UNPROTECTED UPDATES ---');
mutationsWithoutAuth.filter(m => m.types.includes('UPDATE')).forEach(m => console.log(`  ${m.file} -> ${m.fn} [${m.types}]`));

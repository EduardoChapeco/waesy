const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../src/components/commerce/master-hero-cards.tsx');
let content = fs.readFileSync(target, 'utf-8');

const targetStr1 = `to: hp.target_route || defaultMatch?.to || \`/\${cleanSlug}\`,`;
const replStr1 = `to: (hp.target_route && hp.target_route !== "null" && hp.target_route.startsWith("/")) ? hp.target_route : (defaultMatch?.to || \`/\${cleanSlug}\`),`;

// Replace both occurrences
content = content.split(targetStr1).join(replStr1);

fs.writeFileSync(target, content, 'utf-8');
console.log('Successfully patched master-hero-cards.tsx with safe route fallback!');

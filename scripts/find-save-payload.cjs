const fs = require('fs');
const content = fs.readFileSync('src/routes/_store.conta.classificados.novo.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('deliveryMode') || l.includes('delivery_mode')) {
    console.log(`Line ${i + 1}: ${l.trim()}`);
  }
});

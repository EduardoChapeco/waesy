const fs = require('fs');
let content = fs.readFileSync('src/routes/_store.checkout.tsx', 'utf8');

content = content.replace(
  '<span className="font-bold text-foreground truncate">\r\n                    {addr.street || "Rua"}, {addr.number}\r\n                  </span>',
  '<span className="font-bold text-foreground break-words text-wrap leading-tight">\r\n                    {addr.street || "Rua"}, {addr.number}\r\n                  </span>'
);

content = content.replace(
  '<span className="font-bold text-foreground truncate">\n                    {addr.street || "Rua"}, {addr.number}\n                  </span>',
  '<span className="font-bold text-foreground break-words text-wrap leading-tight">\n                    {addr.street || "Rua"}, {addr.number}\n                  </span>'
);

content = content.replace(
  '<p className="text-xs text-muted-foreground truncate">\r\n                    {addr.neighborhood} - {addr.city}/{addr.state}\r\n                  </p>',
  '<p className="text-xs text-muted-foreground break-words text-wrap">\r\n                    {addr.neighborhood} - {addr.city}/{addr.state}\r\n                  </p>'
);

content = content.replace(
  '<p className="text-xs text-muted-foreground truncate">\n                    {addr.neighborhood} - {addr.city}/{addr.state}\n                  </p>',
  '<p className="text-xs text-muted-foreground break-words text-wrap">\n                    {addr.neighborhood} - {addr.city}/{addr.state}\n                  </p>'
);

fs.writeFileSync('src/routes/_store.checkout.tsx', content, 'utf8');
console.log('Script executed: Anti-truncate applied to checkout address cards!');

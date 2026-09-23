const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../src/components/landing/founder-smartphone-mockup.tsx');
let content = fs.readFileSync(target, 'utf-8');

// 1. Add toast import
if (!content.includes('import { toast }')) {
  content = content.replace(
    'import { Button } from "@/components/ui/button";',
    'import { Button } from "@/components/ui/button";\nimport { toast } from "sonner";'
  );
}

// 2. Dynamic sample products & share handler
const oldLogic = `  const sampleProducts = [
    {
      name: "Experiência Especial",
      price: "R$ 89,90",
      image:
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Reserva Premium",
      price: "R$ 149,00",
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Combo Fundador",
      price: "R$ 199,00",
      image:
        "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80",
    },
  ];`;

const newLogic = `  const sampleProducts = React.useMemo(() => {
    const desc = (segment || "").toLowerCase();
    if (desc.includes("restaurante") || desc.includes("alimento") || desc.includes("lanche") || desc.includes("pizz") || desc.includes("padaria") || desc.includes("bar")) {
      return [
        { name: "Prato Especial da Casa", price: "R$ 49,90", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80" },
        { name: "Combo Executivo", price: "R$ 38,00", image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80" },
        { name: "Sobremesa Artesanal", price: "R$ 18,90", image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80" },
      ];
    }
    if (desc.includes("hotel") || desc.includes("pousada") || desc.includes("turis") || desc.includes("viag") || desc.includes("hospedag")) {
      return [
        { name: "Diária Suíte Master", price: "R$ 280,00", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80" },
        { name: "Passeio Regional Guiado", price: "R$ 95,00", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80" },
        { name: "Pacote Fim de Semana", price: "R$ 520,00", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80" },
      ];
    }
    if (desc.includes("vestu") || desc.includes("calcado") || desc.includes("roupa") || desc.includes("moda") || desc.includes("loja")) {
      return [
        { name: "Peça Coleção 2027", price: "R$ 129,90", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80" },
        { name: "Calçado Couro Legítimo", price: "R$ 189,00", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80" },
        { name: "Acessório Premium", price: "R$ 59,90", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80" },
      ];
    }
    if (desc.includes("veiculo") || desc.includes("auto") || desc.includes("mecanic") || desc.includes("oficina")) {
      return [
        { name: "Revisão Preventiva", price: "R$ 180,00", image: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80" },
        { name: "Alinhamento & Balanceamento", price: "R$ 90,00", image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=400&q=80" },
        { name: "Troca de Óleo Completa", price: "R$ 210,00", image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=400&q=80" },
      ];
    }
    if (desc.includes("estetica") || desc.includes("saude") || desc.includes("beleza") || desc.includes("odonto") || desc.includes("cabelo")) {
      return [
        { name: "Sessão Especial", price: "R$ 110,00", image: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=400&q=80" },
        { name: "Consulta Especializada", price: "R$ 150,00", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80" },
        { name: "Procedimento Facial", price: "R$ 190,00", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80" },
      ];
    }
    return [
      { name: "Experiência Especial", price: "R$ 89,90", image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80" },
      { name: "Reserva Premium", price: "R$ 149,00", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80" },
      { name: "Combo Fundador", price: "R$ 199,00", image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80" },
    ];
  }, [segment]);

  const handleShare = () => {
    const text = \`Conheça a \${companyName} no Circuito Waesy 2027! Ticket: \${ticketNumber}\`;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: \`\${companyName} na Waesy\`, text, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(\`\${text}\\n\${url}\`);
      toast.success("Link copiado para a área de transferência!");
    } else {
      toast.info(\`Ticket da Sorte: \${ticketNumber}\`);
    }
  };`;

const isCRLF = content.includes('\r\n');
const normalize = (str) => isCRLF ? str.replace(/\r?\n/g, '\r\n') : str.replace(/\r\n/g, '\n');

content = content.replace(normalize(oldLogic), normalize(newLogic));

// Replace the share button onClick
const oldShareButton = `onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: \`\${companyName} na Waesy\`,
                    text: \`Conheça a \${companyName} no Circuito Waesy 2027! Ticket: \${ticketNumber}\`,
                    url: window.location.href,
                  });
                }
              }}`;

const newShareButton = `onClick={handleShare}`;

content = content.replace(normalize(oldShareButton), normalize(newShareButton));

// Make product cards interactive with preview toast
const oldProductCard = `<div
                  key={idx}
                  className="rounded-xl border border-border/80 bg-muted/20 overflow-hidden space-y-1 p-1 text-center"
                >`;

const newProductCard = `<div
                  key={idx}
                  onClick={() => toast.info(\`Demonstração: \${p.name}\`, { description: \`Valor anunciado: \${p.price}. No app Waesy, seus clientes compram em até 3 toques com Pix instantâneo.\` })}
                  className="rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/50 overflow-hidden space-y-1 p-1 text-center cursor-pointer transition-all active:scale-95"
                >`;

content = content.replace(normalize(oldProductCard), normalize(newProductCard));

fs.writeFileSync(target, content, 'utf-8');
console.log('Successfully patched founder-smartphone-mockup.tsx!');

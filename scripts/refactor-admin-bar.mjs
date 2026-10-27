import fs from 'fs';
import path from 'path';

const file = path.resolve('src/components/shell/admin-contextual-bar.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Import X
content = content.replace(
  "import { Shield, Image as ImageIcon, Layers, Sliders, ExternalLink } from 'lucide-react';",
  "import { Shield, Image as ImageIcon, Layers, Sliders, ExternalLink, X } from 'lucide-react';"
);

// 2. ROUTE_NICHE_MAP: remove emoji
const oldMap = `const ROUTE_NICHE_MAP: Record<string, { id: string; label: string; emoji: string }> = {
  "/": { id: "home", label: "Início (Home)", emoji: "🏠" },
  "/mercado": { id: "mercado", label: "Supermercado e Feira", emoji: "🛒" },
  "/gastronomia": { id: "gastronomia", label: "Gastronomia e Delivery", emoji: "🍽️" },
  "/farmacia": { id: "farmacia", label: "Farmácia e Saúde", emoji: "💊" },
  "/bebidas": { id: "bebidas", label: "Bebidas e Adega", emoji: "🍻" },
  "/acougue": { id: "acougue", label: "Açougue e Carnes", emoji: "🥩" },
  "/moda": { id: "moda", label: "Moda e Vestuário", emoji: "👗" },
  "/eletronicos": { id: "eletronicos", label: "Eletrônicos e Tech", emoji: "📱" },
  "/pet": { id: "pet", label: "Pet Shop", emoji: "🐾" },
  "/servicos": { id: "servicos", label: "Serviços e Profissionais", emoji: "💼" },
  "/imoveis": { id: "imoveis", label: "Imóveis e Locação", emoji: "🏢" },
  "/construcao": { id: "construcao", label: "Construção e Reforma", emoji: "🔨" },
  "/casa": { id: "casa", label: "Casa e Decoração", emoji: "🛋️" },
  "/beleza": { id: "beleza", label: "Beleza e Estética", emoji: "✂️" },
  "/limpeza": { id: "limpeza", label: "Limpeza e Utilidades", emoji: "🧹" },
  "/livros": { id: "livros", label: "Livros e Papelaria", emoji: "📚" },
  "/feed": { id: "feed", label: "Feed", emoji: "📡" },
  "/noticias": { id: "noticias", label: "Notícias", emoji: "📰" },
  "/eventos": { id: "eventos", label: "Eventos", emoji: "🎟️" },
  "/agenda": { id: "agenda", label: "Agenda", emoji: "📅" },
  "/afiliados": { id: "afiliados", label: "Afiliados", emoji: "🎯" },
  "/turismo": { id: "turismo", label: "Turismo e Hospedagem", emoji: "✈️" },
  "/empregos": { id: "empregos", label: "Empregos", emoji: "💼" },
  "/classificados": { id: "classificados", label: "Classificados", emoji: "🏷️" },
  "/diretorio": { id: "diretorio", label: "Places", emoji: "🧭" },
  "/mobilidade": { id: "mobilidade", label: "Mobilidade Urbana", emoji: "🚗" },
  "/ofertas": { id: "ofertas", label: "Ofertas Relâmpago", emoji: "⚡" },
};`;

const newMap = `const ROUTE_NICHE_MAP: Record<string, { id: string; label: string }> = {
  "/": { id: "home", label: "Início (Home)" },
  "/mercado": { id: "mercado", label: "Supermercado e Feira" },
  "/gastronomia": { id: "gastronomia", label: "Gastronomia e Delivery" },
  "/farmacia": { id: "farmacia", label: "Farmácia e Saúde" },
  "/bebidas": { id: "bebidas", label: "Bebidas e Adega" },
  "/acougue": { id: "acougue", label: "Açougue e Carnes" },
  "/moda": { id: "moda", label: "Moda e Vestuário" },
  "/eletronicos": { id: "eletronicos", label: "Eletrônicos e Tech" },
  "/pet": { id: "pet", label: "Pet Shop" },
  "/servicos": { id: "servicos", label: "Serviços e Profissionais" },
  "/imoveis": { id: "imoveis", label: "Imóveis e Locação" },
  "/construcao": { id: "construcao", label: "Construção e Reforma" },
  "/casa": { id: "casa", label: "Casa e Decoração" },
  "/beleza": { id: "beleza", label: "Beleza e Estética" },
  "/limpeza": { id: "limpeza", label: "Limpeza e Utilidades" },
  "/livros": { id: "livros", label: "Livros e Papelaria" },
  "/feed": { id: "feed", label: "Feed" },
  "/noticias": { id: "noticias", label: "Notícias" },
  "/eventos": { id: "eventos", label: "Eventos" },
  "/agenda": { id: "agenda", label: "Agenda" },
  "/afiliados": { id: "afiliados", label: "Afiliados" },
  "/turismo": { id: "turismo", label: "Turismo e Hospedagem" },
  "/empregos": { id: "empregos", label: "Empregos" },
  "/classificados": { id: "classificados", label: "Classificados" },
  "/diretorio": { id: "diretorio", label: "Places" },
  "/mobilidade": { id: "mobilidade", label: "Mobilidade Urbana" },
  "/ofertas": { id: "ofertas", label: "Ofertas Relâmpago" },
};`;

if (content.includes(oldMap)) {
  content = content.replace(oldMap, newMap);
} else {
  // LF fallback
  content = content.replace(oldMap.replace(/\r/g, ''), newMap.replace(/\r/g, ''));
}

// 3. Fallback activeNiche
content = content.replace('emoji: "🌐",\n  };', '};');
content = content.replace('emoji: "🌐",\r\n  };', '};');

// 4. Minimized button
content = content.replace(
  'className="fixed bottom-20 right-3.5 lg:bottom-6 lg:right-6 z-50 size-9 sm:size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center border border-border/40 hover:scale-105 transition-all cursor-pointer shadow-lg"',
  'className="fixed bottom-20 right-3.5 lg:bottom-6 lg:right-6 z-50 size-11 min-h-11 min-w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center border border-border/40 hover:scale-105 transition-transform cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"'
);

// 5. Aside container
content = content.replace(
  'className="fixed bottom-20 right-3.5 lg:bottom-6 lg:right-6 z-50 max-w-[calc(100vw-1.75rem)] sm:max-w-md w-auto bg-card/95 backdrop-blur-2xl border border-border/60 rounded-lg p-2 px-3 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-3 duration-300 shadow-xl ring-1 ring-black/10 dark:ring-white/10"',
  'className="fixed bottom-20 right-3.5 lg:bottom-6 lg:right-6 z-50 max-w-full sm:max-w-md w-auto bg-card/95 backdrop-blur-2xl border border-border/60 rounded-lg p-2 px-3 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-3 duration-300 shadow-2xs motion-reduce:transition-none"'
);

// 6. Label display
content = content.replace('text-[10px]', 'text-xs');
content = content.replace(
  '<div className="flex items-center gap-1 font-bold text-foreground text-[11px]">\n            <span>{activeNiche.emoji}</span>\n            <span className="truncate max-w-[120px]">{activeNiche.label}</span>\n          </div>',
  '<div className="flex items-center gap-1 font-bold text-foreground text-xs">\n            <span className="truncate max-w-32">{activeNiche.label}</span>\n          </div>'
);
content = content.replace(
  '<div className="flex items-center gap-1 font-bold text-foreground text-[11px]">\r\n            <span>{activeNiche.emoji}</span>\r\n            <span className="truncate max-w-[120px]">{activeNiche.label}</span>\r\n          </div>',
  '<div className="flex items-center gap-1 font-bold text-foreground text-xs">\r\n            <span className="truncate max-w-32">{activeNiche.label}</span>\r\n          </div>'
);
content = content.replace('text-[9px]', 'text-xs');

// 7. Action buttons
content = content.replaceAll(
  'className="h-7 px-2 rounded-lg text-[11px] font-bold gap-1 cursor-pointer bg-background/80 hover:bg-muted/70 border-border/60"',
  'className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer bg-background/80 hover:bg-muted/70 border-border/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"'
);
content = content.replace(
  'className="h-7 px-3 rounded-lg text-[11px] font-bold gap-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"',
  'className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"'
);

// 8. Minimize button and ✕
content = content.replace(
  'className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ml-1"',
  'className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ml-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"'
);
content = content.replace('✕', '<X className="size-4" />');

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully refactored admin-contextual-bar.tsx');

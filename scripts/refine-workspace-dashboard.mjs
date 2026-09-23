import fs from "fs";

const filePath = "src/routes/workspace.index.tsx";
let content = fs.readFileSync(filePath, "utf8");

// 1. Spacing da div raiz
content = content.replace(
  'space-y-6 animate-in fade-in duration-200',
  'space-y-4 sm:space-y-6 animate-in fade-in duration-200'
);

// 2. Padding e gap do Top Header
content = content.replace(
  'gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border/60',
  'gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-card border border-border/60'
);

// 3. Quick Top Actions no mobile
content = content.replace(
  '<div className="flex flex-wrap items-center gap-2">',
  '<div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap no-scrollbar">'
);

// 4. Shrink-0 nos botões rápidos para rolagem lateral perfeita
content = content.replace(
  'onClick={() => setIsShareModalOpen(true)}\n className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-border/80"',
  'onClick={() => setIsShareModalOpen(true)}\n className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-border/80 shrink-0"'
);

// 5. Card de Faturamento Mensal
content = content.replace(
  '<div className="p-6 rounded-2xl bg-foreground text-background flex flex-col md:flex-row md:items-center justify-between gap-6">',
  '<div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-foreground text-background flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">'
);

// 6. Grid Tático de 4 Métricas
content = content.replace(
  '<div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">',
  '<div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">'
);

// 7. Departamentos Corporativos
content = content.replace(
  '<div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">',
  '<div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-card border border-border/80 space-y-3 sm:space-y-4">'
);
content = content.replace(
  '<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">',
  '<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 pt-1 sm:pt-2">'
);

// 8. Boas Práticas Operacionais
content = content.replace(
  '<div className="p-5 rounded-2xl bg-card border border-border/70 space-y-3">',
  '<div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-card border border-border/70 space-y-2.5 sm:space-y-3">'
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Refinamento aplicado com sucesso em workspace.index.tsx!");

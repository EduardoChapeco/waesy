import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/routes/workspace.noticias.index.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Import batchCurateMineArticlesFn and Checkbox if not present
if (!content.includes('batchCurateMineArticlesFn')) {
  content = content.replace(
    'curateMineArticle,',
    'curateMineArticle,\n  batchCurateMineArticlesFn,'
  );
  console.log('batchCurateMineArticlesFn import added');
}

if (!content.includes('import { Checkbox }')) {
  content = content.replace(
    'import { Button } from "@/components/ui/button";',
    'import { Button } from "@/components/ui/button";\nimport { Checkbox } from "@/components/ui/checkbox";'
  );
  console.log('Checkbox import added');
}

if (!content.includes('Zap')) {
  content = content.replace(
    'Sparkles,',
    'Sparkles,\n  Zap,\n  CheckSquare,'
  );
  console.log('Zap and CheckSquare icons added');
}

// 2. Add state and handlers
const stateAnchor = 'const [curatingId, setCuratingId] = useState<string | null>(null);';
const stateAddition = `const [curatingId, setCuratingId] = useState<string | null>(null);
  const [selectedMinedIds, setSelectedMinedIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const toggleSelectMined = (id: string) => {
    setSelectedMinedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllMined = () => {
    if (selectedMinedIds.length === minedArticles.length) {
      setSelectedMinedIds([]);
    } else {
      setSelectedMinedIds(minedArticles.map((m) => m.id));
    }
  };

  const handleBatchCurate = async (action: "approve" | "reject") => {
    if (selectedMinedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const res = await batchCurateMineArticlesFn({
        data: {
          mined_article_ids: selectedMinedIds,
          action,
        },
      });

      if (action === "approve") {
        toast.success(\`\${res.processed} notícia(s) aprovada(s) e publicadas no portal!\`);
        await refreshArticles();
      } else {
        toast.success(\`\${res.processed} notícia(s) rejeitada(s).\`);
      }

      setMinedArticles((prev) => prev.filter((m) => !selectedMinedIds.includes(m.id)));
      setSelectedMinedIds([]);
    } catch (err: any) {
      toast.error(err?.message || "Erro na curadoria em lote");
    } finally {
      setIsBatchProcessing(false);
    }
  };`;

if (!content.includes('selectedMinedIds')) {
  content = content.replace(stateAnchor, stateAddition);
  console.log('State and handlers added');
}

// 3. Update mined tab to include batch action bar and checkboxes
const oldMinedTabRegex = /\{\/\* ── Aba 2: Mineradas com IA ── \*\/\}[\s\S]*?\{minedArticles\.map\(\(mined\) => \(/;

const newMinedHeader = `{/* ── Aba 2: Mineradas com IA & OpenSquad ── */}
        <TabsContent value="mineradas" className="space-y-4">
          {minedArticles.length === 0 ? (
            <EmptyState
              title="Nenhuma notícia minerada pendente de curadoria"
              description="Quando novas notícias da cidade ou região forem extraídas por IA ou feeds RSS, elas aparecerão aqui para aprovação rápida."
            />
          ) : (
            <div className="space-y-3">
              {/* Barra de Ações em Lote do OpenSquad */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4 rounded-xl bg-card border border-border/60 shadow-2xs">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all-mined"
                    checked={
                      minedArticles.length > 0 &&
                      selectedMinedIds.length === minedArticles.length
                    }
                    onCheckedChange={toggleSelectAllMined}
                  />
                  <label
                    htmlFor="select-all-mined"
                    className="text-xs font-medium text-foreground cursor-pointer select-none"
                  >
                    {selectedMinedIds.length > 0 ? (
                      <span className="font-semibold text-primary">
                        {selectedMinedIds.length} selecionada(s)
                      </span>
                    ) : (
                      "Selecionar todas as matérias"
                    )}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={selectedMinedIds.length === 0 || isBatchProcessing}
                    onClick={() => handleBatchCurate("approve")}
                    className="h-8 px-3 rounded-xl font-bold text-xs gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {isBatchProcessing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Zap className="size-3.5 fill-current" />
                    )}
                    Aprovar Selecionadas ({selectedMinedIds.length})
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedMinedIds.length === 0 || isBatchProcessing}
                    onClick={() => handleBatchCurate("reject")}
                    className="h-8 px-3 rounded-xl font-bold text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <ThumbsDown className="size-3.5" />
                    Rejeitar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {minedArticles.map((mined) => (` ;

if (oldMinedTabRegex.test(content)) {
  content = content.replace(oldMinedTabRegex, newMinedHeader);
  console.log('Mined tab header updated');
} else {
  console.log('Regex did not match old mined tab header');
}

// 4. Add checkbox inside each card
const oldCardRegex = /<div\s+key=\{mined\.id\}\s+className="p-4 sm:p-5 rounded-2xl bg-card border border-border\/60 space-y-3"\s*>\s*<div className="flex items-start justify-between gap-4">\s*<div className="flex items-start gap-3 min-w-0">/;

const newCardPrefix = `<div
                    key={mined.id}
                    className={\`p-4 sm:p-5 rounded-2xl bg-card border transition-colors space-y-3 \${
                      selectedMinedIds.includes(mined.id)
                        ? "border-primary/50 bg-primary/5 shadow-2xs"
                        : "border-border/60"
                    }\`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="pt-1">
                          <Checkbox
                            checked={selectedMinedIds.includes(mined.id)}
                            onCheckedChange={() => toggleSelectMined(mined.id)}
                            aria-label="Selecionar notícia"
                          />
                        </div>`;

if (oldCardRegex.test(content)) {
  content = content.replace(oldCardRegex, newCardPrefix);
  console.log('Checkbox inserted into each mined card');
} else {
  console.log('Regex did not match card prefix');
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('workspace.noticias.index.tsx successfully updated!');

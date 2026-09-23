import fs from "fs";

console.log("Iniciando execução da Fase V21...");

// 1. workspace.marketing.promocoes.tsx
{
  const filePath = "src/routes/workspace.marketing.promocoes.tsx";
  let content = fs.readFileSync(filePath, "utf8");

  // Importar CrudActionsMenu
  if (!content.includes('import { CrudActionsMenu }')) {
    content = content.replace(
      'import { PageHeader } from "@/components/commerce/page-header";',
      'import { PageHeader } from "@/components/commerce/page-header";\r\nimport { CrudActionsMenu } from "@/components/ui/crud-actions-menu";'
    );
  }

  // Remover confirm() do handleDeleteCoupon
  content = content.replace(
    /const handleDeleteCoupon = async \(id: string, code: string\) => {\r?\n\s*if \(!confirm\([^)]*\)\) {\r?\n\s*return;\r?\n\s*}/,
    `const handleDeleteCoupon = async (id: string, code: string) => {`
  );

  // Substituir os botões da lista de cupons (linhas 530-550)
  const oldCouponActionsRegex = /<div className="flex items-center gap-2 shrink-0">[\s\S]*?<Switch[\s\S]*?\/>[\s\S]*?<\/div>[\s\S]*?<Button[\s\S]*?title="Excluir Cupom"[\s\S]*?<\/Button>/;
  if (oldCouponActionsRegex.test(content)) {
    content = content.replace(
      oldCouponActionsRegex,
      `<CrudActionsMenu
 triggerVariant="outline"
 triggerClassName="h-9 px-3 rounded-xl border-border/60 hover:bg-muted"
 onToggleStatus={() => handleToggleCoupon(coupon)}
 statusLabel={coupon.is_active ? "Pausar Cupom" : "Ativar Cupom"}
 onDelete={() => handleDeleteCoupon(coupon.id, coupon.code)}
 deleteTitle={\`Excluir cupom "\${coupon.code}"?\`}
 deleteDescription="O cupom será removido e não poderá mais ser aplicado no carrinho ou checkout."
 customActions={[
 {
 label: "Copiar Código",
 icon: Copy,
 onClick: () => copyCouponCode(coupon.code, coupon.id),
 },
 ]}
 />`
    );
    console.log("✓ Cupons atualizados com CrudActionsMenu e sem confirm!");
  }

  fs.writeFileSync(filePath, content, "utf8");
}

// 2. workspace.financeiro.contas-pagar.tsx
{
  const filePath = "src/routes/workspace.financeiro.contas-pagar.tsx";
  let content = fs.readFileSync(filePath, "utf8");

  // Importar CrudActionsMenu
  if (!content.includes('import { CrudActionsMenu }')) {
    content = content.replace(
      'import { PageHeader } from "@/components/commerce/page-header";',
      'import { PageHeader } from "@/components/commerce/page-header";\r\nimport { CrudActionsMenu } from "@/components/ui/crud-actions-menu";'
    );
  }

  // Remover confirm() do handleDelete
  content = content.replace(
    /const handleDelete = async \(id: string, title: string\) => {\r?\n\s*if \(!confirm\([^)]*\)\) return;/,
    `const handleDelete = async (id: string, title: string) => {`
  );

  // Simplificar cabeçalho composto
  content = content.replace(
    'eyebrow="Financeiro & Tesouraria"\r\n title="Contas a Pagar & Obrigações"\r\n description="Controle despesas fixas, boletos de fornecedores, impostos e aluguéis com previsão de saída e conciliação financeira."',
    'eyebrow="Financeiro"\r\n title="Contas a Pagar"'
  ).replace(
    'eyebrow="Financeiro & Tesouraria"\n title="Contas a Pagar & Obrigações"\n description="Controle despesas fixas, boletos de fornecedores, impostos e aluguéis com previsão de saída e conciliação financeira."',
    'eyebrow="Financeiro"\n title="Contas a Pagar"'
  );

  // Substituir ação mobile (linhas 647-657)
  const mobileDeleteRegex = /<Button[\s\S]*?onClick=\{\(\) => handleDelete\(ob\.id, ob\.title\)\}[\s\S]*?title="Remover conta"[\s\S]*?<\/Button>/;
  if (mobileDeleteRegex.test(content)) {
    content = content.replace(
      mobileDeleteRegex,
      `<CrudActionsMenu
 triggerVariant="outline"
 triggerClassName="size-11 shrink-0 rounded-xl border-border/70 hover:bg-muted"
 onDelete={() => handleDelete(ob.id, ob.title)}
 deleteTitle={\`Remover conta "\${ob.title}"?\`}
 deleteDescription="A obrigação financeira será excluída do fluxo de caixa e não poderá ser recuperada."
 customActions={[
 ...(ob.status !== "paid"
 ? [
 {
 label: "Registrar Pagamento",
 icon: CheckCircle2,
 onClick: () => setPayModal({ isOpen: true, obligation: ob }),
 },
 ]
 : []),
 ...(ob.barcode
 ? [
 {
 label: "Copiar Código de Barras",
 icon: Copy,
 onClick: () => copyBarcode(ob.barcode),
 },
 ]
 : []),
 ]}
 />`
    );
    console.log("✓ Ações mobile de contas a pagar atualizadas!");
  }

  // Substituir ação desktop (linhas 783-792)
  const desktopDeleteRegex = /<Button[\s\S]*?onClick=\{\(\) => handleDelete\(ob\.id, ob\.title\)\}[\s\S]*?title="Remover conta"[\s\S]*?<\/Button>/;
  if (desktopDeleteRegex.test(content)) {
    content = content.replace(
      desktopDeleteRegex,
      `<CrudActionsMenu
 onDelete={() => handleDelete(ob.id, ob.title)}
 deleteTitle={\`Remover conta "\${ob.title}"?\`}
 deleteDescription="A obrigação financeira será excluída do fluxo de caixa e não poderá ser recuperada."
 customActions={[
 ...(ob.status !== "paid"
 ? [
 {
 label: "Registrar Pagamento",
 icon: CheckCircle2,
 onClick: () => setPayModal({ isOpen: true, obligation: ob }),
 },
 ]
 : []),
 ...(ob.barcode
 ? [
 {
 label: "Copiar Código de Barras",
 icon: Copy,
 onClick: () => copyBarcode(ob.barcode),
 },
 ]
 : []),
 ]}
 />`
    );
    console.log("✓ Ações desktop de contas a pagar atualizadas!");
  }

  fs.writeFileSync(filePath, content, "utf8");
}

// 3. workspace.turismo.contratos.index.tsx
{
  const filePath = "src/routes/workspace.turismo.contratos.index.tsx";
  let content = fs.readFileSync(filePath, "utf8");

  if (!content.includes('import { CrudActionsMenu }')) {
    content = content.replace(
      'import { PageHeader } from "@/components/commerce/page-header";',
      'import { PageHeader } from "@/components/commerce/page-header";\r\nimport { CrudActionsMenu } from "@/components/ui/crud-actions-menu";'
    );
  }

  // Substituir botão de exclusão que usava confirm() por CrudActionsMenu
  const oldContractDeleteRegex = /<Button[\s\S]*?onClick=\{\(\) => \{\r?\n\s*if \(confirm\(`Deseja excluir este contrato\?`\)\) \{\r?\n\s*deleteMutation\.mutate\(c\.id\);\r?\n\s*\}\r?\n\s*\}\}[\s\S]*?title="Excluir contrato"[\s\S]*?<\/Button>/;
  if (oldContractDeleteRegex.test(content)) {
    content = content.replace(
      oldContractDeleteRegex,
      `<CrudActionsMenu
 onDelete={() => deleteMutation.mutate(c.id)}
 deleteTitle="Excluir este contrato?"
 deleteDescription="O documento de viagem será cancelado e removido do sistema."
 customActions={[
 ...(isSigned
 ? [
 {
 label: "Validar Protocolo",
 icon: CheckCircle2,
 onClick: () => window.open(\`/verify/document/\${c.public_token}\`, "_blank"),
 },
 ]
 : []),
 ]}
 />`
    );
    console.log("✓ workspace.turismo.contratos.index.tsx atualizado com CrudActionsMenu!");
  }

  fs.writeFileSync(filePath, content, "utf8");
}

// 4. workspace.comercial.tsx
{
  const filePath = "src/routes/workspace.comercial.tsx";
  let content = fs.readFileSync(filePath, "utf8");

  content = content.replace(
    /const handleDeleteLead = async \(leadId: string\) => {\r?\n\s*if \(!confirm\([^)]*\)\) return;/,
    `const handleDeleteLead = async (leadId: string) => {`
  );

  fs.writeFileSync(filePath, content, "utf8");
  console.log("✓ workspace.comercial.tsx handleDeleteLead atualizado sem confirm!");
}

// 5. workspace.catalogo.produtos.novo.tsx
{
  const filePath = "src/routes/workspace.catalogo.produtos.novo.tsx";
  let content = fs.readFileSync(filePath, "utf8");

  // Importar importFullCatalogMenu
  if (!content.includes('importFullCatalogMenu')) {
    content = content.replace(
      'import { importProductFromUrl } from "@/services/api-orchestrator.functions";',
      'import { importProductFromUrl, importFullCatalogMenu } from "@/services/api-orchestrator.functions";'
    );
  }

  // Adicionar botão "Copiar Loja Antiga" no PageHeader
  const headerActionsTarget = '<Globe className="size-3.5 text-primary" />\r\n <span>Importar por Link</span>\r\n </Button>';
  const headerActionsTargetLF = '<Globe className="size-3.5 text-primary" />\n <span>Importar por Link</span>\n </Button>';

  const copyStoreButton = `<Globe className="size-3.5 text-primary" />
 <span>Importar por Link</span>
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsImportModalOpen(true)}
 className="rounded-xl text-xs font-bold gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer hidden sm:flex"
 title="Copiar catálogo completo de loja antiga"
 >
 <Store className="size-3.5" />
 <span>Copiar Loja Antiga</span>
 </Button>`;

  if (!content.includes("Copiar Loja Antiga")) {
    if (content.includes(headerActionsTarget)) {
      content = content.replace(headerActionsTarget, copyStoreButton.replace(/\n/g, "\r\n"));
      console.log("✓ Botão Copiar Loja Antiga adicionado (CRLF)!");
    } else if (content.includes(headerActionsTargetLF)) {
      content = content.replace(headerActionsTargetLF, copyStoreButton);
      console.log("✓ Botão Copiar Loja Antiga adicionado (LF)!");
    }
  }

  fs.writeFileSync(filePath, content, "utf8");
}

console.log("Todas as melhorias da Fase V21 foram aplicadas com sucesso!");

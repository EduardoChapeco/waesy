import fs from "fs";
import path from "path";

console.log("Iniciando aplicação das melhorias V20...");

// 1. workspace.marketing.banners.tsx
{
  const filePath = "src/routes/workspace.marketing.banners.tsx";
  let content = fs.readFileSync(filePath, "utf8");

  // Garantir import do CrudActionsMenu e cn
  if (!content.includes('import { CrudActionsMenu }')) {
    content = content.replace(
      'import { DestinationPicker } from "@/components/ui/destination-picker";',
      'import { DestinationPicker } from "@/components/ui/destination-picker";\r\nimport { CrudActionsMenu } from "@/components/ui/crud-actions-menu";\r\nimport { cn } from "@/lib/utils";'
    );
  }

  // Remover confirm() do handleDelete
  content = content.replace(
    /const handleDelete = async \(id: string\) => {[\s\S]*?if \(!confirm\([^)]*\)\) return;[\s\S]*?try {/,
    `const handleDelete = async (id: string) => {\r\n try {`
  );

  // Substituir os 3 botões por linha pelo Badge de status e CrudActionsMenu
  const targetButtons = `<div className="flex items-center justify-between pt-2 text-xs">`;
  if (content.includes(targetButtons)) {
    const startIdx = content.indexOf(targetButtons);
    const endIdx = content.indexOf('</div>\r\n </div>\r\n </div>\r\n ))}');
    
    if (startIdx !== -1 && endIdx !== -1) {
      const oldBlock = content.slice(startIdx, endIdx);
      const newBlock = `<div className="flex items-center justify-between pt-2.5 border-t border-border/40 text-xs">
 <Badge
 variant={b.is_active ? "default" : "outline"}
 className={cn(
 "text-[10px] font-semibold px-2 py-0.5 rounded-full",
 b.is_active
 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
 : "text-muted-foreground"
 )}
 >
 {b.is_active ? "Ativo na Loja" : "Pausado"}
 </Badge>

 <CrudActionsMenu
 onEdit={() => handleOpenEdit(b)}
 onToggleStatus={() => handleToggleActive(b)}
 statusLabel={b.is_active ? "Pausar Banner" : "Ativar Banner"}
 onDelete={() => handleDelete(b.id)}
 deleteTitle={\`Excluir banner "\${b.title}"?\`}
 deleteDescription="O banner deixará de ser exibido nos carrosséis da vitrine da loja imediatamente."
 />
 </div>`;

      content = content.replace(oldBlock, newBlock);
      console.log("✓ workspace.marketing.banners.tsx atualizado com CrudActionsMenu!");
    }
  }

  fs.writeFileSync(filePath, content, "utf8");
}

// 2. workspace.clientes.index.tsx
{
  const filePath = "src/routes/workspace.clientes.index.tsx";
  let content = fs.readFileSync(filePath, "utf8");

  // Garantir import do CrudActionsMenu
  if (!content.includes('import { CrudActionsMenu }')) {
    content = content.replace(
      'import { PageHeader } from "@/components/commerce/page-header";',
      'import { PageHeader } from "@/components/commerce/page-header";\r\nimport { CrudActionsMenu } from "@/components/ui/crud-actions-menu";'
    );
  }

  // Remover confirm() do handleArchive
  content = content.replace(
    /const handleArchive = async \(customerId: string, name: string\) => {\r?\n\s*if \(!confirm\([^)]*\)\) {\r?\n\s*return;\r?\n\s*}/,
    `const handleArchive = async (customerId: string, name: string) => {`
  );

  // Substituir menu mobile
  const mobileMenuRegex = /<DropdownMenu>[\s\S]*?<DropdownMenuTrigger asChild>[\s\S]*?aria-label="Mais opções do cliente"[\s\S]*?<\/DropdownMenu>/;
  if (mobileMenuRegex.test(content)) {
    content = content.replace(
      mobileMenuRegex,
      `<CrudActionsMenu
 triggerVariant="outline"
 triggerClassName="h-11 px-4 rounded-xl border-border/60 hover:bg-muted shrink-0"
 onView={() => router.navigate({ to: "/workspace/clientes/$id", params: { id: c.id } })}
 viewLabel="Ficha Completa 360°"
 onArchive={() => handleArchive(c.id, c.fullName)}
 archiveTitle={\`Arquivar cliente "\${c.fullName}"?\`}
 archiveDescription="O cliente será arquivado e não aparecerá nas listagens ativas, podendo ser restaurado futuramente."
 customActions={[
 ...(c.phone
 ? [
 {
 label: "Conversar no WhatsApp",
 icon: MessageCircle,
 onClick: () => openWhatsApp(c.phone, c.fullName),
 },
 ]
 : []),
 {
 label: "Criar Oportunidade",
 icon: Plane,
 onClick: () => router.navigate({ to: "/workspace/comercial" }),
 },
 {
 label: "Iniciar Cotação",
 icon: DollarSign,
 onClick: () =>
 router.navigate({
 to: "/workspace/turismo/cotacoes",
 search: {
 leadName: c.fullName,
 leadPhone: c.phone || undefined,
 leadEmail: c.email || undefined,
 clientId: c.id,
 } as any,
 }),
 },
 {
 label: "Emitir Bilhete Aéreo",
 icon: Ticket,
 onClick: () => router.navigate({ to: "/workspace/turismo/aereos" }),
 },
 ]}
 />`
    );
    console.log("✓ Menu mobile de clientes atualizado!");
  }

  // Substituir menu desktop
  const desktopMenuRegex = /<TableCell className="text-right py-3.5">[\s\S]*?<div className="flex items-center justify-end gap-1.5">[\s\S]*?<DropdownMenu>[\s\S]*?<\/DropdownMenu>[\s\S]*?<\/div>[\s\S]*?<\/TableCell>/;
  if (desktopMenuRegex.test(content)) {
    content = content.replace(
      desktopMenuRegex,
      `<TableCell className="text-right py-3.5">
 <div className="flex items-center justify-end gap-1.5">
 <Link
 to="/workspace/clientes/$id"
 params={{ id: c.id }}
 className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/60 text-foreground hover:bg-muted transition-colors hover:no-underline"
 >
 Ficha 360°
 </Link>
 <CrudActionsMenu
 onView={() => router.navigate({ to: "/workspace/clientes/$id", params: { id: c.id } })}
 viewLabel="Ver Ficha Completa"
 onArchive={() => handleArchive(c.id, c.fullName)}
 archiveTitle={\`Arquivar cliente "\${c.fullName}"?\`}
 archiveDescription="O cliente será arquivado e poderá ser restaurado futuramente."
 customActions={[
 ...(c.phone
 ? [
 {
 label: "Conversar no WhatsApp",
 icon: MessageCircle,
 onClick: () => openWhatsApp(c.phone, c.fullName),
 },
 ]
 : []),
 {
 label: "Criar Oportunidade",
 icon: Plane,
 onClick: () => router.navigate({ to: "/workspace/comercial" }),
 },
 {
 label: "Iniciar Cotação",
 icon: DollarSign,
 onClick: () =>
 router.navigate({
 to: "/workspace/turismo/cotacoes",
 search: {
 leadName: c.fullName,
 leadPhone: c.phone || undefined,
 leadEmail: c.email || undefined,
 clientId: c.id,
 } as any,
 }),
 },
 {
 label: "Emitir Bilhete Aéreo",
 icon: Ticket,
 onClick: () => router.navigate({ to: "/workspace/turismo/aereos" }),
 },
 ]}
 />
 </div>
 </TableCell>`
    );
    console.log("✓ Menu desktop de clientes atualizado!");
  }

  fs.writeFileSync(filePath, content, "utf8");
}

// 3. workspace.contratos.index.tsx
{
  const filePath = "src/routes/workspace.contratos.index.tsx";
  let content = fs.readFileSync(filePath, "utf8");

  if (!content.includes('import { CrudActionsMenu }')) {
    content = content.replace(
      'import { PageHeader } from "@/components/commerce/page-header";',
      'import { PageHeader } from "@/components/commerce/page-header";\r\nimport { CrudActionsMenu } from "@/components/ui/crud-actions-menu";\r\nimport { useRouter } from "@tanstack/react-router";'
    );
  }

  if (!content.includes('const router = useRouter();')) {
    content = content.replace(
      'function ContractsDashboard() {',
      'function ContractsDashboard() {\r\n const router = useRouter();'
    );
  }

  // Substituir os botões comprimidos do card de contrato
  const contractButtonsRegex = /<div className="pt-3 border-t border-border\/60 flex items-center justify-between gap-2">[\s\S]*?<Link to="\/workspace\/contratos\/\$id\/editor" params={{ id: contract\.id }}>[\s\S]*?<\/Link>[\s\S]*?<\/Button>[\s\S]*?<\/div>/;
  if (contractButtonsRegex.test(content)) {
    content = content.replace(
      contractButtonsRegex,
      `<div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
 <Button asChild size="sm" className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer gap-1.5 flex-1">
 <Link to="/workspace/contratos/$id/editor" params={{ id: contract.id }}>
 <FileSignature className="size-3.5" />
 <span>Abrir Contrato</span>
 </Link>
 </Button>

 <CrudActionsMenu
 triggerVariant="outline"
 triggerClassName="h-9 px-3 rounded-xl border-border/60 hover:bg-muted"
 customActions={[
 {
 label: isCopied ? "Link Copiado!" : "Copiar Link de Assinatura",
 icon: isCopied ? Check : Copy,
 onClick: (e) => handleCopyLink(e, contract.id),
 },
 {
 label: "Enviar via WhatsApp",
 icon: WhatsappLogo as any,
 onClick: (e) => handleShareWhatsApp(e, contract),
 },
 ...(contract.verification_code
 ? [
 {
 label: "Certificado Público de Assinatura",
 icon: ExternalLink,
 onClick: () => router.navigate({ to: "/verify/document/$code", params: { code: contract.verification_code } }),
 },
 ]
 : []),
 ]}
 />
 </div>`
    );
    console.log("✓ Cards de contratos atualizados com CrudActionsMenu!");
  }

  fs.writeFileSync(filePath, content, "utf8");
}

// 4. workspace.advocacia.index.tsx (Silêncio visual no cabeçalho)
{
  const filePath = "src/routes/workspace.advocacia.index.tsx";
  let content = fs.readFileSync(filePath, "utf8");

  content = content.replace(
    'eyebrow="Módulo JUS • Advocacia 360°"\r\n title="Painel Jurídico & Processos"',
    'eyebrow="Jurídico"\r\n title="Processos"'
  ).replace(
    'eyebrow="Módulo JUS • Advocacia 360°"\n title="Painel Jurídico & Processos"',
    'eyebrow="Jurídico"\n title="Processos"'
  );

  fs.writeFileSync(filePath, content, "utf8");
  console.log("✓ workspace.advocacia.index.tsx cabeçalho simplificado!");
}

// 5. workspace.pdv.index.tsx (Silêncio visual em tooltips)
{
  const filePath = "src/routes/workspace.pdv.index.tsx";
  let content = fs.readFileSync(filePath, "utf8");

  content = content.replace('title="KDS — Estações de Preparo"', 'title="Cozinha (KDS)"');
  content = content.replace('title="Salão & Mesas / Comandas"', 'title="Comandas e Mesas"');

  fs.writeFileSync(filePath, content, "utf8");
  console.log("✓ workspace.pdv.index.tsx tooltips limpas!");
}

console.log("Todas as melhorias foram aplicadas com sucesso!");

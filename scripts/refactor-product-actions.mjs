import fs from 'fs';
const path = 'src/routes/workspace.catalogo.produtos.index.tsx';
let content = fs.readFileSync(path, 'utf-8');

const oldFunctionRegex = /const ProductActionsMenu = \(\{ product \}: \{ product: AdminProductRow \}\) => \([\s\S]*?<\/DropdownMenu>\s*\);/;

const newFunction = `const ProductActionsMenu = ({ product }: { product: AdminProductRow }) => (
    <CrudActionsMenu
      entityName={nicheCtx.entityName}
      editUrl={\`/workspace/catalogo/produtos/\${product.id}\`}
      viewUrl={\`/produto/\${product.slug}\`}
      onDuplicate={() => handleDuplicate(product.id)}
      customActions={[
        {
          label: "Criar Post (Estúdio)",
          icon: Palette,
          href: \`/workspace/estudio?productId=\${product.id}\`,
        },
      ]}
      onToggleStatus={() =>
        handleToggleStatus(
          product.id,
          product.status === "published" ? "draft" : "published"
        )
      }
      statusLabel={
        product.status === "published"
          ? "Mover para Rascunho"
          : "Publicar na Vitrine"
      }
      statusIcon={product.status === "published" ? FileText : CheckCircle2}
      onArchive={
        product.status !== "archived"
          ? () => handleToggleStatus(product.id, "archived")
          : undefined
      }
    />
  );`;

if (oldFunctionRegex.test(content)) {
  content = content.replace(oldFunctionRegex, newFunction);
  fs.writeFileSync(path, content, 'utf-8');
  console.log('Successfully refactored ProductActionsMenu with CrudActionsMenu!');
} else {
  console.log('Regex did not match old ProductActionsMenu');
}

---
name: anti-ai-design
description: "Regras estritas para erradicar o 'AI Smell' visual: elimina botões conversacionais prolixos, caixas explicativas desnecessárias, excesso de ícones decorativos e layouts redundantes. Impõe design humano, limpo e direto padrão Apple, Stripe, Linear e iFood."
---

# Anti-AI Design & Human Simplicity Protocol (Waesy)

> **DIRETRIZ CENTRAL:** O design de software de alto padrão (Apple HIG, Stripe, Linear, iFood) **não tenta explicar o óbvio a cada clique**. Interfaces maduras são diretas, autoexplicativas e silenciosas.

---

## 🚫 1. Proibições Absolutas (Erradicação do AI-Smell)

### ❌ Proibido: Botões Conversacionais com Título + Subtítulo + Ícone em Box
**Como a IA costuma errar:**
```tsx
// ❌ PÉSSIMO: Card disfarçado de botão com 3 níveis de texto redundante
<button className="flex items-center gap-3 p-4 rounded-xl border bg-amber-500/10">
  <div className="size-8 bg-amber-500/20 text-amber-600"><Shield /></div>
  <div>
    <p className="font-bold">Acessar Portal Comercial</p>
    <p className="text-xs text-muted-foreground">Gestores, administradores e operadores de loja</p>
  </div>
  <ArrowRight />
</button>
```

**Como um Designer Humano Sênior faz (Apple / Stripe / Linear):**
```tsx
// ✅ CORRETO: Botão limpo, direto, com rótulo semântico e objetivo
<Button variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold">
  Entrar no Workspace
</Button>
```

---

## 🔇 2. Silêncio Visual: Erradicação de Textos Explicativos Redundantes

- **Nunca use parágrafos de instrução óbvia** embaixo de inputs:
  - ❌ `"Digite seu e-mail para que possamos localizá-lo em nossa base de dados."`
  - ❌ `"Preencha os campos abaixo com os dados do seu novo produto para salvar no catálogo."`
  - ❌ `"Clique no botão abaixo para concluir a criação do seu anúncio."`
  - ✅ Use apenas o `<Label>` limpo e um `<Input placeholder="..." />` bem calibrado.

- **Ausência de Caixas de Boas-Vindas Conversacionais**:
  - ❌ `"Bem-vindo à área de relatórios financeiros da sua loja. Aqui você pode visualizar seus ganhos..."`
  - ✅ Apenas `<PageHeader eyebrow="Financeiro" title="Fluxo de Caixa" />` com filtros e números reais.

---

## 🎯 3. Rótulos Canônicos de Ação (Diretos & Humanos)

| Ação Pretendida | ❌ Rótulo Prolixo / AI-Smell | ✅ Rótulo Humano & Preciso |
| :--- | :--- | :--- |
| Login Empresarial | "Acessar Portal Comercial de Lojas" | **"Entrar no Workspace"** |
| Salvar Configuração | "Salvar todas as minhas alterações no banco" | **"Salvar"** ou **"Salvar alterações"** |
| Criar Produto | "Criar e publicar novo produto no catálogo" | **"Novo Produto"** |
| Enviar Mensagem | "Clique aqui para enviar sua mensagem" | **"Enviar"** |
| Filtro de Lista | "Aplicar critérios de busca selecionados" | **"Filtrar"** |
| Adicionar ao Carrinho | "Adicionar este produto à sua sacola de compras" | **"Adicionar"** |
| Checkout | "Prosseguir para etapa de finalização de pagamento" | **"Finalizar Pedido"** |

---

## 📐 4. Hierarquia Visual de Botões

1. **Ação Primária (1 por tela/seção)**:
   - Sólido, contraste máximo (`bg-primary text-primary-foreground` ou `bg-foreground text-background`), altura padrão `h-11` (mobile) ou `h-9` / `h-10` (desktop).
2. **Ação Secundária**:
   - `variant="outline"` com borda sutil `border-border/80`.
3. **Ações Terciárias / Links**:
   - `variant="ghost"` ou texto com `text-muted-foreground hover:text-foreground`.
4. **Sem Caixas Coloridas Chamativas Sem Propósito**:
   - Não pinte botões secundários de âmbar, azul, verde ou rosa a menos que representem estados destrutivos (`variant="destructive"` / vermelho) ou badges de status específico.

---

## 💬 6. Eliminação de Jargão Técnico / Linguagem Comercial Direta

- **Fale como um lojista e cliente real**, não como um programador de software:
  - ❌ "Auditar parâmetros de comissão e webhook de tracking" ➔ ✅ **"Minhas Comissões & Vendas"**
  - ❌ "Visualizar payload de transação multi-tenant" ➔ ✅ **"Detalhes do Pedido"**
  - ❌ "Configurar metadata de nicho operacional" ➔ ✅ **"Tipo de Atendimento"**
  - ❌ "Acessar portal comercial de gestores" ➔ ✅ **"Entrar no Workspace"**
  - ❌ "Taxonomia canônica de atributos" ➔ ✅ **"Características do Produto"**
- A interface deve ser clara, amigável, direta e estritamente comercial.

---

## 📱 7. Padronização Milimétrica de 1px da Borda no Mobile & Zero Dead Space

- **Distância Canônica de 1px**: No mobile, o container raiz `<main>` deve aplicar `px-[1px]`.
- **Proibição de Margem Dupla**: Telas filhas (`_store.*` e `workspace.*`) nunca devem aplicar `px-4`, `px-6` ou `px-0.5` acumulados no mobile. Usem `px-0 sm:px-4 md:px-0`.
- **Proibição de "Grid dentro de Grid"**: Nunca estrangule telas móveis (360px-390px) com múltiplos contêineres aninhados com paddings internos. O conteúdo deve se expandir aproveitando 100% da largura útil disponível.
- **Proibição de `max-w-xl` em Empty States Móveis**: Empty states e cartões devem preencher `w-full` com padding interno contido (`p-4 sm:p-8`), sem margens flutuantes ociosas nas laterais.

---

## 🛡️ 8. Checklist de Verificação Antes de Concluir Qualquer UI

- [ ] Existe algum botão com título + subtítulo descritivo quando um botão simples bastaria? (Se sim, simplifique).
- [ ] Existe algum texto redundante explicando como preencher um input óbvio? (Se sim, delete).
- [ ] Existe algum ícone dentro de uma caixinha arredondada sem função real? (Se sim, remova a caixinha).
- [ ] Os termos usados são comerciais e humanos (sem jargões técnicos de BD/programação)?
- [ ] A tela no mobile tem exatamente 1px da borda da tela sem paddings laterais acumulados?
- [ ] A tela parece ter sido feita por um designer da Apple, Stripe ou Linear? (Menos texto, mais foco no dado).


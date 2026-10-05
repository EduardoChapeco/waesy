# Relatório Técnico de Varredura — UI & Rotas (R3 & R4)

**Data:** 2026-10-05T04:15:00Z  
**Autor:** Explorer 3 — UI & Routes Survey Explorer  
**Escopo:** Centro de Controle Master Admin (`admin-master.usuarios.tsx`), Rota Civil "Minha Atividade" (`_store.conta.atividade.tsx`), Integração de Navegação e Conformidade Estrita com Design Tokens e Linter Visual.

---

## 1. Resumo Executivo & Diagnóstico Geral

A presente investigação forense de UI e Rotas foi conduzida sobre o ecossistema Waesy para sustentar as entregas dos requisitos **R3** (Dossiê 360º irrestrito no Master Admin com 7 abas operacionais) e **R4** (Visão do Consumidor "Minha Atividade" no padrão Apple Privacy / Google My Activity).

### Principais Conclusões:
1. **`src/routes/admin-master.usuarios.tsx` Atual:**
   - Possui uma listagem básica de usuários com apenas 2 botões de ação por linha (`Dossiê 360º` e `Sanção`) e um seletor de role.
   - O modal de Dossiê atual (`SheetPage`) exibe apenas 4 cartões de contagem bruta (`orders`, `mobility_rides`, `appointments`, `terms_acceptances`) e a lista de termos aceitos. **Não possui nenhuma aba**, não possui controles de redefinição de senha, não permite disparar Magic Link, não tem bloqueio com justificativa, nem transferência de lojas, KYC documental ou telemetria.
   - Apresenta **débito visual técnico legado** com violações literais das regras `DL-01` (cores hardcoded `text-amber-600`), `DL-02` (classes com colchetes arbitrários `text-[10px]`, `text-[11px]`), `DL-03` (ícones `size-3.5` fora da grade de 4px), `DL-14` (alvos de toque interativos com `h-8` e `h-6` < 44px) e `DL-18` (`text-white`).
2. **Rota Civil `src/routes/_store.conta.atividade.tsx`:**
   - **Atualmente inexistente no repositório.**
   - O layout pai `src/routes/_store.conta.tsx` já provê barreira de autenticação centralizada (`beforeLoad` com redirect para `/entrar?returnUrl=...`).
   - O painel principal da conta (`src/routes/_store.conta.index.tsx`) organiza a navegação em `ACCOUNT_GROUPS`, onde a nova rota `/conta/atividade` deve ser indexada na seção de "Atividades" ou "Segurança".
3. **Conformidade de Design System & Design Lint:**
   - Todos os botões e alvos de toque móveis devem implementar piso mecânico de 44x44px (`h-11 min-h-11`).
   - Todos os elementos interativos devem possuir anel de foco teclado explícito (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`).
   - Todos os títulos (`h1`, `h2`) devem ter no máximo 6 palavras e rótulos de botão no máximo 3 palavras.
   - Zero classes arbitrárias `-[...]`, zero emojis, e consumo estrito dos tokens de `src/styles.css` e `tokens.json`.

---

## 2. Forense Detalhada de `src/routes/admin-master.usuarios.tsx`

### 2.1 Estrutura Atual
- **Arquivo:** `src/routes/admin-master.usuarios.tsx` (439 linhas).
- **Rota:** `/admin-master/usuarios`.
- **Loader:**
  ```tsx
  loader: async () => {
    try {
      const users = await listAllUsers().catch(() => []);
      return { users: users || [] };
    } catch {
      return { users: [] };
    }
  }
  ```
- **Funções BFF Consumidas Atualmente:**
  - `listAllUsers()` (`src/services/master.functions.ts`)
  - `applyUserSanction()` (`src/services/master.functions.ts`)
  - `getUser360Dossier()` (`src/services/master.functions.ts`)
  - `adminUpdateUserRole()` (`src/services/master.functions.ts`)
  - `adminTriggerPasswordReset()` (importada na linha 5, declarada na função auxiliar `handleSendResetPassword`, porém **sem nenhum botão na interface que a chame**).
  - `triggerCivilIdentityRippleCascade()` (`src/services/deep-core.functions.ts`)

### 2.2 Inventário de Defeitos e Gaps em Relação ao Requisito R3

| Requisito R3 | Estado Atual em `admin-master.usuarios.tsx` | Gap Identificado | Ação Necessária |
| :--- | :--- | :--- | :--- |
| **7 Abas Operacionais no Dossiê** | O `SheetPage` exibe apenas 1 bloco monolítico estático com 4 KPIs e lista de termos | Ausência completa de sistema de abas | Implementar `<Tabs>` do Radix com 7 `<TabsContent>` modulares |
| **Aba 1: Geral & Acessos** | Apenas exibe dados básicos de texto. Não há controle de senha nem de empresas | Sem redefinição de senha, sem bloqueio, sem transferência | Integrar `adminForceSetUserPassword`, `adminTriggerPasswordReset`, `adminToggleUserAccess` e `adminTransferStoreOwnership` |
| **Aba 2: Documentos & KYC** | Não exibe fotos ou documentos de KYC no dossiê (apenas em rota isolada `/admin-master/kyc`) | Usuário do Master precisa sair da tela para auditar CNH/RG do usuário | Incorporar visualização de fotos (selfie, frente, verso) e botões de Aprovar/Rejeitar integrados |
| **Aba 3: Formulários & Cadastros** | Inexistente | Nenhum histórico de formulários preenchidos | Renderizar tabela/cards com `user_form_submissions_log` (propostas, orçamentos, candidaturas, suporte, cadastros) |
| **Aba 4: Telemetria & Navegação** | Inexistente | Sem histórico de navegação segundo a segundo, dwell time, IP ou VPN | Renderizar trilha cronológica, buscas feitas, IPs, indicador de VPN e dispositivos |
| **Aba 5: E-Commerce & Carrinhos** | Exibe apenas a contagem total de pedidos (`orders.length`) | Sem produtos vistos, sem carrinhos abandonados, sem afinidade | Renderizar lista de produtos vistos, carrinhos abandonados por loja, pedidos detalhados e afinidade (`customer_store_affinity`) |
| **Aba 6: Mobilidade & GPS** | Exibe apenas a contagem de viagens (`mobility_rides.length`) | Sem histórico de rotas, sem tolerância de 3 min e sem status de débito no CPF | Renderizar corridas, eventos de tolerância 3min e saldo de dívida em `customer_debt_ledger` com barreira Zero-Trust |
| **Aba 7: Ações como Operador** | Inexistente | Sem rastreamento de ações em lojas terceiras | Renderizar log corporativo de ações do operador (`employee_tenant_audit_logs`) com CPF, loja, módulo e timestamp |
| **Hash SHA-256 Forense** | Presente na linha 317, porém com classe arbitrária `text-[11px]` | Formatação fora dos tokens de design | Preservar hash imutável com `font-mono text-xs break-all text-primary` e botão de cópia |

### 2.3 Débito Visual Técnico Legado Catalogado (a ser Corrigido no Refactor)

1. **DL-01 (Cores Fora de Token):**
   - Linha 254: `text-amber-600 border-amber-500/30` → Substituir por `text-warning border-warning/30`.
2. **DL-02 (Classes Arbitrárias com Colchetes):**
   - Linhas 201, 205, 210: `text-[10px]` → Substituir por `text-xs font-mono`.
   - Linhas 308, 324, 330, 336, 342: `text-[10px]` → Substituir por `text-xs`.
   - Linha 317, 356: `text-[11px]` → Substituir por `text-xs`.
3. **DL-03 (Espaçamento fora de Múltiplos de 4px):**
   - Linhas 247, 260: `size-3.5` (14px) → Substituir por `size-4` (16px).
4. **DL-14 (Alvos de Toque < 44px):**
   - Linha 229: `SelectTrigger` com `h-8` → Ajustar para `h-11 min-h-11` ou altura ergonômica com padding de toque.
   - Linha 243, 253: `Button size="sm"` com altura 36px → Ajustar para `h-11 min-h-11` ou com targets móveis de 44px.
   - Linha 307: `Button` com `h-6` → Ajustar para `h-11` ou `h-8` no desktop com padding expansivo.
5. **DL-18 (Cores Literais text-white/bg-white):**
   - Linha 205: `bg-info text-white` → Substituir por `bg-info text-info-foreground` ou `bg-primary text-primary-foreground`.
6. **DL-15 (Foco Teclado Ausente):**
   - Botões de ação precisam garantir `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`.

---

## 3. Especificação Arquitetural do Dossiê 360º (R3)

### 3.1 Container do Dossiê: `SheetPage`
- **Componente:** `<SheetPage>` (`src/components/ui/sheet-page.tsx`).
- **Tamanho:** `size="xl"` ou `size="wide"` (largura ideal para acomodar 7 abas e visualização densa de tabelas e telemetria).
- **Cabeçalho:**
  - Título: `Dossiê Forense 360º` (<= 6 palavras).
  - Subtítulo com Nome do Usuário, CPF/Documento e E-mail.
  - Certificação Forense: Card com badge de autenticidade, Hash SHA-256 e botão de copiar hash com feedback sonner.

### 3.2 Estrutura das 7 Abas Operacionais

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ DOSSIÊ FORENSE 360º — [Nome do Usuário] • CPF: [CPF]                        │
│ Hash SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b... [Copiar] │
├─────────────────────────────────────────────────────────────────────────────┤
│ [1. Geral] [2. KYC] [3. Formulários] [4. Telemetria] [5. E-Commerce] [6. Mobilidade] [7. Operador] │
├─────────────────────────────────────────────────────────────────────────────┤
│ (Conteúdo da Aba Ativa)                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Aba 1: Geral & Acessos
- **Cartão de Dados Cadastrais:** Nome Completo, CPF, E-mail, Telefone, WhatsApp, Data de Criação, Último Login, Papel Atual (`role`), Status de Bloqueio.
- **Painel de Redefinição Forçada de Senha:**
  - Campo de input para nova senha + botão "Definir Nova Senha" (chama `adminForceSetUserPassword({ data: { targetUserId, newPassword } })`).
  - Botão de ação rápida "Disparar Magic Link de Recuperação" (chama `adminTriggerPasswordReset({ data: { email } })`).
- **Painel de Bloqueio & Sanções Imediatas:**
  - Switch/Botão "Bloquear Acesso" / "Desbloquear Conta" com modal de justificativa obrigatória (chama `adminToggleUserAccess({ data: { targetUserId, isBlocked, reason } })`).
- **Painel de Titularidade de Lojas:**
  - Lista de lojas vinculadas ao usuário como `owner`.
  - Para cada loja: Botão "Transferir Titularidade" abrindo diálogo com seleção do novo `target_user_id` e recibo forense (chama `adminTransferStoreOwnership`).

#### Aba 2: Documentos & KYC
- **Estado de KYC do Usuário:** Badge com status (`pending`, `approved`, `rejected`, `not_submitted`).
- **Painel de Inspeção Visual (Grid 3 Colunas):**
  - Coluna 1: Selfie com Prova de Vida (`selfie_url`).
  - Coluna 2: Documento Oficial Frente (`document_front_url`).
  - Coluna 3: Documento Oficial Verso (`document_back_url`).
- **Dados do Documento:** Tipo (`cnh`, `rg`, `passaporte`), Número, Data de Envio.
- **Ações Instantâneas de Moderação:**
  - Botão `Aprovar KYC`: Confirma verificação e confere selo de perfil verificado (chama `reviewKycVerification` com `status: "approved"`).
  - Botão `Recusar KYC`: Abre campo para justificativa e notifica usuário (chama `reviewKycVerification` com `status: "rejected"`).

#### Aba 3: Formulários & Cadastros
- **Fonte de Dados:** `user_form_submissions_log`.
- **Tabela / Cards de Submissões:**
  - Tipo de formulário (Proposta Comercial, Orçamento de Serviço, Candidatura a Vaga, Chamado de Suporte, Cadastro de Loja).
  - Rota de origem (ex: `/_store/classificados/123`, `/_store/vagas/456`).
  - Timestamp formatado via `formatDateTime`.
  - IP de origem e badge contextual: `VPN Detectada` (se `is_vpn === true`) ou `Conexão Direta`.
  - Acordeão / Modal para inspecionar os dados preenchidos (`payload_snapshot` higienizado em formato JSON estruturado legível).

#### Aba 4: Telemetria & Navegação
- **Fonte de Dados:** Eventos de telemetria e navegação agregados por sessão.
- **Trilha Cronológica de Navegação:**
  - Linha do tempo segundo a segundo das páginas visitadas.
  - Tempo de permanência na página (`dwell_time_seconds`).
  - Termos de busca digitados na plataforma (histórico de consultas).
  - IPs registrados, Provedor ASN e Cidade/Estado estimada.
  - Indicador de segurança de rede: Badge `VPN / Proxy` ou `IP Residencial`.
  - Resumo de Dispositivos: Sistema Operacional, Navegador e `device_type` (Mobile / Desktop).

#### Aba 5: E-Commerce & Carrinhos
- **Fonte de Dados:** `orders`, `user_cart_telemetry`, `customer_store_affinity`.
- **Métricas de Afinidade por Estabelecimento:**
  - Lista de lojas com as quais o cliente interagiu.
  - Para cada loja: Total de Visitas, Adições ao Carrinho, Pedidos Concluídos, Ticket Médio e Nível de Afinidade (`Lead`, `Visitante`, `Comprador`, `Fã`, `VIP`).
- **Carrinhos Ativos e Abandonados:**
  - Produtos adicionados, variações, quantidades, valor total e tempo desde a última modificação.
- **Histórico de Compras:**
  - Pedidos finalizados com ID, data, status e valor em R$ (`formatMoney(total_cents)`).

#### Aba 6: Mobilidade & GPS
- **Fonte de Dados:** Corridas de mobilidade, telemetria de tolerância e `customer_debt_ledger`.
- **Registro de Dívidas & Calotes no CPF (`customer_debt_ledger`):**
  - Card em destaque: Status de Inadimplência (Sem Pendências vs Dívida Ativa no CPF).
  - Valor total em atraso (R$).
  - Serviços bloqueados pela barreira Zero-Trust (`mobility_rides`, `food_delivery`, `marketplace_shipping`).
  - Botão de auditoria Master: "Liquidar Dívida Manualmente" ou "Ignorar Registro".
- **Histórico de Viagens & Entregas:**
  - Origem, Destino, Distância, Condutor responsável, Status e Valor.
- **Eventos de Tolerância de 3 Minutos:**
  - Registros em que o motorista chegou ao ponto de embarque e aguardou o tempo limite de 3 minutos via GPS sem o comparecimento do passageiro.

#### Aba 7: Ações como Operador
- **Fonte de Dados:** `employee_tenant_audit_logs`.
- **Objetivo:** Rastreabilidade corporativa total de colaboradores operando empresas terceiras.
- **Tabela de Ações Operacionais:**
  - Empresa operada (`store_name`, `store_id`).
  - Módulo manipulado (ex: `pdv`, `estoque`, `financeiro`, `pedidos`, `catalogo`).
  - Ação disparada (ex: `venda_balcao_liquidada`, `ajuste_manual_estoque`, `pedido_cancelado`, `preco_alterado`).
  - Dados forenses: IP da operação, User-Agent, Data e Hora exatas.

---

## 4. Especificação da Rota Civil "Minha Atividade" (R4)

### 4.1 Definição da Rota
- **Arquivo a Criar:** `src/routes/_store.conta.atividade.tsx`
- **URL TanStack Router:** `/conta/atividade`
- **Declaração:**
  ```tsx
  export const Route = createFileRoute("/_store/conta/atividade")({
    head: () => ({ meta: [{ title: "Minha Atividade | Waesy" }] }),
    loader: async () => {
      const data = await getMyActivityHistory().catch(() => null);
      return { activity: data || FALLBACK_ACTIVITY };
    },
    component: CustomerActivityPage,
    errorComponent: ActivityErrorFallback,
  });
  ```

### 4.2 Arquitetura Visual (Apple Privacy & Google My Activity)

1. **Header Canônico Apple HIG:**
   - `<NativeBackButton fallbackHref="/conta" />`
   - Título da página: `<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Minha Atividade</h1>` (<= 6 palavras).
   - Botão secundário de exportação ou ajuda LGPD.

2. **Card Institucional de Privacidade & Transparência:**
   - Card minimalista com borda sutil (`bg-card border border-border/60 rounded-lg p-5`).
   - Ícone de escudo (`ShieldCheck` com `size-5 text-primary`).
   - Mensagem direta de governança: declaração explícita de que os dados pertencem unicamente ao usuário civil, são armazenados de forma criptografada e auditáveis conforme a LGPD (Lei 13.709/2018).

3. **Pílulas de Filtragem Tátil por Categoria:**
   - Lista horizontal com rolagem e alvos táteis de 44px (`h-11 px-4 rounded-lg`):
     - `Todas` (Geral)
     - `Buscas` (Consultas e pesquisas no diretório)
     - `Anúncios & Produtos` (Visualizações de classificados e vitrines)
     - `Carrinhos & Pedidos` (Interações comerciais)
     - `Formulários` (Propostas, orçamentos e candidaturas enviadas)
     - `Dispositivos` (Logins e sessões ativas)

4. **Linha do Tempo Cronológica Agrupada:**
   - Agrupamento temporal inteligente: "Hoje", "Ontem", "Esta Semana", "Mês Passado".
   - Cada item da timeline é renderizado em um card canônico com:
     - Ícone da categoria de ação (`Search`, `Eye`, `ShoppingBag`, `FileText`, `Smartphone`).
     - Título descritivo da ação (ex: "Buscou por 'pizzaria napolitana'", "Visualizou o anúncio 'Civic 2022'").
     - Metadados: Horário exato (`15:42`), tempo relativo ("Há 30 minutos"), Cidade/Estado da conexão, Dispositivo utilizado.

5. **Matriz Obrigatória de 4 Estados:**
   - **Estado de Dados:** Timeline fluida com itens agrupados.
   - **Estado de Carregamento:** Cartões com `Skeleton` estruturado espelhando o formato dos itens (`motion-reduce:animate-none`).
   - **Estado Vazio:** `<EmptyState icon={Activity} title="Nenhuma atividade encontrada" description="Não há registros de atividades nesta categoria até o momento." />`
   - **Estado de Erro:** `<ErrorState title="Atividade Indisponível" description="Não foi possível carregar seu histórico de atividades no momento." onRetry={...} />`

### 4.3 Integração no Menu Principal da Conta (`src/routes/_store.conta.index.tsx`)
No arquivo `src/routes/_store.conta.index.tsx`, adicionar entrada na constante `ACCOUNT_GROUPS`:
```tsx
// Dentro do grupo "Atividades" ou "Segurança":
{
  to: "/conta/atividade",
  label: "Minha Atividade",
  icon: Activity,
}
```
Isso garante descoberta natural pelo usuário final sem quebras de navegação.

---

## 5. Matriz de Conformidade com Design Lint & Gates de Aceite

Para garantir aprovação com **Zero Violações P0 e Zero Violações P1** na catraca `node scripts/design-lint.mjs --ratchet`:

| Regra | Requisito Normativo | Padrão Obrigatório na Implementação | Exemplo Errado (Proibido) | Exemplo Correto (Obrigatório) |
| :--- | :--- | :--- | :--- | :--- |
| **DL-01** | Proibido hex/rgb fora de token | Usar classes utilitárias semânticas de cor | `text-[#d97706]`, `bg-[#ffffff]` | `text-warning`, `bg-card`, `bg-background` |
| **DL-02** | Proibido classes com colchetes arbitrários | Usar escala tipográfica e espaçamento canônicos | `text-[10px]`, `w-[320px]`, `p-[11px]` | `text-xs font-mono`, `w-80`, `p-3` |
| **DL-03** | Grade modular de 4px | Proibido half-steps (0.5, 1.5, 2.5, 3.5) | `size-3.5`, `p-3.5`, `gap-2.5` | `size-4`, `p-4`, `gap-3`, `gap-2` |
| **DL-04** | Proibido `!important` ou `!bang` | Especificidade limpa via Tailwind | `!h-11`, `!font-bold`, `!important` | `h-11 font-bold` |
| **DL-07** | Proibido sombras em superfícies | Usar borda de 1px em vez de sombras em cards | `shadow-md`, `shadow-lg` | `border border-border/60 shadow-none` |
| **DL-08** | Proibido gradientes decorativos | Superfícies planas limpas | `bg-gradient-to-r from-blue-500` | `bg-card`, `bg-muted/40` |
| **DL-09** | Escala canônica de raios | Permitidos: `none`, `sm`, `md`, `lg`, `full` | `rounded-xl`, `rounded-2xl`, `rounded-[14px]` | `rounded-lg`, `rounded-md`, `rounded-full` |
| **DL-14** | Alvo tátil mínimo de 44x44px | Todo botão, link ou controle com `h-11 min-h-11` | `<Button size="sm" className="h-8">` | `<Button className="h-11 min-h-11 px-4">` |
| **DL-15** | Foco teclado obrigatório | Todo controle interativo com anel de foco | `<button onClick={...}>` sem focus ring | `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none` |
| **DL-18** | Proibido `text-white`/`bg-white` | Usar tokens semânticos | `text-white`, `bg-white`, `bg-black` | `text-primary-foreground`, `text-foreground`, `bg-background` |
| **DL-19** | Título com no máximo 6 palavras | Títulos objetivos de tela | `<h1>Gestão Global Unificada de Todos os Usuários</h1>` | `<h1>Usuários</h1>`, `<h1>Minha Atividade</h1>` |
| **DL-23** | Zero Emojis na interface | Substituir por ícones Phosphor ou Lucide | `<p>Sucesso! 🎉</p>` | `<p className="flex items-center gap-1"><CheckCircle2 className="size-4" /> Sucesso</p>` |
| **DL-25** | No máximo 1 ação primária por tela | Apenas 1 botão com `variant="default"` sólido | Dois botões `variant="default"` na mesma linha | Um `variant="default"` e os demais `variant="outline"` |
| **DL-26** | Animações <= 300ms | Duração máxima de 200-300ms | `duration-500`, `duration-1000` | `duration-200`, `duration-300`, `motion-reduce:animate-none` |
| **DL-27** | Proibido `transition-all` | Especificar propriedade animada | `transition-all` | `transition-colors`, `transition-opacity`, `transition-transform` |
| **DL-29** | Guardas de janela em grids | Prefixar grids >= 3 colunas com breakpoints | `grid-cols-3`, `grid-cols-4` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |

---

## 6. Mapeamento de Contratos BFF (com `admin-360-governance.functions.ts`)

O time de BFF (Explorer 2 / Worker M2) fornecerá as seguintes Server Functions, que serão consumidas diretamente pelas rotas de UI:

```typescript
// Contratos esperados pela UI:

// 1. Obtenção do Dossiê Completo no Master Admin
export const getUserFull360Activity = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => { ... });

// 2. Redefinição Forçada de Senha
export const adminForceSetUserPassword = createServerFn({ method: "POST" })
  .validator(z.object({ targetUserId: z.string().uuid(), newPassword: z.string().min(6) }))
  .handler(async ({ data }) => { ... });

// 3. Bloqueio e Desbloqueio Imediato
export const adminToggleUserAccess = createServerFn({ method: "POST" })
  .validator(z.object({ targetUserId: z.string().uuid(), isBlocked: z.boolean(), reason: z.string().min(3) }))
  .handler(async ({ data }) => { ... });

// 4. Transferência de Titularidade de Loja
export const adminTransferStoreOwnership = createServerFn({ method: "POST" })
  .validator(z.object({ storeId: z.string().uuid(), newOwnerUserId: z.string().uuid(), reason: z.string().min(5) }))
  .handler(async ({ data }) => { ... });

// 5. Histórico Transparente para o Usuário Civil
export const getMyActivityHistory = createServerFn({ method: "GET" })
  .validator(z.object({ filter: z.string().optional(), limit: z.number().default(50) }))
  .handler(async ({ data }) => { ... });
```

---

## 7. Roteiro Passo a Passo para o Implementador (Worker)

1. **Passo 1: Criar a rota civil `src/routes/_store.conta.atividade.tsx`:**
   - Implementar `Route.createFileRoute("/_store/conta/atividade")` com loader chamando `getMyActivityHistory()`.
   - Adicionar Header com `NativeBackButton fallbackHref="/conta"`.
   - Adicionar Card explicativo de privacidade e LGPD.
   - Adicionar abas/filtros por pílula com alvos de toque `h-11 min-h-11`.
   - Adicionar lista cronológica agrupada e matriz de 4 estados completa (Loading Skeleton, Empty State, Error State, Data).
2. **Passo 2: Indexar no Menu da Conta:**
   - Adicionar link `/conta/atividade` em `ACCOUNT_GROUPS` em `src/routes/_store.conta.index.tsx`.
3. **Passo 3: Refatorar `src/routes/admin-master.usuarios.tsx`:**
   - Substituir `getUser360Dossier` por `getUserFull360Activity` (ou enriquecer o snapshot recebido).
   - Expandir o `SheetPage` para conter o componente `<Tabs>` com as 7 abas operacionais (Geral, KYC, Formulários, Telemetria, E-Commerce, Mobilidade, Operador).
   - Implementar as ações funcionais de redefinição de senha (`adminForceSetUserPassword`), Magic Link (`adminTriggerPasswordReset`), bloqueio imediato (`adminToggleUserAccess`) e transferência de empresas (`adminTransferStoreOwnership`).
   - Integrar visualizador de KYC com botões de aprovação/rejeição instantânea chamando `reviewKycVerification`.
   - Corrigir todas as violações legadas de design lint no arquivo (`size-3.5` → `size-4`, `text-[10px]` → `text-xs font-mono`, `text-amber-600` → `text-warning`, alvos táteis `h-11 min-h-11`).
4. **Passo 4: Verificação Determinística:**
   - Executar `node scripts/design-lint.mjs --ratchet` garantindo **Zero Violações P0 e Zero Violações P1**.
   - Garantir total observância às regras B.4, B.8 e B.22 de `AGENTS.md`.

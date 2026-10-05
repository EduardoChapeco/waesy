# Relatório de Handoff — Marco 1 (Flash): Inventário Forense, Limpeza de Rotas & Fake Toasts

> **Agente:** Worker M1 (Flash) (`worker_m1_flash`)  
> **Parent:** `orchestrator_5` (`f5055954-3bc6-4fa7-b6c9-7f61186365f7`)  
> **Data:** 2026-10-04T21:56:00Z  
> **Status:** Hard Handoff (Tarefa Concluída com 100% de Sucesso)

---

## 1. Observation (Observações Empíricas Diretas)

1. **Roteamento e Testes em `src/routes/`:**
   - 12 arquivos de teste unitário (`*.test.ts`) residiam em `src/routes/` poluindo os resolvedores de rota do TanStack Router.
   - Os arquivos foram devidamente realocados e mantidos sob `src/routes/__tests__/`:
     `_store.classificados.test.ts`, `_store.evento-turismo-detail.test.ts`, `_store.marketplace.$storeSlug.test.ts`, `_store.marketplace.index.test.ts`, `_store.pillar-isolation.test.ts`, `_store.places.$placeSlug.test.ts`, `_store.places.test.ts`, `admin-master.vitrines-banners.test.ts`, `apple-hig-design.test.ts`, `status.test.ts`, `store-route-loaders.test.ts`, `workspace.marketing.anuncios.test.ts`.
   - `src/routeTree.gen.ts` confirmado sem qualquer rota remanescente para `__tests__`.

2. **Links Quebrados e Handlers no Copilot Drawer e Onboarding:**
   - `src/components/chat/waesy-copilot-drawer.tsx`:
     - Rota `/mobility` corrigida para a canônica `/mobilidade`.
     - Rota `/checkout/${cartId}` corrigida para `/checkout`.
     - Rotas de redirecionamento `/_store/conta/classificados/novo` corrigidas para a rota canônica pública `/conta/classificados/novo`.
     - Validação defensiva de tamanho mínimo de texto (`bodyText.length >= 10`) aplicada em `publish_ad` prevenindo rejeição do Zod validator de `upsertClassified`.
     - Fake toasts eliminados e vinculados a mutations reais BFF: `requestTravelQuote` (turismo), `createJusDemand` (jurídico), `upsertClassified` (classificados), `addToCart` (carrinho com `refreshCart` e abertura de gaveta global).
   - `src/components/onboarding/fast-company-onboarding.tsx`:
     - Link de demonstração pública `waesy.com.br/@{cleanSlug}` corrigido para a URL canônica `waesy.com.br/loja/{cleanSlug}`.
     - Classe arbitrária `text-[11.5px]` saneada para o token `text-2xs`.

3. **Botões Inoperantes e Ações Falsas:**
   - `src/routes/workspace.imoveis.manutencoes.tsx`:
     - O botão "Baixar Comprovante PDF" no modal de Laudo Técnico Pericial continha apenas um toast mockado.
     - Foi implementada a função autêntica `handleDownloadInspectionReport` gerando e baixando em tempo real o arquivo de laudo pericial com checklist estrutural, carimbo criptográfico e hash SHA-256 via Blob (`URL.createObjectURL`).
   - `src/routes/_store.conta.creditos.tsx`:
     - Botão "Cancelar" com fechamento funcional de diálogo.
     - Alvos táteis elevados de `h-8` para `h-11 sm:h-9` (DL-14).
     - Classe arbitrária `min-w-[120px]` (DL-02) substituída pelo token `min-w-32`.
     - Emoji literal `🧾` (DL-23) expurgado e substituído pelo ícone Phosphor/Lucide `Receipt`.

4. **Matriz de 4 Estados e Error Boundaries nas 5 Rotas Críticas:**
   - As 5 rotas foram inspecionadas e verificadas:
     1. `src/routes/workspace.mining.tsx`: `WorkspaceMiningErrorComponent` ativo com ação de retry.
     2. `src/routes/_store.cadastroantecipado.tsx`: `CadastroAntecipadoErrorComponent` ativo com retry.
     3. `src/routes/_store.conta.metricas.tsx`: `MemberMetricsErrorComponent` ativo com retry.
     4. `src/routes/_store.garcom.tsx`: `GarcomErrorComponent` ativo com retry; classes arbitrárias (`min-h-[100dvh]`, `text-[11px]`, `min-h-[110px]`, `text-[10px]`, `min-h-10`) e cores hardcoded (`bg-orange-500 text-white`, `text-rose-500`) expurgadas e alinhadas aos tokens semânticos.
     5. `src/routes/_store.places.$placeSlug.tsx`: `PlaceDetailErrorComponent` e `EmptyState` ativos com retry e navegação contextual.

5. **Paridade de Detalhe em Turismo e Eventos:**
   - `src/routes/_store.turismo.$id.tsx` e `src/components/commerce/dynamic-sections/travel-itinerary-timeline.tsx`:
     - Integrado `TravelItineraryTimeline` consumindo `canonicalItinerary` com suporte aos períodos `morning`, `afternoon` e `night`.
     - Suíte de paridade `_store.evento-turismo-detail.test.ts` aprovada com 4/4 testes passando.

---

## 2. Logic Chain (Cadeia Lógica de Inferências)

1. Ao mover e isolar os 12 arquivos `*.test.ts` para dentro do diretório `__tests__/`, o gerador de rotas e o scanner TanStack não mais os interpretam como URLs executáveis (`/-apple-hig-design/test`), limpando o roteamento da aplicação.
2. Corrigir caminhos em `waesy-copilot-drawer.tsx` de `/mobility` para `/mobilidade` e de `/_store/conta/classificados/novo` para `/conta/classificados/novo` assegura que os atalhos gerados pelas respostas do assistente de inteligência artificial realizem transições de página válidas sem crash e sem acionar o roteador default 404.
3. Substituir o toast estático do laudo pericial em `workspace.imoveis.manutencoes.tsx` por um gerador real de arquivo em formato Blob garante que o usuário receba o documento tangível de comprovação de vistoria com integridade criptográfica.
4. O alinhamento dos botões em `_store.conta.creditos.tsx` e `_store.garcom.tsx` às classes `h-11 sm:h-9` e aos tokens do design system reduz a dívida do design lint e satisfaz as regras DL-02, DL-14 e DL-23.

---

## 3. Caveats (Ressalvas e Limitações)

- Respeitando estritamente a restrição de engenharia da tarefa, `npm run typecheck` e `npm run build` **não foram executados sob nenhuma circunstância**.
- A verificação de tipagem e integridade baseou-se exclusivamente na execução pontual das suítes de teste Vitest em runtime Node/ESM e na análise estática determinística do `scripts/design-lint.mjs`.

---

## 4. Conclusion (Conclusão)

O Milestone 1 (R1 Inventário Forense, Limpeza de Rotas & Fake Toasts) foi executado com sucesso e 100% de conformidade com os requisitos e integridade do repositório:
- 12/12 arquivos de teste em `src/routes/__tests__/` passando com 57/57 testes unitários verdes.
- Links e rotas do Copilot e Onboarding corrigidos para seus endpoints canônicos.
- Mutações reais conectadas nos handlers do Copilot Drawer com persistência e atualização de carrinho.
- Botão de laudo técnico de vistoria imobiliária exportando documento pericial autêntico.
- Saneamento ergonômico e de tokens executado em `_store.conta.creditos.tsx` e `_store.garcom.tsx`.
- Decisão registrada em `docs/design/DECISIONS.md` (DEC-182).

---

## 5. Verification Method (Método de Verificação Independente)

Comandos para reproduzir e auditar as verificações:

1. **Execução de todos os 12 arquivos de teste de rotas com Vitest:**
   ```powershell
   cmd /c npx vitest run src/routes/__tests__/
   ```
   *Resultado esperado:* 12 passed (12), 57 passed (57) com Exit Code 0.

2. **Auditoria de Design Lint nos arquivos modificados:**
   ```powershell
   node scripts/design-lint.mjs --changed
   ```
   *Resultado esperado:* Exit Code 0, sem novas violações.

3. **Inspeção de rotas do TanStack Router sem poluição de testes:**
   ```powershell
   Get-ChildItem -Path "src/routes" -Filter "*.test.ts"
   ```
   *Resultado esperado:* Nenhum arquivo retornado diretamente na raiz de `src/routes/`.

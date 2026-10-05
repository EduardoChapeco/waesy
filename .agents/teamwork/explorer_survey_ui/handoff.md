# Handoff Report — Explorer 3: UI & Routes Survey

**Timestamp:** 2026-10-05T04:20:00Z  
**Agent:** Explorer 3 (`explorer_survey_ui`)  
**Type:** Hard Handoff (Investigation & Architecture Survey Complete)  
**Recipient:** Orchestrator (`1806a73b-398b-4f3e-97cd-ac161a06e58f`)

---

## 1. Observation

1. **`src/routes/admin-master.usuarios.tsx` (439 linhas):**
   - O componente atual `AdminUsuariosPage` apenas busca usuários via `listAllUsers()` e fornece dois botões por linha: `Dossiê 360º` (linha 248) e `Sanção` (linha 261).
   - O `SheetPage` do dossiê (linhas 272-374) exibe apenas um hash SHA-256 e 4 contadores simples (`orders.length`, `mobility_rides.length`, `appointments.length`, `terms_acceptances.length`) seguidos da lista de termos aceitos. Não há sistema de abas.
   - A função `handleSendResetPassword` (linhas 97-105) existe no código, mas **nenhum botão** a aciona na interface JSX.
   - Foram observadas violações diretas de design lint no arquivo:
     - Linhas 201, 205, 210, 308, 317, 324, 330, 336, 342, 356: `text-[10px]` e `text-[11px]` (violação DL-02 de classes arbitrárias).
     - Linhas 247, 260: `size-3.5` (violação DL-03 de grade de 4px).
     - Linha 205: `bg-info text-white` (violação DL-18 de cor literal).
     - Linha 254: `text-amber-600 border-amber-500/30` (violação DL-01 de cores fora de token).
     - Linhas 229, 241-263, 307: controles interativos com `h-8`, `h-6` e `size="sm"` abaixo de 44px (violação DL-14).
2. **Rotas de Conta Civil (`src/routes/_store.conta.*.tsx`):**
   - `_store.conta.tsx` (linhas 1-34) atua como barreira de autenticação centralizada redirecionando usuários não autenticados para `/entrar?returnUrl=...`.
   - `_store.conta.index.tsx` (linhas 131-213) organiza o hub de navegação através da estrutura `ACCOUNT_GROUPS`.
   - A rota civil `src/routes/_store.conta.atividade.tsx` **não existe no repositório**.
3. **Padrão de Navegação e Botão Canônico Apple HIG:**
   - O componente `NativeBackButton` (`src/components/ui/native-back-button.tsx`) é o padrão canônico com touch target de 44x44px e micro-afundamento `active:scale-95`.
4. **Catraca de Design Lint (`scripts/design-lint.mjs`):**
   - A execução de `node scripts/design-lint.mjs` confirmou inspeção em 1850 arquivos. O modo `--ratchet` avalia regressões estritas. O projeto possui débito legado congelado em baseline, portanto novas adições não podem introduzir nenhuma nova violação P0 ou P1.

---

## 2. Logic Chain

1. *A partir da Observação 1:* `src/routes/admin-master.usuarios.tsx` necessita de uma reformulação profunda para atender aos requisitos de R3. A estrutura atual em modal monolítico não acomoda a densidade informacional de um dossiê 360º. A substituição por um sistema de 7 abas com `<Tabs>` do Radix dentro do `SheetPage` (`size="wide"`) organizará perfeitamente:
   - Aba 1 (Geral & Acessos): Dados cadastrais, reset forçado de senha, disparo de Magic Link, bloqueio com justificativa e transferência de lojas.
   - Aba 2 (Documentos & KYC): Visualização de fotos e botões de moderação instantânea.
   - Aba 3 (Formulários & Cadastros): Histórico de propostas/orçamentos de `user_form_submissions_log`.
   - Aba 4 (Telemetria & Navegação): Trilha cronológica, dwell time, IP e indicador de VPN.
   - Aba 5 (E-Commerce & Carrinhos): Produtos vistos, carrinhos abandonados de `user_cart_telemetry` e afinidade `customer_store_affinity`.
   - Aba 6 (Mobilidade & GPS): Corridas, tolerância de 3 min e débitos no CPF de `customer_debt_ledger`.
   - Aba 7 (Ações como Operador): Histórico corporativo de `employee_tenant_audit_logs`.
2. *A partir da Observação 1:* O refatoramento deve obrigatoriamente expurgar as violações legadas de `DL-01`, `DL-02`, `DL-03`, `DL-14` e `DL-18` existentes no arquivo, convertendo todos os controles para `h-11 min-h-11`, trocando `size-3.5` por `size-4`, `text-[10px]` por `text-xs font-mono`, e eliminando `text-amber-600` e `text-white`.
3. *A partir da Observação 2:* Para satisfazer o Requisito R4, a criação da nova rota `src/routes/_store.conta.atividade.tsx` declarada com `createFileRoute("/_store/conta/atividade")` herdará automaticamente a segurança de `_store.conta.tsx`.
4. *A partir das Observações 2 e 3:* A nova rota civil deve implementar a linguagem visual Apple Privacy / Google My Activity com `NativeBackButton fallbackHref="/conta"`, card informativo LGPD, pílulas de filtro com altura 44px (`h-11 px-4`), agrupamento temporal por data e a matriz completa de 4 estados (dados, skeleton loading com `motion-reduce:animate-none`, empty state e error state).
5. *A partir da Observação 2:* O arquivo `src/routes/_store.conta.index.tsx` deve ser atualizado para incluir o link `/conta/atividade` na lista `ACCOUNT_GROUPS`, garantindo indexação e descoberta pelo cliente.
6. *A partir da Observação 4:* Aderindo estritamente aos tokens semânticos e às diretrizes DL-01 a DL-30, as novas telas passarão na catraca `node scripts/design-lint.mjs --ratchet` sem regressão.

---

## 3. Caveats

- **Disponibilidade da Camada de Dados e BFF:** A renderização completa dos dados nas 7 abas do Master Admin e na rota civil de atividade depende das tabelas criadas pela migration de R1 (`user_form_submissions_log`, `user_cart_telemetry`, `employee_tenant_audit_logs`, `customer_store_affinity`) e das Server Functions implementadas por R2 em `src/services/admin-360-governance.functions.ts`.
- **Fallbacks Defensivos:** As telas de UI devem implementar fallbacks graciosos e estruturas de dados defensivas (ex: arrays vazios e empty states canônicos) para garantir que não ocorram crashes caso determinadas tabelas ainda não possuam registros para um usuário específico.
- **Não Execução de Build/Typecheck:** Conforme mandatos invioláveis R6 e AGENTS.md, a compilação de produção (`npm run build`) e o typecheck global (`npm run typecheck`) estão sob proibição estrita e serão executados apenas na fase final de deploy/verificação.

---

## 4. Conclusion

O plano de arquitetura de UI e rotas está completamente delineado, documentado e pronto para execução:
1. `src/routes/admin-master.usuarios.tsx` deve ser refatorado implementando o Dossiê 360º com 7 abas funcionais no `SheetPage`, botões com `h-11 min-h-11`, foco teclado `:focus-visible:ring-2 focus-visible:ring-primary`, controles de senha, magic link, bloqueio, transferência e KYC instantâneo, com eliminação de todo o débito visual legado.
2. A rota civil `src/routes/_store.conta.atividade.tsx` deve ser criada sob o padrão Apple Privacy / Google My Activity, com 4 estados e filtros por categoria.
3. O hub `src/routes/_store.conta.index.tsx` deve receber a indexação da nova rota em `ACCOUNT_GROUPS`.
4. Todas as diretrizes visuais garantem zero violações P0/P1 no `scripts/design-lint.mjs`.

O relatório detalhado com especificações completas de código e contratos de dados está gravado em:
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_ui\report.md`

---

## 5. Verification Method

Para verificar de forma independente e determinística as constatações deste relatório:
1. **Inspeção de Código:**
   - Verificar estrutura de `admin-master.usuarios.tsx`: `view_file` linhas 180-270 e 272-374.
   - Verificar ausência de `_store.conta.atividade.tsx`: `find_by_name` com `Pattern: "*_store.conta.atividade*"`.
   - Verificar grupos de navegação em `_store.conta.index.tsx`: `view_file` linhas 130-215.
2. **Linter Visual e Catraca:**
   - Executar: `node scripts/design-lint.mjs --changed` após as modificações de arquivos para certificar zero novas violações.
   - Executar: `node scripts/design-lint.mjs --ratchet` para validação de ausência de regressões na baseline congelada.
3. **Condições de Invalidação:**
   - Qualquer introdução de classes arbitrárias `-[...]`, cores `#hex`/`rgb` hardcoded, alvos interativos < 44px (`h-8`, `h-6`) ou títulos com mais de 6 palavras invalida a conformidade e bloqueará o gate de design lint.

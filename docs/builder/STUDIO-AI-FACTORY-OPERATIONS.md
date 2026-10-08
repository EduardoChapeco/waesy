# Waesy Studio — operação da fábrica de templates por nicho

**Escopo:** primeiro pipeline executável para gerar, auditar, editar e guardar templates de site. Implementação na branch/PR de continuação sobre a `main` atual; a PR #4 já foi mesclada. Isso não significa que migrations ou chaves estejam aplicadas no ambiente publicado.

## O que existe no código

1. **Manifesto canônico Zod** (`src/lib/builder/studio-manifest.ts`): versão do schema, identidade/versão do template, nicho e objetivo, política editorial, slots de assets, blocos canônicos do Omni Registry, status de revisão e provenance. O schema rejeita URLs de imagem em manifestos, CTAs perigosos e configurações/blocos fora do contrato.
2. **3 pilotos** (`studio-pilot-templates.ts`): Gastronomia, Bem-estar/Agendamento e Criador/Curso. Os três são `review_required`; seus placeholders são intencionais e o gate de publicação os bloqueia até serem substituídos por fatos reais.
3. **Factory UI** (`StudioTemplateFactory.tsx`): brief em PT, fatos com rótulo/valor, objetivo, direção visual e seleção de seções; geração e auditoria ficam explícitas, e a pessoa pode aplicar como rascunho ou salvar na biblioteca privada da loja.
4. **Geração server-side** (`studio-template-generation.functions.ts`): autenticação administrativa, limite de payload e rate limit local por loja/usuário, chamada pelo orquestrador IA já existente, parsing JSON e Zod antes de qualquer retorno. O cliente não envia código executável nem pode marcar a própria revisão como concluída.
5. **Biblioteca privada** (`studio-template-library.functions.ts` + migration `20270114000000_studio_template_library.sql`): salvar/listar drafts no tenant, sem acesso direto por browser/anon/authenticated. Só drafts AI não revisados podem ser armazenados por essa API.
6. **Auditoria e publicação**: verificações estáticas de provenance/licença, alt/actions/anchors, placeholders editoriais e orçamento de estrutura/bytes. O gate de publicação continua no backend. Core Web Vitals/Lighthouse não são inferidos da auditoria estática.
7. **Unsplash via API oficial**: picker opt-in apenas em slots explicitamente `decorative-only`; busca, seleção humana, download tracking, hotlink, autoria/creditos e ledger verificado no servidor. Veja `UNSPLASH-API-INTEGRATION.md`.
8. **Preview/renderers**: templates customizados são materializados em uma cópia de Omni AST versionada; a origem fica na página, os `assetRefs` acompanham o Experience Renderer e os créditos aparecem no renderer público.

## Fluxo para uma pessoa usuária

1. Abra o Omni Builder → **Modelos de Página** → **Criar template com IA**.
2. Informe somente os dados que devem ser processados pelo provedor IA configurado no Waesy. Fatos reais são opcionais; sem fatos, mantenha os placeholders para revisão posterior.
3. Gere o draft. Confira status, erros, avisos, schema, copy e a adequação do nicho.
4. **Aplicar como rascunho** copia os blocos para o documento atual; a página passa a ser editável e a origem/versão fica marcada.
5. Complete fatos/copy, links locais, formulários e mídia. Imagens de produto, pessoa, estabelecimento e profissional devem ser assets fornecidos pelo negócio, não fotos Unsplash genéricas.
6. **Salvar na biblioteca** conserva o manifesto original na loja. Edits posteriores da página não mutam silenciosamente o template salvo.
7. Só publique quando o gate voltar sem findings bloqueantes; revisar alertas editoriais, licença, contraste, responsividade, performance real, formulários e conteúdo no preview.

## Configuração de ambiente e banco

- Aplicar as migrations versionadas usando o fluxo normal de schema do projeto:
  - `20270114000000_studio_template_library.sql`
  - `20270114010000_unsplash_studio_selection_ledger.sql`
- Não há migration aplicada automaticamente por este código nem confirmação de deploy/produção nesta mudança.
- Para Unsplash, configurar `UNSPLASH_ACCESS_KEY` como secret **privado** do backend/worker. Opcionalmente configurar `UNSPLASH_APP_NAME` com o nome registrado da aplicação para os links de referral. Não usar prefixos `VITE_`; não escrever valores em `.env.example`, logs, relatórios, HTML ou source maps.
- Antes de habilitar em produção comercial, registrar o app no Unsplash, validar termos/diretrizes vigentes e confirmar com a equipe/API da Unsplash as condições comerciais adequadas para um SaaS. A implementação não substitui review/aprovação de app.
- Sem migration ou chave, drafts IA ainda podem ser gerados/aplicados; salvar/carregar biblioteca precisa da tabela. Picker Unsplash deve apresentar estado de não configurado e não adiciona a imagem se tracking ou ledger falhar. A publicação de uma página sem assets Unsplash não depende do ledger.

## Comandos de verificação

```bash
npm run typecheck
npm exec -- vitest run src/lib/builder/studio-contract.test.ts src/lib/builder/studio-template-audit.test.ts src/lib/builder/unsplash-api.test.ts --reporter=dot
npm run audit:studio-templates
npm test -- --reporter=dot
npm run build
```

A auditoria atual inclui 12 templates. Os 3 pilotos permanecem com falhas de conteúdo enquanto têm `[[PLACEHOLDERS]]`; isso é intencional e publicável só após preenchimento/revisão, não um resultado de qualidade pronto. O CLI sai com erro somente quando um manifesto já marcado `ready` reprova; todos os 12 do catálogo atual ainda requerem revisão humana.

## Limites e próximos incrementos

- Rate limits atuais da geração/busca são por processo em memória, não distribuídos entre workers; substituir por quota atômica (KV/DB) antes de alto tráfego.
- A auditoria é estática; adicionar Playwright/axe/Lighthouse em preview real, screenshot diffs e budgets medidos antes de escalar a quantidade de templates.
- A biblioteca atual isola drafts por `store_id` e limita o payload; ainda faltam workflow editorial multiusuário, aprovação/versionamento de published templates, tags/preview thumbnail, rollback de versões, busca facetada e analytics por instalação/conversão.
- Unsplash ledger valida as referências de fotos escolhidas na loja; é uma verificação de integração/provenance, não uma decisão jurídica nem um mecanismo geral de direitos para todos os fornecedores/uploads.
- Não gerar milhares de páginas automaticamente. Criar variantes com fixtures, revisão visual/editorial e dados de uso; promover a `ready` somente com evidência.

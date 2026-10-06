# SPEC-WAESY-STUDIO-LIBRARY — Builder visual, biblioteca e IA modular

## 0. Metadados

- **ID:** SPEC-WAESY-STUDIO-LIBRARY
- **Data:** 2026-10-06
- **Status:** EM IMPLEMENTACAO
- **Escopo:** Omni Builder, catálogo Studio, assets, motion, templates por nicho e integração do Omni AST com Experience Renderer.

## 1. Missão e não-objetivos

### Missão
Transformar o builder em uma plataforma de composição reutilizável: templates editáveis, seções, componentes, CMS/bindings, motion, assets com origem e agentes de IA que geram mudanças revisáveis.

### Incluído

- Contrato de documento versionado e serializável.
- Registry de componentes e catálogo de templates com taxonomia.
- Instanciação sem duplicar definições e com origem do template.
- Provenance, licença, atribuição, crop e estado de publicação de assets.
- Motion declarativo com fallback e `prefers-reduced-motion`.
- Skills/Knowledge/Tools como camadas separadas para o Agent Builder.
- Critérios de teste, revisão, publicação, rollback e handoff.

### Não incluído nesta onda

- Reescrita total dos componentes dinâmicos legados; a integração usa um adapter compatível e gradual.
- Geração automática de milhares de templates em produção sem revisão/licença.
- Reprodução de runtime privado do Manus, Enter, Wix, Webflow ou Framer.
- Uso genérico de imagens externas copiadas para storage sem contrato de licença.

## 2. Arquitetura canônica

```text
Workspace / Project / Permissions
        ↓
Task Orchestrator → Agent → Skills / Knowledge / Tools
        ↓                         ↓
Document AST ← Component Registry ← CMS / Bindings
        ↓
Template / Asset / Extension Packages
        ↓
Editor = Preview = Public Renderer → Checkpoint → Publish / Rollback
        ↓
Declarative Interaction + Motion + Media Provenance
```

### Contratos obrigatórios

- Documento: `schemaVersion`, IDs estáveis, tipos registrados, props validadas, children e migrações.
- Template: `id`, versão, nicho, objetivo, tags, framework de copy, blocos, slots de assets, dependências e exclusões.
- Asset: provider, source ID/URL, página de origem, creator, attribution, license URL, provenance, crop e relação de derivação.
- Motion: trigger, alvo, efeito, duração, easing, breakpoint e fallback reduzido.
- IA: Agent, Skill, Knowledge, Tool e artefato separados; toda alteração visual deve retornar diff/patch e diagnóstico.

## 3. Requisitos EARS

- **Ubíquo:** O sistema DEVE armazenar documentos e templates com versão explícita.
- **Ubíquo:** O sistema DEVE manter IDs de blocos estáveis e não usar índice como identidade.
- **Evento:** QUANDO um template for aplicado, o sistema DEVE criar uma instância editável, preservar `source_template_id`/versão e não mutar a definição do catálogo.
- **Evento:** QUANDO um asset externo for inserido, o sistema DEVE preservar origem e atribuição conhecidas; SE ausentes, deve marcar `unknown`.
- **Estado:** ENQUANTO o documento estiver em preview, o sistema DEVE impedir alteração do publicado.
- **Estado:** ENQUANTO `prefers-reduced-motion: reduce` estiver ativo, o sistema DEVE reduzir/remover movimento não essencial sem esconder conteúdo.
- **Exceção:** SE um tipo de bloco não estiver registrado, ENTÃO o editor DEVE exibir diagnóstico/fallback seguro e nunca substituí-lo silenciosamente pelo primeiro bloco.
- **Exceção:** SE uma integração não tiver autorização/escopo válido, ENTÃO nenhuma chamada externa DEVE ser executada.

## 4. Biblioteca por nicho e objetivo

O catálogo deve classificar templates por **nicho**, **objetivo**, **estágio do funil**, **tom**, **densidade**, **canal**, **dependências** e **slots de mídia**. Exemplos de objetivos: captura de lead, catálogo, agendamento, autoridade e conteúdo. Cada pacote deve declarar `site-template`, `page-template`, `section/library`, `component`, `asset-pack`, `skill`, `plugin` ou `integration`.

A copy deve ser parametrizada e revisável: problema → promessa → prova → mecanismo → oferta → redução de risco → CTA. Nenhum depoimento, registro profissional, preço, resultado ou credencial deve ser inventado como fato do cliente.

## 5. Fluxo IA seguro

1. Usuário informa objetivo, público, oferta, tom e restrições.
2. Agent seleciona Skill de composição, Knowledge do projeto e Tools autorizadas.
3. Sistema propõe blueprint com seções, ordem, copy slots, CMS bindings e assets necessários.
4. Usuário revisa o blueprint; geração acontece por seleção/patch, não por mutação opaca do documento inteiro.
5. Validator executa schema, acessibilidade, links, assets, motion, dependências e segurança.
6. Preview gera diff visual e checklist de publicação.
7. Publish cria checkpoint e exige confirmação contextual quando a visibilidade for pública.

## 6. Critérios de aceite desta onda

- `npm run typecheck` com exit code 0.
- Suíte do Omni Builder verde.
- Testes verificam catálogo Studio, origem do template, asset unknown/not-ready, motion-safe e lookup estrito.
- Nenhum template novo usa imagem, contato, credential ou depoimento inventado como metadata factual.
- Renderer público mantém motion seguro e não cai para um bloco arbitrário quando o tipo não existe.
- `ExperienceRenderer` aceita diretamente documentos Omni e mantém o contrato legado `nodes`.
- Auditoria automatizada percorre todos os templates do catálogo; erros críticos bloqueiam publicação e avisos permanecem no relatório.
- `npm run audit:studio-templates` gera relatório de qualidade com provenance, acessibilidade e orçamento estático de performance.
- Mudanças registradas no roadmap canônico.

## 7. Backlog priorizado

- **P0:** contrato AST + schemaVersion; registry estrito; Agent/Skills/Knowledge/Tools separados; validação/sanitização.
- **P1:** CMS independente com collections, queries e bindings; publisher com checkpoint/rollback; provenance de assets.
- **P2:** biblioteca por nicho e marketplace interno; canais embed/web; motion avançado; CLI e integrações.
- **P3:** geração em lote com avaliações, aprovação editorial, direitos comerciais e métricas de conversão.

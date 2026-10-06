# Pesquisa comparativa — Manus, Enter Pro/Converge e builders visuais

**Data:** 2026-10-06
**Escopo:** padrões publicamente verificáveis para evoluir o Waesy sem copiar arquitetura privada, identidade ou conteúdo proprietário.

## Conclusão executiva

O padrão reutilizável não é “uma IA mágica que faz tudo”. É a separação entre **orquestrador de tarefas**, **Agent**, **Skills**, **Knowledge**, **Tools/connectors**, **AST/registry visual**, **CMS/bindings**, **assets com proveniência** e **runtime de motion acessível**. O Waesy já possui dois motores visuais — Omni Builder e Experience Renderer — e deve consolidar contratos e catálogos antes de ampliar recursos.

## Fatos públicos úteis

- **Manus:** a API pública documenta tarefas assíncronas, mensagens de continuação, estados de espera/aprovação, resultados, artefatos, webhooks, conectores OAuth, Skills versionáveis, websites com checkpoints/visibilidade e produção de slides/multimídia. A documentação não revela modelos, planner, runtime ou topologia internos.
- **Enter Pro/Converge:** o Agent Builder documenta o fluxo template → configuração → Skills → Knowledge → teste → publicação, com publicação para web app/embed e integrações de mensageria. O changelog documenta MCP HTTP/SSE, OAuth, chamadas visíveis e Custom Agents. A visão de contexto compartilhado entre braços é posicionamento; a arquitetura técnica completa não é pública.
- **Wix Studio:** separa templates, assets/seções salvas, breakpoints, Site Styles, CMS/datasets e animações por trigger. Templates não copiam tudo; apps, dados transacionais, secrets e scripts podem ficar de fora.
- **Webflow/Framer:** distinguem templates, libraries, componentes, plugins/apps e extensões de código; CMS é collections/records/bindings; componentes têm fontes de verdade e portabilidade distintas; agentes devem operar em seleção delimitada e gerar alterações revisáveis.
- **Unsplash:** para a API, hotlinkar a URL devolvida, manter atribuição ao Unsplash/fotógrafo e distinguir view de download tracking. Focal point, licença e autoria ausentes não podem ser inventados.
- **Padrões técnicos:** AST serializável/versionado, IDs estáveis, migrações testáveis, renderer compartilhado entre editor/preview/publicação, `IntersectionObserver` apenas para efeitos não essenciais, `transform`/`opacity` preferidos e `prefers-reduced-motion` transversal.

## Decisões Waesy

1. Um catálogo Studio adiciona taxonomia e governança sobre `omni-templates`; não duplica a árvore de blocos.
2. Template, instância, asset, Skill, Knowledge, Tool e CMS são entidades separadas.
3. Publicação é um ciclo de vida, não um botão que mistura geração e deploy.
4. Assets externos começam como referências com origem/licença/atribuição; dados ausentes ficam `unknown`.
5. Motion usa vocabulário fechado e `motion-safe`; conteúdo nunca depende de JavaScript ou animação.
6. Tipos desconhecidos não devem cair silenciosamente no primeiro bloco do registry.

## Fontes

- Manus API e ciclo de tarefa: https://manus.im/docs/integrations/manus-api · https://open.manus.im/docs/v2/introduction · https://open.manus.im/docs/v2/task-lifecycle · https://open.manus.im/docs/v2/webhooks-overview · https://open.manus.im/docs/v2/connectors · https://open.manus.im/docs/v2/rate-limits
- Manus Skills, websites, slides e multimídia: https://manus.im/docs/features/skills · https://open.manus.im/docs/v2/website · https://manus.im/docs/features/slides · https://manus.im/docs/features/multi-modal
- Enter/Converge: https://converge.ai/enter/blog/how-to-build-with-enter-agent-builder · https://converge.ai/enter/features/ai-agent-builder · https://converge.ai/enter/blog/enters-changelog · https://converge.ai/ · https://converge.ai/enter/blog/enter-pro-is-now-part-of-converge-ai
- Wix Studio: https://support.wix.com/en/article/wix-studio-about-the-studio-editor · https://support.wix.com/en/article/wix-studio-custom-templates · https://support.wix.com/en/article/studio-editor-saving-and-reusing-design-assets · https://support.wix.com/en/article/studio-editor-about-animations
- Webflow/Framer: https://help.webflow.com/hc/en-us/articles/44650915153811-Webflow-component-type-overview · https://help.webflow.com/hc/en-us/articles/33961307099027-Intro-to-the-Webflow-CMS · https://help.webflow.com/hc/en-us/articles/33961398704915-Webflow-Marketplace-overview · https://www.framer.com/help/articles/how-to-use-agents/ · https://www.framer.com/help/articles/issues-with-code-components-accessing-the-cms/
- Assets e motion: https://unsplash.com/documentation · https://help.unsplash.com/api-guidelines/guideline-attribution · https://spec.c2pa.org/specifications/specifications/1.0/specs/C2PA_Specification.html · https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API · https://web.dev/articles/animations-guide · https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion

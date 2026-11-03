# 20 — Divergências entre Documentação e Código Real

| Item | Afirmação em Documentos Legados | Realidade Verificada no Código | Resolução Adotada |
| :--- | :--- | :--- | :--- |
| **Status da Loja** | Documentação mencionava coluna `stores.status = 'active'`. | A tabela `stores` utiliza a coluna booleana `is_active boolean`. | Corrigido em `surface-cms.functions.ts` e testado. |
| **Builder Livre vs Controlado** | Menções antigas sugeriam "editor livre estilo Wix Studio". | O código real implementa estritamente CMS visual modular com árvore de blocos e sem coordenadas absolutas. | Documentado formalmente na DEC-429 e DEC-430. |
| **Exclusão de Páginas** | Documentação antiga previa modal de confirmação. | Regra B.8 do AGENTS.md proíbe `confirm()` nativo para ações reversíveis. | Substituído por exclusão direta com feedback por toast de desfazer. |
| **Integração WhatsApp** | Testes antigos assumiam que formulários exigiam WhatsApp. | Formulários de captura do builder possuem persistência nativa via CRM interno. | Alinhado na suíte de testes `no-fake-fallbacks.test.tsx`. |

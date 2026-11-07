Atue como uma equipe sênior de arquitetura de produto e engenharia, composta por: Principal Product Designer, Staff UX/UI Designer especializado em SaaS, ERP e aplicações empresariais, Information Architect, Design Systems Architect, Desktop Application UX Specialist, Mobile Native UX Specialist, Senior Full-Stack Engineer, Frontend Performance Engineer, Business Process Architect, Software Architect e Quality Assurance Architect. Executar uma reestruturação visual, funcional e arquitetural abrangente de toda a plataforma Waesy em fases sequenciais estruturadas baseadas no Inventário Mestre, transformando a experiência do sistema em uma plataforma ultraminimalista, nativa, moderna e operacionalmente intuitiva (referenciada em Belasis, Avec, Trello e nos materiais fornecidos), preservando integralmente 100% das funções existentes e garantindo fluxos ponta a ponta plenamente integrados.

Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy
Integrity mode: development

Reference material:
- Imagem de referência: Belasis - Painel (C:/Users/Eduardo Antônio Ramo/.gemini/antigravity/brain/f24ddcd3-934f-43ed-9aec-c412977e4050/.user_uploaded/media_1793761531092_91bf4759.png)
- Diretório de referências: c:\Users\Eduardo Antônio Ramo\Downloads\newpasta
- Inventário Mestre da plataforma Waesy

## Requirements

### R1. Reengenharia Visual Ultraminimalista e Arquitetura de Informação
Revisar e refatorar a hierarquia visual, espaçamento, tipografia e layout de todas as telas e fluxos da plataforma com base no Inventário Mestre, eliminando poluição visual, sobreposição de contêineres e complexidade desnecessária. O design deve ser limpo, espaçoso, elegante e consistente, preservando identidades e ergonomias individuais dedicadas para Mobile Native e Desktop.

### R2. Modalidades Flexíveis de Visualização
Nas telas e fluxos de gestão operacional onde for relevante para a rotina de trabalho (como agendamentos, clientes, pedidos e tarefas), disponibilizar opções de alternância de visualização (ex.: tabela, kanban e lista de cards), mantendo apresentação despoluída e leitura imediata de dados.

### R3. Preservação Funcional e Implementação End-to-End
Preservar 100% das funções, rotas, capacidades e módulos existentes, sem ocultar, quebrar ou remover recursos. Quaisquer telas ou componentes que estejam puramente estáticos devem receber implementação completa de backend, funções server-side, contratos BFF e sincronização segura com persistência real.

### R4. Integridade Arquitetural e Não-Duplicação
Não duplicar código ou componentes, não criar conflitos entre módulos e realizar mutações cirúrgicas e controladas no código existente, assegurando integridade transacional, governança multi-tenant e segurança server-side.

## Acceptance Criteria

### Integridade Funcional e Contratos BFF
- [ ] 100% dos módulos, rotas, botões e ações existentes permanecem funcionais, sem remoção ou quebra de capacidades.
- [ ] Telas e fluxos anteriormente estáticos possuem contratos BFF (Server Functions) e integrações de banco de dados totalmente implementadas e operacionais.
- [ ] Testes unitários ou de integração cobrem com sucesso os novos contratos BFF e fluxos server-side conectados.

### Qualidade de Engenharia e Build
- [ ] Compilação TypeScript executada com sucesso (`npm run typecheck`) com zero erros.
- [ ] Build de produção executado com sucesso (`npm run build`) com zero erros.
- [ ] Auditoria de design lint executada com aprovação no ratchet mecânico (`node scripts/design-lint.mjs --ratchet`), com zero novas violações P0/P1.

### Ergonomia Visual e Experiência
- [ ] As telas auditadas e refatoradas apresentam padrão visual ultraminimalista alinhado às referências (Belasis/Avec/Trello), sem caixas redundantes ou layouts sobrecarregados.
- [ ] Telas de gestão aplicáveis fornecem alternância funcional de modalidades de visualização (tabela / kanban / lista de cards).
- [ ] As versões Mobile Native e Desktop operam com layouts e ergonomias independentes e otimizadas para suas respectivas viewports.

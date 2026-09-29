# Domain Theories Reference Catalog (40+ Frameworks em 10 Domínios)

> **Princípio:** Um requisito excelente não surge do vácuo. Ele se ancora em teorias consolidadas de psicologia, economia comportamental, design de interação e engenharia de software para entregar valor de BigTech.

---

## 1. Produtividade & Gestão de Tempo
1. **GTD (Getting Things Done — David Allen):** Captura confiável, esclarecimento da próxima ação física, organização contextual e revisão semanal.
2. **Técnica Pomodoro (Francesco Cirillo):** Blocos focados de 25 min com pausas curtas de 5 min para mitigação de fadiga cognitiva.
3. **Matriz de Eisenhower:** Classificação 2x2 de Urgência × Importância (Fazer, Agendar, Delegar, Eliminar).
4. **Lei de Parkinson:** O trabalho se expande para preencher o tempo alocado para sua conclusão (imposição de prazos curtos e prazos fatais claros).
5. **Timeblocking / Task Batching:** Agrupamento de tarefas cognitivamente homogêneas para erradicação do custo de troca de contexto (*Context Switching Penalty*).

## 2. Mudança de Comportamento & Hábito
6. **Modelo BJ Fogg (B = MAT):** Comportamento ocorre quando Motivação, Habilidade e Gatilho coincidem no mesmo instante.
7. **Atomic Habits (James Clear):** Loop do Hábito (Deixa, Desejo, Resposta, Recompensa) e redução de atrito (Regra dos 2 Minutos).
8. **Teoria da Autodeterminação (Deci & Ryan):** Três necessidades psicológicas básicas: Autonomia, Competência e Pertencimento.
9. **Efeito Zeigarnik:** O cérebro mantém lembranças intrusivas de tarefas inacabadas (utilizado para barras de progresso e onboarding passo a passo).

## 3. Design de Interação, UX & Ergonomia Cognitiva
10. **Lei de Hick-Hyman:** O tempo de decisão aumenta logaritmicamente com o número e complexidade de opções (limitação de escolhas por tela).
11. **Lei de Fitts:** O tempo para alcançar um alvo é função da distância e do tamanho do alvo (botões primários na *Thumb Zone* inferior de 44px).
12. **Princípios da Gestalt:** Proximidade, Similaridade, Continuidade, Fechamento e Figura-Fundo guiando o agrupamento visual de cartões e listas.
13. **Jakob's Law:** Usuários passam a maior parte do tempo em outros sites; interfaces devem espelhar padrões universais conhecidos (Apple HIG, iFood, WhatsApp).
14. **10 Heurísticas de Nielsen:** Visibilidade do status, correspondência com o mundo real, controle do usuário e recuperação de erros.

## 4. E-commerce, Varejo & Conversão
15. **6 Princípios da Persuasão (Robert Cialdini):** Reciprocidade, Escassez, Autoridade, Consistência, Afinidade e Prova Social.
16. **Sobrecarga de Escolha (Barry Schwartz — O Paradoxo da Escolha):** Menos opções aumentam a taxa de conversão final e a satisfação pós-compra.
17. **Efeito Chamariz (Decoy Effect / Dan Ariely):** Introdução de uma terceira opção assimétrica para guiar a escolha em direção ao plano de maior valor.
18. **Aversão à Perda (Kahneman & Tversky):** A dor da perda é psicologicamente duas vezes mais intensa que o prazer do ganho.

## 5. Segurança da Informação & Engenharia de Dados
19. **Zero Trust Architecture (NIST SP 800-207):** Nunca confie, sempre verifique. Autenticação e autorização explícitas a cada requisição.
20. **Princípio do Menor Privilégio (PoLP):** Cada ator e serviço acessa exclusivamente os recursos estritamente necessários à sua função.
21. **Defesa em Profundidade (Layered Defense):** Múltiplas camadas de proteção redundantes (Edge ➔ Firewall ➔ BFF ➔ RLS ➔ Criptografia).
22. **RLS Deny-by-Default:** Nenhuma linha do banco é visível a menos que uma política SQL explícita conceda acesso ao tenant do usuário.
23. **Idempotência Transacional:** Operações repetidas produzem o mesmo estado final sem efeitos colaterais duplicados (`idempotency_key`).

## 6. Finanças Comportamentais & Precificação
24. **Teoria dos Prospectos:** Decisões sob risco avaliam ganhos e perdas a partir de um ponto de referência, e não da riqueza absoluta.
25. **Ancoragem de Preços:** O primeiro preço apresentado serve de âncora psicológica para todas as avaliações subsequentes.
26. **Contabilidade Mental (Richard Thaler):** Indivíduos segregam dinheiro em contas mentais subjetivas (alimentação, lazer, urgência).
27. **Integer Cents Mandate:** Moedas são números inteiros (centavos), nunca floats, eliminando erros de arredondamento IEEE 754.

## 7. Logística, Filas & Operações Urbanas
28. **Teoria das Filas (Lei de Little):** $L = \lambda W$ (Itens no sistema = taxa de chegada $\times$ tempo de espera).
29. **Kanban & Gestão de Fluxo (David J. Anderson):** Visualização do trabalho, limitação do Trabalho em Progresso (WIP) e gestão de gargalos.
30. **Last-Mile Delivery SLA:** Janelas de tempo estritas, cálculo de tolerância de portaria e penalidades automáticas por minuto excedente.

## 8. Gamificação & Engajamento Intrínseco
31. **Framework Octalysis (Yu-kai Chou):** 8 Core Drives (Significado Épico, Realização, Empoderamento, Propriedade, Influência Social, Escassez, Imprevisibilidade e Perda).
32. **Estado de Fluxo (Mihaly Csikszentmihalyi):** Equilíbrio ótimo entre o nível de desafio e a habilidade do usuário.
33. **Reforço Intermitente / Recompensas Variáveis (B.F. Skinner):** Recompensas em intervalos imprevisíveis aumentam dramaticamente o engajamento.

## 9. Aprendizagem, Documentação & Redução de Ruído
34. **Cognitive Load Theory (John Sweller):** Três tipos de carga mental (Intrínseca, Germânica e Estrínseca). Elimine a carga estrínseca (ruído visual e textos prolixos).
35. **Taxonomia de Bloom:** Progressão do conhecimento: Lembrar ➔ Compreender ➔ Aplicar ➔ Analisar ➔ Avaliar ➔ Criar.

## 10. Resiliência de Sistemas Distribuídos
36. **Circuit Breaker Pattern (Martin Fowler):** Interrupção de chamadas a serviços com falha contínua para prevenir falha em cascata.
37. **Transactional Outbox & Inbox:** Desacoplamento de persistência local e publicação de eventos assíncronos garantindo entrega *at-least-once*.
38. **Backoff Exponencial com Jitter:** Retentativas de requisição com atraso crescente e ruído aleatório para evitar *Thundering Herd Problem*.
39. **Single Source of Truth (SSOT):** Cada entidade de dado possui exatamente um dono soberano, com réplicas apenas para leitura.
40. **Clean Architecture (Robert C. Martin):** Desacoplamento estrito entre Entidades, Casos de Uso, Adaptadores de Interface e Frameworks.

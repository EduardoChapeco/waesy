---
name: prompt-optimizer
description: "Transform vague prompts into precise, well-structured specifications using EARS (Easy Approach to Requirements Syntax) methodology. This skill should be used when users provide loose requirements, ambiguous feature descriptions, or need to enhance prompts for AI-generated code, products, or documents. Triggers include requests to 'optimize my prompt', 'improve this requirement', 'make this more specific', or when raw requirements lack detail and structure."
---

# Prompt Optimizer — EARS & Domain-Grounded Specification Protocol

> **Missão:** Transformar prompts vagos, declarações ambíguas e descrições soltas de funcionalidades em especificações técnicas rigorosas, normativas e testáveis através da metodologia **EARS (Easy Approach to Requirements Syntax)** combinada com fundamentação teórica de domínio e modelagem BigTech.

---

## 🏛️ O Processo de Otimização em 4 Camadas

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Transformação de Sintaxe EARS                                       │
│    - Converte linguagem descritiva em 5 padrões normativos atômicos    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Fundamentação Teórica de Domínio                                    │
│    - Mapeia o problema para frameworks consolidados (GTD, Fogg, etc.)  │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Extração de Exemplos com Dados Reais                                │
│    - Substitui placeholders por payloads e cenários reais de ponta     │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Geração de Prompt Estruturado (Role / Skills / Workflows / Formats) │
│    - Entrega um artefato executável de alta precisão para agentes e devs│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quando Usar Esta Skill

Ative a skill imediatamente quando:
- O usuário fornecer pedidos curtos ou vagos (ex: *"Crie um sistema de reservas"*, *"Faça um painel financeiro"*).
- Os requisitos não possuírem condições de disparo, gatilhos temporais ou critérios mensuráveis de sucesso.
- Houver risco de esquecimento de fluxos de erro, casos extremos ou regras de negócio implícitas.
- O usuário pedir explicitamente: *"Otimize meu prompt"*, *"Refine esse requisito"*, *"Torne isso mais específico"*.

---

## ⚡ Fluxo de Trabalho de Otimização em 6 Etapas

### Etapa 1: Diagnóstico do Requisito Original
Identificar e classificar os 4 vícios clássicos de requisitos informais:
1. **Excessivamente Abrangente:** *"Adicionar autenticação"* ➔ Falta política de senha, MFA, expiração de sessão e RLS.
2. **Gatilhos Ausentes:** *"Enviar notificações"* ➔ Falta definir exatamente quando, por qual canal e com qual tolerância.
3. **Ações Ambíguas:** *"Interface fácil de usar"* ➔ Ausência de métricas de usabilidade, zonas de polegar ou WCAG 2.2.
4. **Restrições Ocultas:** *"Processar pagamentos"* ➔ Ausência de idempotência, PCI-DSS, estornos e moedas inteiras (cents).

### Etapa 2: Aplicação da Sintaxe EARS
Converter cada frase em um dos **5 Padrões Normativos do EARS** (consulte [`references/ears_syntax.md`](references/ears_syntax.md)):
- **Ubíquo (Sempre ativo):** `The system shall <action>`
- **Orientado a Eventos (Gatilho pontual):** `When <trigger>, the system shall <action>`
- **Impulsionado por Estado (Condição contínua):** `While <state>, the system shall <action>`
- **Condicional / Opcional:** `If <condition>, the system shall <action>`
- **Comportamento Indesejado (Defensivo / Erro):** `If <trigger/failure>, the system shall prevent <unwanted action> AND execute <recovery>`

### Etapa 3: Fundamentação em Teorias de Domínio
Cruzar o escopo com 2 a 4 teorias científicas ou de engenharia comprovadas (consulte [`references/domain_theories.md`](references/domain_theories.md)):
- **Produtividade & Gestão:** GTD (David Allen), Pomodoro, Matriz de Eisenhower.
- **Engenharia de Comportamento:** Modelo Fogg (B=MAT), Loop do Hábito (James Clear).
- **Design de Interação:** Leis de Hick & Fitts, Princípios da Gestalt, Nielsen Norman Thumb Zone.
- **Segurança & Dados:** Zero Trust, RLS Deny-by-Default, ACID / RPC atômico.
- **Finanças & Preços:** Ancoragem de Preços, Contabilidade Mental, Integer Cents.

### Etapa 4: Extração de Exemplos com Dados Reais
- Proibição absoluta de placeholders como *"Exemplo 1"*, *"Produto A"*, *"Lorem Ipsum"*.
- Fornecer payloads JSON concretos, nomes de produtos do nicho, valores em BRL e fluxos de erro reais.

### Etapa 5: Estruturação do Prompt Canônico
Montar a especificação completa utilizando a estrutura padrão:
```markdown
# Role
[Especialista sênior do domínio com autoridade executiva]

## Skills
- [Competência central 1 fundamentada em teoria]
- [Competência central 2]

## Workflows
1. [Fase 1: Entrada & Validação]
2. [Fase 2: Processamento Atômico]
3. [Fase 3: Feedback & Persistência]

## Examples
[Cenários de Sucesso, Erro e Casos Extremos com Dados Concretos]

## Formats
[Schema Zod, Migrations SQL, Contratos BFF, Regras CSS e Checklists]
```

### Etapa 6: Apresentação da Otimização
Emitir o resultado estruturado contendo:
1. Requisito Original + Diagnóstico de Fragilidades.
2. Transformação EARS Numerada (`[EARS-1]`, `[EARS-2]`, etc.).
3. Teorias de Domínio Aplicadas.
4. Prompt Aprimorado Completo e Pronto para Execução.

---

## 📚 Biblioteca de Referências da Skill

- [`references/ears_syntax.md`](references/ears_syntax.md): Guia sintático exaustivo dos 5 padrões e regras de transformação.
- [`references/domain_theories.md`](references/domain_theories.md): Catálogo de 40+ teorias mapeadas em 10 domínios industriais.
- [`references/examples.md`](references/examples.md): 4 Casos E2E de transformação (Anti-procrastinação, E-commerce PDP, Redefinição de Senha e Métricas de Vendas).
- [`references/advanced_techniques.md`](references/advanced_techniques.md): Multi-stakeholders, requisitos não-funcionais (NFRs) e lógica booleana complexa.

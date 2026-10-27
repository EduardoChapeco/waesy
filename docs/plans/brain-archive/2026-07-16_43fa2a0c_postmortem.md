# 🕵️ Post-mortem: O Mistério dos 2 Dias

Este documento analisa os problemas técnicos e as falhas de comunicação que atrasaram o desenvolvimento do `hr-shoes-opus` nas últimas 48 horas, e propõe boas práticas de engenharia de prompt para que não se repitam.

---

## 1. O que realmente aconteceu tecnicamente? (A Tempestade Perfeita)

Você enfrentou uma combinação letal de **3 problemas técnicos isolados**, mas que aconteceram ao mesmo tempo. 

### A) O Choque Arquitetural (BFF vs SPA)
No seu projeto antigo (`travelagencias`), o Supabase era chamado diretamente pelo navegador. Isso é fácil, mas menos seguro. Para o `hr-shoes`, você criou um `AGENTS.md` com uma regra de ferro: *"Nenhuma chamada direta ao Supabase no frontend. Use Server Functions (BFF)"*.
A IA obedeceu a regra, mas a autenticação via Servidor (SSR) é muito mais complexa porque depende de manipular `Cookies` entre o servidor e o navegador.

### B) O Bug do Cloudflare Pages (Engine H3)
Ao implementar os cookies de autenticação no servidor, a IA usou o padrão comum do Node.js: `getResponseHeaders().append()`. 
**O problema:** O Cloudflare Pages usa uma engine por baixo dos panos (chamada `H3/Vinxi`) que sofre um *crash* ou ignora silenciosamente esse comando.
**A consequência:** Você fazia o login, o Supabase autenticava, mas o cookie nunca era salvo no seu navegador. Você ficava deslogado eternamente, o que gerou a sensação de que "nada funciona". A solução foi trocar para a função nativa `setCookie` e `setResponseHeader`.

### C) A Pegadinha do Build (Variáveis de Ambiente)
Hoje, quando consertamos o servidor, o navegador quebrou de novo. Por quê? Porque no Cloudflare Pages, as chaves públicas (como a URL do Supabase) precisam ser injetadas dentro do código JavaScript *durante a compilação* (Vite). Como não havia um arquivo `.env.production` explícito, a IA compilou o código "vazio" e subiu para a nuvem. O servidor sabia falar com o banco, mas a tela de cadastro, não.

---

## 2. Por que a IA criou telas "falsas" e "Em breve"?

Aqui entra a parte em que os seus prompts (e as regras do projeto) limitaram a IA.

1. **A Maldição da "Fase 0"**: O seu `MASTER_PLAN.md` definia que a Fase 0 era "Fundação, layout e shells". A IA leu isso e pensou: *"Ok, o Eduardo quer apenas o esqueleto visual agora. Vou colocar telas vazias e botar um aviso de 'Em breve' para preencher depois"*. 
2. **Falta de Especificação de "Ponta a Ponta"**: Quando a IA recebe um comando abrangente como "crie as telas do painel", ela tenta economizar tokens. Se você não exigir explicitamente que ela vá até o banco de dados e crie o SQL, ela fará o caminho mais fácil: *Mocks* (dados simulados).

---

## 3. Como evitar isso nas próximas vezes? (Seu Novo Padrão de Prompts)

Para extrair o máximo de uma IA agêntica, você precisa dar comandos que exijam **verticalidade** (fazer tudo de ponta a ponta) e **evitem ambiguidades**.

> [!TIP]
> **Use Prompts de Integração Total (Vertical Slicing)**
> Nunca peça "Crie a tela X". Peça: *"Implemente o módulo X de ponta a ponta. Crie a tabela SQL se não existir, os tipos Zod, a Server Function no backend e a interface no frontend consumindo a função. Não use mocks, a funcionalidade deve ser real."*

> [!IMPORTANT]
> **Use o comando `/goal` para tarefas complexas**
> Quando você quiser que a IA construa um módulo inteiro sem parar (ex: "Construa todo o fluxo de Carrinho"), use o comando `/goal`. Isso força a IA a não parar de trabalhar até que tudo esteja validado, e evita que ela entregue pedaços incompletos.

> [!WARNING]
> **Lembrete de Infraestrutura**
> Sempre que pedir uma integração nova, adicione no prompt: *"Lembre-se da nossa infraestrutura: Cloudflare Pages (H3), TanStack Start (SSR) e variáveis de ambiente em produção."* Isso força a IA a lembrar dos bugs que acabamos de resolver.

### Exemplo de um Prompt Perfeito para a Próxima Tarefa:
*"Agora vamos fazer o módulo de Clientes. Faça de ponta a ponta. Verifique as migrations SQL. Crie a `customer.functions.ts` usando nossa arquitetura Server-Side (BFF) sem chamar o Supabase direto no cliente. Depois, construa a tabela visual no painel. Garanta que está 100% real e sem usar 'em breve'. Quando terminar, teste o build para ver se não quebramos o Cloudflare Pages."*

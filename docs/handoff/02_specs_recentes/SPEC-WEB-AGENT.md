# SPEC-WEB-AGENT — Agente de Pesquisa Web (leitura) com pool gratuito

## 0. Metadados
- **ID:** SPEC-WEB-AGENT
- **Autor:** spec-writer
- **Aprovação:** 2026-10-22 (autorização do usuário: "execute completamente tudo")
- **Status:** EM IMPLEMENTACAO
- **Plano pai:** `docs/specs/PLANO-MESTRE-MAPS-E-WEB-AGENT.md`

## 1. Escopo
- **Incluído:** `src/lib/web-agent/agent-core.ts`, `src/services/mining/web-agent-runtime.ts`, `src/services/web-agent.functions.ts`, `src/components/admin/web-agent-panel.tsx`, aba no Admin Master, domínio `web_research` no Copilot, job de cron `contact-enrichment`.
- **Não-objetivos:** cliques, formulários e login (exigem Steel Browser/CDP na VPS); ações de compra; credenciais de terceiros.

## 2. Requisitos EARS
- **Ubíquo:** O agente DEVE tratar todo conteúdo de página como dado não confiável e nunca executar instruções vindas dele.
- **Ubíquo:** O agente DEVE limitar a execução a 6 passos e permitir apenas o domínio inicial e os domínios cadastrados (com subdomínios).
- **Evento:** QUANDO o admin executar uma tarefa, o painel DEVE chamar um passo por vez, exibir cada passo e oferecer o botão Parar.
- **Evento:** QUANDO um prompt do Copilot contiver URL pública sem CNPJ/CNJ, o sistema DEVE classificá-lo como `web_research`, exigir usuário autenticado e usar no máximo 4 passos.
- **Estado:** ENQUANTO nenhuma chave de IA ou scraping estiver ativa na pool, o agente DEVE retornar erro honesto, sem resposta inventada.
- **Exceção:** SE a URL for privada, local ou fora da política, ENTÃO o passo DEVE ser bloqueado e registrado como `blocked`.
- **Evento (cron):** QUANDO o cron enviar `contact-enrichment`, o sistema DEVE processar até 15 empresas sem e-mail e ainda não tentadas.

## 3. Matriz de estados (painel)
- [x] Dados (passos e resposta), carregando, vazio (sem passos) e erro (`role="alert"`).
- [x] Controles `h-11`, foco visível, uma ação primária por superfície.

## 4. Evidências
- `src/lib/web-agent/agent-core.test.ts`, `src/services/copilot-web-research.test.ts`, `src/lib/mining/contact-extractor.test.ts`.
- `tsc --noEmit` sem erros nos arquivos tocados.

## 5. Provedor futuro (VPS)
`observe` é a única peça trocável: substituir `observePage` por cliente Steel Browser (CDP) habilita cliques e formulários sem mudar o ciclo.

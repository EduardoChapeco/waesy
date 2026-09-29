---
name: proof-verifier
description: Protocolo estrito de verificação e prova final (Fase K) com testes nos 2 shells, ciclo de ida e volta, console limpo e compilação com 0 erros.
---

# Proof Verifier — Verificação e Prova de Conclusão

## Gatilho
Antes de declarar qualquer correção ou ciclo de auditoria como concluído.

## Quando NÃO Usar
- Durante a execução intermediária antes de aplicar os reparos.

## Entradas
1. Código corrigido e rotas impactadas.
2. Suíte de testes automatizados (`npm test`).
3. Pipeline de build de produção (`npm run build`).

## Saídas
- Relatório de runtime proof com testes 100% aprovados, build exit code 0 e prova nos dois shells.

## Procedimento
1. **Reprodução Original:** Refazer os passos exatos que provocavam a falha e provar que ela não mais ocorre.
2. **Ciclo Completo nos 2 Shells:** Executar a jornada completa tanto no shell mobile quanto no desktop.
3. **Teste de Ida e Volta:** Enviar um ativo, salvar, recarregar a tela, editar e verificar persistência.
4. **Console e Rede Limpos:** Confirmar zero erros não tratados no console e nenhuma requisição HTTP com falha ou 403 inesperado.
5. **Tipagem e Build:** Executar `npm test` e `npm run build` garantindo zero erros de TypeScript e compilação limpa.
6. **Medição de Órfãos:** Checar se a operação gerou registros sem arquivo ou arquivos sem referência.

## Regras Duras
- Nenhuma tarefa é declarada pronta sem passar no build de produção (`npm run build`).
- Proibido assumir que funcionou no mobile sem testar a responsividade e o touch target de 44px.
- Proibido fechar a rodada se houver qualquer regressão em rotas adjacentes.

## Anti-Padrões
- Concluir baseado apenas em visualização estática de código sem executar o runtime.
- Ignorar erros de build assumindo que "é apenas erro de tipagem que não afeta a execução".

## Critério de Pronto
Compilação de produção com Exit Code 0, testes unitários verdes e prova funcional registrada.

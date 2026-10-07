# SPEC-20261006-E2E-MOBILE-HIG-STABILIZATION

## Objetivo

Fechar o ciclo E2E do Waesy com build de produção verificável, host temporário acessível no Sandbox e validação visual mobile-first/desktop sem introduzir runtime de servidor no bundle de boot.

## Requisitos EARS

- **Quando** o bundle de boot for construído, **o sistema deve** excluir `@tanstack/react-start/server` e runtime h3 do grafo client-side.
- **Quando** a aplicação for executada no host HTTP temporário do Sandbox, **o servidor de desenvolvimento deve** aceitar somente o host configurado para a validação desta sessão.
- **Quando** a home pública for aberta em viewport compacta, **o sistema deve** renderizar sem erro de hidratação, overflow horizontal acidental ou controles abaixo de 44px.
- **Quando** a home pública for aberta em viewport expandida, **o sistema deve** renderizar sem erro de hidratação e preservar a hierarquia de navegação/CTA.
- **Enquanto** a auditoria visual for executada, **nenhuma violação nova** deve ser introduzida no baseline congelado.

## Invariantes

1. A resolução de cidade no cliente continua síncrona e usa URL, cookie/localStorage e contexto explícito.
2. O Copilot recebe cidade explícita do payload ou da memória de trabalho, sem depender de request implícito no cliente.
3. `server.allowedHosts` é uma configuração de dev/preview e não altera autenticação, RLS ou contratos BFF.
4. A mudança deve ser limitada a `city-helper`, Copilot, configuração Vite, documentação e testes relacionados.

## Evidências exigidas

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run audit:buttons`
- `npm run lint:design`
- captura/inspeção da home em 375x812 e 1280x720
- relatório de console/hidratação e overflow horizontal

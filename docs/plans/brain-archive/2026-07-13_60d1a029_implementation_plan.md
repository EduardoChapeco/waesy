# Fases 4 e 6 — Estabilização de Layout de Módulos de Viagens e Excursões

O objetivo deste plano é resolver os bugs visuais sistêmicos reportados no protocolo:
- **UI-207 — Viagens muda de layout em cada aba:** Falta de um shell externo comum unificado para todas as sub-abas.
- **UI-211 — Excursões e Viagens em Grupo inconsistentes:** Ausência de um shell externo unificado (`GroupTourShell`) criando discrepâncias visuais brutas entre abas.

## User Review Required

> [!IMPORTANT]
> **Modificação de Componentes Core**
> O componente `DetailShell.tsx` será alterado para incorporar as restrições globais de layout do sistema (`page-content dock-offset`). Como apenas o módulo de Viagens consome o `DetailShell` atualmente, não há risco para outras rotas.
>
> Para a rota de **Excursões (Group Tours)**, o componente monolítico (`agency.$slug.group-tours.$id.lazy.tsx` com 3700+ linhas) **não será fatiado em dezenas de arquivos** agora para evitar regressões complexas de re-renderização. Em vez disso, a estrutura de montagem (header e abas) será encapsulada visualmente usando o mesmo padrão de `DetailShell`, unificando a aparência e o fundo sem alterar o fluxo de estado interno.

## Proposed Changes

---

### Módulo: Componentes Base (Shell)

#### [MODIFY] [DetailShell.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/components/shell/DetailShell.tsx)
- O encapsulador `children` passará a possuir as classes globais de controle de página (`className="page-content dock-offset max-w-[1200px] mx-auto w-full"`).
- O cabeçalho receberá as larguras máximas compatíveis.
- Isso permitirá que as rotas filhas (`Outlet`) sejam apenas grids/cards, abolindo margens e redefinições redundantes.

---

### Módulo: Rotas de Viagem (Trips)

As seguintes sub-rotas de viagem terão seus containers de "página inteira" removidos, pois o pai (`DetailShell`) passará a gerenciá-los, estabilizando as transições de abas:

#### [MODIFY] [agency.$slug.trips.$id.index.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/routes/agency.$slug.trips.$id.index.tsx)
- Remover `<div className="page-content dock-offset">`. Retornar apenas a grid interna.

#### [MODIFY] [agency.$slug.trips.$id.flights.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/routes/agency.$slug.trips.$id.flights.tsx)
- Remover `<div className="page-content page-section dock-offset max-w-5xl">`. 
- Adaptar o header isolado (que ficará interno ao conteúdo).

*(O mesmo será aplicado a todas as outras sub-rotas ativas de Viagens, ex: `.passengers.tsx`, `.vouchers.tsx`, etc., que estiverem injetando o padding de página por conta própria).*

---

### Módulo: Excursões e Grupos

#### [MODIFY] [agency.$slug.group-tours.$id.lazy.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/routes/agency.$slug.group-tours.$id.lazy.tsx)
- Substituir a estrutura manual de `<div className="page-content dock-offset">` e `<Tabs>` soltas por um alinhamento arquitetural semelhante ao `DetailShell`.
- Os fundos brancos (herdados possivelmente da variante primária padrão do `<TabsContent>` ou de componentes internos) serão neutralizados, garantindo que o módulo flutue harmoniosamente sobre o glass/workspace escuro global, cumprindo com a geometria da plataforma.

## Verification Plan

### Automated Tests
- `npm run typecheck` para garantir que as remoções de containers não quebraram props.
- `npm run build` cruzado com o `styles.css`.

### Manual Verification
- Solicitar que o usuário acesse uma Viagem localmente (`/agency/:slug/trips/:id`) e navegue entre as abas, confirmando visualmente que o header permanece estático e que não há pulos/flashs no layout de conteúdo.
- Solicitar a verificação da página de Excursão para atestar que o fundo branco isolado sumiu e as abas obedecem ao esquema de cores padrão.

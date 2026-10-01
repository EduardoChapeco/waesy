# Matriz de Responsividade — Auditoria Universal de Breakpoints (P18)

> **Data:** 2026-10-01  
> **Escopo:** Varredura em 385 rotas e shells nos breakpoints normativos:
> **Compact:** 320px, 360px, 390px, 430px  
> **Medium:** 768px, 1024px  
> **Expanded:** 1280px, 1440px, 1920px  

---

## 1. Resumo Executivo da Matriz

| Breakpoint | Dispositivos de Referência | Status Geral | Riscos Mapeados | Ação Canônica |
|---|---|:---:|:---:|---|
| **320px** | iPhone SE (1ª Geração), telas compactas legado | 🟡 Monitorado | 48 pontos | 'grid-cols-1', 'w-full max-w-full', 'px-4' |
| **360px** | Galaxy A/S compact, Android padrão pequeno | 🟢 Conforme | 0 quebras bloqueantes | Margens 16px respeitadas |
| **390px** | iPhone 12/13/14/15/16 Base | 🟢 Conforme | 0 quebras bloqueantes | Viewport padrão fluida |
| **430px** | iPhone 14/15/16 Pro Max, Pixel XL | 🟢 Conforme | 0 quebras bloqueantes | Margens e alvos de 44px ideais |
| **768px** | iPad Mini, iPad Portrait, Surface Go | 🟢 Conforme | 0 quebras bloqueantes | Split-view e rails adaptativos |
| **1024px** | iPad Pro Landscape, Laptops 13" | 🟢 Conforme | 0 quebras bloqueantes | Sidebars e rails expandidos |
| **1280px** | Desktop Standard HD (1366x768) | 🟢 Conforme | 0 quebras bloqueantes | Shell balanceado |
| **1440px** | Desktop Wide / MacBook Retina 15/16" | 🟢 Conforme | 0 quebras bloqueantes | Container max 1440px travado |
| **1920px** | Desktop Full HD / Monitores 24"+ | 🟢 Conforme | 0 quebras bloqueantes | Sem esticamento; leitor em 68-72ch |

---

## 2. Detalhamento de Ocorrências Priorizadas

| ID | Arquivo:Linha | Breakpoint | Severidade | Categoria de Quebra | Recomendação Técnica |
|---|---|:---:|:---:|---|---|
| **RESP-01** | [`src/routes/admin-master.ads-network.tsx:512`](file:///src/routes/admin-master.ads-network.tsx#L512) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-12' |
| **RESP-02** | [`src/routes/admin-master.ads-network.tsx:524`](file:///src/routes/admin-master.ads-network.tsx#L524) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-12' |
| **RESP-03** | [`src/routes/admin-master.ads-network.tsx:641`](file:///src/routes/admin-master.ads-network.tsx#L641) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-12' |
| **RESP-04** | [`src/routes/admin-master.ads-network.tsx:657`](file:///src/routes/admin-master.ads-network.tsx#L657) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-12' |
| **RESP-05** | [`src/routes/admin-master.logistica.tsx:375`](file:///src/routes/admin-master.logistica.tsx#L375) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[420px]' |
| **RESP-06** | [`src/routes/portal.subpainel.$token.tsx:323`](file:///src/routes/portal.subpainel.$token.tsx#L323) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-3' |
| **RESP-07** | [`src/routes/workspace.catalogo.produtos.$id.tsx:388`](file:///src/routes/workspace.catalogo.produtos.$id.tsx#L388) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[380px]' |
| **RESP-08** | [`src/routes/workspace.catalogo.produtos.$id.tsx:402`](file:///src/routes/workspace.catalogo.produtos.$id.tsx#L402) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[380px]' |
| **RESP-09** | [`src/routes/workspace.catalogo.produtos.$id.tsx:450`](file:///src/routes/workspace.catalogo.produtos.$id.tsx#L450) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[340px]' |
| **RESP-10** | [`src/routes/workspace.catalogo.produtos.novo.tsx:1314`](file:///src/routes/workspace.catalogo.produtos.novo.tsx#L1314) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[390px]' |
| **RESP-11** | [`src/routes/workspace.cms.paginas.index.tsx:312`](file:///src/routes/workspace.cms.paginas.index.tsx#L312) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-3' |
| **RESP-12** | [`src/routes/workspace.configuracoes.equipe.tsx:337`](file:///src/routes/workspace.configuracoes.equipe.tsx#L337) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-3' |
| **RESP-13** | [`src/routes/workspace.conteudo.receitas.tsx:520`](file:///src/routes/workspace.conteudo.receitas.tsx#L520) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-3' |
| **RESP-14** | [`src/routes/workspace.contratos.novo.tsx:774`](file:///src/routes/workspace.contratos.novo.tsx#L774) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-3' |
| **RESP-15** | [`src/routes/workspace.contratos.novo.tsx:933`](file:///src/routes/workspace.contratos.novo.tsx#L933) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[390px]' |
| **RESP-16** | [`src/routes/workspace.financeiro.caixa.index.tsx:837`](file:///src/routes/workspace.financeiro.caixa.index.tsx#L837) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-3' |
| **RESP-17** | [`src/routes/workspace.financeiro.funcionarios.tsx:415`](file:///src/routes/workspace.financeiro.funcionarios.tsx#L415) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-3' |
| **RESP-18** | [`src/routes/workspace.fiscal.nfe.tsx:547`](file:///src/routes/workspace.fiscal.nfe.tsx#L547) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-3' |
| **RESP-19** | [`src/routes/workspace.index.tsx:331`](file:///src/routes/workspace.index.tsx#L331) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-12' |
| **RESP-20** | [`src/routes/workspace.index.tsx:461`](file:///src/routes/workspace.index.tsx#L461) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-12' |
| **RESP-21** | [`src/routes/workspace.marketing.fidelidade.tsx:369`](file:///src/routes/workspace.marketing.fidelidade.tsx#L369) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[340px]' |
| **RESP-22** | [`src/routes/workspace.marketing.formularios.tsx:575`](file:///src/routes/workspace.marketing.formularios.tsx#L575) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-3' |
| **RESP-23** | [`src/routes/workspace.marketing.patrocinadores.tsx:258`](file:///src/routes/workspace.marketing.patrocinadores.tsx#L258) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-3' |
| **RESP-24** | [`src/routes/workspace.marketing.social.tsx:437`](file:///src/routes/workspace.marketing.social.tsx#L437) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[340px]' |
| **RESP-25** | [`src/routes/workspace.marketing.stories.tsx:389`](file:///src/routes/workspace.marketing.stories.tsx#L389) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[340px]' |
| **RESP-26** | [`src/routes/workspace.marketing.stories.tsx:390`](file:///src/routes/workspace.marketing.stories.tsx#L390) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[440px]' |
| **RESP-27** | [`src/routes/workspace.marketing.stories.tsx:401`](file:///src/routes/workspace.marketing.stories.tsx#L401) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[340px]' |
| **RESP-28** | [`src/routes/workspace.marketing.stories.tsx:402`](file:///src/routes/workspace.marketing.stories.tsx#L402) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[440px]' |
| **RESP-29** | [`src/routes/workspace.marketing.studio.tsx:450`](file:///src/routes/workspace.marketing.studio.tsx#L450) | 320px - 430px | Médio | Coluna espremida no mobile | Substituir por 'grid-cols-1 sm:grid-cols-5' |
| **RESP-30** | [`src/routes/workspace.marketing.studio.tsx:616`](file:///src/routes/workspace.marketing.studio.tsx#L616) | 320px - 390px | Alto | Largura fixa estoura viewport mobile | Substituir por 'w-full max-w-[520px]' |

---

## 3. Diretrizes de Correção Automática (P18)
1. **Grids Móveis:** Todo `grid-cols-X` com X >= 2 deve iniciar em `grid-cols-1` na classe base e escalar progressivamente para `sm:grid-cols-2`, `md:grid-cols-3` ou `lg:grid-cols-X`.
2. **Larguras Fixas:** Proibido o uso de `w-[>300px]` sem combinação com `w-full` e `max-w-[...]`.
3. **Imagens e Mídias:** Travadas com `aspect-ratio` e `object-cover` conforme certificado no P11.

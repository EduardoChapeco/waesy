# Visão Geral da Transição para o Viaja Design System

Reestruturamos toda a interface interna e administrativa do portal (Dashboards, CRM, Cotações e Kanbans) para refletir de forma rigorosa as especificações exigidas no PRD `Viaja Design System v1.0`, garantindo a mesma unidade estética das páginas webview voltadas para o cliente final.

## 1. Fundação e Design Tokens
O legado visual focado em "CloudBlock" (e suas variáveis complexas de HSL e Sombras) foi inteiramente extirpado da plataforma:

1. **`index.css` Refatorado**: Foi unificado. Absorveu as especificações limpas de `viaja-public.css` (Cores Hex, Radius, Tipografia). O Dark Mode legadofoi expurgado.
2. **`tailwind.config.ts`**: Agora se apoia dinamicamente nos tokens puros da UI (`bg-vj-bg`, `text-vj-txt`, `text-[13px]`, `border-vj-border`), permitindo estilização declarativa livre de tons abstratos.

## 2. Refatoração do App Shell
O `AppLayout` (Painel do Agente) foi reconstruído do zero para adotar a arquitetura Minimalista proposta no Artigo 3.1 do PRD:

- **Sidebar Excluída**: O Drawer lateral, típico de sistemas genéricos de terceiros, foi removido.
- **TopBar Limpa (50px)**: A nova barra fixa superior absorveu os indicadores de sessão no lado direito (Nome, E-mail, Organização e Status).
- **Tabs Horizontais (Zona 2)**: Introduzimos os links fundamentais (Painel, Kanban, Cotações, Clientes, Guias e Hotéis) dentro de pílulas visuais no centro da Topbar simulando abas de navegador minimalistas.

## 3. Substituição do "Shadcn Genérico"
Para evitar que componentes pré-fabricados vazassem o layout antigo (sombras pesadas, bordas redondas finas):
- **Botões (`Button`)**: Foram adaptados ao token `--r` (100px - pílula), cores saturadas com sombras removidas e pesos de fontes restritos (Bold para call-to-actions, Outline leve para secundários).
- **Inputs & Textareas**: Padronizaram-se com Height `42px`, Border 1px `var(--border)` e Outline verde suavemente marcado durante o estado `:focus-visible`.
- **Cards e Bento (`Card`)**: As estruturas de cartões do Shadcn perderam classes de sombra (`shadow-md`) e foram equipadas com os arredondamentos corretos (`var(--r)`) e fundos puramente brancos.

## 4. Atualização Inter-módulos (Regex Transpilador)
Rodamos um pipeline de conversão interno atuando diretamente no código fonte de todos os painéis internos (*QuotationList, Kanban, Client CRM*) para buscar centenas de hardcodings de layout (cores `cb-*`, alertas genéricos) transpilando-os para o novo ecossistema `vj-*`.

Isso certificou que todas as páginas, não importando quão legadas, adotaram o layout bento em **100% da plataforma sem quebrar o TypeScript (`npm build` confirmado com 0 erros)**.

> [!TIP]
> **Toda interface (Pública e Privada) compartilha a mesma paleta, animações padrão ("fade-in") e ausência de ruídos visuais. O CRM agora é belo e utilitário.**

# Apple Design System Skill (Local copy for Worker M2)
Source: .agents/skills/apple-design/SKILL.md

1. Operação Silenciosa & Sem Ruído (Apple HIG)
2. Touch targets >= 44x44px (`h-11 min-h-11`) no mobile (<640px)
3. Elevação em camadas: Level 0 (bg-background), Level 1 (bg-card border-border/80), Level 2 (backdrop-blur-md bg-background/95), Level 3 (Sheet/Modal)
4. Transições curtas sem jitter: active:scale-95, cubic-bezier, sem smooth scroll global
5. Acessibilidade WCAG 2.2 AA: contraste >= 4.5:1, focus-visible:ring-2 focus-visible:ring-primary
6. Bottom Sheets com grab handle no mobile em vez de dialogs centrados.

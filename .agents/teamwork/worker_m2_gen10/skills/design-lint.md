# Design Lint Skill (Local copy for Worker M2)
Source: .agents/skills/design-lint/SKILL.md

Execução e auditoria determinística automatizada de regras visuais DL-01 a DL-30 por leitura de código.
- Zero tolerância para violações P0 e P1 introduzidas.
- Ratchet mecânico: `node scripts/design-lint.mjs --ratchet` deve passar com Exit Code 0 e diminuir o débito técnico.

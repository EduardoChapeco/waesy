# Regras de Segurança & Guardrails de Sistema (File Manager Safety)

> **Princípio:** Nenhuma operação de sistema de arquivos deve comprometer a integridade do sistema operacional, credenciais de segurança ou o histórico de versionamento do repositório.

---

## 1. Diretórios Proibidos (Blacklist Universal)

Qualquer tentativa de mutação, exclusão ou movimentação que envolva os seguintes caminhos deve ser rejeitada imediatamente com erro fatal:

### Ambientes Linux / macOS / Unix:
- `/System` e `/Library` (Proteção SIP da Apple)
- `/usr`, `/usr/bin`, `/usr/sbin`, `/usr/lib`
- `/bin`, `/sbin`, `/lib`, `/lib64`
- `/etc` (Arquivos de configuração do host)
- `/dev`, `/proc`, `/sys` (Sistemas de arquivos virtuais do kernel)
- `/root`, `/var/root` (Diretório do superusuário)

### Ambientes Windows:
- `C:\Windows`, `%WINDIR%`, `%SYSTEMROOT%`
- `C:\Program Files`, `C:\Program Files (x86)`
- `C:\System Volume Information`, `C:\$Recycle.Bin`
- `C:\Recovery`, `C:\bootmgr`, `C:\Boot`

---

## 2. Proteção de Repositório & Credenciais do Workspace

Em qualquer workspace de desenvolvimento ou aplicação:
- **Proteção do Git:** É proibido manipular diretamente ou deletar arquivos dentro da pasta `.git/`.
- **Proteção de Segredos:** Bloqueio de cópia desprotegida ou movimentação pública de arquivos `.env`, `.env.local`, `*.pem`, `*.key`, `id_rsa`.
- **Prevenção de Path Traversal:** Qualquer entrada contendo sequências relativas de escape como `../` ou `..\\` deve ser canonicamente resolvida contra o diretório base permitido antes de qualquer operação.

---

## 3. Protocolo de Confirmação & Dry-Run Mandatório

1. **Dry-Run Inicial:** Todas as operações que afetam mais de 1 arquivo devem primeiro gerar um plano estruturado na memória e apresentá-lo ao operador.
2. **Listagem Explícita de Deleção:** Antes de deletar, a lista completa de arquivos deve ser exibida.
3. **Resolução de Conflito de Destino:**
   - Opção 1: Abortar (padrão seguro).
   - Opção 2: Sobrescrever (exige confirmação explícita informando tamanho e timestamp).
   - Opção 3: Renomear automaticamente adicionando sufixo (ex: `relatorio_1.pdf`).

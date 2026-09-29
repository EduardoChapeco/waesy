import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  validatePathSafety,
  categorizeFileByExtension,
  planBatchOrganization,
  planBulkRename,
  formatPreOperationPreview,
  formatPostOperationSummary,
} from '@/lib/file-manager';

describe('Skill file-manager & Safe Batch Operations Engine', () => {
  describe('Path Safety & Guardrails Enforcement', () => {
    it('accepts safe relative and local workspace paths', () => {
      const safePaths = [
        'workspace/documents/relatorio.pdf',
        'downloads/images/banner.png',
        'src/components/ui/button.tsx',
        'uploads/2026/09/nota-fiscal.pdf',
      ];

      for (const p of safePaths) {
        const res = validatePathSafety(p);
        expect(res.isSafe, `Path "${p}" should be safe`).toBe(true);
        expect(res.reason).toBeUndefined();
      }
    });

    it('rejects paths targeting forbidden Linux/Unix system directories', () => {
      const forbiddenUnix = [
        '/System/Library/CoreServices',
        '/usr/bin/python3',
        '/bin/sh',
        '/etc/passwd',
        '/dev/null',
        '/root/.ssh',
      ];

      for (const p of forbiddenUnix) {
        const res = validatePathSafety(p);
        expect(res.isSafe, `Path "${p}" should be blocked`).toBe(false);
        expect(res.reason).toContain('diretório protegido do sistema');
      }
    });

    it('rejects paths targeting forbidden Windows system directories', () => {
      const forbiddenWin = [
        'C:\\Windows\\System32\\cmd.exe',
        'c:\\program files\\node\\node.exe',
        'C:\\Program Files (x86)\\Steam',
        'C:\\System Volume Information',
      ];

      for (const p of forbiddenWin) {
        const res = validatePathSafety(p);
        expect(res.isSafe, `Path "${p}" should be blocked`).toBe(false);
        expect(res.reason).toContain('diretório protegido do sistema');
      }
    });

    it('blocks path traversal attempts (../ and ..\\)', () => {
      const traversalPaths = [
        '../outside/secret.txt',
        'subfolder/../../etc/shadow',
        'uploads/..\\..\\windows\\system32',
      ];

      for (const p of traversalPaths) {
        const res = validatePathSafety(p);
        expect(res.isSafe, `Path "${p}" should trigger path traversal error`).toBe(false);
        expect(res.reason).toContain('path traversal');
      }
    });

    it('blocks mutations targeting .git, .env or private key files', () => {
      const sensitiveFiles = [
        '.git/config',
        '.git/HEAD',
        '.env',
        '.env.production',
        'certificates/server.key',
        'keys/id_rsa',
      ];

      for (const p of sensitiveFiles) {
        const res = validatePathSafety(p);
        expect(res.isSafe, `Path "${p}" should be protected`).toBe(false);
        expect(res.reason).toContain('arquivo crítico de repositório/segurança');
      }
    });

    it('rejects empty or whitespace-only paths', () => {
      const res = validatePathSafety('');
      expect(res.isSafe).toBe(false);
      expect(res.reason).toContain('não pode ser vazio');
    });
  });

  describe('File Taxonomy & Extension Categorization', () => {
    it('correctly maps file extensions into canonical categories', () => {
      expect(categorizeFileByExtension('documento.pdf')).toBe('Documents');
      expect(categorizeFileByExtension('planilha.xlsx')).toBe('Documents');
      expect(categorizeFileByExtension('foto.jpg')).toBe('Images');
      expect(categorizeFileByExtension('vetor.svg')).toBe('Images');
      expect(categorizeFileByExtension('gravacao.mp4')).toBe('Videos');
      expect(categorizeFileByExtension('filme.mkv')).toBe('Videos');
      expect(categorizeFileByExtension('podcast.mp3')).toBe('Audio');
      expect(categorizeFileByExtension('backup.zip')).toBe('Archives');
      expect(categorizeFileByExtension('pacote.tar.gz')).toBe('Archives');
      expect(categorizeFileByExtension('app.tsx')).toBe('Code');
      expect(categorizeFileByExtension('schema.json')).toBe('Code');
      expect(categorizeFileByExtension('desconhecido.xyz123')).toBe('Others');
      expect(categorizeFileByExtension('sem_extensao')).toBe('Others');
    });
  });

  describe('Batch Organization Planning (Dry-Run Generator)', () => {
    it('creates an accurate batch plan and separates known files from skipped items', () => {
      const files = [
        'relatorio1.pdf',
        'relatorio2.pdf',
        'foto1.png',
        'video1.mp4',
        'backup.zip',
        'script.ts',
        'desconhecido.bin',
        'outro.dat',
      ];

      const plan = planBatchOrganization(files);

      expect(plan.totalMove).toBe(6);
      expect(plan.totalSkip).toBe(2);
      expect(plan.countsByCategory.Documents).toBe(2);
      expect(plan.countsByCategory.Images).toBe(1);
      expect(plan.countsByCategory.Videos).toBe(1);
      expect(plan.countsByCategory.Archives).toBe(1);
      expect(plan.countsByCategory.Code).toBe(1);
      expect(plan.countsByCategory.Others).toBe(2);
    });
  });

  describe('Bulk Rename Planning & Collision Detection', () => {
    it('plans bulk rename with pattern replacement', () => {
      const files = ['foto_old_01.jpg', 'foto_old_02.jpg', 'documento.pdf'];
      const plan = planBulkRename(files, 'old', 'new');

      expect(plan.totalRenamed).toBe(2);
      expect(plan.hasCollisions).toBe(false);
      expect(plan.items[0].newName).toBe('foto_new_01.jpg');
      expect(plan.items[1].newName).toBe('foto_new_02.jpg');
      expect(plan.items[2].newName).toBe('documento.pdf');
    });

    it('detects name collision if replacement results in duplicate targets', () => {
      const files = ['item_a.txt', 'item_b.txt'];
      // replacing _a or _b with empty string yields duplicate 'item.txt'
      const plan = planBulkRename(files, /_[ab]/, '');

      expect(plan.hasCollisions).toBe(true);
      expect(plan.items[1].hasCollision).toBe(true);
    });
  });

  describe('Canonical Output Formatters', () => {
    it('formats pre-operation preview exactly matching the specification', () => {
      const mockPlan = {
        items: [],
        countsByCategory: {
          Documents: 15,
          Images: 23,
          Videos: 0,
          Audio: 0,
          Archives: 0,
          Code: 0,
          Others: 3,
        },
        totalMove: 38,
        totalSkip: 3,
      };

      const preview = formatPreOperationPreview(mockPlan);

      expect(preview).toContain('The following operations will be performed:');
      expect(preview).toContain('- Move 15 document files to Documents/');
      expect(preview).toContain('- Move 23 image files to Images/');
      expect(preview).toContain('- Skip 3 files of unknown type');
      expect(preview).toContain('Confirm?');
    });

    it('formats post-operation summary exactly matching the specification', () => {
      const result = {
        moved: 38,
        skipped: 3,
        errors: 0,
      };

      const summary = formatPostOperationSummary(result);

      expect(summary).toBe(
        ['✓ Complete', '  - Moved: 38 files', '  - Skipped: 3 files', '  - Errors: 0'].join('\n')
      );
    });
  });

  describe('Architectural Governance & Knowledge Integrity', () => {
    const rootDir = process.cwd();

    it('verifies that the primary skill file .agents/skills/file-manager/SKILL.md exists and contains required triggers', () => {
      const skillPath = path.join(rootDir, '.agents', 'skills', 'file-manager', 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);

      const content = fs.readFileSync(skillPath, 'utf8');
      expect(content).toContain('name: file-manager');
      expect(content).toContain('/file-manager');
      expect(content).toContain('The following operations will be performed:');
      expect(content).toContain('Confirm?');
      expect(content).toContain('✓ Complete');
    });

    it('verifies all 4 technical reference manuals exist in references/', () => {
      const refDir = path.join(rootDir, '.agents', 'skills', 'file-manager', 'references');
      expect(fs.existsSync(refDir)).toBe(true);

      const expectedRefs = [
        'safety-rules-and-guardrails.md',
        'batch-organization.md',
        'duplicate-detection.md',
        'bulk-renaming.md',
      ];

      for (const ref of expectedRefs) {
        const refPath = path.join(refDir, ref);
        expect(fs.existsSync(refPath), `Reference file ${ref} must exist`).toBe(true);
        const refContent = fs.readFileSync(refPath, 'utf8');
        expect(refContent.length).toBeGreaterThan(100);
      }
    });

    it('verifies SSOT documentation docs/FILE_MANAGEMENT.md exists and is documented', () => {
      const docPath = path.join(rootDir, 'docs', 'FILE_MANAGEMENT.md');
      expect(fs.existsSync(docPath)).toBe(true);

      const content = fs.readFileSync(docPath, 'utf8');
      expect(content).toContain('Governança de Arquivos');
      expect(content).toContain('Deny-by-Default');
    });

    it('verifies AGENTS.md establishes Rule 32 and lists docs/FILE_MANAGEMENT.md in SSOT table', () => {
      const agentsPath = path.join(rootDir, '.agents', 'AGENTS.md');
      const content = fs.readFileSync(agentsPath, 'utf8');

      expect(content).toContain('docs/FILE_MANAGEMENT.md');
      expect(content).toContain('Regra 32');
      expect(content).toContain('Mandato de Governança de Arquivos, Pastas & Operações em Lote');
    });

    it('verifies bigtech-board skill incorporates file-manager in Persona 3', () => {
      const boardPath = path.join(rootDir, '.agents', 'skills', 'bigtech-board', 'SKILL.md');
      const content = fs.readFileSync(boardPath, 'utf8');

      expect(content).toContain('file-manager');
      expect(content).toContain('anti-traversal');
    });
  });
});

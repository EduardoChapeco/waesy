import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  classifyEarsPattern,
  validateEarsSyntax,
  detectVagueTerms,
  formatEarsStatement,
} from '@/lib/ears-validator';

describe('Skill prompt-optimizer & EARS Methodology Engine', () => {
  describe('EARS Pattern Classification', () => {
    it('classifies Ubiquitous requirements correctly', () => {
      const stmt = 'The system shall store all financial values in integer cents.';
      expect(classifyEarsPattern(stmt)).toBe('ubiquitous');
    });

    it('classifies Event-driven requirements correctly', () => {
      const stmt = 'When the user clicks the checkout button, the system shall validate cart inventory.';
      expect(classifyEarsPattern(stmt)).toBe('event_driven');
    });

    it('classifies State-driven requirements correctly', () => {
      const stmt = 'While the cash register is closed, the system shall reject new POS transactions.';
      expect(classifyEarsPattern(stmt)).toBe('state_driven');
    });

    it('classifies Optional/Conditional requirements correctly', () => {
      const stmt = 'If order total exceeds 20000 cents, the system shall apply free shipping.';
      expect(classifyEarsPattern(stmt)).toBe('optional');
    });

    it('classifies Unwanted Behavior / Defensive requirements correctly', () => {
      const stmt = 'If payment gateway returns timeout, the system shall prevent order status change to paid AND trigger idempotent retry.';
      expect(classifyEarsPattern(stmt)).toBe('unwanted_behavior');
    });

    it('classifies Complex multi-clause requirements correctly', () => {
      const stmt = 'While user is offline, when an action is dispatched, the system shall queue mutation in IndexedDB.';
      expect(classifyEarsPattern(stmt)).toBe('complex');
    });
  });

  describe('Anti-Pattern & Vague Terms Detection', () => {
    it('flags unquantified adjectives', () => {
      const vague = 'The system shall provide a fast and user-friendly interface.';
      const detected = detectVagueTerms(vague);
      expect(detected).toContain('fast');
      expect(detected).toContain('user-friendly');

      const validation = validateEarsSyntax(vague);
      expect(validation.isValid).toBe(false);
      expect(validation.vagueTermsFound.length).toBeGreaterThan(0);
    });

    it('validates clean, quantified EARS statements', () => {
      const clean = 'When user submits registration, the system shall enforce password length >= 8 characters within 200ms.';
      const validation = validateEarsSyntax(clean);
      expect(validation.isValid).toBe(true);
      expect(validation.pattern).toBe('event_driven');
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('EARS Statement Formatting', () => {
    it('formats canonical unwanted behavior statements', () => {
      const formatted = formatEarsStatement({
        pattern: 'unwanted_behavior',
        condition: 'tampered signature is detected in webhook',
        action: 'log security alert',
        prevention: 'execution of payload',
        recovery: 'emit 401 Unauthorized status',
      });

      expect(formatted).toBe(
        'If tampered signature is detected in webhook, the system shall prevent execution of payload AND emit 401 Unauthorized status.'
      );
    });

    it('formats canonical event-driven statements', () => {
      const formatted = formatEarsStatement({
        pattern: 'event_driven',
        trigger: 'table is assigned to customer',
        action: 'open active comanda session with timestamp',
      });

      expect(formatted).toBe(
        'When table is assigned to customer, the system shall open active comanda session with timestamp.'
      );
    });
  });

  describe('Skill Artifacts & References Integrity', () => {
    const skillRoot = path.resolve(process.cwd(), '.agents/skills/prompt-optimizer');

    it('guarantees prompt-optimizer SKILL.md exists with required frontmatter', () => {
      const skillFile = path.join(skillRoot, 'SKILL.md');
      expect(fs.existsSync(skillFile)).toBe(true);
      const content = fs.readFileSync(skillFile, 'utf8');
      expect(content).toContain('name: prompt-optimizer');
      expect(content).toContain('description:');
      expect(content).toContain('EARS');
    });

    it('guarantees all 4 canonical reference files exist and are populated', () => {
      const refs = [
        'ears_syntax.md',
        'domain_theories.md',
        'examples.md',
        'advanced_techniques.md',
      ];

      for (const ref of refs) {
        const refPath = path.join(skillRoot, 'references', ref);
        expect(fs.existsSync(refPath), `Reference missing: ${ref}`).toBe(true);
        const content = fs.readFileSync(refPath, 'utf8');
        expect(content.length).toBeGreaterThan(500);
      }
    });

    it('confirms domain_theories.md covers core BigTech disciplines', () => {
      const theoriesPath = path.join(skillRoot, 'references', 'domain_theories.md');
      const content = fs.readFileSync(theoriesPath, 'utf8');
      expect(content).toContain('GTD');
      expect(content).toContain('Fogg');
      expect(content).toContain('Hick');
      expect(content).toContain('Gestalt');
      expect(content).toContain('Zero Trust');
    });
  });

  describe('AGENTS.md & BigTech Board Governance Integration', () => {
    it('verifies prompt-optimizer integration in AGENTS.md', () => {
      const agentsPath = path.resolve(process.cwd(), '.agents/AGENTS.md');
      const content = fs.readFileSync(agentsPath, 'utf8');
      expect(content).toContain('prompt-optimizer');
      expect(content).toContain('Sintaxe EARS');
      expect(content).toContain('27. **Mandato de Otimização EARS');
    });

    it('verifies EARS optimizer in bigtech-board SKILL.md', () => {
      const boardPath = path.resolve(process.cwd(), '.agents/skills/bigtech-board/SKILL.md');
      const content = fs.readFileSync(boardPath, 'utf8');
      expect(content).toContain('prompt-optimizer');
      expect(content).toContain('EARS');
    });
  });
});

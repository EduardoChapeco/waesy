import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  CANONICAL_THEMES,
  getThemeByIdOrName,
  validateThemeContrast,
  applyThemeToCssVariables,
  generateCustomTheme,
  formatThemeShowcaseMarkdown,
  calculateContrastRatio,
} from '@/lib/theme-factory';

describe('Skill theme-factory & Artifact Styling Engine', () => {
  describe('Canonical 10-Theme Collection', () => {
    it('provides exactly 10 pre-set canonical styling themes', () => {
      expect(CANONICAL_THEMES).toHaveLength(10);
      const expectedIds = [
        'ocean-depths',
        'sunset-boulevard',
        'forest-canopy',
        'modern-minimal',
        'golden-hour',
        'arctic-frost',
        'desert-rose',
        'tech-innovation',
        'botanical-garden',
        'midnight-galaxy',
      ];

      for (const id of expectedIds) {
        const found = CANONICAL_THEMES.find((t) => t.id === id);
        expect(found, `Theme with id "${id}" should exist in collection`).toBeDefined();
        expect(found?.colors.background).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(found?.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(found?.colors.text).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(found?.typography.headingFont).toBeTruthy();
        expect(found?.typography.bodyFont).toBeTruthy();
      }
    });

    it('retrieves themes by ID or localized name case-insensitively', () => {
      expect(getThemeByIdOrName('ocean-depths')?.name).toBe('Profundezas do Oceano');
      expect(getThemeByIdOrName('Profundezas do Oceano')?.id).toBe('ocean-depths');
      expect(getThemeByIdOrName('SUNSET-BOULEVARD')?.id).toBe('sunset-boulevard');
      expect(getThemeByIdOrName('Hora Dourada')?.id).toBe('golden-hour');
      expect(getThemeByIdOrName('galaxia-da-meia-noite')?.id).toBe('midnight-galaxy');
      expect(getThemeByIdOrName('tema-inexistente')).toBeUndefined();
    });
  });

  describe('WCAG 2.2 AA Contrast Compliance', () => {
    it('ensures all 10 canonical themes meet or exceed WCAG 2.2 AA contrast requirements (>= 4.5:1 for body text)', () => {
      for (const theme of CANONICAL_THEMES) {
        const result = validateThemeContrast(theme);
        expect(
          result.passesWcagAa,
          `Theme "${theme.name}" (${theme.id}) text contrast ${result.normalTextRatio}:1 must pass WCAG AA`
        ).toBe(true);
        expect(result.normalTextRatio).toBeGreaterThanOrEqual(4.5);
        expect(result.uiRatio).toBeGreaterThanOrEqual(3.0);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('correctly calculates contrast ratio between black and white (21:1)', () => {
      const ratio = calculateContrastRatio('#ffffff', '#000000');
      expect(ratio).toBe(21);
    });
  });

  describe('CSS Variables Application', () => {
    it('maps theme properties into standardized CSS custom properties', () => {
      const theme = getThemeByIdOrName('ocean-depths')!;
      const cssVars = applyThemeToCssVariables(theme);

      expect(cssVars['--theme-id']).toBe('ocean-depths');
      expect(cssVars['--color-background']).toBe('#0f172a');
      expect(cssVars['--color-primary']).toBe('#0284c7');
      expect(cssVars['--font-heading']).toContain('Plus Jakarta Sans');
      expect(cssVars['--font-body']).toContain('Inter');
      expect(cssVars['--font-code']).toContain('JetBrains Mono');
    });
  });

  describe('On-the-Fly Custom Theme Synthesis', () => {
    it('generates a bespoke custom theme with sanitized id and defaults', () => {
      const custom = generateCustomTheme('Café Especial & Torrefação', {
        colors: {
          background: '#1c1917',
          surface: '#292524',
          primary: '#ea580c',
          secondary: '#f97316',
          accent: '#fdba74',
          text: '#fafaf9',
          textMuted: '#a8a29e',
        },
        typography: {
          headingFont: 'Playfair Display',
          bodyFont: 'Plus Jakarta Sans',
        },
      });

      expect(custom.id).toBe('cafe-especial-torrefacao');
      expect(custom.name).toBe('Café Especial & Torrefação');
      expect(custom.colors.background).toBe('#1c1917');
      expect(custom.colors.primary).toBe('#ea580c');
      expect(custom.typography.headingFont).toBe('Playfair Display');

      const contrast = validateThemeContrast(custom);
      expect(contrast.passesWcagAa).toBe(true);
    });
  });

  describe('Theme Showcase Formatter', () => {
    it('formats a complete Markdown showcase catalog containing all 10 themes', () => {
      const showcase = formatThemeShowcaseMarkdown();

      expect(showcase).toContain('Vitrine de Temas da Fábrica');
      expect(showcase).toContain('ocean-depths');
      expect(showcase).toContain('Profundezas do Oceano');
      expect(showcase).toContain('sunset-boulevard');
      expect(showcase).toContain('midnight-galaxy');
      expect(showcase.split('\n').filter((l) => l.startsWith('|'))).toHaveLength(12); // header + sep + 10 themes
    });
  });

  describe('Architectural Governance & Knowledge Integrity', () => {
    const rootDir = process.cwd();

    it('verifies that the primary skill file .agents/skills/theme-factory/SKILL.md exists and contains required triggers', () => {
      const skillPath = path.join(rootDir, '.agents', 'skills', 'theme-factory', 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);

      const content = fs.readFileSync(skillPath, 'utf8');
      expect(content).toContain('name: theme-factory');
      expect(content).toContain('/theme-factory');
      expect(content).toContain('Profundezas do Oceano');
      expect(content).toContain('Sunset Boulevard');
      expect(content).toContain('Galáxia da Meia-Noite');
    });

    it('verifies all 10 JSON theme specification files exist in themes/', () => {
      const themesDir = path.join(rootDir, '.agents', 'skills', 'theme-factory', 'themes');
      expect(fs.existsSync(themesDir)).toBe(true);

      const expectedThemes = [
        'ocean-depths.json',
        'sunset-boulevard.json',
        'forest-canopy.json',
        'modern-minimal.json',
        'golden-hour.json',
        'arctic-frost.json',
        'desert-rose.json',
        'tech-innovation.json',
        'botanical-garden.json',
        'midnight-galaxy.json',
      ];

      for (const t of expectedThemes) {
        const themeFilePath = path.join(themesDir, t);
        expect(fs.existsSync(themeFilePath), `Theme file ${t} must exist`).toBe(true);
        const parsed = JSON.parse(fs.readFileSync(themeFilePath, 'utf8'));
        expect(parsed.id).toBeTruthy();
        expect(parsed.colors.background).toBeTruthy();
      }
    });

    it('verifies all 4 technical reference manuals exist in references/', () => {
      const refDir = path.join(rootDir, '.agents', 'skills', 'theme-factory', 'references');
      expect(fs.existsSync(refDir)).toBe(true);

      const expectedRefs = [
        'typography-pairings.md',
        'color-palette-harmony.md',
        'theme-application-guide.md',
        'dynamic-theme-generation.md',
      ];

      for (const ref of expectedRefs) {
        const refPath = path.join(refDir, ref);
        expect(fs.existsSync(refPath), `Reference file ${ref} must exist`).toBe(true);
        const refContent = fs.readFileSync(refPath, 'utf8');
        expect(refContent.length).toBeGreaterThan(100);
      }
    });

    it('verifies SSOT documentation docs/THEME_FACTORY.md exists and is documented', () => {
      const docPath = path.join(rootDir, 'docs', 'THEME_FACTORY.md');
      expect(fs.existsSync(docPath)).toBe(true);

      const content = fs.readFileSync(docPath, 'utf8');
      expect(content).toContain('Fábrica de Temas');
      expect(content).toContain('ocean-depths');
      expect(content).toContain('WCAG 2.2 AA');
    });

    it('verifies AGENTS.md establishes Rule 33 and lists docs/THEME_FACTORY.md in SSOT table', () => {
      const agentsPath = path.join(rootDir, '.agents', 'AGENTS.md');
      const content = fs.readFileSync(agentsPath, 'utf8');

      expect(content).toContain('docs/THEME_FACTORY.md');
      expect(content).toContain('Regra 33');
      expect(content).toContain('Mandato da Fábrica de Temas & Estilização de Artefatos');
    });

    it('verifies bigtech-board incorporates theme-factory in Persona 4', () => {
      const boardPath = path.join(rootDir, '.agents', 'skills', 'bigtech-board', 'SKILL.md');
      const content = fs.readFileSync(boardPath, 'utf8');

      expect(content).toContain('theme-factory');
      expect(content).toContain('10 temas');
    });
  });
});

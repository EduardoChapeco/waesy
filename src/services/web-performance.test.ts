import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  auditPerformanceBudget,
  evaluateCoreWebVitals,
  generateSpeculationRules,
  batchDomOperations,
  debounce,
  throttle,
  CANONICAL_PERFORMANCE_BUDGET,
} from '@/lib/web-performance';

describe('Skill web-performance & Core Web Vitals Optimization Engine', () => {
  describe('Performance Budget Auditing', () => {
    it('passes when all assets comply with canonical limits', () => {
      const compliantPage = {
        totalPageKb: 850,
        javascriptKb: 220,
        cssKb: 45,
        heroImageKb: 180,
        fontsKb: 50,
        thirdPartyKb: 90,
      };

      const result = auditPerformanceBudget(compliantPage);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('flags violations when total page or JavaScript exceed budget', () => {
      const heavyPage = {
        totalPageKb: 1800, // > 1500 KB
        javascriptKb: 450, // > 300 KB
        cssKb: 80,
        heroImageKb: 600, // > 500 KB
        fontsKb: 60,
        thirdPartyKb: 100,
      };

      const result = auditPerformanceBudget(heavyPage);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes('Peso total da página'))).toBe(true);
      expect(result.violations.some((v) => v.includes('Bundle JavaScript'))).toBe(true);
      expect(result.violations.some((v) => v.includes('Imagem Hero LCP'))).toBe(true);
    });
  });

  describe('Core Web Vitals Threshold Evaluation', () => {
    it('rates "good" with 100 score for pristine metrics', () => {
      const pristine = {
        lcpMs: 1400, // < 2500ms
        inpMs: 80, // < 200ms
        clsScore: 0.02, // < 0.1
        ttfbMs: 250, // < 800ms
      };

      const result = evaluateCoreWebVitals(pristine);
      expect(result.overallRating).toBe('good');
      expect(result.score).toBe(100);
      expect(result.details.lcp.grade).toBe('good');
      expect(result.details.inp.grade).toBe('good');
      expect(result.details.cls.grade).toBe('good');
      expect(result.details.ttfb.grade).toBe('good');
    });

    it('rates "poor" when LCP or CLS are severely degraded', () => {
      const degraded = {
        lcpMs: 4500, // > 4000ms (poor)
        inpMs: 150,
        clsScore: 0.35, // > 0.25 (poor)
        ttfbMs: 400,
      };

      const result = evaluateCoreWebVitals(degraded);
      expect(result.overallRating).toBe('poor');
      expect(result.score).toBeLessThan(70);
      expect(result.details.lcp.grade).toBe('poor');
      expect(result.details.cls.grade).toBe('poor');
    });
  });

  describe('Speculation Rules Generation', () => {
    it('generates valid Speculation Rules JSON payload for moderate pre-rendering', () => {
      const rules = generateSpeculationRules(['/*', '/workspace/*'], 'moderate');
      expect(rules.prerender).toHaveLength(2);
      expect(rules.prerender[0]).toEqual({
        where: { href_matches: '/*' },
        eagerness: 'moderate',
      });
    });
  });

  describe('Runtime Efficiency & Batching Helpers', () => {
    it('batches reads and writes without layout thrashing', () => {
      let readCount = 0;
      let writeCount = 0;

      const output = batchDomOperations(
        () => {
          readCount++;
          return { height: 100 };
        },
        (data) => {
          writeCount++;
          return data.height + 20;
        }
      );

      expect(output).toBe(120);
      expect(readCount).toBe(1);
      expect(writeCount).toBe(1);
    });

    it('debounces rapid sequential calls', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('a');
      debouncedFn('b');
      debouncedFn('c');

      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(150);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('c');
      vi.useRealTimers();
    });

    it('throttles execution to specified intervals', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn(1);
      throttledFn(2);
      throttledFn(3);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(1);

      vi.advanceTimersByTime(110);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenCalledWith(3);
      vi.useRealTimers();
    });
  });

  describe('CSS & DOM Integration for Performance', () => {
    it('verifies View Transitions and content-visibility in src/styles.css', () => {
      const cssPath = path.resolve(process.cwd(), 'src/styles.css');
      const content = fs.readFileSync(cssPath, 'utf8');
      expect(content).toContain('@view-transition');
      expect(content).toContain('content-visibility: auto');
      expect(content).toContain('contain-intrinsic-size');
    });

    it('verifies Speculation Rules script in src/routes/__root.tsx', () => {
      const rootPath = path.resolve(process.cwd(), 'src/routes/__root.tsx');
      const content = fs.readFileSync(rootPath, 'utf8');
      expect(content).toContain('speculationrules');
      expect(content).toContain('href_matches');
    });
  });

  describe('Skill Artifacts, References and SSOT Integrity', () => {
    const skillRoot = path.resolve(process.cwd(), '.agents/skills/web-performance');

    it('verifies web-performance SKILL.md exists with required thresholds', () => {
      const skillFile = path.join(skillRoot, 'SKILL.md');
      expect(fs.existsSync(skillFile)).toBe(true);
      const content = fs.readFileSync(skillFile, 'utf8');
      expect(content).toContain('name: web-performance');
      expect(content).toContain('Core Web Vitals');
      expect(content).toContain('< 1,5 MB');
    });

    it('verifies all 7 references exist in references/', () => {
      const expectedRefs = [
        'performance-budgets.md',
        'critical-rendering-path.md',
        'image-media-optimization.md',
        'javascript-runtime-efficiency.md',
        'font-loading-strategies.md',
        'caching-cdn-service-workers.md',
        'core-web-vitals-benchmarking.md',
      ];

      for (const ref of expectedRefs) {
        const filePath = path.join(skillRoot, 'references', ref);
        expect(fs.existsSync(filePath), `Missing reference: ${ref}`).toBe(true);
        const text = fs.readFileSync(filePath, 'utf8');
        expect(text.length).toBeGreaterThan(150);
      }
    });

    it('verifies docs/PERFORMANCE.md exists as Single Source of Truth', () => {
      const perfDoc = path.resolve(process.cwd(), 'docs/PERFORMANCE.md');
      expect(fs.existsSync(perfDoc)).toBe(true);
      const content = fs.readFileSync(perfDoc, 'utf8');
      expect(content).toContain('LCP (Largest Contentful Paint)');
      expect(content).toContain('Performance Budget');
    });
  });

  describe('AGENTS.md & BigTech Board Governance Integration', () => {
    it('verifies web-performance integration in AGENTS.md', () => {
      const agentsPath = path.resolve(process.cwd(), '.agents/AGENTS.md');
      const content = fs.readFileSync(agentsPath, 'utf8');
      expect(content).toContain('docs/PERFORMANCE.md');
      expect(content).toContain('web-performance');
      expect(content).toContain('30. **Mandato de Alta Performance Web');
    });

    it('verifies web-performance in bigtech-board SKILL.md', () => {
      const boardPath = path.resolve(process.cwd(), '.agents/skills/bigtech-board/SKILL.md');
      const content = fs.readFileSync(boardPath, 'utf8');
      expect(content).toContain('web-performance');
      expect(content).toContain('LCP <2.5s');
    });
  });
});

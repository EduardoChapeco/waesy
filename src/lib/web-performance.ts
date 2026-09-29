/**
 * Web Performance & Core Web Vitals Optimization Engine
 * 
 * Implements performance budget auditing, Core Web Vitals threshold evaluation (LCP, INP, CLS, TTFB),
 * Speculation Rules generation, layout thrashing prevention helpers, and throttling/debouncing.
 * Reference: .agents/skills/web-performance/SKILL.md
 */

export interface PerformanceBudgetThresholds {
  totalPageKb: number; // default: 1500 KB (1.5 MB)
  javascriptKb: number; // default: 300 KB
  cssKb: number; // default: 100 KB
  heroImageKb: number; // default: 500 KB
  fontsKb: number; // default: 100 KB
  thirdPartyKb: number; // default: 200 KB
}

export const CANONICAL_PERFORMANCE_BUDGET: PerformanceBudgetThresholds = {
  totalPageKb: 1500,
  javascriptKb: 300,
  cssKb: 100,
  heroImageKb: 500,
  fontsKb: 100,
  thirdPartyKb: 200,
};

export interface PageAssetMetrics {
  totalPageKb: number;
  javascriptKb: number;
  cssKb: number;
  heroImageKb: number;
  fontsKb: number;
  thirdPartyKb: number;
}

export interface CoreWebVitalsMetrics {
  lcpMs: number; // Target: < 2500ms
  inpMs: number; // Target: < 200ms
  clsScore: number; // Target: < 0.1
  ttfbMs: number; // Target: < 800ms
  fcpMs?: number; // Target: < 1800ms
  tbtMs?: number; // Target: < 200ms
}

export type VitalsGrade = 'good' | 'needs_improvement' | 'poor';

/**
 * Audits a given page's assets against the strict performance budget.
 */
export function auditPerformanceBudget(
  metrics: PageAssetMetrics,
  customThresholds?: Partial<PerformanceBudgetThresholds>
): {
  passed: boolean;
  violations: string[];
  warnings: string[];
} {
  const budget: PerformanceBudgetThresholds = {
    ...CANONICAL_PERFORMANCE_BUDGET,
    ...customThresholds,
  };

  const violations: string[] = [];
  const warnings: string[] = [];

  if (metrics.totalPageKb > budget.totalPageKb) {
    violations.push(
      `Peso total da página (${metrics.totalPageKb} KB) excedeu o orçamento de ${budget.totalPageKb} KB.`
    );
  } else if (metrics.totalPageKb > budget.totalPageKb * 0.9) {
    warnings.push(`Peso total da página está em 90%+ do orçamento (${metrics.totalPageKb} KB).`);
  }

  if (metrics.javascriptKb > budget.javascriptKb) {
    violations.push(
      `Bundle JavaScript (${metrics.javascriptKb} KB) excedeu o limite de ${budget.javascriptKb} KB. Aplique code-splitting.`
    );
  }

  if (metrics.cssKb > budget.cssKb) {
    violations.push(
      `Folha de estilos CSS (${metrics.cssKb} KB) excedeu o limite de ${budget.cssKb} KB.`
    );
  }

  if (metrics.heroImageKb > budget.heroImageKb) {
    violations.push(
      `Imagem Hero LCP (${metrics.heroImageKb} KB) excedeu ${budget.heroImageKb} KB. Utilize compressão AVIF/WebP responsiva.`
    );
  }

  if (metrics.fontsKb > budget.fontsKb) {
    violations.push(
      `Fontes web (${metrics.fontsKb} KB) excederam ${budget.fontsKb} KB. Utilize WOFF2 Latin subset.`
    );
  }

  if (metrics.thirdPartyKb > budget.thirdPartyKb) {
    violations.push(
      `Scripts de terceiros (${metrics.thirdPartyKb} KB) excederam ${budget.thirdPartyKb} KB.`
    );
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Evaluates Core Web Vitals against Google/W3C thresholds.
 */
export function evaluateCoreWebVitals(metrics: CoreWebVitalsMetrics): {
  overallRating: VitalsGrade;
  score: number; // 0 to 100
  details: {
    lcp: { value: number; threshold: number; grade: VitalsGrade };
    inp: { value: number; threshold: number; grade: VitalsGrade };
    cls: { value: number; threshold: number; grade: VitalsGrade };
    ttfb: { value: number; threshold: number; grade: VitalsGrade };
  };
} {
  const getGrade = (val: number, goodLimit: number, poorLimit: number): VitalsGrade => {
    if (val <= goodLimit) return 'good';
    if (val <= poorLimit) return 'needs_improvement';
    return 'poor';
  };

  const lcpGrade = getGrade(metrics.lcpMs, 2500, 4000);
  const inpGrade = getGrade(metrics.inpMs, 200, 500);
  const clsGrade = getGrade(metrics.clsScore, 0.1, 0.25);
  const ttfbGrade = getGrade(metrics.ttfbMs, 800, 1800);

  const grades = [lcpGrade, inpGrade, clsGrade, ttfbGrade];
  let overallRating: VitalsGrade = 'good';

  if (grades.includes('poor')) {
    overallRating = 'poor';
  } else if (grades.includes('needs_improvement')) {
    overallRating = 'needs_improvement';
  }

  // Calculate score 0-100
  let totalScore = 100;
  if (lcpGrade === 'poor') totalScore -= 30;
  else if (lcpGrade === 'needs_improvement') totalScore -= 15;

  if (inpGrade === 'poor') totalScore -= 25;
  else if (inpGrade === 'needs_improvement') totalScore -= 10;

  if (clsGrade === 'poor') totalScore -= 25;
  else if (clsGrade === 'needs_improvement') totalScore -= 10;

  if (ttfbGrade === 'poor') totalScore -= 20;
  else if (ttfbGrade === 'needs_improvement') totalScore -= 10;

  return {
    overallRating,
    score: Math.max(0, totalScore),
    details: {
      lcp: { value: metrics.lcpMs, threshold: 2500, grade: lcpGrade },
      inp: { value: metrics.inpMs, threshold: 200, grade: inpGrade },
      cls: { value: metrics.clsScore, threshold: 0.1, grade: clsGrade },
      ttfb: { value: metrics.ttfbMs, threshold: 800, grade: ttfbGrade },
    },
  };
}

/**
 * Generates the Speculation Rules JSON payload for instant pre-rendering.
 */
export function generateSpeculationRules(
  routes: string[] = ['/*'],
  eagerness: 'conservative' | 'moderate' | 'eager' = 'moderate'
): { prerender: Array<{ where: { href_matches: string }; eagerness: string }> } {
  return {
    prerender: routes.map((pattern) => ({
      where: { href_matches: pattern },
      eagerness,
    })),
  };
}

/**
 * Eliminates layout thrashing by forcing all DOM reads before writes.
 */
export function batchDomOperations<R, W>(reads: () => R, writes: (readData: R) => W): W {
  const data = reads();
  return writes(data);
}

/**
 * Simple debounce function for rate-limiting costly events (scroll, resize, search input).
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: any = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Simple throttle function to limit execution to at most once per intervalMs.
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number
): (...args: Parameters<T>) => void {
  let lastExec = 0;
  let timer: any = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;

    if (now - lastExec >= intervalMs) {
      lastExec = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastExec = Date.now();
        if (lastArgs) {
          fn(...lastArgs);
        }
        timer = null;
      }, intervalMs - (now - lastExec));
    }
  };
}

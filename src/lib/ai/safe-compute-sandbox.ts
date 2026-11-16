import { isPublicHttpUrl } from "@/lib/mining/contact-extractor";
import { inferLanguageFromPath, normalizeVfsPath, type WorkspaceVfsMap } from "./workspace-vfs";

export interface SafeExpressionToken {
  type: "num" | "id" | "op" | "paren" | "comma";
  value: string;
}

const MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: (x) => Math.abs(x),
  round: (x, d = 0) => {
    const f = 10 ** Math.min(Math.max(Math.trunc(d), 0), 8);
    return Math.round(x * f) / f;
  },
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  sqrt: (x) => {
    if (x < 0) throw new Error("Raiz quadrada de número negativo.");
    return Math.sqrt(x);
  },
  min: (...xs) => Math.min(...xs),
  max: (...xs) => Math.max(...xs),
  pow: (a, b) => a ** b,
  log: (x) => Math.log(x),
};

const MATH_CONSTANTS: Record<string, number> = {
  PI: Math.PI,
  E: Math.E,
};

function tokenizeExpression(expr: string): SafeExpressionToken[] {
  const tokens: SafeExpressionToken[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/\d|\./.test(ch)) {
      let numStr = "";
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        numStr += expr[i++];
      }
      if (!/^\d*(?:\.\d+)?$/.test(numStr) || numStr === ".") {
        throw new Error(`Número inválido na expressão: "${numStr}"`);
      }
      tokens.push({ type: "num", value: numStr });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let idStr = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        idStr += expr[i++];
      }
      tokens.push({ type: "id", value: idStr });
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma", value: ch });
      i++;
      continue;
    }
    if ("+-*/%^".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    throw new Error(`Caractere não permitido em expressão matemática: "${ch}"`);
  }
  return tokens;
}

/**
 * Avaliador matematico AST recursivo descendente 100% livre de `eval` / `new Function`
 * para execucao segura dentro de Cloudflare Workers isolates.
 */
export function evaluateSafeMathExpression(
  expression: string,
  variables: Record<string, number> = {},
): number {
  const tokens = tokenizeExpression(String(expression || "").slice(0, 600));
  if (tokens.length === 0) throw new Error("Expressão matemática vazia.");
  let pos = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const parseExpr = (): number => {
    let left = parseTerm();
    while (peek()?.type === "op" && (peek()?.value === "+" || peek()?.value === "-")) {
      const op = consume().value;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number => {
    let left = parsePower();
    while (
      peek()?.type === "op" &&
      (peek()?.value === "*" || peek()?.value === "/" || peek()?.value === "%")
    ) {
      const op = consume().value;
      const right = parsePower();
      if ((op === "/" || op === "%") && right === 0) {
        throw new Error("Divisão por zero.");
      }
      left = op === "*" ? left * right : op === "/" ? left / right : left % right;
    }
    return left;
  };

  const parsePower = (): number => {
    const base = parseUnary();
    if (peek()?.type === "op" && peek()?.value === "^") {
      consume();
      const exp = parsePower();
      return base ** exp;
    }
    return base;
  };

  const parseUnary = (): number => {
    if (peek()?.type === "op" && peek()?.value === "-") {
      consume();
      return -parseUnary();
    }
    if (peek()?.type === "op" && peek()?.value === "+") {
      consume();
      return parseUnary();
    }
    return parsePrimary();
  };

  const parsePrimary = (): number => {
    const tok = peek();
    if (!tok) throw new Error("Fim inesperado da expressão.");
    if (tok.type === "num") {
      consume();
      return Number(tok.value);
    }
    if (tok.type === "paren" && tok.value === "(") {
      consume();
      const val = parseExpr();
      if (peek()?.type !== "paren" || peek()?.value !== ")") {
        throw new Error("Parêntese não fechado.");
      }
      consume();
      return val;
    }
    if (tok.type === "id") {
      consume();
      if (peek()?.type === "paren" && peek()?.value === "(") {
        consume();
        const fn = MATH_FUNCTIONS[tok.value.toLowerCase()];
        if (!fn) throw new Error(`Função não permitida: "${tok.value}"`);
        const args: number[] = [];
        if (!(peek()?.type === "paren" && peek()?.value === ")")) {
          args.push(parseExpr());
          while (peek()?.type === "comma") {
            consume();
            args.push(parseExpr());
          }
        }
        if (peek()?.type !== "paren" || peek()?.value !== ")") {
          throw new Error(`Parêntese de função "${tok.value}" não fechado.`);
        }
        consume();
        return fn(...args);
      }
      if (tok.value in variables) return Number(variables[tok.value]);
      if (tok.value.toUpperCase() in MATH_CONSTANTS) {
        return MATH_CONSTANTS[tok.value.toUpperCase()];
      }
      throw new Error(`Variável não definida: "${tok.value}"`);
    }
    throw new Error(`Token inesperado: "${tok.value}"`);
  };

  const result = parseExpr();
  if (pos !== tokens.length) {
    throw new Error(`Token extra não processado: "${tokens[pos]?.value}"`);
  }
  if (!Number.isFinite(result)) {
    throw new Error("Resultado numérico não finito.");
  }
  return result;
}

export function parseCsvRecords(csvText: string): Array<Record<string, string>> {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const splitLine = (line: string): string[] => {
    const sep = line.includes(";") && !line.includes(",") ? ";" : ",";
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === sep && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    cols.push(current.trim());
    return cols;
  };
  const headers = splitLine(lines[0]);
  return lines.slice(1, 1001).map((line) => {
    const vals = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] ?? "";
    });
    return row;
  });
}

function toNumericValues(rows: Array<Record<string, unknown>>, field: string): number[] {
  const out: number[] = [];
  for (const r of rows) {
    const raw = r[field];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      out.push(raw);
      continue;
    }
    if (typeof raw === "string") {
      const cleaned = raw
        .replace(/R\$/gi, "")
        .replace(/\s+/g, "")
        .replace(/\.(?=\d{3}(?:\D|$))/g, "")
        .replace(",", ".")
        .replace(/[^0-9.-]/g, "");
      const num = Number(cleaned);
      if (cleaned && Number.isFinite(num)) out.push(num);
    }
  }
  return out;
}

export interface ComputeSandboxInput {
  operation:
    | "evaluate_expression"
    | "dataset_stats"
    | "group_aggregate"
    | "filter_sort"
    | "remote_exec";
  expression?: string;
  variables?: Record<string, number>;
  vfsPath?: string;
  records?: Array<Record<string, unknown>>;
  csvText?: string;
  numericField?: string;
  groupByField?: string;
  filterField?: string;
  filterEquals?: string;
  sortByField?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  language?: "python" | "javascript" | "bash";
  code?: string;
}

export interface ComputeSandboxResult {
  success: boolean;
  runtime: "worker_ast_compute" | "remote_sandbox_vm";
  stdout: string;
  stderr?: string;
  data?: Record<string, unknown>;
}

/**
 * Executa computacao deterministica ou despacha codigo para Sandbox VM remota configurada.
 */
export async function executeSafeComputeSandbox(
  input: ComputeSandboxInput,
  vfs?: WorkspaceVfsMap,
  signal?: AbortSignal,
): Promise<ComputeSandboxResult> {
  if (input.operation === "remote_exec") {
    const runnerUrl = process.env.WAESY_SANDBOX_RUNNER_URL?.trim();
    if (!runnerUrl || !isPublicHttpUrl(runnerUrl)) {
      return {
        success: false,
        runtime: "worker_ast_compute",
        stdout: "",
        stderr:
          "Nenhuma VM Sandbox remota configurada no servidor (WAESY_SANDBOX_RUNNER_URL ausente). Execute scripts Python/JS interativos diretamente no painel Sandbox Code do artefato no navegador ou utilize sandbox_compute com 'evaluate_expression' / 'dataset_stats' / 'group_aggregate'.",
      };
    }

    const runnerToken = process.env.WAESY_SANDBOX_RUNNER_TOKEN?.trim();
    const res = await fetch(runnerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(runnerToken ? { Authorization: `Bearer ${runnerToken}` } : {}),
      },
      body: JSON.stringify({
        language: input.language || "python",
        code: String(input.code || ""),
        files: vfs
          ? Object.fromEntries(Object.values(vfs).map((f) => [f.path, f.content]))
          : {},
      }),
      signal,
    });
    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      return {
        success: false,
        runtime: "remote_sandbox_vm",
        stdout: "",
        stderr: `Sandbox remota retornou HTTP ${res.status}: ${errTxt.slice(0, 240)}`,
      };
    }
    const parsed = (await res.json().catch(() => ({}))) as Record<string, any>;
    return {
      success: Boolean(parsed.success ?? parsed.exitCode === 0),
      runtime: "remote_sandbox_vm",
      stdout: String(parsed.stdout || ""),
      stderr: parsed.stderr ? String(parsed.stderr) : undefined,
      data: parsed,
    };
  }

  if (input.operation === "evaluate_expression") {
    const value = evaluateSafeMathExpression(
      input.expression || "0",
      input.variables || {},
    );
    return {
      success: true,
      runtime: "worker_ast_compute",
      stdout: `Expr: ${input.expression} = ${value}`,
      data: { value, expression: input.expression },
    };
  }

  // Carrega registros de entrada direta, CSV ou arquivo do Workspace VFS
  let rows: Array<Record<string, unknown>> = Array.isArray(input.records)
    ? input.records
    : [];

  if (rows.length === 0 && input.csvText) {
    rows = parseCsvRecords(input.csvText);
  }

  if (rows.length === 0 && input.vfsPath && vfs) {
    const normalized = normalizeVfsPath(input.vfsPath);
    const file = vfs[normalized];
    if (!file) {
      return {
        success: false,
        runtime: "worker_ast_compute",
        stdout: "",
        stderr: `Arquivo "${normalized}" não encontrado no VFS.`,
      };
    }
    const lang = inferLanguageFromPath(file.path);
    if (lang === "csv") {
      rows = parseCsvRecords(file.content);
    } else if (lang === "json") {
      const parsedJson = JSON.parse(file.content);
      if (Array.isArray(parsedJson)) rows = parsedJson;
      else if (Array.isArray(parsedJson?.rows)) rows = parsedJson.rows;
      else if (Array.isArray(parsedJson?.items)) rows = parsedJson.items;
    }
  }

  if (input.operation === "dataset_stats") {
    const field = input.numericField || Object.keys(rows[0] || {}).find((k) => toNumericValues(rows, k).length > 0) || "";
    const nums = field ? toNumericValues(rows, field) : [];
    if (nums.length === 0) {
      return {
        success: false,
        runtime: "worker_ast_compute",
        stdout: "",
        stderr: `Nenhum valor numérico encontrado para o campo "${field || "não informado"}".`,
      };
    }
    const sorted = [...nums].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / nums.length;
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const variance =
      nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / nums.length;
    const stddev = Math.sqrt(variance);
    const stats = {
      field,
      count: nums.length,
      sum: Number(sum.toFixed(4)),
      mean: Number(mean.toFixed(4)),
      median: Number(median.toFixed(4)),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stddev: Number(stddev.toFixed(4)),
    };
    return {
      success: true,
      runtime: "worker_ast_compute",
      stdout: JSON.stringify(stats, null, 2),
      data: stats,
    };
  }

  if (input.operation === "group_aggregate") {
    const groupField = input.groupByField || "";
    const numField = input.numericField || "";
    if (!groupField) {
      return {
        success: false,
        runtime: "worker_ast_compute",
        stdout: "",
        stderr: "Informe 'groupByField' para agrupamento.",
      };
    }
    const buckets = new Map<string, { count: number; values: number[] }>();
    for (const r of rows) {
      const key = String(r[groupField] ?? "(vazio)");
      const b = buckets.get(key) || { count: 0, values: [] };
      b.count += 1;
      if (numField) {
        const vals = toNumericValues([r], numField);
        if (vals.length > 0) b.values.push(vals[0]);
      }
      buckets.set(key, b);
    }
    const groups = [...buckets.entries()]
      .map(([group, b]) => {
        const sum = b.values.reduce((acc, v) => acc + v, 0);
        return {
          group,
          count: b.count,
          sum: numField ? Number(sum.toFixed(4)) : undefined,
          avg:
            numField && b.values.length > 0
              ? Number((sum / b.values.length).toFixed(4))
              : undefined,
        };
      })
      .sort((a, b) => (b.sum ?? b.count) - (a.sum ?? a.count))
      .slice(0, input.limit || 25);

    return {
      success: true,
      runtime: "worker_ast_compute",
      stdout: JSON.stringify({ groupByField: groupField, numericField: numField || null, groups }, null, 2),
      data: { groups, totalRows: rows.length },
    };
  }

  // filter_sort
  let filtered = rows;
  if (input.filterField && input.filterEquals !== undefined) {
    const targetLower = String(input.filterEquals).toLowerCase();
    filtered = rows.filter((r) =>
      String(r[input.filterField!] ?? "").toLowerCase().includes(targetLower),
    );
  }
  if (input.sortByField) {
    const key = input.sortByField;
    const factor = input.sortOrder === "asc" ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      const av = toNumericValues([a], key)[0];
      const bv = toNumericValues([b], key)[0];
      if (av !== undefined && bv !== undefined) return (av - bv) * factor;
      return String(a[key] ?? "").localeCompare(String(b[key] ?? "")) * factor;
    });
  }
  const sliced = filtered.slice(0, Math.min(Math.max(input.limit || 25, 1), 200));
  return {
    success: true,
    runtime: "worker_ast_compute",
    stdout: `Filtrados ${filtered.length} de ${rows.length} registros (exibindo ${sliced.length}).`,
    data: { totalInput: rows.length, matched: filtered.length, rows: sliced },
  };
}

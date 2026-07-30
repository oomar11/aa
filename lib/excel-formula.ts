/**
 * مقيّم معادلات شبيه بإكسل (آمن — بدون eval).
 * يدعم: أرقام، + - * / ^، أقواس، متغيرات، ودوال MIN/MAX/ABS/ROUND/FLOOR/CEIL/IF.
 */

export type FormulaVars = Record<string, number>;

export type FormulaResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

type Tok =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "comma" };

const FUNCTIONS = new Set([
  "MIN",
  "MAX",
  "ABS",
  "ROUND",
  "FLOOR",
  "CEIL",
  "IF",
]);

/** أسماء المتغيرات المعروفة ( forecase-insensitive بعد التطبيع ) */
export const FORMULA_VAR_HELP: { key: string; label: string }[] = [
  { key: "W", label: "عرض الفتحة (مم)" },
  { key: "H", label: "ارتفاع الفتحة (مم)" },
  { key: "FW", label: "عرض الحلق بعد حسابه (مم)" },
  { key: "FH", label: "ارتفاع الحلق بعد حسابه (مم)" },
];

function normalizeId(raw: string): string {
  const s = raw.trim();
  const map: Record<string, string> = {
    // English
    W: "W",
    WIDTH: "W",
    OPENINGWIDTH: "W",
    OPENING_W: "W",
    H: "H",
    HEIGHT: "H",
    OPENINGHEIGHT: "H",
    OPENING_H: "H",
    FW: "FW",
    FRAMEW: "FW",
    FRAME_W: "FW",
    FRAMEWIDTH: "FW",
    FH: "FH",
    FRAMEH: "FH",
    FRAME_H: "FH",
    FRAMEHEIGHT: "FH",
    // Arabic translit / common
    عرض: "W",
    ارتفاع: "H",
    حلق_عرض: "FW",
    حلق_ارتفاع: "FH",
  };
  const upper = s.toUpperCase();
  if (map[upper]) return map[upper];
  if (map[s]) return map[s];
  return upper;
}

function tokenize(input: string): Tok[] | { error: string } {
  const src = input.trim().replace(/^=/, "").replace(/\s+/g, "");
  if (!src) return { error: "المعادلة فاضية" };

  const tokens: Tok[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i]!;

    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j]!)) j++;
      const num = Number(src.slice(i, j));
      if (!Number.isFinite(num)) return { error: `رقم غير صالح: ${src.slice(i, j)}` };
      tokens.push({ t: "num", v: num });
      i = j;
      continue;
    }

    if (/[A-Za-z_\u0600-\u06FF]/.test(ch)) {
      let j = i + 1;
      while (
        j < src.length &&
        /[A-Za-z0-9_\u0600-\u06FF]/.test(src[j]!)
      ) {
        j++;
      }
      tokens.push({ t: "id", v: src.slice(i, j) });
      i = j;
      continue;
    }

    if ("+-*/^".includes(ch)) {
      tokens.push({ t: "op", v: ch });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ t: "lp" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ t: "rp" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ t: "comma" });
      i++;
      continue;
    }
    // Excel comparison for IF: < > <= >= <> =
    if (ch === "<" || ch === ">" || ch === "=") {
      let op = ch;
      if (
        (ch === "<" || ch === ">") &&
        i + 1 < src.length &&
        (src[i + 1] === "=" || (ch === "<" && src[i + 1] === ">"))
      ) {
        op += src[i + 1]!;
        i += 2;
      } else {
        i++;
      }
      tokens.push({ t: "op", v: op });
      continue;
    }

    return { error: `رمز غير معروف: ${ch}` };
  }

  return tokens;
}

class Parser {
  private i = 0;
  private tokens: Tok[];
  private vars: FormulaVars;

  constructor(tokens: Tok[], vars: FormulaVars) {
    this.tokens = tokens;
    this.vars = vars;
  }

  parse(): FormulaResult {
    try {
      const value = this.parseComparison();
      if (this.i < this.tokens.length) {
        return { ok: false, error: "صيغة زيادة في آخر المعادلة" };
      }
      if (!Number.isFinite(value)) {
        return { ok: false, error: "النتيجة مش رقم صالح" };
      }
      return { ok: true, value };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "خطأ في المعادلة",
      };
    }
  }

  private peek(): Tok | undefined {
    return this.tokens[this.i];
  }

  private peekOp(): string | undefined {
    const t = this.peek();
    return t?.t === "op" ? t.v : undefined;
  }

  private eat(): Tok {
    const t = this.tokens[this.i];
    if (!t) throw new Error("المعادلة ناقصة");
    this.i++;
    return t;
  }

  private parseComparison(): number {
    let left = this.parseAdd();
    const op = this.peekOp();
    if (op && ["=", "<>", "<", ">", "<=", ">="].includes(op)) {
      this.eat();
      const right = this.parseAdd();
      switch (op) {
        case "=":
          return left === right ? 1 : 0;
        case "<>":
          return left !== right ? 1 : 0;
        case "<":
          return left < right ? 1 : 0;
        case ">":
          return left > right ? 1 : 0;
        case "<=":
          return left <= right ? 1 : 0;
        case ">=":
          return left >= right ? 1 : 0;
      }
    }
    return left;
  }

  private parseAdd(): number {
    let left = this.parseMul();
    let op = this.peekOp();
    while (op === "+" || op === "-") {
      this.eat();
      const right = this.parseMul();
      left = op === "+" ? left + right : left - right;
      op = this.peekOp();
    }
    return left;
  }

  private parseMul(): number {
    let left = this.parsePow();
    let op = this.peekOp();
    while (op === "*" || op === "/") {
      this.eat();
      const right = this.parsePow();
      if (op === "/") {
        if (right === 0) throw new Error("قسمة على صفر");
        left = left / right;
      } else {
        left = left * right;
      }
      op = this.peekOp();
    }
    return left;
  }

  private parsePow(): number {
    let left = this.parseUnary();
    if (this.peekOp() === "^") {
      this.eat();
      const right = this.parsePow(); // right-assoc
      left = left ** right;
    }
    return left;
  }

  private parseUnary(): number {
    const op = this.peekOp();
    if (op === "+" || op === "-") {
      this.eat();
      const v = this.parseUnary();
      return op === "-" ? -v : v;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const t = this.peek();
    if (!t) throw new Error("المعادلة ناقصة");

    if (t.t === "num") {
      this.eat();
      return t.v;
    }

    if (t.t === "lp") {
      this.eat();
      const v = this.parseComparison();
      if (this.peek()?.t !== "rp") throw new Error("قوس قفل ناقص");
      this.eat();
      return v;
    }

    if (t.t === "id") {
      this.eat();
      const name = t.v.toUpperCase();
      if (this.peek()?.t === "lp") {
        return this.callFn(name);
      }
      const key = normalizeId(t.v);
      if (!(key in this.vars)) {
        throw new Error(`متغير غير معروف: ${t.v}`);
      }
      return this.vars[key]!;
    }

    throw new Error("صيغة غير مفهومة");
  }

  private callFn(name: string): number {
    if (!FUNCTIONS.has(name)) {
      throw new Error(`دالة غير معروفة: ${name}`);
    }
    if (this.peek()?.t !== "lp") throw new Error("متوقع ( بعد اسم الدالة");
    this.eat();
    const args: number[] = [];
    if (this.peek()?.t !== "rp") {
      args.push(this.parseComparison());
      while (this.peek()?.t === "comma") {
        this.eat();
        args.push(this.parseComparison());
      }
    }
    if (this.peek()?.t !== "rp") throw new Error("قوس قفل ناقص في الدالة");
    this.eat();

    switch (name) {
      case "MIN":
        if (args.length === 0) throw new Error("MIN محتاجة قيم");
        return Math.min(...args);
      case "MAX":
        if (args.length === 0) throw new Error("MAX محتاجة قيم");
        return Math.max(...args);
      case "ABS":
        if (args.length !== 1) throw new Error("ABS(x)");
        return Math.abs(args[0]!);
      case "ROUND": {
        if (args.length < 1 || args.length > 2) throw new Error("ROUND(x[,n])");
        const n = args[1] ?? 0;
        const f = 10 ** n;
        return Math.round(args[0]! * f) / f;
      }
      case "FLOOR":
        if (args.length !== 1) throw new Error("FLOOR(x)");
        return Math.floor(args[0]!);
      case "CEIL":
        if (args.length !== 1) throw new Error("CEIL(x)");
        return Math.ceil(args[0]!);
      case "IF":
        if (args.length !== 3) throw new Error("IF(شرط,لو_صح,لو_غلط)");
        return args[0]! ? args[1]! : args[2]!;
      default:
        throw new Error(`دالة غير معروفة: ${name}`);
    }
  }
}

/** تقييم معادلة إكسل على متغيرات معطاة */
export function evaluateFormula(
  formula: string,
  vars: FormulaVars
): FormulaResult {
  if (typeof formula !== "string") {
    return { ok: false, error: "المعادلة مش نص" };
  }
  const tokens = tokenize(formula);
  if ("error" in tokens) return { ok: false, error: tokens.error };
  return new Parser(tokens, vars).parse();
}

/** يتحقق من صحة الصيغة بدون قيم حقيقية (بمتغيرات وهمية) */
export function validateFormula(
  formula: string,
  allowedVars: string[] = ["W", "H", "FW", "FH"]
): FormulaResult {
  const vars: FormulaVars = {};
  for (const k of allowedVars) vars[k] = 1000;
  return evaluateFormula(formula, vars);
}

/** يضمن إن المعادلة تبدأ بـ = للعرض */
export function ensureEqualsPrefix(formula: string): string {
  const t = formula.trim();
  if (!t) return "=";
  return t.startsWith("=") ? t : `=${t}`;
}

/** يحول خصم ثابت قديم لمعادلة */
export function deductToFormula(
  baseVar: "W" | "H" | "FW" | "FH",
  deductMm: number
): string {
  const d = Number(deductMm) || 0;
  if (d <= 0) return `=${baseVar}`;
  return `=${baseVar}-${d}`;
}

export type FormulaBaseVar = "W" | "H" | "FW" | "FH";

/**
 * وضع بسيط: تخصيم ثابت من متغير واحد.
 * يقبل: =W  |  =W-10  |  =FW-2*60 (يُعتبر متقدم)
 */
export type SimpleDeduct =
  | { simple: true; baseVar: FormulaBaseVar; deductMm: number }
  | { simple: false };

const SIMPLE_DEDUCT_RE =
  /^=?\s*(W|H|FW|FH)\s*(?:-\s*(\d+(?:\.\d+)?))?\s*$/i;

/** هل المعادلة تخصيم بسيط (متغير − رقم)؟ */
export function parseSimpleDeduct(formula: string): SimpleDeduct {
  const t = formula.trim();
  const m = t.match(SIMPLE_DEDUCT_RE);
  if (!m) return { simple: false };
  const baseVar = m[1]!.toUpperCase() as FormulaBaseVar;
  const deductMm = m[2] ? Number(m[2]) : 0;
  if (!Number.isFinite(deductMm) || deductMm < 0) return { simple: false };
  return { simple: true, baseVar, deductMm };
}

/** هل كل معادلات التخصيم بسيطة؟ */
export function areAllDeductionsSimple(formulas: string[]): boolean {
  return formulas.every((f) => parseSimpleDeduct(f).simple);
}

const BASE_VAR_AR: Record<FormulaBaseVar, string> = {
  W: "عرض الفتحة",
  H: "ارتفاع الفتحة",
  FW: "عرض الحلق",
  FH: "ارتفاع الحلق",
};

/** نص عربي قصير لشرح معادلة تخصيم */
export function describeFormulaAr(
  formula: string,
  axisLabel: string
): string {
  const parsed = parseSimpleDeduct(formula);
  if (parsed.simple) {
    const from = BASE_VAR_AR[parsed.baseVar];
    if (parsed.deductMm <= 0) {
      return `${axisLabel} = ${from} (بدون تخصيم)`;
    }
    return `${axisLabel} = ${from} − ${parsed.deductMm} مم`;
  }
  return `${axisLabel} ${ensureEqualsPrefix(formula)}`;
}

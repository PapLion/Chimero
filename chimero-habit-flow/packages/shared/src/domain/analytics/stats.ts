/**
 * Deterministic descriptive and inferential statistics used by the Insight Lab.
 * Pure functions: no I/O, no randomness, no dates.
 */

export interface Describe {
  n: number
  mean: number
  sd: number
  min: number
  max: number
  median: number
  sum: number
}

export function sum(values: readonly number[]): number {
  let total = 0
  for (const v of values) total += v
  return total
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? NaN : sum(values) / values.length
}

/** Sample variance (n − 1). NaN below two observations. */
export function variance(values: readonly number[]): number {
  if (values.length < 2) return NaN
  const m = mean(values)
  let acc = 0
  for (const v of values) acc += (v - m) * (v - m)
  return acc / (values.length - 1)
}

export function sd(values: readonly number[]): number {
  return Math.sqrt(variance(values))
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function describe(values: readonly number[]): Describe | null {
  if (values.length === 0) return null
  return {
    n: values.length,
    mean: mean(values),
    sd: values.length > 1 ? sd(values) : 0,
    min: Math.min(...values),
    max: Math.max(...values),
    median: median(values),
    sum: sum(values),
  }
}

/** Average ranks (1-based); ties share the mean of their positions. */
export function rank(values: readonly number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value)
  const ranks = new Array<number>(values.length)
  let i = 0
  while (i < order.length) {
    let j = i
    while (j + 1 < order.length && order[j + 1].value === order[i].value) j++
    const shared = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[order[k].index] = shared
    i = j + 1
  }
  return ranks
}

/** Pearson product-moment coefficient. null when either side has no variance. */
export function pearson(x: readonly number[], y: readonly number[]): number | null {
  const n = Math.min(x.length, y.length)
  if (n < 2) return null
  const mx = mean(x.slice(0, n))
  const my = mean(y.slice(0, n))
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return null
  const r = sxy / Math.sqrt(sxx * syy)
  return Math.max(-1, Math.min(1, r))
}

export function spearman(x: readonly number[], y: readonly number[]): number | null {
  const n = Math.min(x.length, y.length)
  if (n < 2) return null
  return pearson(rank(x.slice(0, n)), rank(y.slice(0, n)))
}

/** Least-squares line y = intercept + slope·x. */
export function linearFit(x: readonly number[], y: readonly number[]): { slope: number; intercept: number } | null {
  const n = Math.min(x.length, y.length)
  if (n < 2) return null
  const mx = mean(x.slice(0, n))
  const my = mean(y.slice(0, n))
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my)
    sxx += (x[i] - mx) * (x[i] - mx)
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  return { slope, intercept: my - slope * mx }
}

function logGamma(z: number): number {
  // Lanczos approximation (g = 7, n = 9)
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  z -= 1
  let x = c[0]
  for (let i = 1; i < 9; i++) x += c[i] / (z + i)
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

/** Regularized incomplete beta I_x(a, b) via Lentz continued fraction. */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b)
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta)
  if (x > (a + 1) / (a + b + 2)) return 1 - incompleteBeta(1 - x, b, a)
  const tiny = 1e-300
  let f = 1
  let c = 1
  let d = 0
  for (let i = 0; i <= 300; i++) {
    const m = i >> 1
    let numerator: number
    if (i === 0) numerator = 1
    else if (i % 2 === 0) numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m))
    else numerator = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1))
    d = 1 + numerator * d
    if (Math.abs(d) < tiny) d = tiny
    d = 1 / d
    c = 1 + numerator / c
    if (Math.abs(c) < tiny) c = tiny
    const delta = c * d
    f *= delta
    if (Math.abs(1 - delta) < 1e-12) break
  }
  return (front * (f - 1)) / a
}

/** Two-sided p-value of Student's t with `df` degrees of freedom. */
export function tTwoSidedP(t: number, df: number): number {
  if (!Number.isFinite(t)) return 0
  if (!(df > 0)) return NaN
  return incompleteBeta(df / (df + t * t), df / 2, 0.5)
}

/** p-value for H0: correlation = 0, given coefficient r from n pairs. */
export function correlationP(r: number, n: number): number | null {
  if (n < 3) return null
  if (Math.abs(r) >= 1) return 0
  const t = r * Math.sqrt((n - 2) / (1 - r * r))
  return tTwoSidedP(t, n - 2)
}

export interface GroupComparison {
  meanA: number
  meanB: number
  /** meanA − meanB */
  diff: number
  /** Welch two-sided p-value; null when a group has < 2 observations or no variance at all. */
  p: number | null
  /** Standardized difference using the pooled standard deviation; null when undefined. */
  cohenD: number | null
}

/** Welch's unequal-variance comparison of two independent groups. */
export function compareGroups(a: readonly number[], b: readonly number[]): GroupComparison | null {
  if (a.length === 0 || b.length === 0) return null
  const meanA = mean(a)
  const meanB = mean(b)
  const diff = meanA - meanB
  if (a.length < 2 || b.length < 2) return { meanA, meanB, diff, p: null, cohenD: null }
  const va = variance(a)
  const vb = variance(b)
  const se2 = va / a.length + vb / b.length
  const pooled = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2))
  const cohenD = pooled > 0 ? diff / pooled : null
  if (se2 === 0) return { meanA, meanB, diff, p: diff === 0 ? 1 : null, cohenD }
  const t = diff / Math.sqrt(se2)
  const df = (se2 * se2) / ((va / a.length) ** 2 / (a.length - 1) + (vb / b.length) ** 2 / (b.length - 1))
  return { meanA, meanB, diff, p: tTwoSidedP(t, df), cohenD }
}

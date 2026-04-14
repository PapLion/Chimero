/**
 * Weight unit conversion utilities.
 * Canonical storage unit is lbs. All display conversions go through these functions.
 */

const KG_PER_LB = 0.45359237
const LBS_PER_KG = 1 / KG_PER_LB // ≈ 2.20462

/** Convert any weight value to lbs. */
export function toLbs(value: number, fromUnit: "lbs" | "kg"): number {
  return fromUnit === "kg" ? value * LBS_PER_KG : value
}

/** Convert any weight value to kg. */
export function toKg(value: number, fromUnit: "lbs" | "kg"): number {
  return fromUnit === "lbs" ? value * KG_PER_LB : value
}

/**
 * Convert a value stored in the canonical unit (lbs) to the user's display unit.
 * If displayUnit is "lbs" the value is returned unchanged.
 */
export function toDisplay(value: number, displayUnit: "lbs" | "kg"): number {
  return displayUnit === "kg" ? toKg(value, "lbs") : value
}

/**
 * Format a weight value for display.
 * @param value     The value stored in canonical lbs.
 * @param displayUnit  The unit the user wants to see.
 * @param showBoth  When true, appends the secondary unit in parentheses, e.g. "185.0 lbs (83.9 kg)".
 */
export function formatWeight(
  value: number,
  displayUnit: "lbs" | "kg",
  showBoth = false
): string {
  const primary = toDisplay(value, displayUnit)
  const primaryStr = `${primary.toFixed(1)} ${displayUnit}`

  if (!showBoth) return primaryStr

  const secondary = displayUnit === "lbs" ? toKg(value, "lbs") : toLbs(value, "lbs")
  const secondaryUnit = displayUnit === "lbs" ? "kg" : "lbs"
  return `${primaryStr} (${secondary.toFixed(1)} ${secondaryUnit})`
}

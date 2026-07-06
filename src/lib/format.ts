/**
 * Format speed for display.
 * - If speed < 0.1 km/h → return "0 km/h"
 * - Otherwise → 1 decimal place, auto-rounded (e.g. 42.5 km/h, 0.3 km/h)
 */
export function formatSpeed(speed: number | null | undefined): string {
  const s = speed ?? 0
  if (s < 0.1) return '0 km/h'
  return `${Math.round(s * 10) / 10} km/h`
}

/**
 * Format speed value only (no unit), for use in templates.
 */
export function formatSpeedValue(speed: number | null | undefined): string {
  const s = speed ?? 0
  if (s < 0.1) return '0'
  return `${Math.round(s * 10) / 10}`
}

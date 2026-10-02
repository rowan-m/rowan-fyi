/**
 * Validates whether a given string is a valid 3-digit or 6-digit hex color.
 */
export function isValidHex(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color.trim());
}

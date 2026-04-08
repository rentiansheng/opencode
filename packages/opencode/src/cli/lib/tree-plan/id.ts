/**
 * UUID utilities for tree-plan node IDs
 * Uses Node.js/Bun built-in crypto.randomUUID() - no external dependencies
 */

/**
 * Generates a UUID v4 string
 * @returns UUID v4 string
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Validates if a string is a valid UUID v4 format
 * @param id - String to validate
 * @returns true if valid UUID v4 format, false otherwise
 */
export function isValidId(id: string): boolean {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuid.test(id)
}

/**
 * Returns the first 8 characters of a UUID for display purposes
 * @param id - UUID string
 * @returns First 8 characters
 */
export function shortId(id: string): string {
  return id.slice(0, 8)
}

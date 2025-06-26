/**
 * Escapes special regex characters to prevent Regular Expression injection attacks (ReDoS)
 * This function should be used whenever user input is passed to RegExp constructors
 * 
 * @param string - The user input string to escape
 * @returns The escaped string safe for use in regex patterns
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
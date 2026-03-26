const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

/**
 * Prefix a relative API path with the base URL.
 * On web: returns the path as-is (same-origin).
 * On Capacitor builds: prepends the Vercel deployment URL.
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

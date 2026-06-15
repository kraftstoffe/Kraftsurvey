const DEFAULT_REDIRECT = "/dashboard";

/** Allow only same-origin relative paths (blocks open redirects). */
export function safeRedirect(path: string | null | undefined): string {
  if (!path) return DEFAULT_REDIRECT;
  if (!path.startsWith("/") || path.startsWith("//")) return DEFAULT_REDIRECT;
  if (path.includes("\\") || path.includes("\0")) return DEFAULT_REDIRECT;
  return path;
}

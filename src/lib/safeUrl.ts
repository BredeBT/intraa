/**
 * Validerer at en URL bruker en trygg scheme (http/https/mailto).
 * Returnerer URL-en hvis OK, eller null hvis den skal blokkeres
 * (f.eks. javascript:, data:, vbscript:).
 *
 * Bruk på ALL href som kommer fra bruker-input — website, social-links,
 * sponsor-links osv.
 */
const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:"]);

export function safeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Hvis ingen scheme, anta https://
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (!SAFE_SCHEMES.has(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

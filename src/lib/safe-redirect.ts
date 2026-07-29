const LOCAL_REDIRECT_ORIGIN = "https://hirepilot.internal";

/**
 * Returns a same-application path suitable for authentication callbacks.
 * Protocol-relative URLs, backslashes, control characters, and absolute URLs
 * are rejected to prevent open redirects.
 */
export function getSafeInternalPath(
  value: string | null | undefined,
  fallback: string,
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, LOCAL_REDIRECT_ORIGIN);
    if (parsed.origin !== LOCAL_REDIRECT_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

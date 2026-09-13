export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    emailPattern.test(value.trim())
  );
}
export function isStrongPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 12 &&
    value.length <= 128 &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
  );
}
export function isName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 100
  );
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  try {
    return origin === appOrigin(request) && (!site || site === "same-origin");
  } catch {
    return false;
  }
}
export function appOrigin(request: Request): string {
  const configured = process.env.APP_URL;
  if (configured) {
    const url = new URL(configured);
    if (
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      throw new Error("INVALID_APP_URL");
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      throw new Error("INVALID_APP_URL");
    return url.origin;
  }
  const url = new URL(request.url);
  // Next's development server can normalize 127.0.0.1 to localhost internally.
  // Only accept a loopback Host at the same port in this development fallback.
  const host = request.headers.get("host");
  if (
    process.env.NODE_ENV !== "production" &&
    host &&
    ["localhost", "127.0.0.1"].includes(url.hostname)
  ) {
    const local = new URL(`${url.protocol}//${host}`);
    if (
      ["localhost", "127.0.0.1"].includes(local.hostname) &&
      local.port === url.port
    )
      url.host = local.host;
  }
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new Error("MISSING_APP_URL");
  return url.origin;
}
export const privatePath = (path: string) =>
  path === "/bienvenue" ||
  path.startsWith("/app/") ||
  path === "/app" ||
  path.startsWith("/configuration/");

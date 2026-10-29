/** Resolve only local paths; concatenating an untrusted path to an origin is unsafe. */
export function safeRedirectPath(value: unknown, origin: string): string {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/")) return "/home";
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return "/home";
    const url = new URL(value, origin);
    // Dot-segment normalization can turn /a/..//host into //host. Do not
    // return a path that a later URL resolution would treat as an authority.
    if (url.origin !== new URL(origin).origin || url.pathname.startsWith("//")) return "/home";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/home";
  }
}

/** Only this project's public avatars are rendered or accepted on profile writes. */
export function safeAvatarUrl(value: unknown, supabaseUrl: string | undefined, ownerId?: string): string | null {
  if (typeof value !== "string" || value.length > 2048 || !supabaseUrl) return null;
  try {
    const base = new URL(supabaseUrl);
    const url = new URL(value);
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if (base.protocol !== "https:" && !(isLoopback && base.protocol === "http:")) return null;
    if (url.origin !== base.origin || url.username || url.password || url.search || url.hash) return null;
    const match = /^\/storage\/v1\/object\/public\/avatars\/([0-9a-f-]{36})\/([a-z0-9._-]+\.(?:png|jpe?g|webp|gif|avif))$/i.exec(url.pathname);
    if (!match || (ownerId && match[1].toLowerCase() !== ownerId.toLowerCase())) return null;
    return url.href;
  } catch {
    return null;
  }
}

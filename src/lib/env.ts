export function getSiteUrl(): string {
  const envUrl: string | null =
    (typeof process !== "undefined" &&
    process.env &&
    typeof process.env.PUBLIC_SITE_URL === "string"
      ? process.env.PUBLIC_SITE_URL
      : null) ??
    (typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env.PUBLIC_SITE_URL === "string"
      ? (import.meta.env.PUBLIC_SITE_URL as string)
      : null);

  if (!envUrl) {
    throw new Error("Missing required environment variable: PUBLIC_SITE_URL");
  }

  return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
}

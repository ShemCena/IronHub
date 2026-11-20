export function getAuthSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    (process.env.DATABASE_URL
      ? `ironhub-secret-derived-${process.env.DATABASE_URL.slice(0, 32)}`
      : "ironhub-production-fallback-secret-minimum-32-characters-long");
  return new TextEncoder().encode(secret);
}

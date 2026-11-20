export function getAuthSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET environment variable must be configured.");
    }
    return new TextEncoder().encode("ironhub-local-dev-secret-change-in-prod");
  }
  return new TextEncoder().encode(secret);
}

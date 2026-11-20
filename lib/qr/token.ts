import crypto from "crypto";

const QR_PREFIX = "IH1:";

/**
 * Generates an opaque, high-entropy QR credential token.
 * Raw tokens are returned once for QR rendering and never persisted;
 * only their SHA-256 digest is stored in `qr_credentials.token_hash`.
 */
export function generateOpaqueQrToken(): {
  rawToken: string;
  tokenHash: string;
  tokenLast4: string;
} {
  const random = crypto.randomBytes(24).toString("base64url");
  const rawToken = `${QR_PREFIX}${random}`;
  const tokenHash = hashQrToken(rawToken);
  const tokenLast4 = random.slice(-4).toUpperCase();

  return { rawToken, tokenHash, tokenLast4 };
}

export function hashQrToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

export function isValidQrTokenFormat(rawToken: string): boolean {
  const trimmed = rawToken.trim();
  return trimmed.startsWith(QR_PREFIX) && trimmed.length >= 24 && trimmed.length <= 128;
}

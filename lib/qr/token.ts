import crypto from "crypto";

const QR_PREFIX = "IH1:";

/**
 * Generates an opaque, high-entropy QR credential token.
 * Lookups use only the SHA-256 digest (`token_hash`). An AES-256-GCM encrypted copy
 * (`token_ciphertext`) lets the owning member re-display their pass in the portal;
 * staff APIs never return it.
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

function getEncryptionKey(): Buffer {
  const material =
    process.env.QR_ENCRYPTION_KEY ??
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "ironhub-local-dev-qr-key");
  if (!material) throw new Error("QR_ENCRYPTION_KEY or AUTH_SECRET must be configured.");
  return crypto.createHash("sha256").update(`ironhub-qr:${material}`).digest();
}

export function encryptQrToken(rawToken: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(rawToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64url")).join(".");
}

export function decryptQrToken(payload: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivB64, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch {
    return null;
  }
}

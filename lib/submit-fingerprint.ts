import { createHash } from "crypto";

export function resolveSubmitFingerprint(
  fingerprint: string | undefined,
  clientIp: string,
  userAgent: string | null
): string {
  if (fingerprint?.trim()) return fingerprint.trim();
  const ua = userAgent ?? "unknown";
  return createHash("sha256")
    .update(`${clientIp}|${ua}`)
    .digest("hex")
    .slice(0, 32);
}

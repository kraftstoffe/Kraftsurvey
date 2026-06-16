import { createHash, randomBytes } from "crypto";

export function createDraftToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashDraftToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function draftExpiresAt(from = Date.now()): Date {
  return new Date(from + DRAFT_TTL_MS);
}

export function draftStorageKey(slug: string): string {
  return `survey_draft_${slug}`;
}

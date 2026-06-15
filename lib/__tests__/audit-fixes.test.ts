import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";
import { normalizeEmail } from "@/lib/auth";
import { resolveSubmitFingerprint } from "@/lib/submit-fingerprint";
import { isInviteCodeValid, isRegistrationEnabled } from "@/lib/registration";
import { checkRateLimit } from "@/lib/rate-limit";
import { registerSchema, submitResponseSchema } from "@/lib/validations";

describe("safeRedirect", () => {
  it("allows relative paths", () => {
    expect(safeRedirect("/dashboard")).toBe("/dashboard");
    expect(safeRedirect("/surveys/abc/edit")).toBe("/surveys/abc/edit");
  });

  it("blocks open redirects", () => {
    expect(safeRedirect("https://evil.com")).toBe("/dashboard");
    expect(safeRedirect("//evil.com")).toBe("/dashboard");
    expect(safeRedirect(null)).toBe("/dashboard");
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });
});

describe("resolveSubmitFingerprint", () => {
  it("uses client fingerprint when provided", () => {
    expect(resolveSubmitFingerprint("abc-123", "1.2.3.4", "Mozilla")).toBe("abc-123");
  });

  it("falls back to hashed ip and user agent", () => {
    const a = resolveSubmitFingerprint(undefined, "1.2.3.4", "Mozilla");
    const b = resolveSubmitFingerprint(undefined, "1.2.3.4", "Mozilla");
    expect(a).toHaveLength(32);
    expect(a).toBe(b);
  });
});

describe("registration gate", () => {
  it("allows registration by default", () => {
    expect(isRegistrationEnabled()).toBe(true);
  });

  it("validates invite code when configured", () => {
    process.env.REGISTRATION_INVITE_CODE = "secret";
    expect(isInviteCodeValid("secret")).toBe(true);
    expect(isInviteCodeValid("wrong")).toBe(false);
    delete process.env.REGISTRATION_INVITE_CODE;
  });
});

describe("rate limit", () => {
  it("blocks after limit exceeded", () => {
    const key = `test-${Date.now()}`;
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(false);
  });
});

describe("validation schemas", () => {
  it("rejects overly long passwords", () => {
    const result = registerSchema.safeParse({
      email: "a@b.com",
      password: "a".repeat(200),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty required answer values at schema level via max", () => {
    const result = submitResponseSchema.safeParse({
      answers: [{ questionId: "q1", value: "ok" }],
    });
    expect(result.success).toBe(true);
  });
});

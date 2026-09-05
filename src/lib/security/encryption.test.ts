import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  process.env.AUTH_SECRET = "test-secret";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
});

describe("encryptSecret/decryptSecret", () => {
  it("cifra y descifra un secreto sin pérdidas", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/security/encryption");
    const plaintext = "token-super-secreto-de-un-conector";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("genera un cifrado distinto cada vez (IV aleatorio)", async () => {
    const { encryptSecret } = await import("@/lib/security/encryption");
    const a = encryptSecret("mismo-valor");
    const b = encryptSecret("mismo-valor");
    expect(a).not.toBe(b);
  });
});

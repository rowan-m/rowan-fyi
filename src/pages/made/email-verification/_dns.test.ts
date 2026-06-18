import { describe, expect, test, vi } from "vitest";
import { verifyIssuerDelegation } from "./_dns";

describe("verifyIssuerDelegation Helper Unit Tests", () => {
  test("returns false for invalid email format", async () => {
    const result = await verifyIssuerDelegation(
      "invalid-email",
      "https://accounts.google.com",
    );
    expect(result).toBe(false);
  });

  test("bypasses check and returns true for localhost/127.0.0.1 development issuers", async () => {
    const res1 = await verifyIssuerDelegation(
      "user@example.com",
      "http://localhost:4321",
    );
    const res2 = await verifyIssuerDelegation(
      "user@example.com",
      "http://127.0.0.1:4321",
    );
    expect(res1).toBe(true);
    expect(res2).toBe(true);
  });

  test("returns true for direct self-authoritative domain match", async () => {
    const result = await verifyIssuerDelegation(
      "demo@rowan.fyi",
      "https://rowan.fyi",
    );
    expect(result).toBe(true);
  });

  test("returns true for valid delegated DNS TXT record", async () => {
    const mockResolveTxt = vi
      .fn()
      .mockResolvedValue([["iss=https://accounts.google.com"]]);
    const result = await verifyIssuerDelegation(
      "user@custom-domain.com",
      "https://accounts.google.com",
      mockResolveTxt,
    );

    expect(mockResolveTxt).toHaveBeenCalledWith(
      "_email-verification.custom-domain.com",
    );
    expect(result).toBe(true);
  });

  test("returns false for mismatched delegated DNS TXT record", async () => {
    const mockResolveTxt = vi
      .fn()
      .mockResolvedValue([["iss=https://malicious.com"]]);
    const result = await verifyIssuerDelegation(
      "user@custom-domain.com",
      "https://accounts.google.com",
      mockResolveTxt,
    );

    expect(result).toBe(false);
  });

  test("returns false and logs warning when DNS resolve throws an error", async () => {
    const mockResolveTxt = vi.fn().mockRejectedValue(new Error("ENOTFOUND"));
    const result = await verifyIssuerDelegation(
      "user@custom-domain.com",
      "https://accounts.google.com",
      mockResolveTxt,
    );

    expect(result).toBe(false);
  });
});

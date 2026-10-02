import { describe, expect, test } from "vitest";
import { isValidHex } from "./_illusion-math";

describe("Lightness Illusion Color Validation", () => {
  describe("isValidHex", () => {
    test("validates 3-digit and 6-digit hex colors", () => {
      expect(isValidHex("#fff")).toBe(true);
      expect(isValidHex("#000000")).toBe(true);
      expect(isValidHex("#da0b0b")).toBe(true);
      expect(isValidHex("#daa60b")).toBe(true);
      expect(isValidHex("#AbC")).toBe(true);
    });

    test("handles whitespace safely", () => {
      expect(isValidHex("  #da0b0b  ")).toBe(true);
    });

    test("rejects invalid hex strings", () => {
      expect(isValidHex("red")).toBe(false);
      expect(isValidHex("rgb(0,0,0)")).toBe(false);
      expect(isValidHex("#ffff")).toBe(false);
      expect(isValidHex("#gggggg")).toBe(false);
      expect(isValidHex("")).toBe(false);
    });
  });
});

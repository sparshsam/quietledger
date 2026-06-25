import { describe, it, expect } from "vitest";
import { autoCategorize } from "../categories";
import type { LearnedCategory } from "../types";

describe("autoCategorize", () => {
  it("categorizes known merchants by keyword", () => {
    expect(autoCategorize("STARBUCKS", [])).toEqual({ parent: "Food", child: "Coffee" });
  });

  it("uses learned patterns over keywords", () => {
    const learnings: LearnedCategory[] = [
      { pattern: "starbucks", parent: "Shopping", child: "Online" },
    ];
    expect(autoCategorize("STARBUCKS", learnings)).toEqual({ parent: "Shopping", child: "Online" });
  });

  it("returns null for unknown merchants", () => {
    expect(autoCategorize("UNKNOWN MERCHANT 123", [])).toBeNull();
  });

  it("matches case-insensitively", () => {
    expect(autoCategorize("MCDONALD'S DOWNTOWN", [])).toEqual({ parent: "Food", child: "Restaurants" });
  });
});

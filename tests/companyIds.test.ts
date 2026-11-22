import { describe, it, expect } from "vitest";
import { validationIco, validationDic } from "@/functions/validationForm";
describe("ico/dic", () => {
  it("ico", () => {
    expect(validationIco("26168685", "cz")).toBe(true);
    expect(validationIco("26168686", "cz")).toBe(false);
    expect(validationIco("abc", "cz")).toBe(false);
    expect(validationIco("", "cz")).toBe(true);
  });
  it("dic", () => {
    expect(validationDic("CZ26168685", "cz")).toBe(true);
    expect(validationDic("xyz", "cz")).toBe(false);
    expect(validationDic("DE123456789", "de")).toBe(true);
  });
});

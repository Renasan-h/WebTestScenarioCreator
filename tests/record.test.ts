import { describe, expect, it } from "vitest";
import { toRecordedNode } from "../packages/playwright-adapter/src/record";
describe("recorded actions", () => {
  it("maps navigation to scenario node", () => {
    const n = toRecordedNode({ type: "navigate", url: "https://example.com" }, 0);
    expect(n.type).toBe("navigate");
    if (n.type === "navigate") expect(n.config.url).toBe("https://example.com");
  });
  it("maps click selector", () => {
    const n = toRecordedNode({ type: "click", selector: "#save" }, 1);
    expect(n.type).toBe("click");
    if (n.type === "click") expect(n.config.locator).toEqual({ strategy: "css", value: "#save" });
  });
  it("maps filled values", () => {
    const n = toRecordedNode({ type: "fill", selector: "#name", value: "Alice" }, 2);
    expect(n.type).toBe("fill");
    if (n.type === "fill") expect(n.config.value).toBe("Alice");
  });
});

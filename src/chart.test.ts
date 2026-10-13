import { describe, expect, it } from "vitest";
import { niceTicks } from "./chart";

describe("axis ticks", () => {
  // Ranges the frequency and RoCoF charts reach at extreme slider settings.
  const ranges: [number, number][] = [
    [48, 50.2], [47.5, 50.2], [46, 50.2], [44.5, 50.5], [-2, 1], [-3, 1], [-2, 0.5], [-7, 0.5],
  ];

  it("labels every gridline with its exact value", () => {
    for (const [min, max] of ranges) {
      const { ticks, format } = niceTicks(min, max);
      for (const t of ticks) expect(Number(format(t).replace("−", "-"))).toBeCloseTo(t, 9);
    }
  });

  it("keeps ticks inside the axis range, in order, with at least three ticks", () => {
    for (const [min, max] of ranges) {
      const { ticks } = niceTicks(min, max);
      expect(ticks.length).toBeGreaterThanOrEqual(3);
      expect(ticks.length).toBeLessThanOrEqual(7);
      expect(ticks[0]!).toBeGreaterThanOrEqual(min - 1e-9);
      expect(ticks.at(-1)!).toBeLessThanOrEqual(max + 1e-9);
      expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
    }
  });

  it("gives the default frequency axis half hertz steps", () => {
    expect(niceTicks(48, 50.2).ticks).toEqual([48, 48.5, 49, 49.5, 50]);
  });
});

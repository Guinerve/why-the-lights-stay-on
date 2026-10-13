import { describe, expect, it } from "vitest";
import { EVENT_PARAMS, KOGAN_CREEK } from "./event";
import { simulate, summarise } from "./sim";

describe("documented event comparison", () => {
  it("converts the documented loss on the explicitly assumed system base", () => {
    expect(EVENT_PARAMS.lossPu).toBeCloseTo(0.02992, 12);
    expect(EVENT_PARAMS.lossPu * KOGAN_CREEK.assumedBaseMw).toBe(KOGAN_CREEK.lostMw);
    expect(EVENT_PARAMS.batterySize).toBe(0);
  });

  it("preserves the mismatch rather than fitting the reported frequency", () => {
    const result = summarise(simulate(EVENT_PARAMS), EVENT_PARAMS);
    expect(result.nadir).toBeCloseTo(49.7766, 4);
    expect(result.nadirT).toBeCloseTo(2.09, 2);
    expect(result.nadir - KOGAN_CREEK.reportedLowHz).toBeCloseTo(0.1666, 4);
    expect(result.initialRocof).toBeCloseTo(-0.187, 6);
  });

  it("keeps the comparison stable when an interactive scenario changes", () => {
    const before = simulate(EVENT_PARAMS);
    simulate({ ...EVENT_PARAMS, H: 1, lossPu: 0.2, batterySize: 0.1 });
    expect(simulate(EVENT_PARAMS)).toEqual(before);
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULTS, simulate, summarise, type Params } from "./sim";

const bare: Params = {
  ...DEFAULTS,
  droop: Infinity,
  loadDamping: 0,
  batterySize: 0,
};

describe("swing equation", () => {
  it("no droop, no damping: frequency falls linearly at f0·ΔP/(2H)", () => {
    const p = { ...bare, H: 5, lossPu: 0.1 };
    const tr = simulate(p, 5, 0.01);
    const expectedRocof = -(p.lossPu * p.f0) / (2 * p.H); // −0.5 Hz/s
    const i = Math.round(3 / 0.01);
    expect(tr.f[i]!).toBeCloseTo(p.f0 + expectedRocof * 3, 9);
    expect(tr.rocof[0]!).toBeCloseTo(expectedRocof, 12);
  });

  it("more inertia means a gentler initial RoCoF", () => {
    const lo = summarise(simulate({ ...bare, H: 2 }, 2), bare).initialRocof;
    const hi = summarise(simulate({ ...bare, H: 6 }, 2), bare).initialRocof;
    expect(Math.abs(hi)).toBeLessThan(Math.abs(lo));
  });

  it("steady-state deviation follows the droop formula Δf = −ΔP·f0 / (1/R + D)", () => {
    const p: Params = {
      ...DEFAULTS, lossPu: 0.04, droop: 0.05, governorHeadroom: 1,
      loadDamping: 0, batterySize: 0, governorTau: 2,
    };
    const tr = simulate(p, 120, 0.01);
    const expected = (-p.lossPu * p.f0) / (1 / p.droop);
    expect(tr.f.at(-1)! - p.f0).toBeCloseTo(expected, 3);
  });

  it("load damping contributes to the steady state", () => {
    const p: Params = {
      ...DEFAULTS, lossPu: 0.04, droop: 0.05, governorHeadroom: 1,
      loadDamping: 2, batterySize: 0, governorTau: 2,
    };
    const tr = simulate(p, 120, 0.01);
    const expected = (-p.lossPu * p.f0) / (1 / p.droop + p.loadDamping);
    expect(tr.f.at(-1)! - p.f0).toBeCloseTo(expected, 3);
  });

  it("a battery raises the nadir", () => {
    const withBatt = summarise(simulate({ ...DEFAULTS, batterySize: 0.05 }, 30), DEFAULTS).nadir;
    const without = summarise(simulate({ ...DEFAULTS, batterySize: 0 }, 30), DEFAULTS).nadir;
    expect(withBatt).toBeGreaterThan(without);
  });

  it("a slower battery helps less", () => {
    const fast = summarise(simulate({ ...DEFAULTS, batteryDelay: 0.1 }, 30), DEFAULTS).nadir;
    const slow = summarise(simulate({ ...DEFAULTS, batteryDelay: 2 }, 30), DEFAULTS).nadir;
    expect(fast).toBeGreaterThan(slow);
  });

  it("is deterministic and RK4 is step-size stable", () => {
    const a = simulate(DEFAULTS, 20, 0.01);
    const b = simulate(DEFAULTS, 20, 0.005);
    expect(summarise(a, DEFAULTS).nadir).toBeCloseTo(summarise(b, DEFAULTS).nadir, 2);
  });
});

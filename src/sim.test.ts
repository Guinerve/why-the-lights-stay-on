import { describe, expect, it } from "vitest";
import { DEFAULTS, UFLS_HZ, simulate, summarise, type Params } from "./sim";

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

describe("response limits and protection marker", () => {
  it("does not inject battery power before delayed frequency feedback arrives", () => {
    const p = { ...DEFAULTS, batteryDelay: 0.3 };
    const tr = simulate(p, 1);
    expect(tr.battery.slice(0, 31).every((v) => v === 0)).toBe(true);
    expect(tr.battery[31]).toBeGreaterThan(0);
  });

  it("keeps governor and battery power within their limits", () => {
    const p = { ...DEFAULTS, H: 1, lossPu: 0.2, governorHeadroom: 0.01, batterySize: 0.02 };
    const tr = simulate(p);
    expect(Math.max(...tr.governor)).toBeLessThanOrEqual(p.governorHeadroom);
    expect(Math.max(...tr.battery)).toBe(p.batterySize);
    expect(tr.battery.every((v) => Math.abs(v) <= p.batterySize)).toBe(true);
  });

  it("marks the load-shedding threshold without changing the simulated load", () => {
    const p = { ...bare, H: 5, lossPu: 0.1 };
    const tr = simulate(p, 5);
    expect(tr.f[200]).toBeCloseTo(UFLS_HZ, 9);
    expect(summarise(tr, p).uflsTriggered).toBe(true);
    expect(tr.f.at(-1)).toBeCloseTo(47.5, 9);
    expect(tr.rocof.every((v) => Math.abs(v + 0.5) < 1e-12)).toBe(true);
  });

  it("returns finite traces at every corner of the six slider ranges", () => {
    for (let mask = 0; mask < 64; mask++) {
      const p = {
        ...DEFAULTS,
        lossPu: mask & 1 ? 0.2 : 0.01,
        H: mask & 2 ? 8 : 1,
        droop: mask & 4 ? 0.12 : 0.02,
        governorHeadroom: mask & 8 ? 0.2 : 0,
        batterySize: mask & 16 ? 0.1 : 0,
        batteryDelay: mask & 32 ? 3 : 0.05,
      };
      const tr = simulate(p);
      expect(Object.values(tr).every((values) => values.every(Number.isFinite))).toBe(true);
      expect(tr.t).toHaveLength(3001);
    }
  });
});

/**
 * Single-bus aggregate frequency model.
 *
 *   2H/f0 · dΔf/dt = ΔPm − ΔPe          (swing equation, per unit on system base)
 *
 * Powers are per unit of pre-event system load. Δf is in Hz.
 * A generator trip of size `lossPu` removes that much mechanical power.
 * Governor droop and a battery fast-frequency-response block push back.
 */

export interface Params {
  /** System inertia constant H, seconds (on system base). */
  H: number;
  /** Nominal frequency, Hz. */
  f0: number;
  /** Generation lost, per unit of system load. */
  lossPu: number;
  /** Governor droop R, per unit (0.05 = 5%). 0 or Infinity disables the governor. */
  droop: number;
  /** Governor time constant, seconds. */
  governorTau: number;
  /** Fraction of system load that governors can add at most (headroom), per unit. */
  governorHeadroom: number;
  /** Load damping D, per unit load per per-unit frequency. */
  loadDamping: number;
  /** Battery capacity, per unit of system load. */
  batterySize: number;
  /** Battery response delay (measurement + inverter), seconds. */
  batteryDelay: number;
  /** Frequency deviation (Hz) at which the battery reaches full output. */
  batteryFullAt: number;
}

export const DEFAULTS: Params = {
  H: 4,
  f0: 50,
  lossPu: 0.08,
  droop: 0.05,
  governorTau: 4,
  governorHeadroom: 0.1,
  loadDamping: 1,
  batterySize: 0.03,
  batteryDelay: 0.3,
  batteryFullAt: 0.5,
};

export interface Trace {
  t: number[];
  f: number[];
  rocof: number[];
  governor: number[];
  battery: number[];
}

interface State {
  df: number; // Hz deviation
  gov: number; // governor output, pu (positive = adds power)
}

function batteryOutput(p: Params, dfDelayed: number): number {
  if (p.batterySize <= 0) return 0;
  const x = -dfDelayed / p.batteryFullAt;
  return Math.max(-1, Math.min(1, x)) * p.batterySize;
}

/** Fixed-step RK4. The battery sees the frequency `batteryDelay` seconds ago. */
export function simulate(p: Params, duration = 30, dt = 0.01): Trace {
  const n = Math.round(duration / dt);
  const delaySteps = Math.round(p.batteryDelay / dt);
  const hasGov = Number.isFinite(p.droop) && p.droop > 0;
  const history: number[] = [];

  const deriv = (s: State, batt: number): State => {
    const dfPu = s.df / p.f0;
    const govTarget = hasGov
      ? Math.min(p.governorHeadroom, Math.max(-p.governorHeadroom, -dfPu / p.droop))
      : 0;
    const dGov = (govTarget - s.gov) / p.governorTau;
    const dPm = -p.lossPu + s.gov + batt;
    const dPe = p.loadDamping * dfPu;
    const ddf = ((dPm - dPe) * p.f0) / (2 * p.H);
    return { df: ddf, gov: dGov };
  };

  let s: State = { df: 0, gov: 0 };
  const tr: Trace = { t: [], f: [], rocof: [], governor: [], battery: [] };

  for (let i = 0; i <= n; i++) {
    history.push(s.df);
    const delayed = history[Math.max(0, i - delaySteps)] ?? 0;
    const batt = batteryOutput(p, delayed);
    const d1 = deriv(s, batt);
    tr.t.push(i * dt);
    tr.f.push(p.f0 + s.df);
    tr.rocof.push(d1.df);
    tr.governor.push(s.gov);
    tr.battery.push(batt);

    const add = (a: State, b: State, k: number): State => ({
      df: a.df + b.df * k,
      gov: a.gov + b.gov * k,
    });
    const k2 = deriv(add(s, d1, dt / 2), batt);
    const k3 = deriv(add(s, k2, dt / 2), batt);
    const k4 = deriv(add(s, k3, dt), batt);
    s = {
      df: s.df + (dt / 6) * (d1.df + 2 * k2.df + 2 * k3.df + k4.df),
      gov: s.gov + (dt / 6) * (d1.gov + 2 * k2.gov + 2 * k3.gov + k4.gov),
    };
  }
  return tr;
}

export function summarise(tr: Trace, p: Params) {
  let nadir = Infinity;
  let nadirT = 0;
  let maxRocof = 0;
  tr.f.forEach((f, i) => {
    if (f < nadir) {
      nadir = f;
      nadirT = tr.t[i] ?? 0;
    }
    maxRocof = Math.max(maxRocof, Math.abs(tr.rocof[i] ?? 0));
  });
  return {
    nadir,
    nadirT,
    initialRocof: tr.rocof[0] ?? 0,
    maxRocof,
    settling: tr.f[tr.f.length - 1] ?? p.f0,
    uflsTriggered: nadir <= UFLS_HZ,
  };
}

/** NEM frequency operating standard: normal band 49.85–50.15, contingency band 49.5, UFLS from 49.0. */
export const NORMAL_LOW_HZ = 49.85;
export const CONTINGENCY_LOW_HZ = 49.5;
export const UFLS_HZ = 49.0;

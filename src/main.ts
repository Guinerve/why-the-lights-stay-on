import { drawChart } from "./chart";
import {
  CONTINGENCY_LOW_HZ, DEFAULTS, NORMAL_LOW_HZ, UFLS_HZ,
  simulate, summarise, type Params,
} from "./sim";

const DURATION = 30;

/** Slider id → how to turn the raw slider value into model units + a label. */
const controls: Record<string, { toModel: (v: number) => number; label: (v: number) => string; key: keyof Params }> = {
  lossPu: { key: "lossPu", toModel: (v) => v / 100, label: (v) => `${v}%  (${((v / 100) * 25000 / 1).toFixed(0)} MW of ~25 GW)` },
  H: { key: "H", toModel: (v) => v, label: (v) => `${v.toFixed(1)} s` },
  droop: { key: "droop", toModel: (v) => v / 100, label: (v) => `${v}%` },
  governorHeadroom: { key: "governorHeadroom", toModel: (v) => v / 100, label: (v) => `${v}% of load` },
  batterySize: { key: "batterySize", toModel: (v) => v / 100, label: (v) => (v === 0 ? "none" : `${v}% of load`) },
  batteryDelay: { key: "batteryDelay", toModel: (v) => v, label: (v) => `${v.toFixed(2)} s` },
};

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;

function readParams(): Params {
  const p: Params = { ...DEFAULTS };
  for (const [id, c] of Object.entries(controls)) {
    const el = $<HTMLInputElement>(`#${id}`);
    const v = Number(el.value);
    (p[c.key] as number) = c.toModel(v);
    document.querySelector(`output[data-for="${id}"]`)!.textContent = c.label(v);
  }
  return p;
}

function render(): void {
  const p = readParams();
  const tr = simulate(p, DURATION);
  const s = summarise(tr, p);

  drawChart($("#chart-f"), [{ x: tr.t, y: tr.f, color: "var(--accent)" }], {
    yMin: 48, yMax: 50.2, xMax: DURATION, yTicks: [48, 48.5, 49, 49.5, 50],
    yFormat: (v) => v.toFixed(1),
    hlines: [
      { y: NORMAL_LOW_HZ, color: "var(--ok)", label: "normal band" },
      { y: CONTINGENCY_LOW_HZ, color: "var(--warn)", label: "contingency 49.5" },
      { y: UFLS_HZ, color: "var(--bad)", label: "load shedding 49.0" },
    ],
  });
  drawChart($("#chart-r"), [{ x: tr.t, y: tr.rocof, color: "var(--accent2)" }], {
    yMin: -2, yMax: 0.5, xMax: DURATION, yTicks: [-2, -1, 0],
    yFormat: (v) => v.toFixed(1),
    hlines: [{ y: -1, color: "var(--warn)", label: "1 Hz/s" }],
  });
  // Axis tall enough for the larger of the governor headroom, the battery and the lost generation, in percent.
  const pYMax = Math.max(12, Math.ceil(Math.max(p.governorHeadroom, p.batterySize, p.lossPu) * 100 / 3) * 3);
  drawChart($("#chart-p"), [
    { x: tr.t, y: tr.governor.map((v) => v * 100), color: "var(--gov)" },
    { x: tr.t, y: tr.battery.map((v) => v * 100), color: "var(--batt)" },
  ], {
    yMin: 0, yMax: pYMax, xMax: DURATION, yTicks: [0, pYMax / 3, (2 * pYMax) / 3, pYMax].map(Math.round), yFormat: (v) => `${v}%`,
    hlines: [
      { y: pYMax * 0.92, color: "var(--gov)", label: "governors" },
      { y: pYMax * 0.78, color: "var(--batt)", label: "battery" },
    ],
  });

  $("#nadir").textContent = `nadir ${s.nadir.toFixed(2)} Hz at ${s.nadirT.toFixed(1)} s`;
  $("#rocof").textContent = `starts at ${s.initialRocof.toFixed(2)} Hz/s`;

  const v = $("#verdict");
  v.className = "verdict";
  if (s.uflsTriggered) {
    v.classList.add("bad");
    v.textContent = `Frequency reaches ${s.nadir.toFixed(2)} Hz, below 49.0 Hz: automatic under-frequency load shedding would start cutting customers off.`;
  } else if (s.nadir < CONTINGENCY_LOW_HZ) {
    v.classList.add("warn");
    v.textContent = `Frequency dips to ${s.nadir.toFixed(2)} Hz, outside the 49.5 Hz contingency band, but stays above load shedding. Operators would be in a very bad hour.`;
  } else {
    v.classList.add("ok");
    v.textContent = `Frequency bottoms out at ${s.nadir.toFixed(2)} Hz and recovers, inside the contingency band. The lights stay on.`;
  }
}

const wide = window.matchMedia("(min-width: 1040px)");
const syncMore = () => { $<HTMLDetailsElement>("#more").open = wide.matches; }; // always open on wide screens, collapsed on phones
syncMore(); wide.addEventListener("change", syncMore);
document.querySelectorAll("input[type=range]").forEach((el) => el.addEventListener("input", render));
render();

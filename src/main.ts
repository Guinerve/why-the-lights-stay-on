import { drawChart, niceTicks } from "./chart";
import { EVENT_PARAMS, KOGAN_CREEK } from "./event";
import {
  CONTINGENCY_LOW_HZ, DEFAULTS, NORMAL_LOW_HZ, UFLS_HZ,
  simulate, summarise, type Params,
} from "./sim";

const DURATION = 30;

/** Slider id → how to turn the raw slider value into model units + a label. */
const controls: Record<string, { toModel: (v: number) => number; label: (v: number) => string; key: keyof Params }> = {
  lossPu: { key: "lossPu", toModel: (v) => v / 100, label: (v) => `${v}% (${((v / 100) * KOGAN_CREEK.assumedBaseMw).toFixed(0)} MW on assumed ${KOGAN_CREEK.assumedBaseMw / 1000} GW)` },
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
    p[c.key] = c.toModel(v);
    document.querySelector(`output[data-for="${id}"]`)!.textContent = c.label(v);
  }
  return p;
}

function render(): void {
  const p = readParams();
  const tr = simulate(p, DURATION);
  const s = summarise(tr, p);
  const fMin = Math.min(48, Math.floor(s.nadir * 2) / 2);
  const fMax = Math.max(50.2, Math.ceil(Math.max(...tr.f) * 2) / 2);
  const rMin = Math.min(-2, Math.floor(Math.min(...tr.rocof)));
  const rMax = Math.max(0.5, Math.ceil(Math.max(...tr.rocof)));

  const fAxis = niceTicks(fMin, fMax);
  drawChart($("#chart-f"), [{ x: tr.t, y: tr.f, color: "var(--accent)" }], {
    yMin: fMin, yMax: fMax, xMax: DURATION,
    yTicks: fAxis.ticks,
    yFormat: fAxis.format,
    hlines: [
      { y: NORMAL_LOW_HZ, color: "var(--ok)", label: "normal band" },
      { y: CONTINGENCY_LOW_HZ, color: "var(--warn)", label: "event reference 49.5" },
      { y: UFLS_HZ, color: "var(--bad)", label: "load shedding 49.0" },
    ],
  });
  const rAxis = niceTicks(rMin, rMax);
  drawChart($("#chart-r"), [{ x: tr.t, y: tr.rocof, color: "var(--accent2)" }], {
    yMin: rMin, yMax: rMax, xMax: DURATION,
    yTicks: rAxis.ticks,
    yFormat: rAxis.format,
    hlines: [{ y: -1, color: "var(--warn)", label: "−1 Hz/s reference" }],
  });
  // Axis tall enough for the larger of the governor headroom, the battery and the lost generation, in percent.
  const pYMax = Math.max(12, Math.ceil(Math.max(p.governorHeadroom, p.batterySize, p.lossPu) * 100 / 3) * 3);
  const pYMin = Math.min(0, Math.floor(Math.min(...tr.governor, ...tr.battery) * 100 / 3) * 3);
  drawChart($("#chart-p"), [
    { x: tr.t, y: tr.governor.map((v) => v * 100), color: "var(--gov)" },
    { x: tr.t, y: tr.battery.map((v) => v * 100), color: "var(--batt)" },
  ], {
    yMin: pYMin, yMax: pYMax, xMax: DURATION,
    yTicks: Array.from({ length: 4 }, (_, i) => pYMin + i * (pYMax - pYMin) / 3),
    yFormat: (v) => `${v.toFixed(0)}%`,
  });

  $("#nadir").textContent = `minimum ${s.nadir.toFixed(2)} Hz at ${s.nadirT.toFixed(1)} s`;
  $("#rocof").textContent = `starts at ${s.initialRocof.toFixed(2)} Hz/s`;

  const v = $("#verdict");
  v.className = "verdict";
  if (s.uflsTriggered) {
    v.classList.add("bad");
    v.textContent = `The model reaches ${s.nadir.toFixed(2)} Hz. This is at or below the example 49.0 Hz load shedding threshold. The simulation does not shed any load.`;
  } else if (s.nadir < CONTINGENCY_LOW_HZ) {
    v.classList.add("warn");
    v.textContent = `The model reaches ${s.nadir.toFixed(2)} Hz. This is below the 49.5 Hz event reference but above the example load shedding threshold.`;
  } else {
    v.classList.add("ok");
    v.textContent = `The model minimum is ${s.nadir.toFixed(2)} Hz, above the 49.5 Hz event reference. This model shows frequency only, so it cannot predict customer outages.`;
  }
}

function renderEvent(): void {
  const tr = simulate(EVENT_PARAMS, DURATION);
  const s = summarise(tr, EVENT_PARAMS);
  drawChart($("#chart-event"), [{ x: tr.t, y: tr.f, color: "var(--accent)" }], {
    yMin: 49.5, yMax: 50.05, xMax: DURATION, yTicks: [49.5, 49.75, 50],
    yFormat: (v) => v.toFixed(2),
    hlines: [{ y: KOGAN_CREEK.reportedLowHz, color: "var(--muted)", label: "reported minimum 49.61 Hz" }],
  });
  $("#event-nadir").textContent = `${s.nadir.toFixed(2)} Hz at ${s.nadirT.toFixed(2)} s`;
  $("#event-gap").textContent = `+${(s.nadir - KOGAN_CREEK.reportedLowHz).toFixed(2)} Hz`;
  $("#event-result").textContent = `The model falls, reaches a minimum, then partly recovers. Its minimum is ${(s.nadir - KOGAN_CREEK.reportedLowHz).toFixed(2)} Hz higher than the reported minimum. The model reaches its minimum at ${s.nadirT.toFixed(2)} s. That time is a calculated result, not an event measurement.`;
  $<HTMLAnchorElement>("#event-source").href = KOGAN_CREEK.sourceUrl;
}

const wide = window.matchMedia("(min-width: 1040px)");
const syncMore = () => { $<HTMLDetailsElement>("#more").open = wide.matches; }; // always open on wide screens, collapsed on phones
syncMore(); wide.addEventListener("change", syncMore);
document.querySelectorAll("input[type=range]").forEach((el) => el.addEventListener("input", render));
renderEvent();
render();

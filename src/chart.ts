export interface Series {
  x: number[];
  y: number[];
  color: string;
  label?: string;
}
export interface HLine {
  y: number;
  color: string;
  label: string;
}
export interface ChartOpts {
  yMin: number;
  yMax: number;
  xMax: number;
  yTicks: number[];
  hlines?: HLine[];
  yFormat?: (v: number) => string;
}

const W = 520;
const H = 190;
const M = { l: 48, r: 10, t: 8, b: 22 };

export function drawChart(svg: SVGSVGElement, series: Series[], o: ChartOpts): void {
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const sx = (x: number) => M.l + (x / o.xMax) * iw;
  const sy = (y: number) => M.t + (1 - (Math.min(o.yMax, Math.max(o.yMin, y)) - o.yMin) / (o.yMax - o.yMin)) * ih;
  const fmt = o.yFormat ?? ((v: number) => String(v));
  let out = "";
  for (const t of o.yTicks) {
    out += `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${sy(t)}" y2="${sy(t)}"/>`;
    out += `<text class="tick" x="${M.l - 6}" y="${sy(t) + 4}" text-anchor="end">${fmt(t)}</text>`;
  }
  for (let s = 0; s <= o.xMax; s += o.xMax / 6) {
    out += `<text class="tick" x="${sx(s)}" y="${H - 5}" text-anchor="middle">${Math.round(s)}s</text>`;
  }
  for (const h of o.hlines ?? []) {
    if (h.y < o.yMin || h.y > o.yMax) continue;
    out += `<line class="thresh" stroke="${h.color}" x1="${M.l}" x2="${W - M.r}" y1="${sy(h.y)}" y2="${sy(h.y)}"/>`;
    out += `<text class="thresh-label" fill="${h.color}" x="${W - M.r - 2}" y="${sy(h.y) - 3}" text-anchor="end">${h.label}</text>`;
  }
  for (const s of series) {
    const step = Math.max(1, Math.floor(s.x.length / 600));
    let d = "";
    for (let i = 0; i < s.x.length; i += step) {
      d += `${d ? "L" : "M"}${sx(s.x[i]!).toFixed(1)},${sy(s.y[i]!).toFixed(1)}`;
    }
    out += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round"/>`;
  }
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = out;
}

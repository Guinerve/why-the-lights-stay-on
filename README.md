# Why the lights stay on

[![CI](https://github.com/Guinerve/why-the-lights-stay-on/actions/workflows/ci.yml/badge.svg)](https://github.com/Guinerve/why-the-lights-stay-on/actions/workflows/ci.yml)

An interactive explanation of grid frequency after a generator trip. Change inertia, generation loss, governor response, and battery response. Then compare one fixed scenario with a documented event.

![Frequency charts beside the model assumptions](assets/screenshot.png)

## Run

Use Node.js 22 (22.12 or later) or Node.js 24.

```bash
npm ci
npm run dev
```

Open `http://localhost:5191`. The server binds to `0.0.0.0`, so other Tailscale devices can use `http://<tailscale-ip>:5191`. Port 5191 is fixed. The server fails if the port is occupied.

```bash
npm test          # 14 tests
npm run build    # TypeScript check and production build
npm run preview  # Serve the build on port 5191; stop the dev server first
```

The build is a static site in `dist/`. Relative asset paths support deployment under a subdirectory. No API keys or backend are needed.

## A documented event, not a replay

On **9 October 2019**, Kogan Creek in Queensland tripped from **748 MW**. AEMO reports that frequency fell to **49.61 Hz**. The South Australia virtual power plant detected the fall and injected power to help recovery.

Source: [AEMO, *Virtual Power Plant Demonstration*, knowledge sharing report #1, section 2.1.1, page 7](https://arena.gov.au/assets/2020/03/aemo-virtual-power-plant-demonstration-knowledge-sharing-report-1.pdf#page=7).

The comparison uses the reported loss, not fitted response parameters:

| Quantity | Fixed model input or result | Evidence status |
| --- | --- | --- |
| Generation lost | 748 MW | Reported by AEMO |
| System load base | 25,000 MW | Assumed, not event data |
| Per-unit loss | 0.02992 (2.992%) | Calculated from loss and assumed base |
| Inertia H | 4 s | Assumed |
| Governor droop / time constant / headroom | 5% / 4 s / 10% | Assumed |
| Load damping | 1 | Assumed |
| Battery power | 0 | Omitted; aggregate event capacity is not established by this source |
| Initial frequency | 50 Hz | Assumed |
| Model minimum | 49.78 Hz at 2.09 s | Calculated over 30 s at a 0.01 s step |
| Reported event minimum | 49.61 Hz | Reported by AEMO; no event timing claim |
| Model minus reported minimum | +0.17 Hz | Calculated, before rounding |

The model understates the frequency fall. Its chart shows the calculated trace and a dashed line at the reported minimum. **The line is not a measured time series.** The comparison stays fixed when the six existing sliders change. No controls were added.

![Fixed model trace and the reported minimum reference](assets/event-comparison.png)

This is an engineering communication example: separate evidence from assumptions, show the error, and state what the result cannot prove. Matching one minimum would not validate the timing or cause. See [the source notes and model differences](research/2026-10-13-kogan-creek-comparison.md).

## Model and limits

The single-bus swing equation uses powers per unit of pre-event system load:

```text
2H/f₀ · dΔf/dt = −loss + governor + battery − D·Δf/f₀
```

The governor follows a droop target with a first-order lag and a headroom limit. The battery uses delayed frequency feedback. It reaches its power limit at a 0.5 Hz deviation. The integrator uses fixed-step RK4 for frequency and governor state. Battery output is held constant within each integration step; delay is rounded to whole steps.

The model has no transmission network, voltage, separate machines, governor deadbands, secondary frequency control, battery energy limit, or protection action. It can settle below 50 Hz. The battery can absorb power if delayed frequency feedback is above 50 Hz. Power and frequency axes expand to show extreme slider results.

The chart uses 49.85 Hz as a lower normal-band reference, 49.5 Hz as a single-generation-event reference, and 49.0 Hz as an illustrative load-shedding threshold. These are not a complete compliance test. Actual requirements and protection settings depend on the region and event. See the [AEMC frequency operating standard review](https://www.aemc.gov.au/market-reviews-advice/review-frequency-operating-standard-2022).

Crossing 49.0 Hz changes the warning only. The simulation does not shed load or predict customer outages. **Educational, not an operational tool.**

## Verification

`npm test` checks:

- Analytic linear decline without governor response, damping, or battery response.
- Steady-state droop balance, with and without load damping.
- The effects of inertia, battery power, and battery delay.
- Nadir stability when the integration step is halved.
- Delayed feedback, response power limits, and the absence of load-shedding action.
- Finite traces at all 64 corners of the six slider ranges.
- Event loss conversion, the numerical mismatch, and independence from slider changes.

CI runs the tests and the TypeScript/build check on pushes and pull requests. These checks verify the implementation and selected equations. **They do not validate the model against the real grid.**

Browser checks cover the fixed comparison, slider updates, keyboard use, chart expansion, console errors, and horizontal overflow. Wide screens use a sticky chart column. Narrow screens use a capped chart panel with rate-of-change and power charts behind “More charts”.

Checked on 13 October 2026 in Chromium through Playwright: no horizontal overflow at 320, 390, 768, 1024, or 1440 px wide, or at 844 × 390 in landscape. All 64 slider-range corners rendered finite chart paths. The fixed comparison stayed unchanged. Light and dark layouts were inspected. No console warnings or errors were reported. `npm audit` reported zero vulnerabilities.

## Source map

- `src/sim.ts`: model, integration, and summary metrics.
- `src/chart.ts`: SVG chart rendering.
- `src/main.ts`: slider bindings and the fixed comparison.
- `src/event.ts`: reported values, source URL, and assumed comparison inputs.
- `index.html`: explanation, source citation, and model limits.

TypeScript, Vite, SVG, and Vitest. [MIT license](LICENSE).

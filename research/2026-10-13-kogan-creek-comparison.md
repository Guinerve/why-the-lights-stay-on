# Kogan Creek: evidence and model comparison

## Finding

The 9 October 2019 generator trip gives this explainer a specific evidence check. With the documented 748 MW loss on an assumed 25 GW system base, the fixed model reaches 49.7766 Hz. AEMO reports a fall to 49.61 Hz. The model minimum is 0.1666 Hz higher.

This difference is not a fitted error bound. It is one comparison under stated assumptions. It does not establish which missing mechanism caused the difference.

## Primary evidence

Source: AEMO, *Virtual Power Plant Demonstration*, knowledge sharing report #1, March 2020, section 2.1.1, page 7, Figure 1. The downloaded copy lists a revenue-section revision dated 17 July 2020. Accessed 13 October 2026. [AEMO report hosted by ARENA (PDF)](https://arena.gov.au/assets/2020/03/aemo-virtual-power-plant-demonstration-knowledge-sharing-report-1.pdf#page=7).

The report states:

> During this event, the largest generating unit (at Kogan Creek in Queensland) in the National Electricity Market (NEM) tripped off unexpectedly from 748 MW and power system frequency immediately dropped to 49.61 Hz, which is below the normal operating range.

It then states that the SA VPP detected the excursion and injected power to help recovery. Figure 1 shows that VPP response alongside frequency. The report does not establish the full set of aggregate model inputs used here. No frequency samples were digitised. No measured time-to-minimum or initial RoCoF is claimed in the explainer.

## Calculation

Only the loss in MW is an event input. The following are teaching assumptions:

- Pre-event system load base: 25,000 MW.
- Initial frequency: 50 Hz.
- System inertia H: 4 s.
- Governor droop: 5%; time constant: 4 s; headroom: 10% of load.
- Load damping: 1 per-unit load per per-unit frequency.
- Battery power: zero. This omits the documented VPP response rather than guessing an aggregate capacity.

The per-unit loss is `748 / 25000 = 0.02992`. The initial model RoCoF is `−0.02992 × 50 / (2 × 4) = −0.187 Hz/s`.

`simulate(EVENT_PARAMS, 30)` uses the default 0.01 s step. `summarise()` gives:

| Calculated quantity | Value |
| --- | --- |
| Minimum frequency | 49.7766265 Hz |
| Time to minimum | 2.09 s |
| Frequency at 30 s | 49.9295747 Hz |
| Minimum minus reported low frequency | +0.1666265 Hz |

The displayed values are 49.78 Hz and +0.17 Hz. The difference is calculated before rounding. These values are reproducible with `npm test -- src/event.test.ts`. Definitions are in `src/event.ts`; equations are in `src/sim.ts`.

## Where the model differs

The model treats the system as one frequency and one aggregate inertia. It cannot show regional oscillations, transmission constraints, voltage, or individual machines. It starts exactly at 50 Hz and applies one instant loss.

One first-order governor represents all responding units. The model has no deadband, unit-specific controls, or measured reserve availability. Droop is on the assumed system-load base, not on each unit’s rating.

The fixed comparison omits batteries. The interactive battery block is a delayed proportional power response, not the documented VPP control system. It has no state of charge or energy limit. Its feedback delay is rounded to integration steps.

The model has no secondary control to restore 50 Hz and no protection action. The 49.0 Hz warning is illustrative. It does not disconnect customers or change the load. Frequency references are not a complete NEM compliance assessment; see the [AEMC frequency operating standard review](https://www.aemc.gov.au/market-reviews-advice/review-frequency-operating-standard-2022).

## Communication decision

Use a fixed model trace and a horizontal line at the reported minimum. Do not draw an invented measured curve, label this a replay, or tune inertia to force a match. Keep the comparison independent of the sliders so readers do not confuse a changed teaching scenario with the event.

The defensible conclusion is limited: the model explains the direction of the response, but this assumed scenario understates the observed frequency fall. Event reconstruction would need measured system conditions, unit and battery response data, and a frequency time series.

## Implementation checks

On 13 October 2026, all 14 tests passed. The TypeScript check and production build passed. `npm audit` reported zero vulnerabilities.

The running app was checked with Playwright in Chromium. All 64 corners of the six slider ranges produced finite chart paths. The event trace stayed fixed. Keyboard input changed inertia from 4.5 s to 4.6 s and updated the interactive minimum without changing the comparison.

No horizontal overflow was found at widths of 320, 390, 768, 1024, and 1440 px, or at 844 × 390 in landscape. The phone “More charts” control opened a scrollable panel capped at 32% of viewport height. Light and dark layouts were inspected. No console warnings or errors were reported.

These checks establish implementation behaviour. They are not event validation.

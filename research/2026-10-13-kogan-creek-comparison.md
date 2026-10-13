# Kogan Creek: evidence and model comparison

## Finding

The generator trip on 9 October 2019 gives this explainer a specific check against evidence. I apply the documented 748 MW loss to an assumed 25 GW system base. The fixed model then reaches 49.7766 Hz. AEMO reports a fall to 49.61 Hz. The model minimum is 0.1666 Hz higher.

This difference is not a fitted error bound. It is one comparison under stated assumptions. It does not show which missing mechanism causes the difference.

## Primary evidence

Source: AEMO, *Virtual Power Plant Demonstration*, knowledge sharing report #1, March 2020, section 2.1.1, page 7, Figure 1. The downloaded copy lists a revision to the revenue section dated 17 July 2020. Accessed 13 October 2026. [AEMO report hosted by ARENA (PDF)](https://arena.gov.au/assets/2020/03/aemo-virtual-power-plant-demonstration-knowledge-sharing-report-1.pdf#page=7).

The report states:

> During this event, the largest generating unit (at Kogan Creek in Queensland) in the National Electricity Market (NEM) tripped off unexpectedly from 748 MW and power system frequency immediately dropped to 49.61 Hz, which is below the normal operating range.

The report then states that the SA VPP detected the excursion and injected power to help recovery. Figure 1 shows that VPP response together with frequency. The report does not give the full set of aggregate inputs that this model uses. I did not digitise any frequency samples. The explainer makes no claim about the measured time to minimum or the measured initial RoCoF.

## Calculation

Only the loss in MW comes from the event. All other inputs are teaching assumptions:

- System load before the event: 25,000 MW.
- Initial frequency: 50 Hz.
- System inertia H: 4 s.
- Governor droop 5%, time constant 4 s, headroom 10% of load.
- Load damping: 1 per unit load per per unit frequency.
- Battery power: zero. This leaves out the documented VPP response instead of guessing its total capacity.

The per unit loss is `748 / 25000 = 0.02992`. The initial model RoCoF is `−0.02992 × 50 / (2 × 4) = −0.187 Hz/s`.

`simulate(EVENT_PARAMS, 30)` uses the default 0.01 s step. `summarise()` gives these values:

| Calculated quantity | Value |
| --- | --- |
| Minimum frequency | 49.7766265 Hz |
| Time to minimum | 2.09 s |
| Frequency at 30 s | 49.9295747 Hz |
| Minimum minus reported low frequency | +0.1666265 Hz |

The page shows 49.78 Hz and +0.17 Hz. The difference is calculated before rounding. `npm test -- src/event.test.ts` checks these values. `src/event.ts` holds the event inputs and `src/sim.ts` holds the equations.

## Where the model differs

The model treats the system as one frequency with one aggregate inertia. It cannot show regional oscillations, transmission constraints, voltage or individual machines. It starts at exactly 50 Hz and applies one instant loss.

One governor with a first order lag stands in for all responding units. The model has no deadband, no controls for each unit and no measured reserve availability. Droop is on the assumed system load base, not on the rating of each unit.

The fixed comparison has no batteries. The battery block in the interactive part is a delayed proportional power response. It is not the documented VPP control system. It has no state of charge or energy limit. Its feedback delay is rounded to whole integration steps.

The model has no secondary control to restore 50 Hz and no protection action. The 49.0 Hz warning is an example. It does not disconnect customers or change the load. The frequency reference lines are not a complete NEM compliance check. See the [AEMC frequency operating standard review](https://www.aemc.gov.au/market-reviews-advice/review-frequency-operating-standard-2022).

## How the page presents it

The page shows a fixed model trace and a horizontal line at the reported minimum. It does not draw an invented measured curve, call the trace a replay or tune inertia to force a match. The comparison does not follow the sliders, so readers do not confuse a changed teaching scenario with the event.

The conclusion is limited. The model explains the direction of the response, but this assumed scenario understates the real frequency fall. A reconstruction of the event would need measured system conditions, response data for units and batteries, and a frequency time series.

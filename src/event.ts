import { DEFAULTS, type Params } from "./sim";

/** AEMO, VPP Demonstration knowledge sharing report #1, section 2.1.1, p. 7. */
export const KOGAN_CREEK = {
  lostMw: 748,
  reportedLowHz: 49.61,
  assumedBaseMw: 25000,
  sourceUrl: "https://arena.gov.au/assets/2020/03/aemo-virtual-power-plant-demonstration-knowledge-sharing-report-1.pdf#page=7",
} as const;

/** Only the lost MW comes from the event. All other inputs are teaching assumptions. */
export const EVENT_PARAMS: Readonly<Params> = {
  ...DEFAULTS,
  lossPu: KOGAN_CREEK.lostMw / KOGAN_CREEK.assumedBaseMw,
  // The report does not establish aggregate battery capacity for this model.
  batterySize: 0,
};

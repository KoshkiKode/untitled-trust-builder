/**
 * Jurisdiction data loader.
 *
 * Data lives in `./states/<CODE>.json` (validated by `tests/states.test.ts` against
 * `stateSchema.ts`). Each group carries a `confidence` flag; the helpers below let the
 * plan/document generators use only data that was actually verified and fall back to
 * clearly-labelled generic guidance otherwise.
 */
import type { DeedMechanism, StateGroupKey, StateLaw } from "./stateSchema";
import AK from "./states/AK.json";
import AL from "./states/AL.json";
import AR from "./states/AR.json";
import AS from "./states/AS.json";
import AZ from "./states/AZ.json";
import CA from "./states/CA.json";
import CO from "./states/CO.json";
import CT from "./states/CT.json";
import DC from "./states/DC.json";
import DE from "./states/DE.json";
import FL from "./states/FL.json";
import GA from "./states/GA.json";
import GU from "./states/GU.json";
import HI from "./states/HI.json";
import IA from "./states/IA.json";
import ID from "./states/ID.json";
import IL from "./states/IL.json";
import IN from "./states/IN.json";
import KS from "./states/KS.json";
import KY from "./states/KY.json";
import LA from "./states/LA.json";
import MA from "./states/MA.json";
import MD from "./states/MD.json";
import ME from "./states/ME.json";
import MI from "./states/MI.json";
import MN from "./states/MN.json";
import MO from "./states/MO.json";
import MP from "./states/MP.json";
import MS from "./states/MS.json";
import MT from "./states/MT.json";
import NC from "./states/NC.json";
import ND from "./states/ND.json";
import NE from "./states/NE.json";
import NH from "./states/NH.json";
import NJ from "./states/NJ.json";
import NM from "./states/NM.json";
import NV from "./states/NV.json";
import NY from "./states/NY.json";
import OH from "./states/OH.json";
import OK from "./states/OK.json";
import OR from "./states/OR.json";
import PA from "./states/PA.json";
import PR from "./states/PR.json";
import RI from "./states/RI.json";
import SC from "./states/SC.json";
import SD from "./states/SD.json";
import TN from "./states/TN.json";
import TX from "./states/TX.json";
import UT from "./states/UT.json";
import VA from "./states/VA.json";
import VI from "./states/VI.json";
import VT from "./states/VT.json";
import WA from "./states/WA.json";
import WI from "./states/WI.json";
import WV from "./states/WV.json";
import WY from "./states/WY.json";

export type { DeedMechanism, SourceRef, StateLaw, CountyOffice, ExecutionRule } from "./stateSchema";

const RAW = {
  AK, AL, AR, AS, AZ, CA, CO, CT, DC, DE, FL, GA, GU, HI, IA, ID, IL, IN, KS, KY, LA, MA, MD, ME, MI, MN,
  MO, MP, MS, MT, NC, ND, NE, NH, NJ, NM, NV, NY, OH, OK, OR, PA, PR, RI, SC, SD, TN, TX, UT, VA, VI, VT,
  WA, WI, WV, WY,
} as unknown as Record<string, StateLaw>;

export const STATES: Readonly<Record<string, StateLaw>> = RAW;

/** The eight jurisdictions with the longest-standing research, shown first in pickers. */
const FEATURED = ["MI", "OH", "WI", "MN", "IL", "IN", "PA", "NY"];

export function getState(code: string | undefined | null): StateLaw | undefined {
  return code ? STATES[code.toUpperCase()] : undefined;
}

export function stateName(code: string | undefined | null): string {
  return getState(code)?.name ?? (code ?? "");
}

/** A group is usable when it was at least partially verified from cited sources. */
export function isGroupUsable(state: StateLaw | undefined, key: StateGroupKey): boolean {
  if (!state) return false;
  const group = state[key] as { confidence?: string; sources: unknown[] };
  return group.confidence !== "unverified" && group.sources.length > 0;
}

/** Core groups that the plan/deed/LLC logic depends on. */
const CORE_KEYS: StateGroupKey[] = ["trust", "deed", "llc", "transferTax", "propertyTaxAffidavit"];

/** True when every core group is usable (replaces the old `complete` flag). */
export function hasCoreData(state: StateLaw | undefined): boolean {
  return !!state && CORE_KEYS.every((k) => isGroupUsable(state, k));
}

export function unverifiedFields(state: StateLaw, key: StateGroupKey): string[] {
  return (state[key] as { unverifiedFields?: string[] }).unverifiedFields ?? [];
}

export function deedMechanisms(state: StateLaw | undefined): DeedMechanism[] {
  return isGroupUsable(state, "deed") ? state!.deed.mechanisms : ["trust_only"];
}

export interface SelectableState {
  code: string;
  name: string;
  kind: StateLaw["kind"];
  coverage: StateLaw["coverage"];
  /** Core data usable (trust, deed, LLC, transfer tax, affidavit). */
  core: boolean;
}

export function allSelectableStates(): SelectableState[] {
  const all = Object.values(STATES).map<SelectableState>((s) => ({
    code: s.code,
    name: s.name,
    kind: s.kind,
    coverage: s.coverage,
    core: hasCoreData(s),
  }));
  const featured = FEATURED.map((c) => all.find((s) => s.code === c)).filter(Boolean) as SelectableState[];
  const rest = all.filter((s) => !FEATURED.includes(s.code)).sort((a, b) => a.name.localeCompare(b.name));
  return [...featured, ...rest];
}

/**
 * Shared infrastructure for document generators.
 *
 * The key idea: how an instrument must be signed (notary, witnesses, both, either) comes from
 * the jurisdiction data. When the data for a jurisdiction/instrument is unverified we never
 * guess the minimum; we fall back to the conservative union (notary acknowledgment AND the
 * witness attestation) and tell the reader to confirm with local counsel.
 */
import type { EstatePlan, GeneratedDocument, SigningRequirement } from "@/data/types";
import { DocBuilder, blocksToText, type DocBlock } from "@/data/docModel";
import { getState, isGroupUsable, type ExecutionRule, type StateLaw } from "@/data/jurisdictions";
import { DISCLAIMER, TEMPLATE_HEADER } from "@/lib/constants";
import { settlorNames, settlorsLabel, trustNameOf } from "@/lib/planModel";

export type Instrument = "trust" | "will" | "poa" | "healthcareDirective" | "deed";

export interface DocContext {
  plan: EstatePlan;
  today: Date;
  settlors: string[];
  settlorsLabel: string;
  joint: boolean;
  trustName: string;
  /** State whose law governs the trust, will, POA and health-care documents. */
  governingState?: StateLaw;
  governingStateName: string;
  /** Where signing/notarization will take place. */
  venue: { stateCode: string; stateName: string; county: string; law?: StateLaw };
}

export function makeContext(plan: EstatePlan, today: Date = new Date()): DocContext {
  const governingState = getState(plan.primaryStateCode);
  const venueCode = plan.notaryStateCode || plan.primaryStateCode;
  const venueLaw = getState(venueCode);
  return {
    plan,
    today,
    settlors: settlorNames(plan),
    settlorsLabel: settlorsLabel(plan),
    joint: plan.trustStructure === "joint" && settlorNames(plan).length > 1,
    trustName: trustNameOf(plan),
    governingState,
    governingStateName: governingState?.name ?? plan.primaryStateCode ?? "[STATE]",
    venue: {
      stateCode: venueCode,
      stateName: venueLaw?.name ?? venueCode ?? "[STATE]",
      county: plan.notaryCounty?.trim() ?? "",
      law: venueLaw,
    },
  };
}

export interface ResolvedRule {
  rule: ExecutionRule;
  verified: boolean;
  cite?: string | null;
}

export function resolveRule(law: StateLaw | undefined, instrument: Instrument): ResolvedRule {
  const unknown: ExecutionRule = { mode: "unknown", witnesses: 0 };
  if (!law) return { rule: unknown, verified: false };
  const group = instrument === "poa" ? law.poa : instrument === "will" ? law.will : instrument === "healthcareDirective" ? law.healthcareDirective : instrument === "deed" ? law.deed : law.trust;
  const key = instrument === "poa" ? "poa" : instrument === "healthcareDirective" ? "healthcareDirective" : instrument;
  const usable = isGroupUsable(law, key as "trust" | "will" | "poa" | "healthcareDirective" | "deed");
  if (!usable || group.execution.mode === "unknown") return { rule: unknown, verified: false };
  const cite = "cite" in group ? group.cite : "trustCodeCite" in group ? group.trustCodeCite : "todStatute" in group ? null : null;
  return { rule: group.execution, verified: true, cite };
}

/** Human-readable description of a rule, e.g. "notary acknowledgment and two witnesses". */
export function describeRule(rule: ExecutionRule, verified: boolean): string {
  const w = rule.witnesses === 1 ? "one witness" : `${rule.witnesses} witnesses`;
  switch (rule.mode) {
    case "none":
      return "no notary or witnesses required for validity (a notary acknowledgment is still commonly requested by banks, title companies and recorders)";
    case "notary":
      return "notary acknowledgment";
    case "witnesses":
      return w;
    case "witnesses_or_notary":
      return `either a notary acknowledgment or ${w}`;
    case "witnesses_and_notary":
      return `a notary acknowledgment and ${w}`;
    default:
      return verified ? "to be confirmed" : "not verified - use both a notary acknowledgment and two witnesses unless counsel advises otherwise";
  }
}

export function addHeader(d: DocBuilder, title: string, subtitle?: string) {
  d.banner(`${TEMPLATE_HEADER} - INFORMATIONAL MATERIALS ONLY, NOT LEGAL ADVICE`);
  d.note(DISCLAIMER, "info");
  d.title(title, subtitle);
}

export interface ExecSpec {
  instrument: Instrument;
  /** State whose law governs the formalities (defaults to the governing state). */
  lawState?: StateLaw;
  signers: { name: string; role?: string }[];
  /** Label for the witness block. */
  witnessLabel?: string;
  /** Text above the witness signature lines. */
  witnessAttestation?: string;
  notaryForm?: "acknowledgment" | "jurat";
  /** Skip the notary block entirely (e.g. instruments that are never notarized). */
  noNotary?: boolean;
  /** Show an optional notary block even when the law does not require one. */
  recommendNotary?: boolean;
}

/**
 * Adds signature lines plus whatever witness/notary blocks the governing law requires,
 * with an explanatory note. Returns the signing summary shown in the UI.
 */
export function addExecution(d: DocBuilder, ctx: DocContext, spec: ExecSpec): SigningRequirement {
  const law = spec.lawState ?? ctx.governingState;
  const { rule, verified } = resolveRule(law, spec.instrument);
  const stateName = law?.name ?? ctx.governingStateName;

  d.heading("EXECUTION", 2);
  for (const s of spec.signers) d.sig(s.name, s.role);

  let needsWitness = false;
  let needsNotary = false;
  let optionalNotary = false;
  let eitherOr = false;
  switch (rule.mode) {
    case "none":
      optionalNotary = spec.recommendNotary !== false;
      break;
    case "notary":
      needsNotary = true;
      break;
    case "witnesses":
      needsWitness = true;
      break;
    case "witnesses_or_notary":
      needsWitness = true;
      needsNotary = true;
      eitherOr = true;
      break;
    case "witnesses_and_notary":
      needsWitness = true;
      needsNotary = true;
      break;
    default:
      needsWitness = true;
      needsNotary = true;
  }
  if (spec.noNotary) {
    needsNotary = false;
    optionalNotary = false;
  }
  const witnessCount = needsWitness ? Math.max(rule.witnesses, rule.mode === "unknown" ? 2 : 1) : 0;

  const requirement = describeRule(rule, verified);
  const summary = `${stateName}: ${requirement}`;
  if (rule.mode === "unknown" || !verified) {
    d.note(
      `Signing requirements for ${stateName} have not been verified from primary sources in this version. Until confirmed with a ${stateName} attorney or the county recorder, complete BOTH the witness attestation and the notary acknowledgment below.`,
      "warn",
    );
  } else {
    d.note(
      `${stateName} requires: ${requirement}.${eitherOr ? " Many practitioners complete both for the best acceptance by banks and recorders." : ""}${rule.notes ? ` ${rule.notes}` : ""}`,
      "info",
    );
  }

  if (needsWitness && witnessCount > 0) {
    d.witness(
      witnessCount,
      spec.witnessLabel ?? "WITNESSES",
      spec.witnessAttestation ??
        `Each undersigned witness declares that the signer(s) above signed this instrument in my presence, appeared to be of sound mind and under no duress, fraud or undue influence, and that I am not a person disqualified from acting as a witness.`,
    );
  }
  if (needsNotary || optionalNotary) {
    const wording = ctx.venue.law && isGroupUsable(ctx.venue.law, "notary") ? ctx.venue.law.notary.requiredWording ?? undefined : undefined;
    if (optionalNotary && !needsNotary) d.note("Notarization is not required for validity here but is recommended; most institutions and recorders expect an acknowledged signature.", "info");
    d.notary(spec.notaryForm ?? "acknowledgment", ctx.venue.stateName, ctx.venue.county, spec.signers.map((s) => s.name), wording);
    if (ctx.venue.stateCode && ctx.venue.stateCode !== law?.code) {
      d.note(`The notarial act is performed in ${ctx.venue.stateName}; the formalities for this instrument are governed by ${stateName} law.`, "info");
    }
  }
  return { summary, verified };
}

/** Finalises a builder into a GeneratedDocument (blocks + plain-text body). */
export function finishDocument(
  d: DocBuilder,
  meta: Pick<GeneratedDocument, "kind" | "title"> & { propertyId?: string; signing?: SigningRequirement },
): GeneratedDocument {
  const blocks: DocBlock[] = d.finish();
  return { ...meta, blocks, body: blocksToText(blocks) };
}

export const BLANK = "____________________";
export const blankIf = (v: string | undefined | null, placeholder: string): string => (v && v.trim() ? v.trim() : placeholder);

export function fullDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Plan factory, derived-value helpers and (de)serialisation with schema validation.
 *
 * Users can export their questionnaire answers to a JSON file and import them later
 * (no localStorage: the data never leaves the user's control). Import validates with zod
 * and migrates plans saved by the v1 questionnaire.
 */
import { z } from "zod";
import {
  PLAN_SCHEMA_VERSION,
  type Asset,
  type Beneficiary,
  type Concerns,
  type DistributionPlan,
  type EstatePlan,
  type Fiduciaries,
  type Fiduciary,
  type FundingPlan,
  type LlcPlan,
  type PartyName,
  type Property,
} from "@/data/types";

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function emptyConcerns(): Concerns {
  return {
    minorChildren: false,
    specialNeedsDependent: false,
    blendedFamily: false,
    longTermCare: false,
    businessOwnership: false,
    charitableIntent: false,
    nonCitizenSpouse: false,
    creditorRisk: false,
    beneficiaryProtection: false,
    digitalAssets: false,
    pets: false,
    disinheritance: false,
  };
}

export function emptyFiduciaries(): Fiduciaries {
  return { successorTrustees: [], personalRepresentatives: [], guardians: [], financialAgents: [], healthcareAgents: [] };
}

export function emptyDistribution(): DistributionPlan {
  return {
    perStirpes: true,
    survivorshipDays: 30,
    ultimateContingent: "heirs_at_law",
    specificGifts: [],
    tangiblePropertyMethod: "memorandum",
  };
}

export function emptyPlan(): EstatePlan {
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    trustStructure: "individual",
    settlor: { fullName: "", cityState: "" },
    maritalStatus: "single",
    trustName: "",
    notaryCounty: "",
    notaryStateCode: "",
    primaryStateCode: "",
    fiduciaries: emptyFiduciaries(),
    beneficiaries: [],
    distribution: emptyDistribution(),
    assets: [],
    concerns: emptyConcerns(),
    properties: [],
    llc: { enabled: false, name: "", stateCode: "", registeredAgent: "", soleMemberIsTrust: true },
    funding: { useHeloc: false, structureAsLoanToLlc: true },
  };
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

export function isJoint(plan: EstatePlan): boolean {
  return plan.trustStructure === "joint" && !!plan.coSettlor?.fullName?.trim();
}

/** Names of the settlor(s), blank entries removed. */
export function settlorNames(plan: EstatePlan): string[] {
  const names = [plan.settlor.fullName.trim()];
  if (plan.trustStructure === "joint" && plan.coSettlor?.fullName?.trim()) names.push(plan.coSettlor.fullName.trim());
  return names.filter(Boolean);
}

/** "Alex Example" or "Alex Example and Jordan Example". */
export function settlorsLabel(plan: EstatePlan, fallback = "[SETTLOR NAME]"): string {
  const names = settlorNames(plan);
  return names.length ? names.join(" and ") : fallback;
}

export function trustNameOf(plan: EstatePlan): string {
  const custom = plan.trustName?.trim();
  if (custom) return custom;
  const names = settlorNames(plan);
  return `The ${names.length ? names.join(" and ") : "[SETTLOR NAME]"} Revocable Living Trust`;
}

export function ageOn(dob: string | undefined, onDate: Date = new Date()): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const birth = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(birth.getTime())) return null;
  let age = onDate.getUTCFullYear() - y;
  const hadBirthday = onDate.getUTCMonth() + 1 > m || (onDate.getUTCMonth() + 1 === m && onDate.getUTCDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export function isMinorBeneficiary(b: Beneficiary, onDate: Date = new Date()): boolean {
  const age = ageOn(b.dateOfBirth, onDate);
  return age !== null && age < 18;
}

export function hasMinorBeneficiary(plan: EstatePlan, onDate: Date = new Date()): boolean {
  return plan.beneficiaries.some((b) => b.kind === "individual" && isMinorBeneficiary(b, onDate));
}

export function hasSpecialNeedsBeneficiary(plan: EstatePlan): boolean {
  return plan.beneficiaries.some((b) => b.specialNeeds) || plan.concerns.specialNeedsDependent;
}

/** True when a guardian nomination is warranted (minor children or minor beneficiaries). */
export function needsGuardian(plan: EstatePlan): boolean {
  return plan.concerns.minorChildren || hasMinorBeneficiary(plan);
}

export function primarySuccessorTrustee(plan: EstatePlan): string {
  return plan.fiduciaries.successorTrustees[0]?.name?.trim() ?? "";
}

export function totalSharePercent(plan: EstatePlan): number {
  return plan.beneficiaries.reduce((sum, b) => sum + (Number(b.sharePercent) || 0), 0);
}

/** Mid-point of the market value range (falls back to whichever bound or the assessed value). */
export function propertyValue(p: Property): number {
  if (p.marketValueLow != null && p.marketValueHigh != null) return (p.marketValueLow + p.marketValueHigh) / 2;
  return p.marketValueLow ?? p.marketValueHigh ?? p.assessedValue ?? 0;
}

export function propertyEquity(p: Property): number {
  return Math.max(0, propertyValue(p) - (p.mortgageBalance ?? 0));
}

export function grossEstateEstimate(plan: EstatePlan): number {
  const real = plan.properties.reduce((s, p) => s + propertyValue(p), 0);
  const other = plan.assets.reduce((s, a) => s + (a.approxValue ?? 0), 0);
  return real + other;
}

export function netEstateEstimate(plan: EstatePlan): number {
  const debts = plan.properties.reduce((s, p) => s + (p.mortgageBalance ?? 0), 0);
  return grossEstateEstimate(plan) - debts;
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const money = z.number().finite().nonnegative();
const fraction = z.number().finite().min(0).max(1);

const partySchema = z.object({ fullName: z.string().default(""), cityState: z.string().optional() });
const fiduciarySchema = z.object({ id: z.string().default(() => uid("fid")), name: z.string().default(""), relationship: z.string().optional() });
const fiduciariesSchema = z.object({
  successorTrustees: z.array(fiduciarySchema).default([]),
  personalRepresentatives: z.array(fiduciarySchema).default([]),
  guardians: z.array(fiduciarySchema).default([]),
  financialAgents: z.array(fiduciarySchema).default([]),
  healthcareAgents: z.array(fiduciarySchema).default([]),
});

const beneficiarySchema = z.object({
  id: z.string().default(() => uid("ben")),
  name: z.string().default(""),
  kind: z.enum(["individual", "charity", "trust"]).default("individual"),
  sharePercent: z.number().finite().default(0),
  relationship: z.string().optional(),
  dateOfBirth: isoDate.optional(),
  distribution: z.enum(["outright", "staggered", "lifetime_trust"]).default("outright"),
  staggeredAges: z.array(z.number().int().min(18).max(100)).max(6).optional(),
  specialNeeds: z.boolean().optional(),
});

const propertySchema = z.object({
  id: z.string().default(() => uid("prop")),
  label: z.string().default(""),
  address: z.string().default(""),
  stateCode: z.string().default(""),
  county: z.string().default(""),
  parcelNumbers: z.array(z.string()).default([]),
  legalDescription: z.string().optional(),
  acreage: money.optional(),
  use: z.enum(["primary_residence", "vacant_land", "rental", "second_home", "other"]).default("primary_residence"),
  units: z.number().int().min(1).max(500).optional(),
  yearBuilt: z.number().int().min(1700).max(2200).optional(),
  yearAcquired: z.number().int().min(1700).max(2200).optional(),
  costBasis: money.optional(),
  titleHeldAs: z.enum(["sole", "joint_tenancy", "tenancy_by_entirety", "tenancy_in_common", "community_property", "other"]).optional(),
  marketValueLow: money.optional(),
  marketValueHigh: money.optional(),
  assessedValue: money.optional(),
  annualTaxes: money.optional(),
  mortgageBalance: money.optional(),
  mortgageLender: z.string().optional(),
  mortgageRate: fraction.optional(),
  monthlyMortgagePayment: money.optional(),
  ownedFreeAndClear: z.boolean().default(false),
  homesteadExemptionClaimed: z.boolean().optional(),
  titleInsuranceInPlace: z.boolean().optional(),
  transferMethod: z.enum(["lady_bird", "tod", "tod_affidavit", "quit_claim_to_trust", "warranty_deed_purchase"]).default("quit_claim_to_trust"),
  llcOwned: z.boolean().default(false),
  monthlyRent: money.optional(),
  vacancyRate: fraction.optional(),
  annualOperatingExpenses: money.optional(),
  management: z.enum(["self", "manager"]).optional(),
  managementFeePct: fraction.optional(),
  notes: z.string().optional(),
});

const assetSchema = z.object({
  id: z.string().default(() => uid("asset")),
  category: z
    .enum(["bank_account", "brokerage", "retirement_account", "life_insurance", "annuity", "business_interest", "vehicle", "digital_asset", "tangible_personal_property", "other"])
    .default("other"),
  description: z.string().default(""),
  institution: z.string().optional(),
  approxValue: money.optional(),
  hasBeneficiaryDesignation: z.boolean().optional(),
});

const concernsSchema = z.object({
  minorChildren: z.boolean().default(false),
  specialNeedsDependent: z.boolean().default(false),
  blendedFamily: z.boolean().default(false),
  longTermCare: z.boolean().default(false),
  businessOwnership: z.boolean().default(false),
  charitableIntent: z.boolean().default(false),
  nonCitizenSpouse: z.boolean().default(false),
  creditorRisk: z.boolean().default(false),
  beneficiaryProtection: z.boolean().default(false),
  digitalAssets: z.boolean().default(false),
  pets: z.boolean().default(false),
  disinheritance: z.boolean().default(false),
});

const distributionSchema = z.object({
  perStirpes: z.boolean().default(true),
  survivorshipDays: z.number().int().min(0).max(365).default(30),
  ultimateContingent: z.enum(["heirs_at_law", "charity"]).default("heirs_at_law"),
  ultimateContingentCharity: z.string().optional(),
  specificGifts: z.array(z.object({ id: z.string().default(() => uid("gift")), description: z.string().default(""), recipient: z.string().default("") })).default([]),
  tangiblePropertyMethod: z.enum(["memorandum", "equally", "spouse_first"]).default("memorandum"),
});

const llcSchema = z.object({
  enabled: z.boolean().default(false),
  name: z.string().optional(),
  stateCode: z.string().default(""),
  registeredAgent: z.string().optional(),
  soleMemberIsTrust: z.boolean().default(true),
  managedBy: z.enum(["member", "manager"]).optional(),
  managerName: z.string().optional(),
});

const fundingSchema = z.object({
  useHeloc: z.boolean().default(false),
  helocSourcePropertyId: z.string().optional(),
  targetPurchasePropertyId: z.string().optional(),
  estimatedRate: fraction.optional(),
  plannedDraw: money.optional(),
  helocTermYears: z.number().int().min(1).max(40).optional(),
  structureAsLoanToLlc: z.boolean().default(true),
  cashReserves: money.optional(),
});

const planSchema = z.object({
  schemaVersion: z.number().optional(),
  trustStructure: z.enum(["individual", "joint"]).default("individual"),
  settlor: partySchema.default({ fullName: "" }),
  coSettlor: partySchema.optional(),
  maritalStatus: z.enum(["single", "married", "domestic_partner", "divorced", "widowed"]).default("single"),
  spouse: partySchema.optional(),
  trustName: z.string().optional(),
  notaryCounty: z.string().optional(),
  notaryStateCode: z.string().optional(),
  primaryStateCode: z.string().default(""),
  fiduciaries: fiduciariesSchema.default({ successorTrustees: [], personalRepresentatives: [], guardians: [], financialAgents: [], healthcareAgents: [] }),
  beneficiaries: z.array(beneficiarySchema).default([]),
  distribution: distributionSchema.default({ perStirpes: true, survivorshipDays: 30, ultimateContingent: "heirs_at_law", specificGifts: [], tangiblePropertyMethod: "memorandum" }),
  assets: z.array(assetSchema).default([]),
  concerns: concernsSchema.default(emptyConcerns()),
  properties: z.array(propertySchema).default([]),
  llc: llcSchema.default({ enabled: false, stateCode: "", soleMemberIsTrust: true }),
  funding: fundingSchema.default({ useHeloc: false, structureAsLoanToLlc: true }),
  seller: partySchema.optional(),
  purchasePriceLow: money.optional(),
  purchasePriceHigh: money.optional(),
});

export const EXPORT_APP_ID = "trust-builder-plan";

/** Serialises a plan to a pretty-printed JSON string for saving to a file. */
export function serializePlan(plan: EstatePlan): string {
  return JSON.stringify({ app: EXPORT_APP_ID, schemaVersion: PLAN_SCHEMA_VERSION, plan: { ...plan, schemaVersion: PLAN_SCHEMA_VERSION } }, null, 2);
}

export interface ImportResult {
  plan?: EstatePlan;
  errors: string[];
  warnings: string[];
}

/** Upgrades a plan saved by the v1 questionnaire (single settlor, free-text successor trustee, plan-level build year). */
function migrate(raw: Record<string, unknown>, warnings: string[]): Record<string, unknown> {
  const version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;
  if (version >= 2) return raw;
  const out: Record<string, unknown> = { ...raw };
  const successor = typeof raw.successorTrustee === "string" ? raw.successorTrustee.trim() : "";
  delete out.successorTrustee;
  const fid = (out.fiduciaries as Partial<Fiduciaries> | undefined) ?? {};
  if (successor) {
    const entry: Fiduciary = { id: uid("fid"), name: successor };
    out.fiduciaries = { ...fid, successorTrustees: [entry, ...(fid.successorTrustees ?? [])], personalRepresentatives: fid.personalRepresentatives?.length ? fid.personalRepresentatives : [entry] };
  }
  const buildYear = typeof raw.buildYear === "number" ? raw.buildYear : undefined;
  delete out.buildYear;
  if (buildYear && Array.isArray(out.properties)) {
    const target = (out.funding as { targetPurchasePropertyId?: string } | undefined)?.targetPurchasePropertyId;
    out.properties = (out.properties as Record<string, unknown>[]).map((p) =>
      (target ? p.id === target : p.transferMethod === "warranty_deed_purchase") && p.yearBuilt == null ? { ...p, yearBuilt: buildYear } : p,
    );
  }
  warnings.push("This plan was saved by an older version; new questions (spouse, guardians, assets, situations) are blank and can be completed in the questionnaire.");
  return out;
}

/** Parses and validates an exported plan file. Never throws. */
export function parsePlanJson(text: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { errors: ["That file is not valid JSON."], warnings };
  }
  if (!json || typeof json !== "object") return { errors: ["That file does not contain a plan."], warnings };
  const envelope = json as Record<string, unknown>;
  const rawPlan = (envelope.plan && typeof envelope.plan === "object" ? envelope.plan : envelope) as Record<string, unknown>;
  if (envelope.app !== undefined && envelope.app !== EXPORT_APP_ID) {
    return { errors: ["That file was not exported from Trust Builder."], warnings };
  }
  const parsed = planSchema.safeParse(migrate(rawPlan, warnings));
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 8)) errors.push(`${issue.path.join(".") || "plan"}: ${issue.message}`);
    return { errors, warnings };
  }
  const plan = { ...parsed.data, schemaVersion: PLAN_SCHEMA_VERSION } as unknown as EstatePlan;
  return { plan, errors, warnings };
}

// Re-exported for convenience in forms.
export type { Asset, Beneficiary, Concerns, DistributionPlan, Fiduciaries, Fiduciary, FundingPlan, LlcPlan, PartyName, Property };

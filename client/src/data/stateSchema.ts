/**
 * Schema for per-jurisdiction legal data.
 *
 * One JSON file per jurisdiction lives in `./states/<CODE>.json`. Every group
 * carries its own `sources` (with verbatim `quote`s that `script/verify-sources.mjs`
 * re-checks against the live page) so users and maintainers can trace each fact.
 *
 * zod is the single source of truth: the TypeScript types below are inferred from
 * it, and `tests/states.test.ts` validates every data file against it.
 */
import { z } from "zod";

export const sourceRefSchema = z
  .object({
    label: z.string().min(1),
    url: z.string().url(),
    /** Exact excerpt (<=300 chars) from the page that supports the facts, or null for PDFs/unfetchable pages. */
    quote: z.string().max(400).nullable().optional(),
  })
  .strict();
export type SourceRef = z.infer<typeof sourceRefSchema>;

export const triSchema = z.enum(["yes", "no", "varies", "unknown"]);
export type Tri = z.infer<typeof triSchema>;

export const executionModeSchema = z.enum([
  "unknown",
  "none",
  "notary",
  "witnesses",
  "witnesses_or_notary",
  "witnesses_and_notary",
]);
export type ExecutionMode = z.infer<typeof executionModeSchema>;

/** How a document must be signed to be valid in a jurisdiction. */
export const executionRuleSchema = z
  .object({
    mode: executionModeSchema,
    witnesses: z.number().int().min(0).max(5),
    notes: z.string().optional(),
  })
  .strict();
export type ExecutionRule = z.infer<typeof executionRuleSchema>;

const provenance = {
  sources: z.array(sourceRefSchema),
  confidence: z.enum(["verified", "partial", "unverified"]).optional(),
  unverifiedFields: z.array(z.string()).optional(),
  notes: z.string(),
};

const num = z.number().nullable();
const str = z.string().nullable();
/** Tri-state boolean: null means "not yet verified". */
const bool = z.boolean().nullable();

export const deedMechanismSchema = z.enum(["lady_bird", "tod", "tod_affidavit", "trust_only"]);
export type DeedMechanism = z.infer<typeof deedMechanismSchema>;

export const trustLawSchema = z
  .object({
    execution: executionRuleSchema,
    utc: z.enum(["adopted", "partial", "not_adopted", "unknown"]),
    trustCodeCite: str,
    certificationOfTrust: z.object({ recognized: bool, cite: str }).strict(),
    ...provenance,
  })
  .strict();

export const notaryLawSchema = z
  .object({
    acknowledgmentStyle: z.enum([
      "uniform_short_form",
      "statutory_form_required",
      "any_substantially_similar",
      "unknown",
    ]),
    /** Verbatim mandated acknowledgment wording (e.g. California Civil Code 1189), else null. */
    requiredWording: str,
    remoteOnlineNotarization: z.enum(["yes", "no", "limited", "unknown"]),
    ...provenance,
  })
  .strict();

export const willLawSchema = z
  .object({
    execution: executionRuleSchema,
    selfProving: z.enum(["yes", "no", "unknown"]),
    holographic: z.enum(["yes", "no", "unknown"]),
    electronic: z.enum(["yes", "no", "limited", "unknown"]),
    cite: str,
    ...provenance,
  })
  .strict();

export const poaLawSchema = z
  .object({
    execution: executionRuleSchema,
    uniformAct: z.enum(["adopted", "partial", "not_adopted", "unknown"]),
    statutoryForm: z.enum(["yes", "no", "unknown"]),
    springingAllowed: triSchema,
    cite: str,
    ...provenance,
  })
  .strict();

export const healthcareDirectiveLawSchema = z
  .object({
    execution: executionRuleSchema,
    statutoryForm: z.enum(["yes", "no", "unknown"]),
    documentNames: z.array(z.string()),
    witnessRestrictions: str,
    cite: str,
    ...provenance,
  })
  .strict();

export const deedLawSchema = z
  .object({
    mechanisms: z.array(deedMechanismSchema).min(1),
    primaryMechanism: deedMechanismSchema,
    todStatute: str,
    ladyBird: z.enum(["yes", "no", "unclear"]),
    execution: executionRuleSchema,
    requiredElements: z.array(z.string()),
    ...provenance,
  })
  .strict();

export const spousalLawSchema = z
  .object({
    homesteadSpousalJoinderRequired: triSchema,
    dowerOrCurtesy: z.enum(["yes", "no", "unknown"]),
    ...provenance,
  })
  .strict();

export const transferTaxLawSchema = z
  .object({
    imposed: bool,
    stateRateDescription: z.string(),
    /** Typical combined state+local rate on a sale as a decimal fraction (0 when none). */
    approxCombinedRate: num,
    trustTransferExempt: triSchema,
    familyTransferExempt: triSchema,
    llcContributionExempt: triSchema,
    ...provenance,
  })
  .strict();

export const propertyTaxAffidavitLawSchema = z
  .object({
    required: bool,
    formName: str,
    deadlineDays: num,
    ...provenance,
  })
  .strict();

export const recordingLawSchema = z
  .object({
    feeLow: num,
    feeHigh: num,
    ...provenance,
  })
  .strict();

export const reassessmentLawSchema = z
  .object({
    reassessesOnTransfer: triSchema,
    trustTransferExcluded: triSchema,
    llcTransferTriggers: triSchema,
    form: str,
    ...provenance,
  })
  .strict();

export const homesteadLawSchema = z
  .object({
    exemptionSummary: z.string(),
    protectedAmount: z.union([z.literal("unlimited"), z.literal("varies"), z.number(), z.null()]),
    trustTransferPreserves: z.enum(["yes", "no", "varies", "unknown", "unclear"]),
    ...provenance,
  })
  .strict();

export const llcLawSchema = z
  .object({
    formationFee: num,
    formationFormName: str,
    filingAgency: str,
    onlinePortal: str,
    reportCadence: z.enum(["annual", "biennial", "none", "unknown"]),
    reportFee: num,
    reportDue: str,
    annualStateTax: z.object({ amount: num, description: str }).strict(),
    seriesLlcAllowed: bool,
    operatingAgreementRequired: bool,
    publicationRequired: bool,
    publicationNotes: str,
    foreignRegistrationFee: num,
    ...provenance,
  })
  .strict();

export const estateTaxLawSchema = z
  .object({
    imposed: bool,
    exemption: num,
    topRate: num,
    portability: z.enum(["yes", "no", "unknown"]),
    ...provenance,
  })
  .strict();

export const inheritanceTaxLawSchema = z.object({ imposed: bool, ...provenance }).strict();

export const propertyRegimeLawSchema = z
  .object({
    type: z.enum(["common_law", "community_property", "marital_property", "unknown"]),
    optionalCommunityProperty: z.enum(["yes", "no", "unknown"]),
    ...provenance,
  })
  .strict();

export const landlordTenantLawSchema = z
  .object({
    depositLimit: str,
    depositReturnDays: num,
    depositInterest: z.enum(["required", "not_required", "varies", "unknown"]),
    separateDepositAccount: z.enum(["required", "not_required", "varies", "unknown"]),
    requiredDisclosures: z.array(z.string()),
    rentControl: str,
    nonpaymentNoticeDays: num,
    rentIncreaseNotice: str,
    ...provenance,
  })
  .strict();

export const countyOfficeSchema = z
  .object({
    name: z.string(),
    registerOfDeedsPhone: z.string().optional(),
    recordingFee: z.number().optional(),
    assessorPhone: z.string().optional(),
    notes: z.string().optional(),
    sources: z.array(sourceRefSchema).optional(),
  })
  .strict();

export const stateLawSchema = z
  .object({
    code: z.string().length(2),
    name: z.string().min(2),
    kind: z.enum(["state", "district", "territory"]),
    /** ISO date the data was verified. */
    asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /**
     * full    = every group verified from primary sources
     * partial = some groups carry unverified/unknown fields
     * limited = jurisdiction with thin official English-language sources; treat as a starting point only
     */
    coverage: z.enum(["full", "partial", "limited"]),
    trust: trustLawSchema,
    notary: notaryLawSchema,
    will: willLawSchema,
    poa: poaLawSchema,
    healthcareDirective: healthcareDirectiveLawSchema,
    deed: deedLawSchema,
    spousal: spousalLawSchema,
    transferTax: transferTaxLawSchema,
    propertyTaxAffidavit: propertyTaxAffidavitLawSchema,
    recording: recordingLawSchema,
    reassessment: reassessmentLawSchema,
    homestead: homesteadLawSchema,
    llc: llcLawSchema,
    estateTax: estateTaxLawSchema,
    inheritanceTax: inheritanceTaxLawSchema,
    propertyRegime: propertyRegimeLawSchema,
    landlordTenant: landlordTenantLawSchema,
    counties: z.array(countyOfficeSchema).optional(),
  })
  .strict();

export type StateLaw = z.infer<typeof stateLawSchema>;
export type CountyOffice = z.infer<typeof countyOfficeSchema>;

/** Every provenance-carrying group key of a StateLaw (used by verification tooling). */
export const STATE_GROUP_KEYS = [
  "trust",
  "notary",
  "will",
  "poa",
  "healthcareDirective",
  "deed",
  "spousal",
  "transferTax",
  "propertyTaxAffidavit",
  "recording",
  "reassessment",
  "homestead",
  "llc",
  "estateTax",
  "inheritanceTax",
  "propertyRegime",
  "landlordTenant",
] as const satisfies readonly (keyof StateLaw)[];
export type StateGroupKey = (typeof STATE_GROUP_KEYS)[number];

/**
 * Core domain model for the Trust Builder questionnaire (v2).
 *
 * The questionnaire collects an `EstatePlan`; the plan engine turns it into a
 * `BusinessPlan`; the document engine renders `GeneratedDocument`s (structured blocks
 * -> PDF). Everything here is plain data (JSON-serialisable) so a plan can be exported
 * to / imported from a file.
 */
import type { DocBlock } from "./docModel";

export const PLAN_SCHEMA_VERSION = 2;

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export type MaritalStatus = "single" | "married" | "domestic_partner" | "divorced" | "widowed";

/** "joint" = one trust created by a married couple; "individual" = one settlor. */
export type TrustStructure = "individual" | "joint";

export interface PartyName {
  fullName: string;
  cityState?: string; // e.g. "Worthington, Franklin County, Ohio"
}

/** A named fiduciary in an ordered list (first = primary, then alternates). */
export interface Fiduciary {
  id: string;
  name: string;
  relationship?: string;
}

export interface Fiduciaries {
  /** Ordered successor trustees (first serves first). */
  successorTrustees: Fiduciary[];
  /** Ordered executors / personal representatives named in the pour-over will. */
  personalRepresentatives: Fiduciary[];
  /** Ordered guardians for minor children (only meaningful if there are minors). */
  guardians: Fiduciary[];
  /** Ordered agents under the durable financial power of attorney. */
  financialAgents: Fiduciary[];
  /** Ordered agents under the health-care power of attorney / directive. */
  healthcareAgents: Fiduciary[];
}

// ---------------------------------------------------------------------------
// Beneficiaries & distribution
// ---------------------------------------------------------------------------

export type BeneficiaryKind = "individual" | "charity" | "trust";

/**
 * outright       - paid to the beneficiary when the trust is distributed.
 * staggered      - paid in installments at the ages in `staggeredAges`.
 * lifetime_trust - held in a continuing trust for the beneficiary's life (creditor/divorce/spendthrift protection).
 */
export type DistributionStyle = "outright" | "staggered" | "lifetime_trust";

export interface Beneficiary {
  id: string;
  name: string;
  kind: BeneficiaryKind;
  sharePercent: number; // should sum to 100 across beneficiaries
  relationship?: string; // child, spouse, etc.
  dateOfBirth?: string; // ISO yyyy-mm-dd; drives minor-beneficiary safeguards
  distribution: DistributionStyle;
  /** Ages at which equal installments are paid when distribution === "staggered", e.g. [25, 30, 35]. */
  staggeredAges?: number[];
  /** Receives (or may need) means-tested public benefits -> supplemental needs trust provisions. */
  specialNeeds?: boolean;
}

export interface SpecificGift {
  id: string;
  description: string;
  recipient: string;
}

export type TangiblePropertyMethod = "memorandum" | "equally" | "spouse_first";

export interface DistributionPlan {
  /** If a beneficiary dies first, that share passes to his/her descendants (vs. lapsing to the others). */
  perStirpes: boolean;
  /** A beneficiary must survive the settlor by this many days to take. */
  survivorshipDays: number;
  /** Where the estate goes if no named beneficiary (or descendant) survives. */
  ultimateContingent: "heirs_at_law" | "charity";
  ultimateContingentCharity?: string;
  specificGifts: SpecificGift[];
  tangiblePropertyMethod: TangiblePropertyMethod;
}

// ---------------------------------------------------------------------------
// Assets beyond real estate
// ---------------------------------------------------------------------------

export type AssetCategory =
  | "bank_account"
  | "brokerage"
  | "retirement_account"
  | "life_insurance"
  | "annuity"
  | "business_interest"
  | "vehicle"
  | "digital_asset"
  | "tangible_personal_property"
  | "other";

export interface Asset {
  id: string;
  category: AssetCategory;
  description: string;
  institution?: string;
  approxValue?: number;
  /** Beneficiary designation already on file (retirement accounts, insurance, annuities, POD/TOD accounts). */
  hasBeneficiaryDesignation?: boolean;
}

// ---------------------------------------------------------------------------
// Situations that drive extra guidance
// ---------------------------------------------------------------------------

export interface Concerns {
  minorChildren: boolean;
  specialNeedsDependent: boolean;
  blendedFamily: boolean;
  longTermCare: boolean;
  businessOwnership: boolean;
  charitableIntent: boolean;
  nonCitizenSpouse: boolean;
  creditorRisk: boolean;
  beneficiaryProtection: boolean;
  digitalAssets: boolean;
  pets: boolean;
  disinheritance: boolean;
}

// ---------------------------------------------------------------------------
// Real property, LLC, financing
// ---------------------------------------------------------------------------

export type PropertyUse = "primary_residence" | "vacant_land" | "rental" | "second_home" | "other";

export type TransferMethod = "lady_bird" | "tod" | "tod_affidavit" | "quit_claim_to_trust" | "warranty_deed_purchase";

export type TitleHeldAs =
  | "sole"
  | "joint_tenancy"
  | "tenancy_by_entirety"
  | "tenancy_in_common"
  | "community_property"
  | "other";

export type ManagementStyle = "self" | "manager";

export interface Property {
  id: string;
  label: string; // friendly name e.g. "Maplewood Lane residence"
  address: string;
  stateCode: string; // USPS
  county: string;
  parcelNumbers: string[];
  legalDescription?: string;
  acreage?: number;
  use: PropertyUse;
  units?: number; // dwelling units (Garn-St Germain protects 1-4 unit residential)
  yearBuilt?: number; // drives lead-paint disclosure (<1978)
  yearAcquired?: number;
  costBasis?: number;
  titleHeldAs?: TitleHeldAs;
  marketValueLow?: number;
  marketValueHigh?: number;
  assessedValue?: number;
  annualTaxes?: number;
  mortgageBalance?: number;
  mortgageLender?: string;
  mortgageRate?: number; // APR fraction e.g. 0.065
  monthlyMortgagePayment?: number;
  ownedFreeAndClear: boolean;
  homesteadExemptionClaimed?: boolean;
  titleInsuranceInPlace?: boolean;
  /** How this property enters the structure */
  transferMethod: TransferMethod;
  /** True if held/acquired by the LLC rather than the trust directly */
  llcOwned: boolean;
  // Rental operations (used for the financial snapshot + property-management plan)
  monthlyRent?: number;
  vacancyRate?: number; // fraction, default 0.05
  annualOperatingExpenses?: number; // insurance, maintenance, utilities, mgmt, excl. taxes & debt service
  management?: ManagementStyle;
  managementFeePct?: number; // fraction of collected rent, e.g. 0.08
  notes?: string;
}

export interface LlcPlan {
  enabled: boolean;
  name?: string; // proposed LLC name
  stateCode: string;
  registeredAgent?: string; // defaults to settlor
  soleMemberIsTrust: boolean;
  /** Who runs day-to-day operations. */
  managedBy?: "member" | "manager";
  managerName?: string;
}

export interface FundingPlan {
  /** Are we financing an acquisition via HELOC/equity? */
  useHeloc: boolean;
  helocSourcePropertyId?: string; // property the HELOC is secured against
  targetPurchasePropertyId?: string; // property being acquired
  estimatedRate?: number; // APR fraction, e.g. 0.08
  /** Planned HELOC draw in dollars; if omitted the plan assumes the 85% CLTV maximum. */
  plannedDraw?: number;
  helocTermYears?: number; // repayment term after the draw period (amortizing view)
  structureAsLoanToLlc: boolean;
  /** Cash reserves available for closing costs, repairs and carrying costs. */
  cashReserves?: number;
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

export interface EstatePlan {
  schemaVersion?: number;

  // Identity
  trustStructure: TrustStructure;
  settlor: PartyName;
  /** Second settlor when trustStructure === "joint". */
  coSettlor?: PartyName;
  maritalStatus: MaritalStatus;
  /** Spouse/partner when married but using an individual trust (deed joinder, spousal rights). */
  spouse?: PartyName;
  trustName?: string; // e.g. "The Jordan A. Whitfield Revocable Living Trust"
  notaryCounty?: string; // county where notarization occurs
  notaryStateCode?: string; // state where signing/notarization occurs
  /** Primary jurisdiction for the trust itself */
  primaryStateCode: string;

  fiduciaries: Fiduciaries;
  beneficiaries: Beneficiary[];
  distribution: DistributionPlan;
  assets: Asset[];
  concerns: Concerns;

  properties: Property[];
  llc: LlcPlan;
  funding: FundingPlan;

  // Acquisition (direct family sale) details, if any
  seller?: PartyName;
  purchasePriceLow?: number;
  purchasePriceHigh?: number;
}

// ---------------------------------------------------------------------------
// Generated business plan
// ---------------------------------------------------------------------------

export interface PlanSection {
  id: string;
  title: string;
  /** Plain-text lines; "  • " prefixed lines render as bullets. */
  body: string[];
}

export interface CostLine {
  item: string;
  low: number;
  high: number;
  note?: string;
}

export type RiskSeverity = "critical" | "high" | "medium" | "info";

export interface RiskFlag {
  id: string;
  severity: RiskSeverity;
  title: string;
  detail: string;
  action: string;
  /** Property this flag relates to, if any. */
  propertyId?: string;
}

export interface ChecklistItem {
  id: string;
  /** Group heading, e.g. "Fund the trust", "Sign & record", "Property operations". */
  group: string;
  item: string;
  detail?: string;
  /** Rough timing guidance, e.g. "Before signing", "Within 45 days of recording". */
  timing?: string;
}

export interface CalendarItem {
  /** 1-12, or null when the date depends on the user's facts. */
  month: number | null;
  label: string;
  detail: string;
  recurrence: "annual" | "biennial" | "one_time" | "ongoing";
}

export interface PropertyFinancials {
  propertyId: string;
  label: string;
  value: number;
  mortgage: number;
  equity: number;
  cltv: number; // mortgage / value
  annualRentCollected?: number;
  annualOperatingExpenses?: number;
  annualTaxes?: number;
  noi?: number;
  annualDebtService?: number;
  dscr?: number; // NOI / debt service
  capRate?: number; // NOI / value
  cashFlowAfterDebt?: number;
}

export interface HelocScenario {
  label: string;
  cltv: number;
  draw: number;
  interestOnlyMonthly: number;
  amortizingMonthly?: number;
  stressedInterestOnlyMonthly: number; // rate + 2 points
}

export interface FinancialSnapshot {
  properties: PropertyFinancials[];
  netWorthEstimate: number;
  heloc?: {
    sourceLabel: string;
    sourceValue: number;
    sourceMortgage: number;
    scenarios: HelocScenario[];
    plannedDraw: number;
    assumedRate: number;
    targetLabel?: string;
    purchasePrice?: number;
    /** Estimated cash needed at closing beyond the draw (closing costs, reserves). */
    cashGap?: number;
  };
  assumptions: string[];
}

export interface DataCoverageNote {
  code: string;
  name: string;
  coverage: "full" | "partial" | "limited";
  asOf: string;
  role: string; // "Trust state", "Property state (Maplewood Lane)", "LLC state", "Signing venue"
}

export interface BusinessPlan {
  title: string;
  subtitle: string;
  generatedAt: string;
  sections: PlanSection[];
  setupCosts: CostLine[];
  annualCosts: CostLine[];
  outstandingItems: { item: string; action: string }[];
  risks: RiskFlag[];
  checklist: ChecklistItem[];
  calendar: CalendarItem[];
  attorneyQuestions: string[];
  financials?: FinancialSnapshot;
  coverage: DataCoverageNote[];
}

// ---------------------------------------------------------------------------
// Generated documents
// ---------------------------------------------------------------------------

export type DocumentKind =
  | "trust_agreement"
  | "pour_over_will"
  | "certificate_of_trust"
  | "durable_power_of_attorney"
  | "healthcare_directive"
  | "hipaa_authorization"
  | "guardian_nomination"
  | "assignment_of_personal_property"
  | "tangible_property_memorandum"
  | "letter_of_instruction"
  | "lady_bird_deed"
  | "tod_deed"
  | "quit_claim_deed"
  | "warranty_deed"
  | "llc_operating_agreement"
  | "property_management_agreement"
  | "purchase_agreement"
  | "promissory_note"
  | "transfer_affidavit"
  | "lead_paint_disclosure"
  | "lease_lead_disclosure";

export interface SigningRequirement {
  /** Human summary, e.g. "Notary acknowledgment AND two witnesses". */
  summary: string;
  /** True when the state data for this instrument was verified from primary sources. */
  verified: boolean;
}

export interface GeneratedDocument {
  kind: DocumentKind;
  title: string;
  /** Which property this doc relates to, if any */
  propertyId?: string;
  /** Structured content rendered into the PDF. */
  blocks: DocBlock[];
  /** Plain-text rendering of `blocks` (in-app preview, tests, text export). */
  body: string;
  /** How this instrument must be signed where the user is signing it. */
  signing?: SigningRequirement;
}

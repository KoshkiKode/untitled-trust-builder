/**
 * Core domain model for the Trust Builder questionnaire.
 * The questionnaire collects a `EstatePlan`, the plan generator turns it into a
 * `BusinessPlan`, and the document engine renders PDFs from both.
 */

export type PropertyUse = "primary_residence" | "vacant_land" | "rental" | "second_home" | "other";

export type TransferMethod = "lady_bird" | "tod" | "tod_affidavit" | "quit_claim_to_trust" | "warranty_deed_purchase";

export interface PartyName {
  fullName: string;
  cityState?: string; // e.g. "Worthington, Franklin County, Ohio"
}

export interface Beneficiary {
  id: string;
  name: string;
  sharePercent: number; // should sum to 100 across beneficiaries
  relationship?: string; // child, spouse, etc.
}

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
  marketValueLow?: number;
  marketValueHigh?: number;
  assessedValue?: number;
  annualTaxes?: number;
  mortgageBalance?: number;
  ownedFreeAndClear: boolean;
  /** How this property enters the structure */
  transferMethod: TransferMethod;
  /** True if held/acquired by the LLC rather than the trust directly */
  llcOwned: boolean;
  notes?: string;
}

export interface LlcPlan {
  enabled: boolean;
  name?: string; // proposed LLC name
  stateCode: string;
  registeredAgent?: string; // defaults to settlor
  soleMemberIsTrust: boolean;
}

export interface FundingPlan {
  /** Are we financing an acquisition via HELOC/equity? */
  useHeloc: boolean;
  helocSourcePropertyId?: string; // property the HELOC is secured against
  targetPurchasePropertyId?: string; // property being acquired
  estimatedRate?: number; // APR fraction, e.g. 0.08
  structureAsLoanToLlc: boolean;
}

export interface EstatePlan {
  // Identity
  settlor: PartyName;
  successorTrustee?: string;
  trustName?: string; // e.g. "The Jordan A. Whitfield Revocable Living Trust"
  notaryCounty?: string; // county where notarization occurs
  notaryStateCode?: string; // state where signing/notarization occurs

  beneficiaries: Beneficiary[];
  properties: Property[];
  llc: LlcPlan;
  funding: FundingPlan;

  /** Primary jurisdiction for the trust itself */
  primaryStateCode: string;

  // Acquisition (direct family sale) details, if any
  seller?: PartyName;
  purchasePriceLow?: number;
  purchasePriceHigh?: number;
  buildYear?: number; // for lead-paint disclosure trigger (<1978)
}

// ---- Generated business plan ----

export interface PlanSection {
  id: string;
  title: string;
  /** Markdown-ish body lines */
  body: string[];
}

export interface CostLine {
  item: string;
  low: number;
  high: number;
  note?: string;
}

export interface BusinessPlan {
  title: string;
  subtitle: string;
  generatedAt: string;
  sections: PlanSection[];
  setupCosts: CostLine[];
  annualCosts: CostLine[];
  outstandingItems: { item: string; action: string }[];
}

export type DocumentKind =
  | "trust_agreement"
  | "pour_over_will"
  | "certificate_of_trust"
  | "lady_bird_deed"
  | "tod_deed"
  | "quit_claim_deed"
  | "warranty_deed"
  | "llc_operating_agreement"
  | "purchase_agreement"
  | "promissory_note"
  | "transfer_affidavit"
  | "lead_paint_disclosure";

export interface GeneratedDocument {
  kind: DocumentKind;
  title: string;
  /** Which property this doc relates to, if any */
  propertyId?: string;
  /** Plain-text body, rendered into the PDF */
  body: string;
}

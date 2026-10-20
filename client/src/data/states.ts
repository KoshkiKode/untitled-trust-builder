/**
 * Untitled Trust Builder — State Legal Data
 * =========================================
 * Real, sourced legal data for trust + LLC + estate planning, organized by
 * jurisdiction. v1 ships full data for the eight Great Lakes states; the schema
 * is designed to expand to all 50 states + US territories, down to the
 * county/parish/ward level.
 *
 * IMPORTANT: This is informational planning data, not legal advice. Fees and
 * statutes change — every record carries source URLs and an `asOf` date.
 *
 * Sources are cited inline per field via the `sources` arrays.
 */

export type DeedMechanism =
  | "lady_bird" // Enhanced life estate deed
  | "tod" // Transfer-on-death deed for real property
  | "tod_affidavit" // Ohio: TOD designation affidavit
  | "trust_only"; // No statutory probate-avoidance deed; use a living trust

export interface SourceRef {
  label: string;
  url: string;
}

export interface CountyOffice {
  /** County / parish / borough / independent city name */
  name: string;
  /** Register / Recorder of Deeds phone */
  registerOfDeedsPhone?: string;
  /** Recording fee for a standard real-property document (USD) */
  recordingFee?: number;
  /** Local assessor office phone (for transfer affidavits / combinations) */
  assessorPhone?: string;
  notes?: string;
  sources?: SourceRef[];
}

export interface StateLaw {
  code: string; // USPS code, e.g. "MI"
  name: string;
  /** True once the jurisdiction has researched, real data (vs. stub) */
  complete: boolean;
  asOf: string; // ISO date the data was verified

  trust: {
    notarizationRequired: boolean;
    witnessesRequired: number;
    grantorTrustDuringLife: boolean; // reported on personal 1040, no 1041 while alive
    certificateOfTrustRecognized: boolean;
    notes: string;
    sources: SourceRef[];
  };

  deed: {
    /** Probate-avoidance mechanisms available for real property in this state */
    mechanisms: DeedMechanism[];
    primaryMechanism: DeedMechanism;
    notes: string;
    sources: SourceRef[];
  };

  llc: {
    formationFee: number; // Articles of Organization filing fee (USD)
    formationFormName: string;
    filingAgency: string;
    onlinePortal?: string;
    /** "annual" | "biennial" | "none" */
    reportCadence: "annual" | "biennial" | "none";
    reportFee: number; // 0 if none
    reportNotes: string;
    seriesLlcAllowed: boolean;
    operatingAgreementRequired: boolean; // statutorily required to file?
    notes: string;
    sources: SourceRef[];
  };

  transferTax: {
    /** State real-estate transfer tax description */
    stateRateDescription: string;
    /** Approximate combined state+local rate as a fraction of price, for estimates */
    approxCombinedRate: number;
    familyExemptionAvailable: boolean;
    notes: string;
    sources: SourceRef[];
  };

  propertyTaxAffidavit: {
    required: boolean;
    formName?: string;
    deadlineDays?: number; // days after transfer to file
    notes: string;
    sources: SourceRef[];
  };

  /** Optional county/parish-level data (expandable). */
  counties?: CountyOffice[];
}

const S = (label: string, url: string): SourceRef => ({ label, url });

export const STATES: Record<string, StateLaw> = {
  MI: {
    code: "MI",
    name: "Michigan",
    complete: true,
    asOf: "2026-06-10",
    trust: {
      notarizationRequired: true,
      witnessesRequired: 0,
      grantorTrustDuringLife: true,
      certificateOfTrustRecognized: true,
      notes:
        "Michigan does not require an attorney to create a revocable living trust. A living trust should be notarized to be reliably enforceable. While you serve as trustee during your lifetime it is a grantor trust — income flows to your personal Form 1040, no separate Form 1041 is required.",
      sources: [
        S("LegalZoom — Living Trust in Michigan", "https://www.legalzoom.com/articles/create-a-living-trust-in-michigan"),
        S("Castle Wealth Group", "https://michiganestateplanning.com/michigan-revocable-living-trust/"),
      ],
    },
    deed: {
      mechanisms: ["lady_bird", "trust_only"],
      primaryMechanism: "lady_bird",
      notes:
        "Michigan is one of only five states that recognize the Lady Bird (enhanced life estate) deed. It preserves the homestead/PRE exemption and Medicaid eligibility, works with an existing mortgage, retains full lifetime control, avoids probate, and gives beneficiaries a stepped-up basis. Michigan does NOT have a transfer-on-death deed statute for real property.",
      sources: [
        S("Plunkett Cooney — MI Lady Bird Deeds", "https://www.plunkettcooney.com/tax-law-estate-plans-probate-business-succession/Michigan-lady-bird-deed"),
        S("Noble Notary — MI Ladybird Deed Forms", "https://www.noblenotarysigningservice.agency/legal-forms/michigan-ladybird-deed-forms"),
      ],
    },
    llc: {
      formationFee: 50,
      formationFormName: "Articles of Organization (CSCL/CD-700)",
      filingAgency: "LARA — Corporations, Securities & Commercial Licensing",
      onlinePortal: "https://milogintp.michigan.gov",
      reportCadence: "annual",
      reportFee: 25,
      reportNotes: "Annual Report (and $25 fee) due February 15 each year.",
      seriesLlcAllowed: false,
      operatingAgreementRequired: false,
      notes:
        "Filing takes ~15–20 minutes online for $50. Operating agreement is internal — not filed with LARA. Michigan does not allow series LLCs, so each additional property needing isolation requires its own LLC.",
      sources: [
        S("LLC University — MI Forms", "https://www.llcuniversity.com/michigan-llc/forms/"),
        S("LLC University — MI Operating Agreement", "https://www.llcuniversity.com/michigan-llc/operating-agreement/"),
      ],
    },
    transferTax: {
      stateRateDescription: "State $3.75 per $500; County $0.55 per $500 (≈0.86% combined)",
      approxCombinedRate: 0.0086,
      familyExemptionAvailable: true,
      notes:
        "Transfers from an individual to their own revocable trust are generally exempt (no change in beneficial ownership). A parent-to-child conveyance can be exempt under MCL 207.526(j); a sale to a child's LLC may NOT qualify — verify at closing.",
      sources: [S("DeedClaim — MI Transfer Tax", "https://www.deedclaim.com/michigan/real-estate-transfer-tax/")],
    },
    propertyTaxAffidavit: {
      required: true,
      formName: "Property Transfer Affidavit (Form L-4260 / 2766)",
      deadlineDays: 45,
      notes:
        "File with the local township assessor within 45 days of transfer. Claim the life-estate exemption (Lady Bird) or the trust exemption to avoid taxable-value uncapping.",
      sources: [S("MI Treasury — Form 2766", "https://www.michigan.gov/-/media/Project/Websites/treasury/Forms/Local-Government/2766.pdf")],
    },
    counties: [
      { name: "Wayne", registerOfDeedsPhone: "(313) 224-5850", recordingFee: 30, notes: "Detroit — Michigan's most populous county." },
      { name: "Oakland", registerOfDeedsPhone: "(248) 858-0606", recordingFee: 30, notes: "Register of Deeds, Pontiac." },
      { name: "Kent", registerOfDeedsPhone: "(616) 632-7610", recordingFee: 30, notes: "Grand Rapids — county administration building." },
    ],
  },

  OH: {
    code: "OH",
    name: "Ohio",
    complete: true,
    asOf: "2026-06-10",
    trust: {
      notarizationRequired: true,
      witnessesRequired: 0,
      grantorTrustDuringLife: true,
      certificateOfTrustRecognized: true,
      notes: "Ohio recognizes revocable living trusts and certificates of trust. Notarization is standard practice for enforceability.",
      sources: [S("Ohio Revised Code Ch. 5801–5811 (Ohio Trust Code)", "https://codes.ohio.gov/ohio-revised-code/chapter-5801")],
    },
    deed: {
      mechanisms: ["tod_affidavit", "trust_only"],
      primaryMechanism: "tod_affidavit",
      notes:
        "Ohio replaced the transfer-on-death DEED with the Transfer on Death Designation Affidavit (effective Dec 28, 2009). TOD deeds recorded before that date remain valid. Ohio does not recognize Lady Bird deeds.",
      sources: [S("eForms — TOD by State", "https://eforms.com/deeds/transfer-on-death/")],
    },
    llc: {
      formationFee: 99,
      formationFormName: "Articles of Organization (Form 610)",
      filingAgency: "Ohio Secretary of State",
      onlinePortal: "https://bsportal.ohiosos.gov",
      reportCadence: "none",
      reportFee: 0,
      reportNotes: "Ohio does NOT require LLCs to file an annual or biennial report.",
      seriesLlcAllowed: true,
      operatingAgreementRequired: false,
      notes: "One-time $99 filing fee. No recurring state report fee for LLCs. Ohio permits series LLCs.",
      sources: [
        S("LLC University — Ohio Costs", "https://www.llcuniversity.com/ohio-llc/costs/"),
        S("Wolters Kluwer — Ohio LLC Requirements", "https://www.wolterskluwer.com/en/solutions/bizfilings/state-guides/ohio-llc-requirements"),
      ],
    },
    transferTax: {
      stateRateDescription: "Conveyance fee $1.00 per $1,000 state + up to $3.00 per $1,000 county (≈0.1–0.4%)",
      approxCombinedRate: 0.003,
      familyExemptionAvailable: true,
      notes: "Ohio conveyance fee is low. Many county-level exemptions exist for transfers to a trust or between relatives — verify with the county auditor.",
      sources: [S("Ohio Rev. Code § 319.54", "https://codes.ohio.gov/ohio-revised-code/section-319.54")],
    },
    propertyTaxAffidavit: {
      required: true,
      formName: "Statement of Reason for Exemption from Real Property Conveyance Fee (DTE 100EX) / Conveyance Fee Statement (DTE 100)",
      deadlineDays: 0,
      notes: "Filed with the county auditor at the time of recording the deed.",
      sources: [S("Ohio Dept. of Taxation — Real Property Forms", "https://tax.ohio.gov/government/real-estate/forms")],
    },
  },

  WI: {
    code: "WI",
    name: "Wisconsin",
    complete: true,
    asOf: "2026-06-10",
    trust: {
      notarizationRequired: true,
      witnessesRequired: 0,
      grantorTrustDuringLife: true,
      certificateOfTrustRecognized: true,
      notes: "Wisconsin adopted the Uniform Trust Code (Ch. 701). Revocable trusts are grantor trusts during life. Certificate of trust is recognized.",
      sources: [S("Wis. Stat. Ch. 701 — Trusts", "https://docs.legis.wisconsin.gov/statutes/statutes/701")],
    },
    deed: {
      mechanisms: ["tod", "trust_only"],
      primaryMechanism: "tod",
      notes: "Wisconsin allows a Transfer on Death (TOD) deed for real property under Wis. Stat. § 705.15. No Lady Bird deed.",
      sources: [S("Wis. Stat. § 705.15", "https://docs.legis.wisconsin.gov/statutes/statutes/705/iii/15")],
    },
    llc: {
      formationFee: 170,
      formationFormName: "Articles of Organization (Form 502)",
      filingAgency: "WI Department of Financial Institutions",
      onlinePortal: "https://www.wdfi.org/apps/CorpFormation/",
      reportCadence: "annual",
      reportFee: 25,
      reportNotes: "Annual Report due by end of the calendar quarter of the formation anniversary. $25 online ($40 by mail incl. $15 paper surcharge).",
      seriesLlcAllowed: true,
      operatingAgreementRequired: false,
      notes: "Articles of Organization filing fee is $170 (Form Corp502, rev. May 2026). Wisconsin permits series LLCs.",
      sources: [
        S("WI DFI — Form Corp502", "https://dfi.wi.gov/Documents/BusinessServices/BusinessEntities/Forms/CORP502.pdf"),
        S("WI DFI — Fees", "https://dfi.wi.gov/Pages/BusinessServices/BusinessEntities/Fees.aspx"),
      ],
    },
    transferTax: {
      stateRateDescription: "Real estate transfer fee $3.00 per $1,000 (0.3%)",
      approxCombinedRate: 0.003,
      familyExemptionAvailable: true,
      notes: "Transfers to/from a revocable trust by the grantor and certain family transfers are exempt under Wis. Stat. § 77.25.",
      sources: [S("Wis. Stat. § 77.25 — Exemptions", "https://docs.legis.wisconsin.gov/statutes/statutes/77/ii/25")],
    },
    propertyTaxAffidavit: {
      required: true,
      formName: "Real Estate Transfer Return (eRETR)",
      deadlineDays: 0,
      notes: "Completed electronically (eRETR) and submitted with the deed at recording.",
      sources: [S("WI DOR — eRETR", "https://www.revenue.wi.gov/Pages/RETr/home.aspx")],
    },
  },

  MN: {
    code: "MN",
    name: "Minnesota",
    complete: true,
    asOf: "2026-06-10",
    trust: {
      notarizationRequired: true,
      witnessesRequired: 0,
      grantorTrustDuringLife: true,
      certificateOfTrustRecognized: true,
      notes: "Minnesota adopted the Uniform Trust Code (Ch. 501C). Certificate of trust recognized under § 501C.1013.",
      sources: [S("Minn. Stat. Ch. 501C", "https://www.revisor.mn.gov/statutes/cite/501C")],
    },
    deed: {
      mechanisms: ["tod", "trust_only"],
      primaryMechanism: "tod",
      notes: "Minnesota allows a Transfer on Death Deed for real property under Minn. Stat. § 507.071. No Lady Bird deed.",
      sources: [S("Minn. Stat. § 507.071", "https://www.revisor.mn.gov/statutes/cite/507.071")],
    },
    llc: {
      formationFee: 155,
      formationFormName: "Articles of Organization",
      filingAgency: "Minnesota Secretary of State",
      onlinePortal: "https://mblsportal.sos.state.mn.us",
      reportCadence: "annual",
      reportFee: 0,
      reportNotes: "Annual Renewal due December 31 each year — $0 for domestic LLCs (free). Failure to file leads to administrative dissolution.",
      seriesLlcAllowed: false,
      operatingAgreementRequired: false,
      notes: "Formation is $155 online/in-person ($135 by mail). The annual renewal itself is free.",
      sources: [S("MN SOS — Fee Schedule", "https://www.sos.mn.gov/business-liens/business-filing-and-certification-fee-schedule/")],
    },
    transferTax: {
      stateRateDescription: "Deed tax $3.30 per $1,000 (0.33%)",
      approxCombinedRate: 0.0033,
      familyExemptionAvailable: true,
      notes: "Transfers to a grantor's revocable trust may qualify for the minimum $1.65 deed tax. Verify with the county recorder.",
      sources: [S("Minn. Stat. Ch. 287 — Deed Tax", "https://www.revisor.mn.gov/statutes/cite/287")],
    },
    propertyTaxAffidavit: {
      required: true,
      formName: "Certificate of Real Estate Value (CRV)",
      deadlineDays: 0,
      notes: "Electronic CRV (eCRV) required for most transfers over $3,000; submitted with the deed.",
      sources: [S("MN DOR — eCRV", "https://www.revenue.state.mn.us/ecrv-electronic-certificate-real-estate-value")],
    },
  },

  IL: {
    code: "IL",
    name: "Illinois",
    complete: true,
    asOf: "2026-06-10",
    trust: {
      notarizationRequired: true,
      witnessesRequired: 0,
      grantorTrustDuringLife: true,
      certificateOfTrustRecognized: true,
      notes: "Illinois Trust Code (760 ILCS 3). Certification of trust recognized under § 1013.",
      sources: [S("760 ILCS 3 — Illinois Trust Code", "https://www.ilga.gov/legislation/ilcs/ilcs5.asp?ActID=4030")],
    },
    deed: {
      mechanisms: ["tod", "trust_only"],
      primaryMechanism: "tod",
      notes: "Illinois allows a Transfer on Death Instrument (TODI) for residential real property under the Illinois Residential Real Property Transfer on Death Instrument Act (755 ILCS 27). No Lady Bird deed.",
      sources: [S("755 ILCS 27 — TODI Act", "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3431")],
    },
    llc: {
      formationFee: 150,
      formationFormName: "Articles of Organization (LLC-5.5)",
      filingAgency: "Illinois Secretary of State",
      onlinePortal: "https://www.ilsos.gov/businessentities/",
      reportCadence: "annual",
      reportFee: 75,
      reportNotes: "Annual Report ($75) due before the first day of the anniversary month.",
      seriesLlcAllowed: true,
      operatingAgreementRequired: false,
      notes: "Formation $150 ($400 for a series LLC). Illinois permits series LLCs. Annual report late penalty is $100.",
      sources: [
        S("Tailor Brands — IL LLC Costs", "https://www.tailorbrands.com/llc-formation/illinois-llc/llc-costs"),
        S("FileForms — IL Annual Report", "https://fileforms.com/illinois-annual-report-filing/"),
      ],
    },
    transferTax: {
      stateRateDescription: "State $0.50 per $500 + county $0.25 per $500 + many municipal taxes (≈0.15%+ before municipal)",
      approxCombinedRate: 0.0015,
      familyExemptionAvailable: true,
      notes: "Transfers to a grantor's revocable trust are exempt. Many Illinois municipalities (e.g., Chicago) add substantial local transfer taxes — check locally.",
      sources: [S("35 ILCS 200/31 — Real Estate Transfer Tax Law", "https://www.ilga.gov/legislation/ilcs/ilcs4.asp?DocName=003502000HArt%2E+31")],
    },
    propertyTaxAffidavit: {
      required: true,
      formName: "Illinois Real Estate Transfer Declaration (PTAX-203)",
      deadlineDays: 0,
      notes: "Filed with the county recorder at the time of recording.",
      sources: [S("IL DOR — PTAX-203", "https://tax.illinois.gov/research/taxinformation/property/ptax203.html")],
    },
  },

  IN: {
    code: "IN",
    name: "Indiana",
    complete: true,
    asOf: "2026-06-10",
    trust: {
      notarizationRequired: true,
      witnessesRequired: 0,
      grantorTrustDuringLife: true,
      certificateOfTrustRecognized: true,
      notes: "Indiana Trust Code (IC 30-4). Certification of trust recognized under IC 30-4-4-5.",
      sources: [S("IC 30-4 — Indiana Trust Code", "https://iga.in.gov/laws/2024/ic/titles/30")],
    },
    deed: {
      mechanisms: ["tod", "trust_only"],
      primaryMechanism: "tod",
      notes: "Indiana allows a Transfer on Death Deed under the Transfer on Death Property Act (IC 32-17-14). No Lady Bird deed.",
      sources: [S("IC 32-17-14 — TOD Property Act", "https://iga.in.gov/laws/2024/ic/titles/32")],
    },
    llc: {
      formationFee: 95,
      formationFormName: "Articles of Organization",
      filingAgency: "Indiana Secretary of State — Business Services Division",
      onlinePortal: "https://inbiz.in.gov",
      reportCadence: "biennial",
      reportFee: 32,
      reportNotes: "Business Entity Report due biennially by the end of the anniversary month. $32 online ($50 by mail).",
      seriesLlcAllowed: true,
      operatingAgreementRequired: false,
      notes: "Formation is $95 online ($100 by mail). Indiana permits series LLCs and uses a biennial (every-2-years) report.",
      sources: [
        S("INBiz — Business Entity Reports", "https://inbiz.in.gov/business-filings/business-entityreport"),
        S("Northwest — Indiana Report", "https://www.northwestregisteredagent.com/annual-report/indiana"),
      ],
    },
    transferTax: {
      stateRateDescription: "Indiana imposes NO state real estate transfer tax",
      approxCombinedRate: 0,
      familyExemptionAvailable: true,
      notes: "Indiana has no real estate transfer tax. A Sales Disclosure Form is required for most transfers.",
      sources: [S("IC 6-1.1-5.5 — Sales Disclosure", "https://iga.in.gov/laws/2024/ic/titles/6")],
    },
    propertyTaxAffidavit: {
      required: true,
      formName: "Sales Disclosure Form (State Form 46021)",
      deadlineDays: 0,
      notes: "Filed with the county assessor/auditor at the time of transfer for most conveyances.",
      sources: [S("IN DLGF — Sales Disclosure", "https://www.in.gov/dlgf/understanding-your-tax-bill/sales-disclosure-form-information/")],
    },
  },

  PA: {
    code: "PA",
    name: "Pennsylvania",
    complete: true,
    asOf: "2026-06-10",
    trust: {
      notarizationRequired: true,
      witnessesRequired: 0,
      grantorTrustDuringLife: true,
      certificateOfTrustRecognized: true,
      notes: "Pennsylvania adopted the Uniform Trust Act (20 Pa.C.S. Ch. 77). Certification of trust recognized under § 7790.3.",
      sources: [S("20 Pa.C.S. Ch. 77", "https://www.legis.state.pa.us/cfdocs/legis/LI/consCheck.cfm?txtType=HTM&ttl=20&div=0&chpt=77")],
    },
    deed: {
      mechanisms: ["trust_only"],
      primaryMechanism: "trust_only",
      notes:
        "Pennsylvania does NOT allow transfer-on-death deeds for real estate and does not recognize Lady Bird deeds (as of 2026; HB2124 pending). Probate avoidance for real property is achieved via a revocable living trust or joint ownership with right of survivorship.",
      sources: [S("Lebovitz Law — PA TOD Deed", "https://lebovitzlaw.com/wills-estates-trusts-probate/transfer-on-death-deed-pennsylvania/")],
    },
    llc: {
      formationFee: 125,
      formationFormName: "Certificate of Organization (Form DSCB:15-8821)",
      filingAgency: "PA Department of State — Bureau of Corporations",
      onlinePortal: "https://file.dos.pa.gov",
      reportCadence: "annual",
      reportFee: 7,
      reportNotes: "Beginning 2025, PA requires an Annual Report ($7 for LLCs), due September 30, replacing the old decennial report.",
      seriesLlcAllowed: false,
      operatingAgreementRequired: false,
      notes: "Formation is $125. PA's new annual report ($7) launched in 2025; failure to file can lead to administrative dissolution after a grace period.",
      sources: [S("PA DOS — Annual Reports", "https://www.pa.gov/agencies/dos/programs/business-charities/annual-report.html")],
    },
    transferTax: {
      stateRateDescription: "State 1% + local (commonly 1%, varies) = often ~2% of value",
      approxCombinedRate: 0.02,
      familyExemptionAvailable: true,
      notes: "PA imposes a relatively high realty transfer tax. Transfers to a revocable living trust by the settlor and certain family transfers are exempt (61 Pa. Code § 91.193).",
      sources: [S("61 Pa. Code § 91.193 — Exemptions", "https://www.pacodeandbulletin.gov/Display/pacode?file=/secure/pacode/data/061/chapter91/s91.193.html")],
    },
    propertyTaxAffidavit: {
      required: true,
      formName: "Realty Transfer Tax Statement of Value (Form REV-183)",
      deadlineDays: 0,
      notes: "Filed with the deed where the transfer is wholly/partly exempt or consideration is not stated.",
      sources: [S("PA DOR — REV-183", "https://www.pa.gov/agencies/revenue/forms-and-publications.html")],
    },
  },

  NY: {
    code: "NY",
    name: "New York",
    complete: true,
    asOf: "2026-06-10",
    trust: {
      notarizationRequired: true,
      witnessesRequired: 2,
      grantorTrustDuringLife: true,
      certificateOfTrustRecognized: true,
      notes:
        "New York (EPTL § 7-1.17) requires a lifetime trust to be signed and acknowledged before a notary OR signed in the presence of two witnesses. Execution formalities are stricter than most states.",
      sources: [S("NY EPTL § 7-1.17", "https://www.nysenate.gov/legislation/laws/EPT/7-1.17")],
    },
    deed: {
      mechanisms: ["tod", "trust_only"],
      primaryMechanism: "tod",
      notes: "New York enacted a Transfer on Death Deed statute effective July 2024 (RPL § 424). No Lady Bird deed.",
      sources: [
        S("FaegreDrinker — NY 2024 TOD Deed Law", "https://www.faegredrinker.com/en/insights/publications/2024/7/key-to-transferring-the-garden-review-of-nys-2024-transfer-on-death-deed-law-provides-model-for-pa-nj"),
      ],
    },
    llc: {
      formationFee: 200,
      formationFormName: "Articles of Organization",
      filingAgency: "NY Department of State — Division of Corporations",
      onlinePortal: "https://dos.ny.gov/corporations",
      reportCadence: "biennial",
      reportFee: 9,
      reportNotes: "Biennial Statement ($9) due every two years during the anniversary month (LLC Law § 301(e)).",
      seriesLlcAllowed: false,
      operatingAgreementRequired: true,
      notes:
        "Formation is $200. NY uniquely requires the PUBLICATION REQUIREMENT: within 120 days, publish notice in two newspapers (daily + weekly) in the county of the LLC, then file a Certificate of Publication ($50). Publication costs vary widely by county (cheap upstate, very expensive in NYC). NY LLC Law also requires a written operating agreement.",
      sources: [
        S("Northwest — NY LLC Cost", "https://www.northwestregisteredagent.com/llc/new-york/cost"),
        S("NY DOS — Biennial Statements", "https://dos.ny.gov/biennial-statements-business-corporations-and-limited-liability-companies"),
      ],
    },
    transferTax: {
      stateRateDescription: "State $2.00 per $500 (0.4%) + NYC and 'mansion tax' on $1M+ residences",
      approxCombinedRate: 0.004,
      familyExemptionAvailable: true,
      notes: "Transfers to a grantor's revocable trust for no consideration are generally exempt from the state transfer tax. NYC adds its own RPTT.",
      sources: [S("NY Tax Law Art. 31 — Real Estate Transfer Tax", "https://www.nysenate.gov/legislation/laws/TAX/A31")],
    },
    propertyTaxAffidavit: {
      required: true,
      formName: "Real Property Transfer Report (RP-5217) + Combined Transfer Tax Return (TP-584)",
      deadlineDays: 0,
      notes: "RP-5217 and TP-584 are filed with the deed at the county clerk.",
      sources: [S("NY DTF — TP-584", "https://www.tax.ny.gov/forms/property/transfer.htm")],
    },
  },
};

/** Stub list — selectable in the UI but flagged 'coming soon' until researched. */
export const STUB_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" }, { code: "WY", name: "Wyoming" },
  // US territories
  { code: "DC", name: "District of Columbia" }, { code: "PR", name: "Puerto Rico" },
  { code: "GU", name: "Guam" }, { code: "VI", name: "U.S. Virgin Islands" },
  { code: "AS", name: "American Samoa" }, { code: "MP", name: "Northern Mariana Islands" },
];

export const GREAT_LAKES_ORDER = ["MI", "OH", "WI", "MN", "IL", "IN", "PA", "NY"];

export function getState(code: string): StateLaw | undefined {
  return STATES[code];
}

export function allSelectableStates(): { code: string; name: string; complete: boolean }[] {
  const complete = GREAT_LAKES_ORDER.map((c) => ({ code: c, name: STATES[c].name, complete: true }));
  const stubs = STUB_STATES.map((s) => ({ ...s, complete: false }));
  return [...complete, ...stubs];
}

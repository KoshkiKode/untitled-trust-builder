import type {
  EstatePlan,
  GeneratedDocument,
  Property,
  DocumentKind,
} from "@/data/types";
import { getState, isGroupUsable } from "@/data/jurisdictions";
import { DISCLAIMER, TEMPLATE_HEADER, fmtUSD, fmtRange } from "./constants";

function hr(): string {
  return "________________________________________________________________";
}

function header(title: string): string[] {
  return [
    TEMPLATE_HEADER,
    "",
    "INFORMATIONAL MATERIALS ONLY — NOT LEGAL ADVICE",
    DISCLAIMER,
    "",
    title.toUpperCase(),
    hr(),
    "",
  ];
}

/** Notary acknowledgment block keyed to the notary county. */
function notaryBlock(
  plan: EstatePlan,
  signerLabel: string,
  stateCode = plan.notaryStateCode || plan.primaryStateCode,
  county = plan.notaryCounty
): string[] {
  const stateName = getState(stateCode)?.name ?? stateCode;
  const notaryCounty = county || "____________________";
  return [
    "",
    "ACKNOWLEDGMENT",
    "",
    `STATE OF ${stateName.toUpperCase()}`,
    `COUNTY OF ${notaryCounty.toUpperCase()}`,
    "",
    `On this ______ day of ________________, 20____, before me personally appeared`,
    `${signerLabel}, known to me (or satisfactorily proven) to be the person whose name is`,
    `subscribed to the within instrument, and acknowledged that they executed the same for the`,
    `purposes therein contained.`,
    "",
    "IN WITNESS WHEREOF, I hereunto set my hand and official seal.",
    "",
    "____________________________________",
    "Notary Public, " + stateName,
    "My commission expires: ________________",
    "",
  ];
}

function signatureLine(name: string, role: string): string[] {
  return [
    "",
    "____________________________________",
    `${name}${role ? `, ${role}` : ""}`,
    `Date: ________________`,
    "",
  ];
}

function settlorName(plan: EstatePlan): string {
  return plan.settlor.fullName || "[SETTLOR NAME]";
}
function trustName(plan: EstatePlan): string {
  return plan.trustName || `The ${settlorName(plan)} Revocable Living Trust`;
}
function propRef(p: Property): string {
  return p.label || p.address || "the Property";
}
function legalDesc(p: Property): string {
  return (
    p.legalDescription ||
    "[INSERT FULL LEGAL DESCRIPTION FROM THE CURRENT RECORDED DEED]"
  );
}
function parcels(p: Property): string {
  const list = p.parcelNumbers.filter(Boolean);
  return list.length ? list.join(", ") : "[PARCEL / TAX ID NO.]";
}

// ---------------- Individual documents ----------------

function trustAgreement(plan: EstatePlan): GeneratedDocument {
  const s = settlorName(plan);
  const tn = trustName(plan);
  const stateName = getState(plan.primaryStateCode)?.name ?? plan.primaryStateCode;
  const succ = plan.successorTrustee || "[SUCCESSOR TRUSTEE]";
  const body: string[] = [];
  body.push(...header(tn));
  body.push(`This Revocable Living Trust Agreement is made in the State of ${stateName} by`);
  body.push(`${s}${plan.settlor.cityState ? `, of ${plan.settlor.cityState}` : ""} ("Settlor" and initial "Trustee").`);
  body.push("");
  body.push("ARTICLE I — CREATION AND NAME");
  body.push(`The Settlor establishes the ${tn}. The Settlor transfers to the trust the property`);
  body.push("described on the attached Schedule A, to be held, administered, and distributed per this Agreement.");
  body.push("");
  body.push("ARTICLE II — REVOCABILITY");
  body.push("This trust is REVOCABLE. The Settlor may amend or revoke it, in whole or in part, at any");
  body.push("time during the Settlor's lifetime by a signed writing delivered to the Trustee.");
  body.push("");
  body.push("ARTICLE III — TRUSTEES");
  body.push(`The Settlor serves as initial Trustee. Upon the Settlor's death, resignation, or incapacity,`);
  body.push(`${succ} shall serve as Successor Trustee, with full powers granted herein.`);
  body.push("");
  body.push("ARTICLE IV — DISTRIBUTION ON DEATH OF SETTLOR");
  body.push("After payment of debts, expenses, and taxes, the Successor Trustee shall distribute the");
  body.push("remaining trust estate to the following beneficiaries in the shares stated:");
  if (plan.beneficiaries.length) {
    plan.beneficiaries.forEach((b) => {
      body.push(`   • ${b.name || "[BENEFICIARY]"}${b.relationship ? ` (${b.relationship})` : ""} — ${b.sharePercent}%`);
    });
  } else {
    body.push("   • [LIST BENEFICIARIES AND SHARES — MUST TOTAL 100%]");
  }
  body.push("");
  body.push("ARTICLE V — TRUSTEE POWERS");
  body.push("The Trustee has all powers conferred by the laws of " + stateName + ", including the power");
  body.push("to buy, sell, lease, mortgage, and manage real property; to hold interests in limited");
  body.push("liability companies; to borrow; and to make distributions, all in the Trustee's discretion.");
  body.push("");
  body.push("ARTICLE VI — GRANTOR TRUST STATUS");
  body.push("During the Settlor's life, the trust is a grantor trust; trust income is reported on the");
  body.push("Settlor's personal income tax return and no separate fiduciary return is required.");
  body.push("");
  body.push("SCHEDULE A — TRUST PROPERTY");
  const trustProps = plan.properties.filter((p) => !p.llcOwned);
  if (trustProps.length) {
    trustProps.forEach((p, i) => {
      body.push(`   ${i + 1}. ${propRef(p)} — ${p.address}, ${p.county} County, ${p.stateCode}.`);
      body.push(`      Parcel(s): ${parcels(p)}.`);
    });
  } else {
    body.push("   [List property held directly by the trust.]");
  }
  if (plan.llc.enabled) {
    body.push(`   • Membership interest in ${plan.llc.name || "[LLC NAME]"}.`);
  }
  body.push(...signatureLine(s, "Settlor and Trustee"));
  body.push(...notaryBlock(plan, s + ", Settlor"));
  return { kind: "trust_agreement", title: tn, body: body.join("\n") };
}

function pourOverWill(plan: EstatePlan): GeneratedDocument {
  const s = settlorName(plan);
  const tn = trustName(plan);
  const stateName = getState(plan.primaryStateCode)?.name ?? plan.primaryStateCode;
  const succ = plan.successorTrustee || "[SUCCESSOR TRUSTEE]";
  const body: string[] = [];
  body.push(...header(`Last Will and Testament (Pour-Over) of ${s}`));
  body.push(`I, ${s}, of ${plan.settlor.cityState || stateName}, declare this to be my Last Will and`);
  body.push("Testament, revoking all prior wills and codicils.");
  body.push("");
  body.push("ARTICLE I — POUR-OVER");
  body.push(`I give my entire residuary estate to the then-acting Trustee of ${tn}, to be added to and`);
  body.push("administered as part of that trust according to its terms (including any later amendments).");
  body.push("");
  body.push("ARTICLE II — PERSONAL REPRESENTATIVE");
  body.push(`I nominate ${succ} as Personal Representative (Executor), to serve without bond.`);
  body.push("");
  body.push("ARTICLE III — GUARDIAN / DISPOSITION");
  body.push("If the trust fails for any reason, my residuary estate shall be distributed to the");
  body.push("beneficiaries named in the trust, in the same shares.");
  body.push(...signatureLine(s, "Testator"));
  body.push("WITNESSES:");
  body.push("We sign as witnesses in the presence of the Testator and each other.");
  body.push("");
  body.push("____________________________   ____________________________");
  body.push("Witness 1                       Witness 2");
  body.push(...notaryBlock(plan, s + ", Testator"));
  return { kind: "pour_over_will", title: `Pour-Over Will — ${s}`, body: body.join("\n") };
}

function certificateOfTrust(plan: EstatePlan): GeneratedDocument {
  const s = settlorName(plan);
  const tn = trustName(plan);
  const stateName = getState(plan.primaryStateCode)?.name ?? plan.primaryStateCode;
  const body: string[] = [];
  body.push(...header(`Certificate of Trust — ${tn}`));
  body.push(`This Certificate of Trust is executed under the laws of ${stateName} to confirm the`);
  body.push("existence and terms of the trust without disclosing its full provisions.");
  body.push("");
  body.push(`1. Name of Trust: ${tn}`);
  body.push(`2. Date of Trust: ________________`);
  body.push(`3. Settlor: ${s}`);
  body.push(`4. Currently Acting Trustee: ${s}`);
  body.push(`5. Successor Trustee: ${plan.successorTrustee || "[SUCCESSOR TRUSTEE]"}`);
  body.push("6. The trust is revocable by the Settlor during the Settlor's lifetime.");
  body.push("7. The Trustee has full power to acquire, hold, sell, mortgage, and manage real and");
  body.push("   personal property and to hold interests in business entities.");
  body.push("8. Title to trust assets is taken in the name of the Trustee of the trust.");
  body.push("");
  body.push("This Certificate may be relied upon by any third party as evidence of the Trustee's authority.");
  body.push(...signatureLine(s, "Trustee"));
  body.push(...notaryBlock(plan, s + ", Trustee"));
  return { kind: "certificate_of_trust", title: `Certificate of Trust`, body: body.join("\n") };
}

function deedForProperty(plan: EstatePlan, p: Property): GeneratedDocument | null {
  const s = settlorName(plan);
  const tn = trustName(plan);
  const stateName = getState(p.stateCode)?.name ?? p.stateCode;
  const grantee = p.llcOwned
    ? plan.llc.name || "[LLC NAME], LLC"
    : `${s}, Trustee of ${tn}`;

  let kind: DocumentKind;
  let title: string;
  const body: string[] = [];

  const recordingPreamble = () => {
    body.push(`Prepared by / Return to: ${s}${plan.settlor.cityState ? `, ${plan.settlor.cityState}` : ""}`);
    body.push(`County: ${p.county || "[COUNTY]"}, ${stateName}`);
    body.push(`Parcel / Tax ID No.: ${parcels(p)}`);
    body.push("");
  };
  const legalAndSig = (granteeDesc: string) => {
    body.push(`Property commonly known as: ${p.address || "[ADDRESS]"}`);
    body.push("");
    body.push("LEGAL DESCRIPTION:");
    body.push(legalDesc(p));
    body.push("");
    body.push(granteeDesc);
    body.push(...signatureLine(s, "Grantor"));
    body.push(...notaryBlock(plan, s + ", Grantor"));
  };

  switch (p.transferMethod) {
    case "lady_bird": {
      kind = "lady_bird_deed";
      title = `Lady Bird Deed — ${propRef(p)}`;
      body.push(...header(title));
      recordingPreamble();
      body.push(`THIS ENHANCED LIFE ESTATE (LADY BIRD) DEED is made by ${s} ("Grantor").`);
      body.push("");
      body.push("The Grantor RESERVES a life estate together with the full power and authority to sell,");
      body.push("convey, mortgage, lease, or otherwise dispose of the property during the Grantor's lifetime");
      body.push("WITHOUT the joinder or consent of the remainder beneficiaries.");
      body.push("");
      body.push("Upon the death of the Grantor, the remainder passes to:");
      body.push(`   ${grantee}`);
      body.push("");
      legalAndSig(
        "This template is for review only; any homestead, tax, Medicaid, mortgage, and probate effects depend on the facts and final deed language."
      );
      break;
    }
    case "tod": {
      kind = "tod_deed";
      title = `Transfer on Death Deed — ${propRef(p)}`;
      body.push(...header(title));
      recordingPreamble();
      body.push(`THIS TRANSFER ON DEATH DEED is made by ${s} ("Owner") under the laws of ${stateName}.`);
      body.push("");
      body.push("This deed is REVOCABLE and transfers no present interest. It takes effect only on the");
      body.push("Owner's death, at which time the property passes, outside probate, to:");
      body.push(`   ${grantee}`);
      body.push("");
      legalAndSig("The Owner may revoke this deed at any time before death by recording a revocation.");
      break;
    }
    case "tod_affidavit": {
      kind = "tod_deed";
      title = `Transfer on Death Designation Affidavit — ${propRef(p)}`;
      body.push(...header(title));
      recordingPreamble();
      body.push(`THIS TRANSFER ON DEATH DESIGNATION AFFIDAVIT is made by ${s} ("Owner") under ${stateName} law.`);
      body.push("");
      body.push("The Owner designates the following transfer-on-death beneficiary to receive the property");
      body.push("on the Owner's death, without probate:");
      body.push(`   ${grantee}`);
      body.push("");
      legalAndSig("This affidavit is revocable during the Owner's lifetime by a recorded revocation.");
      break;
    }
    case "warranty_deed_purchase": {
      kind = "warranty_deed";
      title = `Warranty Deed — ${propRef(p)}`;
      body.push(...header(title));
      recordingPreamble();
      const seller = plan.seller?.fullName || "[SELLER NAME]";
      body.push(`THIS WARRANTY DEED conveys the property from ${seller} ("Grantor")`);
      body.push(`to ${grantee} ("Grantee") for valuable consideration of`);
      body.push(`${fmtRange(plan.purchasePriceLow, plan.purchasePriceHigh)}.`);
      body.push("");
      body.push("The Grantor covenants that the Grantor is lawfully seized of the property, has the right");
      body.push("to convey it, and warrants and will defend the title against all lawful claims.");
      body.push("");
      body.push(`Property commonly known as: ${p.address || "[ADDRESS]"}`);
      body.push("");
      body.push("LEGAL DESCRIPTION:");
      body.push(legalDesc(p));
      body.push(...signatureLine(seller, "Grantor / Seller"));
      body.push(...notaryBlock(plan, seller + ", Grantor"));
      break;
    }
    case "quit_claim_to_trust":
    default: {
      kind = "quit_claim_deed";
      title = `Quit-Claim Deed to Trust — ${propRef(p)}`;
      body.push(...header(title));
      recordingPreamble();
      body.push(`THIS QUIT-CLAIM DEED is made by ${s} ("Grantor") who QUIT-CLAIMS to`);
      body.push(`${grantee} ("Grantee") all of the Grantor's right, title, and interest in the property.`);
      body.push("");
      body.push("This transfer is an estate-planning conveyance to the Grantor's own revocable trust");
      body.push("(no change in beneficial ownership) and is intended to be exempt from transfer tax.");
      body.push("");
      legalAndSig("Consideration: estate-planning transfer; less than $100.");
      break;
    }
  }
  return { kind, title, propertyId: p.id, body: body.join("\n") };
}

function llcOperatingAgreement(plan: EstatePlan): GeneratedDocument {
  const s = settlorName(plan);
  const tn = trustName(plan);
  const llcName = plan.llc.name || "[LLC NAME], LLC";
  const llcState = getState(plan.llc.stateCode || plan.primaryStateCode);
  const stateName = llcState?.name ?? plan.llc.stateCode;
  const member = plan.llc.soleMemberIsTrust ? `${s}, Trustee of ${tn}` : s;
  const body: string[] = [];
  body.push(...header(`Operating Agreement of ${llcName}`));
  body.push(`This Operating Agreement of ${llcName}, a ${stateName} limited liability company, is`);
  body.push(`adopted by its sole member as of ________________.`);
  body.push("");
  body.push("ARTICLE I — FORMATION");
  body.push(`The Company was formed by filing ${llcState?.llc.formationFormName || "Articles of Organization"}`);
  body.push(`with the ${llcState?.llc.filingAgency || "[state filing agency]"}.`);
  body.push("");
  body.push("ARTICLE II — MEMBER");
  body.push(`The sole member of the Company is: ${member}.`);
  body.push("The Company is member-managed. Being single-member, it is a disregarded entity for federal");
  body.push("income tax purposes unless it elects otherwise.");
  body.push("");
  body.push("ARTICLE III — PURPOSE");
  body.push("To acquire, hold, lease, manage, and dispose of real property and to conduct any lawful business.");
  if (plan.properties.filter((p) => p.llcOwned).length) {
    body.push("Initial property of the Company:");
    plan.properties
      .filter((p) => p.llcOwned)
      .forEach((p) => body.push(`   • ${propRef(p)} — ${p.address}, ${p.county} County, ${p.stateCode}.`));
  }
  body.push("");
  body.push("ARTICLE IV — LIABILITY SHIELD");
  body.push("The member is not personally liable for the debts or obligations of the Company. The member");
  body.push("shall maintain Company funds separately and shall not commingle personal and Company assets.");
  body.push("");
  body.push("ARTICLE V — DISTRIBUTIONS & TRANSFER");
  body.push("Distributions are made to the member at the member's discretion. On the member's death, the");
  body.push("membership interest passes per the terms of the member trust, avoiding probate.");
  body.push(...signatureLine(s, plan.llc.soleMemberIsTrust ? "Trustee, Sole Member" : "Sole Member"));
  body.push(...notaryBlock(plan, s + ", Member", plan.llc.stateCode || plan.primaryStateCode));
  return { kind: "llc_operating_agreement", title: `Operating Agreement — ${llcName}`, body: body.join("\n") };
}

function purchaseAgreement(plan: EstatePlan, p: Property): GeneratedDocument {
  const buyer = p.llcOwned ? plan.llc.name || "[LLC NAME], LLC" : `${settlorName(plan)}, Trustee of ${trustName(plan)}`;
  const seller = plan.seller?.fullName || "[SELLER NAME]";
  const body: string[] = [];
  body.push(...header(`Real Estate Purchase Agreement — ${propRef(p)}`));
  body.push(`SELLER: ${seller}`);
  body.push(`BUYER: ${buyer}`);
  body.push(`PROPERTY: ${p.address || "[ADDRESS]"}, ${p.county} County, ${p.stateCode}`);
  body.push(`PARCEL(S): ${parcels(p)}`);
  body.push("");
  body.push(`1. PURCHASE PRICE: ${fmtRange(plan.purchasePriceLow, plan.purchasePriceHigh)}.`);
  body.push("2. EARNEST MONEY: $____________ held in escrow.");
  body.push("3. CLOSING: on or before ________________, by warranty deed.");
  body.push("4. TITLE: Seller to convey marketable title, free of liens except those assumed in writing.");
  body.push("5. CONDITION: Property sold AS-IS unless otherwise stated; Buyer may inspect.");
  body.push("6. PRORATIONS: Taxes and assessments prorated to the closing date.");
  if (plan.funding.useHeloc) {
    body.push("7. FINANCING: Buyer intends to fund via a home-equity line of credit; not contingent on third-party lender approval.");
  }
  body.push(...signatureLine(seller, "Seller"));
  body.push(...signatureLine(settlorName(plan), "Buyer"));
  body.push(...notaryBlock(plan, "the parties"));
  return { kind: "purchase_agreement", title: `Purchase Agreement — ${propRef(p)}`, propertyId: p.id, body: body.join("\n") };
}

function promissoryNote(plan: EstatePlan): GeneratedDocument {
  const s = settlorName(plan);
  const tn = trustName(plan);
  const llcName = plan.llc.name || "[LLC NAME], LLC";
  const src = plan.properties.find((p) => p.id === plan.funding.helocSourcePropertyId);
  const value = src
    ? src.marketValueLow != null && src.marketValueHigh != null
      ? (src.marketValueLow + src.marketValueHigh) / 2
      : src.marketValueLow ?? src.marketValueHigh ?? src.assessedValue ?? 0
    : 0;
  const equity = src ? Math.max(0, value - (src.mortgageBalance ?? 0)) : 0;
  const principal = equity ? Math.round(value * 0.85 - (src?.mortgageBalance ?? 0)) : 0;
  const rate = plan.funding.estimatedRate ? (plan.funding.estimatedRate * 100).toFixed(2) + "%" : "____%";
  const body: string[] = [];
  body.push(...header(`Promissory Note (HELOC Proceeds Loan to LLC)`));
  body.push(`LENDER: ${s}, Trustee of ${tn}`);
  body.push(`BORROWER: ${llcName}`);
  body.push("");
  body.push(`PRINCIPAL: ${principal > 0 ? fmtUSD(principal) : "$____________"}`);
  body.push(`INTEREST RATE: ${rate} per annum.`);
  body.push("");
  body.push("FOR VALUE RECEIVED, the Borrower promises to pay the Lender the principal sum above, with");
  body.push("interest, on the following terms:");
  body.push("  1. Interest accrues from the date funds are advanced.");
  body.push("  2. Payments: interest-only monthly, principal due on or before ________________.");
  body.push("  3. Prepayment permitted at any time without penalty.");
  body.push("  4. The loan funds the Borrower's acquisition of real property and is an arm's-length");
  body.push("     intercompany loan documented to preserve the LLC's separate-entity integrity.");
  body.push("  5. Default: if any payment is more than 15 days late, the entire balance may be called due.");
  body.push(...signatureLine(s, "Lender (Trustee)"));
  body.push(...signatureLine("[LLC AUTHORIZED SIGNER]", "Borrower (Member)"));
  return { kind: "promissory_note", title: "Promissory Note — Loan to LLC", body: body.join("\n") };
}

function transferAffidavit(plan: EstatePlan, p: Property): GeneratedDocument | null {
  const ps = getState(p.stateCode);
  if (!ps || !isGroupUsable(ps, "propertyTaxAffidavit") || ps.propertyTaxAffidavit.required !== true) return null;
  const aff = ps.propertyTaxAffidavit;
  const s = settlorName(plan);
  const body: string[] = [];
  const title =
    ps.code === "MI"
      ? `Michigan Property Transfer Affidavit Worksheet — ${propRef(p)}`
      : `${aff.formName ?? "Transfer affidavit"} Worksheet — ${propRef(p)}`;
  body.push(...header(title));
  if (ps.code === "MI") {
    body.push(
      "This is an informational worksheet, not the official Michigan Treasury form. Obtain and complete the current official form before filing."
    );
    body.push("Official resource: https://www.michigan.gov/taxes/property/transfer-affidavit");
    body.push("");
  }
  body.push(`State: ${ps.name}`);
  body.push(`County: ${p.county || "[COUNTY]"}`);
  body.push(`Property: ${p.address || "[ADDRESS]"}`);
  body.push(`Parcel / Tax ID: ${parcels(p)}`);
  body.push("");
  body.push(`Transferor: ${s}`);
  body.push(`Transferee: ${p.llcOwned ? plan.llc.name || "[LLC NAME]" : `${s}, Trustee of ${trustName(plan)}`}`);
  body.push("");
  body.push("Reason / exemption claimed:");
  body.push("  ☐ Transfer to grantor's revocable trust (no change in beneficial ownership)");
  body.push("  ☐ Transfer between qualifying family members");
  body.push("  ☐ Other: ____________________");
  body.push("");
  if (aff.deadlineDays && aff.deadlineDays > 0) {
    body.push(`FILING DEADLINE: within ${aff.deadlineDays} days of the transfer.`);
  } else {
    body.push("FILING: submit with the deed at the time of recording.");
  }
  body.push(aff.notes);
  body.push(...signatureLine(s, "Transferor"));
  return { kind: "transfer_affidavit", title, propertyId: p.id, body: body.join("\n") };
}

function leadPaintDisclosure(plan: EstatePlan, p: Property): GeneratedDocument {
  const seller = plan.seller?.fullName || settlorName(plan);
  const buyer = p.llcOwned ? plan.llc.name || "[LLC NAME]" : `${settlorName(plan)}, Trustee`;
  const body: string[] = [];
  body.push(...header(`Lead-Based Paint Disclosure — ${propRef(p)}`));
  body.push("Federal law (42 U.S.C. 4852d) requires this disclosure for housing built before 1978.");
  body.push(`Property: ${p.address || "[ADDRESS]"}  (Year built: ${plan.buildYear ?? "before 1978"})`);
  body.push("");
  body.push("SELLER'S DISCLOSURE:");
  body.push("  ☐ Seller has no knowledge of lead-based paint in the housing.");
  body.push("  ☐ Known lead-based paint is present (explain): ____________________");
  body.push("  ☐ Seller has provided the purchaser with all available records/reports.");
  body.push("");
  body.push("PURCHASER'S ACKNOWLEDGMENT:");
  body.push("  ☐ Purchaser has received the pamphlet 'Protect Your Family from Lead in Your Home.'");
  body.push("  ☐ Purchaser has received a 10-day opportunity to conduct a risk assessment or inspection.");
  body.push(...signatureLine(seller, "Seller"));
  body.push(...signatureLine(buyer, "Purchaser"));
  return { kind: "lead_paint_disclosure", title: `Lead-Paint Disclosure — ${propRef(p)}`, propertyId: p.id, body: body.join("\n") };
}

// ---------------- Orchestrator ----------------

export function generateDocuments(plan: EstatePlan): GeneratedDocument[] {
  const docs: GeneratedDocument[] = [];

  docs.push(trustAgreement(plan));
  docs.push(pourOverWill(plan));
  docs.push(certificateOfTrust(plan));

  // deeds per property based on transferMethod
  plan.properties.forEach((p) => {
    const d = deedForProperty(plan, p);
    if (d) docs.push(d);
    const aff = transferAffidavit(plan, p);
    if (aff) docs.push(aff);
  });

  if (plan.llc.enabled) {
    docs.push(llcOperatingAgreement(plan));
  }

  // acquisition documents
  const purchaseProps = plan.properties.filter(
    (p) => p.transferMethod === "warranty_deed_purchase" || p.id === plan.funding.targetPurchasePropertyId
  );
  // de-dupe
  const seen = new Set<string>();
  purchaseProps.forEach((p) => {
    if (seen.has(p.id)) return;
    seen.add(p.id);
    docs.push(purchaseAgreement(plan, p));
  });

  if (plan.funding.useHeloc && plan.funding.structureAsLoanToLlc && plan.llc.enabled) {
    docs.push(promissoryNote(plan));
  }

  // lead-paint disclosure ONLY if buildYear < 1978
  if (plan.buildYear != null && plan.buildYear < 1978) {
    const target =
      plan.properties.find((p) => p.id === plan.funding.targetPurchasePropertyId) ||
      plan.properties.find((p) => p.transferMethod === "warranty_deed_purchase");
    if (target) docs.push(leadPaintDisclosure(plan, target));
  }

  return docs;
}

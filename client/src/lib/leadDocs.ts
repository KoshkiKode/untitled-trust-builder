import type { EstatePlan, GeneratedDocument, Property } from "@/data/types";
import { DISCLAIMER, TEMPLATE_HEADER } from "@/lib/constants";
import { LEAD_WARNING_LESSOR, LEAD_WARNING_SELLER } from "@/lib/federal";

const RULE = "________________________________________________________________";

function header(title: string): string[] {
  return [TEMPLATE_HEADER, "", "INFORMATIONAL MATERIALS ONLY — NOT LEGAL ADVICE", DISCLAIMER, "", title.toUpperCase(), RULE, ""];
}

function signature(name: string, role: string): string[] {
  return ["", "____________________________________", `${name}, ${role}`, "Date: ________________", ""];
}

function propertyLabel(p: Property): string {
  return p.label || p.address || "the property";
}

function yearText(year: number | undefined): string {
  return year ? String(year) : "NOT ENTERED — confirm the year built before use";
}

/** Seller's lead-based paint disclosure for a sale of housing built before 1978 (40 CFR 745.113(a)). */
export function leadPaintSaleDocument(
  p: Property,
  seller: string,
  buyer: string,
  yearBuilt: number | undefined,
): GeneratedDocument {
  const title = `Lead-Paint Disclosure (Sale) — ${propertyLabel(p)}`;
  const body: string[] = [];
  body.push(...header(title));
  body.push("Required by 42 U.S.C. 4852d and 40 CFR Part 745, Subpart F, for sales of housing built before 1978.");
  body.push(`Property: ${p.address || "[ADDRESS]"}   Year built: ${yearText(yearBuilt)}`);
  body.push("");
  body.push("LEAD WARNING STATEMENT (40 CFR 745.113(a)(1)):");
  body.push(LEAD_WARNING_SELLER);
  body.push("");
  body.push("SELLER'S DISCLOSURE (40 CFR 745.113(a)(2)-(3)):");
  body.push("  [ ] Seller has no knowledge of lead-based paint and/or lead-based paint hazards in the housing.");
  body.push("  [ ] Seller knows of lead-based paint and/or lead-based paint hazards. Describe the basis, location and condition of the painted surfaces: ______________________________");
  body.push("  [ ] Records or reports available to the seller have been provided to the purchaser (list): ______________________________");
  body.push("  [ ] No such records or reports are available to the seller.");
  body.push("");
  body.push("PURCHASER'S ACKNOWLEDGMENT (40 CFR 745.113(a)(4)-(5)):");
  body.push("  [ ] Purchaser has received the information listed above and the federally approved lead hazard information pamphlet.");
  body.push("  [ ] Purchaser has had the opportunity to conduct a risk assessment or inspection for lead-based paint and/or lead-based paint hazards: a 10-day period, or a different period the parties agree to in writing (40 CFR 745.110(a)).");
  body.push("  [ ] Purchaser waives the opportunity to conduct a risk assessment or inspection. The waiver must be in writing (40 CFR 745.110(b)).");
  body.push("");
  body.push("Agents: none is listed in this template. If a real estate agent is involved, the agent must also sign a statement that the agent has informed the seller of the seller's obligations under 42 U.S.C. 4852d and is aware of the duty to ensure compliance (40 CFR 745.113(a)(6)).");
  body.push(...signature(seller, "Seller"));
  body.push(...signature(buyer, "Purchaser"));
  body.push("Retention: the seller and any agent must keep a copy of this completed disclosure for at least 3 years from the sale (40 CFR 745.113(c)(1)).");
  body.push("Exemptions: some transfers are exempt under 40 CFR 745.101. Confirm the exemption status before relying on this form.");
  return { kind: "lead_paint_disclosure", title, propertyId: p.id, body: body.join("\n") };
}

/** Lessor's lead-based paint disclosure for a lease of housing built before 1978 (40 CFR 745.113(b)). */
export function leadPaintLeaseDocument(lessor: string, p: Property): GeneratedDocument {
  const title = `Lead-Paint Disclosure (Lease) — ${propertyLabel(p)}`;
  const body: string[] = [];
  body.push(...header(title));
  body.push("Required by 42 U.S.C. 4852d and 40 CFR 745.113(b) for leases of housing built before 1978. Attach it to the lease or include it within the lease contract.");
  body.push(`Property: ${p.address || "[ADDRESS]"}   Year built: ${yearText(p.yearBuilt)}`);
  body.push("");
  body.push("LEAD WARNING STATEMENT (40 CFR 745.113(b)(1)):");
  body.push(LEAD_WARNING_LESSOR);
  body.push("");
  body.push("LESSOR'S DISCLOSURE (40 CFR 745.113(b)(2)-(3)):");
  body.push("  [ ] Lessor has no knowledge of lead-based paint and/or lead-based paint hazards in the housing.");
  body.push("  [ ] Lessor knows of lead-based paint and/or lead-based paint hazards. Describe the basis, location and condition of the painted surfaces: ______________________________");
  body.push("  [ ] Records or reports available to the lessor have been provided to the lessee (list): ______________________________");
  body.push("  [ ] No such records or reports are available to the lessor.");
  body.push("");
  body.push("LESSEE'S ACKNOWLEDGMENT (40 CFR 745.113(b)(4)):");
  body.push("  [ ] Lessee has received the information listed above and the federally approved lead hazard information pamphlet on lead poisoning prevention.");
  body.push("");
  body.push("Agents: none is listed in this template. If an agent is involved, the agent must also sign a statement that the agent has informed the lessor of the lessor's obligations under 42 U.S.C. 4852d and is aware of the duty to ensure compliance (40 CFR 745.113(b)(5)).");
  body.push(...signature(lessor, "Lessor"));
  body.push(...signature("[TENANT NAME]", "Lessee"));
  body.push("Retention: the lessor and any agent must keep a copy of the completed disclosure for at least 3 years from the start of the leasing period (40 CFR 745.113(c)(1)).");
  body.push("Exemptions: some leases are exempt under 40 CFR 745.101. Confirm the exemption status before relying on this form.");
  return { kind: "lease_lead_disclosure", title, propertyId: p.id, body: body.join("\n") };
}

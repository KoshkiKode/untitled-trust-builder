/**
 * Federal wording reproduced verbatim from the eCFR (40 CFR Part 745, Subpart F), with the
 * citations the documents rely on. Do not paraphrase these strings: the regulation requires
 * the exact Lead Warning Statement.
 */

/** 40 CFR 745.113(a)(1): Lead Warning Statement for sales of pre-1978 housing. */
export const LEAD_WARNING_SELLER =
  "Every purchaser of any interest in residential real property on which a residential dwelling was built prior to 1978 is notified that such property may present exposure to lead from lead-based paint that may place young children at risk of developing lead poisoning. Lead poisoning in young children may produce permanent neurological damage, including learning disabilities, reduced intelligence quotient, behavioral problems, and impaired memory. Lead poisoning also poses a particular risk to pregnant women. The seller of any interest in residential real property is required to provide the buyer with any information on lead-based paint hazards from risk assessments or inspections in the seller's possession and notify the buyer of any known lead-based paint hazards. A risk assessment or inspection for possible lead-based paint hazards is recommended prior to purchase.";

/** 40 CFR 745.113(b)(1): Lead Warning Statement for leases of pre-1978 housing. */
export const LEAD_WARNING_LESSOR =
  "Housing built before 1978 may contain lead-based paint. Lead from paint, paint chips, and dust can pose health hazards if not managed properly. Lead exposure is especially harmful to young children and pregnant women. Before renting pre-1978 housing, lessors must disclose the presence of lead-based paint and/or lead-based paint hazards in the dwelling. Lessees must also receive a federally approved pamphlet on lead poisoning prevention.";

export const FEDERAL_SOURCES = [
  { label: "40 CFR 745.113 — Certification and acknowledgment of disclosure", url: "https://www.law.cornell.edu/cfr/text/40/745.113" },
  { label: "40 CFR 745.110 — Opportunity to conduct an evaluation", url: "https://www.law.cornell.edu/cfr/text/40/745.110" },
  { label: "42 U.S.C. 4852d — Disclosure of information concerning lead upon transfer of residential property", url: "https://www.law.cornell.edu/uscode/text/42/4852d" },
] as const;

import type { PropertyUse, TransferMethod } from "@/data/types";
import { getState } from "@/data/jurisdictions";

/** Default transfer method given the property's state mechanism + use + LLC flag. */
export function defaultTransferMethod(
  stateCode: string,
  use: PropertyUse,
  llcOwned: boolean
): TransferMethod {
  if (llcOwned) return "warranty_deed_purchase";
  const st = getState(stateCode);
  const prim = st?.deed?.primaryMechanism;
  if (prim === "lady_bird") {
    return use === "primary_residence" ? "lady_bird" : "quit_claim_to_trust";
  }
  if (prim === "tod") return "tod";
  if (prim === "tod_affidavit") return "tod_affidavit";
  if (prim === "trust_only") return "quit_claim_to_trust";
  // unknown / stub state
  return "quit_claim_to_trust";
}

export const TRANSFER_METHOD_OPTIONS: { value: TransferMethod; label: string }[] = [
  { value: "lady_bird", label: "Lady Bird deed (enhanced life estate)" },
  { value: "tod", label: "Transfer-on-Death (TOD) deed" },
  { value: "tod_affidavit", label: "TOD Designation Affidavit" },
  { value: "quit_claim_to_trust", label: "Quit-claim into trust" },
  { value: "warranty_deed_purchase", label: "Warranty deed (purchase)" },
];

export const PROPERTY_USE_OPTIONS: { value: PropertyUse; label: string }[] = [
  { value: "primary_residence", label: "Primary residence" },
  { value: "second_home", label: "Second home" },
  { value: "rental", label: "Rental" },
  { value: "vacant_land", label: "Vacant land" },
  { value: "other", label: "Other" },
];

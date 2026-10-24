import type { EstatePlan } from "@/data/types";
import { allSelectableStates, getState } from "@/data/jurisdictions";

const selectableStateCodes = new Set(allSelectableStates().map((state) => state.code));

export function validatePlan(plan: EstatePlan): string[] {
  const errors: string[] = [];
  const settlorName = plan.settlor.fullName.trim();

  if (!settlorName) errors.push("Enter the settlor's full name.");
  if (!plan.primaryStateCode || !selectableStateCodes.has(plan.primaryStateCode)) {
    errors.push("Select a valid trust primary state.");
  }
  if (plan.notaryStateCode && !selectableStateCodes.has(plan.notaryStateCode)) {
    errors.push("Select a valid signing/notary state.");
  }

  if (plan.beneficiaries.length === 0) {
    errors.push("Add at least one beneficiary.");
  } else {
    const total = plan.beneficiaries.reduce((sum, beneficiary) => sum + beneficiary.sharePercent, 0);
    if (Math.abs(total - 100) > 0.001) errors.push("Beneficiary shares must total exactly 100%.");
    if (plan.beneficiaries.some((beneficiary) => !beneficiary.name.trim())) {
      errors.push("Enter a name for every beneficiary.");
    }
    if (plan.beneficiaries.some((beneficiary) => beneficiary.sharePercent <= 0 || beneficiary.sharePercent > 100)) {
      errors.push("Each beneficiary share must be greater than 0% and no more than 100%.");
    }
  }

  for (let index = 0; index < plan.properties.length; index += 1) {
    const property = plan.properties[index];
    const label = property.label.trim() || property.address.trim() || `Property ${index + 1}`;
    if (!property.label.trim() && !property.address.trim()) {
      errors.push(`${label}: enter a label or property address.`);
    }
    if (!selectableStateCodes.has(property.stateCode)) {
      errors.push(`${label}: select a valid property state.`);
    }
    if (!property.county.trim()) errors.push(`${label}: enter the property county.`);
    if (!property.legalDescription?.trim()) {
      errors.push(`${label}: add the legal description from the current recorded deed.`);
    }
    const mechanisms = getState(property.stateCode)?.deed.mechanisms ?? [];
    const transferSupported =
      property.transferMethod === "quit_claim_to_trust" ||
      (property.transferMethod === "warranty_deed_purchase" && property.llcOwned) ||
      (property.transferMethod !== "warranty_deed_purchase" &&
        mechanisms.includes(property.transferMethod));
    if (!transferSupported) {
      errors.push(
        `${label}: the selected transfer method is not supported for ${
          getState(property.stateCode)?.name ?? property.stateCode
        }.`
      );
    }

    if (property.marketValueLow != null && property.marketValueLow < 0) {
      errors.push(`${label}: market value cannot be negative.`);
    }
    if (property.marketValueHigh != null && property.marketValueHigh < 0) {
      errors.push(`${label}: market value cannot be negative.`);
    }
    if (
      property.marketValueLow != null &&
      property.marketValueHigh != null &&
      property.marketValueLow > property.marketValueHigh
    ) {
      errors.push(`${label}: the low market value cannot exceed the high value.`);
    }
    if (property.mortgageBalance != null && property.mortgageBalance < 0) {
      errors.push(`${label}: mortgage balance cannot be negative.`);
    }
  }

  const llcOwnedProperties = plan.properties.filter((property) => property.llcOwned);
  if (llcOwnedProperties.length > 0 && !plan.llc.enabled) {
    errors.push("Enable the LLC before assigning a property to LLC ownership.");
  }
  if (plan.llc.enabled) {
    if (!plan.llc.name?.trim()) errors.push("Enter the LLC name or disable the LLC.");
    if (!plan.llc.stateCode || !selectableStateCodes.has(plan.llc.stateCode)) {
      errors.push("Select a valid LLC state.");
    }
  }

  if (plan.purchasePriceLow != null && plan.purchasePriceLow < 0) {
    errors.push("Purchase price cannot be negative.");
  }
  if (plan.purchasePriceHigh != null && plan.purchasePriceHigh < 0) {
    errors.push("Purchase price cannot be negative.");
  }
  if (
    plan.purchasePriceLow != null &&
    plan.purchasePriceHigh != null &&
    plan.purchasePriceLow > plan.purchasePriceHigh
  ) {
    errors.push("The low purchase price cannot exceed the high purchase price.");
  }

  if (plan.funding.useHeloc) {
    const source = plan.properties.find((property) => property.id === plan.funding.helocSourcePropertyId);
    const target = plan.properties.find((property) => property.id === plan.funding.targetPurchasePropertyId);
    if (!source) errors.push("Select the property securing the HELOC.");
    if (!target) errors.push("Select the property funded by the HELOC.");
    if (source && target && source.id === target.id) {
      errors.push("The HELOC source and acquisition target must be different properties.");
    }
    if (source?.llcOwned) errors.push("The HELOC source property cannot already be assigned to the LLC.");
    if (plan.funding.structureAsLoanToLlc && !plan.llc.enabled) {
      errors.push("Enable the LLC before structuring HELOC proceeds as a loan to the LLC.");
    }
    if (
      plan.funding.estimatedRate != null &&
      (plan.funding.estimatedRate < 0 || plan.funding.estimatedRate > 1)
    ) {
      errors.push("The estimated HELOC rate must be between 0% and 100%.");
    }

  }

  const hasPurchaseDetails =
    plan.purchasePriceLow != null ||
    plan.purchasePriceHigh != null ||
    Boolean(plan.seller?.fullName?.trim()) ||
    Boolean(plan.funding.targetPurchasePropertyId);
  if (hasPurchaseDetails) {
    if (!plan.seller?.fullName?.trim()) errors.push("Enter the seller name for the acquisition.");
    if (
      !plan.funding.targetPurchasePropertyId &&
      !plan.properties.some((property) => property.transferMethod === "warranty_deed_purchase")
    ) {
      errors.push("Select an acquisition target property.");
    }
  }
  if (
    plan.buildYear != null &&
    (!Number.isInteger(plan.buildYear) ||
      plan.buildYear < 1800 ||
      plan.buildYear > new Date().getFullYear() + 1)
  ) {
    errors.push("Enter a valid build year.");
  }
  if (
    plan.buildYear != null &&
    plan.buildYear < 1978 &&
    !plan.funding.targetPurchasePropertyId &&
    !plan.properties.some((property) => property.transferMethod === "warranty_deed_purchase")
  ) {
    errors.push("Select the pre-1978 acquisition property so the lead-paint disclosure attaches to the correct property.");
  }

  return errors;
}

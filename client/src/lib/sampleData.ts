import type { EstatePlan } from "@/data/types";

/**
 * Fully fictional sample estate plan used by the "Load sample" demo button
 * and end-to-end QA. All names, addresses, and parcels are invented and do
 * not correspond to any real person or property.
 */
export function sampledPlan(): EstatePlan {
  const benId1 = "ben-sample-1";
  const benId2 = "ben-sample-2";
  const benId3 = "ben-sample-3";
  const homeId = "prop-sample-home";
  const rentalId = "prop-sample-rental";
  return {
    settlor: { fullName: "Jordan A. Whitfield", cityState: "Worthington, Franklin County, Ohio" },
    successorTrustee: "Avery Whitfield",
    trustName: "The Jordan A. Whitfield Revocable Living Trust",
    notaryCounty: "Franklin",
    primaryStateCode: "OH",
    beneficiaries: [
      { id: benId1, name: "Riley Whitfield", relationship: "Child", sharePercent: 50 },
      { id: benId2, name: "Casey Whitfield", relationship: "Child", sharePercent: 30 },
      { id: benId3, name: "Harper Whitfield", relationship: "Child", sharePercent: 20 },
    ],
    properties: [
      {
        id: homeId,
        label: "Maplewood Lane residence",
        address: "418 Maplewood Lane, Worthington, OH 43085",
        stateCode: "OH",
        county: "Franklin",
        parcelNumbers: ["100-882041-00"],
        legalDescription:
          "Lot 27 of the Maplewood Estates Subdivision No. 3, as recorded in Plat Book 84, Page 19, Franklin County Recorder's Office.",
        use: "primary_residence",
        marketValueLow: 360000,
        marketValueHigh: 410000,
        assessedValue: 132000,
        annualTaxes: 6200,
        mortgageBalance: 145000,
        ownedFreeAndClear: false,
        transferMethod: "tod_affidavit",
        llcOwned: false,
      },
      {
        id: rentalId,
        label: "Oakridge Court rental duplex",
        address: "71 Oakridge Court, Dublin, OH 43017",
        stateCode: "OH",
        county: "Franklin",
        parcelNumbers: ["273-004915-00"],
        legalDescription:
          "Lot 12 of the Oakridge Court Replat, as recorded in Plat Book 51, Page 7, Franklin County Recorder's Office.",
        use: "rental",
        marketValueLow: 285000,
        marketValueHigh: 320000,
        assessedValue: 98000,
        annualTaxes: 4900,
        mortgageBalance: 0,
        ownedFreeAndClear: true,
        transferMethod: "warranty_deed_purchase",
        llcOwned: true,
      },
    ],
    llc: {
      enabled: true,
      name: "Whitfield Holdings, LLC",
      stateCode: "OH",
      registeredAgent: "Jordan A. Whitfield",
      soleMemberIsTrust: true,
    },
    funding: {
      useHeloc: true,
      helocSourcePropertyId: homeId,
      targetPurchasePropertyId: rentalId,
      estimatedRate: 0.08,
      structureAsLoanToLlc: true,
    },
    seller: { fullName: "Morgan Reyes", cityState: "Dublin, Ohio" },
    purchasePriceLow: 285000,
    purchasePriceHigh: 300000,
    buildYear: 1969,
  };
}

# Untitled Trust Builder — Build Spec

A questionnaire-driven **trust + LLC + estate business-plan and legal-document generator**. 100% client-side. No backend persistence needed. Target platforms: Windows, macOS, Linux (desktop) and Android, iOS (mobile), plus the browser. Owned by KoshkiKode.

## What it does
1. User answers a multi-step **questionnaire** describing their estate: settlor identity, beneficiaries + shares, properties (with state/county/parcels), whether to form an LLC, and funding (HELOC) details.
2. App generates a tailored **business plan** (like the Michigan v4 plan we already wrote) using the state legal data.
3. App generates **pre-filled legal documents** (trust agreement, pour-over will, certificate of trust, deeds, LLC operating agreement, purchase agreement, promissory note, transfer affidavits, lead-paint disclosure) — rendered to **PDF entirely client-side** via `pdf-lib`, and bundled into an all-in-one **booklet PDF**.

## Already built (DO NOT recreate)
- `client/src/data/states.ts` — real legal data for MI, OH, WI, MN, IL, IN, PA, NY + stub list for all other states/territories. Use `STATES`, `getState()`, `allSelectableStates()`.
- `client/src/data/types.ts` — `EstatePlan`, `Property`, `Beneficiary`, `LlcPlan`, `FundingPlan`, `BusinessPlan`, `GeneratedDocument`, etc.

## Stack & conventions (match the scaffold)
- Vite + React + TypeScript, Tailwind v3, shadcn/ui (new-york, neutral base, CSS vars), `@/` aliases.
- wouter with `useHashLocation` for routing (REQUIRED — see webapp skill).
- NO localStorage/sessionStorage/IndexedDB (sandbox-blocked). Hold the `EstatePlan` in React Context (`PlanProvider`). That's fine — single-session app.
- Install `pdf-lib` for client-side PDF generation. (Already-installed deps are in package.json.)
- Add `data-testid` to interactive/important elements.

## Pages / flow (hash routes)
- `/` — Landing: app name, one-line value prop, "Start a Plan" CTA, a clear **legal disclaimer** (informational only, not legal advice), and a short "How it works" 3-step.
- `/build` — Questionnaire wizard (multi-step, progress indicator). Steps:
  1. **Jurisdiction & Settlor** — primary state (dropdown from `allSelectableStates()`; non-complete states show a "data coming soon — generic templates" badge), settlor full name + city/state, trust name (auto-suggest `The {name} Revocable Living Trust`), notary county.
  2. **Beneficiaries** — add rows {name, relationship, share %}. Live total; warn if ≠ 100%.
  3. **Properties** — add property cards: label, address, state, county, parcel number(s), legal description, use (primary residence/vacant/rental/etc.), market value range, assessed value, annual taxes, mortgage balance, owned free & clear?, transfer method (auto-default based on state's primaryMechanism + use), LLC-owned toggle.
  4. **LLC** — enable LLC? name, state, sole-member-is-trust (default yes), registered agent.
  5. **Funding** — use HELOC? source property, target property, est. rate, structure as loan to LLC?
  6. **Acquisition** (optional) — seller name, purchase price range, build year (drives lead-paint disclosure).
  7. **Review** — summarize; "Generate Plan & Documents".
- `/results` — Two tabs:
  - **Business Plan** — rendered plan sections, cost tables, outstanding items. Buttons: "Download Plan PDF".
  - **Documents** — list of generated documents with per-doc "Download PDF" + "Download All-in-One Booklet PDF".

## Generation logic (build these modules)
- `client/src/lib/planGenerator.ts` — `generatePlan(plan: EstatePlan): BusinessPlan`. Mirror the structure/intelligence of the Michigan v4 plan but DRIVEN BY DATA:
  - Executive summary describing the two-tier structure (trust + LLC) tailored to the actual properties.
  - Per-state deed strategy: if state's primaryMechanism is `lady_bird`, recommend Lady Bird for primary residences with a mortgage; if `tod`/`tod_affidavit`, recommend that; if `trust_only` (PA), recommend direct trust transfer / living trust and NOTE no TOD deed.
  - LLC section pulling real fee/report/series data from `STATES`.
  - Transfer-tax estimates using `approxCombinedRate` × purchase price.
  - HELOC funding math (equity = value − mortgage; CLTV scenarios at 80/85/90%).
  - Liability architecture explanation.
  - Cost summary (setup + annual) built from real fees.
  - Outstanding items (successor trustee, LLC name, etc. if blank).
  - Include source citations (use the `sources` arrays from `STATES`) as footnotes in relevant sections.
- `client/src/lib/documentGenerator.ts` — `generateDocuments(plan: EstatePlan): GeneratedDocument[]`. Produce plain-text bodies for each applicable doc with the user's actual data filled in (names, parcels, legal descriptions, shares, notary county acknowledgment block matching `notaryCounty`). Pick deeds based on each property's `transferMethod`. Include lead-paint disclosure only if `buildYear < 1978`. Each document body must include a clear "TEMPLATE — REVIEW BEFORE USE" header and proper notary acknowledgment block.
- `client/src/lib/pdf.ts` — `pdf-lib` helpers: `renderTextPdf(title, body)` and `renderBooklet(plan, docs)` (cover page + table of contents + each section/doc, page numbers, footer disclaimer). Trigger download via Blob + anchor (no FileSaver dependency required, but ok to add `file-saver`). Word-wrap text to page width; multi-page support; never overflow.

## Design direction
Subject = estate/legal planning → trustworthy, precise, calm. Cool neutral slate surfaces, one deep accent (e.g. deep teal or navy), serif OR strong sans for headings. NOT playful. Generous spacing, clear hierarchy, document-like feel. Dark mode supported. Replace ALL `red` placeholders in `index.css`. Add a simple custom SVG logo (e.g. a geometric shield/seal or layered-tiers mark representing trust→LLC tiers).

## Disclaimer (must appear on landing + every generated PDF footer)
"This tool produces informational planning materials and document templates, not legal advice. Laws and fees change and vary by locality. Review every document and verify current requirements with the relevant county/state offices (or a professional) before signing, recording, or filing."

## Quality bar
- `npm run build` must succeed.
- Playwright QA the wizard + results at desktop (1280) and mobile (375). No text overflow, no broken layout.
- Generated PDFs must open and be readable; booklet must have a cover + TOC.

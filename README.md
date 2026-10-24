# Untitled Trust Builder

A questionnaire-driven **trust, LLC, and estate planning-material generator** that produces pre-filled document templates for review — all generated **entirely on-device**, no data leaves your machine.

Built by [KoshkiKode LLC](https://github.com/KoshkiKode).

> ⚠️ **Important use notice.** This is an app that creates informational trust and estate document templates. It is **not a law firm, does not provide legal advice, and does not replace a licensed attorney or other qualified professional**. Laws and fees change and vary by locality. Review every output and verify current requirements with the relevant county/state offices before signing, recording, or filing.

## What it does

1. **Answer a guided questionnaire** — settlor identity, beneficiaries and shares, properties (state / county / parcels / use / value / mortgage), an optional LLC, and any HELOC-funded acquisition.
2. **Get a tailored business plan** — a two-tier (revocable living trust + LLC) structure with a state-aware deed strategy, real LLC filing fees and report cadence, transfer-tax estimates, HELOC / CLTV funding math, a liability-architecture explanation, and a full cost summary — with sourced citations.
3. **Download the documents** — pre-filled templates (trust agreement, pour-over will, certificate of trust, deeds, LLC operating agreement, purchase agreement, promissory note, transfer affidavit, lead-based-paint disclosure) as individual PDFs or one all-in-one booklet. Every PDF is labeled as informational and includes the disclaimer.

## Jurisdiction coverage

v1 ships **researched, sourced legal data** for the eight Great Lakes states:

| State | Probate-avoidance deed | LLC formation fee | Report |
|-------|------------------------|-------------------|--------|
| Michigan | Lady Bird (enhanced life estate) | $50 | Annual $25 |
| Ohio | TOD designation affidavit | $99 | None |
| Wisconsin | Transfer-on-death deed | $170 | Annual $25 |
| Minnesota | Transfer-on-death deed | $155 | Annual $0 |
| Illinois | Transfer-on-death instrument | $150 | Annual $75 |
| Indiana | Transfer-on-death deed | $95 | Biennial $32 |
| Pennsylvania | None (living trust) | $125 | Annual $7 |
| New York | Transfer-on-death deed | $200 | Biennial $9 |

Every other US state and territory is selectable (with generic templates and a "data coming soon" flag); the data layer is structured to expand nationwide, down to county/parish/ward.

## Tech

- **Frontend:** Vite + React + TypeScript, Tailwind CSS, shadcn/ui. 100% client-side — no backend, no database.
- **PDF generation:** `pdf-lib` (on-device).
- **Desktop:** Tauri 2 — Windows, macOS, Linux.
- **Mobile:** Capacitor 8 — Android, iOS.

## Develop

```bash
npm install
npm run dev          # web dev server
npm run tauri:dev    # desktop (requires Rust toolchain)
```

The dev server listens on port 5000 by default; set `PORT` to change it. On macOS, AirPlay Receiver already occupies port 5000, so use e.g. `PORT=5177 npm run dev`. The dev server binds to `127.0.0.1` only; set `HOST=0.0.0.0` to reach it from other devices on your network.

## Build

```bash
npm run build        # static web bundle → dist/public
npm run tauri:build  # desktop installers
npm run cap:sync     # sync web build into native mobile projects
```

The app is client-side and keeps questionnaire data in the current app session. It does not provide legal advice or guarantee that a generated template is valid, complete, recordable, or appropriate for a particular person, property, transaction, or jurisdiction.

Desktop icons live in `src-tauri/icons/` and are generated from `src-tauri/app-icon.svg`:

```bash
npx tauri icon src-tauri/app-icon.svg -o src-tauri/icons
rm -rf src-tauri/icons/android src-tauri/icons/ios   # mobile icons are not used here
```

## Releases

Push a version tag to trigger the multi-platform build pipeline (`.github/workflows/build.yml`):

```bash
git tag v0.1.0 && git push origin v0.1.0
```

A tag push builds:

- **Windows and Linux desktop installers**, attached to a GitHub Release.
- **An Android debug APK** (plus a signed AAB when the keystore secrets are configured) and **the web bundle**, both uploaded as workflow artifacts.

**macOS and iOS are opt-in** while there is no Apple Developer account: run the workflow manually (Actions → Build → Run workflow) and tick `include_apple`. Tag pushes never build them.

The Android job uses Java 21 for Capacitor 8 compatibility.

## License

MIT — see [LICENSE](./LICENSE).

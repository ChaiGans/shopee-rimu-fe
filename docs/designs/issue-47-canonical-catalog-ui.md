# UI design review: S1 - User-owned canonical catalog

```yaml
schema_version: 1
design_id: ticket-47-ui-design
source_issue: https://github.com/ChaiGans/rimu/issues/47
parent_issue: https://github.com/ChaiGans/rimu/issues/36
repository: shopee-rimu-fe
route: /msp (Catalog tab); /warehouse/products visual anchor
status: draft
designer: opencode
slice: S1
supersedes_reference: "shopee-rimu-fe PR #13 (docs/designs/issue-36-shopee-rimu-fe.md), reference material only"
```

## User outcome and scope

An authenticated User can build one canonical product catalog shared by all
connected Shops. From the existing `/msp` procurement surface, the user opens a
Catalog tab, creates a parent product with variants, records complete packaging,
explicit on-hand inventory, and a canonical selling price, and can optionally
bulk-import products from CSV with per-row outcomes. Incomplete products cannot be
created or saved.

Success state: the catalog lists canonical parent/variant rows with immutable
canonical SKU, packaging readiness, on-hand, and selling price, and the same rows
are visible regardless of which Shop the user has connected. No marketplace,
supplier, order-history, or MSP behavior is part of this slice.

### Entry point and existing anchors

- Keep the authenticated `/msp` route (`src/pages/MspPipeline.tsx`) and add a
  `Catalog` tab. The `/warehouse/products` page
  (`src/pages/WarehouseProducts.tsx`, `src/components/warehouse/products-main.tsx`)
  already renders a parent/model tree and is the visual anchor, but the new
  catalog must make canonical SKU and User inventory primary and marketplace IDs
  secondary/absent.
- Reuse the existing Axios client through `src/services/productService.ts` and
  `src/services/mspService.ts`; there is no new transport.
- Use existing shadcn/ui primitives (`Card`, `Table`, `Badge`, `Dialog`, `Button`,
  `Input`, `Switch`, `Pagination`, `Toast`, `Skeleton`) per the repository UI
  component policy. No production UI changes in this design PR.

### Explicit non-goals

- PULL, reconciliation, adoption/attach (S2).
- Suppliers and supplier-SKU constraints (S3).
- Order-history import (S4) and MSP preflight/run/result (S5, S6).
- Editing marketplace observations, SYNC, fuzzy matching, or automatic product
  creation.
- Treating marketplace stock/price as canonical inventory or selling price.
- Creating an active product without complete packaging and explicit on-hand.

## User flow

| Step | User action | Visible state/result | API/data dependency |
| --- | --- | --- | --- |
| 1 | Open `/msp` while authenticated and select `Catalog`. | User context is shown but not selectable (no Account selector). If the catalog is empty, an explicit empty state invites creating a product; it never shows fake zero rows. | Authenticated session supplies `user_id`; `GET /api/user/products` returns the user's tree. |
| 2 | Choose `Add product`. | A product dialog with parent name, canonical parent SKU, optional variants (variant label + canonical variant SKU), packaging, on-hand, and selling price. Canonical SKU is immutable once saved. | `POST /api/user/products`; client-side required-field validation mirrors backend. |
| 3 | Enter packaging: parent profile, and for a variant either `Inherit` or a complete override. | Partial override is blocked with an inline error. Derived `volume_per_item_cm3` is previewed read-only. | Same create/save API; validation by field. |
| 4 | Enter on-hand (explicit `0` allowed) and selling price and save. | Save waits for the confirmed response; the new parent appears with variant child rows and a `Complete` readiness badge. | `POST /api/user/products`; replaced with confirmed server state. |
| 5 | Open a row and edit packaging or on-hand. | Field validation, `409` stale-version handling, and a confirmed save. Inventory and packaging are saved values, never overwritten by marketplace data. | `PATCH .../packaging`, `PUT .../inventory/:canonical_sku`. |
| 6 | Deactivate or reactivate a product. | Confirmation dialog explains that inactive products are excluded from future runs but retain data. Row shows `Inactive`. | `POST .../deactivate` / `.../reactivate`. |
| 7 | Choose `Import CSV`, download/receive the template, upload a file. | Preview lists each row as `Added`, `Already exists`, or `Failed` with the failing field. No catalog change during preview; conflicts never overwrite existing products. Applying is explicit. | `POST .../products/import/preview`, then `.../apply`. |

### Validation, cancel, and failure branches

- A failed save keeps the draft and shows an inline field-level error summary; it
  must not clear the form.
- Dialog `Cancel` closes without mutation. Closing a dirty create dialog asks for
  confirmation before discarding.
- Duplicate canonical SKU on create returns `already_exists`/conflict and leaves
  the existing product untouched.
- Import preview with any blocking row error disables `Apply`; the user can fix
  the file and re-preview. Valid rows may be reported while a conflicting row
  fails, matching the backend row-atomic contract.
- Empty catalog, missing packaging, and missing on-hand each get a specific next
  action, not a generic "No data" message.

## Wireframe and information hierarchy

```text
+-----------------------------------------------------------------------+
| MSP Procurement                                                        |
| Signed-in User · N connected Shops        [Overview][Catalog][...]     |
+-----------------------------------------------------------------------+
| Catalog                                             [Import CSV] [Add] |
| [search canonical SKU / name]   [Active v] [Readiness v]               |
+-----------------------------------------------------------------------+
| Product / variant        Canonical SKU  Active  Packaging  On hand  ...|
| > BAG-001                BAG-001        Active  Complete   12          |
|    BAG-001-BLK-M         BAG-001-BLK-M  Active  Inherited  12          |
|    BAG-001-RED-M         BAG-001-RED-M  Active  Override   0           |
| > BAG-002                BAG-002        Inactive Incomplete —          |
+-----------------------------------------------------------------------+
| Empty: "No canonical products yet. Add a product to begin."            |
+-----------------------------------------------------------------------+
```

Primary: canonical SKU, active state, packaging readiness, on-hand. Secondary:
variant labels, selling price, derived volume. Warnings (incomplete packaging,
missing on-hand, import row failures) appear inline on the owning row or dialog,
not in a global banner. Destructive actions (deactivate) require confirmation.

## Clickable prototype

The catalog reuses the existing `/warehouse/products` table/dialog patterns, so a
new throwaway prototype is optional for S1. A prior reference prototype exists in
`shopee-rimu-fe` PR #13 (`docs/prototypes/issue-36-shopee-rimu-fe.html`).

- Review question: whether the Catalog tab keeps parent rows expandable or uses a
  master/detail side panel.
- If the owner wants a prototype before implementation, a focused S1 prototype
  will be added as a separate throwaway artifact under `docs/prototypes/`; it is
  not part of this design PR.

## Interaction and accessibility contract

- Keyboard path: tabs, then table row, then row actions; `Add product` and
  `Import CSV` are reachable by keyboard with visible focus.
- Dialogs trap focus, `Escape` cancels, and the destructive `Deactivate` action
  requires an explicit confirm button with future-run wording.
- Loading uses table/dialog skeletons; `Save`/`Apply` are disabled while pending.
- Errors use `role="alert"` / live regions and are linked to the invalid field or
  row; import results are announced as a summary plus per-row status.
- Responsive: the parent/variant table collapses to a labelled card/select on
  narrow screens while preserving row hierarchy.
- Copy never shows filesystem paths, tokens, or internal IDs; only canonical
  SKU/UUID and user-facing labels.

## API and state assumptions

The FE calls only `rimu-be-go` through the existing Axios client. `user_id` comes
from the session; there is no owner selector.

| Operation | Proposed endpoint (FE assumption) | Required response/state |
| --- | --- | --- |
| List catalog | `GET /api/user/products` | Parent/variant tree, canonical IDs/SKUs, packaging readiness, on-hand, active state. |
| Product detail | `GET /api/user/products/:product_id` | Canonical fields, resolved packaging, inventory, price. |
| Create product | `POST /api/user/products` | Confirmed product; validation errors by field; conflict on duplicate SKU. |
| Edit packaging/inventory | `PATCH /api/user/products/:product_id/packaging`, `PUT /api/user/inventory/:canonical_sku` | Confirmed state; `409` on stale version; field errors. |
| Lifecycle | `POST /api/user/products/:product_id/deactivate` / `.../reactivate` | Confirmed active state. |
| Import | `POST /api/user/products/import/preview`, `POST /api/user/products/import/apply` | Row outcomes `added`/`already_exists`/`failed`; apply idempotent. |

State rules: no optimistic updates for create/import/lifecycle; replace local
state with the confirmed response. A form-only draft may be optimistic until
save. Expected error body: `{ code, message, field_errors?, row_errors?,
retryable?, request_id? }` mapped to the states above. Exact paths are backend
review decisions and must be frozen before implementation.

## Playwright plan - required before approval

Add `e2e/canonical-catalog-flow.mjs`; keep selectors semantic (`getByRole`,
`getByLabel`, `data-testid` only for row outcome/status). Run through the
workspace recorder:

```powershell
node workspace-harness/scripts/record-ui-proof.mjs `
  --url $env:RIMU_STAGING_FRONTEND_URL `
  --flow .\shopee-rimu-fe\e2e\canonical-catalog-flow.mjs `
  --output .\workspace-harness\artifacts\issue-47-canonical-catalog.webm
```

| Flow ID | Starting fixture/state | User actions | Expected visible result | Artifact |
| --- | --- | --- | --- | --- |
| UI-101 | Authenticated user; empty catalog; two connected Shops. | Add a complete parent with two variants; reload. | Product and variants persist with `Complete` readiness; same rows visible regardless of Shop; no Account selector. | video + screenshots + trace |
| UI-102 | Same user. | Attempt to save with missing/zero packaging or missing on-hand. | Inline field errors; Save blocked; no product created. | video + screenshots + trace |
| UI-103 | Parent with complete profile exists. | Set one variant to `Inherit`, one to a complete override, then a partial override. | Inherited badge and derived volume correct; partial override blocked. | video + screenshots + trace |
| UI-104 | Product exists. | Set on-hand to explicit `0`, then a negative value. | `0` saved and visible; negative rejected with field error. | video + screenshots + trace |
| UI-105 | CSV fixture with one new, one identical, one conflicting row. | Import preview, then apply. | Rows report `Added`/`Already exists`/`Failed`; existing conflicting product unchanged; no duplicate rows. | video + screenshots + trace |
| UI-106 | Active product with packaging/inventory. | Deactivate, reload, reactivate. | Confirmation wording names future-run impact; state flips; data retained. | video + screenshots + trace |

Highest-risk assertions: UI-102 (no incomplete active product) and UI-105
(import conflict does not overwrite). Each flow must publish video, screenshots,
and a Playwright trace; implementation must run build, lint, and these flows.

Fixture reset: backend-owned seed/restore before each flow (catalog state only;
no PULL/supplier/history needed for S1).

## Review decisions required

1. Confirm Catalog as a tab under `/msp` and whether `/warehouse/products` is
   left unchanged as a legacy page.
2. Confirm create form layout: expandable parent rows vs master/detail panel, and
   whether canonical SKU is seeded/editable before first save.
3. Confirm the exact backend route/payload shape and the import row-outcome
   contract before selectors and fixtures are frozen.
4. Confirm whether a focused S1 prototype is required before implementation or
   the existing pattern is sufficient.
5. Confirm sellable-price display and editing behavior for S1, pending the
   backend price decision.

Do not implement production UI until the owner replies with `DESIGN APPROVED` or
equivalent. Behavior changes require revising the flow, wireframe, API
assumptions, and Playwright matrix together.

## Design PR delivery

This document is delivered as a docs-only design PR in `shopee-rimu-fe`. It
changes no production UI, API calls, config, tests, or runtime state. The issue
comment is only a pointer to the review PR. Implementation and Playwright changes
are a separate PR after design approval.

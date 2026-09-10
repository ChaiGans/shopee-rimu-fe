# UI design review: User-scoped canonical procurement and marketplace PULL

```yaml
schema_version: 1
design_id: ticket-36-ui-design
source_issue: https://github.com/ChaiGans/shopee-rimu-fe/issues/13
child_issue: shopee-rimu-fe#13
parent_issue: rimu#36
repository: shopee-rimu-fe
route: /msp
status: draft
designer: Codex
```

## User outcome and scope

An authenticated User can prepare one shared procurement workspace for all
connected Shopee shops. The User can see a canonical product and variant
catalog, compare read-only marketplace observations, explicitly adopt or attach
unmapped products, complete packaging and User inventory, maintain suppliers
and supplier-SKU availability, replace one validated order-history snapshot,
and start an auditable MSP run from either saved state or a fresh marketplace
PULL.

The successful end state is an immutable procurement result/cart snapshot that
can be understood without live joins to later product, inventory, supplier, or
availability edits. Every assumed value, unassigned SKU, failed shop, and
supplier relationship exclusion is visible at the point where it affects the
decision.

### Superseding ownership decision (shopee-rimu-fe#13)

- Reuse the existing authenticated `User` and `user_id` as the owner and tenant
  scope. Do not create an `Account` entity, `account_id`, account selector, or
  account-level authorization concept.
- One User has one-to-many `Shops`. A `shop_id` identifies a marketplace
  connection and remains source/external-association metadata; it is never the
  owner of canonical procurement data.
- Canonical catalog/variants, packaging, inventory, suppliers, supplier-SKU
  constraints, order-history snapshots, PULL observations, and MSP runs are
  shared at User scope. User-scoped pages therefore use the authenticated
  context without a workspace selector.
- Show a Shop selector only where marketplace context is needed: PULL scope,
  marketplace observation/reconciliation filters, and external association
  details. It must be labelled as an observation/source filter, not an owner
  or tenant selector.
- Teams, organizations, and cross-User workspaces are out of scope.

### Entry point and existing frontend anchors

- Keep the authenticated `/msp` route as the first release entry point. The
  sidebar continues to expose it as `MSP Procurement`; the page may be
  reorganized into User-scoped tabs without breaking the route.
- The current `/msp` workbench is shop-oriented: it loads Shopee shops through
  `getShops`, uploads four CSV files to
  `/api/msp/pipeline-runs/upload-start`, polls
  `/api/msp/pipeline-runs/:run_id`, and previews stage artifacts. This design
  replaces repeated run-scoped configuration with User-owned state while
  retaining a compatibility path for existing run history during migration.
- The existing `/warehouse/products` page already displays parent/model trees,
  marketplace stock, status, prices, and HPP. Its tree presentation is a useful
  visual anchor, but the new User catalog must make canonical SKU and User
  inventory primary; marketplace item/model IDs remain associations.
- Existing shadcn primitives (`Card`, `Table`, `Badge`, `Dialog`, `Button`,
  `Input`, `Switch`, `Pagination`, `Toast`, and `Skeleton`) are the intended
  building blocks. No production UI is changed by this design PR.

### In scope

1. Authenticated User context and User-level catalog/variant information
   architecture; no owner selector.
2. Read-only Shopee PULL for every connected shop, reconciliation, and explicit
   adoption/attachment of unmapped observations.
3. Shared packaging, on-hand inventory, selling-price visibility, and readiness
   rules.
4. User-owned suppliers, supplier aliases, supplier-SKU constraints, and manual
   supplier or supplier-SKU deactivation/reactivation.
5. Exact nine-column order-history import, full validation preview, atomic
   replacement confirmation, and active-snapshot deletion.
6. MSP preflight, warnings/assumptions, explicit unassigned-SKU confirmation,
   run progress, result/cart snapshot, artifact/diagnostic access, and reload
   persistence.
7. Loading, empty, degraded, failure, responsive, and accessibility behavior.
8. Named Playwright flows and sanitized fixtures for implementation approval.

### Explicit non-goals

- Outbound marketplace SYNC or automatic marketplace edits.
- Automatic product creation from PULL, fuzzy matching, automatic SKU rename,
  or automatic supplier-SKU reactivation.
- Tokopedia MSP execution in the first release.
- In-app editing of individual order-history rows; replacement is a complete
  batch operation.
- Treating marketplace stock, price, or status as canonical User state.
- Creating an active product without complete packaging and explicit on-hand
  inventory.
- Making completed results change when current settings change.
- Direct browser calls to Shopee, the MSP controller, or Python stages. The
  browser calls `rimu-be-go` through the shared Axios client only.

## User flow

The flow is intentionally User-scoped. The authenticated session supplies
`user_id`; there is no owner selector. Shop selection is available only as a
marketplace scope and observation control, never as a product or inventory
owner.

| Step | User action | Visible state/result | API/data dependency |
| --- | --- | --- | --- |
| 1 | Open `/msp` while authenticated. | User context header shows the signed-in User, connected-shop count, active history version, and last PULL. There is no owner selector; if no connected shop exists, show a specific connection empty state. | Authenticated session/cookie supplies `user_id`; proposed `GET /api/user/context` and existing `GET /api/shop/` return the User's shops. |
| 2 | Choose `Use saved app state` or `PULL first`; when needed, choose `All connected shops` or one Shop in the marketplace scope control. | The choice explains that PULL is read-only observation. `PULL first` lists the selected/all connected Shopee shops and last observation time before starting. | `GET /api/shop/`; `POST .../marketplace-pulls` (proposed), with optional `shop_id`/`shop_ids` scope validated against the authenticated User. |
| 3 | Review PULL progress and reconciliation. | Per-shop progress is visible. Successful shops commit observations atomically; failed shops retain their previous observations and are marked `Degraded`. Tabs show Matched, Unmapped, SKU drift, stock/price discrepancies, and failed shops. | Pull status/report stream or polling; no canonical product, inventory, packaging, supplier, or price mutation. |
| 4 | Attach a new external identity to an existing canonical product/variant, or select `Adopt as new`. | Stable external association is preferred; exact external SKU is a fallback only. No fuzzy suggestion is shown. Attach preserves the existing canonical SKU. Adoption previews the parent/variant tree, proposed canonical SKUs, packaging, and on-hand fields. | `POST .../catalog/associations/attach` or `POST .../catalog/adoptions/preview` and confirmed adoption (proposed). |
| 5 | Complete adoption or catalog setup. | A new parent/variant is created only when packaging and on-hand inventory are complete. Duplicate canonical SKU returns `already_exists` or a row-level conflict; the current catalog stays unchanged. | User-scoped catalog/adoption API; idempotency key by canonical SKU. |
| 6 | Browse Catalog and open a parent row or variant row. | Parent rows contain child variants. Each row shows immutable canonical SKU, active state, packaging readiness, on-hand, derived on-order, and associations by shop. Variant packaging is `Inherited` or `Override`; external IDs are secondary. | `GET .../catalog`, `GET .../catalog/:product_id`. |
| 7 | Edit packaging or on-hand inventory from a product detail panel. | Dimensions and `qty_per_box` validate before save; a variant override is complete or absent. On-hand accepts explicit zero. Derived on-order is read-only and links to open order-history rows. PULL stock differences become non-blocking warnings. | `PATCH .../catalog/:product_id/packaging`, `PUT .../inventory/:sku` (proposed); confirmed response replaces local state. |
| 8 | Review Suppliers and supplier-SKU relationships. | Active/inactive supplier and relationship states are separate. Missing constraints are visibly `Default: unrestricted (0 to infinity)`. Missing metrics show an imputed/default badge and rule version. | `GET .../suppliers`, `GET .../supplier-sku`; User-owned state. |
| 9 | Deactivate/reactivate a supplier or supplier-SKU pair from Settings or a result row. | A confirmation dialog explains future-run impact. Current history and completed results remain readable. The current result row does not change allocation; it gains `Inactive for future runs`. PULL never reactivates it. | `PATCH .../suppliers/:id` or `PATCH .../supplier-sku/:id/availability` with reason and idempotency key. |
| 10 | Upload an order-history CSV. | The preview displays the exact nine columns, row counts, all row/field errors, open/closed semantics, excluded chronology rows, history-only diagnostics, and the current active version. No active state changes during preview. | `POST .../order-history/import/preview` (multipart, proposed); backend validates the complete file. |
| 11 | Confirm replacement after a valid preview, or cancel/delete. | `Replace active snapshot` is disabled for any blocking error. Confirmation states the old and new versions and that all connected shops share the replacement. Cancel leaves the active version unchanged. Deleting the active snapshot blocks future normal MSP but preserves completed-run evidence. | `POST .../order-history/import/activate` with preview token and expected version; `DELETE .../order-history/active` (proposed). |
| 12 | Start MSP and choose PULL mode if not already pulled. | Preflight checklist distinguishes blockers from warnings. Catalog SKUs without usable history require an explicit acknowledgement; they will show `supplier=UNKNOWN` and `allocation_status=not_allocated`. A degraded PULL is visible but does not require a second acknowledgement. | `POST .../msp/preflight`, then `POST .../msp/runs` with idempotency key (proposed). |
| 13 | Watch the run, refresh, or cancel while queued/running. | Stage cards show Sales Forecasting, Order Replenishment, and Supplier Selection/SSOA. Cancel requires confirmation; completed stages remain inspectable. Polling resumes after reload. | User-level run status/stage/artifact endpoints through `rimu-be-go`; current `/api/msp/pipeline-runs` is a compatibility seam. |
| 14 | Review the result/cart snapshot and diagnostics. | Summary cards, actionable/unassigned counts, assumptions, source rows, supplier links, and decision artifacts are shown. The snapshot remains unchanged after later settings or deactivation edits. | Immutable result/evidence payload returned by backend; artifact preview is read-only. |

### Validation, cancel, and failure branches

- Before any mutation, preserve the user's draft and show an inline error
  summary linked to the invalid field or row. A failed save must not reset the
  form.
- `Cancel` in a dialog closes without mutation. `Cancel PULL` or a running MSP
  cancellation is a confirmed action; if the backend rejects it, keep the
  current view and show a retryable error.
- A failed order-history activation is atomic: the old active snapshot/version
  remains active and the preview error list remains available for correction.
- A failed shop PULL keeps that shop's previous observation and marks the
  User's pull degraded; successful shop observations remain usable.
- A failed adoption or import row never partially overwrites an existing
  canonical product. Other independent rows may report success, already exists,
  or failure according to the backend batch result.
- If the User has no catalog, no active history, or no connected Shopee shop,
  provide a specific next action rather than a generic `No data` message.

## Information architecture

### User-level navigation

```text
Rimu / Procurement
  Authenticated User context + marketplace Shop selector (when needed) + freshness summary
  ├─ Overview / readiness
  ├─ Catalog
  │   ├─ Canonical parent product
  │   │   ├─ Sellable variant
  │   │   └─ Sellable variant
  │   └─ PULL reconciliation
  ├─ Inventory & packaging
  ├─ Suppliers
  │   ├─ Supplier profiles and aliases
  │   └─ Supplier-SKU availability / constraints
  ├─ Order history
  │   └─ Active snapshot / import preview / audit history
  └─ MSP runs
      ├─ Preflight
      ├─ In-progress stages
      └─ Immutable result/cart + evidence
```

The authenticated User context is always visible above the tabs but is not
selectable. There is no Account selector. A labelled Shop selector appears
only on PULL/reconciliation and other marketplace-observation surfaces; it
filters source observations and external associations without changing the
User-wide catalog, inventory, suppliers, history, or runs. On narrow screens,
the Shop selector and tabs become a labelled select/sheet while preserving the
same order.

### Catalog and variant IA

| Level | Primary identity | Required fields | Secondary evidence/actions |
| --- | --- | --- | --- |
| User (authenticated owner/tenant) | `user_id` from session | display context, connected Shops | active history version, last PULL, readiness |
| Canonical parent | immutable `product_id`, immutable canonical parent SKU | name/title, active state, selling-price context, packaging profile, inventory summary | external item associations, marketplace statuses/prices/stocks, PULL timestamps, deactivate/reactivate |
| Sellable variant | immutable `variant_id`, immutable canonical variant SKU | variant label/options, resolved packaging, on-hand, derived on-order, active state | external model associations, observed marketplace SKU drift, supplier candidates |
| Marketplace association | association ID plus `shop_id`, external item/model ID | source shop, external identity, observed SKU, observation timestamp | attach/detach state, match method, drift/discrepancy badges |

Parent rows are expandable table rows; variants are indented child rows, not
separate top-level products. A product with no variants is still a sellable
parent row. The detail panel keeps canonical identity and User-owned values
above marketplace observations. Canonical SKU is never editable after creation
in v1. Marketplace item/model IDs are never used as canonical identity.

Recommended catalog columns, in order: `Product / variant`, `Canonical SKU`,
`Active`, `Packaging`, `On hand`, `On order`, `Associations`, `Freshness`, and
`Actions`. Filters include active state, readiness, association state, and
search over canonical SKU/name/external SKU; there is no fuzzy matching action.

### Readiness and ownership legend

- `Canonical` means User-owned and usable for future runs.
- `Observed` means read-only data from a successful marketplace PULL.
- `Inherited` means a variant resolves its parent's complete packaging profile.
- `Default` means a visible rule or fallback, never a hidden value.
- `Snapshot` means immutable evidence captured for one completed or active run.

## Packaging, inventory, and logistics contract

Packaging is shared by the User and is independent of marketplace status or
observed marketplace dimensions. A parent profile may supply a default to all
variants. A variant override must provide all four fields together:
`length_cm`, `width_cm`, `height_cm`, and `qty_per_box`. Partial overrides are
invalid; a variant either fully overrides or inherits the parent.

| Field | Validation and display | Readiness effect |
| --- | --- | --- |
| `length_cm`, `width_cm`, `height_cm` | Finite number greater than zero; unit suffix `cm`; preserve the submitted precision in the saved value. | Missing/invalid blocks product creation and MSP readiness. |
| `qty_per_box` | Positive integer; no zero, negative, fractional, or blank value. | Missing/invalid blocks product creation and MSP readiness. |
| `volume_per_item_cm3` | Read-only derived value: `(length_cm * width_cm * height_cm) / qty_per_box`. | Must be positive; show formula in help text and result evidence. |
| `selling_price_idr` | User-owned canonical selling price per sellable SKU; marketplace price is only an observation. | Missing handling is a backend contract decision; do not silently copy marketplace price. |
| `on_hand` | User-owned non-negative integer; explicit `0` is valid and visible. | Required on adoption/product creation; missing saved stock for an existing product uses visible `default_zero` in a run snapshot. |
| `on_order` | No manual input. Derived from open order-history rows (`qty_sampai` blank), with source rows and expected arrival. | Informational; never overwrite on-hand. |

Show inventory position as `on_hand + derived on-order`, but keep the two values
separate. A forwarder receipt is not warehouse receipt; it does not increase
on-hand. The UI should expose the two logistics legs in row details:

1. supplier lead time = `forwarder_receive_date - order_date`, using completed
   observations for the supplier-SKU pair;
2. forwarder transit = forwarder receipt to the User's warehouse, initially 60
   days unless the User configures another versioned value.

For a first-time pending supplier-SKU pair, the initial supplier lead-time
default is 7 days, and the expected warehouse arrival uses `7 + 60 days` when
there is no forwarder receipt. Every default is shown as `Assumed`, with source
and rule version in the run snapshot. An open order with a forwarder receipt
uses the receipt date plus forwarder transit; an overdue open order remains open
and is flagged rather than silently closed.

## PULL, reconciliation, and adoption

### PULL behavior

`PULL` is an inbound, read-only observation operation. Starting it for the
authenticated User covers every connected Shopee Shop by default and shows
that scope before the request. A labelled Shop selector may narrow the
marketplace observation scope, but it never narrows ownership of canonical
data. Each shop is staged and committed only when its complete pull succeeds.
A failed shop preserves its previous observations; successful shops remain
current. The User-level report always shows `matched`, `unmapped`, `sku drift`,
`stock discrepancy`, `price discrepancy`, and `failed shop` counts.

Matching order is explicit:

1. stable marketplace item/model association;
2. exact external SKU fallback only when no stable association exists;
3. no fuzzy or text similarity match.

External SKU drift with a stable external identity is a non-blocking warning;
the canonical SKU does not change. A new external item/model identity remains
unmapped even if its SKU text matches an existing canonical SKU.

### Adoption and attachment

The Unmapped table shows source shop, external item/model ID, observed SKU,
title/variation, observed price/stock, and freshness. Each row has two explicit
actions:

- `Attach to existing`: choose one existing canonical parent or variant. The
  association is added without changing canonical SKU, price, packaging, or
  inventory. Attaching a new variant under an associated parent reuses the
  existing parent and never duplicates it.
- `Adopt as new`: preview one canonical parent and its variant tree. The
  marketplace SKU is the proposed canonical SKU seed; the owner confirms a
  unique canonical SKU before creation. Packaging and on-hand are required for
  every created sellable SKU.

Adoption result rows are `added`, `already_exists`, or `failed`. An identical
existing canonical SKU is an idempotent `already_exists` no-op. A conflicting
parentage, packaging, inventory, or association fails only that row and leaves
the current product unchanged. Duplicate canonical SKU is rejected before
creation. Canonical SKU is immutable after creation. PULL itself never creates
or deactivates a canonical product.

## Supplier and supplier-SKU deactivation

Supplier profiles and aliases are User-owned and shared across connected
shops. Supplier lifecycle and supplier-SKU availability are separate controls:

- An inactive supplier remains readable for history and completed results but
  cannot support new order-history imports or future allocation for any shop.
- A supplier-SKU relationship can be `ACTIVE` or `INACTIVE` independently of
  the supplier. Reasons such as `NOT_FOUND`, `NO_LONGER_SOLD`, and
  `NOT_IN_CURRENT_HISTORY` explain availability; they are not lifecycle states.
- Replacing an order-history snapshot can mark absent pairs
  `NOT_IN_CURRENT_HISTORY`, but it never reactivates an inactive pair. Only an
  authenticated User can reactivate it.
- Missing constraints mean unrestricted ordering (`min=0`, `max=infinity`) and
  must be marked `Default` in both settings and run evidence.
- Missing supplier profile metrics may use versioned User/system defaults;
  display `Imputed`, the value, and rule version instead of presenting it as a
  measured supplier fact.

The deactivation dialog wording is:

> Deactivate [supplier or supplier-SKU] for future procurement? This keeps
> order history and completed results readable. New imports and future runs will
> not use this supplier/relationship until the authenticated User reactivates it.

For a relationship, require a reason select (`NOT_FOUND`, `NO_LONGER_SOLD`,
`NOT_IN_CURRENT_HISTORY`, `Other`) and an optional note. For a supplier-level
deactivation, explain that all its active relationships become ineligible for
future runs; do not silently delete them. From a result/cart row, the mutation
updates future eligibility only. The displayed run and cart stay immutable and
the row gains an `Inactive for future runs` badge.

## Exact order-history import preview

The User-facing file has exactly these nine columns, in this order. Extra,
missing, or reordered columns are a blocking schema error; source-specific
columns do not enter the User contract.

```text
sku_produk,sku_variasi,qty_request,qty_sampai,price_per_qty_rmb,supplier_name,item_link,order_date,forwarder_receive_date
```

The snapshot is shared by the User and all connected Shops. If the import
source shop is known, retain its `shop_id` as import metadata outside these
nine stage columns; do not create one active history per shop.

### Field-level contract

| Column | Required/valid values | Preview semantics |
| --- | --- | --- |
| `sku_produk` | Required parent canonical SKU; preserve as supplied. | Unknown current-catalog SKU is a history-only diagnostic, not an automatic row repair. |
| `sku_variasi` | Required sellable-variant canonical SKU; preserve as supplied. | Must provide the identity needed by procurement stages. |
| `qty_request` | Required finite number strictly greater than zero. | Negative, zero, blank, or malformed value is a blocking row error. |
| `qty_sampai` | Blank or finite non-negative number. | Blank = open order and contributes derived on-order; explicit `0` = closed zero-fill; partial and over-receipt remain visible. Fill rate is capped at 100% while actual over-receipt is retained. |
| `price_per_qty_rmb` | Required finite number strictly greater than zero. | Missing/zero/negative cost is a blocking row error. |
| `supplier_name` | Required name or unambiguous User supplier alias resolving to an active supplier. | Inactive, unknown, or ambiguous supplier is a blocking row error; no implicit supplier creation. |
| `item_link` | Required valid HTTP(S) supplier item URL. | Link is retained for result/cart access and supplier-SKU review. |
| `order_date` | Required valid date not later than import date. | Future or malformed date is a blocking row error. |
| `forwarder_receive_date` | Blank or valid date not later than import date. | Blank is valid for an open order. Future/malformed is blocking; a parseable date before `order_date` excludes the affected supplier-SKU observation and reports the row. |

The preview is a full-file validation result, not a best-effort import. Show
these counters above the table:

```text
Rows: 6   Valid: 4   Open orders: 2   History-only diagnostics: 1
Chronology exclusions: 1   Blocking errors: 2   Active snapshot: v17
```

The row table has `Row`, `Parent SKU`, `Variant SKU`, `Supplier`, `Requested`,
`Received`, `Receipt state`, `Order date`, `Forwarder date`, `Outcome`, and
`Errors`. Errors are listed together, with a field label and human-readable
message. `Activate replacement` is disabled while any blocking error exists.
Valid rows are not partially activated beside invalid rows.

### Sanitized preview fixture

```csv
sku_produk,sku_variasi,qty_request,qty_sampai,price_per_qty_rmb,supplier_name,item_link,order_date,forwarder_receive_date
BAG-001,BAG-001-BLK-M,10,,22.50,Supplier A,https://detail.1688.com/offer/10001.html,2026-08-30,
BAG-001,BAG-001-BLK-M,5,5,21.00,Supplier A,https://detail.1688.com/offer/10001.html,2026-07-20,2026-08-03
BAG-001,BAG-001-RED-M,4,0,23.00,Supplier A,https://detail.1688.com/offer/10002.html,2026-08-18,2026-08-25
BAG-002,BAG-002-L,3,4,19.00,Supplier B,https://detail.1688.com/offer/10003.html,2026-08-10,2026-08-17
HISTORY-ONLY,HISTORY-ONLY-1,2,2,10.00,Supplier A,https://detail.1688.com/offer/10004.html,2026-08-01,2026-08-08
BAG-001,BAG-001-BLK-M,1,1,0,Supplier A,https://detail.1688.com/offer/10001.html,2026-08-30,2026-09-01
```

For the fixture, `BAG-001-BLK-M` contributes 10 open on-order units from the
first row; the explicit zero is closed zero-fill; `BAG-002-L` demonstrates
over-receipt while keeping a capped fill-rate metric; `HISTORY-ONLY` is shown
as a diagnostic; and the last row blocks activation because its price is zero.
The test User may use a separate invalid chronology row to assert the
reported exclusion path.

After a valid preview, the confirmation dialog says:

> Replace active order history v17 with v18 for this User? All connected Shopee
> Shops will use v18 for future MSP runs. Completed run snapshots keep
> their original history. This action replaces the entire active snapshot.

The backend returns a preview token and expected active version. Activation
must fail safely on a stale version (`409`): refresh the active version and ask
the owner to preview/confirm again. Deleting the active snapshot requires a
separate destructive confirmation and leaves a compact audit tombstone while
preserving completed-run evidence.

## MSP warnings, confirmation, and result/cart snapshot

### Preflight checklist

The preflight panel is a blocking/non-blocking checklist, not a single green
or red banner.

| Check | Severity | UI copy/action |
| --- | --- | --- |
| Active User catalog has at least one eligible product | Blocker when empty | `Add a canonical product before starting MSP.` Link to Catalog. An empty catalog is not equivalent to a zero-stock catalog. |
| Every eligible parent/variant resolves to complete packaging | Blocker | `Packaging is incomplete for N SKU(s).` List rows and link to edit. |
| On-hand exists for every known product | Warning when using `default_zero` for an existing SKU | `N SKU(s) have no saved stock; this run will use explicit default_zero.` Show affected rows in evidence. |
| Active order-history snapshot exists and passed validation | Blocker for normal run | `Upload and activate one complete order-history snapshot.` Link to Order history. |
| Catalog/history coverage | Confirmation required when active catalog SKUs lack usable history | `I understand N SKU(s) have no usable order-history evidence. They will appear with supplier UNKNOWN and allocation_status not_allocated; no supplier order will be created for them.` |
| History-only rows | Informational diagnostic | `N history row(s) reference SKUs outside the active catalog and will not drive this run.` |
| Supplier and supplier-SKU availability | Warning/diagnostic | Show inactive candidates, excluded reasons, missing metrics, and manual reactivation path. |
| Missing supplier-SKU constraint | Warning | `Default unrestricted constraint applied (min 0, max infinity).` |
| Lead-time defaults | Warning | Show assumed supplier 7-day and forwarder 60-day legs with rule versions. |
| PULL health | Non-blocking degraded state | `PULL completed with N failed shop(s). Previous observations were retained. MSP can continue from canonical User state.` No second acknowledgement is required. |

When all checks pass without unassigned SKUs, the owner can start directly.
When a confirmation is required, the primary action reads `Acknowledge and
start MSP`; it is disabled until the acknowledgement checkbox is checked.
The start summary always shows the authenticated User context, selected Shop
scope when PULL is involved, saved/PULL mode, active history version,
assumption count, and unresolved diagnostics. The Shop scope is never a
catalog, inventory, supplier, history, or run ownership boundary.

### Run and result/cart snapshot

The run header shows `run_id`, authenticated User context, created/updated
timestamps, mode, history version, configuration snapshot version, PULL
timestamp, and overall status. Stage cards retain the current repository's
three-stage order:

1. Sales Forecasting
2. Order Replenishment
3. Supplier Selection (SSOA)

The result summary includes actionable SKU count, unassigned SKU count,
selected supplier count, proposed unit count, estimated spend, assumption
count, and degraded-shop count. The cart table is a snapshot, not a live
supplier lookup:

| Column | Behavior |
| --- | --- |
| SKU / product / variant | Canonical identities captured in the run. |
| Supplier | Supplier name and relationship state captured in the run; `UNKNOWN` for unassigned rows. |
| Quantity | Proposed purchase quantity; no quantity action for `not_allocated`. |
| Unit cost / estimated IDR | Values captured in the run with currency and policy assumptions. |
| Lead time / expected warehouse arrival | Observed versus assumed legs are labelled. |
| Constraint | Minimum/maximum plus `Default` badge when unrestricted. |
| Allocation status | `allocated`, `not_allocated`, or another backend status; never imply a cart action for unknown supplier. |
| Source/evidence | Order-history row links, pull observation timestamp, assumption/default source, and supplier item link. |
| Future eligibility | `Active` or `Inactive for future runs`; changing this setting does not rewrite the snapshot. |

An unassigned row shows demand/replenishment context and diagnostics but no
supplier order recommendation. A result row may offer `Deactivate supplier-SKU`
for future runs; after confirmation the same immutable row remains visible with
`Inactive for future runs`. Artifact previews are read-only and use the
existing table/dialog pattern; artifact content must be returned through the
authenticated backend and must not expose shared-volume paths.

## Wireframe and information hierarchy

### Primary workspace

```text
+--------------------------------------------------------------------------------+
| Rimu / Procurement     Signed-in User: Rimu Bags   Shop scope: All connected v [PULL] |
| Last PULL: 07 Sep 2026 20:10   History: v17 active   Readiness: 3 warnings  |
+--------------------------------------------------------------------------------+
| Overview | Catalog | Inventory & packaging | Suppliers | Order history | MSP  |
+--------------------------------------------------------------------------------+
| [warning] PULL observations are read-only. Canonical User data is primary.  |
|                                                                                |
| Catalog                                  [Search] [Status v] [Readiness v]     |
| + Product / variant | Canonical SKU | Packaging | On hand | On order | Shops + |
| | v Travel Bag      | BAG-001       | Ready     | 12      | 10       | 2 / 2   |
| |   > Black / M     | BAG-001-BLK-M | Inherited | 0       | 10       | 1 / 2   |
| |   > Red / M       | BAG-001-RED-M | Override  | 4       | 0        | 1 / 2   |
| +--------------------------------------------------------------------------------+
| Detail drawer: canonical identity -> packaging/inventory -> associations ->   |
| observations/drift -> history/supplier evidence -> [Edit] [Deactivate]         |
+--------------------------------------------------------------------------------+
```

Canonical product, readiness, and User inventory are primary. Marketplace
observations, warnings, assumptions, diagnostics, and irreversible actions are
secondary but remain adjacent to the value they qualify.

### PULL reconciliation and adoption

```text
+-------------------------------- PULL reconciliation ---------------------------+
| Pull: 2 shops   Main [Succeeded]   Outlet [Degraded: previous retained]       |
| Matched 18 | Unmapped 2 | SKU drift 1 | Stock diff 4 | Failed shops 1        |
| [Matched] [Unmapped] [Drift] [Discrepancies] [Failed shops]                    |
| Shop | External item/model | Observed SKU | Match | Freshness | Action        |
| Main | 10001 / 20001       | BAG-NEW-RED  | None  | 2m ago    | [Adopt] [Attach]|
|                                                                            ... |
| Adoption preview: canonical SKU (unique) | packaging | on-hand | associations  |
| [Cancel]                                                     [Confirm adoption]|
+--------------------------------------------------------------------------------+
```

### Exact history preview and replacement

```text
+----------------------- Import order history -------------------------+
| Required columns (exactly 9)                 [Download template]        |
| [Choose CSV]  selected-file.csv                                         |
| Rows 6 | Valid 4 | Open 2 | History-only 1 | Excluded 1 | Errors 2      |
| [error] Activation blocked: fix all row errors before replacement.     |
| Row | Parent | Variant | Requested | Received | Receipt | Errors     |
|  2  | BAG-001| ...     | 10        | -        | Open    | -          |
|  7  | BAG-001| ...     | 1         | 1        | Closed  | price > 0  |
| [Cancel]                                  [Activate replacement] (off) |
+------------------------------------------------------------------------+
```

### Preflight and result/cart

```text
+------------------------------- Start MSP -------------------------------------+
| User: Rimu Bags (authenticated)   Shop scope: All connected v   Mode: [PULL first v]   History: v18 |
| [x] Catalog ready                 [warning] 3 SKUs use default_zero             |
| [x] Packaging complete            [warning] 1 supplier-SKU inactive             |
| [x] Order history valid            [warning] 2 SKUs have no history             |
| [!] Acknowledge UNKNOWN / not_allocated rows: [ ] I understand ...             |
| [Cancel]                                                     [Acknowledge and start MSP]|
+--------------------------------------------------------------------------------+
| Run abc123 [Succeeded]  snapshot v44  assumptions 5  [Refresh] [Artifacts]     |
| Forecasting [Succeeded] -> Replenishment [Succeeded] -> SSOA [Succeeded]      |
| + SKU | Supplier | Qty | Spend | Lead time | Status | Future eligibility +     |
| | BAG-001-BLK-M | Supplier A | 10 | ... | 7d assumed | Allocated | Active     |
| | BAG-002-L      | UNKNOWN    | -  | ... | -          | Not allocated | -      |
| Source rows, assumptions, supplier links, and immutable evidence                 |
+--------------------------------------------------------------------------------+
```

## Clickable prototype

- URL/artifact: [interactive offline HTML playground](../prototypes/issue-36-shopee-rimu-fe.html),
  with a supporting [scenario storyboard](../prototypes/issue-36-shopee-rimu-fe.md).
  The HTML file is the primary UI review handoff and is not production code.
- Its three design directions are `?variant=A` (guided workspace), `?variant=B`
  (operations console), and `?variant=C` (split command center). Each variant
  exposes catalog/adoption, degraded PULL, history import, MSP preflight, and
  immutable result scenarios using in-memory fixtures only.
- Fixture state: authenticated User `Rimu Bags`, two connected Shopee shops (one degraded),
  two canonical parents with three variants, one unmapped observation, one
  external-SKU drift, one active and one inactive supplier-SKU pair, active
  history v17, and one unassigned catalog SKU.
- Mutations: none. Prototype controls only change in-memory panels, tabs, and
  dialogs; they must not call `rimu-be-go`, Shopee, or MSP services.
- Local review command: `npx serve docs/prototypes`, then open
  `issue-36-shopee-rimu-fe.html` at the localhost URL. Opening the HTML file
  directly also works. Do not publish it as an implementation surface.
- Review question: Is the User-vs-Shop ownership hierarchy obvious, and do
  the PULL degradation, unknown supplier, inherited packaging, and immutable
  result cues appear before the primary action?

## Interaction and accessibility contract

### Keyboard, focus, and dialogs

- Use semantic landmarks: one `main`, a non-interactive authenticated User
  context plus a labelled marketplace Shop selector when present, and a tablist with
  associated tabpanels, headings in hierarchy, and table captions/labels.
- Focus order follows Shop selector (when present) -> PULL mode -> tabs -> filters -> table
  actions -> detail panel. Parent expand/collapse is keyboard-operable and
  announces `expanded`/`collapsed`.
- Use shadcn/Radix `Dialog` for adoption, history replacement/deletion,
  deactivation, and MSP cancellation. On open, move focus to the dialog title or
  first invalid field; trap focus; `Escape` and Cancel close without mutation;
  restore focus to the triggering control.
- Destructive actions use `variant="destructive"`, explicit confirmation, and
  the exact future-only wording above. No destructive action is triggered by a
  row click or a PULL.
- Preserve a user's selected tab, filters, and draft when a background poll or
  a recoverable request fails.

### Status, live regions, and error copy

- Use `Badge` and text labels, not color alone, for `Ready`, `Inherited`,
  `Degraded`, `Imputed`, `Assumed`, `Unknown`, `Inactive for future runs`, and
  stage statuses.
- Loading and mutation progress is announced through an `aria-live="polite"`
  region, for example `Pulling shop Outlet (2 of 2)` and `Order history preview
  ready: 6 rows, 2 errors`.
- Blocking errors use `role="alert"` with an error summary and field/row links;
  inline errors remain adjacent to the associated control. Toasts supplement,
  but never replace, persistent error content.
- External supplier links are labelled with supplier and `opens in a new tab`
  if a new tab is used. Never expose backend filesystem paths, tokens, or raw
  controller errors.
- Tables are usable at 200% zoom and on narrow screens through horizontal
  scroll with a visible caption. Do not hide canonical SKU, status, or error
  text behind hover-only controls.
- Respect `prefers-reduced-motion`; use a static progress state when animation
  is reduced. Stage polling never steals focus.

### Responsive behavior

- Desktop: two-column workspace where the left side is the primary catalog/form
  and the right side is readiness, PULL health, or run history.
- Tablet: stack panels while keeping the authenticated User summary sticky.
- Mobile: convert wide tables to labelled cards or a horizontally scrollable
  table, keep canonical SKU and status in the first visible columns, and move
  secondary actions into a keyboard-accessible `DropdownMenu`.
- File preview and result artifact dialogs use a full-height scroll region on
  small screens; dialog footer actions remain reachable without hiding errors.

## UI state matrix

| Surface | Loading | Empty | Degraded | Error/failure | Recovery and preserved state |
| --- | --- | --- | --- | --- | --- |
| User context/shops | Skeleton User context and Shop rows; disable PULL/start. | `Connect a Shopee Shop before procurement.` | A Shop chip reports stale observation time; the User-owned surfaces remain available. | 401 redirects to login; 403 explains User access; 5xx offers Retry. | Keep active tab and marketplace Shop filter; retry only the failed GET. |
| Catalog | Table skeleton with parent/variant row shape. | No canonical products: `Add a product or adopt an observation; PULL alone does not create catalog state.` | Stale/failed shop observations are badges on association rows, never canonical status. | Conflict on attach/adopt lists the exact SKU and leaves existing row untouched. | Return to reconciliation or edit form; never clear catalog. |
| PULL | Per-shop progress, count, and last successful observation. | No connected Shopee shops: disable PULL and explain Home connection action. | One or more shops failed; previous observations retained; MSP may continue from saved canonical state. | Retry failed shop/report; no automatic duplicate PULL; no canonical writes. | Preserve successful shop results and selected reconciliation tab. |
| Adoption | Preview skeleton and disabled confirm. | No unmapped observations: show `All pulled identities are matched.` | Observation incomplete/stale: block adoption until complete response is available. | Duplicate/conflict or invalid packaging/inventory is row-level and actionable. | Keep entered canonical SKU and packaging draft. |
| Packaging/inventory | Detail skeleton; disable Save. | No selected product: prompt to select a catalog row. | Marketplace stock/price discrepancy is non-blocking warning. | Field errors, stale version `409`, or 5xx; retain draft values. | Refresh only after user chooses; never copy observed stock into on-hand. |
| Suppliers | Supplier/relationship skeleton. | No suppliers: `Import or configure one active supplier before order-history import.` | Inactive supplier/pair and imputed metrics are visible. | Deactivation conflict or forbidden mutation leaves current state. | Retry action; completed results remain readable. |
| Order history | File parsing progress and preview skeleton. | No active snapshot: show bootstrap CTA and block normal MSP start. | Valid snapshot may contain history-only rows, chronology exclusions, or open/overdue orders as labelled diagnostics. | Exact-header, row/field, supplier, date, and URL errors; activation remains blocked; active version unchanged. | Keep file selection/preview errors; fix and re-preview. |
| Preflight | Checklist skeleton and disabled start. | Missing catalog/history shows specific setup CTA. | PULL degraded, default_zero, assumptions, and inactive candidates are warnings. | Blockers list exact products/fields; do not start or silently default packaging. | Links navigate to the owning surface; filters preserved. |
| MSP run | Stage cards `Queued`/`Running`, polling indicator, Cancel. | No runs: `Start a procurement run after completing readiness.` | Stage/artifact endpoint unavailable: keep run status and show partial evidence warning. | Failed/cancelled status includes retry/new-run guidance; stage artifacts remain inspectable. | Poll resumes on reload; completed stage outputs are retained. |
| Result/cart | Summary and table skeleton; no future-only mutation until snapshot loaded. | No result yet: show stage progress or `No actionable allocation`. | Unknown supplier, inactive future pair, assumptions, and failed shops remain badges. | Artifact fetch failure is local to the artifact; run snapshot remains visible. | Refresh/retry artifact only; current snapshot never recomputes. |

## API and state assumptions

### Boundary and compatibility

The frontend uses the existing Axios client (`withCredentials: true`) and calls
only authenticated `rimu-be-go` endpoints. `rimu-be-go` owns User/Shop
authorization, Shopee access tokens, PULL adapters, import persistence, and the
facade to the internal MSP controller. The authenticated session establishes
`user_id`; the browser never chooses or sends a different owner scope. The
browser never receives controller credentials, shared-volume paths, or direct
Shopee/MSP URLs.

Current repository seams that implementation must preserve or intentionally
migrate:

| Existing seam | Current behavior | Design migration |
| --- | --- | --- |
| `GET /api/shop/` | Loads connected Shops for Home, Products, and the current MSP marketplace Shop selector. | Retain authenticated User ownership filtering and expose source/freshness metadata; no Shop becomes catalog owner. |
| `GET /api/marketplace/product/:shopId/list` | Returns shop-local parent/model product snapshots and marketplace stock/price. | Use as a compatibility/read-only observation source until User-scoped PULL endpoints are available; do not write canonical inventory from it. |
| `POST /api/msp/pipeline-runs/upload-start` | Uploads four run-scoped CSV files and starts a shop-bound run. | Replace the normal path with User-scoped snapshot/preflight/run APIs plus optional marketplace Shop scope; retain a compatibility adapter only during migration. |
| `GET /api/msp/pipeline-runs/:id`, `/stage-results`, `/artifacts`, `/artifacts/:name/content`, `/cancel` | Polls current run/stage/artifact state. | Preserve status/artifact semantics and expose User snapshot IDs/evidence in the new facade. |
| `POST /api/marketplace/product/hpp/upload-preview` and `upload-apply` | HPP-only preview/apply for products. | Do not conflate HPP with canonical packaging/inventory; map or retire only after an approved compatibility plan. |

### Proposed User-facing endpoints

Names below are FE assumptions for contract discussion, not implementation
claims. Exact paths and payloads must be finalized with the backend owner before
production code. Every endpoint is served by `rimu-be-go`; `user_id` is inferred
from the authenticated session and is never a client-selectable path segment.

| Operation | Proposed endpoint | Required response/state |
| --- | --- | --- |
| Load authenticated User context and Shops | `GET /api/user/context` (proposed) plus `GET /api/shop/` compatibility | `user_id` from session, display context, connected Shopee Shops, User versions, readiness summary. No owner selector. |
| List canonical catalog | `GET /api/catalog?cursor=...` | User-scoped parent/variant tree, canonical IDs/SKUs, packaging readiness, on-hand, derived on-order summary, association counts. |
| Product detail | `GET /api/catalog/:product_id` | User-owned canonical data, complete Shop associations, PULL observations, source timestamps, supplier candidate summaries. |
| Start/status PULL | `POST /api/marketplace-pulls`, `GET /api/marketplace-pulls/:pull_id` | Optional `shop_id`/`shop_ids` observation scope, per-Shop state, committed observation versions, matched/unmapped/drift/discrepancy counts, failed-Shop errors. |
| Reconciliation rows | `GET /api/marketplace-pulls/:pull_id/reconciliation?shop_id=...` | Stable association/exact-SKU match reason, unmapped observation, Shop/source data, drift/discrepancy data, adoption/attach eligibility. |
| Preview/confirm adoption or attach | `POST .../catalog/adoptions/preview`, `POST .../catalog/adoptions`, `POST .../catalog/associations/attach` | Preview token, row outcomes (`added`, `already_exists`, `failed`), canonical IDs, idempotency result; no partial overwrite on conflict. |
| Edit packaging/inventory | `PATCH /api/catalog/:product_id/packaging`, `PUT /api/inventory/:canonical_sku` | Confirmed User-owned saved version and resolved packaging; `409` stale version; validation errors by field. |
| Suppliers/relationships | `GET /api/suppliers`, `GET /api/supplier-sku`, `PATCH /api/suppliers/:id`, `PATCH /api/supplier-sku/:id/availability` | User-owned active/inactive state, reason, constraints, aliases, imputation metadata, future-only effect. |
| History preview/activation/deletion | `POST .../order-history/import/preview`, `POST .../order-history/import/activate`, `DELETE .../order-history/active` | Exact schema result, all row/field errors, preview token, expected/current version, immutable activation, audit tombstone. |
| MSP preflight | `POST .../msp/preflight` | Blockers, warnings, assumptions, unknown/unassigned list, history-only diagnostics, PULL health, resolved snapshot references. |
| MSP run lifecycle | `POST .../msp/runs`, `GET .../msp/runs`, `GET .../msp/runs/:run_id`, `POST .../msp/runs/:run_id/cancel` | `202` accepted with idempotency key, status/current stage, immutable configuration/evidence snapshot IDs, cancellation result. |
| Stage/result/artifacts | `GET .../msp/runs/:run_id/stage-results`, `GET .../artifacts`, `GET .../artifacts/:name/content` | Self-contained result/cart rows, assumptions, warnings, decision tables, artifact metadata/content without filesystem paths. |

### Stable identifiers and state semantics

- `user_id` from the authenticated session, internal `product_id`/`variant_id`, canonical SKU,
  `association_id`, `shop_id`, `pull_id`, `history_snapshot_id/version`,
  `preflight_id`, `run_id`, `configuration_snapshot_id`, and
  `supplier_sku_relationship_id` are stable identifiers. Marketplace item/model
  IDs are external only.
- Canonical SKU is unique within a User and immutable after creation. PULL
  observations and external SKU text may change without changing canonical
  identity.
- Preview endpoints are non-mutating. Adoption, association, activation,
  inventory/packaging saves, deactivation, and run creation return confirmed
  state and accept an idempotency key where a retry could duplicate work.
- Do not use optimistic updates for User snapshots, adoption, history
  activation, or supplier availability. Show a pending state and replace local
  data with the confirmed response. A simple draft input may be optimistic only
  inside the form; the saved badge waits for confirmation.
- History activation is all-or-nothing and uses an expected active version.
  Failed validation or stale version leaves the previous active snapshot intact.
- PULL commits per Shop only after complete success. A degraded User pull is a
  valid report; it does not mutate canonical User state or block a run from
  saved state.
- MSP run creation captures the User catalog, packaging, inventory, suppliers,
  constraints, PULL observations, history version, assumptions, defaults, and
  policy into an immutable snapshot. An optional Shop scope identifies the
  marketplace source only. Result rendering must use that snapshot, not live
  configuration tables.
- Expected error body shape: `{ code, message, field_errors?, row_errors?,
  retryable?, request_id? }`. The FE maps `401`, `403`, `409`, `422`, `429`, and
  `5xx` to the state matrix above and never exposes raw internal paths.

### Open API decisions before implementation

1. Exact authenticated User context response and Shop summary shape must be
   agreed; there is no owner-selection response or Account entity.
2. Canonical product/import payload and row-level adoption outcome shape must be
   stable before selectors and fixtures are written.
3. User-level MSP API must replace the current `shop_id`-only run payload while
   preserving existing run history links during migration; any `shop_id` is
   optional marketplace source/scope metadata, never ownership.
4. Result/cart artifact names and unassigned-row fields must be agreed with
   `rimu-msp` so the FE does not infer actionability from a missing supplier.
5. Exact versioned supplier metric defaults and forwarder transit settings must
   be returned as evidence, not reimplemented in the browser.

## Playwright plan - required before approval

### Test file, command, and fixture reset

The implementation PR should add or extend
`e2e/user-scoped-procurement-flow.mjs` and keep selectors semantic
(`getByRole`, `getByLabel`, and stable `data-testid` only for run IDs, status,
and row outcomes). Existing `e2e/msp-workbench-flow.mjs` remains the legacy
compatibility flow until the User-scoped path is the default.

Record the full-stack flow from the workspace root with the existing harness:

```powershell
node workspace-harness/scripts/record-ui-proof.mjs `
  --url $env:RIMU_STAGING_FRONTEND_URL `
  --flow .\shopee-rimu-fe\e2e\user-scoped-procurement-flow.mjs `
  --output .\workspace-harness\artifacts\issue-36-user-procurement.webm
```

The staging User must be isolated and sanitized. Reset by backend-owned
fixture seed/restore before each flow (User catalog, Shops, supplier state,
history version, PULL observations, and run state); the browser must not call
internal services or rely on previous flow ordering. For API-level failure
branches, the staging harness may inject deterministic `rimu-be-go` responses
or use a backend fixture switch; do not intercept away the FE-to-BE contract in
the primary happy path. Each implementation flow must publish video,
screenshots covering its assertions, and a Playwright trace; this design PR
does not contain those runtime artifacts.

### Named flows and assertions

| Flow ID | Starting fixture/state | User actions | Expected visible result/assertions | Artifact |
| --- | --- | --- | --- | --- |
| UI-001 | Authenticated User `user-bags`; no canonical products; two connected Shopee Shops. | Open MSP and inspect Overview, then choose PULL. | Signed-in User context is visible but not selectable; marketplace Shop selector is labelled and defaults to all connected Shops; empty catalog says PULL does not create products; Start MSP is blocked until catalog/history readiness. | Video + Overview/empty screenshots + trace. |
| UI-002 | Catalog with existing associations; `shop-main` PULL succeeds and `shop-outlet` fails while a prior outlet observation exists. | Run PULL first and open Failed shops/Discrepancies. | Main observations commit; outlet prior observation remains; `Degraded` and failed-shop count are visible; canonical SKU/on-hand/packaging are unchanged; preflight allows saved-state continuation without a second degraded acknowledgement. | Video + degraded/reconciliation screenshots + trace. |
| UI-003 | One unmapped parent with two variants, one existing parent association, one duplicate canonical SKU conflict. | Open Unmapped; attach one variant to existing parent; preview/adopt the new tree; retry the duplicate. | Attach reuses parent; adoption requires complete packaging/on-hand; duplicate reports `already_exists` or conflict without duplicate rows; PULL never auto-adopts. | Video + adoption/row-outcome screenshots + trace. |
| UI-004 | Parent packaging complete, variant has no override; second variant has partial override; on-hand includes explicit zero. | Edit parent, view inheritance, attempt partial override, save valid override and zero stock. | Partial override is blocked; inherited badge appears; valid override shows derived volume; zero remains `0`; marketplace stock discrepancy is warning-only and does not change on-hand. | Video + packaging/error screenshots + trace. |
| UI-005 | Supplier A active; Supplier B active for one SKU; one relationship already inactive with `NOT_FOUND`; completed run snapshot exists. | Deactivate supplier-SKU from Settings and another relationship from Result/cart; reopen result. | Dialog names future-only impact and reason; settings updates after confirmed response; current run/cart values and allocation remain unchanged; rows show `Inactive for future runs`; PULL does not reactivate. | Video + dialog/result screenshots + trace. |
| UI-006 | Active order-history v17 and CSV containing extra header, zero price, unknown supplier, future date, and malformed URL. | Upload file and review preview. | Exact-nine-column schema error and all row/field errors are shown; Activate is disabled; v17 remains active; draft file/preview stays available after failure. | Video + validation screenshots + trace. |
| UI-007 | Valid CSV fixture with open, explicit-zero, partial, over-receipt, history-only, and chronology-excluded rows. | Upload, inspect counters, confirm replacement, reload Order history. | Exact header is rendered; blank vs zero receipt states differ; over-receipt remains visible with capped fill-rate explanation; history-only diagnostic is excluded from current catalog calculation; old version is replaced only after confirmation; reload shows new version. | Video + preview/confirmation/reload screenshots + trace. |
| UI-008 | Valid catalog/packaging/inventory/history, two active SKUs without history, default constraint, missing stock for one known SKU, first-time pending supplier-SKU. | Choose saved state, run preflight, acknowledge unknown rows, start MSP. | Blockers/warnings are separated; exact UNKNOWN/not_allocated acknowledgement is required; default_zero, unrestricted constraint, 7-day supplier and 60-day forwarder assumptions are visible; no supplier order is shown for unknown rows. | Video + preflight screenshots + trace. |
| UI-009 | Deterministic backend/MSP run succeeds through all three stages and returns result/cart/artifacts. | Start, wait for stage statuses, open result row/artifact, reload. | Run ID and stage statuses reach Succeeded; result/cart snapshot shows allocated and UNKNOWN rows, assumptions, source links, and snapshot version; artifact dialog is read-only; reload restores run and result. | Video + stage/result/artifact/reload screenshots + trace. |
| UI-010 | Queued/running run with cancellation accepted, plus one run whose stage endpoint fails. | Open Cancel dialog, cancel; open failed-stage run and retry artifact load. | Cancel requires confirmation; cancelled run retains completed stage evidence; partial stage/artifact error does not erase run status; retryable error wording and focus behavior are correct. | Video + cancel/error screenshots + trace. |

The highest-risk atomicity assertions are UI-002 (failed PULL preserves prior
shop observations), UI-006 (invalid history never replaces v17), UI-005
(future-only deactivation cannot rewrite a result), and UI-009 (result survives
later settings changes and reload). The implementation PR should include
request/run IDs in test logs without exposing User secrets or raw paths.

## Sanitized fixture contract

The browser flows should share these deterministic fixture concepts:

```yaml
user:
  id: user-bags
  name: Rimu Bags
shops:
  - id: shop-main
    marketplace: shopee
    pull: succeeded
  - id: shop-outlet
    marketplace: shopee
    pull: failed
    prior_observation: retained
catalog:
  - parent_sku: BAG-001
    variants: [BAG-001-BLK-M, BAG-001-RED-M]
    packaging: parent_complete
  - parent_sku: BAG-002
    variants: [BAG-002-L]
    packaging: variant_override_complete
suppliers:
  - name: Supplier A
    state: active
  - name: Supplier B
    state: active
    relationship_BAG-002-L: inactive
history: v17
```

Use a separate invalid-history fixture for each validation branch so the
assertion identifies the error rather than relying on row order. The valid
fixture includes the CSV above plus a chronology-invalid row and is reset to
v17 before UI-007. Mocked PULL observation values must include source shop,
external item/model ID, observed SKU, stock, price, status, pull time, and
match reason. Mocked result rows must include snapshot values, assumptions,
supplier relationship state, and source row IDs so the UI cannot accidentally
pass by live-looking up current settings.

## Review decisions required

- Confirm that `/msp` remains the compatibility route and that the User-level
  tabs are the first release IA.
- Confirm the authenticated User context response and proposed User API path
  names before implementation begins; there is no Account selector/entity.
- Confirm the adoption form's proposed canonical SKU seed/edit behavior and the
  requirement for complete packaging and on-hand before creation.
- Confirm that degraded PULL is non-blocking with no second acknowledgement,
  while unassigned catalog SKUs require explicit confirmation.
- Confirm the exact order-history nine-column header, blank-vs-zero receipt
  semantics, atomic replacement, and deletion behavior.
- Confirm whether supplier deactivation is available from both Settings and
  Result/cart in the first implementation slice.
- Confirm result/cart snapshot fields and the `UNKNOWN`/
  `not_allocated` rendering contract with `rimu-msp`.
- Review the [interactive HTML playground](../prototypes/issue-36-shopee-rimu-fe.html)
  and decide which variant best communicates User-vs-Shop hierarchy, warnings,
  and the end-to-end procurement flow. The
  [scenario storyboard](../prototypes/issue-36-shopee-rimu-fe.md) remains a
  compact reference.

Do not implement production UI until the owner replies with `DESIGN APPROVED`
or equivalent. Any behavior change must revise the user flow, wireframe,
prototype plan, API assumptions, and Playwright matrix together.

## Design PR delivery

This materialization is docs-only. The allowed changes are this design document
and the optional linked prototype storyboard under `docs/prototypes/`; no source,
config, test, runtime, dependency, or deployment files are part of the design
PR. The implementation PR is separate and must run build, lint, the declared
Playwright flows, and publish verified video/screenshot/trace links.

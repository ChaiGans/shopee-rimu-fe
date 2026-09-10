# Throwaway prototype storyboard: User-scoped canonical procurement

**Interactive review artifact:** open
[`issue-36-shopee-rimu-fe.html`](issue-36-shopee-rimu-fe.html) in a browser.
Use its bottom switcher or `?variant=A`, `?variant=B`, and `?variant=C` to compare
three interactive design directions. This Markdown file remains supporting
scenario documentation, not the primary UI review artifact.

Status: review-only, offline, and non-mutating. This is the local storyboard
linked by the UI design review; it is not production UI and does not call
`rimu-be-go`, Shopee, the MSP controller, or any other service.

## Review variants

The interactive static prototype exposes the shared fixture through three
design variants and five clickable scenario screens:

- `?variant=A`: guided stepper workspace.
- `?variant=B`: dense operations console.
- `?variant=C`: split command center with persistent readiness state.

Each variant lets the reviewer navigate catalog and adoption, degraded PULL,
history import, MSP preflight, and immutable result behavior. All actions remain
in browser memory and reset on reload.

## Shared fixture

```yaml
user: Rimu Bags (user-bags)
shops:
  - shop-main: successful PULL
  - shop-outlet: failed PULL; previous observations retained
catalog:
  - BAG-001: BAG-001-BLK-M and BAG-001-RED-M
  - BAG-002: BAG-002-L
suppliers:
  - Supplier A: active
  - Supplier B: active supplier-SKU relationship marked NOT_FOUND
history: v17 active; v18 is the replacement preview
warnings:
  - one external SKU drift
  - one stock discrepancy
  - one unknown/unassigned catalog SKU
  - one default_zero stock source
  - one assumed 7-day supplier lead time plus 60-day forwarder transit
```

## Interaction storyboard

1. **Catalog** - expand `BAG-001`, select `BAG-001-BLK-M`, and open the detail
   drawer. The drawer keeps canonical identity and User inventory above
   marketplace observations. Clicking `PULL` opens the labelled Shop
   scope/progress state; the Shop is a source filter, not an owner selector.
2. **Degraded PULL** - show `shop-main` as succeeded and `shop-outlet` as
   failed. Selecting `Failed shops` explains that the outlet's prior
   observation remains. The canonical table does not change.
3. **Adoption** - select an unmapped observation. `Attach to existing` opens a
   parent/variant chooser. `Adopt as new` opens a preview where the
   authenticated User must complete packaging and on-hand before the in-memory
   confirm button enables.
4. **History** - switch to the exact preview. Invalid rows keep the active v17
   badge and the replacement button disabled. A valid variant shows the
   replacement confirmation with old/new versions.
5. **Preflight** - show blockers separately from warnings. The authenticated
   User must check the UNKNOWN/not_allocated acknowledgement; degraded PULL
   does not add a second acknowledgement.
6. **Result** - show allocated and UNKNOWN rows. Open the supplier-SKU
   deactivation dialog; after confirm, the same snapshot row gets
   `Inactive for future runs` while its quantity and supplier values remain
   unchanged.

## Review questions

- Is it obvious that User-owned data is canonical and PULL data is
  observational, while Shop selection only filters marketplace context?
- Is the parent/variant tree understandable without knowing Shopee item/model
  terminology?
- Do warnings distinguish blockers, assumptions, degraded shops, and
  non-actionable UNKNOWN rows before the start action?
- Does the future-only deactivation behavior preserve trust in a completed
  result?

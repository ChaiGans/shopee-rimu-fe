# Shopee RIMU frontend coding rules

## Constants and helpers

- Keep JSX/TSX focused on composition, rendering, and event wiring. Avoid
  embedding hardcoded behavior values, route strings, status names, timing
  limits, field definitions, or repeated UI copy directly in JSX.
- Put feature-local constants in the nearest `constants.js` file and pure
  feature helpers in the nearest `helpers.js` file. Because this repository is
  TypeScript, use `constants.ts` and `helpers.ts` equivalents so the same rule
  retains static type checking.
- For MSP code, use `src/components/msp/constants.ts` and
  `src/components/msp/helpers.ts` first.
- If a constant or helper is needed by another file in the same feature, keep
  it in that feature folder. If sibling features need it, move it one folder
  outward. Continue lifting it toward `src/` until the narrowest shared owner
  is reached; never duplicate the value or helper.
- Reuse an existing outer constant/helper before creating a new local copy.

## Boundaries

- The browser calls `rimu-be-go` through the shared Axios client only.
- Never call the internal MSP controller directly or place credentials and
  filesystem paths in browser code.
- Preserve the existing shadcn/ui component policy and run `npm run build` plus
  changed-file ESLint after UI changes.

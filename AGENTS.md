# Shopee RIMU Frontend Guide

This repository owns the authenticated Shopee-facing RIMU web application.
Keep browser state and presentation here; call `rimu-be-go` through the API
client and never call internal MSP services directly.

## UI component policy

- Prefer existing shadcn/ui components in `src/components/ui` before writing
  new markup. Use the shadcn CLI documentation and component generator when a
  needed primitive is missing.
- Compose pages from shadcn primitives such as `DropdownMenu`, `Dialog`,
  `Button`, `Badge`, `Table`, and `Toast`. Do not hand-roll menus, overlays,
  dialogs, or equivalent interaction behavior.
- Keep page JSX focused on composition and event wiring. Put reusable visual
  styling in the owning shadcn component or a dedicated module; do not add
  large inline style systems to page files.
- Use component variants and semantic design tokens before custom Tailwind
  classes. Use `cn()` for conditional classes and preserve keyboard and screen
  reader behavior supplied by shadcn primitives.

## Verification

- Run `npm run build` for every UI change.
- Run ESLint on changed files; record unrelated repository warnings separately.
- UI changes require the workspace Playwright proof flow before handoff.

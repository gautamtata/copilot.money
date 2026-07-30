<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design system — "Banknote"

Light-mode engraved-currency identity. The aesthetic references the material
world of money: banknote intaglio, guilloche security patterns, statement
print. Every visual decision should be defensible in those terms.

## Tokens (defined in `src/app/globals.css` via `@theme` — always use these, never raw hex/neutral-*)

- Surfaces: `bg-paper` (green-tinted app bg), `bg-card` (white cards), `bg-moss` (tinted fills/hovers), borders `border-line` / `border-line-strong`
- Ink: `text-ink` (primary), `text-ink-2` (secondary), `text-ink-3` (muted)
- Brand: `pine` (#175a43, primary actions/lines), `pine-deep` (hover, display headings)
- Money semantics: `pos` (inflows/under budget) and `neg` (debt/over budget) — reserved, never decorative
- Charts: `cat-1..cat-6` — a CVD-validated categorical palette in **fixed order**; a category's color = `categoryColor(sort_order)` from `src/lib/colors.ts`. Never cycle colors by data order; color follows the entity.

## Type (three faces, three jobs)

- `font-display` **Besley** (Clarendon slab — banknotes use Clarendons): big numerals and page titles only, via the `.figure` class (adds tabular numerals + tight tracking)
- `font-sans` **Public Sans** (the U.S. government's typeface): all UI/body; body sets `tnum` globally so amounts align
- `font-mono` **IBM Plex Mono**: metadata that mimics statement print — use the `.eyebrow` class for card titles/section labels (mono, uppercase, letterspaced)

## Components & conventions

- Cards: `Card` from `src/components/Card.tsx` — rounded-2xl, hairline border, whisper shadow. Card titles are eyebrows, not headings.
- The signature element is the **guilloche rosette** (`src/components/Guilloche.tsx`, parametric SVG). It appears exactly twice: login and the dashboard net-worth hero. Do not sprinkle it elsewhere — its rarity is the point.
- Charts: Recharts. Follow the dataviz rules: recessive axes/grid, 2px lines, one axis (never dual), tooltips styled as mini-cards with eyebrow labels, legend only for ≥2 series, text in ink tokens never series colors.
- Money display: `formatCents` always; income/inflows prefixed `+` and `text-pos`; spending stays neutral ink (red is reserved for debt/over-budget, not ordinary spending).
- Buttons: primary = `bg-pine text-white hover:bg-pine-deep rounded-xl`; quiet actions = `text-ink-3 hover:text-ink`.
- Mobile: sidebar hides < md; `MobileNav` bottom tab bar (5 slots + More sheet) with safe-area padding. Any new page must work at 375px width.
- Motion: subtle and rare; respect `prefers-reduced-motion` (global rule in globals.css). Prefer one orchestrated moment over scattered effects.

## When adding UI

Reuse tokens and components above; if a new primitive is needed, add it to the
system (globals.css + this doc) rather than inventing one-off styles inline.

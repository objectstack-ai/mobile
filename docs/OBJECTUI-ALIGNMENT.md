# ObjectUI Alignment

This document records how the mobile rendering engine aligns with **ObjectUI**
— the web SDUI engine maintained alongside the platform — and the schema
contract it shares with it.

## TL;DR

- **ObjectUI is on the same platform generation as mobile.** ObjectUI's `main`
  builds against `@objectstack/spec ^7.2.1`; mobile builds against
  `@objectstack/spec 7.3.0`. They are *not* on different protocol versions.
- **The only real difference is the rendering target.** ObjectUI renders the
  shared schema to the **DOM** (React + Tailwind + Shadcn → `<div>`); the mobile
  engine renders the same schema to **React Native** primitives (`<View>`).
- **The schema is the shared contract; the renderer is platform-specific.**

## Package strategy

| Package | Contents | Use on mobile? | Why |
| --- | --- | --- | --- |
| `@objectstack/spec/ui`, `@objectstack/spec/data` | Pure Zod schema + inferred types. **No React, no DOM.** | ✅ **Import directly** | Already resolved in the app (`hooks/useNotifications.ts` imports `@objectstack/spec/api`). `import type` only → erased at build, zero bundle cost. This is the authoritative contract. |
| `@object-ui/core`, `@object-ui/react`, `@object-ui/components`, `@object-ui/data-objectstack` | The web rendering engine: component registry, expression eval, Tailwind/Shadcn DOM components. | ❌ **Do not import** | They bind to the web DOM. Mobile must use its own RN renderers. Pulling them in would drag DOM dependencies into the native bundle. |

**Conclusion:** align the *contract* by consuming `@objectstack/spec`; keep the
*renderer* native. Do not depend on `@object-ui/*`.

## Phase 1 — Contract alignment (done)

Previously, `components/renderers/types.ts` and `lib/page-renderer.ts`
hand-maintained interfaces that *mirrored* the spec ("mirrored from
`@objectstack/spec/ui`" per the file headers). Hand-mirroring is the drift
source. Phase 1 replaces the mirrors with the authoritative types:

- Added `@objectstack/spec` as a direct dependency (`^7.3.0`).
- `types.ts` now re-exports the authoritative contract types instead of
  re-declaring them:
  - `FieldType`, `SelectOption` ← `@objectstack/spec/data`
  - `ListColumn`, `ColumnSummary`, `RowHeight`, `RowColorConfig`,
    `GroupingConfig`, `SelectionConfig`, `PaginationConfig`,
    `VisualizationType` ← `@objectstack/spec/ui`
- Mobile *view-models* that have no clean spec equivalent (or where the spec
  type is `any`, e.g. `FormField`) are kept but documented and augmented to
  close field gaps (`FormSection.name/description/visibleOn`,
  `ListViewMeta.rowHeight/grouping/rowColor/striped/bordered/...`).
- `lib/page-renderer.ts` aligned to spec `PageSchema`: `PageVariable.defaultValue`
  (with legacy `default` fallback), `PageRegion.width`, richer
  `PageComponentType` slot list, plus `PageSchema.description/icon`.

All gains are additive supersets — `tsc` and the full test suite (1059 tests)
pass unchanged.

## Known divergences / later phases

These are deliberately deferred so the contract change stays low-risk.

### Architecture shape
The spec models a data view as `View.list = { type: VisualizationType, columns,
filter, sort, grouping, … }` — **one** list config whose `type`
(`grid | kanban | gallery | calendar | timeline | gantt | map`) selects the
visualization. The native engine flattens this into per-`viewType` renderers.
`list` ≈ spec `grid`.

### Phase 2 — List display parity (done)
The RN list renderer now honours the spec-aligned options carried on
`ListViewMeta`:

- **`rowHeight`** — row density (`compact`→`extra_tall`) maps to vertical padding.
- **`rowColor`** — per-row background resolved from a field value via the
  `{ field, colors }` map.
- **`grouping`** — records are bucketed by the first grouping field with a
  count-bearing group header row (`buildListItems`).
- **column `summary`** — a footer row renders per-column aggregations
  (`count`, `sum`, `avg`, `min`, `max`, `count_*`, `percent_*`) via
  `computeColumnSummary`.
- **`striped`** / **`bordered`** — alternating row backgrounds and cell borders.
- **`showRecordCount`** — a toolbar shows the total record count.

Both pure helpers are unit-tested (`__tests__/components/ListViewRenderer.test.ts`).

Still deferred: `conditionalFormatting`, `inlineEdit`, and multi-level grouping.

### Phase 3 — Missing visualizations (done)
`gallery` and `gantt` — both in the authoritative `VisualizationType` enum and
the `ViewType` union — now have native renderers, registered in `ViewRenderer`
(lazy-loaded) and exported from `components/renderers`:

- **`GalleryViewRenderer`** — an image-forward card grid (`expo-image`), with
  tolerant image/title/subtitle field resolution and configurable column count
  and aspect ratio (spec `GalleryConfig`).
- **`GanttViewRenderer`** — horizontal task bars positioned proportionally on a
  shared timeline derived from start/end date fields (spec `GanttConfig`),
  with a sensible 1-day default span when an end date is absent.

Pure helpers (`resolveImageUri`/`resolveCardField`, `toEpoch`/`buildGanttTasks`/
`ganttBounds`) are unit-tested.

Still deferred: drag-to-reschedule on Gantt, Gantt dependency links, and
Gallery quick-actions.

### Page layout model
Spec `PageSchema` expresses layout via `type` (`PageType`) + `blankLayout`, not
the simplified `layout` field the native renderer uses. Full `PageType`/
`blankLayout` support is a later phase.

### Designer
Out of scope for mobile by product decision — only the display/runtime surface
is aligned, not the visual designer.

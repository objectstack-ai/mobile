---
"mobile": minor
---

Align the native rendering engine's schema contract with ObjectUI (the web SDUI
engine) by consuming the authoritative `@objectstack/spec` types instead of
hand-maintained mirrors.

- Added `@objectstack/spec` as a direct dependency (`^7.3.0`).
- `components/renderers/types.ts` now re-exports the platform-agnostic contract
  types from the spec rather than re-declaring them: `FieldType`/`SelectOption`
  (`spec/data`) and `ListColumn`/`ColumnSummary`/`RowHeight`/`RowColorConfig`/
  `GroupingConfig`/`SelectionConfig`/`PaginationConfig`/`VisualizationType`
  (`spec/ui`). Mobile view-models with no clean spec equivalent are kept,
  documented, and augmented to close field gaps (`FormSection.name/description/
  visibleOn`, `ListViewMeta` spec-aligned display options, `ViewType` gains
  `gallery`/`gantt`).
- `lib/page-renderer.ts` aligned to the spec `PageSchema`: `PageVariable.defaultValue`
  (with legacy `default` fallback — fixes server defaults never being applied),
  `PageRegion.width`, a richer `PageComponentType` slot list, and
  `PageSchema.description`/`icon`.
- Added `docs/OBJECTUI-ALIGNMENT.md` documenting the package strategy (use
  `@objectstack/spec`, do not depend on `@object-ui/*` DOM renderers) and the
  phased display-parity roadmap.

All changes are additive supersets; `tsc`, ESLint, and the full test suite pass
unchanged.

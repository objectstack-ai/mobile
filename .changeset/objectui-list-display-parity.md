---
"mobile": minor
---

Render spec-aligned list-view display options (ObjectUI list parity, phase 2).

`ListViewRenderer` now honours the `@objectstack/spec/ui` `ListView` display
options surfaced on `ListViewMeta`:

- `rowHeight` — row density (`compact`…`extra_tall`) → vertical padding.
- `rowColor` — per-row background from a field value (`{ field, colors }`).
- `grouping` — records bucketed by the first grouping field with a
  count-bearing group header (`buildListItems`).
- column `summary` — footer row with per-column aggregations (`count`, `sum`,
  `avg`, `min`, `max`, `count_*`, `percent_*`) via `computeColumnSummary`.
- `striped` / `bordered` — alternating row backgrounds and cell borders.
- `showRecordCount` — toolbar record count.

Both pure helpers are unit-tested. `conditionalFormatting`, `inlineEdit`, and
multi-level grouping remain deferred.

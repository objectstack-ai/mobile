---
"mobile": minor
---

Add native `gallery` and `gantt` view renderers (ObjectUI visualization parity,
phase 3).

Both visualizations exist in the authoritative `@objectstack/spec/ui`
`VisualizationType` enum but had no React Native renderer:

- `GalleryViewRenderer` — image-forward card grid (`expo-image`) with tolerant
  image/title/subtitle resolution and configurable columns/aspect ratio
  (`GalleryConfig`).
- `GanttViewRenderer` — horizontal task bars positioned proportionally across a
  shared timeline from start/end date fields (`GanttConfig`), defaulting to a
  1-day span when an end date is missing.

Both are registered in `ViewRenderer` (lazy-loaded under the `gallery`/`gantt`
view types) and exported from `components/renderers`. Pure helpers
(`resolveImageUri`/`resolveCardField`, `toEpoch`/`buildGanttTasks`/`ganttBounds`)
are unit-tested.

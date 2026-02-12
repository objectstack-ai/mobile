# ObjectStack Mobile — UI/UX Design Specification

> **Version**: 1.0 · **Last Updated**: 2026-02-08
>
> Complete UI/UX design specification for the ObjectStack Mobile client.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Design System](#design-system)
3. [Layout Architecture](#layout-architecture)
4. [Navigation Design](#navigation-design)
5. [View Renderers](#view-renderers)
6. [Field Types & Widgets](#field-types--widgets)
7. [Action System](#action-system)
8. [Common Components](#common-components)
9. [Interaction Patterns](#interaction-patterns)
10. [Responsive Design](#responsive-design)
11. [Accessibility](#accessibility)
12. [Dark Mode](#dark-mode)

---

## Design Principles

### 1. Metadata-Driven UI

Every screen is generated from server metadata. The mobile client never hardcodes:
- Field labels, types, or layouts
- View columns, sorting, or filtering rules
- Action buttons, menus, or navigation targets
- Dashboard widgets or chart configurations

### 2. Native Feel

Despite being metadata-driven, the app must feel like a native mobile application:
- Platform-native navigation patterns (tab bar, stack navigation)
- Standard gesture interactions (swipe, pull-to-refresh, long-press)
- Haptic feedback on key interactions
- Platform-appropriate loading and transition animations

### 3. Progressive Disclosure

Complex enterprise data is presented in layers:
- **List view**: Essential columns only, with search and filter
- **Detail view**: Full record data organized in sections
- **Edit mode**: Editable fields with inline validation
- **Advanced filters**: Available via drawer, not cluttering the main view

### 4. Offline Transparency

Users should always know their connectivity status:
- Subtle offline indicator (not blocking)
- Pending sync badge count
- Conflict resolution prompts (only when necessary)

---

## Design System

### Design Tokens

The app uses CSS variables as design tokens, defined in `global.css`:

```css
/* Light mode (default) */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
}
```

### Color Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary` | Blue 600 | Blue 400 | Primary actions, active tab, links |
| `secondary` | Gray 100 | Gray 800 | Secondary actions, backgrounds |
| `destructive` | Red 500 | Red 400 | Delete, error states |
| `muted` | Gray 100 | Gray 800 | Disabled states, borders |
| `accent` | Gray 100 | Gray 800 | Highlighted elements |
| `background` | White | Gray 950 | Page backgrounds |
| `foreground` | Gray 900 | Gray 50 | Primary text |
| `muted-foreground` | Gray 500 | Gray 400 | Secondary text, placeholders |

### Typography

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| **Display** | 28px | Bold (700) | Screen titles |
| **Title** | 20px | Semibold (600) | Section headers |
| **Headline** | 17px | Semibold (600) | Card titles, tab labels |
| **Body** | 15px | Regular (400) | Primary content |
| **Callout** | 13px | Regular (400) | Secondary information |
| **Caption** | 11px | Semibold (600) | Tab labels, badges |

### Spacing

Consistent 4px grid system via Tailwind classes:

| Token | Value | Class | Usage |
|-------|-------|-------|-------|
| xs | 4px | `p-1` | Tight padding |
| sm | 8px | `p-2` | Component padding |
| md | 12px | `p-3` | Card padding |
| lg | 16px | `p-4` | Section spacing |
| xl | 24px | `p-6` | Screen padding |
| 2xl | 32px | `p-8` | Large spacing |

### UI Primitives

Located in `components/ui/`, following shadcn/ui pattern:

| Component | File | Description |
|-----------|------|-------------|
| `Button` | `Button.tsx` | Primary, secondary, destructive, outline, ghost variants |
| `Card` | `Card.tsx` | Content container with header, content, footer |
| `Input` | `Input.tsx` | Text input with label, error, helper text |
| `Select` | `Select.tsx` | Dropdown picker |
| `Checkbox` | `Checkbox.tsx` | Checkbox with label |
| `Switch` | `Switch.tsx` | Toggle switch |
| `Badge` | `Badge.tsx` | Status badges, counts |
| `Avatar` | `Avatar.tsx` | User avatars with fallback |
| `Dialog` | `Dialog.tsx` | Modal dialogs |
| `BottomSheet` | `BottomSheet.tsx` | Bottom sheet overlay |
| `Tabs` | `Tabs.tsx` | Tab navigation within a view |
| `Toast` | `Toast.tsx` | Notification toasts |
| `Skeleton` | `Skeleton.tsx` | Loading placeholders |

---

## Layout Architecture

### Screen Structure

```
┌─────────────────────────────────┐
│         Status Bar              │
├─────────────────────────────────┤
│    Navigation Header            │
│    [← Back]  Title  [Actions]   │
├─────────────────────────────────┤
│                                 │
│                                 │
│         Content Area            │
│    (Scrollable / Virtualized)   │
│                                 │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│    Tab Bar (if in tabs group)   │
│  [Home] [Apps] [Notif] [Profile]│
└─────────────────────────────────┘
```

### Tab Bar

| Tab | Icon | Screen | Badge |
|-----|------|--------|-------|
| Home | `Home` | Dashboard/recent activity | — |
| Apps | `LayoutGrid` | App launcher grid | — |
| Notifications | `Bell` | Notification list | Unread count |
| Profile | `UserCircle` | Settings & profile | — |

**Styling**:
- Active tint: `#1e40af` (Blue 800)
- Inactive tint: `#94a3b8` (Gray 400)
- Font size: 11px, weight: 600

---

## View Renderers

### List View (`ListViewRenderer`)

```
┌─────────────────────────────────┐
│  Search Bar          [Filter]   │
├─────────────────────────────────┤
│  [Select All]  n items selected │
│  [Batch Action Bar]             │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │ Record Row 1          [>]  ││
│  │ Field1 · Field2 · Field3   ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Record Row 2          [>]  ││
│  │ Field1 · Field2 · Field3   ││
│  └─────────────────────────────┘│
│          ... (infinite scroll)  │
├─────────────────────────────────┤
│           [+ Create]  (FAB)     │
└─────────────────────────────────┘
```

**Features**:
- Pull-to-refresh
- Infinite scroll pagination
- Swipeable rows (edit/delete)
- Multi-select with batch actions
- Column-based layout from view metadata
- Sort indicators

### Form View (`FormViewRenderer`)

```
┌─────────────────────────────────┐
│  [Cancel]   New Record  [Save]  │
├─────────────────────────────────┤
│  Section: Basic Info            │
│  ┌─────────────────────────────┐│
│  │ Field Label                 ││
│  │ [Input Value          ]     ││
│  │ Helper text                 ││
│  └─────────────────────────────┘│
│  ┌────────────┐┌───────────────┐│
│  │ Field A    ││ Field B       ││
│  │ [Value   ] ││ [Value      ] ││
│  └────────────┘└───────────────┘│
│                                 │
│  Section: Details (collapsible) │
│  ┌─────────────────────────────┐│
│  │ Textarea Field              ││
│  │ [                       ]   ││
│  │ [                       ]   ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Layout DSL Support**:
- `sections` — Group fields into collapsible sections
- `columns` — Multi-column layout within sections
- `colSpan` — Field width spanning
- `dependsOn` / `visibleOn` — Conditional field visibility
- Form types: `simple`, `tabbed`, `wizard`, `split`, `drawer`, `modal`

### Detail View (`DetailViewRenderer`)

```
┌─────────────────────────────────┐
│  [← Back]   Record   [⋮ More]  │
├─────────────────────────────────┤
│  Record Title                   │
│  Status Badge                   │
│  ┌──────────────────┐          │
│  │ [Edit] [Delete]  │          │
│  └──────────────────┘          │
├─────────────────────────────────┤
│  [◀ Previous]   [Next ▶]       │
├─────────────────────────────────┤
│  Section: Overview              │
│  Field Label       Value        │
│  Field Label       Value        │
│  Field Label       Value        │
│                                 │
│  Section: Related               │
│  [Related Records List]         │
└─────────────────────────────────┘
```

**Features**:
- Record navigation (previous/next)
- Action bar with context-aware actions
- Read-only field rendering
- Related record lists
- Swipe between records

### Dashboard View (`DashboardViewRenderer`)

```
┌─────────────────────────────────┐
│  Dashboard Title                │
├────────────────┬────────────────┤
│  ┌──────────┐  │  ┌──────────┐  │
│  │  Metric  │  │  │  Metric  │  │
│  │  Card    │  │  │  Card    │  │
│  │  1,234   │  │  │  5,678   │  │
│  └──────────┘  │  └──────────┘  │
├────────────────┴────────────────┤
│  ┌──────────────────────────┐   │
│  │    Chart Widget          │   │
│  │    (Bar/Line/Pie)        │   │
│  │                          │   │
│  └──────────────────────────┘   │
├─────────────────────────────────┤
│  ┌──────────────────────────┐   │
│  │    List Widget           │   │
│  │    Recent Records        │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

**Widget Types**:
- Metric cards (count, sum, avg, min, max)
- Chart widgets (bar, line, pie, funnel)
- List widgets (recent records)
- Responsive grid layout with `span` support

### Kanban View (`KanbanViewRenderer`)

```
┌─────────────────────────────────┐
│  Board Title                    │
├──────────┬──────────┬───────────┤
│  Column1 │ Column2  │ Column3   │
│  (3)     │ (5)      │ (2)       │
│ ┌──────┐ │┌──────┐  │┌──────┐  │
│ │Card 1│ ││Card 3│  ││Card 8│  │
│ └──────┘ │└──────┘  │└──────┘  │
│ ┌──────┐ │┌──────┐  ││         │
│ │Card 2│ ││Card 4│  ││         │
│ └──────┘ │└──────┘  ││         │
│          │┌──────┐  ││         │
│          ││Card 5│  ││         │
│          │└──────┘  ││         │
└──────────┴──────────┴───────────┘
```

### Calendar View (`CalendarViewRenderer`)

```
┌─────────────────────────────────┐
│  [<] February 2026 [>]         │
├─────────────────────────────────┤
│  Mon Tue Wed Thu Fri Sat Sun    │
│                              1  │
│  2   3   4   5   6   7   8     │
│            ●                    │
│  9  10  11  12  13  14  15     │
│      ●       ●                  │
│  16  17  18  19  20  21  22    │
│  23  24  25  26  27  28        │
├─────────────────────────────────┤
│  Events for selected date:      │
│  ┌──────────────────────────┐   │
│  │ Event 1 — 10:00 AM      │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

### Chart View (`ChartViewRenderer`)

Standalone chart renderer supporting:
- **Bar charts** — Categorical comparisons
- **Line charts** — Trend analysis over time
- **Pie charts** — Distribution breakdown
- **Funnel charts** — Conversion pipelines

### Timeline View (`TimelineViewRenderer`)

```
┌─────────────────────────────────┐
│  Timeline                       │
├─────────────────────────────────┤
│  ● Feb 8, 2026                  │
│  │  Activity description        │
│  │  User · 2 hours ago          │
│  │                              │
│  ● Feb 7, 2026                  │
│  │  Activity description        │
│  │  User · 1 day ago            │
│  │                              │
│  ● Feb 6, 2026                  │
│  │  Activity description        │
│  │  User · 2 days ago           │
└─────────────────────────────────┘
```

### Map View (`MapViewRenderer`)

Renders records with location data as map pins with info popups.

---

## Field Types & Widgets

The rendering engine supports 55+ field types, each mapped to an appropriate mobile widget:

### Text Fields

| Field Type | Widget | Features |
|-----------|--------|----------|
| `text` | TextInput | Single line, character limit |
| `textarea` | MultilineInput | Multi-line, expandable |
| `email` | TextInput | Email keyboard, validation |
| `url` | TextInput | URL keyboard, link preview |
| `phone` | TextInput | Phone keyboard, formatting |
| `password` | TextInput | Secure entry, toggle visibility |
| `markdown` | MarkdownEditor | Preview mode |
| `richtext` | RichTextEditor | Toolbar, formatting |

### Numeric Fields

| Field Type | Widget | Features |
|-----------|--------|----------|
| `number` | NumberInput | Numeric keyboard, step |
| `currency` | CurrencyInput | Symbol, decimal places |
| `percent` | NumberInput | Percentage display |
| `rating` | StarRating | Tap to rate |
| `slider` | Slider | Range, step |
| `progress` | ProgressBar | Display only |

### Date & Time Fields

| Field Type | Widget | Features |
|-----------|--------|----------|
| `date` | DatePicker | Calendar popup |
| `datetime` | DateTimePicker | Date + time selection |
| `time` | TimePicker | Time-only selection |

### Selection Fields

| Field Type | Widget | Features |
|-----------|--------|----------|
| `boolean` / `toggle` | Switch | On/off toggle |
| `select` / `radio` | Picker / RadioGroup | Single selection |
| `multiselect` / `checkboxes` | MultiPicker | Multiple selection |
| `tags` | TagInput | Freeform tagging |
| `color` | ColorPicker | Color selection |

### Relational Fields

| Field Type | Widget | Features |
|-----------|--------|----------|
| `lookup` | RelationPicker | Search + select related record |
| `master_detail` | NestedList | Inline related records |
| `tree` | TreePicker | Hierarchical selection |

### Media Fields

| Field Type | Widget | Features |
|-----------|--------|----------|
| `image` | ImagePicker | Camera + gallery, preview |
| `file` | FileField | Document picker, upload progress |
| `avatar` | AvatarPicker | Circular crop |
| `video` | VideoPicker | Video capture + upload |
| `audio` | AudioRecorder | Voice recording |

### Special Fields

| Field Type | Widget | Features |
|-----------|--------|----------|
| `formula` | ReadOnlyDisplay | Computed value |
| `summary` | ReadOnlyDisplay | Aggregated value |
| `autonumber` | ReadOnlyDisplay | Auto-incrementing |
| `location` / `address` | LocationPicker | Map + address search |
| `code` / `json` | CodeEditor | Syntax highlighting |
| `signature` | SignaturePad | Touch drawing |
| `qrcode` | QRDisplay / Scanner | Generate + scan |
| `vector` | ReadOnlyDisplay | Embedding display |

---

## Action System

### Action Types

| Type | Trigger | Example |
|------|---------|---------|
| `url` | Open URL | External link |
| `script` | Execute client script | Validation logic |
| `api` | Call server API | Status update |
| `modal` | Open modal dialog | Confirmation |
| `flow` | Trigger automation | Workflow start |

### Action Locations

Actions are placed based on their `locations` metadata:

| Location | UI Element |
|----------|-----------|
| `list_toolbar` | List view header bar |
| `list_item` | Swipe action on list rows |
| `record_header` | Detail view action bar |
| `record_more` | Detail view overflow menu (⋮) |
| `record_related` | Related section actions |
| `global_nav` | Floating action button (FAB) |

### Action Components

| Component | File | Usage |
|-----------|------|-------|
| `ActionBar` | `actions/ActionBar.tsx` | Horizontal action button row |
| `ActionExecutor` | `actions/ActionExecutor.ts` | Action dispatch and execution logic |
| `FloatingActionButton` | `actions/FloatingActionButton.tsx` | FAB for primary create action |

---

## Common Components

### EmptyState

Displayed when a list or view has no data:

```
        ┌───────────────┐
        │   🔍 / 📋     │
        │               │
        │  No records   │
        │  found        │
        │               │
        │  [Create New] │
        └───────────────┘
```

### ErrorBoundary

Catches rendering errors and shows a recovery UI:

```
        ┌───────────────┐
        │    ⚠️          │
        │               │
        │  Something    │
        │  went wrong   │
        │               │
        │  [Try Again]  │
        └───────────────┘
```

### LoadingScreen

Full-screen loading indicator with brand animation.

### SearchBar

```
┌─────────────────────────────────┐
│  🔍  Search records...    [×]   │
└─────────────────────────────────┘
```

### OfflineIndicator

```
┌─────────────────────────────────┐
│  ⚡ You are offline · 3 pending │
└─────────────────────────────────┘
```

### PullToRefresh

Standard pull-to-refresh gesture with animated indicator.

### InfiniteScrollList

Virtualized list with automatic page loading on scroll end.

---

## Interaction Patterns

### Gestures

| Gesture | Context | Action |
|---------|---------|--------|
| **Tap** | List row | Navigate to detail |
| **Long press** | List row | Enter selection mode |
| **Swipe left** | List row | Delete action |
| **Swipe right** | List row | Edit action |
| **Pull down** | List / detail | Refresh data |
| **Swipe horizontal** | Detail view | Navigate previous/next |

### Haptic Feedback

Via `expo-haptics`:
- **Selection**: When selecting/deselecting rows
- **Impact (light)**: When tapping action buttons
- **Notification (success)**: On successful save/delete
- **Notification (error)**: On validation errors

### Loading States

| State | UI |
|-------|-----|
| **Initial load** | Skeleton placeholders |
| **Refresh** | Pull-to-refresh spinner |
| **Pagination** | Bottom spinner |
| **Action** | Button loading state |
| **Save** | Full-screen overlay with progress |

### Error States

| Error | UI |
|-------|-----|
| **Network** | Offline banner + cached data |
| **Not found** | Empty state with message |
| **Unauthorized** | Redirect to sign-in |
| **Validation** | Inline field errors |
| **Server error** | Toast notification |

---

## Responsive Design

### Breakpoints

The app adapts to different screen sizes via `useWindowDimensions`:

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| **Phone** | < 768px | Single column, stacked layout |
| **Tablet** | ≥ 768px | Multi-column, side-by-side panels |

### Dashboard Grid

Dashboard widgets use responsive column spans:

```typescript
// DashboardViewRenderer.tsx
const numColumns = width >= 768 ? 4 : 2;
// Widget span (1-4 columns, clamped to numColumns)
```

### Form Layout

Forms adapt column count based on screen width:

```
Phone (< 768px):    1 column  → fields stack vertically
Tablet (≥ 768px):   2 columns → fields side-by-side
```

---

## Accessibility

### Target Guidelines

- WCAG 2.1 Level AA compliance
- Minimum touch target: 44×44 points
- Color contrast ratio: ≥ 4.5:1 for text, ≥ 3:1 for large text

### Implementation

| Feature | Status | Implementation |
|---------|--------|---------------|
| Screen reader | ✅ | `accessibilityLabel` on all interactive elements |
| Touch targets | ✅ | Minimum 44×44pt hit areas |
| Color contrast | ✅ | Design tokens meet WCAG AA |
| Focus order | ✅ | Logical tab order in forms |
| Error announcements | ✅ | `accessibilityRole="alert"` for validation errors |
| Reduce motion | Planned | Respect `prefers-reduced-motion` |
| Dynamic type | Planned | Support system font scaling |

---

## Dark Mode

### Implementation

Dark mode is controlled by `useUIStore`:

```typescript
const { theme } = useUIStore();
// theme: "light" | "dark" | "system"
```

When set to `"system"`, the app follows the device's appearance setting.

### Token Mapping

All design tokens have dark mode variants defined in `global.css`:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --muted: 217.2 32.6% 17.5%;
  /* ... */
}
```

### Guidelines

- Never use hardcoded colors — always use design tokens
- Test all views in both light and dark modes
- Ensure sufficient contrast in both modes
- Use `bg-background` / `text-foreground` rather than `bg-white` / `text-black`

---

*This document defines the UI/UX design specification as of Phase 0–3 implementation. See [ARCHITECTURE.md](./ARCHITECTURE.md) for technical architecture and [ROADMAP.md](../ROADMAP.md) for planned enhancements.*

# ObjectStack Mobile — UX Design Review & Improvement Plan

> **Date**: 2026-02-12
> **Reviewer**: Enterprise Mobile Design Expert
> **Scope**: Full repository audit — all pages, components, hooks, and UX patterns
> **Benchmark**: Salesforce Mobile, ServiceNow Mobile, Microsoft Dynamics 365, HubSpot, Monday.com, Notion, Linear, Figma

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Industry Benchmark Analysis](#2-industry-benchmark-analysis)
3. [Current State Assessment](#3-current-state-assessment)
4. [Page-by-Page UX Evaluation](#4-page-by-page-ux-evaluation)
5. [Component-Level UX Analysis](#5-component-level-ux-analysis)
6. [Missing UX Patterns](#6-missing-ux-patterns)
7. [Design Improvement Specifications](#7-design-improvement-specifications)
8. [Accessibility & Internationalization](#8-accessibility--internationalization)
9. [Performance UX](#9-performance-ux)
10. [UX Metrics & Success Criteria](#10-ux-metrics--success-criteria)

---

## 1. Executive Summary

### Overall Assessment: ★★★☆☆ (3.2/5)

ObjectStack Mobile has a **solid engineering foundation** — 34 hooks, 16 renderers, 605 tests, full offline support, and spec v3.0.0 compliance. However, from a **pure UX perspective**, the app currently feels like a **developer prototype** rather than a **production enterprise app**. The gap is not in functionality but in **polish, flow, delight, and user confidence**.

### Key Strengths

| Area | Rating | Notes |
|------|--------|-------|
| Architecture | ★★★★★ | Metadata-driven, offline-first, layered |
| Feature Coverage | ★★★★★ | 34 hooks cover all spec modules |
| Test Coverage | ★★★★☆ | 605 tests, ~85% coverage |
| Accessibility Foundation | ★★★☆☆ | ARIA props present, but inconsistent |
| Visual Design | ★★☆☆☆ | Functional but lacks polish and brand identity |
| Interaction Design | ★★☆☆☆ | Basic tap/scroll; missing gestures, transitions, haptics |
| User Onboarding | ★☆☆☆☆ | No onboarding flow exists |
| Error Recovery | ★★★☆☆ | Retry buttons present; no contextual guidance |
| Navigation Efficiency | ★★☆☆☆ | Deep nesting; no shortcuts, no quick actions |

### Critical UX Gaps (vs. Top-Tier Apps)

1. **No onboarding experience** — Users land on a server URL screen with no context
2. **No global search** — Enterprise users need to find anything from anywhere
3. **No quick actions / shortcuts** — Salesforce & HubSpot have prominent quick-create FABs
4. **Static home dashboard** — No personalization, no recent items, no favorites
5. **No micro-interactions** — No animations, transitions, or haptic feedback loops
6. **Profile page is a placeholder** — Only shows name + stub buttons
7. **No skeleton loading** — Spinner-only loading creates perceived slowness
8. **No pull-to-refresh on key screens** — Missing on home, apps, notifications
9. **No contextual empty states** — Generic "no data" messages instead of actionable guidance
10. **No record quick-peek** — Must navigate to full page for any record detail

---

## 2. Industry Benchmark Analysis

### 2.1 Salesforce Mobile (Enterprise CRM — Gold Standard)

| Feature | Salesforce | ObjectStack Mobile | Gap |
|---------|-----------|-------------------|-----|
| Smart Home Feed | Personalized feed with recent, pinned, and suggested | Static 4-card dashboard | 🔴 Critical |
| Global Search | Universal search across all objects with type filters | No global search | 🔴 Critical |
| Quick Actions | Floating action button + contextual quick-create | None | 🔴 Critical |
| Record Quick-Peek | Long-press preview without navigating | None | 🟡 Important |
| Favorites / Pinned | Pin any record, dashboard, or report | None | 🟡 Important |
| Recent Items | Always-accessible recent records list | None | 🟡 Important |
| Voice Search / Commands | Siri/Google Assistant integration | None | 🟢 Future |
| Offline Indicator | Subtle but persistent status bar | Banner only on sync page | 🟡 Important |
| Navigation | Tab bar + side drawer + breadcrumbs | Tab bar only | 🟡 Important |

### 2.2 Microsoft Dynamics 365

| Feature | Dynamics 365 | ObjectStack Mobile | Gap |
|---------|-------------|-------------------|-----|
| Activity Timeline | Unified timeline on all records | Audit log exists but not on detail views | 🟡 Important |
| Relationship Assistant | AI-suggested actions per record | AI hooks exist, no UI integration | 🟡 Important |
| Quick Notes | Inline note creation on any record | None | 🟡 Important |
| Business Card Scanner | AI-powered contact creation | None | 🟢 Future |
| Dashboard Drill-Down | Tap chart → filtered list | Dashboard widgets are static | 🔴 Critical |

### 2.3 HubSpot Mobile

| Feature | HubSpot | ObjectStack Mobile | Gap |
|---------|---------|-------------------|-----|
| Activity Feed | Chronological feed of all user activity | None | 🔴 Critical |
| Contact Card | Rich preview with actions (call, email, note) | Basic detail view | 🟡 Important |
| Task Management | Inline task creation and completion | No task model | 🟢 Future |
| Calling / Logging | Built-in call logging | Not applicable | 🟢 Future |
| Deal Pipeline | Interactive pipeline with drag | Kanban exists but no drag | 🟡 Important |

### 2.4 Notion / Linear (Modern UX Benchmarks)

| Feature | Notion / Linear | ObjectStack Mobile | Gap |
|---------|----------------|-------------------|-----|
| Command Palette (⌘K) | Universal command/search | None | 🔴 Critical |
| Smooth Animations | Spring-based transitions everywhere | None | 🔴 Critical |
| Inline Editing | Edit fields directly in list/detail views | Navigate to separate form | 🟡 Important |
| Breadcrumb Navigation | Always visible hierarchy | Screen title only | 🟡 Important |
| Undo / Redo | Snackbar with undo action | None | 🟡 Important |
| Theme Customization | User-selectable themes/accents | Dark/light only | 🟢 Future |

---

## 3. Current State Assessment

### 3.1 Navigation Architecture

**Current**: 3-level deep routing: `(tabs)` → `(app)/[appName]` → `[objectName]/[id]`

**Issues**:
- **5+ taps to reach a record** from home (Home → Apps → App → Object → Record)
- No shortcuts to frequently accessed records
- No breadcrumb trail — users lose context of where they are
- Back button is the only way to navigate up
- No swipe-back gesture feedback on Android

**Industry Standard** (Salesforce, Dynamics):
- 2-3 taps max to any record via recent items / search
- Persistent navigation drawer with favorites
- Breadcrumb-style headers

### 3.2 Information Architecture

**Current Tab Structure**:
```
Home (static dashboard) | Apps (app list) | Notifications | Profile
```

**Issues**:
- **Home** has hardcoded 4 KPI cards — not useful for most users
- **Apps** is a flat list with no categorization or search
- **Profile** is mostly placeholder — wastes a valuable tab slot
- No **Recent Items** or **Favorites** — the two most important features in enterprise mobile

**Recommended Tab Structure** (based on Salesforce/Dynamics pattern):
```
Home (feed + recent) | Search | Apps/Objects | Notifications | More (profile + settings)
```

### 3.3 Visual Design Tokens

**Current**:
- Uses CSS variables in `global.css` with sensible light/dark palettes
- NativeWind v4 for styling — excellent choice
- Blue-800 (`#1e40af`) primary — professional but cold

**Issues**:
- No elevation/shadow system — cards feel flat
- No border-radius tokens — inconsistent rounding across components
- No spacing scale documentation — mixing arbitrary values
- Primary color has no semantic variants (success, warning, info)
- No branded gradient or accent color for visual identity

### 3.4 Interaction Design

**Haptic Feedback**: Only on Button press — should extend to:
- Toggle switches, checkboxes
- Swipe actions
- Pull-to-refresh completion
- Success/error states
- Navigation transitions

**Animations**: Almost none across the app:
- No page transition animations
- No list item entrance animations
- No skeleton → content transitions
- No micro-interactions on state changes

**Gestures**:
- Swipe-to-delete on list items ✅
- Pull-to-refresh ✅ (component exists, not used on all screens)
- Long-press for quick actions ❌
- Swipe between records ❌
- Pinch-to-zoom on images ❌

---

## 4. Page-by-Page UX Evaluation

### 4.1 Server Configuration (`(auth)/server-config.tsx`)

**Rating**: ★★☆☆☆

**Current**: Large icon + heading + single URL input + Connect button

**Issues**:
- First screen a user sees — creates confusion ("What is a server URL?")
- No visual branding or welcome message
- No list of recent/saved servers
- No QR code scanning option (common in enterprise onboarding)
- No help link or documentation pointer
- Activity indicator blocks UI during connection test

**Recommendations**:
1. Add branded welcome screen before server config
2. Support QR code scanning for server URL (common in MDM deployments)
3. Show saved/recent server URLs as selectable cards
4. Add inline help text explaining what a server URL is
5. Use non-blocking connectivity check with progress feedback
6. Add "Demo Server" option for trial users

### 4.2 Sign In (`(auth)/sign-in.tsx`)

**Rating**: ★★★☆☆

**Current**: Email + password fields + social login buttons

**Issues**:
- No "Remember me" checkbox
- No "Forgot password?" link
- Password visibility toggle missing
- Social login buttons have no loading states individually
- No biometric quick-login for returning users
- Form doesn't handle keyboard return-key flow (email → password → submit)
- No input validation feedback until submission

**Recommendations**:
1. Add password visibility toggle (eye icon)
2. Add "Forgot Password?" link
3. Add biometric authentication for returning users (Face ID / fingerprint)
4. Implement field-level validation with real-time feedback
5. Use `returnKeyType="next"` on email to auto-focus password
6. Add "Remember me" toggle
7. Show individual loading states on social buttons

### 4.3 Sign Up (`(auth)/sign-up.tsx`)

**Rating**: ★★★☆☆

**Current**: Name + email + password + social login

**Issues**:
- Same issues as Sign In plus:
- No password strength indicator
- No confirm password field
- No terms of service / privacy policy checkbox
- Minimum 8 characters hint is text-only, not visual

**Recommendations**:
1. Add animated password strength meter (weak → strong)
2. Add Terms of Service / Privacy Policy agreement checkbox
3. Consider split-step registration (email first → verify → complete profile)
4. Add password requirements checklist (length, uppercase, number, special)

### 4.4 Home Dashboard (`(tabs)/index.tsx`)

**Rating**: ★★☆☆☆ — **Most Critical Gap**

**Current**: 4 hardcoded KPI cards (Sales, Users, Orders, Revenue)

**Issues**:
- Static/hardcoded data — doesn't reflect actual user data
- No personalization — same view for all users
- No recent items — the #1 most-used feature in enterprise mobile
- No favorites/pinned items
- No activity feed
- No AI suggestions or quick actions
- No greeting or user context
- Cards are not interactive (no drill-down)
- No refresh mechanism

**Recommendations** (High Priority — Redesign):
1. **Greeting section**: "Good morning, {name}" with date
2. **Recent Items**: Last 10 accessed records with quick navigation
3. **Favorites/Pinned**: User-pinned records and dashboards
4. **Quick Actions**: Prominent FAB or action row (New Record, Search, Scan)
5. **Activity Feed**: Recent changes relevant to the user
6. **AI Suggestions**: Based on user patterns ("Follow up with {contact}")
7. **Dynamic KPI Cards**: Server-driven, based on user role and permissions
8. **Pull-to-refresh** for the entire screen

### 4.5 Apps Listing (`(tabs)/apps.tsx`)

**Rating**: ★★★☆☆

**Current**: Scrollable list of app cards with icon, name, and description

**Issues**:
- No search/filter for apps
- No categorization or grouping
- No app usage frequency sorting
- No "pinned" or "favorite" apps
- App icons are emoji-only — no real app icons
- No badge indicators (e.g., "3 pending tasks")

**Recommendations**:
1. Add search bar at top
2. Group apps by category (CRM, HR, Finance, etc.)
3. Show "Recent" and "All" tabs
4. Add pin/favorite capability
5. Show notification badges per app
6. Support grid/list view toggle
7. Add app-specific quick actions on long-press

### 4.6 Notifications (`(tabs)/notifications.tsx`)

**Rating**: ★★★☆☆

**Current**: List of notifications with read/unread state, mark as read, and navigation

**Issues**:
- No categorization (all notifications in one flat list)
- No notification grouping (e.g., by record, by type)
- No inline actions (approve, reject, reply)
- No swipe-to-dismiss or swipe-to-archive
- No notification preferences/settings
- No push notification integration shown
- Timestamp format is raw — should be relative ("2 hours ago")

**Recommendations**:
1. Group notifications by category (Mentions, Assignments, Approvals, System)
2. Add swipe actions (archive, mark read/unread)
3. Add inline action buttons for actionable notifications (approve/reject)
4. Show relative timestamps ("2h ago", "Yesterday")
5. Add filter tabs (All, Unread, Mentions, Approvals)
6. Add notification settings link

### 4.7 Profile (`(tabs)/profile.tsx`)

**Rating**: ★☆☆☆☆ — **Needs Complete Redesign**

**Current**: Avatar + name/email + 4 placeholder buttons (Edit Profile, Settings, Help, Sign Out)

**Issues**:
- Buttons are placeholders — tap does nothing
- No actual profile editing
- No settings screen (theme, language, notifications, security)
- No help/support integration
- Wasted tab space for a mostly non-functional screen
- No account info (role, organization, last login)

**Recommendations** (Complete Redesign):
1. Move to "More" tab with sections:
   - **Account**: Profile info, edit profile, change password
   - **Preferences**: Theme, language, notification settings, display density
   - **Security**: Biometric lock, session management, connected devices
   - **App Info**: Version, server, cache management, diagnostic tools
   - **Support**: Help docs, contact support, report a bug
   - **Sign Out**: Destructive action at bottom

### 4.8 App Home (`(app)/[appName]/index.tsx`)

**Rating**: ★★★☆☆

**Current**: List of objects/entities within an app

**Issues**:
- No app-level dashboard or overview
- No recent records per app
- No search within app
- Object cards lack usage context (record count, last modified)
- No grouping of objects (primary, related, settings)

**Recommendations**:
1. Add app-level overview with record counts
2. Show "Recently Viewed" records for each object
3. Add search bar for quick object/record finding
4. Show record counts on each object card
5. Group objects: Primary (accounts, contacts), Related (activities, notes), Settings

### 4.9 Object List View (`(app)/[appName]/[objectName]/index.tsx`)

**Rating**: ★★★★☆ — **Best Implemented Screen**

**Current**: Full ListViewRenderer with search, filter, sort, swipe actions, batch selection

**Issues**:
- No saved view tabs shown by default
- Inline editing not supported
- No column customization
- No "Recently Viewed" section above list
- List item preview is minimal (could show more fields)
- No record count indicator

**Recommendations**:
1. Show saved view tabs below header
2. Add record count badge ("247 contacts")
3. Support compact/comfortable/spacious density toggle
4. Add inline field editing for quick updates
5. Show "Recently Viewed" as a collapsible section above list
6. Add sort indicator in header

### 4.10 Record Detail (`(app)/[appName]/[objectName]/[id].tsx`)

**Rating**: ★★★☆☆

**Current**: DetailViewRenderer with prev/next navigation, edit/delete actions

**Issues**:
- No activity timeline on record
- No related records section
- No quick actions (call, email, log activity)
- No field-level editing (must navigate to full edit form)
- No sharing/collaboration indicators
- No "Last Modified" / audit info

**Recommendations**:
1. Add tabbed layout: Details | Activity | Related | Files
2. Add inline field editing (tap field → edit in place)
3. Show related records with counts
4. Add activity timeline (from `useAuditLog`)
5. Show collaboration indicators (from `useCollaboration`)
6. Add contextual actions (call, email, map for relevant field types)
7. Add sharing button (from `useSharing`)

### 4.11 Create/Edit Record (`new.tsx` / `edit.tsx`)

**Rating**: ★★★☆☆

**Current**: FormViewRenderer with validation and submit/cancel

**Issues**:
- No auto-save / draft functionality
- No progress indicator for multi-section forms
- No field-level help text
- No dependent field cascading (city → state → country)
- No smart defaults from AI
- Keyboard handling could be smoother

**Recommendations**:
1. Add auto-save draft functionality
2. Add form progress indicator for multi-section forms
3. Add field-level context help (info icon → tooltip)
4. Support dependent/cascading picklists
5. Add "Discard Changes?" confirmation on back navigation
6. Add AI-suggested field values

### 4.12 Dashboard View (`dashboard/[dashboardName].tsx`)

**Rating**: ★★☆☆☆

**Current**: DashboardViewRenderer with static widgets

**Issues**:
- Widgets are not interactive (no drill-down)
- No date range picker
- No dashboard customization
- No full-screen widget view
- No refresh capability

**Recommendations**:
1. Add widget tap → filtered list drill-down
2. Add date range selector (today, this week, this month, custom)
3. Add widget expand/fullscreen mode
4. Add pull-to-refresh
5. Support dashboard sharing

### 4.13 Package Management (`packages.tsx`)

**Rating**: ★★★☆☆

**Current**: Package list with toggle/uninstall

**Issues**:
- No package detail view
- No package search or categories
- No version info or changelog
- No install new packages capability from UI

**Recommendations**:
1. Add package detail screen with description, version, changelog
2. Add package marketplace/search for new installs
3. Show package dependencies and conflicts

### 4.14 SDUI Page (`page/[id].tsx`)

**Rating**: ★★★★☆

**Current**: PageRenderer with server-driven components

**Issues**:
- Loading state is generic spinner
- Error messages are not user-friendly

**Recommendations**:
1. Add skeleton loading matching expected page layout
2. Add more descriptive error states with retry

---

## 5. Component-Level UX Analysis

### 5.1 UI Primitives

| Component | Rating | Key Issues | Recommendations |
|-----------|--------|-----------|-----------------|
| **Button** | ★★★★☆ | Good — has haptics, variants | Add loading state spinner, icon support |
| **Input** | ★★★☆☆ | No label, no error state, no icon | Add floating label, error text, prefix/suffix icon |
| **Card** | ★★★★☆ | Good composition | Add pressable variant, elevation on hover |
| **Dialog** | ★★★☆☆ | Basic modal | Add action sheet variant, slide-up animation |
| **Select** | ★★★☆☆ | Modal picker works | Add search for long lists, multi-select |
| **BottomSheet** | ★★★☆☆ | Functional | Add snap points, drag indicator, velocity-based dismiss |
| **Toast** | ★★★★☆ | Good — auto-dismiss, variants | Add action button (undo), swipe to dismiss |
| **Skeleton** | ★★★☆☆ | Pulse animation | Add content-shaped variants (text, avatar, card) |
| **Avatar** | ★★★★☆ | Good with fallback | Add status indicator (online/offline), size: xs |
| **Badge** | ★★★★☆ | Clean variants | Add dot variant, animated count |
| **Checkbox** | ★★★☆☆ | Animated checkmark | Add indeterminate state, label support |
| **Switch** | ★★★☆☆ | Animated | Add label, description, disabled state |
| **Tabs** | ★★★☆☆ | Functional | Add animated underline, swipe between tabs, badge support |

### 5.2 Renderers

| Renderer | Rating | Key Issues |
|----------|--------|-----------|
| **ListViewRenderer** | ★★★★☆ | Best renderer — search, filter, swipe, batch. Missing: inline edit, density toggle |
| **FormViewRenderer** | ★★★☆☆ | Functional. Missing: auto-save, progress indicator, smart defaults |
| **DetailViewRenderer** | ★★★☆☆ | Basic display. Missing: tabs, inline edit, activity, related records |
| **DashboardViewRenderer** | ★★☆☆☆ | Static widgets. Missing: drill-down, date range, fullscreen, customization |
| **KanbanViewRenderer** | ★★★☆☆ | Columns work. Missing: drag-and-drop, card previews, swimlanes |
| **CalendarViewRenderer** | ★★★☆☆ | Month view works. Missing: week/day views, drag to reschedule, event creation |
| **ChartViewRenderer** | ★★★☆☆ | Custom native charts. Missing: tap interactions, drill-down, animations |
| **TimelineViewRenderer** | ★★★★☆ | Good visual design. Missing: load more, expandable entries |
| **MapViewRenderer** | ★☆☆☆☆ | Not a real map — just a list. Need react-native-maps integration |
| **ReportRenderer** | ★★★☆☆ | Multiple formats. Missing: export, column resize, sticky headers |
| **PageRenderer** | ★★★★☆ | SDUI works well. Missing: animation, lazy loading of regions |

### 5.3 Common Components

| Component | Rating | Key Issues |
|-----------|--------|-----------|
| **EmptyState** | ★★★☆☆ | Generic. Need contextual messages and primary action buttons |
| **ErrorBoundary** | ★★★☆☆ | Functional. Add error reporting and contextual recovery |
| **SearchBar** | ★★★☆☆ | Basic debounced. Add search suggestions, recent searches |
| **LoadingScreen** | ★★☆☆☆ | Spinner only. Replace with skeleton + branded animation |
| **OfflineIndicator** | ★★★☆☆ | Banner works. Make more subtle (like Salesforce) |
| **PullToRefresh** | ★★★★☆ | Good. Use on all scrollable screens |
| **InfiniteScrollList** | ★★★★☆ | Good generic. Add scroll-to-top button |
| **CachedImage** | ★★★★☆ | Excellent with blurhash. Good as-is |
| **LanguageSelector** | ★★★☆☆ | Basic. Add language preview, RTL toggle |

### 5.4 Specialized Components

| Component | Rating | Notes |
|-----------|--------|-------|
| **AgentProgress** | ★★★☆☆ | Functional. Add step-by-step visual, elapsed time |
| **CollaborationOverlay** | ★★★☆☆ | Cursor tracking works. Add user list panel |
| **CollaborationIndicator** | ★★★★☆ | Clean avatar stack with status |
| **FlowViewer** | ★★★☆☆ | Read-only. Add zoom/pan, step highlighting |
| **StateMachineViewer** | ★★★☆☆ | Badge layout. Add visual diagram with arrows |
| **WorkflowStatePanel** | ★★★★☆ | Good with transitions and history |
| **QueryBuilder** | ★★★☆☆ | AND/OR toggle. Add condition templates, saved filters |
| **FilterRow** | ★★★☆☆ | Functional. Add field-specific value pickers |
| **GlobalSearch** | ★★☆☆☆ | Input only. Need full search experience with results |
| **BatchActionBar** | ★★★☆☆ | Bottom bar. Add confirmation, undo |
| **BatchProgressIndicator** | ★★★★☆ | Good progress display |
| **SaveViewDialog** | ★★★☆☆ | Basic. Add view preview |
| **ViewTabs** | ★★★☆☆ | Horizontal scroll. Add badge counts per view |
| **ConflictResolutionDialog** | ★★★☆☆ | Per-conflict actions. Add diff viewer |

---

## 6. Missing UX Patterns

### 6.1 Critical Missing Patterns (Must-Have for v1.0)

#### 6.1.1 Global Search / Command Palette

**Reference**: Salesforce Global Search, Notion ⌘K, Linear ⌘K

Every top-tier enterprise app has a universal search accessible from any screen.

**Specification**:
- Accessible from all screens via search icon in header or dedicated tab
- Search across all objects, records, dashboards, reports, pages
- Show recent searches and trending items
- Type-ahead suggestions with object type indicators
- Result grouping by object type with counts
- Deep link to any result

#### 6.1.2 Recent Items

**Reference**: Salesforce Recent Items, Dynamics 365 Recent

The most-used feature in enterprise mobile — users need to quickly re-access records they've been working on.

**Specification**:
- Track last 50 accessed records across all objects
- Show on Home screen as primary content
- Persist across sessions (local storage)
- Show object type icon, record name, and last access time
- Quick actions on long-press (edit, delete, share)

#### 6.1.3 Quick Actions / FAB

**Reference**: HubSpot Quick Create, Salesforce Global Actions

**Specification**:
- Floating Action Button on home and list screens
- Expand to show: New Record (per object), Quick Search, Scan QR
- Context-aware: show relevant object types based on current app
- Haptic feedback on expand/collapse

#### 6.1.4 Skeleton Loading

**Reference**: All modern apps (LinkedIn, Facebook, Notion)

Replace all `ActivityIndicator` spinners with content-shaped skeletons.

**Specification**:
- List skeleton: 5-8 rows with avatar + text blocks
- Detail skeleton: Header + field rows
- Dashboard skeleton: Card grid placeholders
- Form skeleton: Label + input block rows
- Use existing `Skeleton` component with shaped variants

#### 6.1.5 Page Transition Animations

**Reference**: iOS native transitions, Notion smooth page transitions

**Specification**:
- Stack navigation: slide-from-right with parallax
- Modal presentation: slide-up with backdrop
- Tab switching: cross-fade
- List item → detail: shared element transition (hero animation)
- Use `react-native-reanimated` (already in deps)

### 6.2 Important Missing Patterns (Should-Have for v1.1)

#### 6.2.1 Inline Field Editing

**Reference**: Salesforce inline edit, Monday.com cell editing

Allow users to tap a field on detail view and edit it in place without navigating to a full form.

#### 6.2.2 Record Activity Timeline

**Reference**: Salesforce Activity Timeline, Dynamics 365 Timeline

Show a chronological activity feed on every record detail, using the existing `useAuditLog` hook.

#### 6.2.3 Undo/Redo with Snackbar

**Reference**: Gmail undo send, Notion undo

After destructive actions (delete, status change), show a snackbar with undo option for 5 seconds.

#### 6.2.4 Contextual Record Actions

**Reference**: HubSpot contact card, Salesforce record actions

On record detail, show action buttons based on field types:
- Phone field → Call button
- Email field → Compose email
- Address field → Open in maps
- URL field → Open in browser

#### 6.2.5 Swipe Between Records

**Reference**: Email apps (Mail, Outlook, Gmail)

On record detail view, allow horizontal swipe to navigate to previous/next record.

#### 6.2.6 User Onboarding

**Reference**: Notion onboarding, Linear onboarding

First-time user experience:
1. Welcome screen with product value proposition
2. Quick tour of main features (3-4 screens)
3. Optional: connect to server, sign in
4. Contextual tooltips on first use of each feature

### 6.3 Nice-to-Have Patterns (v1.2+)

#### 6.3.1 Drag-and-Drop on Kanban
#### 6.3.2 Calendar Week/Day Views with Event Creation
#### 6.3.3 Map View with Native Maps
#### 6.3.4 Widget Kit / Home Screen Widgets
#### 6.3.5 Siri Shortcuts / Google Assistant Integration
#### 6.3.6 Apple Watch Companion
#### 6.3.7 Voice Input for Search and Notes
#### 6.3.8 Smart Notifications (Grouped, with inline actions)

---

## 7. Design Improvement Specifications

### 7.1 Home Screen Redesign

```
┌─────────────────────────────────────┐
│  Good morning, John          🔔 ⚙️  │
│  Tuesday, February 12, 2026         │
├─────────────────────────────────────┤
│  🔍 Search records, apps, people... │
├─────────────────────────────────────┤
│  ⭐ FAVORITES                [Edit] │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │Acme  │ │Q1 Rpt│ │Deal ▸│        │
│  │Corp  │ │      │ │Board │        │
│  └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────┤
│  🕒 RECENT                   [All] │
│  ┌─ 🔵 Acme Corporation ──── 2m ─┐ │
│  │  Account · Modified by you     │ │
│  ├─ 🟢 Sarah Johnson ───── 15m ─┤ │
│  │  Contact · Viewed              │ │
│  ├─ 🔴 Deal #1042 ──────── 1h ──┤ │
│  │  Opportunity · Stage changed   │ │
│  └────────────────────────────────┘ │
├─────────────────────────────────────┤
│  📊 TODAY'S METRICS (server-driven) │
│  ┌───────────┐ ┌───────────┐       │
│  │ 24 Tasks  │ │ $125K Rev │       │
│  │ ↑ 12%     │ │ ↑ 8%      │       │
│  └───────────┘ └───────────┘       │
├─────────────────────────────────────┤
│  🤖 AI SUGGESTIONS                  │
│  "Follow up with Acme Corp — no    │
│   activity in 3 days"        [→]   │
└─────────────────────────────────────┘
     🏠      🔍      📱      🔔     ⋯
     Home   Search   Apps   Notif   More
```

### 7.2 Navigation Redesign

**New Tab Bar** (5 tabs):

| Tab | Icon | Content |
|-----|------|---------|
| Home | `Home` | Personalized feed (favorites, recent, metrics, AI suggestions) |
| Search | `Search` | Global search across all objects and records |
| Apps | `LayoutGrid` | App listing with categories and favorites |
| Notifications | `Bell` | Categorized notifications with inline actions |
| More | `Menu` | Profile, Settings, Security, Support, Sign Out |

### 7.3 Detail View Redesign

```
┌─────────────────────────────────────┐
│  ← Acme Corporation       ⋯  ✏️  🗑 │
├─────────────────────────────────────┤
│  [Details] [Activity] [Related] [Files]│
├─────────────────────────────────────┤
│  DETAILS TAB:                        │
│                                      │
│  Name            Acme Corporation  ✎ │
│  Industry        Technology        ✎ │
│  Website         acme.com         🔗 │
│  Phone           +1 555-0100      📞 │
│  Email           info@acme.com    ✉️ │
│  Address         123 Main St      🗺️ │
│  ──────────────────────────────────  │
│  Owner           John Smith          │
│  Created         Feb 10, 2026        │
│  Modified        2 hours ago         │
│                                      │
│  ACTIVITY TAB:                       │
│  ○ Email sent to Sarah   2h ago      │
│  ○ Stage changed → Negotiation  1d   │
│  ○ Note added by John    2d ago      │
│                                      │
│  RELATED TAB:                        │
│  📋 Contacts (3)        [View All]   │
│  📋 Opportunities (2)   [View All]   │
│  📋 Activities (12)     [View All]   │
├─────────────────────────────────────┤
│              [+ Quick Action]    (FAB)│
└─────────────────────────────────────┘
```

### 7.4 Loading States Redesign

**Before** (current):
```
┌──────────────────────┐
│                      │
│      ⟳ Loading...    │
│                      │
└──────────────────────┘
```

**After** (skeleton):
```
┌──────────────────────┐
│  ░░░░░░░░░░  ░░░░░░ │
│  ████████████████░░░ │
│  ████████████░░░░░░░ │
│  ──────────────────  │
│  ░░░░░░░░░░  ░░░░░░ │
│  ████████████████░░░ │
│  ████████████░░░░░░░ │
│  ──────────────────  │
│  ░░░░░░░░░░  ░░░░░░ │
│  ████████████████░░░ │
└──────────────────────┘
```

### 7.5 Enhanced Design Tokens

```css
/* Additions to global.css */
:root {
  /* Semantic colors */
  --color-success: 34 197 94;         /* green-500 */
  --color-success-foreground: 255 255 255;
  --color-warning: 234 179 8;         /* yellow-500 */
  --color-warning-foreground: 255 255 255;
  --color-info: 59 130 246;           /* blue-500 */
  --color-info-foreground: 255 255 255;

  /* Elevation system */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);

  /* Spacing scale (4px base) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Typography scale */
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 17px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
}
```

---

## 8. Accessibility & Internationalization

### 8.1 Current Accessibility State

**Implemented**:
- ✅ `accessibilityLabel` on Phase 11-13 components
- ✅ `accessibilityRole` on buttons and inputs
- ✅ `accessibilityState` for disabled/checked states
- ✅ WCAG contrast guidelines in design tokens

**Gaps**:
- ❌ No `accessibilityHint` on most interactive elements
- ❌ No focus management on navigation
- ❌ No screen reader announcements for state changes (live regions)
- ❌ No reduced motion support
- ❌ No dynamic type / text scaling support
- ❌ No high contrast mode
- ❌ Keyboard navigation not tested
- ❌ No accessibility testing in CI

### 8.2 Accessibility Recommendations

1. **Live Regions**: Announce loading, success, error states to screen readers
2. **Focus Management**: Auto-focus first field on form open, return focus on modal close
3. **Reduced Motion**: Respect `prefers-reduced-motion` for all animations
4. **Dynamic Type**: Support iOS Dynamic Type and Android text scaling
5. **Color Independence**: Never use color alone to convey information
6. **Touch Targets**: Minimum 44×44pt touch targets (check all interactive elements)
7. **CI Testing**: Add `jest-axe` or equivalent for automated accessibility testing

### 8.3 Internationalization State

**Implemented**:
- ✅ i18next with 3 languages (en, zh, ar)
- ✅ RTL layout support detection
- ✅ Locale-aware date/number formatting
- ✅ Language selector component
- ✅ Server-side translations hook

**Gaps**:
- ❌ RTL layout testing not comprehensive
- ❌ No language auto-detection from device locale
- ❌ Date/time pickers not localized
- ❌ No pluralization rules tested
- ❌ Some hardcoded English strings in components

---

## 9. Performance UX

### 9.1 Perceived Performance Recommendations

| Pattern | Current | Target | Impact |
|---------|---------|--------|--------|
| Initial load | Spinner | Splash → Skeleton | High |
| List scrolling | Basic FlatList | FlashList with estimated sizes | Medium |
| Image loading | Spinner → Image | Blurhash → Image (already in CachedImage) | Done ✅ |
| Form submission | Spinner overlay | Inline button loading + optimistic update | High |
| Navigation | Instant but no transition | Spring-based transitions | Medium |
| Search | Wait for results | Instant type-ahead with debounce | High |
| Data refresh | Pull-to-refresh | Background refresh + UI update | Medium |

### 9.2 Optimistic Updates

Currently, mutations wait for server response before updating UI. Implement optimistic updates:

1. Update local state immediately on mutation
2. Show success state
3. Sync with server in background
4. Revert if server rejects (with error toast + undo)

### 9.3 Prefetching

1. **List → Detail**: Prefetch record data when list item is in viewport
2. **Tab → Content**: Prefetch next tab content on swipe gesture start
3. **Search → Results**: Prefetch top search results on type-ahead

---

## 10. UX Metrics & Success Criteria

### 10.1 Key UX Metrics to Track

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Time to first meaningful paint | Unknown | < 2s | Performance monitoring |
| Taps to reach any record | 5+ | ≤ 3 | User testing |
| Search to result time | N/A (no search) | < 500ms | Analytics |
| Form completion rate | Unknown | > 80% | Analytics |
| Task success rate | Unknown | > 95% | User testing |
| Error recovery rate | Unknown | > 90% | Analytics |
| User satisfaction (CSAT) | Unknown | > 4.2/5 | In-app survey |
| App Store rating target | N/A | > 4.5★ | Store reviews |
| Accessibility score | Unknown | ≥ 90/100 | Automated testing |
| Lighthouse performance | Unknown | ≥ 90/100 | Web performance |

### 10.2 UX Testing Plan

| Test Type | Tool | Frequency | Coverage |
|-----------|------|-----------|----------|
| Automated A11y | jest-axe | Every CI run | All components |
| Visual Regression | Maestro screenshot | Weekly | Key screens |
| User Testing | In-person / remote | Monthly | Critical flows |
| Analytics Review | Custom analytics | Weekly | All screens |
| Performance Profiling | Flipper / Reactotron | Sprint | Heavy screens |

---

*This document should be reviewed and updated quarterly as the app evolves and user feedback is collected.*

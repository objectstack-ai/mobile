# Messaging & Notification Center — Design Specification

> **Version**: 1.0 · **Date**: 2026-02-09
>
> **Purpose**: 评估在 ObjectStack Mobile 中实现 Slack / Microsoft Teams / Salesforce Chatter 类似功能的可行性，设计完整方案，制定开发进度计划，并明确需要 `@objectstack/client` 提供的改进。

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Competitive Feature Analysis](#competitive-feature-analysis)
3. [Feature Scope Definition](#feature-scope-definition)
4. [Architecture Design](#architecture-design)
5. [Notification Center Design](#notification-center-design)
6. [Activity Feed Design](#activity-feed-design)
7. [Messaging & Channels Design](#messaging--channels-design)
8. [Real-Time Infrastructure](#real-time-infrastructure)
9. [Component & Hook Design](#component--hook-design)
10. [Development Phases & Timeline](#development-phases--timeline)
11. [SDK Improvement Requirements](#sdk-improvement-requirements)
12. [Risk Assessment](#risk-assessment)

---

## 1. Executive Summary

### Objective

Implement a comprehensive communication and collaboration layer in ObjectStack Mobile, drawing from the best patterns of Slack, Microsoft Teams, and Salesforce Chatter. The design focuses on three pillars:

1. **Notification Center** — Unified, categorized, actionable notifications with rich filtering
2. **Activity Feed** — Record-level and team-level activity streams (Chatter pattern)
3. **Messaging & Channels** — Contextual conversations tied to records, objects, and teams (Slack/Teams pattern)

### Current State

The mobile app already has foundational building blocks:

| Component | Status | Current Capability |
|-----------|--------|-------------------|
| `useNotifications` hook | ✅ Implemented | Basic list, mark read/unread, preferences, device registration |
| `useSubscription` hook | ✅ Implemented | WebSocket connection, channel subscribe, presence |
| `CollaborationIndicator` | ✅ Implemented | Presence avatars with status colors |
| `useAI` hook | ✅ Implemented | Chat, NLQ, suggestions, insights |
| Notifications screen | ✅ Implemented | Simple notification list with mark-all-read |
| Push notification infra | ✅ Implemented | Device registration for iOS/Android/Web |

### Gap Summary

| Feature Area | SDK Support | Mobile Support | Gap |
|-------------|-------------|---------------|-----|
| Basic notifications | ✅ Full | ✅ Full | None |
| Notification categories/filtering | ⚠️ Partial | ❌ None | SDK + Mobile |
| Activity feed (record-level) | ❌ None | ❌ None | New SDK API needed |
| Record comments/discussions | ❌ None | ❌ None | New SDK API needed |
| @mentions | ❌ None | ❌ None | New SDK API needed |
| Channels / group messaging | ❌ None | ❌ None | New SDK API needed |
| Direct messages | ❌ None | ❌ None | New SDK API needed |
| Threaded replies | ❌ None | ❌ None | New SDK API needed |
| Reactions (emoji) | ❌ None | ❌ None | New SDK API needed |
| File sharing in messages | ⚠️ Partial (files API) | ❌ None | SDK extension needed |
| Typing indicators | ⚠️ Partial (realtime) | ❌ None | Mobile only |
| Read receipts | ❌ None | ❌ None | New SDK API needed |
| Notification grouping/bundling | ❌ None | ❌ None | SDK + Mobile |
| Do Not Disturb / Scheduling | ⚠️ Partial (preferences) | ❌ None | SDK extension needed |

---

## 2. Competitive Feature Analysis

### Feature Matrix: Slack vs Teams vs Chatter vs ObjectStack (Proposed)

| Feature | Slack | Teams | Chatter | ObjectStack (Proposed) |
|---------|-------|-------|---------|----------------------|
| **Channels** | ✅ Public/Private | ✅ Teams + Channels | ✅ Groups | ✅ Object-bound + Custom |
| **Direct Messages** | ✅ 1:1 + Group DM | ✅ 1:1 + Group | ✅ 1:1 Messages | ✅ 1:1 + Group |
| **Threaded Replies** | ✅ In-channel threads | ✅ Reply threads | ✅ Comment threads | ✅ On messages + records |
| **@Mentions** | ✅ User, Channel, @here | ✅ User, Team, @everyone | ✅ User, Group | ✅ User, Object, Team |
| **Reactions** | ✅ Custom emoji | ✅ Emoji + GIF | ✅ Like | ✅ Emoji reactions |
| **File Sharing** | ✅ In-message files | ✅ In-message + OneDrive | ✅ Attachments | ✅ Inline + record files |
| **Activity Feed** | ❌ (All Messages) | ✅ Activity feed | ✅ Chatter feed | ✅ Record + global feed |
| **Record Comments** | ❌ N/A | ❌ N/A | ✅ Core feature | ✅ Core feature |
| **Notifications** | ✅ Customizable | ✅ Customizable | ✅ Basic | ✅ Categorized + smart |
| **Notification Center** | ⚠️ Mentions + threads | ✅ Activity + Feed | ✅ Notifications tab | ✅ Unified center |
| **Presence** | ✅ Online/Away/DND | ✅ Online/Away/Busy | ✅ Basic | ✅ Full presence |
| **Search** | ✅ Full-text | ✅ Full-text | ✅ Full-text | ✅ ObjectQL-powered |
| **Rich Text** | ✅ Markdown | ✅ Rich editor | ✅ Basic formatting | ✅ Markdown |
| **Bot / AI** | ✅ Slackbot + apps | ✅ Copilot | ✅ Einstein | ✅ AI assistant |
| **Do Not Disturb** | ✅ Schedule | ✅ Focus modes | ❌ | ✅ Schedule |
| **Push Notifications** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |

### ObjectStack Differentiation

ObjectStack's key differentiation is **record-contextual communication** — conversations and activity are naturally tied to business objects and records, combining the best of:

- **Chatter**: Record-level comments and activity feeds
- **Slack**: Channel-based real-time messaging
- **Teams**: Unified notification center with activity feed

---

## 3. Feature Scope Definition

### Tier 1 — Enhanced Notification Center (v1.2)

> Minimum viable improvement. Enhances current notification list into a full notification center.

- Notification categories (system, mentions, assignments, workflow, comments)
- Notification grouping by record/object
- Swipe-to-dismiss / swipe-to-mark-read actions
- Smart filtering (All, Unread, Mentions, Assigned to me)
- Notification settings per category
- Do Not Disturb scheduling
- Grouped push notification delivery (iOS notification groups)
- Rich notification previews with quick actions (reply inline, approve, etc.)

### Tier 2 — Activity Feed & Record Comments (v1.3)

> Salesforce Chatter-style record engagement.

- Record-level activity feed (who changed what, when)
- Record comments with threaded replies
- @mentions in comments with notification delivery
- Emoji reactions on comments
- Activity feed on the home screen (team activity)
- Activity filtering by type (comments, changes, workflow, system)
- Inline file attachments on comments

### Tier 3 — Messaging & Channels (v1.4)

> Slack/Teams-style communication.

- Object-bound channels (auto-created per object, e.g. #sales-opportunities)
- Custom channels (user-created for teams/topics)
- Direct messages (1:1)
- Group direct messages
- Threaded replies on channel messages
- Typing indicators
- Read receipts per message
- Rich text (Markdown) with link previews
- @mention autocomplete
- File sharing in messages
- Message search (integrated with GlobalSearch)
- Pinned messages

---

## 4. Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile UI Layer                       │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ │
│  │Notif     │ │Activity  │ │Messaging  │ │Presence  │  │
│  │Center    │ │Feed      │ │& Channels │ │Indicators│  │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘ │
├───────┼────────────┼─────────────┼─────────────┼────────┤
│       │     React Hook Layer     │             │        │
│  ┌────┴────┐ ┌─────┴────┐ ┌─────┴─────┐ ┌────┴─────┐  │
│  │useNotif │ │useActivity│ │useMessaging│ │usePresence│ │
│  │Center   │ │Feed      │ │           │ │          │  │
│  └────┬────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘  │
├───────┼───────────┼─────────────┼─────────────┼────────┤
│       │   SDK / Client Layer    │             │        │
│  ┌────┴─────────────────────────┴─────────────┴─────┐  │
│  │ @objectstack/client                               │  │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │  │
│  │ │notifi-   │ │activity  │ │messaging │ │real-  │ │  │
│  │ │cations.* │ │.*        │ │.*        │ │time.* │ │  │
│  │ └──────────┘ └──────────┘ └──────────┘ └───────┘ │  │
│  └───────────────────────┬───────────────────────────┘  │
├──────────────────────────┼──────────────────────────────┤
│                    Transport Layer                       │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ REST API     │ │ WebSocket    │ │ Push (APNs/FCM)│  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Data Model

```
┌──────────────────┐      ┌──────────────────┐
│ NotificationItem │      │ ActivityEntry    │
├──────────────────┤      ├──────────────────┤
│ id               │      │ id               │
│ type (enum)      │      │ type (enum)      │
│ category         │      │ actor            │
│ title            │      │ object           │
│ body             │      │ recordId         │
│ read             │      │ action           │
│ groupKey         │      │ changes[]        │
│ actionUrl        │      │ comment?         │
│ priority         │      │ createdAt        │
│ data             │      └──────────────────┘
│ createdAt        │
└──────────────────┘      ┌──────────────────┐
                          │ Channel          │
┌──────────────────┐      ├──────────────────┤
│ Comment          │      │ id               │
├──────────────────┤      │ name             │
│ id               │      │ type (object|    │
│ object           │      │  custom|dm|group)│
│ recordId         │      │ description      │
│ parentId?        │      │ objectBinding?   │
│ body (markdown)  │      │ members[]        │
│ author           │      │ isArchived       │
│ mentions[]       │      │ createdAt        │
│ attachments[]    │      └──────────────────┘
│ reactions[]      │
│ createdAt        │      ┌──────────────────┐
│ updatedAt        │      │ Message          │
└──────────────────┘      ├──────────────────┤
                          │ id               │
                          │ channelId        │
                          │ threadId?        │
                          │ body (markdown)  │
                          │ author           │
                          │ mentions[]       │
                          │ attachments[]    │
                          │ reactions[]      │
                          │ readBy[]         │
                          │ createdAt        │
                          │ updatedAt        │
                          └──────────────────┘
```

---

## 5. Notification Center Design

### Enhanced Notification Screen

Replaces the current simple `app/(tabs)/notifications.tsx` with a full notification center.

#### UI Design

```
┌──────────────────────────────────┐
│ Notifications              ⚙️   │
├──────────────────────────────────┤
│ [All] [Unread] [Mentions] [...]  │  ← Category filter tabs
├──────────────────────────────────┤
│ Today                            │  ← Date section header
│ ┌──────────────────────────────┐ │
│ │ 🔵 @john mentioned you in    │ │  ← Unread indicator
│ │    Acme Corp — Deal Review   │ │
│ │    "Can you review the..."   │ │  ← Preview body
│ │    [Reply] [View Record]     │ │  ← Quick actions
│ │    2 min ago                 │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ ⚡ Workflow: Invoice #1234   │ │  ← Workflow notification
│ │    Pending your approval     │ │
│ │    [Approve] [Reject]        │ │  ← Inline actions
│ │    15 min ago                │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ 📝 3 updates to Project X   │ │  ← Grouped notification
│ │    Sarah updated status...   │ │
│ │    Mike added a comment...   │ │
│ │    Jane completed task...    │ │
│ │    1 hour ago                │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ Yesterday                        │
│ ┌──────────────────────────────┐ │
│ │ ○ Assignment: Task #567      │ │  ← Read notification
│ │    Assigned to you by Sarah  │ │
│ │    Yesterday at 4:30 PM      │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

#### Notification Categories

```typescript
type NotificationCategory =
  | "mention"        // @mentioned in a comment or message
  | "assignment"     // Record assigned to you
  | "workflow"       // Workflow action required (approve/reject)
  | "comment"        // New comment on a followed record
  | "update"         // Record you follow was updated
  | "system"         // System announcements, maintenance
  | "message"        // Direct message or channel message
  | "reaction"       // Someone reacted to your comment/message
  ;
```

#### Notification Grouping Strategy

Notifications are grouped by:
1. **Record** — Multiple updates to the same record collapse into one entry
2. **Time window** — Updates within a 1-hour window of each other group together
3. **Type** — Same-type notifications from the same source group (e.g., "5 reactions on your comment")

#### Swipe Actions

- **Swipe left → archive/dismiss** (leverages existing `SwipeableRow` component)
- **Swipe right → mark read/unread**

#### Notification Settings Screen

```
┌──────────────────────────────────┐
│ ← Notification Settings          │
├──────────────────────────────────┤
│ Do Not Disturb                   │
│ ┌──────────────────────────────┐ │
│ │ Enable DND        [toggle]  │ │
│ │ Schedule  10:00 PM - 8:00 AM│ │
│ │ Allow urgent      [toggle]  │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ Notification Channels            │
│ ┌──────────────────────────────┐ │
│ │ Mentions     Push ✅ Email ✅│ │
│ │ Assignments  Push ✅ Email ✅│ │
│ │ Workflow     Push ✅ Email ❌│ │
│ │ Comments     Push ❌ Email ❌│ │
│ │ Updates      Push ❌ Email ✅│ │
│ │ Messages     Push ✅ Email ❌│ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ Digest                           │
│ ┌──────────────────────────────┐ │
│ │ Frequency    [Daily ▼]      │ │
│ │ Include      [All ▼]        │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### New Hook: `useNotificationCenter`

Extends the existing `useNotifications` hook with additional capabilities:

```typescript
interface UseNotificationCenterResult extends UseNotificationsResult {
  /** Notifications grouped by date sections */
  sections: NotificationSection[];
  /** Active category filter */
  activeFilter: NotificationCategory | "all" | "unread";
  /** Set the active filter */
  setFilter: (filter: NotificationCategory | "all" | "unread") => void;
  /** Archive/dismiss a notification */
  archive: (id: string) => Promise<void>;
  /** DND state */
  dndEnabled: boolean;
  /** Toggle DND */
  toggleDND: () => void;
  /** Category counts for filter badges */
  categoryCounts: Record<NotificationCategory, number>;
}

interface NotificationSection {
  title: string;       // "Today", "Yesterday", "Feb 7"
  data: GroupedNotification[];
}

interface GroupedNotification {
  groupKey: string;
  notifications: NotificationItem[];
  latestAt: string;
  summary?: string;    // "3 updates to Project X"
}
```

---

## 6. Activity Feed Design

### Record Activity Feed

Displayed on a record's detail view, showing all changes, comments, and workflow transitions.

```
┌──────────────────────────────────┐
│ Activity                    ▼    │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ Write a comment...      📎  │ │  ← Comment input
│ └──────────────────────────────┘ │
│                                  │
│ ● Sarah Chen — 10 min ago       │
│   💬 "Let's move this to Q2     │
│   budget review @john @mike"    │
│   ❤️ 2  👍 1                    │  ← Reactions
│   └── Reply (1)                 │  ← Thread indicator
│                                  │
│ ● System — 1 hour ago           │
│   🔄 Status changed:            │
│   Draft → In Review             │
│                                  │
│ ● Mike Johnson — 2 hours ago    │
│   📝 Updated fields:            │
│   • Amount: $50K → $75K         │
│   • Close Date: Mar 15 → Apr 1  │
│                                  │
│ ● System — Yesterday            │
│   ✅ Workflow: Approved by VP    │
│                                  │
│ ● Sarah Chen — 2 days ago       │
│   📎 Attached "proposal-v2.pdf" │
│                                  │
│ ● System — 2 days ago           │
│   🆕 Record created by Sarah    │
└──────────────────────────────────┘
```

### Global Activity Feed (Home Screen)

A team-wide activity stream on the home tab:

```
┌──────────────────────────────────┐
│ Team Activity           [Filter] │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ 👤 Sarah Chen                │ │
│ │ Closed deal: Acme Corp      │ │
│ │ 📊 Opportunities · $150K    │ │
│ │ 🎉 5  💬 3                  │ │
│ │ 5 min ago                   │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ 👤 Mike Johnson              │ │
│ │ Commented on Invoice #1234  │ │
│ │ 📋 Invoices                 │ │
│ │ "Payment received, closing" │ │
│ │ 15 min ago                  │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### New Hook: `useActivityFeed`

```typescript
interface UseActivityFeedOptions {
  /** Object name for record-level feed */
  object?: string;
  /** Record ID for record-level feed */
  recordId?: string;
  /** Activity types to include */
  types?: ActivityType[];
  /** Enable real-time updates */
  realtime?: boolean;
}

type ActivityType =
  | "comment"
  | "field_change"
  | "workflow_transition"
  | "assignment"
  | "file_attachment"
  | "record_created"
  | "record_deleted"
  | "mention"
  ;

interface UseActivityFeedResult {
  activities: ActivityEntry[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  fetchMore: () => Promise<void>;
  refetch: () => Promise<void>;
  /** Post a new comment */
  postComment: (body: string, mentions?: string[], attachments?: string[]) => Promise<void>;
  /** Reply to a comment thread */
  replyToComment: (parentId: string, body: string) => Promise<void>;
  /** Add reaction to a comment */
  addReaction: (commentId: string, emoji: string) => Promise<void>;
  /** Remove reaction from a comment */
  removeReaction: (commentId: string, emoji: string) => Promise<void>;
}

interface ActivityEntry {
  id: string;
  type: ActivityType;
  actor: { id: string; name: string; avatar?: string };
  object: string;
  recordId: string;
  recordTitle?: string;
  action: string;
  changes?: FieldChange[];
  comment?: CommentData;
  createdAt: string;
}

interface FieldChange {
  field: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
}

interface CommentData {
  id: string;
  body: string;
  mentions: string[];
  attachments: AttachmentData[];
  reactions: ReactionData[];
  replyCount: number;
  replies?: CommentData[];
}
```

---

## 7. Messaging & Channels Design

### Channel Types

| Type | Description | Auto-created | Example |
|------|-------------|-------------|---------|
| `object` | Bound to an ObjectStack object | Yes (configurable) | `#sales-opportunities` |
| `record` | Bound to a specific record | On first message | `#acme-corp-deal` |
| `custom` | User-created topic channel | Manual | `#engineering-standup` |
| `dm` | Direct message (1:1) | On first message | DM with Sarah |
| `group` | Group direct message | Manual | Group with Sarah, Mike |

### Channel List Screen

```
┌──────────────────────────────────┐
│ Messages               [Compose] │
├──────────────────────────────────┤
│ 🔍 Search messages...            │
├──────────────────────────────────┤
│ Direct Messages                  │
│ ┌──────────────────────────────┐ │
│ │ 🟢 Sarah Chen          2m  │ │
│ │    Sounds good, let's do it │ │
│ │                          🔵 │ │  ← Unread indicator
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ 🟡 Mike, Sarah + 2     1h  │ │
│ │    Mike: Check the latest.. │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ Channels                         │
│ ┌──────────────────────────────┐ │
│ │ # sales-opportunities  30m  │ │
│ │   New deal alert: Acme...   │ │
│ │                          🔵 │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ # engineering-standup   2h  │ │
│ │   Today's updates posted    │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### Message Thread View

```
┌──────────────────────────────────┐
│ ← # sales-opportunities    👤 5 │
├──────────────────────────────────┤
│                                  │
│ Sarah Chen                10:30  │
│ ┌──────────────────────────────┐ │
│ │ New opportunity: Acme Corp   │ │
│ │ $150K — Enterprise license   │ │
│ │ @mike can you take a look?   │ │
│ └──────────────────────────────┘ │
│ 👍 2  🎉 1    💬 2 replies      │
│                                  │
│ Mike Johnson              10:45  │
│ ┌──────────────────────────────┐ │
│ │ On it! I'll review the req   │ │
│ │ and schedule a call.         │ │
│ └──────────────────────────────┘ │
│                                  │
│ Jane Doe                  11:00  │
│ ┌──────────────────────────────┐ │
│ │ 📎 proposal-draft.pdf       │ │
│ │ Here's the initial proposal  │ │
│ └──────────────────────────────┘ │
│                                  │
├──────────────────────────────────┤
│ Sarah is typing...               │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ Message #sales-opp...  📎 😀│ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### New Hook: `useMessaging`

```typescript
interface UseMessagingOptions {
  channelId: string;
  /** Enable real-time message delivery */
  realtime?: boolean;
}

interface UseMessagingResult {
  /** Messages in the channel (newest last) */
  messages: Message[];
  /** Channel metadata */
  channel: Channel | null;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  /** Load older messages */
  fetchMore: () => Promise<void>;
  /** Send a message */
  send: (body: string, options?: SendMessageOptions) => Promise<void>;
  /** Reply in a thread */
  reply: (threadId: string, body: string) => Promise<void>;
  /** Add reaction */
  react: (messageId: string, emoji: string) => Promise<void>;
  /** Remove reaction */
  unreact: (messageId: string, emoji: string) => Promise<void>;
  /** Pin/unpin a message */
  togglePin: (messageId: string) => Promise<void>;
  /** Mark channel as read */
  markRead: () => Promise<void>;
  /** Members currently typing */
  typingUsers: string[];
  /** Set own typing state */
  setTyping: (isTyping: boolean) => void;
  /** Online/offline members */
  members: PresenceMember[];
}

interface SendMessageOptions {
  mentions?: string[];
  attachments?: string[];
  replyTo?: string;
}

interface Message {
  id: string;
  channelId: string;
  threadId?: string;
  body: string;
  author: { id: string; name: string; avatar?: string };
  mentions: string[];
  attachments: AttachmentData[];
  reactions: ReactionData[];
  isPinned: boolean;
  replyCount: number;
  readBy: string[];
  createdAt: string;
  updatedAt?: string;
}

interface Channel {
  id: string;
  name: string;
  type: "object" | "record" | "custom" | "dm" | "group";
  description?: string;
  objectBinding?: { object: string; recordId?: string };
  members: ChannelMember[];
  unreadCount: number;
  lastMessage?: Message;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  createdAt: string;
}
```

### New Hook: `useChannels`

```typescript
interface UseChannelsResult {
  /** All channels the user is a member of */
  channels: Channel[];
  /** Channels grouped by type */
  dmChannels: Channel[];
  groupChannels: Channel[];
  objectChannels: Channel[];
  customChannels: Channel[];
  /** Total unread count across all channels */
  totalUnread: number;
  isLoading: boolean;
  error: Error | null;
  /** Create a new channel */
  create: (opts: CreateChannelOptions) => Promise<Channel>;
  /** Join an existing channel */
  join: (channelId: string) => Promise<void>;
  /** Leave a channel */
  leave: (channelId: string) => Promise<void>;
  /** Archive a channel */
  archive: (channelId: string) => Promise<void>;
  /** Mute/unmute a channel */
  toggleMute: (channelId: string) => Promise<void>;
  /** Search channels */
  search: (query: string) => Promise<Channel[]>;
  /** Refetch channel list */
  refetch: () => Promise<void>;
}
```

---

## 8. Real-Time Infrastructure

### WebSocket Event Model

Building on the existing `useSubscription` hook, the real-time layer needs to support:

```typescript
// Extended realtime events
type RealtimeEventType =
  // Existing events
  | "record.created"
  | "record.updated"
  | "record.deleted"
  // New: Messaging events
  | "message.created"
  | "message.updated"
  | "message.deleted"
  | "message.reaction_added"
  | "message.reaction_removed"
  // New: Activity events
  | "activity.comment_created"
  | "activity.comment_updated"
  | "activity.comment_deleted"
  // New: Presence events
  | "presence.typing_start"
  | "presence.typing_stop"
  | "presence.status_changed"
  // New: Notification events
  | "notification.created"
  | "notification.group_updated"
  ;
```

### Connection Management

```typescript
// Enhanced connection with multiplexed subscriptions
interface RealtimeManager {
  /** Single WebSocket connection shared across all hooks */
  connect(): Promise<void>;
  /** Subscribe to a channel for specific events */
  subscribe(channel: string, events: string[], callback: EventCallback): Subscription;
  /** Unsubscribe from a channel */
  unsubscribe(subscription: Subscription): void;
  /** Broadcast typing indicator */
  sendTyping(channel: string): void;
  /** Connection state observable */
  onConnectionChange(callback: (connected: boolean) => void): Unsubscribe;
}
```

### Offline Message Queue

When the app is offline or in background, messages should be queued and delivered when connectivity returns. This extends the existing offline sync architecture in `lib/offline-sync.ts`.

---

## 9. Component & Hook Design

### New Components Required

#### Tier 1 (Notification Center)

| Component | Path | Description |
|-----------|------|-------------|
| `NotificationCenter` | `components/notifications/NotificationCenter.tsx` | Main notification center with filters |
| `NotificationGroup` | `components/notifications/NotificationGroup.tsx` | Grouped notification card |
| `NotificationActions` | `components/notifications/NotificationActions.tsx` | Inline quick actions (approve, reply) |
| `NotificationFilters` | `components/notifications/NotificationFilters.tsx` | Category filter tab bar |
| `NotificationSettings` | `components/notifications/NotificationSettings.tsx` | Settings panel |
| `DNDScheduler` | `components/notifications/DNDScheduler.tsx` | Do Not Disturb schedule picker |

#### Tier 2 (Activity Feed)

| Component | Path | Description |
|-----------|------|-------------|
| `ActivityFeed` | `components/activity/ActivityFeed.tsx` | Activity list with real-time updates |
| `ActivityEntry` | `components/activity/ActivityEntry.tsx` | Single activity row |
| `CommentInput` | `components/activity/CommentInput.tsx` | Comment composer with @mention |
| `CommentThread` | `components/activity/CommentThread.tsx` | Threaded replies |
| `ReactionPicker` | `components/activity/ReactionPicker.tsx` | Emoji reaction selector |
| `MentionSuggester` | `components/activity/MentionSuggester.tsx` | @mention autocomplete |
| `FieldChangeDisplay` | `components/activity/FieldChangeDisplay.tsx` | Before/after field change |
| `GlobalActivityFeed` | `components/activity/GlobalActivityFeed.tsx` | Home screen team feed |

#### Tier 3 (Messaging)

| Component | Path | Description |
|-----------|------|-------------|
| `ChannelList` | `components/messaging/ChannelList.tsx` | Channel & DM list |
| `ChannelHeader` | `components/messaging/ChannelHeader.tsx` | Channel name, members, actions |
| `MessageList` | `components/messaging/MessageList.tsx` | Virtualized message list |
| `MessageBubble` | `components/messaging/MessageBubble.tsx` | Single message with reactions |
| `MessageComposer` | `components/messaging/MessageComposer.tsx` | Rich text input with toolbar |
| `ThreadView` | `components/messaging/ThreadView.tsx` | Thread side panel / modal |
| `TypingIndicator` | `components/messaging/TypingIndicator.tsx` | "X is typing..." |
| `ReadReceipts` | `components/messaging/ReadReceipts.tsx` | Read receipt avatars |
| `ChannelCreator` | `components/messaging/ChannelCreator.tsx` | Create channel dialog |
| `MemberSelector` | `components/messaging/MemberSelector.tsx` | Add/remove members |

### New Hooks Required

| Hook | Tier | Description |
|------|------|-------------|
| `useNotificationCenter` | 1 | Enhanced notifications with grouping, filtering, DND |
| `useActivityFeed` | 2 | Record & global activity feed |
| `useComments` | 2 | Record comments CRUD with threading |
| `useMentions` | 2 | @mention resolution and autocomplete |
| `useReactions` | 2 | Emoji reactions on comments/messages |
| `useMessaging` | 3 | Channel messaging with real-time |
| `useChannels` | 3 | Channel list and management |
| `useTypingIndicator` | 3 | Typing state management |
| `useReadReceipts` | 3 | Message read tracking |

### New Screens Required

| Screen | Path | Tier | Description |
|--------|------|------|-------------|
| Notification Settings | `app/notification-settings.tsx` | 1 | Per-category notification settings |
| Activity Feed (Global) | Embed in `app/(tabs)/index.tsx` | 2 | Team activity on home screen |
| Messages Tab | `app/(tabs)/messages.tsx` | 3 | Channel & DM list |
| Channel View | `app/channel/[id].tsx` | 3 | Message thread in a channel |
| Thread View | `app/thread/[id].tsx` | 3 | Threaded reply view |
| Channel Settings | `app/channel/[id]/settings.tsx` | 3 | Channel members & settings |

---

## 10. Development Phases & Timeline

### Phase Overview

| Phase | Scope | Duration | SDK Dependency |
|-------|-------|----------|---------------|
| **Phase N1** | Enhanced Notification Center | 2–3 weeks | Minor SDK changes |
| **Phase N2** | Activity Feed & Record Comments | 3–4 weeks | New SDK APIs required |
| **Phase N3** | Messaging & Channels | 4–6 weeks | New SDK APIs required |
| **Phase N4** | Polish, Search & AI Integration | 2–3 weeks | Minor SDK enhancements |
| **Total** | | **11–16 weeks** | |

---

### Phase N1 — Enhanced Notification Center (2–3 weeks)

> **SDK dependency**: Minor — notification category field, groupKey, archive endpoint

#### Week 1: Foundation & UI

- [ ] Define `NotificationCategory` type and update `NotificationItem` interface
- [ ] Implement `useNotificationCenter` hook (extends `useNotifications`)
- [ ] Build `NotificationFilters` component (category tab bar)
- [ ] Build `NotificationGroup` component (collapsed/expanded groups)
- [ ] Implement notification grouping logic (by record, time window)
- [ ] Add date-based section headers ("Today", "Yesterday", etc.)

#### Week 2: Actions & Settings

- [ ] Build `NotificationActions` component (inline approve/reject/reply)
- [ ] Integrate swipe actions (archive, mark read) with existing `SwipeableRow`
- [ ] Build `NotificationSettings` screen
- [ ] Implement per-category push/email toggle UI
- [ ] Build `DNDScheduler` component
- [ ] Implement DND state management in Zustand store

#### Week 3: Real-Time & Polish

- [ ] Subscribe to `notification.created` real-time events
- [ ] Implement grouped push notification delivery (iOS notification groups)
- [ ] Add badge count management (app icon + tab bar)
- [ ] Add pull-to-refresh and infinite scroll
- [ ] Write tests for `useNotificationCenter` hook
- [ ] Write component snapshot tests

---

### Phase N2 — Activity Feed & Record Comments (3–4 weeks)

> **SDK dependency**: ⚠️ **Requires new `client.activity.*` and `client.comments.*` APIs**

#### Week 4: Activity Feed Backend Integration

- [ ] Implement `useActivityFeed` hook
- [ ] Build `ActivityEntry` component (handles all activity types)
- [ ] Build `FieldChangeDisplay` component (before/after diffs)
- [ ] Integrate activity feed into record detail view
- [ ] Subscribe to real-time activity events

#### Week 5: Comments System

- [ ] Implement `useComments` hook (CRUD + threading)
- [ ] Build `CommentInput` component with Markdown support
- [ ] Build `CommentThread` component (nested replies)
- [ ] Implement `useMentions` hook (@mention resolution)
- [ ] Build `MentionSuggester` autocomplete component

#### Week 6: Reactions & Global Feed

- [ ] Implement `useReactions` hook
- [ ] Build `ReactionPicker` component (emoji grid)
- [ ] Display reactions on comments (counts + who reacted)
- [ ] Build `GlobalActivityFeed` for home screen
- [ ] Add activity type filtering UI

#### Week 7: Testing & Refinement

- [ ] Write comprehensive tests for all Tier 2 hooks
- [ ] Write component snapshot tests
- [ ] Performance optimization (virtualized activity list)
- [ ] Offline comment queue (draft comments survive app restart)

---

### Phase N3 — Messaging & Channels (4–6 weeks)

> **SDK dependency**: ⚠️ **Requires new `client.messaging.*` API**

#### Week 8: Channel Infrastructure

- [ ] Implement `useChannels` hook
- [ ] Build `ChannelList` component (grouped by type)
- [ ] Build `ChannelHeader` component
- [ ] Add Messages tab to tab navigation (`app/(tabs)/messages.tsx`)
- [ ] Implement channel creation flow

#### Week 9: Messaging Core

- [ ] Implement `useMessaging` hook
- [ ] Build `MessageList` component (inverted virtualized list)
- [ ] Build `MessageBubble` component (own vs. others)
- [ ] Build `MessageComposer` component (rich input + toolbar)
- [ ] Implement send/receive with real-time WebSocket

#### Week 10: Threading & Interactions

- [ ] Build `ThreadView` component
- [ ] Implement threaded replies
- [ ] Implement typing indicators (`useTypingIndicator` hook)
- [ ] Build `TypingIndicator` component
- [ ] Implement read receipts (`useReadReceipts` hook)

#### Week 11: Direct Messages & Files

- [ ] Implement DM creation flow (user picker → channel)
- [ ] Implement group DM creation
- [ ] File sharing in messages (leverage existing `useFileUpload`)
- [ ] Link preview generation
- [ ] Message pinning

#### Week 12–13: Search & Polish

- [ ] Integrate message search into `GlobalSearch`
- [ ] Channel search and discovery
- [ ] Unread badge management across channels
- [ ] Message notification sound/haptic feedback
- [ ] Offline message queue (send when reconnected)
- [ ] Write comprehensive tests

---

### Phase N4 — Polish, Search & AI Integration (2–3 weeks)

#### Week 14: AI-Powered Features

- [ ] AI-powered notification summarization ("You missed 15 messages, here's a summary")
- [ ] Smart notification priority ranking
- [ ] AI message suggestions in composer
- [ ] Natural language message search (leverage existing `useAI.nlq`)

#### Week 15: Cross-Feature Integration

- [ ] Unified search across notifications, activity, messages
- [ ] Deep linking from notifications to messages/comments
- [ ] Record-to-channel navigation (view message channel from record)
- [ ] Notification deduplication (don't notify in-app if channel is open)

#### Week 16: Performance & Polish

- [ ] Performance optimization (message list 60fps scrolling)
- [ ] Background message pre-fetch
- [ ] Memory management for long message histories
- [ ] Final accessibility audit (VoiceOver/TalkBack)
- [ ] End-to-end integration testing

---

## 11. SDK Improvement Requirements

### Required: New API Namespaces

The following new API namespaces are needed in `@objectstack/client` to support Tier 2 and Tier 3 features.

#### 11.1 `client.activity.*` — Activity Feed API

> **Priority**: 🔴 High (blocks Phase N2)

```typescript
interface ActivityAPI {
  /** Get activity feed for a specific record */
  getRecordActivity(request: GetRecordActivityRequest): Promise<GetRecordActivityResponse>;

  /** Get global activity feed for the current user */
  getGlobalActivity(request?: GetGlobalActivityRequest): Promise<GetGlobalActivityResponse>;

  /** Follow a record to receive activity updates */
  follow(object: string, recordId: string): Promise<void>;

  /** Unfollow a record */
  unfollow(object: string, recordId: string): Promise<void>;

  /** Get records the current user is following */
  getFollowing(request?: PaginationRequest): Promise<GetFollowingResponse>;
}

interface GetRecordActivityRequest {
  object: string;
  recordId: string;
  types?: ActivityType[];
  cursor?: string;
  limit?: number;
}

interface GetRecordActivityResponse {
  activities: ActivityEntry[];
  cursor?: string;
  totalCount: number;
}
```

#### 11.2 `client.comments.*` — Comments API

> **Priority**: 🔴 High (blocks Phase N2)

```typescript
interface CommentsAPI {
  /** List comments on a record */
  list(request: ListCommentsRequest): Promise<ListCommentsResponse>;

  /** Create a comment on a record */
  create(request: CreateCommentRequest): Promise<CreateCommentResponse>;

  /** Update a comment */
  update(request: UpdateCommentRequest): Promise<UpdateCommentResponse>;

  /** Delete a comment */
  delete(commentId: string): Promise<void>;

  /** Get thread (replies) for a comment */
  getThread(commentId: string, request?: PaginationRequest): Promise<ListCommentsResponse>;

  /** Add reaction to a comment */
  addReaction(commentId: string, emoji: string): Promise<void>;

  /** Remove reaction from a comment */
  removeReaction(commentId: string, emoji: string): Promise<void>;

  /** Resolve @mentions in text, returns resolved user info */
  resolveMentions(text: string): Promise<ResolveMentionsResponse>;
}

interface CreateCommentRequest {
  object: string;
  recordId: string;
  body: string;          // Markdown
  parentId?: string;     // For threaded replies
  mentions?: string[];   // User IDs
  attachments?: string[]; // File IDs
}
```

#### 11.3 `client.messaging.*` — Messaging API

> **Priority**: 🟡 Medium (blocks Phase N3)

```typescript
interface MessagingAPI {
  /** List channels the user is a member of */
  listChannels(request?: ListChannelsRequest): Promise<ListChannelsResponse>;

  /** Create a channel */
  createChannel(request: CreateChannelRequest): Promise<CreateChannelResponse>;

  /** Get channel details */
  getChannel(channelId: string): Promise<GetChannelResponse>;

  /** Update channel metadata */
  updateChannel(request: UpdateChannelRequest): Promise<UpdateChannelResponse>;

  /** Archive a channel */
  archiveChannel(channelId: string): Promise<void>;

  /** Join a channel */
  joinChannel(channelId: string): Promise<void>;

  /** Leave a channel */
  leaveChannel(channelId: string): Promise<void>;

  /** List messages in a channel */
  listMessages(request: ListMessagesRequest): Promise<ListMessagesResponse>;

  /** Send a message */
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;

  /** Update a message */
  updateMessage(request: UpdateMessageRequest): Promise<UpdateMessageResponse>;

  /** Delete a message */
  deleteMessage(messageId: string): Promise<void>;

  /** Get thread messages */
  getThread(messageId: string, request?: PaginationRequest): Promise<ListMessagesResponse>;

  /** Add reaction to a message */
  addReaction(messageId: string, emoji: string): Promise<void>;

  /** Remove reaction from a message */
  removeReaction(messageId: string, emoji: string): Promise<void>;

  /** Pin/unpin a message */
  togglePin(messageId: string): Promise<void>;

  /** Mark channel as read */
  markRead(channelId: string): Promise<void>;

  /** Search messages */
  searchMessages(request: SearchMessagesRequest): Promise<SearchMessagesResponse>;

  /** Get or create a DM channel with a user */
  getDirectMessage(userId: string): Promise<GetChannelResponse>;

  /** Create a group DM */
  createGroupDM(userIds: string[]): Promise<CreateChannelResponse>;
}

interface SendMessageRequest {
  channelId: string;
  body: string;          // Markdown
  threadId?: string;     // For threaded replies
  mentions?: string[];   // User IDs
  attachments?: string[]; // File IDs
}
```

### Required: Enhancements to Existing APIs

#### 11.4 `client.notifications.*` — Enhancements

> **Priority**: 🔴 High (needed for Phase N1)

```typescript
// New fields needed on NotificationItem
interface NotificationItemEnhanced {
  // Existing fields...
  category: NotificationCategory;  // NEW: notification category
  groupKey?: string;               // NEW: for grouping related notifications
  priority: "high" | "normal" | "low"; // NEW: notification priority
  actions?: NotificationAction[];  // NEW: inline actions
}

interface NotificationAction {
  type: "approve" | "reject" | "reply" | "view" | "dismiss";
  label: string;
  url?: string;
  data?: Record<string, unknown>;
}

// New methods needed
interface NotificationsAPIEnhanced {
  // Existing methods...

  /** Archive/dismiss a notification */
  archive(id: string): Promise<void>;

  /** Get notification counts by category */
  getCategoryCounts(): Promise<Record<NotificationCategory, number>>;

  /** Update DND schedule */
  setDNDSchedule(schedule: DNDSchedule): Promise<void>;

  /** Get current DND status */
  getDNDStatus(): Promise<DNDStatus>;
}

interface DNDSchedule {
  enabled: boolean;
  startTime: string;  // "22:00"
  endTime: string;    // "08:00"
  timezone: string;
  allowUrgent: boolean;
}
```

#### 11.5 `client.realtime.*` — Enhancements

> **Priority**: 🔴 High (needed for all tiers)

```typescript
interface RealtimeAPIEnhanced {
  // Existing methods...

  /** Send typing indicator */
  sendTyping(channel: string): Promise<void>;

  /** Subscribe to typing events */
  onTyping(channel: string, callback: (userId: string) => void): Unsubscribe;

  /** Subscribe to a specific event type across all channels */
  onEvent(eventType: string, callback: (event: RealtimeEvent) => void): Unsubscribe;

  /** Multiplexed subscribe (multiple channels on one connection) */
  subscribeMany(channels: ChannelSubscription[]): Promise<void>;
}

interface ChannelSubscription {
  channel: string;
  events: string[];
  callback: (event: RealtimeEvent) => void;
}
```

#### 11.6 `client-react` — New Hooks

> **Priority**: 🟡 Medium (mobile can self-implement, but should be upstreamed)

```typescript
// Hooks that should be provided by @objectstack/client-react
// for cross-platform consistency

/** Activity feed hook */
function useActivityFeed(options: ActivityFeedOptions): UseActivityFeedResult;

/** Comments hook */
function useComments(object: string, recordId: string): UseCommentsResult;

/** Messaging hook */
function useMessaging(channelId: string): UseMessagingResult;

/** Channels hook */
function useChannels(): UseChannelsResult;

/** Enhanced notifications hook */
function useNotificationCenter(): UseNotificationCenterResult;
```

### SDK Improvement Summary Table

| API | Type | Priority | Blocks Phase | Estimated SDK Effort |
|-----|------|----------|-------------|---------------------|
| `client.notifications.archive()` | Enhancement | 🔴 High | N1 | 1–2 days |
| `client.notifications.getCategoryCounts()` | Enhancement | 🔴 High | N1 | 1–2 days |
| `client.notifications.setDNDSchedule()` | Enhancement | 🟡 Medium | N1 | 2–3 days |
| `NotificationItem.category` field | Enhancement | 🔴 High | N1 | 1 day |
| `NotificationItem.groupKey` field | Enhancement | 🔴 High | N1 | 1 day |
| `NotificationItem.actions[]` field | Enhancement | 🟡 Medium | N1 | 2 days |
| `client.activity.*` (full namespace) | **New API** | 🔴 High | N2 | 2–3 weeks |
| `client.comments.*` (full namespace) | **New API** | 🔴 High | N2 | 2–3 weeks |
| `client.messaging.*` (full namespace) | **New API** | 🟡 Medium | N3 | 4–6 weeks |
| `client.realtime.sendTyping()` | Enhancement | 🟡 Medium | N3 | 2–3 days |
| `client.realtime.onTyping()` | Enhancement | 🟡 Medium | N3 | 2–3 days |
| `client.realtime.subscribeMany()` | Enhancement | 🟡 Medium | N3 | 3–5 days |
| `client-react` activity/messaging hooks | New hooks | 🟢 Low | None (can self-impl) | 2–3 weeks |

### SDK Development Timeline (Recommended)

```
Week 1–2:   Notification enhancements (category, groupKey, archive, DND)
            → Unblocks Phase N1

Week 3–5:   Activity Feed API (client.activity.*)
            → Unblocks Phase N2 Week 4

Week 4–6:   Comments API (client.comments.*)
            → Unblocks Phase N2 Week 5

Week 6–8:   Realtime enhancements (typing, subscribeMany)
            → Needed for Phase N3

Week 7–12:  Messaging API (client.messaging.*)
            → Unblocks Phase N3

Week 13–14: client-react hooks (upstream mobile hooks)
            → Optional, for cross-platform consistency
```

---

## 12. Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| WebSocket connection stability on mobile | 🔴 High | 🟡 Medium | Implement reconnection with exponential backoff; offline message queue |
| Message list performance (10K+ messages) | 🟡 Medium | 🟡 Medium | Use FlashList with windowed rendering; aggressive pagination |
| Push notification reliability | 🟡 Medium | 🟢 Low | Dual delivery (push + in-app); fallback polling |
| Real-time event ordering | 🟡 Medium | 🟡 Medium | Server-side event sequencing; client-side reordering buffer |
| Offline message conflicts | 🟡 Medium | 🟡 Medium | Timestamp-based ordering; server reconciliation on reconnect |

### Dependency Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| SDK API availability delays | 🔴 High | 🟡 Medium | Start with notification center (minimal SDK changes); mock SDK for parallel development |
| SDK API design misalignment | 🟡 Medium | 🟡 Medium | Early API contract review with SDK team; design-first approach |
| WebSocket protocol changes | 🟡 Medium | 🟢 Low | Abstract transport layer; version negotiation |

### Resource Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| 11–16 week timeline pressure | 🟡 Medium | 🟡 Medium | Tier-based delivery — each tier is independently shippable |
| Parallel SDK + Mobile development | 🟡 Medium | 🟡 Medium | SDK develops API contracts first; mobile builds against mocks |

### Recommended Approach

1. **Start with Phase N1** (Notification Center) — requires only minor SDK enhancements
2. **Coordinate SDK API design** for `client.activity.*` and `client.comments.*` immediately
3. **Build mobile against mocked SDK** to parallelize development
4. **Ship each tier independently** — Tier 1 alone provides significant value
5. **Leverage existing infrastructure** — `useSubscription`, `SwipeableRow`, `useFileUpload`, `useAI` all apply directly

---

*Last updated: 2026-02-09. Related documents: [ROADMAP.md](./ROADMAP.md), [SDK-GAP-ANALYSIS.md](./SDK-GAP-ANALYSIS.md), [NEXT-PHASE.md](./NEXT-PHASE.md)*

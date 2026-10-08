# Daily Tasks on Trove Web — Design

**Date:** 2026-10-08  
**Status:** Approved  
**Scope:** `trove-web` (mobile remains source of truth for behavior)

## Goal

Port mobile Daily Tasks to Trove Web so they are visible immediately on Library, with the same completion / carryover / repeating / reminder behavior as mobile.

## Decisions

| Decision | Choice |
|----------|--------|
| Placement | Compact strip **above PINNED** on Library |
| Density | **Option A — Compact** (progress + ≤5 open rows) |
| Deep surface | Full **`/today`** page (Approach 1) |
| Reminders | Include **save reminders due today** (parity with mobile) |
| Notifications | No OS push on web; summary toggles sync for mobile |

## Library strip

- Insert between search/filters and PINNED (in `SaveBrowseBody` / Library page composition).
- Contents when enabled: sun icon, “Daily Tasks”, `N done · M left`, progress bar, streak chip if `streak > 0`, up to 5 open items (daily tasks + today’s reminders), check-off inline, **+ Add task**, **Open Today →**.
- Off / empty: short card + **Turn on** or empty copy + Add.
- Hide or collapse gracefully in selection mode if it conflicts with mass-select UX.

## Full Today page (`/today`)

Mirror mobile `TodayScreen`:

1. Header: serif “Today” + long date · streak · calendar (agenda) · Back to Library  
2. Main card: progress · overflow (enable/disable + daily summary time) · UNFINISHED · REMINDERS TODAY · open tasks (check, edit/delete, reorder) · Add task  
3. Status banner  
4. DONE TODAY · N (collapsed; uncomplete on tap)  
5. Agenda month view  
6. Add/Edit modal: title, Today/Tomorrow/Custom, optional time, weekday chips  

## Behavior (must match mobile)

- One-shot vs repeating weekdays; complete advances `scheduledOn` for repeating.
- Incomplete tasks **carry across days** (overdue = `scheduledOn` < today); no midnight checklist reset.
- Completing a save reminder archives via existing reminder completion path.
- Cloud: Supabase `daily_tasks` (`user_id`, `state` jsonb) with same merge rules as mobile (LWW open/toggles; union completed/obligationDays).
- Guest/local: persist in `localStorage` key compatible with mobile shape (`trove.dailyTasks.v1` or web equivalent documented in plan).

## Architecture

1. Port pure modules first: `dailyTasks.ts`, `dailyTasksStats.ts`, `dailyTasksCloudSync.ts` (+ tests).  
2. Web store: React hook + localStorage + Supabase read/upsert when authenticated + cloud entitlement.  
3. UI: `DailyTasksStrip`, `/today` page components, Add/Edit sheet, Agenda, settings sheet.  
4. Reminder rows: reuse web reminder helpers / complete APIs already used by notifications.

## Out of scope (v1)

- OS / browser push scheduling  
- Sidebar “Today” nav item (optional later)  
- Swipe pager Library↔Today (mobile-only gesture)

## Visual

Trove tokens only (`--trove-*` / `lib/theme.ts`). Lucide icons (e.g. sun). No emoji as product icons. Match existing Library chrome.

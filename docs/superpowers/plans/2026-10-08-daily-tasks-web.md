# Daily Tasks Web Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Compact Daily Tasks strip above PINNED on Library + full `/today` page with mobile-parity behavior (tasks + today’s save reminders).

**Architecture:** Port pure `dailyTasks*` modules from mobile; web store (localStorage + Supabase `daily_tasks`); UI strip + Today page; reuse web reminder completion APIs.

**Tech Stack:** Next.js App Router, React 19, Supabase, Lucide, existing `--trove-*` tokens, `tsx --test`.

## Global Constraints

- Mobile is source of truth for complete/carryover/repeat/reminder rules.
- No OS push on web; summary toggles sync only.
- Compact strip (Option A) above PINNED; deep UI on `/today`.
- No emoji as product icons; Lucide only.

## File map

| File | Role |
|------|------|
| `lib/dailyTasks.ts` | Pure types + CRUD (port) |
| `lib/dailyTasksStats.ts` | Streak / dayCompletion (port) |
| `lib/dailyTasksCloudSync.ts` | Merge (port) |
| `lib/dailyTasks*.test.ts` | Port / adapt tests |
| `lib/dailyTasksDb.ts` | Supabase fetch/upsert |
| `lib/dailyTasksStore.ts` | localStorage + subscribe + sync |
| `hooks/useDailyTasks.ts` | React hook |
| `components/dailyTasks/*` | Strip, Today, sheets |
| `app/today/page.tsx` | Route |
| `components/LibraryPage.tsx` / `SaveBrowseBody` | Mount strip |

## Tasks

### Task 1: Port pure logic + tests
- [x] Copy `dailyTasks.ts`, `dailyTasksStats.ts`, `dailyTasksCloudSync.ts` + tests from mobile
- [x] Strip any RN imports; run `npm test`

### Task 2: Persistence + cloud
- [x] `dailyTasksDb.ts` + `dailyTasksStore.ts` + hook
- [x] Sync when logged in (cloud session)

### Task 3: Library strip
- [x] `DailyTasksStrip` + CSS
- [x] Mount above PINNED; wire check/add/open Today; today’s reminders

### Task 4: Today page (core)
- [x] `/today` with main card, unfinished, reminders, open list, done today, add/edit modal, settings
- [x] Agenda modal + polish (strip modal, reschedule, menus, celebration)

### Task 5: Verify
- [ ] Manual: strip visible, complete/uncomplete, cloud round-trip if possible
- [x] `npm test` + tsc

# Trove Web — tracker UI + library filter persistence

**Date:** 2026-09-01  
**Status:** Approved  
**Scope:** `trove-web` only

## Goals

1. Restyle tracker detail to match the approved screenshot: SETUP strip + Records / Calendar / Summary columns.
2. Persist Library filter chips across navigation (Trackers → open tracker → Back stays on Trackers).

## Filter persistence

- Changing a chip updates the URL: `/library?filter=<id>` (`all` clears the param).
- Opening a save/tracker appends `?from=<filter>` on the detail URL.
- Detail “Library” / back uses `/library?filter=<from>` (fallback: save type for trackers → `tracker`).
- Library reads `?filter=` whenever search params change.

## Tracker UI

- Header: Library back, TRACKER badge, title, + Add a note, pin/delete
- SETUP bar: Metric · Rule · Next expected · Streak
- Three columns: Records timeline · Calendar · Summary (total / longest gap / average gap)

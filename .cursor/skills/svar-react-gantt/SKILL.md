---
name: svar-react-gantt
description: >-
  Use when working on SVAR React Gantt (@svar-ui/react-gantt) in this monorepo —
  hierarchy Project→Contract→Stage→Task, timeline, links, export, filters.
  Prefer SVAR MCP (svar-mcp) for up-to-date API.
---

# SVAR React Gantt in SRN

## Domain hierarchy (this product)

```
Project (summary)
  └── Contract (summary)
        └── Stage / ContractStage (summary)
              └── Task (task) — leaf; no backend entity yet, mocks only
```

Map to SVAR `ITask`:

| Domain | `type` | `parent` |
|--------|--------|----------|
| project / contract / stage | `summary` | parent id |
| task | `task` | stage id |

Fields: `start`, `end`, `duration` (days), `progress`, `open: true` on nodes with children.
Custom: `entityKind`, `entityName`.

**Default expand:** all closed (`open: false`). User expands Project → Contract → Stage → Task.
**Persist:** `srn.gantt.treeOpen.v1` via `treeOpenState.ts`.

**Nesting:** `Project → Contract → Stage → WorkPackage → Task` (flat `tasks[]` + `parent`).

## Code map

- `GanttsPage.tsx` — page shell
- `GanttField.tsx` — chart wiring + attach*
- `GanttChromeToolbar.tsx` — search / hotkeys / excel / critical toggle
- `ganttZoom.ts` — zoom levels
- `ganttGridColumns.ts` — columns
- `ganttToolbar.ts` — toolbar items
- `ganttFeatures.ts` — MIT/PRO roadmap flags
- `mock/ganttHierarchyMock.ts` — tree + links
- `lib/ganttApi.ts` — cloneTasks / linksFromApi / scroll helpers
- `lib/mapHierarchyToGantt.ts` — domain → ITask/ILink
- `lib/openLinkedBranches.ts` — open ancestors of linked tasks
- `lib/autoScheduleFs.ts` — FS forward scheduling (MIT custom)
- `lib/workCalendar.ts` — weekends/holidays + `highlightTime`
- `lib/attachTodayMarker.ts` — today line via `_markers` (MIT gap)
- `lib/attachTimelinePan.ts` — СКМ AutoScroll (hold)
- `lib/attachConfirmGuards.ts` — delete/link confirm
- `lib/treeOpenState.ts` — persist open/closed (`patchOpenId` by open-task)
- `lib/exportGanttToExcel.ts` — Excel export
- `lib/criticalPath.ts` + `attachCriticalPathHighlight.ts` — critical path
- `ganttConfig.ts` — `USE_GANTT_MOCKS`

## Rules

1. Before inventing props/events, ask **svar-mcp** or check [SVAR docs](https://docs.svar.dev/react/gantt/).
2. Pass **flat** `tasks[]` with `parent` (root → `parent: 0`).
3. Set `open: true` only on nodes that have children — leaves with `open` + `data: null` crash `toArray()`.
4. Prefer `api.serialize()` + `api.exec('update-task', …)` for date patches; do not push partial event payloads into React `tasks`.
5. Remount chart with `key` when the filtered task set changes (search query).
6. Keep mapper / scheduler / calendar separate from UI.
7. While `USE_GANTT_MOCKS === true`, do not call contracts/stages APIs for Gantt.
8. Grid: no sort; no «+» column; centered meta columns; dates ~104px. Add task via RMB only (stage/task).
9. FS auto-schedule = `autoScheduleFs` (not PRO `schedule-tasks`). Guard re-entrancy.
10. Work calendar MIT: `highlightTime` + FS start snap. Duration = calendar days.
11. AutoScroll: hold middle button only; LMB/RMB = default cursor.
12. Zoom: quarters → **months (default)** → month+days only.
13. Today marker: MIT store does not fill `_markers` — use `attachTodayMarker`.
14. Interactive UI: `Toolbar` + `ContextMenu` + `Editor` + links DnD on bars.
15. Hierarchy moves: `attachHierarchyMoveGuard` — Project→Contract→Stage→WP→Task only; projects stay at root.
16. Critical path: MIT `computeCriticalPath` **per project root**, then set store `$critical` + `criticalPath` so UI paints native `wx-critical` (PRO CPM not used).

## Feature roadmap (`ganttFeatures.ts`)

| Feature | Status |
|---------|--------|
| Customization (scales, columns, editor) | done |
| DnD + dependency links | done |
| Add task (toolbar / column / menu) | done |
| Today marker | mit-custom |
| FS auto-schedule | mit-custom (`autoScheduleFs`) |
| Weekend/holiday highlight | mit-custom |
| Excel export | done |
| Persist tree open state | mit-custom |
| Critical path (custom CSS) | mit-custom |
| Baselines | pro-only |
| Non-linear calendar scale | pro-only |
| Task grouping | pro-only |
| Resources / workload | pro-only |
| PDF/PNG/MSP export-import | pro-only |
| Split tasks | pro-only |
| Built-in PRO auto-schedule | pro-only |

## Next (real data)

1. Load contracts/stages by project into the same multi-root chart.
2. Task API or temporary leaf = stage.
3. Persist `update-task` / link / add-task to backend.
4. Holiday calendar from API instead of static set.

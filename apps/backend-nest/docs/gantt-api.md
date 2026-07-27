# Gantt API (для таймшита и UI)

После SQL из `docs/gantt-tasks.sql`.

## Иерархия диаграммы

`GET /gantt/hierarchy`

Ответ: `{ projects[], links[], date_warnings[] }` — Project → Contract → Stage → Task.

Этапы берутся из `contract_stages` (неархивные). Задачи — из `gantt_tasks`.
В дерево попадают только договоры с `plan_in_gantt = true` (чекбокс в карточке договора).

**Бюджет в дереве:**
- этап = `own_budget` (собственные затраты + прибыль); если split пустой — fallback на `planned_budget`;
- договор = сумма бюджетов этапов в Ганте (без `amount_excl_vat`);
- проект = сумма бюджетов договоров.

Разрез этапа в карточке договора: `coexecutor_budget` + `own_budget` = `planned_budget`.
SQL: `docs/contract-stage-budget-split.sql`.

## Задачи (отдать Юрию)

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/gantt/tasks?user_id=&from=&to=&status=` | Задачи сотрудника + план/статус/назначения |
| GET | `/gantt/tasks/:id` | Карточка задачи |
| POST | `/gantt/tasks` | Создать задачу `{ stage_id, name, parent_id?, start_date?, end_date?, planned_hours?, responsible_user_id?, assignee_ids? }` |
| PUT | `/gantt/tasks/:id` | Обновить |
| DELETE | `/gantt/tasks/:id` | Soft-delete |

## Списания часов (отдать Юрию)

| Метод | Путь | Тело |
|-------|------|------|
| POST | `/gantt/tasks/:id/time-entries` | `{ user_id, work_date, hours, comment?, external_id? }` |
| PUT | `/gantt/time-entries/:id` | правка |
| DELETE | `/gantt/time-entries/:id` | удаление |

`external_id` — идемпотентность синка из таймшита.

**Факт в Ганте** = `SUM(gantt_task_time_entries.hours)` по задаче.

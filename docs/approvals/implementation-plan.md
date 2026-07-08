# Модуль «Согласования документов» — план реализации в PMDB

> Рабочий план внедрения движка из `docs/tz/approval-system-spec.md` (v2) в PMDB (srn_front).
> Зафиксированные решения см. также в памяти проекта `project_approval_system`.
> Дата: 2026-06-16.
>
> **СТАТУС: F0–F5 выполнены. F6 (автотесты) исключён — в проекте нет тест-фреймворка, ядро покрыто runtime-smoke на pmdb_stage.**

## Принятые решения (закрыто)

- **Scope:** полиморфно на 4 сущности (`contract`, `partner`, `patent`, `project`); полный движок v2 (snapshot маршрута, SLA, sequential, делегирование transfer/add).
- **Задачи-последствия (`create_task`)** — отложены на F5: `on_complete_actions_snapshot` сохраняем, `executePostApprovalActions` = no-op + warn.
- **Выкинуто:** KPI-логика, push, `department_head`.
- **Статусы:** approval-state развязан с бизнес-статусом. **Статус меняет handler только у `contract`.** `partner`/`patent` — авто-деривация, не трогаем. `project` — статус свободный varchar, почти не заполнен, конвенции нет → **для v1 тоже no-op** (подтвердить).
  - contract: `DRAFT → IN_APPROVAL → APPROVED` («Согласован»); `rejected → REJECTED`; `returned_to_initiator`/`cancel` → `DRAFT`.
  - **Состояния `ref_contract_states` уже существуют на стейдже** (проверено 2026-06-16) — отдельная миграция статусов НЕ нужна. Коды UPPERCASE:
    `DRAFT` (ac9890ca), `IN_APPROVAL` (b8bafb58), `APPROVED` (3452ab23), `REJECTED` (19e183b9), `SIGNED` (04cfa1a0), `EXECUTED` (dc1a480d), `CLOSED` (de8723db).
  - `contract.service` детектит draft по `lower(code)='draft'` → `DRAFT` матчится; APPROVED не входит в signed-набор → `is_active=false` (договор «Согласован, но не подписан» — уточнить желаемое поведение `is_active`).
- **document_owner:** contract `responsible_id→supplier_manager_id→created_by`; project `manager_id→created_by`; patent `responsible_for_patent_id→created_by`; partner `created_by`.
- **canStart:** владелец ИЛИ `canEdit(секция)`; новых прав нет. Конструктор — новая RBAC-секция `admin.approval_routes`.
- **Циклический FK + частичные индексы** — отдельным SQL по прецеденту `scripts/rbac/` (01 tables → 02 seed → 03 constraints).
- **DnD:** MVP на кнопках; `@dnd-kit` — позже.

---

## Нейминг и константы

- Префикс таблиц: `approval_*` / `ref_approval_*` / `rel_approval_*`. Drizzle-экспорты camelCase (`approvalRoutes`), колонки snake_case.
- `entity_type` коды: `contract`, `partner`, `patent`, `project`.
- Step-role коды: `approver`, `approver_final`.
- RBAC-секция: `admin.approval_routes` (read/edit/delete).
- API-префикс: `/approvals`.

---

## F0 — Фундамент (схема, миграции, сидеры, RBAC)

**Backend / БД**
1. `apps/backend-nest/src/database/schema.ts` — добавить:
   - `pgEnum`: `approval_step_type`, `approval_assignment_type`, `approval_assignee_type`, `approval_decision_type`, `approval_process_status` (значения §2.1).
   - Таблицы: `ref_approval_entity_types`, `ref_approval_step_roles`, `approval_routes`, `approval_route_steps`, `rel_approval_step_assignees`, `approval_processes`, `approval_process_steps`, `rel_approval_process_step_assignees`, `approval_assignments`, `approval_decisions` (§9). Все FK `employees`→`users`, `roles`→`roles`.
   - `current_process_step_id` — объявить **без** `.references()` (для type-safe запросов — `relations()`).
2. `scripts/approvals/01_create_tables.sql` — DDL всех таблиц (на случай ручного применения / прод).
3. `scripts/approvals/03_constraints.sql` — циклический FK `approval_processes.current_process_step_id → approval_process_steps(id)` + частичные уникальные индексы (`idx_processes_active_entity_unique`, `idx_routes_default_unique`, инбокс-индекс `idx_approval_assignments_active_pending`).
4. `scripts/approvals/02_seed.sql`:
   - `ref_approval_step_roles`: `approver`/«Согласующий»/`#3b82f6`, `approver_final`/«Утверждающий»/`#059669`.
   - `ref_approval_entity_types`: 4 строки (см. таблицу ниже).
5. ~~`04_contract_states.sql`~~ — **НЕ нужен**: состояния `DRAFT`/`IN_APPROVAL`/`APPROVED`/`REJECTED` уже есть в `ref_contract_states` (проверено на стейдже 2026-06-16).
6. `scripts/approvals/99_rollback.sql` — DROP в обратном порядке.
7. Проверить `npm run db:generate` — частичные индексы должны попасть; циклический FK закрывается ручным скриптом.

| entity_type | table_name | status_field | handler меняет статус |
|---|---|---|---|
| contract | contracts | state_id | **да** (DRAFT→IN_APPROVAL→APPROVED; reject→REJECTED) |
| project | projects | status | нет (v1; varchar без конвенции) |
| partner | partners | status_id | нет (авто-деривация) |
| patent | patents | status_id | нет (авто из файлов) |

**RBAC**
8. Backend `SECTIONS` (shared/permissions) — добавить `ADMIN_APPROVAL_ROUTES = 'admin.approval_routes'`.
9. Frontend `apps/web/src/shared/permissions/sections.ts` — то же.
10. `scripts/rbac/02_seed_data.sql` — добавить раздел `admin.approval_routes` (под папкой `admin`) + выдать admin-роли.

**Готовность F0:** миграции применяются на `pmdb_stage`, сидеры наполнены, `db:generate` чистый.

---

## F1 — Ядро движка (backend)

Модуль `apps/backend-nest/src/modules/approvals/` (структура — см. ниже). Регистрация в `app.module.ts`. Транзакции `this.db.db.transaction`.

```
modules/approvals/
├── approvals.module.ts
├── controllers/
│   ├── approval-routes.controller.ts       # §3.1
│   └── approval-processes.controller.ts     # §3.2 + state + my-*
├── services/
│   ├── approval-routes.service.ts           # CRUD + batch steps (DELETE all → INSERT)
│   ├── approval-snapshot.service.ts         # snapshotRouteToProcess (§4.0)
│   ├── approval-engine.service.ts           # start / makeDecision / dispatch (§4.1–4.5)
│   └── approval-state.service.ts            # getDocumentApprovalState (§3.4)
├── resolvers/
│   └── assignee.resolver.ts                 # §4.3
├── entity-handlers/
│   ├── entity-handler.interface.ts          # canStart, resolveOwner, resolveContext, onStart/onApprove/onReject/onReturnToInitiator/onCancel
│   ├── entity-handler.registry.ts           # Map<entity_type, handler> через DI
│   ├── contract.handler.ts                  # реальные переходы статусов
│   ├── project.handler.ts                   # varchar-переходы
│   ├── partner.handler.ts                   # статус no-op, owner=created_by
│   └── patent.handler.ts                    # статус no-op
└── dto/                                      # class-validator; контроллеры @Body('body')
```

**Задачи:**
1. `EntityHandler` интерфейс + 4 реализации. Статусные методы partner/patent — no-op; contract/project — реальные. `resolveOwner` — цепочки из решений. `canStart` — владелец ИЛИ `canEdit(секция)`.
2. `approval-snapshot.service`: `snapshotRouteToProcess` (§4.0) — копия шагов в `approval_process_steps` (денорм. `step_role_code/name/color`), назначенцев в `rel_approval_process_step_assignees` (для `employee`), route-level снапшоты на процесс (`route_code`, `has_approver_final` через `COALESCE(bool_or(...), false)`, `on_complete_actions_snapshot`, `current_process_step_id`).
3. `assignee.resolver`: `employee` (из снапшота), `initiator_head` (рекурсивный CTE по `users.supervisor_id`), `document_owner` (→ handler.resolveOwner), `select_on_start` (из `runtime_data`). `department_head` → ошибка «не поддерживается».
4. `approval-engine.service`:
   - `startApprovalProcess` (§4.1): коллизия (уникальный индекс), `handler.canStart`, валидация `select_on_start`, INSERT process, snapshot, `createAssignmentsForStep(шаг 1)`, `handler.onStart`.
   - `createAssignmentsForStep` (§4.3): UPSERT, `process_step_id`, `position`, сброс SLA-меток; sequential — активен только `position=0`.
   - `makeDecision` (§4.4) с `FOR UPDATE`, проверкой pending+active, INSERT decision, диспатч.
   - Обработчики (§4.5): `approved` (any/all/sequential — активация следующего), `rejected`, `returned_to_step` (guard `can_return_to_previous`), `returned_to_initiator`, `delegated` (guard `can_delegate`, режимы transfer/add — pending делегирующего сбрасывает только transfer).
   - финал: `has_approver_final` из снапшота → `ratified`/`approved`; `handler.onApprove`; `executePostApprovalActions` = **no-op + warn** (F5).
   - `resubmit` / `cancel`.
5. `approval-state.service`: `getDocumentApprovalState` (§3.4) — все `can_*`, `sequential_queue`, `is_overdue`/`deadline_at`, назначенцы всех шагов (POR-264). Фронт ничего не считает.
6. Контроллеры (§3.1/3.2) + DTO + валидация решений (§3.3, вкл. `delegation_mode`). Конструктор — `@RequirePermission(SECTIONS.ADMIN_APPROVAL_ROUTES, …)`; процессы — `requireAuth` + `handler.canStart`.

**Инвариант (критично):** ни один runtime-путь не читает `approval_route_steps`/`rel_approval_step_assignees`/`approval_routes.on_complete_actions` — только снапшот.

**Готовность F1:** процесс стартует, проходит any/all/sequential, возвраты/делегирование/resubmit/cancel работают, финал даёт `approved`/`ratified`, статус договора меняется.

---

## F2 — SLA-шедулер + email-уведомления

1. `services/approval-sla-scheduler.service.ts` — по образцу `hr-sync-scheduler` (`OnModuleInit`+`setInterval` ежечасно + lock-флаг + `onModuleDestroy`, без `@nestjs/schedule`). Дедлайн = `assignment.created_at + time_limit_hours`. Напоминание за 24ч (`reminder_sent_at`), просрочка (`overdue_notified_at`). Метку ставить только при `sent||skipped`; сброс при реактивации назначения. TZ Europe/Moscow.
2. `services/approval-mail.service.ts` — расширить подход `mail.service` (nodemailer + `escapeHtml`). Типы: `approval_assigned`, `document_approved`, `approval_reminder`, `approval_overdue`. **Все отправки после коммита** (`.then().catch()`); пустой email → skipped. Все user-controlled поля экранировать.

**Готовность F2:** назначенцу приходит письмо при назначении; инициатору — при финале; SLA-напоминание и просрочка отправляются один раз, метки сбрасываются при возврате на шаг.

---

## F3 — Frontend: встраивание (панель + модалки + мои задачи)

1. `apps/web/src/api/approvals/` — `approvalApi.ts` + `approvalApiHooks.ts` + `approvalQueryKeys.ts` (3-файловый паттерн; инвалидация `approvalState`/`approvalProcess`/`myTasks` в onSuccess).
2. `components/approvals/ApprovalPanel.tsx` — полиморфная панель (§6.7) по образцу `CommentsList`/`EntityFilesTab` (читает `entityType`+route param). Timeline шагов, sequential-очередь, бейдж «Просрочено», история, кнопки по `DocumentApprovalState`.
3. Встроить таб «Согласование» в details 4 сущностей (`CONTRACT_DETAILS_TABS` и аналоги) + lazy-роуты при необходимости.
4. Модалки через ModalStore dispatch (`ModalStore.ts` тип + `GlobalModals.tsx` MODAL_MAP):
   - `approvalStart` (§6.5): выбор маршрута → `start-info` → выбор согласующих/исполнителей.
   - `approvalDecision` (§6.6): approve/reject/return_to_initiator/return_to_step/delegate (radio transfer/add).
5. `components/employeeSelect/EmployeeSelect.tsx` (+ `EmployeeMultiSelect`) — из `useReferenceData(['users'])` + база `SelectWithQuickAdd`/`UsersMenu`.
6. Страница «Мои согласования» (`my-tasks`/`my-initiated`/`my-participated`) + пункт меню (`layouts/data.tsx`, без `requiredSections` — видна всем авторизованным).

**Готовность F3:** на странице договора можно запустить согласование, согласующий принимает решение, инициатор видит прогресс и лист согласования.

---

## F4 — Frontend: админ-конструктор маршрутов

1. Lazy-роут `/approvals/routes` под `<RequireSection section={SECTIONS.ADMIN_APPROVAL_ROUTES}>` + пункт меню (`requiredSections`).
2. Список маршрутов на базе `ReferenceBookListPage` (фильтр по типу сущности, колонка «шагов», бейдж «По умолчанию», действия).
3. Форма маршрута (§6.2): мета (POST/PUT) → `RouteStepsEditor` → `RouteActionsEditor`; сохранение шагов batch-ом (PUT `/steps`).
4. `RouteStepsEditor` (§6.3) — карточки шагов, **MVP на кнопках вверх/вниз** + вставка; роль/тип согласования/assignment_type/`time_limit_hours`/`can_delegate`/`can_return_to_previous`. Валидация: ≥1 шаг; для `employee` — ≥1 сотрудник.
5. `RouteActionsEditor` (§6.4) — карточки `create_task` (UI готовим, выполнение — F5).

**Готовность F4:** админ создаёт/редактирует маршрут с шагами и сохраняет.

---

## F5 — Задачи-последствия (отложено)

1. Таблица `tasks` (polymorphic `entity_type/entity_id`, `task_type='post_approval'`, `source_type='approval_process'`, `source_id`, исполнитель, `due_date`, приоритет).
2. `executePostApprovalActions` (§4.7) — резолвер исполнителя, подстановка `{number}/{title}/{type}`, создание задач в той же транзакции финала.
3. UI «Мои задачи».

---

## F6 — Тесты и харднинг (чек-лист §8)

- Коллизия старта (вторая попытка падает по индексу).
- approve `any` ≥1 завершает шаг; `all` без кворума не двигает; `sequential` активирует следующего по `position`, финал на последнем.
- `returned_to_step` деактивирует промежуточные; guard `can_return_to_previous`.
- `returned_to_initiator` + `resubmit` → шаг 1.
- delegate `transfer` снимает делегирующего, `add` оставляет обоих; guard `can_delegate`.
- cancel → статус договора обратно в `draft`.
- финал `has_approver_final` → `ratified`/`approved`.
- **Правка маршрута админом не ломает активный процесс** (главный кейс снапшота POR-209).
- SLA: напоминание за 24ч и просрочка — один раз; метки сбрасываются при возврате на шаг.

---

## Последовательность

```
F0 ── F1 ──┬── F2 (SLA + email)
           ├── F3 (frontend embed)
           └── F4 (конструктор)
F5 (tasks) — после F1, в любой момент
F6 — сквозь все фазы
```

## Открытые/перепроверить при старте F0

- `db:generate`: попадают ли частичные индексы; циклический FK — только ручной скрипт.
- ✅ `ref_contract_states` проверены (2026-06-16): нужные состояния есть, миграция статусов не требуется.
- Precondition старта для договора — `code='DRAFT'` (единственный draft).
- Подтвердить: `project` в v1 — статус no-op (рекомендация)?
- Поведение `is_active` договора в статусе `APPROVED` (сейчас попадёт в `false`, т.к. не signed).

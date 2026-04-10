# Оценки поставщиков — источник правды (контекст и реализация)

Этот файл — **единая точка актуальности** по фиче «оценки поставщиков по проекту»: схема БД, ручные скрипты, бизнес-логика, HTTP API и расположение кода.  
При любых изменениях поведения, полей, эндпоинтов или SQL **сначала обновляют этот документ**, затем код/скрипты. Ассистентам и разработчикам брать контекст **отсюда**; детальный DDL таблиц дублируется в [`supplier-evaluations-db-design.md`](./supplier-evaluations-db-design.md) (его §2–4 должны оставаться согласованными с этим файлом).

**Последнее обновление:** 2026-03-24 (добавлен фронтенд).

---

## 1. Что уже сделано

| Область | Состояние |
|--------|-----------|
| Таблицы в PostgreSQL | `ref_supplier_evaluation_criteria`, `supplier_evaluations`, `supplier_evaluation_criterion_scores`, `supplier_partner_project_blocks` (создаются **вручную** в DBeaver или своим DDL; миграции Drizzle Kit для этой фичи не обязательны). |
| Сид критериев | Скрипт [`supplier-evaluations-criteria-seed.sql`](./supplier-evaluations-criteria-seed.sql): 7 критериев с весами как в макете (Тех. опыт 20%, …, сумма 1). Прогон вручную в DBeaver/psql. |
| Индексы | Скрипт [`supplier-evaluations-db-indexes.sql`](./supplier-evaluations-db-indexes.sql): частичный **UNIQUE** на `(partner_id, project_id) WHERE status = 'active'` и прочие индексы. В DBeaver в статистике после прогона обычно **несколько отдельных команд** (например ~10) — это нормально. |
| Drizzle-схема | `apps/backend-nest/src/database/schema.ts` — таблицы и имена индексов в коде. Частичный unique в Drizzle не объявлен; он **только в SQL** (см. скрипт выше). |
| Доменные константы | `apps/backend-nest/src/modules/supplier-evaluations/domain/supplier-evaluation.enums.ts` |
| Правила категорий и дат | `domain/supplier-evaluation.rules.ts` |
| NestJS-модуль | `SupplierEvaluationsModule`, префикс API `/api/supplier-evaluations` |
| Фронтенд (React + Ant Design) | Вкладка **«Оценки»** в карточке контрагента (`/partners/:id/evaluations`): таблица с раскрытием, фильтры, модалка «Новая оценка» (матрица 1–5 с шагом 0.5), снятие блокировки из раскрытия. Сводный **«Реестр оценок»**: меню Закупки → `/supplier-evaluations`. Запросы через `apiClient` (`withCredentials`); тело POST для создания оборачивается в `{ body }` в `apps/web/src/api/clients.ts`. |

---

## 2. Зачем частичный UNIQUE и что делать после добавления индексов

**Зачем:** при параллельных запросах две транзакции могут обе вставить `status = 'active'` на одну пару `(partner_id, project_id)`. Приложение это не всегда предотвращает; **PostgreSQL** с индексом `supplier_evaluations_one_active_per_partner_project` запретит вторую вставку (ошибка уникальности).

**Что делать дальше (после успешного выполнения скрипта индексов):**

1. Убедиться, что в таблице **нет двух `active`** на одну пару (если уже успели накопить мусор — вручную поправить данные, иначе `CREATE UNIQUE INDEX` упадёт).
2. Поднять backend, вызвать `GET /api/supplier-evaluations/criteria` — должны вернуться активные критерии.
3. Подключать **фронт** к API (создание оценки, список, карточка, блокировки).
4. По желанию: перехват `23505` (unique_violation) в сервисе и ответ **409 Conflict** вместо «сырой» ошибки БД.

---

## 3. Бизнес-логика (как в коде)

### 3.1. Взвешенный балл

Для каждой **активной** строки справочника критериев берётся вес `weight` (доли, сумма активных = 1). По телу запроса приходит **ровно один** балл `score` (1…5) на каждый такой критерий.

`weighted_score = round(Σ score_i × weight_i, 2)`.

### 3.2. Категория по баллу (как в UI фильтра)

| Категория | Условие по `weighted_score` |
|-----------|-----------------------------|
| `D` | &lt; 2.0 |
| `C` | ≥ 2.0 и &lt; 3.0 (в UI «2.0–2.9») |
| `B` | ≥ 3.0 и &lt; 4.0 (в UI «3.0–3.9») |
| `A` | ≥ 4.0 |

Реализация: `categoryFromWeightedScore` в `supplier-evaluation.rules.ts`.

### 3.3. Следующая переоценка

От поля `evaluated_at` (дата, YYYY-MM-DD):

- `A`: +12 месяцев  
- `B`: +6  
- `C`: +3  
- `D`: `null`  

Реализация: `nextReevaluationDateForCategory` в `supplier-evaluation.rules.ts`.

### 3.4. Создание новой оценки (переоценка)

В **одной транзакции**:

1. Все строки `supplier_evaluations` с той же парой `(partner_id, project_id)` и `status = 'active'` переводятся в `archived`.
2. Вставляется новая строка со `status = 'active'`, рассчитанными `weighted_score`, `category`, `next_reevaluation_date`, комментарием; `created_by` / `updated_by` — из JWT при наличии.
3. Вставляются строки в `supplier_evaluation_criterion_scores` для каждого критерия.
4. У всех **активных** `supplier_partner_project_blocks` по этой паре `(partner_id, project_id)` выставляется `is_active = false` (в т.ч. после переоценки D→A/B/C, иначе блок остаётся «висящим»).
5. Если `category = 'D'`: вставляется новая строка в `supplier_partner_project_blocks` с `reason = evaluation_category_d` и ссылкой на новую оценку.

Проверки: партнёр и проект существуют и не удалены (`is_deleted = false`); нет дубликатов `criterion_id` в теле; все активные критерии покрыты баллами.

### 3.5. Блокировка

«Заблокирован по проекту» = есть строка в `supplier_partner_project_blocks` с `is_active = true` для пары партнёр+проект. Снятие — отдельный процесс (эндпоинт деактивации по `id` блока).

---

## 4. HTTP API (NestJS)

Базовый путь: **`/api/supplier-evaluations`** (глобальный префикс `api`). Авторизация: как у остальных маршрутов (JWT cookie).

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/criteria` | Список **активных** критериев (матрица). |
| GET | `/blocks?partner_id=&project_id=` | Активная блокировка или `[]`. |
| PUT | `/blocks/:id/deactivate` | Снять блокировку (`is_active = false`). |
| GET | `/partner-eval-summary?partner_id=` | Сводка для карточки контрагента: `avg_score`, `next_reevaluation_date`, `next_reevaluation_overdue` (дата плана &lt; сегодня), `blocked_project_count` (число проектов с активной блокировкой по оценке). |
| GET | `/counts-by-tab` | Счётчики по вкладкам смысла строки. Query: как у списка, кроме `ui_status` и пагинации: `partner_id`, `project_id`, `created_by`, `category`, `evaluated_year`, опционально `evaluated_at_from` / `evaluated_at_to` (`YYYY-MM-DD`, границы включительно). Если задан хотя бы один из `evaluated_at_*`, фильтр по году не применяется. |
| GET | `/` | Список оценок. Query: `partner_id`, `project_id`, `status` = `active` \| `archived` \| `all` (по умолчанию `all` в клиенте реестра), `created_by`, `category`, `evaluated_year`, `evaluated_at_from`, `evaluated_at_to` (см. выше), `ui_status`, `sort_field` = `evaluated_at` \| `weighted_score`, `sort_dir` = `asc` \| `desc`, `limit`, `offset`. Ответ: `{ data, total }`. **Пагинация, фильтры и сортировка списка серверные.** В каждой строке списка поле **`partner_name`**: `short_name`, иначе `name` из `partners` (для реестра без зависимости от `GET /partners?preview=1`). |
| GET | `/:id` | Оценка + массив `scores` (с `criterion_code`, `criterion_name`). Ответ: массив из одного объекта `[row]` (как в других контроллерах проекта). В объекте оценки также **`partner_name`** (как у списка). |
| POST | `/` | Новая оценка. Тело: **`{ "body": { ... } }`** (как у договоров). |

**POST — поля `body`:**

- `partner_id` (uuid), `project_id` (uuid)
- `evaluated_at` (строка `YYYY-MM-DD`)
- `comment` (опционально)
- `scores`: массив `{ "criterion_id": uuid, "score": number }` — по одному на каждый **активный** критерий, 1 ≤ score ≤ 5

Ответы полей в **snake_case** там, где маппинг сделан в сервисе.

---

## 5. Карта файлов в репозитории

```
apps/backend-nest/
  docs/
    supplier-evaluations.md              ← этот файл (источник правды по фиче)
    supplier-evaluations-db-design.md    ← детальный DDL и таблицы
    supplier-evaluations-db-indexes.sql  ← индексы для ручного прогона
  src/database/schema.ts                 ← Drizzle-описание таблиц
  src/modules/supplier-evaluations/
    supplier-evaluations.module.ts
    controllers/supplier-evaluations.controller.ts
    services/supplier-evaluations.service.ts
    domain/supplier-evaluation.enums.ts
    domain/supplier-evaluation.rules.ts
    dto/create-supplier-evaluation.dto.ts

apps/web/
  src/api/supplierEvaluations/
    supplierEvaluationApi.ts
    supplierEvaluationApiHooks.ts
  src/types/supplierEvaluation.ts
  src/pages/partners/evaluations/
    PartnerEvaluationsTab.tsx
    NewSupplierEvaluationModal.tsx
    EvaluationExpandedContent.tsx
    supplierEvaluationUi.tsx             ← бейджи категорий, статусы строк, предпросчёт балла
  src/pages/supplierEvaluations/
    SupplierEvaluationsRegistryPage.tsx
  src/pages/partners/PartnerDetailsPage.tsx  ← вкладка «Оценки», счётчик
  src/routers/AppRoutes.tsx
  src/layouts/data.tsx                     ← пункт меню «Реестр оценок»
```

---

## 6. Что ещё не сделано (бэклог)

- Явная обработка `unique_violation` при гонке → 409 на бэкенде и дружелюбное сообщение на фронте.
- Денормализация в `partners.rating` / `partners.next_audit_date` по решению продукта (см. db-design §5).
- Алерт на вкладке «Основное» при блокировке по проекту (как в макете HTML).

---

## 7. Как поддерживать этот документ

1. Изменили пороги категорий, даты переоценки, состав API, правила блокировки — обновить **§3 и §4** и дату в шапке.  
2. Изменили таблицы или индексы — обновить **§1**, [`supplier-evaluations-db-design.md`](./supplier-evaluations-db-design.md) и при необходимости [`supplier-evaluations-db-indexes.sql`](./supplier-evaluations-db-indexes.sql).  
3. Изменили экраны или маршруты фронта — обновить **§1** (таблица) и **§5** (пути файлов).  
4. Код и документация не должны расходиться: схема Drizzle и этот файл согласованы по именам таблиц и смыслу полей.

---

## 8. Журнал изменений (кратко)

| Дата | Изменение |
|------|-----------|
| 2026-04-10 | В ответах GET `/` и GET `/:id` добавлено поле `partner_name` (из `partners`). |
| 2026-03-24 | Документ создан: сводка по БД, индексам, API, логике; зафиксированы пороги A/B/C/D как в UI. |
| 2026-03-24 | Фронт: вкладка оценок у контрагента, сводный реестр, API-клиент и хуки. |
| 2026-03-24 | Сид критериев по макету (`supplier-evaluations-criteria-seed.sql`), GET `counts-by-tab`, счётчики на вкладках реестра. |
| 2026-03-26 | При создании любой новой актуальной оценки снимаются активные блоки по паре партнёр+проект; при D создаётся блок заново (исправление D→A с «висящей» блокировкой). |
| 2026-03-26 | GET `partner-eval-summary` для KPI в реестре контрагентов (балл, просрочка, число заблокированных проектов). |

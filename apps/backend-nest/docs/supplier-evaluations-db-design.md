# Оценки поставщиков — дизайн БД (зафиксировано)

**Актуальный сквозной контекст фичи** (API, что сделано, что делать дальше, логика в одном месте): [`supplier-evaluations.md`](./supplier-evaluations.md). Этот файл углубляется в **таблицы, поля и SQL**; при расхождении с `supplier-evaluations.md` приоритет у последнего, затем правят оба.

Документ фиксирует таблицы, допустимые значения полей-перечислений и бизнес-правила для последующих миграций и сервисного слоя. Реализация в PostgreSQL: обычные таблицы; перечисления храним как `varchar` с фиксированным набором значений (как в остальном проекте — без `pg_enum`).

---

## 1. Перечисления (значения в БД)

### 1.1. `supplier_evaluations.status` — статус версии оценки

| Значение   | Смысл |
|-----------|--------|
| `active`  | Актуальная оценка по паре (контрагент + проект). В один момент времени не более одной строки `active` на пару. |
| `archived`| Историческая оценка (после проведения новой переоценки предыдущая переводится сюда). |

### 1.2. `supplier_evaluations.category` — категория по итоговому баллу

| Значение | Смысл (правила порогов — в сервисе, см. §3) |
|----------|-----------------------------------------------|
| `A`      | Высокий уровень |
| `B`      | Удовлетворительно |
| `C`      | Повышенный риск, укороченный интервал переоценки |
| `D`      | Критично; триггер блокировки по проекту (см. §4) |

Хранение: `varchar(1)` или `varchar(2)` — в схеме Drizzle задано как `varchar(1)`.

### 1.3. Блокировка

Отдельная сущность (таблица), не enum. Признак «заблокирован по проекту» = есть **активная** строка в `supplier_partner_project_blocks` (`is_active = true`).

Дополнительное поле `reason` — произвольная строка для UI/аудита (например `evaluation_category_d`).

---

## 2. Таблицы

### 2.1. `ref_supplier_evaluation_criteria`

Справочник критериев матрицы (7 строк после сидирования). Актуальные подписи и веса (доли, сумма = 1) — в скрипте [`supplier-evaluations-criteria-seed.sql`](./supplier-evaluations-criteria-seed.sql):

| Порядок | Код (`code`) | Наименование | Вес |
|--------|----------------|--------------|-----|
| 1 | `tech_experience` | Тех. опыт | 0.20 |
| 2 | `knowledge_transfer` | Передача компетенций | 0.15 |
| 3 | `qms` | СМК | 0.15 |
| 4 | `interaction` | Взаимодействие | 0.15 |
| 5 | `autonomy` | Автономность | 0.15 |
| 6 | `quality` | Качество | 0.10 |
| 7 | `timeliness` | Своевременность | 0.10 |

| Колонка        | Тип              | Описание |
|----------------|------------------|----------|
| `id`           | uuid PK          | |
| `code`         | varchar(64) UK   | Стабильный код: `timeliness`, `quality`, … |
| `name`         | varchar(255)     | Подпись в UI |
| `description`  | text, null       | Опционально |
| `weight`       | numeric(6,4)     | Вес в долях; сумма весов **активных** критериев = **1.0000** |
| `sort_order`   | integer          | Порядок в матрице |
| `is_active`    | boolean          | default true |
| `created_at`   | timestamptz      | |
| `updated_at`   | timestamptz      | |

### 2.2. `supplier_evaluations`

Шапка одной проведённой оценки (одна запись = один проход матрицы по контрагенту и проекту).

| Колонка                  | Тип              | Описание |
|--------------------------|------------------|----------|
| `id`                     | uuid PK          | |
| `partner_id`             | uuid             | FK → `partners.id` |
| `project_id`             | uuid             | FK → `projects.id` |
| `status`                 | varchar(20)      | `active` \| `archived` |
| `weighted_score`         | numeric(5,2)     | Итог 1.00–5.00 (шкала как в ТЗ; уточнить при реализации UI) |
| `category`               | varchar(1)       | `A` \| `B` \| `C` \| `D` |
| `evaluated_at`           | date             | Дата оценки (как в сценарии «выбрать дату») |
| `next_reevaluation_date` | date, null       | След. переоценка; для `D` при блокировке — `null` |
| `comment`                | text, null       | Комментарий к оценке |
| `created_by`             | uuid, null       | |
| `updated_by`             | uuid, null       | |
| `created_at`             | timestamptz      | default now |
| `updated_at`             | timestamptz      | |

**Инвариант:** не более одной строки со `status = 'active'` на (`partner_id`, `project_id`).  
Рекомендуемый SQL после создания таблицы:

```sql
CREATE UNIQUE INDEX supplier_evaluations_one_active_per_partner_project
  ON supplier_evaluations (partner_id, project_id)
  WHERE status = 'active';
```

Готовый скрипт с этим индексом (и остальными рекомендуемыми, с `IF NOT EXISTS`): [`supplier-evaluations-db-indexes.sql`](./supplier-evaluations-db-indexes.sql). Кратко, **зачем частичный unique**: только он гарантирует отсутствие двух строк `active` на одну пару при гонках параллельных запросов; проверки только в приложении этому не эквивалентны.

### 2.3. `supplier_evaluation_criterion_scores`

Баллы по критериям для одной оценки.

| Колонка         | Тип        | Описание |
|-----------------|------------|----------|
| `id`            | uuid PK    | |
| `evaluation_id` | uuid       | FK → `supplier_evaluations.id` |
| `criterion_id`  | uuid       | FK → `ref_supplier_evaluation_criteria.id` |
| `score`         | numeric(4,2) | Балл по критерию (диапазон как в UI, напр. 1–5) |
| `created_at`    | timestamptz | |

Уникальность: (`evaluation_id`, `criterion_id`).

### 2.4. `supplier_partner_project_blocks`

Блокировка контрагента **в разрезе проекта** (сценарий категории D).

| Колонка                 | Тип           | Описание |
|-------------------------|---------------|----------|
| `id`                    | uuid PK       | |
| `partner_id`            | uuid          | FK → `partners` |
| `project_id`            | uuid          | FK → `projects` |
| `source_evaluation_id`  | uuid, null    | Оценка, из-за которой выставлена блокировка |
| `reason`                | varchar(64), null | Напр. `evaluation_category_d` |
| `is_active`             | boolean       | default true; снятие блокировки — `false` |
| `created_at`            | timestamptz   | |
| `updated_at`            | timestamptz   | |

При появлении новой активной блокировки по той же паре политику (одна активная запись vs история) задаёт сервис; минимально — искать `is_active = true` для (`partner_id`, `project_id`).

---

## 3. Правила категории и даты следующей переоценки (сервисный слой)

Фиксируется в коде (конфиг/константы), не в CHECK в БД (чтобы менять без миграций):

- После расчёта `weighted_score` назначается `category` по порогам (как в UI: фильтр по категориям):
  - `A`: балл **≥ 4.0**
  - `B`: **≥ 3.0** и **&lt; 4.0** (3.0–3.9 в подписи UI)
  - `C`: **≥ 2.0** и **&lt; 3.0** (2.0–2.9)
  - `D`: **&lt; 2.0**
- `next_reevaluation_date` от `evaluated_at`:
  - `A`: +12 мес.
  - `B`: +6 мес.
  - `C`: +3 мес.
  - `D`: `null`, создаётся/обновляется блокировка (§4).

Денормализация: при сохранении актуальной оценки можно обновлять `partners.rating` и `partners.next_audit_date` для быстрого реестра (как сейчас в карточке контрагента) — отдельная задача.

---

## 4. Блокировка при D

При сохранении оценки с `category = 'D'`:

1. Вставить или активировать строку в `supplier_partner_project_blocks` для (`partner_id`, `project_id`).
2. Не создавать `next_reevaluation_date` (или хранить `null`).

Снятие блокировки — отдельный бизнес-процесс (ручное или по новой оценке выше порога — по решению продукта).

---

## 5. Связь с существующими полями `partners`

- `partners.rating`, `partners.next_audit_date` остаются; агрегат по всем проектам/последней оценке задаётся в приложении.
- Удаление контрагента (soft) не трогает оценки в первой итерации; при необходимости — каскадная политика позже.

---

## 6. Миграции

1. Создать таблицы в порядке: `ref_supplier_evaluation_criteria` → `supplier_evaluations` → `supplier_evaluation_criterion_scores` → `supplier_partner_project_blocks`.
2. Выполнить `CREATE UNIQUE INDEX ... WHERE status = 'active'`.
3. Сидировать 7 критериев с весами (сумма = 1).

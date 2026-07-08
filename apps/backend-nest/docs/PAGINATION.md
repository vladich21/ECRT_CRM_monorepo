# Пагинация и фильтрация API

## Что реализовано на бэкенде, что на фронте

| Функция | Где реализовано | Описание |
|--------|------------------|----------|
| **Пагинация** (страницы, размер страницы) | **Бэкенд** (contracts, patents, …) | Запрос с `limit` и `offset`; ответ `{ data, total }`. |
| **Список пользователей** | **Один запрос + клиент** | `GET /users?all=1` — вся выборка без `LIMIT`; на фронте кэш и клиентская пагинация/фильтры. |
| **Фильтрация** (patents) | **Бэкенд** | `GET /patents`: `search`, `department_id`, `status_id`, `author_ids` (через запятую), `created_by`, `deleted_scope` (`active` / `deleted` / `all`). Ответ включает `tab_counts`. |
| **Фильтрация** (partners) | **Бэкенд** | `GET /partners`: плюс `deleted_scope` (`active` / `deleted` / `all`), мягкое удаление. Ответ: `tab_counts` + `deletion_tab_counts`. Восстановление: `PUT /partners/:id/restore`. |
| **Фильтрация** (contracts) | **Бэкенд** | `GET /contracts`: плюс `deleted_scope`. Ответ: `tab_counts` + `deletion_tab_counts`. `PUT /contracts/:id/restore`. Справочники/превью — только строки с `is_deleted=false`. |
| **Список проектов** | **Бэкенд** | `GET /projects` (без `preview`): плюс `deleted_scope`. Ответ `{ data, total, tab_counts, deletion_tab_counts }`. `PUT /projects/:id/restore`. Справочник: `GET /projects?preview=1` (без удаленных). |

---

## Пагинация на бэкенде (реализация)

- **Контракт:** query-параметры `limit` и `offset`.
- **Дефолты:** `limit=50`, `offset=0` для всех списков (users, contracts, patents).
- **Максимум:** `limit` не более **100** (см. `parsePagination`), кроме режима **`all=1`** для users.
- **Ответ списка users:** `{ data: User[], total: number }`. С **`all=1`** в `data` попадают все строки, удовлетворяющие `preview`; пагинация в UI — в браузере.
- **Комментарии:** сейчас без limit/cap (отдает все комментарии по сущности).

Эндпоинты: `GET /users`, `GET /contracts`, `GET /patents`, `GET /patents/deleted`, `GET /comments`.

### Цепочка на бэкенде (users)

1. **Контроллер** (`users.controller.ts`): если **`all=1`** (или `all=true`) — в сервис уходит **без** пагинации; иначе `parsePagination(limit, offset)` (дефолт 50, макс. 100).
2. **Сервис** (`users.service.ts`): `total` через `count()`; выборка — либо **без** `.limit()/.offset()` (режим «все»), либо с пагинацией.

### Цепочка на фронте (список пользователей)

1. **Запрос:** `useUsers(2, true)` → `GET /users?preview=2&full=1&all=1`. Ключ кэша: `['users', 'full-list', 2, true]`.
2. **Фильтры и поиск:** `useFilteredUsers` по полному загруженному массиву (после табов «Все / Активные / Неактивные»).
3. **Пагинация:** Ant Design `Pagination` по **отфильтрованному** списку (`slice` на клиенте), без повторных запросов при смене страницы.

### Patents (`GET /patents`, `GET /patents/deleted`)

- **Параметры:** `preview`, `deleted_scope` (`active` \| `deleted` \| `all`), `search`, `department_id`, `status_id`, `author_ids`, `created_by`, `limit`, `offset`. Фильтр по корзине удаленных — только `deleted_scope=deleted` (отдельного query `is_deleted` нет).
- **Ответ (не preview):** `{ data, total, tab_counts: { active, deleted, all } }` — счетчики вкладок с теми же фильтрами поиска/модалки (без двойного клиентского фильтра).
- **Фронт:** хук `usePatentsList`, debounce поиска, `placeholderData` в React Query.

## Как проконтролировать, что проблема решена

Ниже — чеклист и примеры. Бэкенд должен быть запущен; для запросов к API нужна авторизация (cookie или заголовок с токеном). Базовый URL — например `http://localhost:3000/api` (подставь свой).

### 1. Юнит-тест логики пагинации

```bash
cd apps/backend-nest
npm run test:pagination
```

Or from monorepo root: `npm run check:backend` (build + pagination tests).

Expected: `Pagination tests passed.` and 4 passing tests.

---

### 2. Чеклист по эндпоинтам (ручная проверка)

Проверь в DevTools (вкладка Network) или через curl/Postman.

| Эндпоинт | Что проверить | Ожидаемый результат |
|----------|----------------|---------------------|
| **GET /api/users** | Запрос без `limit`/`offset` | В ответе **не больше 50** записей в `data`, плюс поле `total`. Формат: `{ data: [...], total: number }`. |
| **GET /api/users** | Запрос `?limit=10&offset=0` | Ровно **10** записей в `data`, `total` без изменений. |
| **GET /api/users** | Запрос `?limit=10&offset=10` | Следующие **10** записей (другие id, не те что в offset=0). |
| **GET /api/users** | Запрос `?limit=200` | В ответе **не больше 100** записей (cap). |
| **GET /api/contracts** | Без параметров | В ответе **не больше 50** записей в `data`, плюс поле `total`. Формат: `{ data: [...], total: number }`. |
| **GET /api/contracts** | `?limit=5&offset=0` | Ровно **5** записей в `data`, `total` без изменений. |
| **GET /api/patents** | Без параметров | **Не больше 50** элементов. |
| **GET /api/patents** | `?limit=5` | Ровно **5** элементов. |
| **GET /api/patents/deleted** | Без параметров | **Не больше 50** элементов. |
| **GET /api/comments** | `?entity_type=...&entity_id=...` | Возвращает все комментарии по сущности (сейчас без cap). |

Если все пункты выполняются — выборки ограничены, «тянуть всех» эндпоинты больше не могут.

---

### 3. Примеры curl (подставь свой HOST и при необходимости cookie/токен)

**Users** (ответ должен быть объект с `data` и `total`, в `data` — не более limit записей):

```bash
# Дефолт: до 50 записей + total
curl -s "http://localhost:3000/api/users?preview=2&full=1" -H "Cookie: ..." | jq '{ count: (.data | length), total }'

# Ровно 10 записей
curl -s "http://localhost:3000/api/users?preview=2&full=1&limit=10&offset=0" -H "Cookie: ..." | jq '{ count: (.data | length), total }'

# Следующая страница (другие id)
curl -s "http://localhost:3000/api/users?preview=2&full=1&limit=10&offset=10" -H "Cookie: ..." | jq '.data[0].id'
```

**Contracts** (ответ должен быть объект с `data` и `total`, в `data` — не более limit записей):

```bash
curl -s "http://localhost:3000/api/contracts" -H "Cookie: ..." | jq '{ count: (.data | length), total }'
curl -s "http://localhost:3000/api/contracts?limit=5&offset=0" -H "Cookie: ..." | jq '{ count: (.data | length), total }'
```

**Patents** и **comments** — аналогично: без параметров — не больше 50 (для comments — 100), с `limit=5` — ровно 5.

---

### 4. Проверка на фронте (список пользователей)

1. Открой страницу списка пользователей (например `/users`).
2. Открой DevTools → Network, обнови страницу.
3. Найди запрос к `GET .../api/users`. В query должны быть `limit` и `offset` (например `limit=50&offset=0`).
4. В ответе: тело в формате `{ data: [...], total: N }`. В `data` — не больше 50 записей.
5. Перейди на страницу 2: должен уйти запрос с `offset=50` (или с `offset=pageSize`). В `data` придут следующие 50 записей.

Если все так — пагинация на бэкенде и фронте работает, проблема с «без limit» закрыта.

## Готовность к проду

- Запросы с `limit` и `offset` получают из БД ровно запрошенный диапазон (с учетом cap).
- Без параметров — стабильные дефолты, нагрузка на БД ограничена.
- Реализация корректна для выката в прод; при числе записей &gt; 50 на списках стоит запланировать доработку UI (пагинация/«еще»).

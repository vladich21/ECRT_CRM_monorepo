# NestJS — инструкция для AI/разработчиков (PMDB / srn-monorepo)

> Адаптация универсального NestJS-промпта под **наш** стек. Использовать при рефакторинге и code review `apps/backend-nest`.

## Контекст проекта

| Параметр | Значение |
|----------|----------|
| Monorepo | `srn-monorepo`, workspace `apps/backend-nest` |
| NestJS | **11.x** |
| ORM | **Drizzle** (`drizzle-orm` + `pg`), **не** TypeORM/Prisma |
| БД | PostgreSQL |
| Auth | JWT в httpOnly cookie (`jose`), RBAC через `PermissionsGuard` |
| Валидация | `class-validator` + global `ValidationPipe` (`whitelist`, `transform`) |
| Тесты | `node --test` + `tsx` (pagination); Jest **не** подключён |
| Quality gate | `npm run check:backend` (build + pagination tests) |

Документы: `apps/backend-nest/docs/ARCHITECTURE.md`, `AUTH.md`, `PAGINATION.md`.

---

## Ожидаемый формат ответа AI

1. **Подход** — кратко, почему выбран (модуль/DI/Drizzle/разделение service).
2. **Код** — с комментариями на русском только для неочевидной бизнес-логики.
3. **Пояснения** — что делает каждый блок.
4. **Команды** — если нужны пакеты или `npm run check:backend`.
5. **Улучшения** — альтернативы (Swagger, mapper, вынос fat service).

---

## Обязательные паттерны (наш код)

### Модуль

```
modules/<domain>/
├── <domain>.module.ts
├── controllers/       # только HTTP + guards + DTO
├── services/          # бизнес-логика + Drizzle
├── dto/
├── domain/            # чистые rules/enums
└── *.mapper.ts        # row → API (по необходимости)
```

### Controller

- `@RequirePermission` / `@RequireAnyPermission` где нужно.
- `@Body('body')` для legacy-контрактов с обёрткой `{ body: … }`.
- **Без** `this.db`, **без** SQL.

### Service

- Inject `DatabaseService`, другие domain-services через constructor.
- Типы: `typeof table.$inferSelect` / `$inferInsert`.
- **Без** `as any`; `Record<string, unknown>` только на границе legacy API → сразу map в DTO.
- Fat service **> ~500 строк** → `-export.service`, `-derived-status.service`, `-list-query.ts`.
- Транзакции: `this.db.db.transaction(async (tx) => …)`.

### API-контракты

- Списки: `{ data, total }` + при необходимости `tab_counts`, `deletion_tab_counts`.
- Пагинация: `parsePagination(limit, offset)` — max 100.
- Soft delete: `deleted_scope`, `PUT …/restore`.

### Именование

- Файлы: `kebab-case` (`partner-export.service.ts`).
- Классы: `PascalCase` + суффикс `Controller` | `Service` | `Module` | `Dto`.

---

## Запрещено

- `new SomeService()` вместо DI.
- Бизнес-логика в controller.
- Игнорирование `ConflictException` / `BadRequestException` на FK/unique.
- Чтение runtime approval-маршрута из шаблонных таблиц (только snapshot).
- Коммиты без явного запроса пользователя.

---

## Чеклист ревью (пройтись по модулю)

- [ ] Controller < 200 строк, только делегирование
- [ ] DTO с class-validator на POST/PUT
- [ ] `$inferInsert` / mapper для ответов
- [ ] Нет `any` в service
- [ ] Export/фильтры/derive вынесены при росте файла
- [ ] `npm run check:backend` зелёный
- [ ] Документация обновлена при смене API

---

## Текущий техдолг (актуально на 2026-06-10)

| Приоритет | Задача | Статус |
|-----------|--------|--------|
| P1 | `partner-derived-status.service.ts`, `partner-list-query.ts` | ✅ |
| P1 | `partner-export.service.ts` | ✅ |
| P1 | `patent-export.service.ts` | ✅ |
| P1 | F-V2 `snapshotFilesToNextVersion` | ✅ (`approval-files.service.ts`) |
| P2 | `patent-list-query.service.ts` (фильтры в `patents.service.ts`) | открыто |
| P2 | Swagger, eslint/prettier backend | открыто |
| P2 | F5 post-approval tasks | открыто |
| P2 | Jest/e2e для approvals | открыто |

---

## Отладка

Запрашивать: полный stack trace, endpoint, body, `deleted_scope`/pagination query.

Анализировать **корень** (FK, unique index, guard, порядок модулей с Files catch-all).

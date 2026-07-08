# Архитектура backend-nest

Последнее обновление: 2026-06-10.

Структура следует рекомендациям NestJS: **модуль = домен**, внутри — controller / service / dto. Бизнес-логика только в services; controllers валидируют вход и делегируют.

Ориентиры: [NestJS Modules](https://docs.nestjs.com/modules), [Providers & services](https://docs.nestjs.com/providers), [DTO + ValidationPipe](https://docs.nestjs.com/techniques/validation).

---

## Дерево проекта

```
src/
├── app.module.ts          # корневой модуль, глобальные guards/filters
├── main.ts                # bootstrap, prefix /api, CORS, ValidationPipe
├── common/                # инфраструктура без домена
│   ├── controllers/       # health, hello
│   ├── filters/           # HttpExceptionFilter
│   ├── pagination.ts      # parsePagination (limit/offset)
│   └── deleted-scope.ts   # deleted_scope для реестров
├── shared/dto/            # переиспользуемые DTO (пагинация)
├── database/              # Drizzle schema, DatabaseService
└── modules/               # бизнес-домены (см. таблицу ниже)
```

---

## Модули (домены)

| Модуль | Назначение | API-префикс (типично) |
|--------|------------|------------------------|
| auth | JWT cookie, 2FA, пароли | `/auth` |
| users, departments, positions, roles | HR-справочники | `/users`, `/departments`, … |
| contracts | Договоры, этапы | `/contracts` |
| partners | Контрагенты, контакты, scoring | `/partners` |
| projects | Проекты | `/projects` |
| patents, patent-grants, patent-* | РИД, охранные документы | `/patents`, `/patent-grants`, … |
| supplier-evaluations | Оценки поставщиков | `/supplier-evaluations` |
| approvals | Согласования (движок v2) | `/approvals` |
| files | Загрузка/скачивание, версии | `/files` |
| comments | Комментарии к сущностям | `/comments` |
| permissions, admin-rbac, impersonation | RBAC | `/permissions`, `/admin-rbac`, … |
| hr-sync, partner-sync | Фоновые синхронизации | — (schedulers) |
| contract-states, contract-types, … | Справочники закупок | `/contract-states`, … |
| partner-statuses, partner-types, … | Справочники контрагентов | `/partner-*` |

**Порядок модулей в `app.module.ts` важен:** `ApprovalsModule` регистрируется **до** `FilesModule` (catch-all route `GET /:entityType/:entityId/:filename`).

---

## Слои внутри модуля (паттерн)

```
modules/<domain>/
├── <domain>.module.ts
├── controllers/     # @Controller, @Body/@Query, guards — без SQL
├── services/        # бизнес-логика, Drizzle, транзакции
├── dto/             # class-validator, контракт API
├── domain/          # чистые правила (enums, rules без Nest)
└── *.mapper.ts      # map DB row → API (где выделено явно)
```

### Правила

1. **DTO-first:** наружу — DTO/plain objects из `toResponse` / mapper, не сырые Drizzle rows.
2. **Controllers:** маршрутизация + `@UseGuards` + `@RequirePermission`; без `this.db`.
3. **Services:** один основной service на домен; при > ~500 строк — вынос вспомогательных service (export, derived-status, list-query).
4. **Транзакции:** `this.db.db.transaction(async (tx) => { … })` для связанных записей (approvals).
5. **Типизация Drizzle:** `typeof table.$inferSelect` / `$inferInsert` вместо `as any`.
6. **Пагинация:** `parsePagination` из `common/pagination.ts`; ответ `{ data, total }` (+ tab_counts где нужно). См. `docs/PAGINATION.md`.
7. **Мягкое удаление:** `deleted_scope` + `PUT …/restore` для partners, contracts, projects, patents.

### Когда выносить из «толстого» service

| Признак | Куда выносить |
|---------|----------------|
| Excel/export, тяжёлые join | `<domain>-export.service.ts` |
| Авто-деривация статусов | `<domain>-derived-status.service.ts` |
| SQL фильтры реестра | `<domain>-list-query.ts` или builder |
| Map row → API | `<domain>.mapper.ts` |

Пример: `partners` — `PartnerExportService`, `PartnerDerivedStatusService`, `PartnerListQueryService`; основной `PartnersService` (CRUD + list orchestration).

---

## Cross-cutting

| Компонент | Где |
|-----------|-----|
| JwtGuard | глобальный APP_GUARD |
| PermissionsGuard | глобальный APP_GUARD |
| HttpExceptionFilter | глобальный APP_FILTER |
| ValidationPipe | `main.ts` (whitelist, transform) |
| EventEmitter | approvals notifications |

---

## Документация по фичам

| Тема | Файл |
|------|------|
| Auth | `docs/AUTH.md` |
| AI/review промпт | `docs/backend/nestjs-agent-guidelines.md` |
| Пагинация | `docs/PAGINATION.md` |
| Согласования | `docs/approvals/implementation-plan.md` (repo root) |
| Версии файлов | `docs/approvals/file-versioning-plan.md` |
| Оценки поставщиков | `docs/supplier-evaluations.md` |

---

## Quality gate (backend)

```bash
npm run check:backend   # из корня monorepo
# = nest build + test:pagination
```

Дальше (P2): eslint/prettier, Swagger (`@nestjs/swagger`), интеграционные тесты approvals.

---

## Swagger

OpenAPI пока не подключён. При добавлении — `@nestjs/swagger` в `main.ts` + `@ApiTags` на controllers.

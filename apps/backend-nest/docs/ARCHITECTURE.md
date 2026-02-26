Архитектура backend-nest

Структура проекта следует принципам из статьи «NestJS Backend: опыт, архитектура и лучшие практики».

Структура папок

src/
├── modules/            Бизнес-домены (один домен = один модуль)
│   ├── users/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── users.module.ts
│   ├── departments/
│   ├── positions/
│   └── roles/
├── shared/             Общие бизнес-типы и DTO
│   └── dto/
│       ├── paginate.dto.ts
│       └── paginated-result.dto.ts
├── common/             Инфраструктурный слой
│   ├── filters/       HttpExceptionFilter
│   ├── utils/         getEnvVar и др.
│   ├── dto/           HelloResponseDto, health-check
│   └── controllers/   AppController
├── database/           Drizzle schema, DatabaseService
└── app.module.ts

Принципы

- controllers/ — только маршрутизация и валидация, без бизнес-логики
- services/ — бизнес-логика, работа с БД
- dto/ — контракт API, entity наружу не возвращаем (DTO-first)
- shared/ — переиспользуемые DTO (пагинация, идентификаторы)
- common/ — фильтры ошибок, утилиты, health-check

Эндпоинты

- `GET /api` — приветствие
- `GET /api/health` — health-check для мониторинга
- `GET /api/users`, `GET /api/users?preview=1`, `GET /api/users/:id`
- `GET /api/departments`, `GET /api/departments?preview=1`, `GET /api/departments/:id`
- `GET /api/positions`, `GET /api/positions?preview=1`, `GET /api/positions/:id`
- `GET /api/roles`, `GET /api/roles?preview=1`, `GET /api/roles/:id`

Swagger

Для добавления документации API установите `@nestjs/swagger` и настройте в `main.ts`:

npm install @nestjs/swagger

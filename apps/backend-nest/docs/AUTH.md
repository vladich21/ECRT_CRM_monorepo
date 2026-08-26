# Авторизация — актуальное описание

Последнее обновление: март 2026. Это единственный файл с описанием авторизации.

---

## Стек

| Слой | Решение |
|------|---------|
| Хеширование паролей и кодов | `argon2id` (memoryCost 64MB, timeCost 3, parallelism 4) |
| JWT | `jose` (HS256), срок 3 дня |
| Хранение JWT | httpOnly cookie `pmdb_auth_token` |
| Email | `nodemailer` + SMTP (Mailhog в dev) |
| Rate limiting | in-memory Map, 5 попыток / 15 мин по IP |

---

## База данных

### Таблица `users` — поля авторизации

| Колонка | Тип | Назначение |
|---------|-----|-----------|
| `email` | VARCHAR | Логин. По нему ищем пользователя, на него шлем коды. |
| `password_hash` | VARCHAR NULL | argon2id хеш. NULL = первый вход, пароль не задан. |
| `must_change_password` | BOOLEAN DEFAULT false | true = пользователь обязан сменить пароль. |
| `two_factor_enabled` | BOOLEAN NULL | Резерв для будущей admin-панели (сейчас игнорируется — 2FA всегда включен). |
| `last_login_at` | TIMESTAMPTZ NULL | Время последнего входа. |
| `is_active` | BOOLEAN | false = вход запрещен. |

### Таблица `auth_codes` — одноразовые коды

| Колонка | Тип | Назначение |
|---------|-----|-----------|
| `id` | UUID PK | — |
| `user_id` | UUID FK → users CASCADE | Кому принадлежит код. |
| `code_hash` | VARCHAR | argon2id хеш кода. Сам код в БД не хранится. |
| `type` | VARCHAR | `temp_password` — первый вход; `2fa` — двухфакторный. |
| `expires_at` | TIMESTAMPTZ | TTL 10 минут. |
| `used_at` | TIMESTAMPTZ NULL | Заполняется при использовании. Повторный ввод невозможен. |
| `created_at` | TIMESTAMPTZ | Дата создания. |

---

## Сценарии входа

### Сценарий 1: Первый вход (password_hash = NULL)

```
[Ввод email] → нет пароля
  → sendCode(type='temp_password') → отправка 6-значного кода на email
  → [Ввод кода] → verifyCode() → must_change_password = true
  → [Установка пароля] → argon2.hash() → password_hash = hash, must_change_password = false
  → finishLogin() → JWT в cookie → ✅ Вход
```

2FA при первом входе не нужна — email уже подтвержден через код.

### Сценарий 2: Обычный вход (password_hash заполнен)

```
[Ввод email] → есть пароль
  → [Ввод пароля] → argon2.verify()
      ├── Неверный → 401 "Неверный email или пароль"
      ├── must_change_password = true → [Установка пароля] → [2FA] → ✅ Вход
      └── OK → sendCode(type='2fa') → [Ввод 2FA-кода] → ✅ Вход
```

2FA обязателен при каждом обычном входе.
Когда появится admin-панель — добавить `if (user.twoFactorEnabled !== false)` в `auth.service.ts → verifyPassword`.

---

## Сессия

- Cookie `pmdb_auth_token`, httpOnly, sameSite=lax, maxAge 3 дня
- Автопродление: если до истечения < 24 ч — `JwtGuard` перевыпускает токен на 3 дня (`renewToken`)
- При выходе (`POST /api/auth/logout`) cookie очищается

---

## API эндпоинты

| Метод | Путь | Rate limit | Описание |
|-------|------|-----------|---------|
| POST | `/api/auth/check` | нет | Проверить email. Если нет пароля — отправить temp-код. |
| POST | `/api/auth/login` | 5/15мин | Проверить пароль. Если OK — отправить 2FA-код. |
| POST | `/api/auth/verify-temp-code` | нет | Проверить temp-код (первый вход). |
| POST | `/api/auth/verify-2fa` | 5/15мин | Проверить 2FA-код. Выдать JWT. Сбросить rate limit. |
| POST | `/api/auth/set-password` | нет | Установить постоянный пароль. Выдать JWT. |
| GET  | `/api/auth/me` | — | Текущий пользователь (защищен). |
| POST | `/api/auth/logout` | — | Очистить cookie (защищен). |

---

## Ключевые файлы

```
apps/backend-nest/src/modules/auth/
├── auth.service.ts       — вся логика (checkEmail, verifyPassword, verify2fa, setPassword, JWT)
├── auth.controller.ts    — эндпоинты
├── auth.module.ts        — конфигурация модуля
├── jwt.guard.ts          — проверка cookie + автопродление
├── rate-limit.guard.ts   — 5 попыток / 15 мин по IP
├── mail.service.ts       — отправка кодов через nodemailer
├── public.decorator.ts   — @Public() — пометить эндпоинт как открытый
└── dto/                  — CheckEmailDto, VerifyPasswordDto, VerifyCodeDto, SetPasswordDto

apps/web/src/pages/auth/
├── LoginPage.tsx         — UI многошаговой формы входа
├── LoginFormFields.tsx   — поля формы по шагу
├── LoginPage.types.ts    — типы, константы, подписи кнопок

apps/web/src/api/auth/
└── authApi.ts            — axios-вызовы к /api/auth/*

apps/web/src/api/clients.ts
                          — apiClient: withCredentials + перехват 401 (без редиректа для /auth/*)
```

---

## Переменные окружения (backend)

| Переменная | Описание |
|-----------|---------|
| `JWT_SECRET` | Секрет подписи JWT, мин. 32 символа |
| `PORT` | Порт сервера (default 9001) |
| `FRONTEND_URL` | Разрешенные origins для CORS, через запятую |
| `DATABASE_URL` | PostgreSQL connection string |
| `SMTP_HOST` | SMTP-сервер (Mailhog: 192.0.2.12, порт 1025) |
| `SMTP_PORT` | SMTP-порт |
| `SMTP_SECURE` | true для TLS (false в dev) |
| `SMTP_USER` | Логин SMTP |
| `SMTP_PASSWORD` | Пароль SMTP |
| `SMTP_FROM` | Адрес отправителя |

---

## Задать пароль пользователю вручную (dev)

```bash
cd apps/backend-nest
npx ts-node scripts/set-password.ts vladislav.koval@ecrt.ru НовыйПароль1
```

Скрипт хеширует argon2id и пишет в `users.password_hash`, сбрасывает `must_change_password = false`.

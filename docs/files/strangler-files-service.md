# Переезд файлов на files-service (strangler / «удавка»)

Как выпиливать хранение байтов из монолита SRN **без** big-bang миграции.

## Идея

Не «всё вырезать и переписать», а **обернуть** старый путь новым:

```text
Фронт ──► SRN (права, entity, UI-метаданные в pmdb.files)
              │
              │  новые загрузки: HTTP Bearer
              ▼
         files-service (байты, версии, SHA, tus)
```

Старые файлы (`storage_backend = local`, диск `UPLOAD_PATH`) продолжают отдаваться как раньше.

## Фазы

| Фаза | Что | Статус в коде |
|------|-----|----------------|
| **0** | Поднять files-service локально | вне SRN |
| **1** | Мост: колонки + HTTP-клиент + `POST /upload/prepare` + `complete` | сделано |
| **1b** | Удаление: `FilesRemoteClient.deleteFile` + `DELETE` сущности в pmdb | сделано |
| **2** | UI: tus на фронте для новых загрузок | сделано |
| **2b** | Remote INSERT без переклейки local; rollback orphan; `size` bigint | сделано |
| **3** | Dual-read; согласования через files-service если ключ задан | сделано |
| **4** | Мигратор старых байтов (`scripts/files/migrate-local-to-files-service.ts`) | сделано (dry-run / --apply) |
| **5** | Выпил `UPLOAD_PATH` после пустого local на stage | позже |
| **6** | Портал (ключ `portal`, клиент, мигратор) | после стабильного PMDB |

## Что уже в репо

- SQL: `scripts/files/01_files_service_bridge.sql` → колонки `storage_backend`, `external_file_id`, `external_version_id`
- SQL: `scripts/files/02_files_size_bigint.sql` → `files.size` bigint (лимит 10 ГиБ)
- `FilesRemoteClient` — HTTP + серверный tus (`ingestBuffer`)
- `POST /api/upload/prepare` — INSERT новой строки каталога (не upsert поверх local)
- `POST /api/upload/complete/:fileId` — дождаться `ready`, обновить size
- UI (`fileApi.uploadFiles`) — prepare → tus на `tusEndpoint` → complete
- `GET /api/files/:id` — для `files_service` редирект на `/dl/...`, для `local` — диск
- Согласования: при `FILES_SERVICE_URL` keep/новые файлы раунда идут в files-service
- Мигратор: `npx tsx scripts/files/migrate-local-to-files-service.ts` (по умолчанию dry-run)

## Локальный прогон на pmdb

1. files-service up (`http://127.0.0.1:3080`, smoke OK).
2. Накатить SQL на свою pmdb (stage/local):

```bash
psql "$DATABASE_URL" -f scripts/files/01_files_service_bridge.sql
psql "$DATABASE_URL" -f scripts/files/02_files_size_bigint.sql
# без psql (Windows): node scripts/files/apply-size-bigint.mjs
```

3. В `apps/backend-nest/.env.development` (не коммитить ключ):

```env
FILES_SERVICE_URL=http://127.0.0.1:3080
FILES_API_KEY=<ключ из npm run key:issue -- --consumer pmdb>
```

Ключ из `FILES_API_KEYS` files-service тоже принимается (потребитель `legacy`). Для изоляции PMDB/портала нужен ключ из `key:issue`.

4. Запустить backend-nest, с JWT вызвать:

```http
POST /api/upload/prepare
{ "entityType": "contract", "entityId": "<uuid>", "filename": "test.pdf", "contentType": "application/pdf" }
```

Ответ: `file` (строка pmdb) + `remote.upload` (tusEndpoint + metadata).

5. Залить байты tus-ом на `remote.upload.tusEndpoint` (как в files-service README / smoke).

6. `POST /api/upload/complete/:fileId` → `remoteStatus: ready` + `downloadUrl`.

7. Удаление из UI (`DELETE /api/:entityType/:entityId/files/:fileId`) мягко удаляет байты в files-service и строку в `pmdb.files`. Список в UI по-прежнему из `pmdb.files` (права/секции). Листинг files-service (`GET /api/v1/files?entityType=&entityId=`) — сверка на стороне сервиса, не замена UI.

## Старые и новые файлы

| | Где байты | Скачивание |
|---|---|---|
| **Уже лежали в PMDB** (`storage_backend = local`) | диск `UPLOAD_PATH`, пока не прогнан мигратор | `GET /api/files/:id` с диска |
| **После мигратора / новая загрузка** | files-service | редирект на `/dl/...` |

Мигратор **не удаляет** файлы с диска PMDB и **не дропает** таблицу `files`.
`--apply` запускать **на хосте, где лежит `UPLOAD_PATH`** (stage-диск). С ноутбука без этих байтов почти всё будет `MISSING`; проставлять `files_service` на stage, указывая на локальный `127.0.0.1:3080`, нельзя — скачивание с других машин сломается.

```bash
# из корня srn-monorepo (по умолчанию dry-run)
npx tsx scripts/files/migrate-local-to-files-service.ts
# один файл на хосте с диском
npx tsx scripts/files/migrate-local-to-files-service.ts --apply --limit 1
```

## CORS / PUBLIC_BASE_URL (браузерный tus)

Браузер льёт байты **напрямую** на `tusEndpoint` из ответа prepare (`PUBLIC_BASE_URL` files-service). Бэкенд PMDB тут не проксирует.

- `PUBLIC_BASE_URL=http://127.0.0.1:3080` + `FILES_BIND=127.0.0.1` — ок, если UI открыт на той же машине (`localhost:5173`).
- Если UI открывают как `http://192.0.2.17:5173` **с другого компьютера**, в браузере `127.0.0.1:3080` — это уже машина пользователя. Тогда: `FILES_BIND=0.0.0.0`, `PUBLIC_BASE_URL=http://<хост-files-service>:3080`, и тот же origin в `CORS_ORIGINS` (для `/dl`; tus CORS отдаёт tusd).
- Dual-read: `GET /api/files/:id` для `storage_backend=files_service` редиректит на `/dl/...`, для `local` отдаёт диск.

## Портал

**Отдельный этап после стабильного PMDB.** Не трогаем `portal` / `portal_stage`, `portal_backend`, `portal_frontend`. Когда PMDB на files-service стабилен: ключ `docker compose run --rm meta npm run key:issue -- --consumer portal`, HTTP-клиент по тому же шаблону, новые загрузки, затем мигратор байтов портала. Таблицы портала не смешиваем с `files_service`.

## Правила «правильного» выпила из монолита

1. **Сначала добавить** новый путь рядом со старым (feature flag через env).
2. **Не удалять** таблицу `files` в pmdb — там доменная модель (секции, approval versions, права).
3. **Выносить ответственность**, не «переносить таблицу»: байты/дедуп/tus → сервис; entity/ACL → монолит.
4. **Один вертикальный срез** до полного покрытия UI.
5. **Миграция данных** — отдельная фаза после стабилизации API.
6. **Общий ключ** только на backend; фронт ключа files-service не видит.

## Чего не делать

- Не копировать прод-секреты files-service в git.
- Не переключать весь фронт на tus за один день.
- Не делать gRPC «на всякий случай» — контракт уже HTTP/OpenAPI.

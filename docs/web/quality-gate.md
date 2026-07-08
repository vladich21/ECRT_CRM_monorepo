# Web: quality gate и smoke

## CI / локально (monorepo root)

```bash
npm run check:web
```

Скрипт: `format:check` + `build` в `apps/web`.

## PR checklist — реестры (Phase 8)

Пройти вручную на **каждом** из 6 реестров: partners, contracts, patents, projects, patent-grants, supplier-evaluations.

| # | Сценарий | OK |
|---|---|---|
| 1 | List внизу → open card → **сверху**, без flash | ☐ |
| 2 | Back → scroll + filters + page на месте | ☐ |
| 3 | F5 на list → те же filters/page | ☐ |
| 4 | Смена page → scroll наверх | ☐ |
| 5 | Смена фильтра → page = 1 | ☐ |
| 6 | Delete → redirect, нужный tab/scope | ☐ |
| 7 | Partners: legacy deleted scope / readiness | ☐ |
| 8 | Nested contracts `/partners/:id/contracts` — отдельный persist | ☐ |

## PR checklist — modals

| # | Сценарий | OK |
|---|---|---|
| 1 | Confirm delete (contracts draft — red button) | ☐ |
| 2 | File upload modal — loader при upload | ☐ |
| 3 | Approval start / decision (если есть тестовая сущность) | ☐ |

## Архитектура (ссылки)

- Реестры: [registry-list-pattern.md](./registry-list-pattern.md)
- SCSS: [scss-style.md](./scss-style.md)
- Modals: `GlobalModals.tsx` + `ModalStore.ts`

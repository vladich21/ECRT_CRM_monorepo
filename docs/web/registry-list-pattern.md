# Паттерн: реестр ↔ карточка

Контракт для list pages (`/partners`, `/contracts`, `/patents`, …).

## Два слоя состояния

| Слой | Хранилище | Что |
|---|---|---|
| **Scroll** | `sessionStorage` (`registryScroll.ts`) | позиция прокрутки list |
| **UI** (filters, page, sort) | `localStorage` (`*PersistedUi.ts`) | поиск, фильтры, page, tab |

Snapshot в `location.state` **не используется** для restore list UI.  
Исключение: legacy hints в `location.state` (`listTab`, `deletionScope`, `tab`) после delete/restore redirect.

## Scroll (sessionStorage)

| API | Где | Зачем |
|---|---|---|
| `openFromRegistry(loc, navigate, to, opts)` | клик по строке | sync save UI + сохранить scroll + navigate |
| `useRegistryScroll({ isListReady, page, restoreToken })` | list page | восстановить scroll после «Назад» |
| `useScrollDetailPagesToTop()` | `App.tsx` | карточка сверху (нужен из‑за `scrollRestoration = 'manual'` в реестрах) |
| `GlobalModals` | `components/modals/GlobalModals.tsx` | рендер модалок из `ModalStore` |

Подробнее: [quality-gate.md](./quality-gate.md), [scss-style.md](./scss-style.md).

Перед `openFromRegistry` вызывай `flushPersist()` из `useXListUiState`.

Новый реестр: добавить pathname в `REGISTRY_PATHS` в [`registryScroll.ts`](../../apps/web/src/hooks/registryScroll.ts).

## UI (localStorage)

| API | Зачем |
|---|---|
| `load*PersistedUi()` / `save*PersistedUi()` | read/write в localStorage |
| `useRegistryListUiState(...)` | mount: load + apply; debounced save; `restoreToken` |
| `flushPersist()` | sync save перед уходом в карточку |
| `applyFallback` | legacy hints из `location.state` (delete redirect) |

`restoreToken` (`listRestoreGeneration`) — после programmatic restore **не** сбрасывать page.

## Pagination

| API | Зачем |
|---|---|
| `useServerTablePagination()` | page / pageSize |
| `useResetPageWhenListQueryChanges(key, resetPage, restoreToken)` | сброс page при смене фильтров |

## Шаблон list page

```tsx
const persistedUi = useMemo(() => ({ searchQuery, activeTab, appliedFilters, page, pageSize }), [...]);

const { restoreToken, flushPersist } = useXListUiState(location, navigate, setters, persistedUi);

useRegistryScroll({ isListReady: !isInitialLoad && !isFetching, page, restoreToken });
useResetPageWhenListQueryChanges(queryResetKey, resetPage, restoreToken);

const openDetail = (item) => {
  flushPersist();
  openFromRegistry(location, navigate, `/path/${item.id}`, {
    state: { entity: item, from: '...' }, // без *ListReturn snapshot
  });
};
```

## Чеклист нового реестра

1. `REGISTRY_PATHS` в `registryScroll.ts`
2. `*PersistedUi.ts` (load/save через serialize/parse schema в `*NavSnapshot.ts`)
3. `useRegistryListUiState` thin wrapper
4. `useXListData` hook
5. `flushPersist` + `openFromRegistry` + `useRegistryScroll` на list page
6. Back на detail: `navigate('/path')` или hints (`deletionScope`, `tab`)

## Storage keys

| Реестр | localStorage key |
|---|---|
| contracts | `srn.contractsList.ui.v1` (+ `:partner:{id}` для nested) |
| partners | `srn.partnersList.ui.v1` (v3 schema) |
| patents | `srn.patentsList.ui.v1` |
| projects | `srn.projectsList.ui.v1` |
| patent-grants | см. `patentGrantsRegistryPersistedUi.ts` |
| evaluations | `srn.supplierEvaluationsRegistry.ui.v1` |

## Структура папок

| Папка | Назначение |
|---|---|
| `hooks/` | React hooks, включая `hooks/modals/`, `hooks/notifications/` |
| `utils/` | pure generic helpers (snapshot parse для persist, formatters) |
| `helpers/` | domain helpers (navigation, forms, entity lookup) |

`customhooks/` — deprecated re-exports; новый код импортирует из `hooks/`.

## Эталон

Contracts: [`ContractsListPage`](../../apps/web/src/pages/contracts/list/ContractsListPage.tsx), [`useContractsListUiState`](../../apps/web/src/pages/contracts/hooks/useContractsListUiState.ts), [`ContractDetailsPage`](../../apps/web/src/pages/contracts/details/ContractDetailsPage.tsx).

## Smoke checklist

- List внизу → open card (сверху, без flash) → back (scroll + filters + page)
- F5 на list → те же filters/page
- Смена page → scroll наверх
- Смена фильтра → page сброс на 1
- Delete entity → redirect на list с нужным tab/scope
- Partners legacy tabs / deleted scope

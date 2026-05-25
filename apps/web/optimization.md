
Теперь вижу полную картину. Объясняю что происходит и что делать:

---

## Диагноз — откуда 280 запросов

**Причина №1 (главная): Отсутствие lazy loading**

В `AppRoutes.tsx` все ~30 страниц импортированы статически:
```ts
import ContractsListPage from "../pages/contracts/list/ContractsListPage";
import PatentsListPage from "../pages/patents/PatentsListPage";
// ... еще 28 импортов
```

В **dev-режиме Vite** каждый модуль = отдельный HTTP-запрос. Один файл компонента → 5-10 импортов → 5-10 запросов. 30 страниц × ~10 = 200-300 запросов. Это и есть твои 280.

**В prod-сборке** (`npm build`) этого нет — Vite пакует все в несколько chunk-файлов. Но без code splitting все равно один большой бандл, который браузер качает целиком перед показом первого экрана.

**Причина №2: Нет guard `enabled: isAuth` в запросах**

`PrivateRoute` редиректит сразу (zustand sync), но при любом флике рендера React Query запустит запросы.

---

## Полный план оптимизации (по приоритетам)

### 1. Lazy loading маршрутов — самый большой выигрыш

Хочешь чтобы я реализовал это прямо сейчас? Трансформация `AppRoutes.tsx`:

```tsx
// Было (статический импорт — весь код загружается сразу):
import ContractsListPage from "../pages/contracts/list/ContractsListPage";

// Станет (lazy — код загружается только когда пользователь открывает /contracts):
const ContractsListPage = lazy(() => import("../pages/contracts/list/ContractsListPage"));
```

Каждый роут оборачивается в `<Suspense fallback={<PageSkeleton />}>`. Результат: браузер скачивает только `/auth` страницу (~50кб вместо ~500кб), остальное — по требованию.

### 2. Анализатор бандла

```bash
npm install --save-dev rollup-plugin-visualizer
```

Покажет визуально что и сколько весит — найдем тяжелые зависимости для дополнительного сплиттинга.

### 3. Guard в React Query

```tsx
// В useReferenceData — добавить проверку авторизации:
const isAuth = useAuthStore(s => s.isAuth);

return useQuery({
  queryKey: [...],
  queryFn: ...,
  enabled: isAuth && neededReferences.length > 0, // не стреляет без авторизации
});
```

### 4. Prefetch критических данных после логина

После успешного логина — сразу prefetch справочников для главной страницы, пока пользователь видит логотип загрузки.

### 5. LCP / CLS

- Установить фиксированные размеры для изображений (логотип в `MainLayout`)
- Skeleton-лоадеры вместо пустого контента

---

**Что даст наибольший эффект в порядке приоритета:**

| # | Задача | Эффект |
|---|--------|--------|
| 1 | Lazy loading маршрутов | -70% начальный бандл |
| 2 | Bundle analyzer | найдем скрытые тяжелые библиотеки |
| 3 | `enabled: isAuth` guard | 0 лишних API запросов |
| 4 | Prefetch после логина | быстрый переход на главную |
| 5 | Skeleton для LCP | лучший perceived performance |

Реализовать это все? Начну с lazy loading `AppRoutes.tsx` — это основное и дает наибольший выигрыш.
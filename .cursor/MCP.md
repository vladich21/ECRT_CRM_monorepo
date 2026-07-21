# MCP в этом проекте

Файл: `.cursor/mcp.json`

| Сервер | Для чего |
|--------|----------|
| `svar-mcp` | Документация SVAR React Gantt |
| `context7` | Актуальные docs библиотек (NestJS, Ant Design, TanStack Query, React, …) |

## Что сделать вам

1. **Cursor Settings → Tools & MCP** — должны быть `svar-mcp` и `context7`.
2. Если красный статус — **Reload Window** (Ctrl+Shift+P → `Developer: Reload Window`).
3. Для Context7 при лимитах: ключ на [context7.com](https://context7.com), затем в конфиг можно добавить headers (не коммитьте ключ в git):

```json
"context7": {
  "url": "https://mcp.context7.com/mcp",
  "headers": {
    "CONTEXT7_API_KEY": "ваш-ключ"
  }
}
```

## Как просить в чате

- Gantt: «по SVAR MCP …»
- Nest / Ant Design / React Query: «через Context7 найди актуальный API для …»

Примеры:

- `useQuery` / `useMutation` TanStack Query v5
- NestJS guards, modules, interceptors
- Ant Design 5 Table / Form / Modal

# SCSS в apps/web

Правила, чтобы стили не перебивали друг друга.

## Обязательно

1. **CSS Modules** — `ComponentName.module.scss` рядом с компонентом.
2. **Импорт** — `import styles from './Foo.module.scss'` и `className={styles.root}`.
3. **camelCase** в TS — Vite уже настроен (`localsConvention: 'camelCase'`).
4. **Один корневой класс** на компонент — `.root` или имя блока (`.card`, `.list`).

## Не делать

- Глобальные классы в page-компонентах (`.partners-list`, `.title` без module).
- `@import` чужих `.module.scss` — modules изолированы, так не работает.
- Глубокая вложенность (> 2 уровней) — сложнее specificity wars.
- Дублировать токены Ant Design — для разовых отступов используй `style={{}}` или `styles` prop у antd.

## Токены

Общие переменные — только через `@/styles/variables.scss` (подключены в `vite.config.js`):

```scss
.root {
  color: $text-secondary;
  border: 1px solid $border-secondary;
}
```

Не копировать hex из variables в каждый файл.

## Когда inline, а не SCSS

- Одноразовый отступ/width в modal footer.
- Ant Design `styles={{ body: { paddingBottom: 0 } }}` на Modal/Form.

## Layout vs page

| Слой | Стили |
|---|---|
| `layouts/` | module + минимум глобального |
| `pages/*/` | только `*.module.scss` |
| `components/` | только `*.module.scss` |

## Проверка перед PR

- [ ] Новый UI — только `.module.scss`, без глобальных селекторов в `pages/`.
- [ ] Нет `:global` без комментария зачем.
- [ ] Классы не совпадают с antd (`.ant-table` и т.п.) — не переопределять antd глобально.

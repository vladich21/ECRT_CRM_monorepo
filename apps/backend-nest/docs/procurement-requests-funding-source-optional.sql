-- Источник финансирования (funding_source) необязателен для инициатора на
-- создании запроса (по итогам встречи 2026-09-16) — заполняется позже, по
-- ходу утверждения/проработки. Столбец был NOT NULL — снимаем ограничение.
-- DBeaver: Execute SQL Script. CI не гоняет.
-- Если только что была ошибка 25P02 — сначала выполни ОДНУ команду: ROLLBACK;

ROLLBACK;

ALTER TABLE purchase_requests ALTER COLUMN funding_source DROP NOT NULL;

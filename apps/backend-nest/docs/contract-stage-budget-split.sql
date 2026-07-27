-- Разрез планового бюджета этапа: соисполнители (A) + собственные (B).
-- planned_budget = A + B; в Гант уходит только own_budget.

ALTER TABLE contract_stages
  ADD COLUMN IF NOT EXISTS coexecutor_budget numeric(19, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS own_budget numeric(19, 2) NOT NULL DEFAULT 0;

-- Существующие этапы: весь план считаем «своим», пока не разметили вручную.
UPDATE contract_stages
SET
  own_budget = planned_budget,
  coexecutor_budget = 0
WHERE COALESCE(own_budget, 0) = 0
  AND COALESCE(coexecutor_budget, 0) = 0
  AND COALESCE(planned_budget, 0) <> 0;

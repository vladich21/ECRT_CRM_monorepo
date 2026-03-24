/**
 * Допустимые значения полей БД для оценок поставщиков.
 * Источник правды по фиче: docs/supplier-evaluations.md; DDL: supplier-evaluations-db-design.md; Drizzle: schema.ts.
 */

/** supplier_evaluations.status */
export const SUPPLIER_EVALUATION_STATUSES = ['active', 'archived'] as const;
export type SupplierEvaluationStatus = (typeof SUPPLIER_EVALUATION_STATUSES)[number];

/** supplier_evaluations.category */
export const SUPPLIER_EVALUATION_CATEGORIES = ['A', 'B', 'C', 'D'] as const;
export type SupplierEvaluationCategory = (typeof SUPPLIER_EVALUATION_CATEGORIES)[number];

/** supplier_partner_project_blocks.reason (рекомендуемые коды) */
export const SUPPLIER_BLOCK_REASONS = {
  evaluationCategoryD: 'evaluation_category_d',
} as const;

export function isSupplierEvaluationStatus(v: string): v is SupplierEvaluationStatus {
  return (SUPPLIER_EVALUATION_STATUSES as readonly string[]).includes(v);
}

export function isSupplierEvaluationCategory(v: string): v is SupplierEvaluationCategory {
  return (SUPPLIER_EVALUATION_CATEGORIES as readonly string[]).includes(v);
}

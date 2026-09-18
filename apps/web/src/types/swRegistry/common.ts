/** Общее для всего реестра ПО: состояние записи, ответственный, элемент справочника. */

export type SwRecordState = 'active' | 'archived' | 'deleted';

export type SwResponsible = {
  userId: string;
  roleCode: string;
  name: string;
};

export type SwRefItem = {
  code: string;
  name: string;
  isActive?: boolean;
  gostCode?: string;
  sortOrder?: number;
  requiresApprovalSheet?: boolean;
  isFinal?: boolean;
  developmentKindCode?: string;
  scope?: string;
  statusCode?: string;
};

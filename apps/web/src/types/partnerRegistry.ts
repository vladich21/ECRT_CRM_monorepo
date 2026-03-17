/** Реестр контрагентов — статусы для фильтрации */
export type PartnerRegistryStatus = 'active' | 'potential' | 'blocked' | 'archive';

/** Доп. данные для хедера деталей партнёра (старый registry layout) */
export interface PartnerDetailExtras {
  status: PartnerRegistryStatus;
  type: string;
  key_supplier?: boolean;
  targeted?: boolean;
  city?: string;
}

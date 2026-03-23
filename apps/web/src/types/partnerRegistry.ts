export type PartnerRegistryStatus = 'active' | 'potential' | 'blocked' | 'archive';
export interface PartnerDetailExtras {
  status: PartnerRegistryStatus;
  type: string;
  key_supplier?: boolean;
  targeted?: boolean;
  city?: string;
}

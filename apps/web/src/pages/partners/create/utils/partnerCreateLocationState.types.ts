export type PartnerCreateLocationState = {
  fromContractCreate?: boolean;
  fromPurchaseRequest?: boolean;
  returnPath?: string;
  contractCreateState?: { partnerId?: string };
} | null;

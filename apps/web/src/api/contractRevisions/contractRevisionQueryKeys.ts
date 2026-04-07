export const contractRevisionQueryKeys = {
  byContract: (contractId: string) => ['contract-revisions', contractId] as const,
  byContractAndNumber: (contractId: string, revisionNumber: number) =>
    ['contract-revisions', contractId, revisionNumber] as const,
} as const;

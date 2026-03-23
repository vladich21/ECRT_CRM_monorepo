export const CONTRACTS_REGISTRY_PATH = '/contracts';

export function getContractEditPath(contractId: string): string {
  return `${CONTRACTS_REGISTRY_PATH}/${contractId}/edit`;
}

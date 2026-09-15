export function padKindSequence(n: number): string {
  return String(n).padStart(2, '0');
}

export function assembleDocumentDesignation(
  programDesignation: string,
  gostCode: string,
  sequenceNo: number,
): string {
  return `${programDesignation} ${gostCode} ${padKindSequence(sequenceNo)}`;
}

export function assembleSheetDesignation(documentDesignation: string): string {
  return `${documentDesignation}-ЛУ`;
}

export function formatIpsDisplay(ipsId: string | null, placedAt: string | null): string | null {
  if (!ipsId) return null;
  if (!placedAt) return ipsId;
  const date = new Date(placedAt).toLocaleDateString('ru-RU');
  return `${ipsId} · ${date}`;
}

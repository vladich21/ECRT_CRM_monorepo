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

/** Лист утверждения допустим, если у вида разработки есть статусы области sheet — не хардкод rnd. */
export function developmentKindAllowsApprovalSheet(
  developmentKindCode: string,
  applicability: { developmentKindCode?: string; scope?: string }[],
): boolean {
  return applicability.some(
    (row) => row.developmentKindCode === developmentKindCode && row.scope === 'sheet',
  );
}

export function formatIpsDisplay(ipsId: string | null, placedAt: string | null): string | null {
  if (!ipsId) return null;
  if (!placedAt) return ipsId;
  const date = new Date(placedAt).toLocaleDateString('ru-RU');
  return `${ipsId} · ${date}`;
}

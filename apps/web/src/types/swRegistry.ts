export type SwRecordState = 'active' | 'archived' | 'deleted';

export type SwResponsible = {
  userId: string;
  roleCode: string;
  name: string;
};

export type SwStructureNode = {
  id: string;
  parentId: string | null;
  elementTypeCode: string;
  code: string;
  name: string;
  description: string | null;
  recordState: SwRecordState;
  archivedByCascade: boolean;
  responsibles: SwResponsible[];
  children: SwStructureNode[];
};

export type SwRefItem = {
  code: string;
  name: string;
  isActive?: boolean;
  gostCode?: string;
  sortOrder?: number;
  requiresApprovalSheet?: boolean;
  isFinal?: boolean;
};

export type SwItemListRow = {
  id: string;
  designation: string;
  shortName: string;
  fullName: string;
  element: { id: string; code: string; name: string };
  partner: { id: string; name: string };
  responsible: { id: string; name: string };
  developmentKindCode: string;
  specUrl: string | null;
  recordState: SwRecordState;
  documentsCount: number;
  statusSummary: Record<string, number>;
};

export type SwItemsTabCounts = {
  all: number;
  rnd: number;
  serial: number;
  purchased: number;
  archived: number;
};

export type SwItemsListResponse = {
  items: SwItemListRow[];
  total: number;
  page: number;
  limit: number;
  tabCounts?: SwItemsTabCounts;
};

export type CreateStructurePayload = {
  parentId?: string | null;
  elementTypeCode: string;
  code: string;
  name: string;
  description?: string | null;
};

export type CreateSwItemPayload = {
  designation: string;
  elementId: string;
  shortName: string;
  fullName: string;
  partnerId: string;
  responsibleUserId: string;
  developmentKindCode: string;
  specUrl?: string | null;
};

export type UpdateSwItemPayload = Partial<CreateSwItemPayload>;

export type UpdateSwDocumentPayload = {
  designation?: string;
  name?: string;
  sheetsCount?: number;
  letter?: string | null;
  approvalSheet?: { designation?: string; sheetsCount?: number } | null;
};

export type SwDocumentListRow = {
  id: string;
  designation: string;
  documentKindCode: string;
  kindSequenceNo: number;
  name: string;
  sheetsCount: number;
  letter: string | null;
  statusCode: string;
  sheetDesignation: string | null;
  sheetSheetsCount: number | null;
  sheetStatusCode: string | null;
  ipsId: string | null;
  ipsPlacedAt: string | null;
  recordState: SwRecordState;
  archivedByCascade?: boolean;
};

export type SwItemDetail = SwItemListRow & {
  documents: SwDocumentListRow[];
  patentsCount?: number;
};

export type SwItemPatentLinkPatent = {
  id: string;
  name: string;
  registrationNumber: string | null;
  applicationNumber: string | null;
  kdNumber: string | null;
  isDeleted: boolean;
};

export type SwItemPatentLink = {
  id: string;
  patentId: string;
  comment: string | null;
  createdAt: string;
  patent: SwItemPatentLinkPatent;
};

/** Связь РИД с программой на элементе структуры (read-only агрегат). */
export type SwStructurePatentLink = SwItemPatentLink & {
  software: { id: string; designation: string; shortName: string };
};

export type AddSwItemPatentLinkPayload = {
  patentId: string;
  comment?: string | null;
};

export type SwDocumentDetail = {
  id: string;
  softwareId: string;
  designation: string;
  documentKindCode: string;
  kindSequenceNo: number;
  name: string;
  sheetsCount: number;
  letter: string | null;
  statusCode: string;
  approvalSheet: { designation: string | null; sheetsCount: number | null; statusCode: string | null } | null;
  ips: { id: string; placedAt: string } | null;
  recordState: SwRecordState;
  archivedByCascade?: boolean;
};

/** POST/PATCH документа: карточка + мягкие предупреждения (префикс обозначения). */
export type SwDocumentWriteResult = SwDocumentDetail & { warnings?: string[] };

export type SwApplicableStatus = {
  code: string;
  name: string;
  requiresIps?: boolean;
  isFinal?: boolean;
};

export type SwDocumentStatusesResponse = {
  document: SwApplicableStatus[];
  sheet: SwApplicableStatus[];
};

export type CreateSwDocumentPayload = {
  documentKindCode: string;
  kindSequenceNo?: number;
  designation?: string;
  name?: string;
  sheetsCount: number;
  letter?: string | null;
  approvalSheet?: { designation?: string; sheetsCount?: number };
};

export type ChangeSwDocumentStatusPayload = {
  scope: 'document' | 'sheet';
  statusCode: string;
  comment?: string;
  ips?: { id: string; placedAt: string };
};

export type SwSummaryStatusColumn = {
  code: string;
  name: string;
};

export type SwSummaryRow = {
  id: string;
  name: string;
  parentId?: string | null;
  depth?: number;
  recordState?: string;
  documentCounts: Record<string, number>;
  sheetCounts: Record<string, number>;
  documentsTotal: number;
  sheetsTotal: number;
};

export type SwSummaryTotals = {
  documentCounts: Record<string, number>;
  sheetCounts: Record<string, number>;
  documentsTotal: number;
  sheetsTotal: number;
};

export type SwSummaryResponse = {
  dimension: string;
  generatedAt: string;
  columns: {
    document: SwSummaryStatusColumn[];
    sheet: SwSummaryStatusColumn[];
  };
  documentsTotal: number;
  sheetsTotal: number;
  rows: SwSummaryRow[];
  totals: SwSummaryTotals;
};

export type SwFileObjectType = 'sw_item' | 'sw_document' | 'sw_sheet';
export type SwFilePurpose = 'document' | 'sheet' | 'spec';

export type SwFileVersion = {
  id: string;
  version: number;
  status: string;
  sizeBytes: number | null;
  rejectReason: string | null;
  createdAt?: string;
};

export type SwRegistryFile = {
  id: string;
  fileId: string;
  purpose: SwFilePurpose;
  filename: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  currentVersion: number | null;
  versions: SwFileVersion[];
};

export type SwFileLinkResponse = {
  fileId: string;
  version: number | null;
  url: string;
  expiresAt: string;
};

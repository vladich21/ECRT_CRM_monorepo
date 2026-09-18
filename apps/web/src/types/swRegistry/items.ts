/** Программы реестра: строка списка, карточка, связи с РИД. */

import type { SwRecordState } from './common';
import type { SwDocumentListRow } from './documents';

export type SwItemListRow = {
  id: string;
  designation: string;
  shortName: string;
  fullName: string;
  element: { id: string; code: string; name: string };
  partner: { id: string; name: string; shortName?: string };
  responsible: { id: string; name: string };
  developmentKindCode: string;
  specUrl: string | null;
  /** Каталог программы в SVN конструкторов. */
  svnPath?: string | null;
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

export type AddSwItemPatentLinkPayload = {
  patentId: string;
  comment?: string | null;
};

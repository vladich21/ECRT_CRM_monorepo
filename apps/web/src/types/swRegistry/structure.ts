/** Структура изделий: узлы дерева и связи элементов. */

import type { SwRecordState, SwResponsible } from './common';
import type { SwItemPatentLink } from './items';

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

export type CreateStructurePayload = {
  parentId?: string | null;
  elementTypeCode: string;
  code: string;
  name: string;
  description?: string | null;
};

/** Связь РИД с программой на элементе структуры (read-only агрегат). */
export type SwStructurePatentLink = SwItemPatentLink & {
  software: { id: string; designation: string; shortName: string };
};

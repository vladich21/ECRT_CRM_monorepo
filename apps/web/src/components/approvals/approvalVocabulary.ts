export type ApprovalVocabulary = {
  /** Состояние процесса в шапке (Тезис: «Согласование»). */
  processStateActive: string;
  processStateApproved: string;
  /** Строка журнала, пока человек должен решить. */
  taskCurrent: string;
  /** Факт в маршруте: зелёным только это слово. */
  assigneeApproved: string;
  assigneeRejected: string;
  assigneeReturned: string;
};

export const DEFAULT_APPROVAL_VOCABULARY: ApprovalVocabulary = {
  processStateActive: 'Согласование',
  processStateApproved: 'Согласован',
  taskCurrent: 'На согласовании',
  assigneeApproved: 'Согласовал',
  assigneeRejected: 'Отклонил',
  assigneeReturned: 'Вернул',
};

/** ВИ-4: утверждение запроса, не позднее согласование после проработки. */
export const PURCHASE_REQUEST_APPROVAL_VOCABULARY: ApprovalVocabulary = {
  processStateActive: 'Утверждение',
  processStateApproved: 'Утвержден',
  taskCurrent: 'На утверждении',
  assigneeApproved: 'Утвердил',
  assigneeRejected: 'Отклонил',
  assigneeReturned: 'Вернул',
};

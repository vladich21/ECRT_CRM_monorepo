/** Действие над разделом */
export type ActionType = 'read' | 'edit' | 'delete';

/** Snapshot прав на один раздел — лежит в JWT и в request.user */
export interface SectionPermission {
  sectionCode: string;
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

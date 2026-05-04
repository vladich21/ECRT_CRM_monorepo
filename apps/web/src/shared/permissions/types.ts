/** Действие над разделом */
export type ActionType = 'read' | 'edit' | 'delete';

/** Snapshot права на один раздел — приходит с бэкенда в /auth/me */
export interface SectionPermission {
  sectionCode: string;
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

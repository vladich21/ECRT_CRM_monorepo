export type ActionType = 'read' | 'edit' | 'delete';

export interface SectionPermission {
  sectionCode: string;
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

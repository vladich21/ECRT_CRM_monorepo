/** Событие создания комментария. Подписчики (например, уведомления согласований)
 *  решают, нужно ли что-то делать, по entityType. Сам модуль comments про них не знает. */
export const COMMENT_CREATED_EVENT = 'comment.created';

export interface CommentCreatedEvent {
  id: string;
  entityType: string;
  entityId: string;
  parentId: string | null;
  createdBy: string | null;
  mentionIds: string[];
  message: string;
  html: string | null;
}

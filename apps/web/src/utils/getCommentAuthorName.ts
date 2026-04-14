import { Comment } from '../types/comments';
import { User } from '../types/user';

interface ReferenceUser {
  id: string;
  name: string;
}

export const getCommentAuthorName = (
  comment: Comment,
  currentUser: User | null,
  usersBook: ReferenceUser[],
): string => {
  if (comment.created_by_fio) {
    return comment.created_by_fio;
  }

  const userId = comment.created_by || comment.user_id;

  if (userId === currentUser?.id && currentUser) {
    return `${currentUser.last_name} ${currentUser.first_name} ${currentUser.middle_name}`.trim();
  }

  if (!userId || !usersBook) return 'Пользователь';

  const user = usersBook.find(bookUser => bookUser.id === userId);
  return user?.name || 'Пользователь';
};

import { Comment } from '../types/comments';
import { User } from '../types/user';

type ReferenceUserWithAvatar = {
  id: string;
  avatar_url?: string | null;
};

export const getCommentAuthorAvatar = (
  comment: Comment,
  currentUser: User | null,
  usersBook: ReferenceUserWithAvatar[],
): string | undefined => {
  const normalizeAvatarUrl = (raw: string | undefined): string | undefined => {
    if (!raw) return undefined;
    // Legacy HR links sometimes come as /api/avatars/* and return 404 here.
    return raw.includes('/api/avatars/') ? raw.replace('/api/avatars/', '/avatars/') : raw;
  };

  if (comment.created_by_avatar) {
    return normalizeAvatarUrl(comment.created_by_avatar);
  }

  const userId = comment.created_by || comment.user_id;
  if (!userId) return undefined;

  if (currentUser?.id === userId) {
    return normalizeAvatarUrl(currentUser.avatar_url ?? undefined);
  }

  const user = usersBook.find(bookUser => bookUser.id === userId);
  return normalizeAvatarUrl(user?.avatar_url ?? undefined);
};

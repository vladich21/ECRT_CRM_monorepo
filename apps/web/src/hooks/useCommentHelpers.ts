import { useAuthStore } from '../store/AuthStore';
import { Comment } from '../types/comments';
import { getCommentAuthorName } from '../utils/getCommentAuthorName';

interface User {
  id: string;
  name: string;
}

export const useCommentHelpers = (allComments: Comment[], usersBook: User[]) => {
  const { user } = useAuthStore();

  const findParentComment = (parentId: string | null): Comment | null => {
    if (!parentId) return null;
    return allComments.find(c => c.id === parentId) || null;
  };

  const getUserName = (comment: Comment): string => {
    return getCommentAuthorName(comment, user, usersBook);
  };

  return { findParentComment, getUserName };
};

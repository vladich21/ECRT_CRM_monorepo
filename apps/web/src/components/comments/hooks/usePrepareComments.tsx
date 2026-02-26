import { useCallback, useMemo } from 'react';
import { Comment, PreparedComment } from '../../../types/comments';

interface UsePrepareComments {
  preparedComments: PreparedComment[];
}

interface UsePrepareCommentsProps {
  comments: Comment[];
}

export const usePreparedComments = ({ comments }: UsePrepareCommentsProps): UsePrepareComments => {
  const preparedComments = useMemo(() => {
    const commentMap = new Map<string, PreparedComment>();
    const result: PreparedComment[] = [];

    comments.forEach(comment => {
      commentMap.set(comment.id, {
        ...comment,
        comments: [],
      });
    });

    comments.forEach(comment => {
      const preparedComment = commentMap.get(comment.id)!;

      if (comment.parent_id === null) {
        result.push(preparedComment);
      } else {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          if (!parent.comments) {
            parent.comments = [];
          }
          parent.comments.push(preparedComment);
        } else {
          result.push(preparedComment);
        }
      }
    });

    return result;
  }, [comments]);

  const renderComments = useCallback(() => {
    return;
  }, preparedComments);

  return {
    preparedComments,
  };
};

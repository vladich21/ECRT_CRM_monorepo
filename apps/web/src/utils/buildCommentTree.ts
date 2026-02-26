import { Comment, CommentWithLevel } from '../types/comments';

const sortByDate = (comments: Comment[], newestFirst = false): Comment[] => {
  return [...comments].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return newestFirst ? dateB - dateA : dateA - dateB;
  });
};

export const buildCommentTree = (commentsList: Comment[]): CommentWithLevel[] => {
  const result: CommentWithLevel[] = [];

  const addWithChildren = (comment: Comment, level: number): void => {

    result.push({ ...comment, level });

    const children = commentsList.filter(c => c.parent_id === comment.id);

    if (children.length === 0) {
      return;
    }

    const sortedChildren = sortByDate(children, false);

    sortedChildren.forEach(child => {
      addWithChildren(child, level + 1);
    });
  };

  const roots = commentsList.filter(c => !c.parent_id);

  const sortedRoots = sortByDate(roots, true);

  sortedRoots.forEach(root => addWithChildren(root, 1));

  return result;
};

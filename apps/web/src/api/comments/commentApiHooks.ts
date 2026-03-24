import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { Comment } from '../../types/comments';
import { commentApi } from './commentApi';

export const useComments = (entity_type: string, entityId?: string): UseQueryResult<Comment[], Error> => {
  return useQuery<Comment[], Error>({
    queryKey: ['comments', entity_type, entityId],
    queryFn: () => commentApi.getComments(entity_type, entityId),
    enabled: !!entity_type && !!entityId,
  });
};

export const useCommentById = (commentId: string): UseQueryResult<Comment, Error> => {
  return useQuery<Comment, Error>({
    queryKey: ['comments', commentId],
    queryFn: () => commentApi.getCommentById(commentId),
    enabled: !!commentId,
  });
};

export const useCreateComment = (): UseMutationResult<Comment, Error, Partial<Comment>> => {
  const queryClient = useQueryClient();

  return useMutation<Comment, Error, Partial<Comment>>({
    mutationFn: (data: Partial<Comment>) => commentApi.addComment(data),
    onSuccess: createdComment => {
      if (createdComment?.entity_type && createdComment?.entity_id) {
        queryClient.invalidateQueries({
          queryKey: ['comments', createdComment.entity_type, createdComment.entity_id],
        });
      }
    },
  });
};

export const useUpdateComment = (): UseMutationResult<Comment, Error, { id: string; data: Partial<Comment> }> => {
  const queryClient = useQueryClient();

  return useMutation<Comment, Error, { id: string; data: Partial<Comment> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<Comment> }) => commentApi.editComment(id, data),
    onSuccess: updatedComment => {
      if (updatedComment?.entity_type && updatedComment?.entity_id) {
        queryClient.invalidateQueries({
          queryKey: ['comments', updatedComment.entity_type, updatedComment.entity_id],
        });
      }
    },
  });
};

export const useDeleteComment = (): UseMutationResult<Comment, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<Comment, Error, string>({
    mutationFn: (commentId: string) => commentApi.deleteComment(commentId),
    onSuccess: deletedComment => {
      if (deletedComment?.entity_type && deletedComment?.entity_id) {
        queryClient.invalidateQueries({
          queryKey: ['comments', deletedComment.entity_type, deletedComment.entity_id],
        });
      }
    },
  });
};

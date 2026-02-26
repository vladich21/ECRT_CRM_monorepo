import { Comment } from '../../types/comments';
import { apiClient } from '../clients';

export const commentApi = {
  getComments: async (entity_type?: string, entity_id?: string): Promise<Comment[]> => {
    const response = await apiClient.get('/comments', {
      params: { entity_type, entity_id },
    });
    return response.data;
  },

  getCommentById: async (commentId: string): Promise<Comment> => {
    const response = await apiClient.get(`/comments/${commentId}`);
    return response.data[0];
  },

  addComment: async (data: Partial<Comment>): Promise<Comment> => {
    const response = await apiClient.post('/comments', data);
    return response.data[0];
  },

  editComment: async (commentId: string, data: Partial<Comment>): Promise<Comment> => {
    const response = await apiClient.put(`/comments/${commentId}`, data);
    return response.data[0];
  },

  deleteComment: async (commentId: string): Promise<Comment> => {
    const response = await apiClient.delete(`/comments/${commentId}`);
    return response.data;
  },
};

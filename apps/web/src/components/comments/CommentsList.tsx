import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { message } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import CommentInput from './CommentInput/CommentInput';
import CommentComponent from './Comment';
import { useParams } from 'react-router-dom';
import { useComments, useCreateComment, useUpdateComment } from '../../api/comments/commentApiHooks';
import { Loader } from '../loader/Loader';
import { NotFound } from '../notFound/NotFound';
import { useReferenceData } from '../../api/hooks/useReferences';
import { useNotification } from '../../customhooks/useNotification';
import { Comment } from '../../types/comments';
import { fileApi } from '../../api/files/fileApi';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/AuthStore';
import { useModalStore } from '../../store/ModalStore';
import { buildCommentTree } from '../../utils/buildCommentTree';
import { getCommentAuthorName } from '../../utils/getCommentAuthorName';
import styles from './CommentsList.module.scss';

interface CommentsListProps {
  entityType: string;
}

export const CommentsList: React.FC<CommentsListProps> = ({ entityType }) => {
  const { [`${entityType}Id`]: entityId } = useParams();
  const { showNotification, contextHolder } = useNotification();
  const { data: comments, isLoading, isError } = useComments(entityType, entityId);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { openModal, closeModal } = useModalStore();

  const [currentCommentId, setCurrentCommentId] = useState<string | null>(null);
  const [action, setAction] = useState<'edit' | 'reply' | ''>('');
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [replyingToComment, setReplyingToComment] = useState<Comment | null>(null);
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  const { mutate: createComment } = useCreateComment();
  const { mutate: updateComment } = useUpdateComment();

  const findCommentById = useCallback((commentId: string, commentsList: Comment[]): Comment | null => {
    return commentsList.find(c => c.id === commentId) || null;
  }, []);

  const handleStartReply = useCallback((id: string) => {
    setAction('reply');
    setCurrentCommentId(id);
    const comment = findCommentById(id, comments || []);
    setReplyingToComment(comment);
    setEditingComment(null);
  }, [comments, findCommentById]);

  const handleStartEdit = useCallback((id: string) => {
    setAction('edit');
    setCurrentCommentId(id);
    const comment = findCommentById(id, comments || []);
    setEditingComment(comment);
    setReplyingToComment(null);
  }, [comments, findCommentById]);

  const handleCancelAction = useCallback(() => {
    setAction('');
    setCurrentCommentId(null);
    setEditingComment(null);
    setReplyingToComment(null);
    setFilesToDelete([]);
  }, []);

  const handleDeleteFile = useCallback((fileId: string) => {
    openModal({
      title: 'Удалить файл?',
      type: 'confirm',
      okText: 'Удалить',
      cancelText: 'Отмена',
      onConfirm: () => {
        try {
          setFilesToDelete(prev => [...prev, fileId]);

          if (editingComment) {
            const updatedFiles = editingComment.files.filter(f => f.id !== fileId);
            setEditingComment({
              ...editingComment,
              files: updatedFiles,
            });
          }

          message.success('Файл будет удален при сохранении');
          closeModal();
        } catch (error) {
          console.error('Ошибка при удалении файла:', error);
          message.error('Не удалось удалить файл');
        }
      },
      onCancel: () => {
        closeModal();
      },
    });
  }, [editingComment, openModal, closeModal]);

  const handleSend = useCallback(
    async (data: Partial<Comment>) => {
      const payload: any = {
        entity_id: entityId,
        entity_type: entityType,
        message: data.message,
      };

      if (currentCommentId) {
        payload.parent_id = currentCommentId;
      }

      if (data.mention_ids?.length) {
        payload.mention_ids = data.mention_ids;
      }

      if (data.html) {
        payload.html = data.html;
      }

      const filesToUpload = data.files?.length ? (data.files as unknown as File[]) : null;

      createComment(payload, {
        onSuccess: async createdComment => {
          if (filesToUpload && createdComment?.id) {
            try {
              const formData = new FormData();

              filesToUpload.forEach((file, index) => {
                formData.append(`file${index + 1}`, file);
              });

              formData.append('entityType', 'comment');
              formData.append('entityId', createdComment.id);

              await fileApi.uploadFiles(formData);

              queryClient.invalidateQueries({
                queryKey: ['comments', entityType, entityId],
              });

              showNotification('success', 'Успех', 'Комментарий с файлами успешно отправлен');
            } catch (error) {
              console.error('Ошибка при загрузке файлов:', error);
              showNotification('warning', 'Частичный успех', 'Комментарий создан, но не удалось загрузить файлы');
            }
          } else {
            showNotification('success', 'Успех', 'Комментарий успешно отправлен');
          }

          queryClient.invalidateQueries({
            queryKey: ['comments', entityType, entityId],
          });

          setAction('');
          setCurrentCommentId(null);
          setReplyingToComment(null);
        },
        onError: () => {
          showNotification('error', 'Ошибка', 'Не удалось отправить сообщение');
        },
      });
    },
    [entityId, entityType, currentCommentId, createComment, queryClient, showNotification],
  );

  const handleEdit = useCallback(
    async (data: Partial<Comment>) => {
      if (!currentCommentId) return;

      const filesToUpload = data.files?.length ? (data.files as unknown as File[]) : null;

      const payload: any = {
        message: data.message,
        html: data.html,
      };

      if (data.mention_ids?.length) {
        payload.mention_ids = data.mention_ids;
      }

      if (filesToDelete.length) {
        payload.files_to_delete = filesToDelete;
      }

      updateComment(
        { id: currentCommentId, data: payload },
        {
          onSuccess: async (updatedComment) => {

            if (filesToUpload && updatedComment?.id) {
              try {
                const formData = new FormData();

                filesToUpload.forEach((file, index) => {
                  formData.append(`file${index + 1}`, file);
                });

                formData.append('entityType', 'comment');
                formData.append('entityId', updatedComment.id);

                await fileApi.uploadFiles(formData);

                showNotification('success', 'Успех', 'Комментарий с новыми файлами успешно обновлен');
              } catch (error) {
                console.error('Ошибка при загрузке файлов:', error);
                showNotification('warning', 'Частичный успех', 'Комментарий обновлен, но не удалось загрузить файлы',
                );
              }
            } else {
              showNotification('success', 'Успех', 'Комментарий успешно отредактирован');
            }

            queryClient.invalidateQueries({
              queryKey: ['comments', entityType, entityId],
            });
            setAction('');
            setCurrentCommentId(null);
            setEditingComment(null);
            setFilesToDelete([]);
          },
          onError: (error) => {
            console.error('Ошибка редактирования:', error);
            showNotification('error', 'Ошибка', 'Не удалось отредактировать комментарий');
          },
        },
      );
    },
    [currentCommentId, updateComment, showNotification, queryClient],
  );

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['users']);

  if (isError || isReferencesError) {
    return <NotFound errorMessage='Не удалось подгрузить комментарии' />;
  }

  const commentsWithLevels = useMemo(() => {
    if (!comments) return [];
    return buildCommentTree(comments);
  }, [comments]);

  return (
    <div className={styles.commentsContainer}>
      {contextHolder}
      <div className={styles.commentsScrollArea}>
        <div className={styles.commentsContent}>
          {isLoading || isReferencesLoading ? (
            <Loader />
          ) : commentsWithLevels.length === 0 ? (
            <div className={styles.emptyState}>
              <MessageOutlined className={styles.emptyStateIcon} />
              <div className={styles.emptyStateText}>Комментариев пока нет</div>
              <div className={styles.emptyStateSubtext}>Будьте первым, кто оставит комментарий</div>
            </div>
          ) : (
            commentsWithLevels.map(el => (
              <CommentComponent
                key={el.id}
                comment={el}
                level={el.level}
                currentUserId={user?.id}
                userName={getCommentAuthorName(el, user, referenceBooks?.users || [])}
                onReply={handleStartReply}
                onEdit={handleStartEdit}
                allComments={comments || []}
                usersBook={referenceBooks?.users || []}
                entityType={entityType}
                entityId={entityId}
              />
            ))
          )}
        </div>
      </div>

      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <CommentInput
            onSubmit={action === 'edit' ? handleEdit : handleSend}
            action={action}
            editingComment={editingComment}
            replyingToComment={replyingToComment}
            onCancel={handleCancelAction}
            onDeleteFile={handleDeleteFile}
            onAttachFile={comment => console.log('comment', comment)}
          />
        </div>
      </div>
    </div>
  );
};

export default CommentsList;

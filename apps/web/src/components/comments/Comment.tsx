import React, { useState } from 'react';
import { Avatar, Button, Dropdown, Menu } from 'antd';
import { UserOutlined, DownloadOutlined, MoreOutlined, MessageOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { triggerFileDownload } from '../filePreview/FilePreviewModal';
import { Comment } from '../../types/comments';
import { useDeleteComment } from '../../api/comments/commentApiHooks';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { useNotification } from '../../customhooks/useNotification';
import { useQueryClient } from '@tanstack/react-query';
import { useCommentHelpers } from '../../hooks/useCommentHelpers';
import { formatFileSize } from '../../utils/formatFileSize';
import { getRelativeTime } from '../../utils/formatDate';
import { scrollToElement } from '../../utils/scrollToElement';
import styles from './Comment.module.scss';

interface CommentProps {
  comment: Comment;
  level?: number;
  currentUserId?: string;
  userName?: string;
  userAvatar?: string;
  onReply: (commentId: string) => Promise<void> | void;
  onEdit: (commentId: string) => Promise<void> | void;
  onDelete?: (commentId: string) => Promise<void> | void;
  isLoading?: boolean;
  allComments?: Comment[];
  usersBook?: any[];
  entityType?: string;
  entityId?: string;
  onScrollToComment?: (commentId: string) => void;
}

const CommentComponent: React.FC<CommentProps> = ({
  comment,
  level = 1,
  currentUserId,
  userName = 'Пользователь',
  userAvatar,
  onReply,
  onEdit,
  isLoading = false,
  allComments = [],
  usersBook = [],
  entityType,
  entityId,
  onScrollToComment,
}) => {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const deleteCommentMutation = useDeleteComment();
  const [isHovered, setIsHovered] = useState(false);

  const { findParentComment, getUserName } = useCommentHelpers(allComments, usersBook);

  const parentComment = findParentComment(comment.parent_id);
  const parentAuthorName = parentComment ? getUserName(parentComment) : null;
  const parentContent = parentComment?.html || parentComment?.message;

  const handleScrollToParent = () => {
    if (comment.parent_id) {
      scrollToElement(`comment-${comment.parent_id}`);
    }
  };

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteCommentMutation,
    successMessage: 'Комментарий успешно удален',
    errorMessage: 'Не удалось удалить комментарий',
    getMutationProps: () => comment.id,
    showNotification,
    onSuccess: () => {
      if (entityType && entityId) {
        queryClient.invalidateQueries({
          queryKey: ['comments', entityType, entityId],
        });
      }
    },
  });

  const isEdited = comment.created_at !== comment.updated_at;
  const commentAuthorId = comment.created_by || comment.user_id;
  const isCurrentUser = !!currentUserId && !!commentAuthorId && String(currentUserId) === String(commentAuthorId);
  const hasParent = comment.parent_id && parentAuthorName && parentContent;

  const menu = (
    <Menu className={styles.dropdownMenu}>
      <Menu.Item
        key='reply'
        icon={<MessageOutlined className={styles.menuItemIcon} />}
        onClick={() => onReply(comment.id)}
        className={styles.menuItem}
      >
        Ответить
      </Menu.Item>
      {isCurrentUser && (
        <>
          <Menu.Divider className={styles.menuDivider} />
          <Menu.Item
            key='edit'
            icon={<EditOutlined className={styles.menuItemIcon} />}
            onClick={() => onEdit(comment.id)}
            className={styles.menuItem}
          >
            Редактировать
          </Menu.Item>
          <Menu.Item
            key='delete'
            icon={<DeleteOutlined className={styles.deleteIcon} />}
            className={`${styles.menuItem} ${styles.menuItemDelete}`}
            onClick={openDeleteModal}
          >
            Удалить
          </Menu.Item>
        </>
      )}
    </Menu>
  );

  const marginLeft = (level - 1) * 40;

  return (
    <div
      id={`comment-${comment.id}`}
      className={styles.comment}
      style={{ marginLeft: `${marginLeft}px` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`${styles.content} ${level > 1 ? styles.withBorder : ''}`}>
        <div className={styles.header}>
          <Avatar
            src={userAvatar}
            icon={<UserOutlined />}
            size={36}
            className={styles.avatar}
          />

          <div className={styles.body}>
            <div className={styles.meta}>
              <div className={styles.metaLeft}>
                <span className={styles.author}>{userName}</span>
                {isEdited && <span className={styles.edited}>(ред.)</span>}
                <span className={styles.date}>{getRelativeTime(comment.created_at)}</span>
              </div>

              <Dropdown overlay={menu} trigger={['click']} placement='bottomRight'>
                <Button
                  type='text'
                  icon={<MoreOutlined className={styles.moreIcon} />}
                  size='middle'
                  className={styles.menuButton}
                />
              </Dropdown>
            </div>

            {/* Цитата родительского комментария (если есть parent_id) */}
            {hasParent && (
              <div className={styles.parentQuote} onClick={handleScrollToParent}>
                <div className={styles.parentQuoteAuthor}>{parentAuthorName}</div>
                <div
                  className={styles.parentQuoteContent}
                  dangerouslySetInnerHTML={{ __html: parentContent }}
                />
              </div>
            )}

            <div
              className={styles.message}
              dangerouslySetInnerHTML={{ __html: comment.html }}
            />

            {comment.files && comment.files.length > 0 && (
              <div className={styles.files}>
                {comment.files.map(file => (
                  <div
                    key={file.id || file.name}
                    className={styles.file}
                    onClick={() => {
                      if (!file.url || !file.name) return;
                      triggerFileDownload(file.url, file.name);
                    }}
                  >
                    <DownloadOutlined className={styles.fileIcon} />
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{file.name}</span>
                      {file.size && (
                        <span className={styles.fileSize}>{formatFileSize(+file.size)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentComponent;

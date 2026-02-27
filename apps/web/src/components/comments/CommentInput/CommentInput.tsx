import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button, Tooltip, message, Tag } from 'antd';
import { SendOutlined, PaperClipOutlined, CloseOutlined, EditOutlined, MessageOutlined } from '@ant-design/icons';
import styles from './CommentInput.module.scss';
import { FormatMenu } from './menus/FormatMenu';
import { UsersMenu } from './menus/UsersMenu';
import { useMentions } from '../hooks/useMentions';
import { getUserIdsFromString } from '../../../helpers/getDataUserIds';
import { useFormatText } from '../hooks/useFormatText';
import { useFiles } from '../hooks/useFiles';
import { getNicknameFromText } from '../../../helpers/getNicknameFromText';
import { isNicknameInProgress } from '../../../helpers/isNicknameInProgress';
import { Comment } from '../../../types/comments';

interface CommentInputProps {
  onSubmit: (comment: Partial<Comment>) => void;
  onAttachFile?: (file: File) => void;
  action: 'edit' | 'reply' | '';
  editingComment?: Comment | null;
  replyingToComment?: Comment | null;
  onCancel?: () => void;
  onDeleteFile?: (fileId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxHeight?: number;
  minHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}

const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  onAttachFile,
  action,
  editingComment,
  replyingToComment,
  onCancel,
  onDeleteFile,
  placeholder = 'Введите ваш комментарий...',
  disabled = false,
  maxHeight = 120,
  minHeight = 40,
  className = '',
  style,
}) => {
  const [content, setContent] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [showFormatMenu, setShowFormatMenu] = useState<boolean>(false);
  const [showUsersMenu, setShowUsersMenu] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{ top?: number; left?: number; bott?: number }>({ top: 0, left: 0 });

  const editorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { attachedFiles, fileInputRef, handleFileChange, removeFile, clearFiles, formatFileSize, getFiles, acceptFileTypes } =
    useFiles(onAttachFile);

  const closeUsersMenu = useCallback(() => {
    setShowUsersMenu(false);
  }, []);

  const { addUserInEditor: chooseUser, getMentionMenuPosition } = useMentions({
    editorRef,
    updateInputState: setContent,
    closeUsersMenu: closeUsersMenu,
  });

  const { formatText, checkSelection, handleMouseUp, handleGlobalMouseUp, clearSelectionTimeout } = useFormatText({
    editorRef,
    setContent,
    maxHeight,
    minHeight,
  });

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      if (isNicknameInProgress(content, target.innerText)) {
        if (!showUsersMenu) {
          setMenuPosition(getMentionMenuPosition());
        }
        setShowUsersMenu(true);
      } else {
        setShowUsersMenu(false);
      }

      if (target.innerHTML === '<br>') target.innerHTML = '';
      setContent(target.innerText);

      if (editorRef.current) {
        editorRef.current.style.height = 'auto';
        const newHeight = Math.min(editorRef.current.scrollHeight, maxHeight);
        editorRef.current.style.height = Math.max(newHeight, minHeight) + 'px';
        editorRef.current.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden';
      }
    },
    [editorRef, content, maxHeight, minHeight],
  );

  const handleSubmit = useCallback(() => {
    if (disabled) return;

    if (!content.trim() && attachedFiles.length === 0) {
      message.warning('Введите текст комментария или прикрепите файл');
      return;
    }

    const payload: Partial<Comment> = {
      html: editorRef.current?.innerHTML || '',
      message: content,
      mention_ids: getUserIdsFromString(content),
    };

    if (attachedFiles.length > 0) {
      payload.files = getFiles() as any;
    }

    onSubmit(payload);

    setContent('');
    clearFiles();
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      editorRef.current.style.height = minHeight + 'px';
    }
  }, [content, onSubmit, disabled, minHeight, attachedFiles, getFiles, clearFiles]);

  const handleAttachClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled, fileInputRef]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (showUsersMenu && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !showFormatMenu) {
        e.preventDefault();
        handleSubmit();
      } else if (showFormatMenu && e.key === 'Enter') {
        e.preventDefault();
      }
    },
    [handleSubmit, showUsersMenu, showFormatMenu],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const selection = window.getSelection();
      if (selection && editorRef.current) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        selection.removeAllRanges();
        selection.addRange(range);

        setTimeout(() => {
          const result = checkSelection();
          if (result.show) {
            setShowFormatMenu(true);
            setMenuPosition(result.position);
          }
        }, 10);
      }
    },
    [checkSelection],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowFormatMenu(false);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setShowFormatMenu(false);
      }
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        setShowFormatMenu(false);
      }
    };

    const handleGlobalMouseUpWrapper = (e: MouseEvent) => {
      handleGlobalMouseUp(e, menuRef, result => {
        if (result.show) {
          setShowFormatMenu(true);
          setMenuPosition(result.position);
        } else {
          setShowFormatMenu(false);
        }
      });
    };

    document.addEventListener('mouseup', handleGlobalMouseUpWrapper);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUpWrapper);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('selectionchange', handleSelectionChange);
      clearSelectionTimeout();
    };
  }, [handleGlobalMouseUp, clearSelectionTimeout]);

  const searchText = useMemo(() => getNicknameFromText(content), [content]);

  // Автофокус при открытии редактора
  useEffect(() => {
    if ((action === 'edit' || action === 'reply') && editorRef.current) {
      setTimeout(() => editorRef.current?.focus(), 100);
    }
  }, [action]);

  // Управление контентом редактора
  useEffect(() => {
    if (!editorRef.current) return;

    if (action === 'edit' && editingComment) {
      editorRef.current.innerHTML = editingComment.html || editingComment.message;
      setContent(editingComment.message);
    } else if (action === '') {
      editorRef.current.innerHTML = '';
      setContent('');
      clearFiles();
    }
  }, [action, editingComment, clearFiles]);

  return (
    <div 
      className={`${styles.container} ${isFocused ? styles.focused : ''} ${disabled ? styles.disabled : ''} ${className}`}
      style={style}
    >
      {/* Информация о текущем действии */}
      {(action === 'edit' || action === 'reply') && (
        <div className={styles.actionInfo}>
          <div className={styles.actionBody}>
            {action === 'edit' && editingComment && (
              <div>
                <div className={styles.actionTitle}>
                  <EditOutlined className={styles.actionTitleIcon} />
                  Редактирование комментария
                </div>
                {/* Показываем существующие файлы */}
                {editingComment.files && editingComment.files.length > 0 && (
                  <div className={styles.editFilesSection}>
                    <div className={styles.editFilesLabel}>
                      Прикрепленные файлы:
                    </div>
                    <div className={styles.editFilesList}>
                      {editingComment.files.map(file => (
                        <div key={file.id} className={styles.editFileItem}>
                          <div className={styles.editFileContent}>
                            <span className={styles.editFileName}>
                              📎 {file.name}
                            </span>
                            {file.size && (
                              <span className={styles.editFileSize}>
                                ({formatFileSize(+file.size)})
                              </span>
                            )}
                          </div>
                          <Button
                            type='text'
                            size='small'
                            icon={<CloseOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDeleteFile && file.id) {
                                onDeleteFile(file.id);
                              }
                            }}
                            className={styles.editFileDeleteBtn}
                            danger
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {action === 'reply' && replyingToComment && (
              <div>
                <div className={styles.actionTitle}>
                  <MessageOutlined className={styles.actionTitleIcon} />
                  Ответ на комментарий
                </div>
                <div
                  className={styles.replyQuoteBox}
                  dangerouslySetInnerHTML={{
                    __html: ((replyingToComment.html || replyingToComment.message).substring(0, 80) +
                      ((replyingToComment.html || replyingToComment.message).length > 80 ? '...' : ''))
                  }}
                />
              </div>
            )}
          </div>
          <Button
            type='text'
            size='small'
            onClick={onCancel}
            icon={<CloseOutlined />}
            className={styles.actionCloseBtn}
          />
        </div>
      )}

      <div className={styles.wrapper}>
        <div
          ref={editorRef}
          className={styles.editor}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onMouseUp={e =>
            handleMouseUp(result => {
              if (result.show) {
                setShowFormatMenu(true);
                setMenuPosition(result.position);
              }
            })
          }
          onDoubleClick={handleDoubleClick}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{ minHeight, maxHeight }}
          suppressContentEditableWarning={true}
          data-placeholder={placeholder}
        />

        <div className={styles.actions}>
          <Tooltip title='Прикрепить файл'>
            <Button
              type='text'
              icon={<PaperClipOutlined />}
              onClick={handleAttachClick}
              className={styles.actionButton}
              disabled={disabled}
              size='middle'
            />
          </Tooltip>

          <Button
            type='primary'
            icon={<SendOutlined />}
            onClick={handleSubmit}
            disabled={disabled || (!content.trim() && !attachedFiles.length)}
            className={styles.submitButton}
            size='middle'
          >
            {action === 'edit' ? 'Сохранить' : action === 'reply' ? 'Ответить' : 'Отправить'}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type='file'
          className={styles.hiddenFileInput}
          onChange={handleFileChange}
          disabled={disabled}
          multiple
          accept={acceptFileTypes}
        />
      </div>

      {/* Отображение прикрепленных файлов */}
      {attachedFiles.length > 0 && (
        <div className={styles.attachedFiles}>
          {attachedFiles.map(attachedFile => (
            <Tag
              key={attachedFile.id}
              closable
              closeIcon={<CloseOutlined />}
              onClose={() => removeFile(attachedFile.id)}
              className={`${styles.fileTag} ${styles.fileTagInline}`}
            >
              <PaperClipOutlined className={styles.fileTagIconInline} />
              {attachedFile.file.name}
              <span className={styles.fileTagSizeInline}>
                ({formatFileSize(attachedFile.file.size)})
              </span>
            </Tag>
          ))}
        </div>
      )}

      {showFormatMenu && (
        <FormatMenu
          disabled={disabled}
          position={menuPosition}
          formatText={command => {
            formatText(command);
            setShowFormatMenu(false);
          }}
        />
      )}

      {showUsersMenu && <UsersMenu position={menuPosition} text={searchText} onSelect={chooseUser} />}
    </div>
  );
};

export default CommentInput;

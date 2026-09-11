import { RedoOutlined } from '@ant-design/icons';
import { App, Avatar, Button, Empty, Spin, Typography } from 'antd';
import { useMemo, useState, type ReactNode } from 'react';

import { useComments, useCreateComment } from '@/api/comments/commentApiHooks';
import CommentInput from '@/components/comments/CommentInput/CommentInput';
import { useCurrentSrmUserId } from '@/hooks/useCurrentSrmUserId';
import type { ApprovalEventView } from '@/types/approval';
import type { Comment } from '@/types/comments';

import { formatApprovalDateTime } from './approvalFormat';
import styles from './ApprovalFeed.module.scss';

/** Обсуждение согласования привязано к процессу (у каждого круга своя лента). */
const ENTITY = 'approval_process';

/** Текст комментария без html-разметки для цитаты ответа. */
function plainText(html: string | undefined, message: string): string {
  const raw = (html && html.trim()) || message || '';
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ApprovalFeedProps {
  processId: string;
  events?: ApprovalEventView[];
  editable: boolean;
}

const EVENT_LABEL: Record<string, string> = {
  resubmitted: 'отправил(а) повторно на согласование',
  file_replaced: 'заменил(а) документ',
};

export function ApprovalFeed({ processId, events = [], editable }: ApprovalFeedProps) {
  const { message } = App.useApp();
  const userId = useCurrentSrmUserId();
  const { data: comments = [], isLoading } = useComments(ENTITY, processId);
  const create = useCreateComment();

  const [action, setAction] = useState<'reply' | ''>('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const commentById = useMemo(() => {
    const map = new Map<string, Comment>();
    (comments as Comment[]).forEach(c => map.set(c.id, c));
    return map;
  }, [comments]);

  const [highlightId, setHighlightId] = useState<string | null>(null);

  const startReply = (c: Comment) => {
    setAction('reply');
    setReplyingTo(c);
  };
  const cancelReply = () => {
    setAction('');
    setReplyingTo(null);
  };
  const scrollToComment = (id: string) => {
    const el = document.getElementById(`appr-cmt-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(id);
    window.setTimeout(() => setHighlightId(cur => (cur === id ? null : cur)), 2000);
  };

  const items: { key: string; ts: number; node: ReactNode }[] = [];

  events.forEach(e =>
    items.push({
      key: `event-${e.id}`,
      ts: new Date(e.created_at).getTime(),
      node: (
        <div className={styles.comment}>
          <div style={{ display: 'flex', gap: 10 }}>
            <RedoOutlined style={{ color: '#1677ff', marginTop: 4 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.commentHead}>
                <span>
                  <Typography.Text strong>{e.actor_name ?? 'Инициатор'}</Typography.Text>{' '}
                  {EVENT_LABEL[e.event_type] ?? e.event_type}
                </span>
                <time className={styles.commentTime}>{formatApprovalDateTime(e.created_at)}</time>
              </div>
            </div>
          </div>
        </div>
      ),
    }),
  );

  (comments as Comment[]).forEach(c =>
    items.push({
      key: `comment-${c.id}`,
      ts: new Date(c.created_at).getTime(),
      node: (
        <div
          id={`appr-cmt-${c.id}`}
          className={styles.comment}
          style={{
            borderRadius: 6,
            transition: 'background 0.4s ease',
            background: highlightId === c.id ? '#fffbe6' : undefined,
          }}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            <Avatar size={22} src={c.created_by_avatar}>
              {(c.created_by_fio ?? '?').slice(0, 1)}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.commentHead}>
                <Typography.Text strong>{c.created_by_fio ?? 'Пользователь'}</Typography.Text>
                <time className={styles.commentTime}>{formatApprovalDateTime(c.created_at)}</time>
              </div>
              {c.parent_id
                ? (() => {
                    const parent = commentById.get(c.parent_id);
                    const quoted = parent ? plainText(parent.html, parent.message) : '';
                    return (
                      <div
                        className={styles.quote}
                        onClick={() => scrollToComment(c.parent_id as string)}
                        title='Перейти к комментарию'
                      >
                        <Typography.Text type='secondary' style={{ fontSize: 12, display: 'block' }}>
                          ↳ в ответ {parent?.created_by_fio ?? 'комментарию'}
                        </Typography.Text>
                        {quoted ? (
                          <Typography.Text type='secondary' italic style={{ fontSize: 12 }}>
                            {quoted.length > 140 ? `${quoted.slice(0, 140)}…` : quoted}
                          </Typography.Text>
                        ) : null}
                      </div>
                    );
                  })()
                : null}
              <div dangerouslySetInnerHTML={{ __html: c.html || c.message }} />
              {editable ? (
                <Button type='link' size='small' style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => startReply(c)}>
                  Ответить
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ),
    }),
  );

  items.sort((a, b) => a.ts - b.ts);

  const onSubmit = (partial: Partial<Comment>) => {
    const hasText = (partial.message && partial.message.trim()) || (partial.html && partial.html.trim());
    if (!hasText) return;
    create.mutate(
      {
        entity_type: ENTITY,
        entity_id: processId,
        message: partial.message ?? '',
        html: partial.html ?? '',
        mention_ids: partial.mention_ids ?? [],
        created_by: userId ?? '',
        ...(replyingTo ? { parent_id: replyingTo.id } : {}),
      },
      {
        onSuccess: () => {
          message.success(replyingTo ? 'Ответ добавлен' : 'Комментарий добавлен');
          cancelReply();
        },
        onError: () => message.error('Не удалось добавить комментарий'),
      },
    );
  };

  return (
    <div className={styles.feed}>
      {isLoading ? (
        <Spin />
      ) : items.length > 0 ? (
        <div>{items.map(it => <div key={it.key}>{it.node}</div>)}</div>
      ) : (
        <div className={styles.empty}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Пока нет сообщений' />
        </div>
      )}
      {editable ? (
        <CommentInput
          onSubmit={onSubmit}
          action={action}
          replyingToComment={replyingTo}
          onCancel={cancelReply}
          placeholder='Написать комментарий…'
        />
      ) : (
        <Typography.Text type='secondary'>Процесс завершен — обсуждение закрыто.</Typography.Text>
      )}
    </div>
  );
}

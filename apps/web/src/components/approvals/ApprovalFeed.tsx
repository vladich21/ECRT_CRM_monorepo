import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  RedoOutlined,
  RollbackOutlined,
  SendOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { App, Avatar, Button, Empty, Space, Spin, Tag, Typography } from 'antd';
import { useMemo, useState, type ReactNode } from 'react';

import { useComments, useCreateComment } from '@/api/comments/commentApiHooks';
import CommentInput from '@/components/comments/CommentInput/CommentInput';
import { useCurrentSrmUserId } from '@/hooks/useCurrentSrmUserId';
import {
  DECISION_LABELS,
  type ApprovalDecisionType,
  type ApprovalDecisionView,
  type ApprovalEventView,
} from '@/types/approval';
import type { Comment } from '@/types/comments';

/** Обсуждение согласования привязано к процессу (у каждого круга своя лента). */
const ENTITY = 'approval_process';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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

function decisionIcon(t: ApprovalDecisionType): ReactNode {
  switch (t) {
    case 'approved':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'rejected':
      return <CloseCircleOutlined style={{ color: '#cf1322' }} />;
    case 'delegated':
      return <SwapOutlined style={{ color: '#1677ff' }} />;
    default:
      return <RollbackOutlined style={{ color: '#d46b08' }} />;
  }
}

function FeedRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ flex: 'none', width: 24, textAlign: 'center', paddingTop: 2 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

interface ApprovalFeedProps {
  processId: string;
  decisions: ApprovalDecisionView[];
  events?: ApprovalEventView[];
  initiatedAt: string;
  initiatorName?: string | null;
  /** Идёт ли согласование (можно ли писать комментарии). */
  editable: boolean;
}

const EVENT_LABEL: Record<string, string> = {
  resubmitted: 'отправил(а) повторно на согласование',
  file_replaced: 'заменил(а) документ',
};

export function ApprovalFeed({ processId, decisions, events = [], initiatedAt, initiatorName, editable }: ApprovalFeedProps) {
  const { message } = App.useApp();
  const userId = useCurrentSrmUserId();
  const { data: comments = [], isLoading } = useComments(ENTITY, processId);
  const create = useCreateComment();

  const [action, setAction] = useState<'reply' | ''>('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const commentById = useMemo(() => {
    const m = new Map<string, Comment>();
    (comments as Comment[]).forEach((c) => m.set(c.id, c));
    return m;
  }, [comments]);

  const startReply = (c: Comment) => {
    setAction('reply');
    setReplyingTo(c);
  };
  const cancelReply = () => {
    setAction('');
    setReplyingTo(null);
  };

  const items: { ts: number; node: ReactNode }[] = [];

  items.push({
    ts: new Date(initiatedAt).getTime(),
    node: (
      <FeedRow icon={<SendOutlined style={{ color: '#1677ff' }} />}>
        <Typography.Text strong>{initiatorName ?? 'Инициатор'}</Typography.Text> отправил на согласование{' '}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>· {fmt(initiatedAt)}</Typography.Text>
      </FeedRow>
    ),
  });

  decisions.forEach((d) =>
    items.push({
      ts: new Date(d.decided_at).getTime(),
      node: (
        <FeedRow icon={decisionIcon(d.decision_type)}>
          <div>
            <Typography.Text strong>{d.decided_by_name}</Typography.Text> — <Tag>{DECISION_LABELS[d.decision_type]}</Tag>
            {d.delegated_to_name ? <Typography.Text> → {d.delegated_to_name}</Typography.Text> : null}{' '}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>· {fmt(d.decided_at)}</Typography.Text>
          </div>
          {d.comment ? <Typography.Text type="secondary">{d.comment}</Typography.Text> : null}
        </FeedRow>
      ),
    }),
  );

  events.forEach((e) =>
    items.push({
      ts: new Date(e.created_at).getTime(),
      node: (
        <FeedRow icon={<RedoOutlined style={{ color: '#1677ff' }} />}>
          <Typography.Text strong>{e.actor_name ?? 'Инициатор'}</Typography.Text>{' '}
          {EVENT_LABEL[e.event_type] ?? e.event_type}{' '}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>· {fmt(e.created_at)}</Typography.Text>
        </FeedRow>
      ),
    }),
  );

  (comments as Comment[]).forEach((c) =>
    items.push({
      ts: new Date(c.created_at).getTime(),
      node: (
        <FeedRow
          icon={
            <Avatar size={22} src={c.created_by_avatar}>
              {(c.created_by_fio ?? '?').slice(0, 1)}
            </Avatar>
          }
        >
          <div>
            <Typography.Text strong>{c.created_by_fio ?? 'Пользователь'}</Typography.Text>{' '}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>· {fmt(c.created_at)}</Typography.Text>
          </div>
          {c.parent_id
            ? (() => {
                const parent = commentById.get(c.parent_id);
                const quoted = parent ? plainText(parent.html, parent.message) : '';
                return (
                  <div style={{ margin: '2px 0 6px', paddingLeft: 8, borderLeft: '2px solid #d9d9d9' }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      ↳ в ответ {parent?.created_by_fio ?? 'комментарию'}
                    </Typography.Text>
                    {quoted ? (
                      <Typography.Text type="secondary" italic style={{ fontSize: 12 }}>
                        {quoted.length > 140 ? `${quoted.slice(0, 140)}…` : quoted}
                      </Typography.Text>
                    ) : null}
                  </div>
                );
              })()
            : null}
          <div dangerouslySetInnerHTML={{ __html: c.html || c.message }} />
          {editable ? (
            <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => startReply(c)}>
              Ответить
            </Button>
          ) : null}
        </FeedRow>
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
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {isLoading ? (
        <Spin />
      ) : items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Пока нет событий" />
      ) : (
        <div>
          {items.map((it, i) => (
            <div key={i}>{it.node}</div>
          ))}
        </div>
      )}
      {editable ? (
        <CommentInput
          onSubmit={onSubmit}
          action={action}
          replyingToComment={replyingTo}
          onCancel={cancelReply}
          placeholder="Написать комментарий…"
        />
      ) : (
        <Typography.Text type="secondary">Согласование завершено — обсуждение закрыто.</Typography.Text>
      )}
    </Space>
  );
}

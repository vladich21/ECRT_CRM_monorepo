import { useMemo, useRef, useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { Link, useNavigate } from 'react-router-dom';

import {
  useAddSwItemPatentLink,
  useRemoveSwItemPatentLink,
  useSwItemPatentLinks,
} from '@/api/swRegistry/swRegistryApiHooks';
import { Loader } from '@/components/loader/Loader';
import { useOpenAntdDeleteConfirm } from '@/hooks/modals/confirmDelete';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { useNotification } from '@/hooks/notifications/useNotification';
import type { AddSwItemPatentLinkPayload } from '@/types/swRegistry';

import { SwItemPatentLinkModal } from './SwItemPatentLinkModal';
import styles from './SwItemRidTab.module.scss';

type SwItemRidTabProps = {
  itemId: string;
  canEdit: boolean;
};

function patentLabel(reg: string | null | undefined, name: string | null | undefined) {
  const regPart = reg?.trim();
  const namePart = name?.trim();
  if (regPart && namePart) return `${regPart} · ${namePart}`;
  return regPart || namePart || '—';
}

export function SwItemRidTab({ itemId, canEdit }: SwItemRidTabProps) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { showNotification } = useNotification();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const pendingPatentIdRef = useRef('');
  const linksQuery = useSwItemPatentLinks(itemId);
  const addMut = useAddSwItemPatentLink();
  const removeMut = useRemoveSwItemPatentLink();
  const [modalOpen, setModalOpen] = useState(false);

  const links = linksQuery.data ?? [];
  const excludedPatentIds = useMemo(() => links.map(l => l.patentId), [links]);

  const fail = (err: unknown) => message.error(getApiErrorMessage(err) ?? 'Не удалось выполнить действие');

  const submitLink = (payload: AddSwItemPatentLinkPayload) => {
    addMut.mutate(
      { itemId, payload },
      {
        onSuccess: () => {
          message.success('Связь с РИД добавлена');
          setModalOpen(false);
        },
        onError: fail,
      },
    );
  };

  const removeLink = (patentId: string) => {
    pendingPatentIdRef.current = patentId;
    openDeleteConfirm({
      title: 'Удалить связь с РИД?',
      mutation: removeMut,
      getVariables: () => ({ itemId, patentId: pendingPatentIdRef.current }),
      showNotification,
      successMessage: 'Связь удалена',
      errorMessage: 'Не удалось удалить связь',
      navigate,
    });
  };

  if (linksQuery.isLoading && !linksQuery.data) return <Loader />;

  return (
    <>
      {canEdit ? (
        <div className={styles.cardTitleRow}>
          <Button type='primary' icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Привязать РИД
          </Button>
        </div>
      ) : null}

      {links.length === 0 ? (
        <div className={styles.emptyHint}>Связей с реестром РИД пока нет</div>
      ) : (
        <div className={styles.docTableWrap}>
          <table className={styles.docTable}>
            <thead>
              <tr>
                <th>РИД</th>
                <th>Заявка</th>
                <th>№ КД</th>
                <th>Комментарий</th>
                {canEdit ? <th className={styles.ridActionsCol} aria-label='Действия' /> : null}
              </tr>
            </thead>
            <tbody>
              {links.map(link => {
                const label = patentLabel(link.patent.registrationNumber, link.patent.name);
                return (
                  <tr key={link.id} className={link.patent.isDeleted ? styles.docTableRowArchived : styles.docTableRow}>
                    <td>
                      <Link to={`/patents/${link.patentId}`} className={styles.docTableDesignation}>
                        {label}
                      </Link>
                      {link.patent.isDeleted ? <span className={styles.docTableMuted}> · удалена</span> : null}
                    </td>
                    <td className={styles.docTableNum}>{link.patent.applicationNumber ?? '—'}</td>
                    <td className={styles.docTableNum}>{link.patent.kdNumber ?? '—'}</td>
                    <td className={styles.docTableDocName}>{link.comment?.trim() || '—'}</td>
                    {canEdit ? (
                      <td className={styles.ridActionsCol}>
                        <Button
                          type='text'
                          danger
                          size='small'
                          icon={<DeleteOutlined />}
                          loading={removeMut.isPending}
                          onClick={() => removeLink(link.patentId)}
                          aria-label='Удалить связь'
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SwItemPatentLinkModal
        open={modalOpen}
        excludedPatentIds={excludedPatentIds}
        confirmLoading={addMut.isPending}
        onCancel={() => setModalOpen(false)}
        onSubmit={submitLink}
      />
    </>
  );
}

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';

import { commentQueryKeys } from '@/api/comments/commentQueryKeys';
import { useChangeSwDocumentStatus, useCreateSwDocument, useMarkSwDocumentDeleted, useRestoreSwDocument, useUpdateSwDocument } from '@/api/swRegistry/documentsHooks';
import { uploadSwRegistryFile } from '@/api/swRegistry/uploadSwFile';
import { svnApi } from '@/components/svnPicker/svnApi';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import type {
  ChangeSwDocumentStatusPayload,
  CreateSwDocumentPayload,
  SwDocumentListRow,
  UpdateSwDocumentPayload,
} from '@/types/swRegistry';

import type { SwFileChoice } from '../shared/SwFileSourcePicker';
import type { ApprovalSheetSubmit } from './documents/SwApprovalSheetModal';
import type { DocumentFileReplacement } from './documents/SwDocumentEditModal';

export type StatusModalState = {
  document: SwDocumentListRow;
  scope: 'document' | 'sheet';
};

/**
 * Всё, что делает панель с комплектом документации: создание, правка, статусы,
 * лист утверждения, архив и возврат. Окна живут здесь же — панель только рисует их
 * по возвращённому состоянию.
 */
export function useProgramDocumentActions(
  item: { id: string },
  /** Открытый в боковой панели документ: удалённый закрываем, чтобы адрес не вёл в никуда. */
  drawer: { openDocumentId: string | null; closeDocument: () => void },
) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [createDocError, setCreateDocError] = useState<unknown>(null);
  const [editDoc, setEditDoc] = useState<SwDocumentListRow | null>(null);
  const [statusModal, setStatusModal] = useState<StatusModalState | null>(null);
  const [ipsModalDoc, setIpsModalDoc] = useState<SwDocumentListRow | null>(null);
  const [sheetModalDoc, setSheetModalDoc] = useState<SwDocumentListRow | null>(null);

  const createDocMut = useCreateSwDocument();
  const changeStatusMut = useChangeSwDocumentStatus();
  const updateDocMut = useUpdateSwDocument();
  const deleteDocMut = useMarkSwDocumentDeleted();
  const restoreDocMut = useRestoreSwDocument();

  const fail = (err: unknown) => message.error(getApiErrorMessage(err) ?? 'Не удалось выполнить действие');

  const submitCreateDoc = (payload: CreateSwDocumentPayload) => {
    createDocMut.mutate(
      { itemId: item.id, payload },
      {
        onSuccess: data => {
          setCreateDocError(null);
          if (data.warnings?.length) message.warning(data.warnings.join(' '));
          else message.success('Документ добавлен');
          setCreateDocOpen(false);
        },
        onError: err => {
          setCreateDocError(err);
          message.error(getApiErrorMessage(err) ?? 'Не удалось добавить документ');
        },
      },
    );
  };

  /**
   * Копию прикрепляем после сохранения реквизитов: сама запись не должна зависеть
   * от доступности SVN или хранилища, а объекта листа до сохранения ещё нет.
   * Всегда замена, а не добавление: у документа и листа копия одна.
   */
  const attachChoice = async (
    choice: SwFileChoice | undefined,
    target: { objectType: 'sw_document' | 'sw_sheet'; objectId: string; purpose: 'document' | 'sheet' },
    texts: {
      svnOk: (revision?: number) => string;
      uploadOk: (filename: string) => string;
      /** Сбой прикрепления саму запись не отменяет — говорим об этом прямо. */
      failed: (source: 'svn' | 'upload') => string;
    },
  ): Promise<boolean> => {
    if (!choice?.svnPath && !choice?.localFile) return false;
    try {
      if (choice.svnPath) {
        const attached = await svnApi.attach({
          objectType: target.objectType,
          objectId: target.objectId,
          path: choice.svnPath,
          replace: true,
        });
        message.success(texts.svnOk(attached.revision));
      } else if (choice.localFile) {
        await uploadSwRegistryFile(choice.localFile, {
          objectType: target.objectType,
          objectId: target.objectId,
          purpose: target.purpose,
          replace: true,
        });
        message.success(texts.uploadOk(choice.localFile.name));
      }
    } catch (err) {
      message.warning(texts.failed(choice.svnPath ? 'svn' : 'upload'));
      fail(err);
    }
    return true;
  };

  const submitEditDoc = (payload: UpdateSwDocumentPayload, replacement?: DocumentFileReplacement) => {
    if (!editDoc) return;
    const doc = editDoc;
    updateDocMut.mutate(
      { id: doc.id, payload },
      {
        onSuccess: async data => {
          if (data.warnings?.length) message.warning(data.warnings.join(' '));
          else message.success('Документ обновлен');

          await attachChoice(
            replacement,
            { objectType: 'sw_document', objectId: doc.id, purpose: 'document' },
            {
              svnOk: revision => `Файл обновлён из SVN (ревизия ${revision})`,
              uploadOk: filename => `Файл «${filename}» загружен`,
              failed: source =>
                source === 'svn'
                  ? 'Документ сохранён, но файл из SVN прикрепить не удалось'
                  : 'Документ сохранён, но файл загрузить не удалось',
            },
          );
          void queryClient.invalidateQueries({ queryKey: ['sw'] });
          setEditDoc(null);
        },
        onError: fail,
      },
    );
  };

  const handleDeleteDoc = (document: SwDocumentListRow) => {
    modal.confirm({
      title: `Удалить документ «${document.designation}»?`,
      content: 'Документ исчезнет из комплекта и свода. Обозначение можно будет завести заново.',
      okText: 'Удалить',
      okButtonProps: { danger: true },
      onOk: () =>
        deleteDocMut.mutate(document.id, {
          onSuccess: () => {
            message.success('Документ удалён');
            if (drawer.openDocumentId === document.id) drawer.closeDocument();
          },
          onError: fail,
        }),
    });
  };

  const handleRestoreDoc = (document: SwDocumentListRow) => {
    restoreDocMut.mutate(document.id, {
      onSuccess: () => message.success('Документ восстановлен'),
      onError: fail,
    });
  };

  const submitStatus = (payload: ChangeSwDocumentStatusPayload) => {
    const docId = statusModal?.document.id ?? ipsModalDoc?.id;
    if (!docId) return;
    changeStatusMut.mutate(
      { id: docId, payload },
      {
        onSuccess: () => {
          message.success(payload.statusCode === 'in_ips' ? 'Размещение в IPS зафиксировано' : 'Статус изменен');
          // Основание смены статуса пишется комментарием — в панели документа оно должно появиться сразу.
          void queryClient.invalidateQueries({ queryKey: commentQueryKeys.byEntity('sw_document', docId) });
          setStatusModal(null);
          setIpsModalDoc(null);
        },
        onError: fail,
      },
    );
  };

  // Реквизиты листа вводит пользователь: молча оформлять «1 лист» с обозначением
  // по умолчанию — значит заставлять потом всё исправлять.
  const handleSetupSheet = (document: SwDocumentListRow) => setSheetModalDoc(document);

  const submitSheet = (payload: ApprovalSheetSubmit) => {
    if (!sheetModalDoc) return;
    const doc = sheetModalDoc;
    const wasOformlen = Boolean(doc.sheetStatusCode);
    const { svnPath, localFile, ...sheet } = payload;
    updateDocMut.mutate(
      { id: doc.id, payload: { approvalSheet: sheet } },
      {
        onSuccess: async () => {
          const withFile = await attachChoice(
            { svnPath, localFile },
            { objectType: 'sw_sheet', objectId: doc.id, purpose: 'sheet' },
            {
              svnOk: revision => `Лист утверждения оформлен, файл из SVN (ревизия ${revision})`,
              uploadOk: filename => `Лист утверждения оформлен, файл «${filename}» загружен`,
              failed: source =>
                source === 'svn'
                  ? 'Лист сохранён, но файл из SVN прикрепить не удалось'
                  : 'Лист сохранён, но файл загрузить не удалось',
            },
          );
          if (!withFile) {
            message.success(wasOformlen ? 'Лист утверждения изменён' : 'Лист утверждения оформлен');
          }
          void queryClient.invalidateQueries({ queryKey: ['sw'] });
          setSheetModalDoc(null);
        },
        onError: fail,
      },
    );
  };

  const handleRemoveSheet = (document: SwDocumentListRow) => {
    modal.confirm({
      title: 'Удалить лист утверждения?',
      content: `Лист ${document.sheetDesignation ?? ''} будет снят с документа ${document.designation}. Сам документ останется.`,
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: () =>
        new Promise<void>((resolve, reject) => {
          updateDocMut.mutate(
            { id: document.id, payload: { approvalSheet: null } },
            {
              onSuccess: () => {
                message.success('Лист утверждения удалён');
                resolve();
              },
              onError: err => {
                fail(err);
                reject(err);
              },
            },
          );
        }),
    });
  };

  const currentStatusCode =
    statusModal?.scope === 'sheet' ? statusModal.document.sheetStatusCode : statusModal?.document.statusCode;

  return {
    createDocOpen,
    setCreateDocOpen,
    createDocError,
    setCreateDocError,
    editDoc,
    setEditDoc,
    statusModal,
    setStatusModal,
    ipsModalDoc,
    setIpsModalDoc,
    sheetModalDoc,
    setSheetModalDoc,
    currentStatusCode,
    createPending: createDocMut.isPending,
    updatePending: updateDocMut.isPending,
    statusPending: changeStatusMut.isPending,
    submitCreateDoc,
    submitEditDoc,
    submitStatus,
    submitSheet,
    handleDeleteDoc,
    handleRestoreDoc,
    handleSetupSheet,
    handleRemoveSheet,
  };
}

import { useId } from 'react';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Modal, Spin, Tooltip } from 'antd';

import { swRegistryApi } from '@/api/swRegistry/swRegistryApi';
import { triggerFileDownload } from '@/components/filePreview/FilePreviewModal';
import { useDocEditor } from './useDocEditor';
import { viewerApi } from './viewerApi';
import styles from './DocumentViewerModal.module.scss';

type Props = {
  open: boolean;
  fileId: string | null;
  fileName?: string;
  onClose: () => void;
};

function Viewer({ fileId }: { fileId: string }) {
  const containerId = useId().replace(/:/g, '_');
  const configQuery = useQuery({
    queryKey: ['onlyoffice', 'config', fileId],
    queryFn: () => viewerApi.getConfig(fileId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const editor = useDocEditor(containerId, configQuery.data);

  if (configQuery.isError) {
    const message =
      (configQuery.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      'Не удалось открыть документ';
    return <Alert type='error' showIcon message={message} className={styles.alert} />;
  }
  if (editor.status === 'error') {
    return <Alert type='error' showIcon message={editor.error ?? 'Просмотр недоступен'} className={styles.alert} />;
  }

  return (
    <div className={styles.viewerBox}>
      {(configQuery.isLoading || editor.status === 'loading') && (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      )}
      <div id={containerId} className={styles.editor} />
    </div>
  );
}

export function DocumentViewerModal({ open, fileId, fileName, onClose }: Props) {
  const download = async () => {
    if (!fileId) return;
    const link = await swRegistryApi.getSwFileLink(fileId);
    triggerFileDownload(link.url, fileName ?? 'document');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      centered
      width='92vw'
      title={
        <div className={styles.toolbar}>
          <span className={styles.fileName} title={fileName}>
            {fileName || 'Просмотр документа'}
          </span>
          {fileId ? (
            <Tooltip title='Скачать'>
              <Button type='text' icon={<DownloadOutlined />} aria-label='Скачать' onClick={() => void download()} />
            </Tooltip>
          ) : null}
        </div>
      }
    >
      <div className={styles.frame}>{fileId ? <Viewer key={fileId} fileId={fileId} /> : null}</div>
    </Modal>
  );
}

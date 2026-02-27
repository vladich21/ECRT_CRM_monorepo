import { useState } from 'react';
import { Modal, Button, Tooltip } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import styles from './FilePreviewModal.module.scss';

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']);

function canPreview(filename: string): boolean {
  const ext = getExtension(filename);
  return ext === 'pdf' || IMAGE_EXTENSIONS.has(ext);
}

// ─── модалка ─────────────────────────────────────────────────────────────────

interface FilePreviewModalProps {
  open: boolean;
  url: string;
  filename: string;
  onClose: () => void;
}

export function FilePreviewModal({ open, url, filename, onClose }: FilePreviewModalProps) {
  const isImage = IMAGE_EXTENSIONS.has(getExtension(filename));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={filename}
      width="90vw"
      style={{ top: 50 }}
      styles={{ body: { height: '82vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      destroyOnClose
    >
      <div className={styles.content}>
        {isImage ? (
          <div className={styles.image}>
            <img src={url} alt={filename} />
          </div>
        ) : (
          <iframe src={url} className={styles.iframe} title="PDF предпросмотр" />
        )}
      </div>
      <div className={styles.footer}>
        <Button icon={<DownloadOutlined />} href={url} download={filename} target="_blank">
          Скачать
        </Button>
      </div>
    </Modal>
  );
}

// ─── хук ─────────────────────────────────────────────────────────────────────

export function useFilePreview() {
  const [state, setState] = useState<{ url: string; filename: string } | null>(null);

  const open = (url: string, filename: string) => setState({ url, filename });
  const close = () => setState(null);

  const modal = state ? (
    <FilePreviewModal open={true} url={state.url} filename={state.filename} onClose={close} />
  ) : null;

  return { open, close, modal };
}

// ─── ссылка ───────────────────────────────────────────────────────────────────

interface FilePreviewLinkProps {
  url: string;
  filename: string;
}

export function FilePreviewLink({ url, filename }: FilePreviewLinkProps) {
  const preview = useFilePreview();
  const previewable = canPreview(filename);

  return (
    <>
      {previewable ? (
        <Tooltip title="Открыть предпросмотр">
          <Button type="link" className={styles.linkButton} onClick={() => preview.open(url, filename)}>
            {filename}
          </Button>
        </Tooltip>
      ) : (
        <a href={url} download={filename} target="_blank" rel="noreferrer">
          {filename}
        </a>
      )}
      {preview.modal}
    </>
  );
}

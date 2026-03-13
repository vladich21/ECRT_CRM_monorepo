import styles from './FilePreviewModal.module.scss';

/** Скачать файл по ссылке */
export function triggerFileDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  a.target = '_blank';
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── ссылка-скачивание (используется в таблице файлов) ───────────────────────

interface FilePreviewLinkProps {
  url: string;
  filename: string;
}

export function FilePreviewLink({ url, filename }: FilePreviewLinkProps) {
  return (
    <a href={url} download={filename} target="_blank" rel="noreferrer" className={styles.linkButton}>
      {filename}
    </a>
  );
}

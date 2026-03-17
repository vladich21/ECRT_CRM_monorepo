import styles from './FilePreviewModal.module.scss';

export function triggerFileDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

interface FilePreviewLinkProps {
  url: string;
  filename: string;
}

export function FilePreviewLink({ url, filename }: FilePreviewLinkProps) {
  return (
    <a href={url} download={filename} rel="noreferrer" className={styles.linkButton}>
      {filename}
    </a>
  );
}

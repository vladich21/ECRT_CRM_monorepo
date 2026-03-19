import styles from './FilePreviewModal.module.scss';

export function triggerFileDownload(url: string, filename: string): void {
  const anchorEl = document.createElement('a');
  anchorEl.href = url;
  anchorEl.download = filename || 'download';
  anchorEl.rel = 'noreferrer';
  document.body.appendChild(anchorEl);
  anchorEl.click();
  document.body.removeChild(anchorEl);
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
